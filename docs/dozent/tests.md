# Die Tests der Referenzlösung

Stand 11.09.2026, 32 Tests, alle grün in unter einer Sekunde: 15 für den Bauweg des Kurses und fünf für den Trainingsbot in `test_api.py`, zwölf für die Werkzeuge des MCP-Servers in `test_mcp.py`. Bot und MCP-Server sind nicht Teil des Bauwegs. Dieses Dokument beschreibt, wie die Tests aufgebaut sind, was jeder einzelne prüft und wie man sie ausführt.

## Ausführen

```bash
pytest                          # alle Tests, kurze Ausgabe: 32 passed
pytest -v                       # je Test Name und PASSED/FAILED
pytest -k test_stats_gesamt_km  # nur ein Test
```

In WebStorm: Rechtsklick auf `test_api.py`, „Run pytest in test_api.py“. Der Lauf erscheint als Liste mit Haken und Kreuzen, der grüne Pfeil oben rechts wiederholt ihn. `pytest.ini` legt `backend/tests` als Testordner fest und blendet eine Warnung von anyio aus.

Bei jedem Push führt `.github/workflows/tests.yml` denselben Lauf auf einem frischen Ubuntu-Runner aus: `pip install -r requirements.txt`, dann `pytest`. Das Ergebnis steht als Haken oder Kreuz am Commit.

## Aufbau

**Testdaten statt Echtdaten.** Die App liest ihre Datenbank aus dem Pfad in der Umgebungsvariablen `FITTRACK_DATA`. `conftest.py` läuft vor allen Tests, legt eine temporäre SQLite-Datei an, führt `schema.sql` und `fixtures/workouts_klein.sql` darauf aus und setzt `FITTRACK_DATA` auf diese Datei, bevor `app.main` importiert wird. Die Tests sehen also immer dieselben acht Einheiten, unabhängig von `fittrack.db`. Nach dem Lauf bleibt die Datei im Temp-Ordner liegen; das Betriebssystem räumt sie auf.

**Kein Server.** `TestClient(app)` aus FastAPI ruft die Routen im selben Prozess auf. `client.get("/api/stats")` liefert dasselbe Objekt, das ein Browser bekäme, ohne dass uvicorn läuft. Deshalb sind die Tests schnell und brauchen keinen freien Port.

**Erwartungswerte von Hand.** Jeder Zahlenwert in den Tests wurde aus den acht Fixture-Einheiten gerechnet, die Rechnung steht als Kommentar im Test und in `erwartungswerte.md`. Der Wert kommt nie aus dem Modell.

**Randfälle per monkeypatch.** Für „keine Daten“ tauscht `monkeypatch.setattr(main, "lade_workouts", lambda: [])` die Ladefunktion für die Dauer eines Tests gegen eine leere Liste aus. Die Datenbank bleibt unberührt, nach dem Test ist die echte Funktion zurück.

## Das Fixture

Acht Einheiten in drei Kalenderwochen, KW 24 bewusst leer:

| id | Datum | KW | Sportart | min | km | kcal |
|---|---|---|---|---|---|---|
| 1 | 01.06.2026 | 23 | Laufen | 30 | 5,0 | 350 |
| 2 | 03.06.2026 | 23 | Radfahren | 60 | 20,0 | 500 |
| 3 | 05.06.2026 | 23 | Laufen | 45 | 8,0 | 560 |
| 4 | 06.06.2026 | 23 | Schwimmen | 40 | 1,5 | 400 |
| 5 | 15.06.2026 | 25 | Radfahren | 90 | 30,0 | 750 |
| 6 | 17.06.2026 | 25 | Laufen | 50 | 9,0 | 630 |
| 7 | 19.06.2026 | 25 | Wandern | 120 | 10,0 | 600 |
| 8 | 21.06.2026 | 25 | Laufen | 25 | 4,0 | 280 |

Daraus: 87,5 km gesamt, 3 Kalenderwochen, Ø 29,2 km, Radfahren 50,0 km vor Laufen 26,0 km; KW 23: 34,5 km, 4 Einheiten, 175 min; KW 25: 53,0 km, 4 Einheiten, 285 min.

## Die 15 Tests des Bauwegs

