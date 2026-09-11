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


# US-4: Frontend wird von FastAPI ausgeliefert
def test_index_liefert_html():
    antwort = client.get("/")
    assert antwort.status_code == 200
    assert "text/html" in antwort.headers["content-type"]
    assert "FitTrack" in antwort.text


# US-6: Wochenverlauf
# Fixture: KW 23 (4 Einheiten, 34.5 km, 175 min), KW 24 leer, KW 25 (4 Einheiten, 53.0 km, 285 min)
def test_wochen_anzahl_und_luecken():
    wochen = client.get("/api/stats/wochen").json()
    assert len(wochen) == 3
    assert [w["kw"] for w in wochen] == ["2026-W23", "2026-W24", "2026-W25"]
    assert wochen[1] == {"kw": "2026-W24", "wochenstart": "2026-06-08",
                         "distanz_km": 0.0, "anzahl": 0, "dauer_min": 0, "je_sportart": {}}


def test_wochen_summen():
    wochen = client.get("/api/stats/wochen").json()
    assert wochen[0]["wochenstart"] == "2026-06-01"
    assert wochen[0]["distanz_km"] == 34.5
    assert wochen[0]["anzahl"] == 4
    assert wochen[0]["dauer_min"] == 175
    assert wochen[2]["distanz_km"] == 53.0
    assert wochen[2]["anzahl"] == 4
    assert wochen[2]["dauer_min"] == 285


def test_wochen_leer(monkeypatch):
    from app import main
    monkeypatch.setattr(main, "lade_workouts", lambda: [])
    assert client.get("/api/stats/wochen").json() == []


# US-7: Dashboard-Überarbeitung, Kilometer je Sportart und Woche
# Fixture KW 23: Laufen 5.0 + 8.0 = 13.0, Radfahren 20.0, Schwimmen 1.5
#         KW 25: Radfahren 30.0, Laufen 9.0 + 4.0 = 13.0, Wandern 10.0
def test_wochen_je_sportart():
    wochen = client.get("/api/stats/wochen").json()
    assert wochen[0]["je_sportart"] == {"Laufen": 13.0, "Radfahren": 20.0, "Schwimmen": 1.5}
    assert wochen[1]["je_sportart"] == {}
    assert wochen[2]["je_sportart"] == {"Laufen": 13.0, "Radfahren": 30.0, "Wandern": 10.0}


# Chat mit LM Studio (nur lokal)
def test_chat_status_ohne_lmstudio(monkeypatch):
    # Zeigt der Server ehrlich an, dass kein Modell erreichbar ist, blendet das Frontend den Bot aus
    from app import chat
    monkeypatch.setattr(chat, "lmstudio_modelle", lambda: [])
    antwort = client.get("/api/chat/status")
    assert antwort.status_code == 200
    assert antwort.json() == {"verfuegbar": False, "modell": None}


def test_chat_status_mit_lmstudio(monkeypatch):
    from app import chat
    monkeypatch.setattr(chat, "lmstudio_modelle", lambda: ["gemma-4"])
    assert client.get("/api/chat/status").json() == {"verfuegbar": True, "modell": "gemma-4"}


def test_chat_ohne_lmstudio_ist_503(monkeypatch):
    from app import chat
    monkeypatch.setattr(chat, "lmstudio_modelle", lambda: [])
    antwort = client.post("/api/chat", json={"frage": "Wie viele Kilometer?", "verlauf": []})
    assert antwort.status_code == 503


def test_chat_antwortet_mit_kontext(monkeypatch):
    # LM Studio wird durch eine Funktion ersetzt, die die gesendeten Nachrichten zurückgibt
    from app import chat
    gesendet = {}

    def fake_lmstudio(nachrichten, modell):
        gesendet["nachrichten"] = nachrichten
        gesendet["modell"] = modell
        return "Du bist 87,5 km gelaufen."

    monkeypatch.setattr(chat, "lmstudio_modelle", lambda: ["gemma-4"])
    monkeypatch.setattr(chat, "frage_lmstudio", fake_lmstudio)
    antwort = client.post("/api/chat", json={
        "frage": "Wie viele Kilometer insgesamt?",
        "verlauf": [{"rolle": "nutzer", "text": "Hallo"}, {"rolle": "bot", "text": "Hallo zurück"}],
    })
    assert antwort.status_code == 200
    assert antwort.json() == {"antwort": "Du bist 87,5 km gelaufen.", "modell": "gemma-4"}
    system = gesendet["nachrichten"][0]
    assert system["role"] == "system"
    assert "87.5" in system["content"]                 # gesamt_km aus dem Fixture, vom Server gerechnet
    assert "Radfahren" in system["content"]            # Lieblingssportart
    rollen = [n["role"] for n in gesendet["nachrichten"]]
    assert rollen == ["system", "user", "assistant", "user"]
    assert gesendet["nachrichten"][-1]["content"] == "Wie viele Kilometer insgesamt?"


def test_chat_kontext_enthaelt_wochen_und_sportarten():
    from app.chat import baue_kontext
    from app.daten import lade_workouts
    text = baue_kontext(lade_workouts())
    assert "2026-W23" in text          # eine der drei Fixture-Wochen
    assert "Laufen: 26.0 km" in text   # 5,0 + 8,0 + 9,0 + 4,0 aus dem Fixture
    assert "Einheiten: 8" in text
