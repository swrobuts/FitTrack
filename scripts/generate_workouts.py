"""Erzeugt die Beispieldatenbank backend/app/data/fittrack.db.

Aufruf aus dem Projektordner:
    python scripts/generate_workouts.py

Ablauf: Schema aus schema.sql anlegen, die vier Sportarten eintragen, dann
Woche für Woche Trainingseinheiten erzeugen und einfügen. Der Zufallsgenerator
hat einen festen Seed. Deshalb entsteht bei jedem Aufruf exakt dieselbe
Datenbank. Zeitraum: 2 Jahre, September 2024 bis September 2026, mit
Saisonalität und einigen Wochen ohne Training.
"""

import random
import sqlite3
from datetime import date, timedelta
from pathlib import Path

SEED = 2024
ERSTER_MONTAG = date(2024, 9, 2)
LETZTER_SONNTAG = date(2026, 9, 6)
DATEN_ORDNER = Path(__file__).parent.parent / "backend" / "app" / "data"
SCHEMA_DATEI = DATEN_ORDNER / "schema.sql"
ZIEL_DATEI = DATEN_ORDNER / "fittrack.db"

SPORTARTEN = ["Laufen", "Radfahren", "Schwimmen", "Wandern"]

# Wie wahrscheinlich ist eine Sportart in welchem Monat? (Gewichte je Monat 1..12)
SAISON = {
    "Laufen":    [5, 5, 5, 4, 4, 3, 3, 3, 4, 5, 5, 5],
    "Radfahren": [0, 0, 1, 3, 4, 5, 5, 5, 3, 1, 0, 0],
    "Schwimmen": [0, 0, 0, 1, 2, 3, 4, 4, 2, 0, 0, 0],
    "Wandern":   [0, 0, 0, 1, 2, 2, 2, 2, 3, 3, 1, 0],
}

# Typische Werte je Sportart: Dauer in Minuten, Tempo in Minuten pro km, Kalorien pro km
PROFIL = {
    "Laufen":    {"dauer": (25, 70),  "min_pro_km": (5.2, 6.5),   "kcal_pro_km": (65, 80)},
    "Radfahren": {"dauer": (40, 150), "min_pro_km": (2.2, 3.0),   "kcal_pro_km": (22, 30)},
    "Schwimmen": {"dauer": (30, 60),  "min_pro_km": (22.0, 30.0), "kcal_pro_km": (250, 320)},
    "Wandern":   {"dauer": (90, 300), "min_pro_km": (13.0, 17.0), "kcal_pro_km": (55, 70)},
}

# Wochen ohne Training (Urlaub, Krankheit): Index der Woche ab ERSTER_MONTAG
PAUSEN_WOCHEN = {16, 17, 34, 52, 71, 88}


def waehle_sportart(zufall: random.Random, monat: int) -> str:
    """Zieht eine Sportart passend zur Jahreszeit."""
    gewichte = [SAISON[name][monat - 1] for name in SPORTARTEN]
    return zufall.choices(SPORTARTEN, weights=gewichte)[0]


def erzeuge_einheit(zufall: random.Random, tag: date) -> dict:
    """Erzeugt eine plausible Trainingseinheit für einen Tag."""
    sportart = waehle_sportart(zufall, tag.month)
    profil = PROFIL[sportart]
    dauer = zufall.randint(*profil["dauer"])
    distanz = dauer / zufall.uniform(*profil["min_pro_km"])
    kalorien = distanz * zufall.uniform(*profil["kcal_pro_km"])
    return {
        "datum": tag.isoformat(),
        "sportart": sportart,
        "dauer_min": dauer,
        "distanz_km": round(distanz, 1),
        "kalorien": int(round(kalorien)),
    }


def erzeuge_workouts() -> list[dict]:
    """Läuft Woche für Woche durch den Zeitraum und erzeugt 2 bis 4 Einheiten je Woche."""
    zufall = random.Random(SEED)
    workouts = []
    montag = ERSTER_MONTAG
    woche = 0
    while montag <= LETZTER_SONNTAG:
        if woche not in PAUSEN_WOCHEN:
            anzahl = zufall.randint(2, 4)
            tage = sorted(zufall.sample(range(7), anzahl))
            for versatz in tage:
                workouts.append(erzeuge_einheit(zufall, montag + timedelta(days=versatz)))
        montag += timedelta(days=7)
        woche += 1
    return workouts


def schreibe_datenbank(workouts: list[dict]) -> None:
    """Legt die Datenbank neu an: Schema, Sportarten, Trainingseinheiten."""
    if ZIEL_DATEI.exists():
        ZIEL_DATEI.unlink()
    verbindung = sqlite3.connect(ZIEL_DATEI)
    verbindung.executescript(SCHEMA_DATEI.read_text(encoding="utf-8"))
    verbindung.executemany(
        "INSERT INTO sportart (id, name) VALUES (?, ?)",
        [(nummer, name) for nummer, name in enumerate(SPORTARTEN, start=1)],
    )
    verbindung.executemany(
        "INSERT INTO workout (datum, sportart_id, dauer_min, distanz_km, kalorien) "
        "VALUES (?, ?, ?, ?, ?)",
        [
            (w["datum"], SPORTARTEN.index(w["sportart"]) + 1,
             w["dauer_min"], w["distanz_km"], w["kalorien"])
            for w in workouts
        ],
    )
    verbindung.commit()
    verbindung.close()


if __name__ == "__main__":
    daten = erzeuge_workouts()
    schreibe_datenbank(daten)
    print(f"{len(daten)} Einheiten geschrieben nach {ZIEL_DATEI}")
