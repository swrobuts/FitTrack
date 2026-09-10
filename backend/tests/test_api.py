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


# US-2: Kennzahlen
# Erwartungswerte von Hand aus dem Fixture berechnet (siehe README, Abschnitt Kennzahlen):
#   Distanzen: 5 + 20 + 8 + 1.5 + 30 + 9 + 10 + 4 = 87.5 km
#   Kalenderwochen: KW 23, 24, 25 = 3 Wochen  ->  87.5 / 3 = 29.17 -> 29.2
#   Je Sportart: Radfahren 50.0, Laufen 26.0, Wandern 10.0, Schwimmen 1.5
def test_stats_gesamt_km():
    stats = client.get("/api/stats").json()
    assert stats["gesamt_km"] == 87.5


def test_stats_durchschnitt():
    stats = client.get("/api/stats").json()
    assert stats["durchschnitt_km_pro_woche"] == 29.2


def test_stats_lieblingssportart():
    stats = client.get("/api/stats").json()
    assert stats["lieblingssportart"] == "Radfahren"


def test_stats_anzahl():
    stats = client.get("/api/stats").json()
    assert stats["anzahl"] == 8


def test_stats_leere_liste(monkeypatch):
    # Randfall: keine Daten. Wir tauschen die Ladefunktion vorübergehend aus.
    from app import main
    monkeypatch.setattr(main, "lade_workouts", lambda: [])
    stats = client.get("/api/stats").json()
    assert stats == {
        "gesamt_km": 0.0,
        "durchschnitt_km_pro_woche": 0.0,
        "lieblingssportart": None,
        "anzahl": 0,
    }
