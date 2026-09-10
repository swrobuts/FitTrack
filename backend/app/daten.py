"""Liest die Trainingseinheiten aus der SQLite-Datenbank.

Welche Datenbankdatei gelesen wird, steuert die Umgebungsvariable
FITTRACK_DATA. Ist sie nicht gesetzt, gilt app/data/fittrack.db. Die Tests
setzen sie auf eine kleine Testdatenbank (siehe tests/conftest.py).

SQLite braucht keinen Server: Die Datenbank ist eine Datei, und das Modul
sqlite3 gehört zur Python-Standardbibliothek.
"""

import os
import sqlite3
from pathlib import Path

STANDARD_DATEI = Path(__file__).parent / "data" / "fittrack.db"

# Die Sicht v_workout liefert je Einheit den Namen der Sportart statt der
# Fremdschlüssel-Nummer. Jüngstes Datum zuerst, bei gleichem Datum höhere id zuerst.
ABFRAGE = """
    SELECT id, datum, sportart, dauer_min, distanz_km, kalorien
    FROM   v_workout
    ORDER  BY datum DESC, id DESC
"""


def datenbank_pfad() -> Path:
    """Pfad zur Datenbank: aus der Umgebungsvariable oder der Standardwert."""
    return Path(os.environ.get("FITTRACK_DATA", STANDARD_DATEI))


def lade_workouts(pfad: Path | None = None) -> list[dict]:
    """Liest alle Einheiten als Liste von Dictionaries, jüngste zuerst."""
    verbindung = sqlite3.connect(pfad or datenbank_pfad())
    verbindung.row_factory = sqlite3.Row      # Zeilen verhalten sich wie Dictionaries
    try:
        zeilen = verbindung.execute(ABFRAGE).fetchall()
    finally:
        verbindung.close()
    return [dict(zeile) for zeile in zeilen]
