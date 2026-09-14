"""Regressionstests für Zeiträume, Tempo und fehlerhafte Modellantworten."""

import json

import httpx2
import pytest
from fastapi.testclient import TestClient

from app import chat, statistik, werkzeuge
from app.daten import lade_workouts
from app.main import app


def test_zeitraum_zaehlt_auch_leere_randwochen():
    ergebnis = statistik.zeitraum_zusammenfassung(lade_workouts(), "2026-06-01", "2026-06-30", "Schwimmen")
    assert ergebnis["kalenderwochen"] == 5
    assert ergebnis["durchschnitt_km_pro_woche"] == 0.3  # 1,5 km / 5 Wochen


def test_leerer_zeitraum_behaelt_seine_wochen():
    ergebnis = statistik.zeitraum_zusammenfassung([], "2026-06-01", "2026-06-30")
    assert ergebnis["kalenderwochen"] == 5
    assert ergebnis["durchschnitt_km_pro_woche"] == 0.0
    assert statistik.zeitraum_zusammenfassung([])["kalenderwochen"] == 0


@pytest.mark.parametrize("name", ["zeitraum", "sportarten", "wochentage", "einheiten"])
def test_alle_zeitfilter_melden_vertauschte_grenzen(name):
    ergebnis = werkzeuge.fuehre_aus(name, {"von": "2026-06-30", "bis": "2026-06-01"}, lade_workouts())
    assert "nach" in ergebnis["fehler"]


@pytest.mark.parametrize("minuten,km,text", [(25, 4.0, "6:15 min/km"), (299, 49.9, "6:00 min/km")])
def test_tempo_rundet_sekunden_mit_minutenuebertrag(minuten, km, text):
    assert statistik.mit_tempo({"dauer_min": minuten, "distanz_km": km})["tempo_text"] == text


@pytest.mark.parametrize("argumente", [[], "falsch", 3, None, {"sportart": 42}, {"anzahl": "2"}])
def test_werkzeug_meldet_falsche_argumenttypen(argumente):
    ergebnis = werkzeuge.fuehre_aus("einheiten", argumente, lade_workouts())
    assert "fehler" in ergebnis


@pytest.mark.parametrize("argumente", ['{"von":', '[]', 'null', '42'])
def test_chat_gibt_ungueltige_argumente_als_fehler_zurueck(monkeypatch, argumente):
    runden = []

    def fake_lmstudio(nachrichten, modell, werkzeuge_schema=None):
        runden.append(list(nachrichten))
        if len(runden) == 1:
            return {"tool_calls": [{"id": "a1", "function": {"name": "zeitraum", "arguments": argumente}}]}
        return {"content": "Bitte den Zeitraum präzisieren."}

    monkeypatch.setattr(chat, "lmstudio_modelle", lambda: ["testmodell"])
    monkeypatch.setattr(chat, "frage_lmstudio", fake_lmstudio)
    antwort = TestClient(app).post("/api/chat", json={"frage": "Wie viel im Juni?"})
    assert antwort.status_code == 200
    ergebnis = json.loads(runden[1][-1]["content"])
    assert "fehler" in ergebnis
    assert "distanz_km" not in ergebnis  # Niemals stillschweigend den gesamten Bestand auswerten.


@pytest.mark.parametrize("inhalt", [{"choices": []}, {"choices": [{"message": None}]}, {"choices": [{"message": {"content": 42}}]}])
def test_chat_meldet_defekte_modellantwort_als_502(monkeypatch, inhalt):
    monkeypatch.setattr(chat, "lmstudio_modelle", lambda: ["testmodell"])
    monkeypatch.setattr(chat.httpx2, "post", lambda *a, **kw: httpx2.Response(200, json=inhalt, request=httpx2.Request("POST", "http://localhost/test")))
    antwort = TestClient(app).post("/api/chat", json={"frage": "Hallo"})
    assert antwort.status_code == 502


def test_chat_status_bei_abgebrochener_verbindung(monkeypatch):
    def abbruch(*args, **kwargs):
        raise httpx2.ReadError("Verbindung abgebrochen")

    monkeypatch.setattr(chat.httpx2, "get", abbruch)
    assert TestClient(app).get("/api/chat/status").json() == {"verfuegbar": False, "modell": None}


def test_chat_leerer_denkkanal_ist_keine_antwort(monkeypatch):
    monkeypatch.setattr(chat, "lmstudio_modelle", lambda: ["testmodell"])
    monkeypatch.setattr(chat, "frage_lmstudio", lambda *a: {"content": "<|channel>thought<channel|>"})
    assert TestClient(app).post("/api/chat", json={"frage": "Hallo"}).status_code == 502
