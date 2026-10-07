"""Exotel AgentStream to OpenAI Realtime audio bridge (24 kHz PCM16)."""

import asyncio
import base64
import hashlib
import hmac
import json
import logging
import os
import time
from urllib.parse import urlencode

import httpx
from fastapi import WebSocket
from websockets.asyncio.client import connect

logger = logging.getLogger(__name__)


def authorized_call(call_id: str, expires: str, signature: str) -> bool:
    secret = os.getenv("EXOTEL_BRIDGE_TOKEN", "")
    if not secret or not call_id.isdecimal() or not expires.isdecimal():
        return False
    if not 0 <= int(expires) - time.time() <= 300:
        return False
    expected = hmac.new(secret.encode(), f"{call_id}.{expires}".encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


async def bridge(websocket: WebSocket) -> None:
    call_id = websocket.query_params.get("call_id", "")
    if not authorized_call(call_id, websocket.query_params.get("expires", ""), websocket.query_params.get("signature", "")):
        await websocket.close(code=1008)
        return
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    bridge_token = os.getenv("EXOTEL_BRIDGE_TOKEN", "").strip()
    backend_url = os.getenv("EXOTEL_BACKEND_URL", "http://127.0.0.1:8000").rstrip("/")
    if not api_key:
        await websocket.close(code=1011)
        return
    await websocket.accept()
    headers = {"Authorization": f"Bearer {bridge_token}"}
    async with httpx.AsyncClient(base_url=backend_url, timeout=10) as backend:
        try:
            context_response = await backend.get(f"/api/exotel/internal/calls/{call_id}", headers=headers)
            context_response.raise_for_status()
            context = context_response.json()
        except (httpx.HTTPError, ValueError):
            logger.exception("Could not load Exotel call context for call %s", call_id)
            await websocket.close(code=1011)
            return

        assistant = context.get("assistant_name", "Assistant")
        voice = "cedar" if assistant == "Subrata" else "marin"
        preferences = context.get("preferences") or {}
        instructions = "\n".join(filter(None, [
            f"You are {assistant}, an AI phone assistant. Disclose that you are an AI assistant at the start.",
            "Speak clearly. Ask one question at a time. Do not invent business facts. End politely if asked to stop.",
            f"You represent {preferences.get('business_name', 'the business')}.",
            f"You are speaking to {context.get('contact_name', 'the customer')}.",
            f"Call objective: {context.get('summary', '')}",
            f"Language: {context.get('language') or preferences.get('language', 'English')}.",
            f"Timezone: {context.get('timezone', 'Asia/Kolkata')}.",
            context.get("system_prompt") or preferences.get("instructions", ""),
        ]))
        url = "wss://api.openai.com/v1/realtime?" + urlencode({"model": os.getenv("OPENAI_REALTIME_MODEL", "gpt-realtime-2.1-mini")})
        try:
            async with connect(url, additional_headers={"Authorization": f"Bearer {api_key}"}, max_size=16 * 1024 * 1024) as upstream:
                await upstream.send(json.dumps({"type": "session.update", "session": {
                    "type": "realtime", "instructions": instructions,
                    "audio": {
                        "input": {"format": {"type": "audio/pcm", "rate": 24000},
                                  "transcription": {"model": "gpt-4o-mini-transcribe"},
                                  "turn_detection": {"type": "server_vad"}},
                        "output": {"format": {"type": "audio/pcm", "rate": 24000}, "voice": voice},
                    },
                }}))
                stream_sid = None
                output_buffer = bytearray()

                async def save_message(speaker: str, message: str) -> None:
                    if not message.strip():
                        return
                    try:
                        response = await backend.post(
                            f"/api/exotel/internal/calls/{call_id}/messages",
                            headers=headers, json={"speaker": speaker, "message": message[:10000]},
                        )
                        response.raise_for_status()
                    except httpx.HTTPError:
                        logger.exception("Could not save Exotel transcript for call %s", call_id)

                async def exotel_to_openai() -> None:
                    nonlocal stream_sid
                    async for message in websocket.iter_text():
                        event = json.loads(message)
                        kind = event.get("event")
                        if kind == "start":
                            start = event.get("start", {})
                            stream_sid = start.get("stream_sid")
                            if start.get("media_format", {}).get("sample_rate") != "24000":
                                raise ValueError("Exotel must stream 24 kHz PCM audio")
                            await upstream.send(json.dumps({"type": "response.create", "response": {
                                "instructions": f"Introduce yourself as {assistant}, disclose you are an AI assistant, and ask if this is a good time to talk. {context.get('opening_message') or preferences.get('greeting', '')}"
                            }}))
                        elif kind == "media" and stream_sid:
                            await upstream.send(json.dumps({"type": "input_audio_buffer.append", "audio": event["media"]["payload"]}))
                        elif kind == "stop":
                            return

                async def openai_to_exotel() -> None:
                    async for message in upstream:
                        event = json.loads(message)
                        kind = event.get("type")
                        if kind == "response.output_audio.delta" and stream_sid:
                            output_buffer.extend(base64.b64decode(event["delta"]))
                            while len(output_buffer) >= 3200:
                                chunk = bytes(output_buffer[:3200])
                                del output_buffer[:3200]
                                await websocket.send_json({"event": "media", "stream_sid": stream_sid,
                                                           "media": {"payload": base64.b64encode(chunk).decode()}})
                        elif kind == "response.output_audio.done" and stream_sid and output_buffer:
                            chunk = bytes(output_buffer).ljust(3200, b"\0")
                            output_buffer.clear()
                            await websocket.send_json({"event": "media", "stream_sid": stream_sid,
                                                       "media": {"payload": base64.b64encode(chunk).decode()}})
                        elif kind == "input_audio_buffer.speech_started" and stream_sid:
                            output_buffer.clear()
                            await websocket.send_json({"event": "clear", "stream_sid": stream_sid})
                        elif kind == "conversation.item.input_audio_transcription.completed":
                            await save_message("customer", event.get("transcript", ""))
                        elif kind == "response.output_audio_transcript.done":
                            await save_message("ai", event.get("transcript", ""))
                        elif kind == "error":
                            logger.error("OpenAI Realtime error on Exotel call %s: %s", call_id, event.get("error", {}).get("message", "unknown"))

                tasks = [asyncio.create_task(exotel_to_openai()), asyncio.create_task(openai_to_exotel())]
                done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
                for task in pending:
                    task.cancel()
                await asyncio.gather(*pending, return_exceptions=True)
                for task in done:
                    task.result()
        except Exception:
            logger.exception("Exotel audio bridge failed for call %s", call_id)
            try:
                await websocket.close(code=1011)
            except RuntimeError:
                pass
