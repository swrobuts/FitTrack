"""FitTrack – FastAPI-Anwendung.

Start lokal (aus dem Projektordner FitTrack/):
    uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
"""

from pathlib import Path

import httpx2
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles

from . import chat
from .daten import lade_workouts
from .models import ChatAnfrage, ChatAntwort, ChatStatus, Stats, WochenEintrag, Workout
from .statistik import berechne_stats, berechne_wochen

FRONTEND_ORDNER = Path(__file__).parent.parent.parent / "frontend"

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


@app.get("/api/stats/wochen", response_model=list[WochenEintrag])
def wochen() -> list[dict]:
    """Distanz, Anzahl und Dauer je Kalenderwoche, aufsteigend."""
    return berechne_wochen(lade_workouts())


@app.get("/api/chat/status", response_model=ChatStatus)
def chat_status() -> dict:
    """Ob ein lokales Sprachmodell erreichbar ist. Das Frontend blendet den Chat sonst aus."""
    return chat.status()


@app.post("/api/chat", response_model=ChatAntwort)
def chat_frage(anfrage: ChatAnfrage) -> dict:
    """Beantwortet eine Frage zu den Trainingsdaten über LM Studio; 503 ohne Modell."""
    modell = chat.aktives_modell()
    if modell is None:
        raise HTTPException(503, "Kein Sprachmodell erreichbar. Der Chat läuft nur lokal mit LM Studio.")
    verlauf = [eintrag.model_dump() for eintrag in anfrage.verlauf]
    nachrichten = chat.baue_nachrichten(lade_workouts(), verlauf, anfrage.frage)
    try:
        antwort = chat.frage_lmstudio(nachrichten, modell)
    except (httpx2.HTTPError, KeyError, ValueError) as fehler:
        raise HTTPException(502, f"LM Studio hat nicht geantwortet: {fehler}")
    return {"antwort": antwort, "modell": modell}


# Das Frontend liegt als statische Dateien im Ordner frontend/. Der Mount muss
# NACH den API-Routen stehen, sonst fängt er alle Anfragen ab.
app.mount("/", StaticFiles(directory=FRONTEND_ORDNER, html=True), name="frontend")
