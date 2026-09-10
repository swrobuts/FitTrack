"""Datenmodelle für FitTrack.

Pydantic prüft beim Antworten, dass jedes Feld den richtigen Typ hat,
und FastAPI erzeugt daraus die Dokumentation unter /docs.
"""

from pydantic import BaseModel


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
