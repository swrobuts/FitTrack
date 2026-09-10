"""Kennzahlen aus einer Liste von Trainingseinheiten berechnen.

Bewusst ohne FastAPI: Diese Funktionen bekommen eine Liste von Dictionaries
und geben ein Dictionary zurück. So lassen sie sich einzeln testen und
in der Python-Konsole ausprobieren.
"""

from collections import defaultdict
from datetime import date, timedelta


def montag_der_woche(datum_text: str) -> date:
    """Gibt den Montag der Kalenderwoche zurück, in der das Datum liegt."""
    tag = date.fromisoformat(datum_text)
    return tag - timedelta(days=tag.weekday())


def anzahl_kalenderwochen(workouts: list[dict]) -> int:
    """Zählt die Kalenderwochen von der ersten bis zur letzten Trainingswoche, beide inklusive."""
    montage = [montag_der_woche(w["datum"]) for w in workouts]
    erste, letzte = min(montage), max(montage)
    return (letzte - erste).days // 7 + 1


def lieblingssportart(workouts: list[dict]) -> str:
    """Sportart mit der größten Gesamtdistanz. Bei Gleichstand die alphabetisch erste."""
    summe_je_sportart = defaultdict(float)
    for w in workouts:
        summe_je_sportart[w["sportart"]] += w["distanz_km"]
    # Sortieren nach: größte Summe zuerst, dann Name alphabetisch
    rangliste = sorted(summe_je_sportart.items(), key=lambda paar: (-paar[1], paar[0]))
    return rangliste[0][0]


def berechne_stats(workouts: list[dict]) -> dict:
    """Berechnet die vier Kennzahlen für /api/stats."""
    if not workouts:
        return {
            "gesamt_km": 0.0,
            "durchschnitt_km_pro_woche": 0.0,
            "lieblingssportart": None,
            "anzahl": 0,
        }
    gesamt_km = sum(w["distanz_km"] for w in workouts)
    wochen = anzahl_kalenderwochen(workouts)
    return {
        "gesamt_km": round(gesamt_km, 1),
        "durchschnitt_km_pro_woche": round(gesamt_km / wochen, 1),
        "lieblingssportart": lieblingssportart(workouts),
        "anzahl": len(workouts),
    }
