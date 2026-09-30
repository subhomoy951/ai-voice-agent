from datetime import datetime

import psycopg
from fastapi import FastAPI, HTTPException, Query
from psycopg.rows import dict_row
from pydantic import BaseModel

if __package__:
    from .database import connect
else:
    from database import connect

app = FastAPI(title="AI Calling Voice Gateway")


class Lead(BaseModel):
    id: int
    name: str
    phone: str
    created_at: datetime


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "ai-calling-voice-gateway"}

@app.get("/test-alolika")
def health() -> dict[str, str]:
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
    except psycopg.Error as exc:
        raise HTTPException(status_code=503, detail="Database unavailable") from exc


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8001)
