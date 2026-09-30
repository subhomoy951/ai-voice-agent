import json
import os
from datetime import datetime
from pathlib import Path

import httpx
import psycopg
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from psycopg.rows import dict_row
from pydantic import BaseModel

from .database import connect


SERVICE_ROOT = Path(__file__).resolve().parents[1]

# Support the repository's existing `env` file and the conventional `.env`.
# Values already supplied by the host environment always take precedence.
load_dotenv(SERVICE_ROOT / "env", override=False)
load_dotenv(SERVICE_ROOT / ".env", override=False)

OPENAI_API_URL = "https://api.openai.com/v1/realtime/calls"
DEFAULT_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"


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
            with conn.cursor(row_factory=dict_row) as cursor:
                cursor.execute(
                    "SELECT id, name, phone, created_at FROM public.leads ORDER BY id LIMIT %s OFFSET %s",
                    (limit, offset),
                )
                return [Lead.model_validate(row) for row in cursor.fetchall()]
    except (psycopg.Error, KeyError, ValueError) as exc:
        raise HTTPException(status_code=503, detail="Database unavailable") from exc


@app.post("/api/realtime/session")
async def create_realtime_session(request: Request) -> Response:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="OPENAI_API_KEY is not configured on the AI service.",
        )

    if "application/sdp" not in request.headers.get("content-type", ""):
        raise HTTPException(status_code=415, detail="Expected an application/sdp request.")

    sdp_offer = (await request.body()).decode("utf-8", errors="strict").strip()
    if not sdp_offer or len(sdp_offer) > 100_000:
        raise HTTPException(status_code=400, detail="A valid SDP offer is required.")

    session_config = {
        "type": "realtime",
        "model": os.getenv("OPENAI_REALTIME_MODEL", "gpt-realtime-2.1"),
        "instructions": (
            "You are Ava, a concise and friendly AI calling assistant running in a "
            "laptop prototype. Clearly say that you are an AI assistant. This is a "
            "test conversation, not a real sales call. Ask one question at a time, "
            "do not invent facts, stop speaking when interrupted, and end politely "
            "when the user asks to stop."
        ),
        "audio": {
            "input": {
                "transcription": {"model": "gpt-4o-mini-transcribe"},
                "turn_detection": {"type": "server_vad"},
            },
            "output": {"voice": os.getenv("OPENAI_REALTIME_VOICE", "marin")},
        },
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            upstream = await client.post(
                OPENAI_API_URL,
                headers={"Authorization": f"Bearer {api_key}"},
                files={
                    "sdp": (None, sdp_offer),
                    "session": (None, json.dumps(session_config)),
                },
            )
    except httpx.TimeoutException as exc:
        raise HTTPException(status_code=504, detail="OpenAI session creation timed out.") from exc
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail="Could not reach OpenAI.") from exc

    if not upstream.is_success:
        if upstream.status_code in {401, 403}:
            detail = "OpenAI rejected the server API key or project access."
        elif upstream.status_code == 429:
            detail = "OpenAI rate limit or account quota was reached."
        else:
            detail = "OpenAI could not create the realtime session."
        raise HTTPException(status_code=502, detail=detail)

    return Response(content=upstream.text, media_type="application/sdp")
