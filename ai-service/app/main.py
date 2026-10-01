import asyncio
import json
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Literal
from urllib.parse import urlencode

import httpx
import mysql.connector
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request, Response, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from websockets.asyncio.client import connect as websocket_connect
from websockets.exceptions import ConnectionClosed
from pydantic import BaseModel

from .database import connect


SERVICE_ROOT = Path(__file__).resolve().parents[1]

# Support the repository's existing `env` file and the conventional `.env`.
# Values already supplied by the host environment always take precedence.
load_dotenv(SERVICE_ROOT / "env", override=False)
load_dotenv(SERVICE_ROOT / ".env", override=False)

OPENAI_API_URL = "https://api.openai.com/v1/realtime/calls"
OPENAI_WS_URL = "wss://api.openai.com/v1/realtime"
ASSISTANTS = {"keyline": ("Keyline", "marin"), "deblina": ("Deblina", "marin"), "subrata": ("Subrata", "cedar")}
DEFAULT_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"
logger = logging.getLogger(__name__)


def allowed_origins() -> list[str]:
    return [
        origin.strip()
        for origin in os.getenv("FRONTEND_ORIGINS", DEFAULT_ORIGINS).split(",")
        if origin.strip()
    ]


app = FastAPI(title="AI Calling Voice Gateway")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.websocket("/api/realtime/ws")
async def realtime_websocket(websocket: WebSocket) -> None:
    """Relay Realtime JSON events while keeping the OpenAI key on the server."""
    origin = websocket.headers.get("origin")
    if origin and origin not in allowed_origins():
        await websocket.close(code=1008, reason="Origin is not allowed")
        return

    gateway_token = os.getenv("REALTIME_WS_TOKEN", "").strip()
    supplied_token = websocket.headers.get("authorization", "").removeprefix("Bearer ")
    if not supplied_token:
        supplied_token = websocket.query_params.get("token", "")
    if gateway_token and supplied_token != gateway_token:
        await websocket.close(code=1008, reason="Invalid gateway token")
        return

    assistant = websocket.query_params.get("assistant", "keyline")
    if assistant not in ASSISTANTS:
        await websocket.close(code=1008, reason="Unknown assistant")
        return

    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        await websocket.close(code=1011, reason="OPENAI_API_KEY is not configured")
        return

    url = f"{OPENAI_WS_URL}?{urlencode({'model': os.getenv('OPENAI_REALTIME_MODEL', 'gpt-realtime-2.1-mini')})}"
    try:
        async with websocket_connect(
            url,
            additional_headers={"Authorization": f"Bearer {api_key}"},
            max_size=16 * 1024 * 1024,
        ) as upstream:
            await websocket.accept()
            assistant_name, assistant_voice = ASSISTANTS[assistant]
            await upstream.send(json.dumps({
                "type": "session.update",
                "session": {
                    "type": "realtime",
                    "instructions": (
                        f"You are {assistant_name}, a concise and friendly AI calling assistant. "
                        "Ask one question at a time, do not invent facts, and end politely when asked to stop."
                    ),
                    "audio": {"output": {"voice": assistant_voice}},
                },
            }))

            async def client_to_upstream() -> None:
                async for message in websocket.iter_text():
                    await upstream.send(message)

            async def upstream_to_client() -> None:
                async for message in upstream:
                    await websocket.send_text(message)

            tasks = [asyncio.create_task(client_to_upstream()), asyncio.create_task(upstream_to_client())]
            done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
            for task in pending:
                task.cancel()
            await asyncio.gather(*pending, return_exceptions=True)
            for task in done:
                task.result()
    except ConnectionClosed:
        pass
    except Exception:
        logger.exception("Realtime WebSocket relay failed")
        try:
            await websocket.close(code=1011, reason="Realtime connection failed")
        except RuntimeError:
            pass


class Lead(BaseModel):
    id: int
    name: str
    phone: str
    created_at: datetime


