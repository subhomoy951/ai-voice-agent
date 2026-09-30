from fastapi import FastAPI

app = FastAPI(title="AI Calling Voice Gateway")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "ai-calling-voice-gateway"}

@app.get("/test-alolika")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "test ai alolika ai voice agent"}