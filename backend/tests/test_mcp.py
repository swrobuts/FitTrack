"""Tests für die Werkzeuge des MCP-Servers (mcp/server.py).

Der Server holt die Einheiten per HTTP von der App. Hier wird der Abruf
durch die Testdatenbank ersetzt; die Werkzeuge rechnen dann mit denselben
acht Einheiten wie die API-Tests, und jeder Wert ist von Hand nachrechenbar
(siehe docs/dozent/erwartungswerte.md).
"""

import importlib.util
import sys
from pathlib import Path

import pytest

from app.daten import lade_workouts

# mcp/server.py unter eigenem Namen laden, damit der Ordner mcp/ nicht mit dem Paket mcp kollidiert
SERVER_DATEI = Path(__file__).parent.parent.parent / "mcp" / "server.py"
spec = importlib.util.spec_from_file_location("fittrack_mcp_server", SERVER_DATEI)
server = importlib.util.module_from_spec(spec)
sys.modules["fittrack_mcp_server"] = server
spec.loader.exec_module(server)


@pytest.fixture(autouse=True)
def testdaten_statt_http(monkeypatch):
    # Jeder Abruf der Einheiten liefert die acht Fixture-Einheiten
    monkeypatch.setattr(server, "hole_workouts", lambda: lade_workouts())


def test_werkzeuge_vollstaendig():
    namen = {w.name for w in server.server._tool_manager.list_tools()}
    assert namen == {"gesundheit", "heute", "kennzahlen", "woche", "wochen", "zeitraum", "bestwerte", "einheiten"}


def test_heute_nennt_datenstand():
    antwort = server.heute()
    assert antwort["erste_einheit"] == "2026-06-01"
    assert antwort["letzte_einheit"] == "2026-06-21"
    assert antwort["kalenderwoche_der_letzten_einheit"] == "2026-W25"
    assert len(antwort["heute"]) == 10 and antwort["aktuelle_kalenderwoche"].count("-W") == 1


def test_kennzahlen_mit_zeitraum():
    antwort = server.kennzahlen()
    assert antwort["gesamt_km"] == 87.5
    assert antwort["durchschnitt_km_pro_woche"] == 29.2
    assert antwort["lieblingssportart"] == "Radfahren"
    assert antwort["anzahl"] == 8
    assert antwort["zeitraum"] == {"von": "2026-06-01", "bis": "2026-06-21", "kalenderwochen": 3}


def test_woche_mit_training():
    antwort = server.woche("2026-W25")
    assert antwort["von"] == "2026-06-15" and antwort["bis"] == "2026-06-21"
    assert antwort["distanz_km"] == 53.0
    assert antwort["anzahl"] == 4
    assert antwort["dauer_min"] == 285
    assert antwort["je_sportart"] == {"Laufen": 13.0, "Radfahren": 30.0, "Wandern": 10.0}
    assert antwort["wochenziel_km"] == 40 and antwort["ziel_erreicht"] is True
    assert [e["id"] for e in antwort["einheiten"]] == [8, 7, 6, 5]


def test_woche_ohne_training_und_per_datum():
    leer = server.woche("2026-W24")
    assert leer["distanz_km"] == 0.0 and leer["anzahl"] == 0 and leer["ziel_erreicht"] is False
    assert leer["einheiten"] == []
    per_datum = server.woche("2026-06-17")          # ein Datum in der Woche geht auch
    assert per_datum["kalenderwoche"] == "2026-W25"


def test_woche_ausserhalb_der_daten():
    antwort = server.woche("2026-W30")
    assert antwort["distanz_km"] == 0.0
    assert "außerhalb" in antwort["hinweis"]


def test_wochen_bereich():
    alle = server.wochen(anzahl=0)
    assert [w["kw"] for w in alle] == ["2026-W23", "2026-W24", "2026-W25"]
    letzte = server.wochen(anzahl=1)
    assert letzte[0]["kw"] == "2026-W25"
    bereich = server.wochen(von_kw="2026-W23", bis_kw="2026-W24")
    assert [w["kw"] for w in bereich] == ["2026-W23", "2026-W24"]


def test_zeitraum_gesamt():
    antwort = server.zeitraum()
    assert antwort["von"] == "2026-06-01" and antwort["bis"] == "2026-06-21"
    assert antwort["distanz_km"] == 87.5
    assert antwort["anzahl"] == 8
    assert antwort["dauer_min"] == 460                 # 30+60+45+40+90+50+120+25
    assert antwort["kalorien"] == 4070                 # 350+500+560+400+750+630+600+280
    assert antwort["je_sportart"] == {"Radfahren": 50.0, "Laufen": 26.0, "Wandern": 10.0, "Schwimmen": 1.5}
    assert antwort["durchschnitt_km_pro_einheit"] == 10.9   # 87,5 / 8 = 10,9375
    assert antwort["kalenderwochen"] == 3
    assert antwort["durchschnitt_km_pro_woche"] == 29.2


def test_zeitraum_mit_filter():
    antwort = server.zeitraum(von="2026-06-01", bis="2026-06-30", sportart="laufen")
    assert antwort["sportart"] == "Laufen"
    assert antwort["distanz_km"] == 26.0             # 5 + 8 + 9 + 4
    assert antwort["anzahl"] == 4
    assert antwort["dauer_min"] == 150               # 30 + 45 + 50 + 25
    teil = server.zeitraum(von="2026-06-05", bis="2026-06-15")   # beide Tage einschließlich
    assert [e for e in [teil["anzahl"]]] == [3]      # 05.06., 06.06., 15.06.
    assert teil["distanz_km"] == 39.5                # 8 + 1,5 + 30


def test_zeitraum_prueft_eingaben():
    # ToolError statt ValueError: nur dessen Text reicht das SDK an das Modell weiter
    with pytest.raises(server.ToolError, match="Laufen, Radfahren, Schwimmen, Wandern"):
        server.zeitraum(sportart="Joggen")
    with pytest.raises(server.ToolError, match="JJJJ-MM-TT"):
        server.zeitraum(von="1.6.2026")
    with pytest.raises(server.ToolError, match="nach"):
        server.zeitraum(von="2026-06-21", bis="2026-06-01")
    with pytest.raises(server.ToolError, match="JJJJ-Wnn"):
        server.woche("KW36")


def test_bestwerte():
    antwort = server.bestwerte()
    assert antwort["laengste_einheit_km"]["id"] == 5 and antwort["laengste_einheit_km"]["distanz_km"] == 30.0
    assert antwort["laengste_einheit_min"]["id"] == 7 and antwort["laengste_einheit_min"]["dauer_min"] == 120
    assert antwort["beste_woche"]["kw"] == "2026-W25" and antwort["beste_woche"]["distanz_km"] == 53.0
    assert antwort["laengste_zielserie_wochen"] == 1     # nur KW 25 erreicht 40 km
    assert antwort["aktuelle_zielserie_wochen"] == 1
    rad = server.bestwerte(sportart="Radfahren")
    assert rad["laengste_einheit_km"]["id"] == 5
    assert rad["beste_woche"] == {"kw": "2026-W25", "distanz_km": 30.0}


def test_einheiten_mit_summe():
    antwort = server.einheiten(sportart="Laufen", anzahl=2)
    assert antwort["treffer"] == 4                    # alle Läufe im Zeitraum
    assert antwort["distanz_km"] == 26.0              # Summe über alle Treffer, nicht nur die gezeigten
    assert [e["id"] for e in antwort["einheiten"]] == [8, 6]
    alle = server.einheiten(von="2026-06-15", anzahl=0)
    assert [e["id"] for e in alle["einheiten"]] == [8, 7, 6, 5]
