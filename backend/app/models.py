"""Datenmodelle für FitTrack.

Pydantic prüft beim Antworten, dass jedes Feld den richtigen Typ hat,
und FastAPI erzeugt daraus die Dokumentation unter /docs.
"""

from typing import Literal

from pydantic import BaseModel, Field


class Workout(BaseModel):
    """Eine Trainingseinheit, so wie sie in workouts.json steht."""

    id: int
    datum: str          # ISO-Format JJJJ-MM-TT
    sportart: str       # Laufen, Radfahren, Schwimmen, Wandern
    dauer_min: int
    distanz_km: float
    kalorien: int


class Stats(BaseModel):
    """Kennzahlen für /api/stats."""

    gesamt_km: float
    durchschnitt_km_pro_woche: float
    lieblingssportart: str | None   # None, wenn es keine Daten gibt
    anzahl: int


class WochenEintrag(BaseModel):
    """Eine Kalenderwoche für /api/stats/wochen."""

    kw: str             # z. B. "2026-W23"
    wochenstart: str    # Montag der Woche, ISO-Format
    distanz_km: float
    anzahl: int
    dauer_min: int
    je_sportart: dict[str, float]   # z. B. {"Laufen": 13.0, "Radfahren": 20.0}


class ChatNachricht(BaseModel):
    """Eine Nachricht im bisherigen Verlauf, so wie das Frontend sie speichert."""

    rolle: Literal["nutzer", "bot"]
    text: str = Field(max_length=4000)


class ChatAnfrage(BaseModel):
    """Eingabe für POST /api/chat."""

    frage: str = Field(min_length=1, max_length=1000)
    verlauf: list[ChatNachricht] = []


class ChatAntwort(BaseModel):
    """Antwort von POST /api/chat."""

    antwort: str
    modell: str


class ChatStatus(BaseModel):
    """Antwort von GET /api/chat/status."""

    verfuegbar: bool
    modell: str | None
