"""Gemeinsame Testvorbereitung.

pytest lädt diese Datei automatisch vor allen Tests im Ordner.
Hier sorgen wir für zwei Dinge:

1. Die App soll in den Tests NICHT die echte Datenbank lesen, sondern eine
   kleine Testdatenbank mit 8 Einheiten. Deren Kennzahlen kann man von Hand
   nachrechnen. Die Testdatenbank wird bei jedem Testlauf frisch aus dem
   Schema (schema.sql) und den Testdaten (fixtures/workouts_klein.sql)
   gebaut. Der Pfad wird über die Umgebungsvariable FITTRACK_DATA gesetzt,
   BEVOR die App importiert wird.
2. Der Ordner backend/ kommt auf den Python-Suchpfad, damit
   `from app.main import app` in den Tests funktioniert.
"""

import os
import sqlite3
import sys
import tempfile
from pathlib import Path

TESTS_ORDNER = Path(__file__).parent
BACKEND_ORDNER = TESTS_ORDNER.parent
SCHEMA_DATEI = BACKEND_ORDNER / "app" / "data" / "schema.sql"
TESTDATEN_DATEI = TESTS_ORDNER / "fixtures" / "workouts_klein.sql"


def baue_testdatenbank() -> Path:
    """Legt eine temporäre SQLite-Datei an und füllt sie mit den Testdaten."""
    pfad = Path(tempfile.mkdtemp(prefix="fittrack-test-")) / "test.db"
    verbindung = sqlite3.connect(pfad)
    verbindung.executescript(SCHEMA_DATEI.read_text(encoding="utf-8"))
    verbindung.executescript(TESTDATEN_DATEI.read_text(encoding="utf-8"))
    verbindung.commit()
    verbindung.close()
    return pfad


os.environ["FITTRACK_DATA"] = str(baue_testdatenbank())
sys.path.insert(0, str(BACKEND_ORDNER))
