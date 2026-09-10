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
