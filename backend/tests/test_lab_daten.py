"""Der SQLite-Export der Lernumgebung muss dieselben Daten wie die App liefern."""

import json
import sqlite3
from contextlib import closing
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture
def lab_db():
    with closing(sqlite3.connect(":memory:")) as db:
        for name in ("schema.sql", "fittrack.sql"):
            db.executescript((ROOT / "site" / "data" / name).read_text(encoding="utf-8"))
        yield db


def test_lab_export_entspricht_app_datenbank(lab_db):
    pfad = ROOT / "backend" / "app" / "data" / "fittrack.db"
    with closing(sqlite3.connect(pfad.as_uri() + "?mode=ro", uri=True)) as app_db:
        for tabelle in ("sportart", "workout", "v_workout"):
            sql = f"SELECT * FROM {tabelle} ORDER BY id"
            assert lab_db.execute(sql).fetchall() == app_db.execute(sql).fetchall()


@pytest.mark.parametrize(
    "lab,kennung,erwartet",
    [
        ("lab-02", "P02-01", [
            (311, "2026-09-05", "Schwimmen", 43, 2.0, 614),
            (310, "2026-09-02", "Wandern", 128, 9.8, 625),
            (309, "2026-08-31", "Radfahren", 124, 52.6, 1431),
            (308, "2026-08-30", "Schwimmen", 59, 2.1, 652),
            (307, "2026-08-29", "Radfahren", 150, 64.2, 1784),
        ]),
        ("lab-02", "P02-02", [("Radfahren", 1992.0), ("Laufen", 1334.1),
                                 ("Wandern", 547.8), ("Schwimmen", 89.1)]),
        ("lab-02", "P02-05", [(104,)]),
        ("lab-03", "P03-02", [(3963.0, 311)]),
    ],
)
def test_lab_sql_musterloesung(lab_db, lab, kennung, erwartet):
    datei = ROOT / "site" / "data" / "uebungen" / f"{lab}.json"
    uebungen = json.loads(datei.read_text(encoding="utf-8"))["uebungen"]
    uebung = next(u for u in uebungen if u["id"] == kennung)
    assert lab_db.execute(uebung["loesung"]).fetchall() == erwartet
