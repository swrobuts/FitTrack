"""FitTrack – FastAPI-Anwendung.

Start lokal (aus dem Projektordner FitTrack/):
    uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
"""

from fastapi import FastAPI

app = FastAPI(title="FitTrack", version="0.1.0")


@app.get("/health")
def health() -> dict:
    """Antwortet mit ok, wenn die App läuft. Wird später vom Container genutzt."""
    return {"status": "ok"}