@app.get("/health")
def health() -> dict[str, str | bool]:
    return {
        "status": "ok",
        "service": "ai-calling-voice-gateway",
        "openai_configured": bool(os.getenv("OPENAI_API_KEY", "").strip()),
    }


@app.get("/test-alolika")
def test_alolika() -> dict[str, str]:
    return {"status": "ok", "service": "test ai alolika ai voice agent"}


@app.get("/leads", response_model=list[Lead])
def get_leads(
    limit: int = Query(default=100, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[Lead]:
    try:
        with connect() as conn:
            with conn.cursor(dictionary=True) as cursor:
                cursor.execute(
                    "SELECT id, name, phone, created_at FROM leads ORDER BY id LIMIT %s OFFSET %s",
                    (limit, offset),
                )
                return [Lead.model_validate(row) for row in cursor.fetchall()]
    except (mysql.connector.Error, KeyError, ValueError) as exc:
        raise HTTPException(status_code=503, detail="Database unavailable") from exc


@app.post("/api/realtime/session")
async def create_realtime_session(
    request: Request, assistant: Literal["deblina", "subrata"] = Query(default="deblina")
) -> Response:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="OPENAI_API_KEY is not configured on the AI service.",
        )

    if "application/sdp" not in request.headers.get("content-type", ""):
        raise HTTPException(status_code=415, detail="Expected an application/sdp request.")

    # SDP is line oriented and its final CRLF is part of the offer. In
    # particular, stripping it can make OpenAI's SDP parser report EOF.
    sdp_offer = await request.body()
    if not sdp_offer.strip() or len(sdp_offer) > 100_000:
        raise HTTPException(status_code=400, detail="A valid SDP offer is required.")

    assistant_name, assistant_voice = ASSISTANTS[assistant]
    session_config = {
        "type": "realtime",
        "model": os.getenv("OPENAI_REALTIME_MODEL", "gpt-realtime-2.1-mini"),
        "instructions": (
            f"You are {assistant_name}, a concise and friendly AI calling assistant. "
            "The initial greeting is handled separately. In later "
            "replies, respond directly to the user's latest message. Do not repeat "
            "the opening greeting or reintroduce yourself unless the user asks. "
            "Ask one question at a time, "
            "do not invent facts, stop speaking when interrupted, and end politely "
            "when the user asks to stop."
        ),
        "audio": {
            "input": {
                "transcription": {"model": "gpt-4o-mini-transcribe"},
                "turn_detection": {"type": "server_vad"},
            },
            "output": {"voice": assistant_voice},
        },
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            upstream = await client.post(
                OPENAI_API_URL,
                headers={"Authorization": f"Bearer {api_key}"},
                files={
                    "sdp": (None, sdp_offer, "application/sdp"),
                    "session": (
                        None,
                        json.dumps(session_config),
                        "application/json",
                    ),
                },
            )
    except httpx.TimeoutException as exc:
        raise HTTPException(status_code=504, detail="OpenAI session creation timed out.") from exc
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail="Could not reach OpenAI.") from exc

    if not upstream.is_success:
        upstream_message = ""
        try:
            upstream_message = upstream.json().get("error", {}).get("message", "")
        except (json.JSONDecodeError, AttributeError, TypeError):
            pass

        logger.error(
            "OpenAI Realtime session creation failed with status %s: %s",
            upstream.status_code,
            upstream_message or upstream.text[:500],
        )

        if upstream.status_code in {401, 403}:
            detail = "OpenAI rejected the server API key or project access."
        elif upstream.status_code == 429:
            detail = "OpenAI rate limit or account quota was reached."
        elif upstream_message:
            detail = f"OpenAI could not create the realtime session: {upstream_message}"
        else:
            detail = "OpenAI could not create the realtime session."
        raise HTTPException(status_code=502, detail=detail)

    return Response(content=upstream.text, media_type="application/sdp")
