"""FitTrack – FastAPI-Anwendung.

Start lokal (aus dem Projektordner FitTrack/):
    uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
"""

from fastapi import FastAPI

from .daten import lade_workouts
from .models import Stats, Workout
from .statistik import berechne_stats

app = FastAPI(title="FitTrack", version="0.1.0")


@app.get("/health")
def health() -> dict:
    """Antwortet mit ok, wenn die App läuft. Wird später vom Container genutzt."""
    return {"status": "ok"}


@app.get("/api/workouts", response_model=list[Workout])
def workouts() -> list[dict]:
    """Alle Trainingseinheiten, jüngste zuerst."""
    return lade_workouts()


@app.get("/api/stats", response_model=Stats)
def stats() -> dict:
    """Kennzahlen über alle Trainingseinheiten."""
    return berechne_stats(lade_workouts())