| Test | Story | Prüft | Erwartung | Warum dieser Test |
|---|---|---|---|---|
| `test_health` | US-3 | Endpunkt antwortet | 200, `{"status": "ok"}` | Erster Test im Kurs, die Schleife einmal ganz; später Health-Check für Docker und Render |
| `test_workouts_liefert_liste` | US-1 | Typ und Anzahl | Liste mit 8 Einträgen | Beweist, dass die Testdatenbank gelesen wird, nicht die Echtdaten |
| `test_workouts_felder` | US-1 | Struktur | genau `id, datum, sportart, dauer_min, distanz_km, kalorien` | Fängt zusätzliche oder fehlende Felder, etwa `sportart_id` aus der Tabelle statt `sportart` aus der Sicht |
| `test_workouts_sortiert_absteigend` | US-1 | Sortierung in SQL | id 8 zuerst, id 1 zuletzt | Die Sortierung liegt im `ORDER BY` der Abfrage, nicht in Python |
| `test_echtdaten_sind_lesbar` | US-1 | Rauchtest gegen `fittrack.db` | mehr als 250 Zeilen, alle vier Sportarten | Der einzige Test gegen Echtdaten; fängt eine kaputte oder leere Datenbank im Repo |
| `test_stats_gesamt_km` | US-2 | Summe und Rundung | 87,5 | Der Vorführtest: Wert von Hand gerechnet |
| `test_stats_durchschnitt` | US-2 | Wochenzählung mit Lücke | 29,2 | Häufigster Fehler: nur Wochen mit Training zählen ergibt 43,75 |
| `test_stats_lieblingssportart` | US-2 | Definition über Distanz | Radfahren | Nach Anzahl wäre es Laufen; zeigt, warum das Kriterium präzise sein muss |
| `test_stats_anzahl` | US-2 | Zählung | 8 | Vollständigkeit der Antwort |
| `test_stats_leere_liste` | US-2 | Randfall ohne Daten | 0.0, 0.0, null, 0 | Division durch null Wochen, `max()` auf leerer Liste; per `monkeypatch` |
| `test_index_liefert_html` | US-4 | Auslieferung des Frontends | 200, `text/html`, „FitTrack“ | Fängt den Fehler, `app.mount("/")` vor den API-Routen zu registrieren |
| `test_wochen_anzahl_und_luecken` | US-6 | Lückenwoche mit Nullwerten | 3 Wochen, KW 24 komplett mit Nullen und `je_sportart: {}` | Wochen ohne Training dürfen nicht fehlen, sonst zeigt das Diagramm Urlaub als Training |
| `test_wochen_summen` | US-6 | Summen je Woche | 34,5 / 4 / 175 und 53,0 / 4 / 285 | Aggregation je Kalenderwoche, Montag als `wochenstart` |
| `test_wochen_leer` | US-6 | Randfall ohne Daten | leere Liste | per `monkeypatch` |
| `test_wochen_je_sportart` | US-7 | Kilometer je Sportart und Woche | KW 23: Laufen 13,0, Radfahren 20,0, Schwimmen 1,5; KW 24: `{}`; KW 25: Laufen 13,0, Radfahren 30,0, Wandern 10,0 | Das Backend liefert die Aufteilung, das Frontend rechnet nichts selbst |

## Die fünf Tests für den Trainingsbot

Der Chat über die eigenen Daten (`POST /api/chat`, nur lokal mit LM Studio) hat fünf eigene Tests. LM Studio wird darin per `monkeypatch` durch feste Antworten ersetzt, die Tests laufen also ohne Modell und ohne Netz. Beschreibung in `docs/dozent/mcp.md`, Abschnitt Tests.

## Die zwölf Tests für den MCP-Server

`test_mcp.py` lädt `mcp/server.py` und ersetzt den HTTP-Abruf der Einheiten durch die Testdatenbank. Jedes Werkzeug wird mit von Hand gerechneten Werten aus den acht Einheiten geprüft, dazu die Fehlermeldungen bei ungültiger Sportart, falschem Datumsformat und vertauschten Grenzen. Beschreibung in `docs/dozent/mcp.md`.

## Was die Tests nicht prüfen

Sie prüfen die API, nicht die Oberfläche. Ob das Dashboard aus richtigen Zahlen eine wahre Aussage macht (Ring bei 161 %, vergangene Woche als Fortschritt), sieht kein Test. Dafür gibt es den Semantik-Review in `docs/checklisten.md` und die Abnahme am Gerät: 375 px breit, kein horizontales Scrollen, jedes Objekt antippbar. Ebenso ungeprüft bleiben Docker-Build und Deploy; die prüfen der Health-Check bei Render und der Handy-Test.

## Tests ändern

Ein Test wird nie geändert, damit er zum Code passt. Er ändert sich nur, wenn eine Story die Spezifikation erweitert. Beispiel: US-7 fügt `je_sportart` zur Wochenantwort hinzu, deshalb bekam `test_wochen_anzahl_und_luecken` das Feld in seinem Vergleichsobjekt, und `test_wochen_je_sportart` kam dazu, beides vor dem Code und mit Begründung im Commit `feat(US-7)`.

## Häufige Fehlerbilder

| Ausgabe | Ursache | Abhilfe |
|---|---|---|
| `ModuleNotFoundError: No module named 'app.main'` | `main.py` fehlt noch (Starter) oder pytest läuft aus dem falschen Ordner | Im Projektordner starten; im Starter ist das der erwartete rote Zustand |
| `assert 404 == 200` | Route fehlt oder heißt anders | Pfad im Decorator mit dem Test vergleichen |
| `assert 43.8 == 29.2` | Nur Wochen mit Training gezählt | Kalenderwochen von der ersten bis zur letzten Woche zählen |
| `KeyError: 'sportart'` | Aus der Tabelle `workout` statt aus der Sicht `v_workout` gelesen | `SELECT … FROM v_workout` |
| alle API-Tests 404, nur `test_index` grün | `app.mount("/")` steht vor den Routen | Mount als letzte Zeile in `main.py` |
