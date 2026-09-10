"""API-Tests für FitTrack.

Regel im Kurs: Der Test wird ZUERST geschrieben und ist rot.
Dann lassen wir den Code schreiben, bis der Test grün ist.
"""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


# US-3: Health-Endpunkt
def test_health():
    antwort = client.get("/health")
    assert antwort.status_code == 200
    assert antwort.json() == {"status": "ok"}


# US-1: Liste aller Trainingseinheiten
def test_workouts_liefert_liste():
    antwort = client.get("/api/workouts")
    assert antwort.status_code == 200
    daten = antwort.json()
    assert isinstance(daten, list)
    assert len(daten) == 8          # das Fixture hat 8 Einheiten


def test_workouts_felder():
    erstes = client.get("/api/workouts").json()[0]
    erwartete_felder = {"id", "datum", "sportart", "dauer_min", "distanz_km", "kalorien"}
    assert set(erstes.keys()) == erwartete_felder


def test_workouts_sortiert_absteigend():
    daten = client.get("/api/workouts").json()
    assert daten[0]["id"] == 8      # jüngstes Training zuerst (2026-06-21)
    assert daten[-1]["id"] == 1     # ältestes Training zuletzt (2026-06-01)


def test_echtdaten_sind_lesbar():
    # Rauchtest gegen die echte Datenbank: Sie muss gültig und gefüllt sein.
    # Alles Weitere prüfen wir gegen die kleine Testdatenbank, nicht hier.
    from app.daten import STANDARD_DATEI, lade_workouts
    echt = lade_workouts(STANDARD_DATEI)
    assert len(echt) > 250
    assert {"Laufen", "Radfahren", "Schwimmen", "Wandern"} == {w["sportart"] for w in echt}
