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


def berechne_wochen(workouts: list[dict]) -> list[dict]:
    """Summiert Distanz, Anzahl und Dauer je Kalenderwoche.

    Wochen ohne Training zwischen der ersten und der letzten Trainingswoche
    erscheinen mit Nullwerten, damit Lücken im Diagramm sichtbar bleiben.
    """
    if not workouts:
        return []

    # Schritt 1: je Montag aufsummieren
    summen = defaultdict(lambda: {"distanz_km": 0.0, "anzahl": 0, "dauer_min": 0})
    for w in workouts:
        montag = montag_der_woche(w["datum"])
        summen[montag]["distanz_km"] += w["distanz_km"]
        summen[montag]["anzahl"] += 1
        summen[montag]["dauer_min"] += w["dauer_min"]

    # Schritt 2: alle Montage von der ersten bis zur letzten Woche durchlaufen
    wochen = []
    montag = min(summen)
    letzter_montag = max(summen)
    while montag <= letzter_montag:
        jahr, kalenderwoche, _ = montag.isocalendar()
        werte = summen[montag]   # liefert Nullwerte, wenn die Woche fehlt
        wochen.append({
            "kw": f"{jahr}-W{kalenderwoche:02d}",
            "wochenstart": montag.isoformat(),
            "distanz_km": round(werte["distanz_km"], 1),
            "anzahl": werte["anzahl"],
            "dauer_min": werte["dauer_min"],
        })
        montag += timedelta(days=7)
    return wochen
