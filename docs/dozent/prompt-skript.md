# FitTrack – Prompt-Skript für die Vorführung

Dieses Skript führt in 10 Schritten durch die Entwicklung der App. Jeder Schritt entspricht einem Git-Tag der Referenzlösung, sodass sich jeder Stand vorzeigen lässt:

```bash
git checkout us-2        # Stand nach Schritt 3 anzeigen
git checkout main        # zurück zum fertigen Stand
```

| Schritt | Tag | Termin | Zeit | Inhalt |
|---|---|---|---|---|
| 0 | `sprint-0` | 1 | 0:10 | Starter klonen, Setup, roter Test |
| 1 | `us-3` | 1 | 0:55 | `/health` |
| 2 | `us-1` | 1 | 1:05 | `/api/workouts` |
| 3 | `us-2` | 1 | 1:20 | `/api/stats` mit Handrechnung |
| 4 | `us-4` | 2 | 0:05 | Frontend-Gerüst, mobile-first |
| 5 | `us-5` | 2 | 0:25 | Kennzahlen und Liste per fetch |
| 6 | `us-6` | 2 | 0:40 | Wochenverlauf, Ring, Diagramm |
| 6b | `us-7` | 2 | 1:00 | Semantik-Review: Bullet-Graph, Kalender, Kacheln |
| 7 | `docker` | 2 | 1:10 | Dockerfile, Build, Handy-Test |
| 8 | `render` | 2 | 1:25 | Deploy auf Render.com |
| 9 | `ci` | optional | | GitHub Actions |

## So läuft jeder Schritt ab

```text
1. Story und Akzeptanzkriterium lesen          (PO)
2. Test schreiben, pytest laufen lassen: ROT    (QA)
3. Prompt in den Chat kopieren                  (Dev)
4. Antwort LESEN, Prüfpunkte abhaken            (alle)
5. Code in WebStorm übernehmen                  (Dev)
6. pytest laufen lassen: GRÜN                   (QA)
   rot? -> Fehlermeldung wörtlich in den Chat zurück
7. Commit mit Story-Bezug, Push                 (Dev)
```

Die Prompts sind in sich geschlossen. Der Chat sieht das Repo nicht, deshalb steht der nötige Kontext jedes Mal im Prompt. Die Antworten von Claude oder einem lokalen Modell weichen von der Referenzlösung ab. Das ist in Ordnung: Maßstab sind die Tests und das Akzeptanzkriterium, nicht die Übereinstimmung mit der Referenz.

Konventionen, die in jedem Prompt stehen: deutsche Feldnamen, deutsche Bezeichner und Kommentare, nur die Pakete aus `requirements.txt`, Erklärung in drei Sätzen.

## So testen Sie konkret

Ein Test ist eine kleine Python-Funktion, die die App aufruft und das Ergebnis mit einem Wert vergleicht, den die Gruppe vorher selbst kennt. Ausgeführt wird sie mit einem Befehl im Terminal, nie im Chat. Der Chat bekommt den Test nur als Text mitgeliefert. Am Beispiel der Kennzahl „Gesamtkilometer“ (US-2):

**1. Erwartungswert von Hand rechnen.** Die Testdaten sind acht Einheiten in `backend/tests/fixtures/workouts_klein.sql`. Kilometer addieren: 5,0 + 20,0 + 8,0 + 1,5 + 30,0 + 9,0 + 10,0 + 4,0 = 87,5. Das ist die Zahl, die die App liefern muss. Lösung für den Dozenten in `erwartungswerte.md`.

**2. Den Test in die Datei schreiben.** In WebStorm `backend/tests/test_api.py` öffnen und ergänzen:

```python
def test_stats_gesamt_km():
    stats = client.get("/api/stats").json()
    assert stats["gesamt_km"] == 87.5
```

Zeile 1 benennt den Test (Name beginnt mit `test_`, sonst findet pytest ihn nicht). Zeile 2 ruft die App auf wie ein Browser. Zeile 3 behauptet: Das Feld `gesamt_km` ist 87,5. Stimmt das nicht, schlägt der Test fehl.

**3. Tests laufen lassen.** Im Terminal von WebStorm, im Projektordner:

```bash
pytest
```

pytest sucht alle Funktionen, die mit `test_` beginnen, führt sie aus und meldet je Test PASSED oder FAILED. Solange der Endpunkt fehlt, sieht das so aus:

```text
FAILED backend/tests/test_api.py::test_stats_gesamt_km - ... 404
1 failed in 0.16s
```

Rot ist hier richtig. Es beweist, dass der Test etwas prüft, was noch fehlt. Ein Test, der von Anfang an grün ist, hat nichts belegt.

**4. Prompt in den Chat.** Der Chat führt nichts aus und sieht das Repository nicht. Deshalb steht der Test wörtlich im Prompt, als Auftrag: „Der Code muss diesen Test bestehen: …“. Die Antwort lesen, Prüfpunkte abhaken, Code in `statistik.py` und `main.py` übernehmen.

**5. Wieder `pytest`.** Entweder grün:

```text
41 passed in 0.57s
```

oder rot mit genauer Angabe. Ein Lauf mit falschem Ergebnis sieht so aus:

```text
>       assert stats["gesamt_km"] == 87.5
E       assert 90.0 == 87.5
backend/tests/test_api.py:52: AssertionError
```

Die Zeile mit `E` sagt: Die App liefert 90,0, der Test erwartete 87,5. Genau diesen Block wörtlich in den Chat zurück („Der Test schlägt so fehl: …“), korrigierten Code übernehmen, wieder `pytest`. Bis grün.

**6. Committen.** Erst wenn `pytest` grün ist: `Git → Commit` in WebStorm, Nachricht `feat(US-2): Kennzahlen-Endpunkt`, Push. Ab Schritt 9 wiederholt GitHub Actions denselben Lauf bei jedem Push auf einem frischen Rechner.

**Alternative zum Terminal:** Rechtsklick auf `test_api.py` in WebStorm, „Run pytest in test_api.py“. Unten erscheint eine Liste mit grünen Haken und roten Kreuzen je Test, oben rechts ein grüner Pfeil zum Wiederholen. Ein einzelner Test: `pytest -k test_stats_gesamt_km`. Mehr Ausgabe: `pytest -v`.

**Was dahinter passiert:** `conftest.py` baut vor jedem Lauf aus `schema.sql` und dem Fixture eine temporäre Testdatenbank und setzt `FITTRACK_DATA` darauf. Die Tests laufen also nie gegen die 311 Echtdaten. `TestClient` ruft die App im selben Prozess auf, ein Server wird nicht gestartet; deshalb dauern alle 41 Tests unter einer Sekunde. Für den Randfall „keine Daten“ tauscht `monkeypatch` die Ladefunktion vorübergehend gegen eine leere Liste aus.

**Zwei Regeln:** Der Erwartungswert kommt nie vom Modell, sonst prüft der Test nur, ob die KI mit sich selbst übereinstimmt. Und der Test wird nie geändert, damit er zum Code passt; der Code muss sich dem Test anpassen. Ausnahme: Eine Story erweitert bewusst die Spezifikation, wie US-7 mit `je_sportart`. Dann ändert sich der Test vor dem Code, mit Begründung im Commit.

Beschreibung aller Tests: `docs/dozent/tests.md`. Die Referenzlösung hat 41: 15 entstehen auf dem Bauweg, fünf gehören zum Trainingsbot und 21 zum MCP-Server, beide nach dem Kurs dazugekommen.

---

## Schritt 0: Starter (Termin 1, ab 0:10)

**Ziel:** Alle haben das Repo, die Umgebung läuft, der erste Test ist rot.

**Studierende führen aus:**

```bash
git clone -b starter <URL> FitTrack
cd FitTrack
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
pytest
```

**Erwartung:** `ModuleNotFoundError: No module named 'app.main'`. Das ist richtig so. Der Test in `backend/tests/test_api.py` beschreibt, was die App können soll, bevor es Code gibt.

**Zeigen:**

- `README.md` mit Backlog und Datenmodell
- `backend/app/data/fittrack.db`: SQLite-Datenbank mit 311 echten Einheiten, Schema in `schema.sql` (zwei Tabellen, eine Sicht)
- `backend/tests/fixtures/workouts_klein.sql`: 8 Einheiten für die Tests, als lesbare SQL-Datei
- `backend/tests/conftest.py`: warum die Tests eine eigene, frisch gebaute Testdatenbank nutzen (Testdaten sind nicht Produktionsdaten)

**Datenhaltung zeigen (5 Minuten):** `schema.sql` in WebStorm öffnen und die drei Objekte erklären: Tabelle `sportart` (Name genau einmal gespeichert), Tabelle `workout` mit Fremdschlüssel und CHECK-Regeln, Sicht `v_workout`, die beide verbindet. Dann in WebStorm über das Database-Werkzeugfenster oder in DataGrip `fittrack.db` öffnen und `SELECT * FROM v_workout ORDER BY datum DESC LIMIT 5;` ausführen. Das ER-Diagramm steht im README. Botschaft: Die App liest nur die Sicht, das Schema schützt die Daten.

**Agiles Setup (0:20 bis 0:40):** Vision vorlesen, Rollen vergeben, Sprint-1-Ziel festlegen: „Am Ende liefern `/api/workouts` und `/api/stats` korrekte, getestete Daten.“

---

## Schritt 1: US-3 Health-Endpunkt (Termin 1, ab 0:55)

**Story:** Als Entwickler möchte ich einen Health-Endpunkt, damit ich später im Container prüfen kann, ob die App läuft. Akzeptanz: `GET /health` liefert `{"status": "ok"}`.

**Test:** steht bereits in `test_api.py`. `pytest` ist rot.

**Prompt:**

```text
Du bist ein erfahrener Python-Entwickler. Wir bauen mit FastAPI eine kleine
Fitness-App namens FitTrack. Projektstruktur:

FitTrack/
├── backend/app/main.py      <- diese Datei gibt es noch nicht
├── backend/tests/test_api.py
└── requirements.txt         (fastapi, uvicorn, pytest, httpx2)

Aufgabe: Erstelle backend/app/main.py mit einer FastAPI-App und dem
Endpunkt GET /health, der {"status": "ok"} zurückgibt.

Randbedingungen:
- Nur FastAPI, keine weiteren Pakete
- Kommentare und Docstrings auf Deutsch, kurz
- Die App wird so gestartet:
  uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
- Dieser Test muss bestehen:

from fastapi.testclient import TestClient
from app.main import app
client = TestClient(app)

def test_health():
    antwort = client.get("/health")
    assert antwort.status_code == 200
    assert antwort.json() == {"status": "ok"}

Gib nur die Datei main.py aus und erkläre in drei Sätzen deine Entscheidungen.
```

**Prüfpunkte:**

- Gibt es genau eine Datei? Hat das Modell etwas Ungefragtes ergänzt (Middleware, CORS, Logging)? Weglassen.
- Steht `app = FastAPI(...)` auf Modulebene? Der Test importiert `app`.
- Existiert jeder Import?

**WebStorm:** Rechtsklick auf `backend/app` → `New → Python File` → `main`. Code einfügen, `⌘⌥L` formatieren, speichern.

**Befehle:**

```bash
pytest                                   # 1 passed
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

Browser: <http://localhost:8000/health> und <http://localhost:8000/docs>. Die automatische Doku ist ein Argument für FastAPI.

**Commit:** `feat(US-3): Health-Endpunkt`

---

## Schritt 2: US-1 Liste der Trainingseinheiten (Termin 1, ab 1:05)

**Story:** Als Nutzer möchte ich alle meine Trainingseinheiten als JSON abrufen, damit die App sie anzeigen kann. Akzeptanz: `GET /api/workouts` liefert Status 200 und eine Liste; jedes Element enthält `id, datum, sportart, dauer_min, distanz_km, kalorien`.

**Test zuerst** (QA ergänzt in `test_api.py`, dann `pytest`: 3 failed):

```python
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
    from app.daten import STANDARD_DATEI, lade_workouts
    echt = lade_workouts(STANDARD_DATEI)
    assert len(echt) > 250
    assert {"Laufen", "Radfahren", "Schwimmen", "Wandern"} == {w["sportart"] for w in echt}
```

Frage an die Gruppe: Warum 8 und nicht 311? Antwort steht in `conftest.py`: Die Tests bauen bei jedem Lauf eine eigene Datenbank aus `schema.sql` und `workouts_klein.sql`. Nur der Rauchtest schaut in die echte Datenbank, und er prüft dort nichts Fachliches.

**Prompt:**

```text
Du bist ein erfahrener Python-Entwickler. Wir bauen mit FastAPI eine kleine
Fitness-App namens FitTrack. Es gibt bereits backend/app/main.py:

from fastapi import FastAPI
app = FastAPI(title="FitTrack", version="0.1.0")

@app.get("/health")
def health() -> dict:
    return {"status": "ok"}

Die Trainingsdaten liegen in der SQLite-Datenbank backend/app/data/fittrack.db.
Das Schema (backend/app/data/schema.sql) hat zwei Tabellen und eine Sicht:

CREATE TABLE sportart (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, einheit TEXT NOT NULL DEFAULT 'km');
CREATE TABLE workout (id INTEGER PRIMARY KEY, datum TEXT NOT NULL, sportart_id INTEGER NOT NULL REFERENCES sportart(id),
                      dauer_min INTEGER NOT NULL, distanz_km REAL NOT NULL, kalorien INTEGER NOT NULL);
CREATE VIEW v_workout AS SELECT w.id, w.datum, s.name AS sportart, w.dauer_min, w.distanz_km, w.kalorien
                        FROM workout w JOIN sportart s ON s.id = w.sportart_id;

Eine Zeile der Sicht v_workout sieht als Dictionary so aus:
{"id": 1, "datum": "2026-06-01", "sportart": "Laufen",
 "dauer_min": 30, "distanz_km": 5.0, "kalorien": 350}
Sportarten: Laufen, Radfahren, Schwimmen, Wandern. datum ist ISO-Format.

Aufgabe: Implementiere GET /api/workouts. Dafür brauche ich drei Dateien:
1. backend/app/daten.py mit einer Funktion lade_workouts(pfad=None) -> list[dict].
   Sie liest mit dem Standardmodul sqlite3 aus der Sicht v_workout und gibt
   eine Liste von Dictionaries zurück (sqlite3.Row als row_factory).
   Der Pfad zur Datenbank kommt aus der Umgebungsvariable FITTRACK_DATA;
   ist sie nicht gesetzt, gilt backend/app/data/fittrack.db relativ zur
   Datei daten.py (nicht relativ zum Arbeitsverzeichnis). Der optionale
   Parameter pfad überschreibt beides.
   Sortierung in der SQL-Abfrage: ORDER BY datum DESC, id DESC.
   Verbindung nach dem Lesen schließen (try/finally).
2. backend/app/models.py mit einem Pydantic-Modell Workout für die sechs Felder.
3. Ergänzung in main.py: GET /api/workouts mit response_model=list[Workout].

Randbedingungen:
- Nur Standardbibliothek (sqlite3, os, pathlib), FastAPI und Pydantic, kein ORM
- Relative Imports innerhalb von app (from .daten import lade_workouts)
- Deutsche Bezeichner und kurze deutsche Kommentare
- Diese Tests müssen bestehen (die Tests setzen FITTRACK_DATA auf eine
  Testdatenbank mit 8 Einheiten, ids 1 bis 8, Daten vom 2026-06-01 bis 2026-06-21):

[die drei Tests von oben einfügen]

Gib die drei Dateien vollständig aus und erkläre in drei Sätzen deine Entscheidungen.
```

**Prüfpunkte:**

- Ist der Pfad relativ zur Datei (`Path(__file__).parent`) und nicht zum Arbeitsverzeichnis? Sonst läuft die App nur aus einem bestimmten Ordner.
- Wird die Umgebungsvariable beim Import gelesen oder bei jedem Aufruf? Beides ist hier in Ordnung, aber die Gruppe sollte es erklären können.
- Sortiert die SQL-Abfrage nach Datum und id absteigend? Ein Modell sortiert gern nur nach Datum oder sortiert in Python nach, statt ORDER BY zu nutzen.
- Liest der Code die Sicht `v_workout` oder baut er den JOIN selbst nach? Beides funktioniert, die Sicht ist der vereinbarte Weg.
- Wird die Verbindung geschlossen? Offene Verbindungen sind der klassische Fehler bei SQLite.
- Hat das Modell `pandas` oder ein ORM wie SQLAlchemy eingeschmuggelt?

**WebStorm:** zwei neue Dateien `daten.py`, `models.py` in `backend/app`, `main.py` ergänzen.

**Befehle:** `pytest` (5 passed). Server neu laden, <http://localhost:8000/api/workouts> zeigt 311 Einheiten.

**Commit:** `feat(US-1): Workouts-Endpunkt mit Datenmodell`

---

## Schritt 3: US-2 Kennzahlen (Termin 1, ab 1:20)

**Story:** Als Nutzer möchte ich meine Kennzahlen abrufen, damit ich meinen Fortschritt sehe. Akzeptanz: `GET /api/stats` liefert `gesamt_km`, `durchschnitt_km_pro_woche`, `lieblingssportart`, `anzahl`, korrekt berechnet für das Fixture.

**Zuerst rechnen, nicht prompten.** Die Gruppe rechnet die Erwartungswerte aus `workouts_klein.sql` mit dem Taschenrechner. Definitionen stehen im README. Lösung für den Dozenten: `docs/dozent/erwartungswerte.md`. Typischer Streitpunkt: Zählt die leere KW 24 mit? Ja, laut Definition. Ergebnis: 87,5 km, 3 Wochen, 29,2 km pro Woche, Radfahren, 8 Einheiten.

**Test zuerst** (`pytest`: 5 failed):

```python
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
```

Kurz erklären: `monkeypatch` ersetzt `lade_workouts` nur für diesen einen Test. Deshalb muss `main.py` die Funktion mit `from .daten import lade_workouts` importieren und beim Aufruf `lade_workouts()` schreiben, nicht `daten.lade_workouts()`.

**Prompt** (dieser Prompt ist auch der Vergleichsprompt für die LM-Studio-Demo):

```text
Du bist ein erfahrener Python-Entwickler. Wir bauen mit FastAPI eine kleine
Fitness-App namens FitTrack. Es gibt eine Funktion lade_workouts() in
backend/app/daten.py, die eine Liste von Dictionaries liefert:
{"id": 1, "datum": "2026-06-01", "sportart": "Laufen",
 "dauer_min": 30, "distanz_km": 5.0, "kalorien": 350}

Aufgabe: Implementiere GET /api/stats.

1. Neue Datei backend/app/statistik.py mit einer reinen Funktion
   berechne_stats(workouts: list[dict]) -> dict, ohne FastAPI-Import.
   Rückgabe:
   - gesamt_km: Summe aller distanz_km, gerundet auf 1 Nachkommastelle
   - durchschnitt_km_pro_woche: gesamt_km geteilt durch die Anzahl der
     ISO-Kalenderwochen von der Woche des ersten bis zur Woche des letzten
     Trainings, beide inklusive (Wochen ohne Training zählen mit),
     gerundet auf 1 Nachkommastelle
   - lieblingssportart: Sportart mit der größten Summe distanz_km,
     bei Gleichstand die alphabetisch erste
   - anzahl: Anzahl der Einheiten
   Leere Liste: 0.0, 0.0, None, 0
2. Pydantic-Modell Stats in backend/app/models.py (lieblingssportart: str | None)
3. Route in main.py: GET /api/stats mit response_model=Stats, die
   berechne_stats(lade_workouts()) zurückgibt. Import so:
   from .daten import lade_workouts

Randbedingungen:
- Nur Standardbibliothek (datetime, collections) und Pydantic
- Kleine Hilfsfunktionen mit deutschen Namen, je ein Docstring
- Diese Tests müssen bestehen:

[die fünf Tests von oben einfügen]

Gib statistik.py vollständig und die Ergänzungen für models.py und main.py
aus. Erkläre in drei Sätzen, wie du die Kalenderwochen zählst.
```

**Prüfpunkte:**

- Zählt der Code die leere Woche mit? Häufigster Fehler: `len(set(wochen))` zählt nur Wochen mit Training und liefert 43,75.
- Wird der Montag über `isocalendar()` oder `weekday()` bestimmt? Beides richtig, Jahreswechsel bedenken.
- Wo wird gerundet? Erst am Ende, nicht bei jeder Teilsumme.
- Ist der Gleichstand behandelt? Der Test prüft ihn nicht. Diskussion: Was, wenn die KI ihn weglässt? Test ergänzen oder bewusst zurückstellen.
- Enthält `statistik.py` einen FastAPI-Import? Dann ist die Trennung verfehlt.

**Befehle:** `pytest` (10 passed). <http://localhost:8000/api/stats> mit den Echtdaten: 3963 km, 37,7 km pro Woche, Radfahren, 311.

**Commit:** `feat(US-2): Kennzahlen-Endpunkt`

**Sprint Review 1 (1:45):** PO ruft jede Story auf. Tests grün? Kriterium im Browser gezeigt? Dann abgenommen.

---

## Schritt 4: US-4 Mobile-first Gerüst (Termin 2, ab 0:05)

**Story:** Als Nutzer möchte ich die App auf dem Smartphone öffnen und ein übersichtliches Dashboard sehen. Akzeptanz: `GET /` liefert die Seite; bei 375 px Breite kein horizontales Scrollen; Karten stapeln sich; Touch-Targets mindestens 44 px.

**Test zuerst** (`pytest`: 1 failed):

```python
# US-4: Frontend wird von FastAPI ausgeliefert
def test_index_liefert_html():
    antwort = client.get("/")
    assert antwort.status_code == 200
    assert "text/html" in antwort.headers["content-type"]
    assert "FitTrack" in antwort.text
```

**Mobile-First in drei Regeln** (vorab, 3 Minuten): 1. Basis-CSS für schmale Screens, dann `@media (min-width: 768px)` erweitern. 2. Flexbox oder Grid statt fester Breiten. 3. Touch-Targets mindestens 44 px, Schrift mindestens 16 px.

**Prompt:**

```text
Du bist ein erfahrener Frontend-Entwickler. Wir bauen das Dashboard einer
Fitness-App namens FitTrack: reines HTML, CSS und Vanilla JS ohne Build-Step.
Vorbild sind die Dashboards von Garmin Connect, Apple Fitness und RingConn:
dunkler Hintergrund, abgerundete Karten, große Kennzahlen, ruhige Typografie.

Aufgabe, Teil 1 von 3: nur die Struktur und das Stylesheet, noch keine Daten.

frontend/index.html mit folgenden Bereichen von oben nach unten, alle
Werte vorerst als Platzhalter „…“:
1. Kopf: Titel „FitTrack“ und ein <p id="zeitraum">
2. <section id="woche">: Wochenziel-Ring. Ein SVG-Kreis (r=52 in einem
   120er viewBox) mit <circle id="ring-balken">, daneben eine
   Definitionsliste mit <dd id="woche-km">, <dd id="woche-anzahl">,
   <dd id="woche-minuten">. Titel <h2 id="woche-titel">,
   Untertitel <p id="woche-untertitel">.
3. <section id="kennzahlen">: vier Kacheln im 2er-Raster mit den ids
   stat-gesamt, stat-woche, stat-sport, stat-anzahl
   (Beschriftungen: Gesamt, Pro Woche, Lieblingssport, Einheiten)
4. <section id="diagramm">: Titel „Kilometer pro Woche“, vier Buttons
   „8 W“, „6 M“, „1 J“, „Alles“ mit data-wochen="8|26|52|0", darunter
   <canvas id="wochen-chart"> in einem Container mit fester Höhe 200 px
5. <section id="aktivitaeten">: Titel „Letzte Aktivitäten“,
   <ol id="aktivitaeten-liste">, Button <button id="mehr-anzeigen" hidden>

frontend/style.css:
- CSS Custom Properties in :root für alle Farben: --bg #0f1419,
  --karte #1a2129, --karte-hell #232c36, --linie #2c3641, --text #f2f5f7,
  --text-2 #8c98a4, --akzent #f5b841, dazu --laufen #ff6b4a,
  --radfahren #4cc9f0, --schwimmen #7b8cff, --wandern #8bd450
- Schrift Manrope (Google Fonts) mit system-ui als Fallback,
  font-size 16px, font-variant-numeric: tabular-nums
- Mobile zuerst: eine Spalte, max-width 480px, Karten 100 % breit,
  border-radius 20px, kein Schatten
- Alle Buttons mindestens 44px hoch
- Ein Breakpoint @media (min-width: 768px): zwei Spalten per CSS Grid
  mit grid-template-areas, Diagramm und Liste nebeneinander
- Der Ring: stroke-dasharray 327 (Umfang bei r=52), stroke-dashoffset 327,
  SVG um -90deg gedreht, damit der Balken oben startet
- Sportart-Farbe über [data-sport="Laufen"] { --sport-farbe: var(--laufen) }
  usw., damit Listenzeilen später die Farbe per Attribut bekommen

Randbedingungen:
- <meta name="viewport" content="width=device-width, initial-scale=1">
- Keine Bilder, keine Emojis, kein Framework, kein Tailwind
- Kurze deutsche Kommentare, die einem Anfänger erklären, warum
- Noch kein JavaScript in diesem Schritt

Gib beide Dateien vollständig aus. Erkläre in drei Sätzen, wie das
Mobile-First-Prinzip im CSS umgesetzt ist.
```

**Dann FastAPI die Seite ausliefern lassen** (zweiter, kurzer Prompt oder selbst schreiben):

```text
Ergänze in backend/app/main.py: Der Ordner frontend/ (liegt neben backend/
im Projektordner) soll als statische Dateien unter / ausgeliefert werden,
sodass GET / die index.html liefert. Nutze fastapi.staticfiles.StaticFiles
mit html=True. Bestimme den Ordner relativ zu main.py mit pathlib.
Wichtig: Wo muss der Mount stehen, damit /api/... und /health weiter
funktionieren? Erkläre das in zwei Sätzen.
```

**Prüfpunkte:**

- Viewport-Meta vorhanden? Ohne sie zeigt das Handy eine geschrumpfte Desktop-Seite.
- Feste Breiten in Pixeln (`width: 400px`)? Weg damit.
- Steht der Mount nach den API-Routen? Sonst fängt er `/api/...` ab und alle Tests außer `/` werden rot. Guter Moment, das live zu zeigen.
- Alle ids aus dem Prompt vorhanden? Schritt 5 und 6 bauen darauf.

**Befehle:** `pytest` (11 passed). Browser: Entwicklerwerkzeuge, Gerätesimulation 375 px. Kein horizontaler Scrollbalken? Dann Handy im WLAN.

**Commit:** `feat(US-4): Mobile-first Gerüst des Dashboards`

---

## Schritt 5: US-5 Kennzahlen und Liste per fetch (Termin 2, ab 0:25)

**Story:** Als Nutzer möchte ich meine Kennzahlen und die letzten Trainings sehen. Akzeptanz: Kennzahl-Karten und Liste werden per fetch aus `/api/stats` und `/api/workouts` gefüllt, nichts ist hartkodiert.

**Kein neuer pytest-Test:** JavaScript im Browser testen wir hier manuell gegen das Kriterium. Frage an die Gruppe: Wie würde man das automatisieren? (Stichwort Playwright, Ausblick.)

**Prompt:**

```text
Du bist ein erfahrener Frontend-Entwickler. FitTrack-Dashboard, Teil 2 von 3.
Es gibt eine index.html mit diesen Elementen (Auszug der ids):
- #zeitraum (p im Kopf)
- #stat-gesamt, #stat-woche, #stat-sport, #stat-anzahl (Kennzahl-Kacheln)
- #aktivitaeten-liste (ol), #mehr-anzeigen (button, anfangs hidden)
Listenzeilen bekommen die Farbe per Attribut data-sport="Laufen" usw.

Die API liefert:
GET /api/stats ->
  {"gesamt_km": 3963.0, "durchschnitt_km_pro_woche": 37.7,
   "lieblingssportart": "Radfahren", "anzahl": 311}
  (lieblingssportart kann null sein)
GET /api/workouts -> Liste, jüngstes Datum zuerst:
  {"id": 311, "datum": "2026-09-05", "sportart": "Schwimmen",
   "dauer_min": 43, "distanz_km": 2.0, "kalorien": 614}

Aufgabe: Erstelle frontend/app.js mit
- ladeJson(url): fetch, wirft bei Status != 200 einen Fehler
- formatDatum("2026-09-05") -> "05.09.2026"
- formatZahl(wert, nachkommastellen): deutsche Schreibweise per toLocaleString
- zeigeKennzahlen(stats): füllt die vier Kacheln
- zeigeAktivitaeten(workouts): zeigt die ersten 10 Einheiten als <li>
  mit data-sport, einem Kürzel im Kreis (La, Ra, Sc, Wa), Sportart,
  Datum, Distanz, Dauer und Kalorien. Der Button „Mehr anzeigen“ hängt
  jeweils 10 weitere an und verschwindet, wenn alle sichtbar sind.
- zeigeZeitraum(workouts): schreibt „<ältestes> bis <jüngstes>“ in #zeitraum
- start(): ruft alles auf; wenn ein fetch fehlschlägt, steht im
  betroffenen Bereich ein kurzer Hinweis „… konnten nicht geladen
  werden. Läuft der Server?“ und der Rest lädt trotzdem.
- Am Ende: start();

Randbedingungen:
- Vanilla JS, keine Bibliothek, kein Modul-Bundler, async/await
- Kleine Funktionen mit deutschen Namen, je ein Kommentar auf Deutsch
- Keine Werte hartkodieren, alles kommt aus der API
- In index.html vor </body> ergänzen: <script src="app.js"></script>

Gib app.js vollständig aus und erkläre in drei Sätzen, wie „Mehr anzeigen“
funktioniert, ohne die API erneut zu fragen.
```

**Prüfpunkte:**

- Steht eine Zahl im Code, die aus der API kommen müsste? Dann ist das Kriterium verfehlt.
- Was passiert, wenn der Server aus ist? Server stoppen, Seite neu laden, Hinweis sehen, Server starten.
- `innerHTML` mit API-Daten: hier unkritisch, weil die Daten aus der eigenen Datei stammen. Kurz erwähnen, dass fremde Eingaben so nie eingefügt werden dürfen.
- Läuft `start()` wirklich? Ein Modell vergisst den Aufruf gern.

**Befehle:** Server läuft mit `--reload`, Browser neu laden. Konsole (F12) ohne rote Meldungen? Handy im WLAN: Liste, Kacheln, Zeitraum.

**Commit:** `feat(US-5): Kennzahlen und Aktivitäten per fetch`

---

## Schritt 6: US-6 Wochenverlauf (Termin 2, ab 0:40)

**Story:** Als Nutzer möchte ich meinen Wochenverlauf als Balkendiagramm sehen und den Zeitraum wählen. Akzeptanz: `GET /api/stats/wochen` liefert pro Kalenderwoche `distanz_km` und `anzahl`, auch für Wochen ohne Training; das Diagramm zeigt diese Daten; Umschalter 8 W / 6 M / 1 J / Alles.

Zwei Teile: erst der Endpunkt mit Test, dann das Diagramm.

**Hinweis:** Ring und gestapelte Säulen aus Teil B sind bewusst der Erstentwurf. Er besteht alle Tests und ist trotzdem falsch, das zeigt Schritt 6b. Deshalb hier nichts vorwegnehmen, sondern den Entwurf so übernehmen, wie ihn das Modell liefert.

**Test zuerst** (`pytest`: 3 failed). Erwartungswerte wieder von Hand, siehe `erwartungswerte.md`:

```python
# US-6: Wochenverlauf
# Fixture: KW 23 (4 Einheiten, 34.5 km, 175 min), KW 24 leer, KW 25 (4 Einheiten, 53.0 km, 285 min)
def test_wochen_anzahl_und_luecken():
    wochen = client.get("/api/stats/wochen").json()
    assert len(wochen) == 3
    assert [w["kw"] for w in wochen] == ["2026-W23", "2026-W24", "2026-W25"]
    assert wochen[1] == {"kw": "2026-W24", "wochenstart": "2026-06-08",
                         "distanz_km": 0.0, "anzahl": 0, "dauer_min": 0}


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
```

**Prompt Teil A, Backend:**

```text
Du bist ein erfahrener Python-Entwickler. FitTrack, FastAPI. In
backend/app/statistik.py gibt es bereits:

from collections import defaultdict
from datetime import date, timedelta

def montag_der_woche(datum_text: str) -> date:
    tag = date.fromisoformat(datum_text)
    return tag - timedelta(days=tag.weekday())

Workouts sind Dictionaries mit id, datum (ISO), sportart, dauer_min,
distanz_km, kalorien.

Aufgabe: Ergänze berechne_wochen(workouts: list[dict]) -> list[dict].
Rückgabe: eine Liste aufsteigend nach Woche, ein Eintrag pro Kalenderwoche
von der ersten bis zur letzten Trainingswoche. Wochen ohne Training
erscheinen mit Nullwerten. Jeder Eintrag:
{"kw": "2026-W23", "wochenstart": "2026-06-01",
 "distanz_km": 34.5, "anzahl": 4, "dauer_min": 175}
kw ist Jahr und ISO-Woche zweistellig, wochenstart der Montag als ISO-Datum,
distanz_km auf 1 Nachkommastelle gerundet. Leere Liste ergibt [].

Dazu ein Pydantic-Modell WochenEintrag in models.py und in main.py die Route
GET /api/stats/wochen mit response_model=list[WochenEintrag], die
berechne_wochen(lade_workouts()) zurückgibt.

Randbedingungen: nur Standardbibliothek und Pydantic, deutsche Namen,
je ein Docstring. Diese Tests müssen bestehen:

[die drei Tests von oben einfügen]

Erkläre in drei Sätzen, wie du die Lücken erzeugst.
```

**Prüfpunkte A:** Lückenwochen wirklich mit 0 statt ausgelassen? Jahreswechsel: `isocalendar()` liefert das ISO-Jahr, das am 29.12. schon das Folgejahr sein kann. Das Fixture prüft das nicht; die Echtdaten enthalten zwei Jahreswechsel. Im Browser später kontrollieren, ob „2024-W01“ oder „2025-W01“ am richtigen Ort steht.

**Befehle:** `pytest` (14 passed).

**Prompt Teil B, Frontend:**

```text
Du bist ein erfahrener Frontend-Entwickler. FitTrack-Dashboard, Teil 3 von 3.
In frontend/app.js gibt es bereits ladeJson(url), formatDatum(iso),
formatZahl(wert, nachkommastellen), zeigeFehler(bereichId, text) und eine
Funktion start(), die /api/stats und /api/workouts lädt.

Neu ist GET /api/stats/wochen -> Liste aufsteigend, ein Eintrag je Woche:
{"kw": "2026-W36", "wochenstart": "2026-08-31",
 "distanz_km": 64.4, "anzahl": 3, "dauer_min": 295}

In index.html gibt es:
- #woche-titel (h2), #woche-untertitel (p), #ring-prozent (span),
  #ring-balken (SVG-circle, r=52, stroke-dasharray und stroke-dashoffset 327),
  #woche-km, #woche-anzahl, #woche-minuten (dd)
- #wochen-chart (canvas) und vier Buttons .zeitraum-wahl button mit
  data-wochen="8", "26", "52", "0" (0 = alle); der aktive hat class="aktiv"
- Chart.js 4 ist per <script> vor app.js eingebunden:
  https://cdn.jsdelivr.net/npm/chart.js@4.4.9/dist/chart.umd.min.js

Aufgabe, ergänze app.js:
1. Konstanten WOCHENZIEL_KM = 40 und RING_UMFANG = 327.
2. zeigeWoche(wochen): nimmt den letzten Eintrag (jüngste Woche im
   Datensatz). Titel „Kalenderwoche 36“, Untertitel „ab 31.08.2026,
   Wochenziel 40 km“. Prozent = distanz_km / Ziel, Text zeigt den echten
   Wert (auch über 100 %), der Ring ist bei 100 % voll:
   strokeDashoffset = RING_UMFANG * (1 - min(anteil, 1)). km, Anzahl,
   Minuten in die dd-Felder.
3. zeigeDiagramm(wochen, anzahlWochen): Balkendiagramm mit Chart.js.
   anzahlWochen > 0 -> die letzten n Wochen, 0 -> alle. Beim ersten Aufruf
   das Chart erzeugen und in einer Variablen merken, bei weiteren Aufrufen
   nur Daten tauschen und update() aufrufen. Ohne Legende, x-Achse ohne
   Beschriftung, y-Achse ab 0 mit höchstens 5 Ticks, Balkenfarbe aus der
   CSS-Variablen --akzent (per getComputedStyle lesen), Tooltip
   „Kalenderwoche 36“ und „64,4 km“. maintainAspectRatio: false.
4. verbindeZeitraumWahl(wochen): Klick setzt die Klasse aktiv um und
   ruft zeigeDiagramm mit Number(button.dataset.wochen) auf.
5. In start(): zuerst /api/stats/wochen laden, dann zeigeWoche,
   zeigeDiagramm(wochen, 8), verbindeZeitraumWahl; Fehler wie bisher
   mit zeigeFehler("woche", ...).

Randbedingungen: Vanilla JS, deutsche Namen und Kommentare, keine Werte
hartkodieren außer den zwei Konstanten. Gib nur die neuen und geänderten
Funktionen aus. Erkläre in drei Sätzen, warum das Chart beim Umschalten
nicht neu erzeugt wird.
```

**Prüfpunkte B:** Wird bei jedem Klick ein neues Chart erzeugt? Dann flackert es und Chart.js meldet „Canvas is already in use“. Sind die Balken echte API-Daten? Zum Beweis in WebStorm oder DataGrip eine Distanz in `fittrack.db` ändern (`UPDATE workout SET distanz_km = 99 WHERE id = 311;`), Seite neu laden, Diagramm ändert sich, Änderung mit `git checkout backend/app/data/fittrack.db` zurücknehmen.

**Befehle:** Browser neu laden, Umschalter durchklicken, Konsole prüfen. Handy im WLAN: Ring, Diagramm, Tooltip per Tippen.

**Commit:** `feat(US-6): Wochenverlauf mit Diagramm und Zeitraumwahl`

**Sprint Review 2 (1:00):** Abnahme am Smartphone gegen US-4 bis US-6. Hier passiert der wichtigste Moment des Kurses, siehe Schritt 6b.

---

## Schritt 6b: US-7 Schön, aber falsch (Termin 2, ab 1:00)

**Warum dieser Schritt:** Nach Schritt 6 sind alle Tests grün, das Dashboard sieht aus wie eine Sport-App, und die Gruppe ist zufrieden. Genau jetzt die Ansicht auf den Beamer legen und fragen: „Was bedeutet 161 %?“ Der Erstentwurf der KI: Ring geschlossen, „161 % vom Ziel“, über einer Woche, die längst vorbei war, darunter gestapelte Säulen ohne Achse. Nichts davon prüfte ein Test, weil die Tests die API prüfen und nicht die Aussage der Oberfläche. Die Lerneinheit hat zwei Sätze: **Der Eindruck ist kein Prüfkriterium.** Und: **KI allein liefert einen brauchbaren Erstentwurf, KI mit menschlicher Kritik ein gutes Ergebnis.** Der Zweitentwurf ist nicht die KI-Korrektur der KI, sondern das Ergebnis konkreter Vorschläge aus dem Review: Bullet-Graph statt Ring, ein Balken je Woche statt Stapel, Kalender, Kacheln, Status-Badge, alles antippbar. Vorher-Nachher-Bilder liegen in `site/assets/img/vergleich-mobile.png` und `vergleich-desktop.png`.

**Was der Erstentwurf falsch machte** (die Liste an die Wand, die Gruppe soll die Punkte selbst finden, bevor sie eingeblendet wird):

| Befund im Erstentwurf | Warum das täuscht | Zweitentwurf |
|---|---|---|
| Ring geschlossen, „161 % vom Ziel“ | Ein Kreis zeigt einen Anteil an einem Ganzen. Eine Woche ist kein Ganzes, sie hat ein Ziel, das man verfehlt oder übertrifft. Ab 100 % ist der Ring voll und sagt nichts mehr, die Zahl hat keine Einheit. | Bullet-Graph: Balken für 64,4 km, Marke bei 40 km, Skala bis 80 km. Die Übererfüllung liegt sichtbar rechts der Marke. Daneben „24,4 km über dem Ziel“, Badge „Ziel erreicht“, „3 Wochen in Folge“ |
| „Kalenderwoche 36“ als Fortschritt, obwohl die Woche vorbei ist | Fortschritt gibt es nur in laufenden Zeiträumen. Eine vergangene Woche ist ein Ergebnis. | Titel „Letzte Trainingswoche“ mit Datumsspanne; nur bei Daten in der laufenden Woche „Diese Woche, Stand Do“ mit Badge „Auf Kurs“ oder „Im Rückstand“ gegen das anteilige Ziel |
| Wochenziel 40 km ohne Bezug | 2 km Schwimmen zählen wie 2 km Radfahren. Das ist vertretbar, muss aber dastehen. | „Ziel 40 km über alle Sportarten“, der Balken im Bullet-Graph ist nach Sportart gefärbt, darunter die Kilometer je Sportart |
| Balken ohne x-Achse, Tooltip nur mit Maus | Welcher Balken ist welche Woche? Raten. Auf dem Handy gibt es keinen Hover. | Achse „Kalenderwoche“, Ziellinie, Farbe sagt „Ziel erreicht“ oder „unter dem Ziel“, Tippen irgendwo in der Spalte zeigt die Woche mit einem Balken je Sportart unter dem Diagramm |
| Gestapelte Säulen, „Alles“ mit 105 Balken | Stapel sind auf 375 px nicht ablesbar: Teilbalken haben keine gemeinsame Nulllinie. 105 Balken sind unlesbar. | Ein Balken je Woche, die Sportarten im Detail darunter; ab einem Jahr Monatssummen |
| Kürzel „8 W / 6 M / 1 J“, „Sc / Wa / Ra“ | Versteht niemand ohne Einweisung. | Ausgeschrieben, Symbole je Sportart |
| „Einheiten“ zweimal, einmal je Woche, einmal gesamt | Gleiches Wort, andere Bedeutung. | „Einheiten gesamt“, „Gesamt seit Sep 2024“, „Ø pro Woche“, „Beste Woche, KW 37/2025“ |
| Schrift 12 px, keine `aria-pressed`, nur dunkel | Auf dem Handy in der Sonne unlesbar, für Screenreader nicht lesbar. | Mindestens 13 px, `aria-pressed`, sprechende `aria-label`, Tabelle für Screenreader, helles Thema |

**Was der Zweitentwurf zusätzlich bringt,** weil das Review danach gefragt hat, nicht die KI:

- **Trainingskalender:** ein Feld je Tag der letzten acht Wochen, Farbe nach Kilometern, Zahl im Feld, Tippen zeigt die Einheit. Zeigt Regelmäßigkeit, die ein Wochenbalken verbirgt.
- **Sportarten-Kacheln:** Kilometer, Anteil als Balken, Einheiten je Sportart; Tippen filtert die Aktivitätenliste.
- **Status-Badge:** ein Wort für den Stand, dazu die Serie erreichter Wochen.
- **Ø je Einheit** in der Wochenkarte, **Beste Woche** in den Kennzahlen.
- **Sheet statt Tooltip:** Jedes Objekt öffnet beim Antippen einen Dialog mit Details, auf dem Handy von unten. Die Woche mit Balken je Sportart und ihren Einheiten, der Kalendertag mit seiner Einheit, die Kennzahl mit ihrer Rechnung, die Sportart mit Filterknopf, die Einheit mit Tempo. Die Seite selbst bleibt dadurch ruhig: keine Detailzeilen unter den Grafiken.
- **Thema-Umschalter:** hell oder dunkel per Knopf im Kopf, gespeichert im Browser; ohne Wahl gilt das Gerät.

**Story:** Als Nutzer möchte ich, dass jede Zahl und jede Grafik im Dashboard genau das aussagt, was die Daten hergeben. Akzeptanz siehe README (US-7).

**Test zuerst** (`pytest`: 1 failed). Das Backend liefert die Kilometer je Sportart, damit das Frontend nichts selbst zusammenrechnen muss:

```python
def test_wochen_je_sportart():
    wochen = client.get("/api/stats/wochen").json()
    assert wochen[0]["je_sportart"] == {"Laufen": 13.0, "Radfahren": 20.0, "Schwimmen": 1.5}
    assert wochen[1]["je_sportart"] == {}
    assert wochen[2]["je_sportart"] == {"Laufen": 13.0, "Radfahren": 30.0, "Wandern": 10.0}
```

Der bestehende Test `test_wochen_anzahl_und_luecken` vergleicht KW 24 als ganzes Dictionary und muss um `"je_sportart": {}` ergänzt werden. Das ist eine bewusste Änderung der Spezifikation, kein „Test passend machen“: Die Story erweitert die Antwort.

**Prompt, der solche Fehler verhindert** (vor dem Code, nicht danach):

```text
Wir bauen das Dashboard von FitTrack (Vanilla JS, Chart.js 4, API-Antworten
siehe unten). Bevor du Code schreibst, lege die Bedeutung jedes Elements
fest. Gib eine Tabelle mit den Spalten
Element | zeigt | Einheit | Zeitbezug | Form | Zustände (0 %, 100 %,
über 100 %, keine Daten) | Beschriftung im Bild.
Regeln, die die Tabelle erfüllen muss:
1. Jede Zahl trägt Einheit und Bezug, z. B. "64,4 km, KW 36, 31.08. bis 06.09.".
2. Die Form passt zur Aussage: Ein Kreis nur für Anteile an einem Ganzen.
   Ein Ziel als Bullet-Graph: Balken für den Ist-Wert, Marke für das Ziel,
   Skala über das Ziel hinaus, damit Übererfüllung sichtbar bleibt.
3. Fortschritt nur für laufende Zeiträume. Abgeschlossene Zeiträume
   heißen Ergebnis.
4. Jede Achse hat Titel und Einheit, jede Farbe steht in einer Legende.
   Keine gestapelten Balken auf 375 px; Aufteilungen stehen als eigene
   Balken im Detail.
5. Kein Begriff bedeutet an zwei Stellen etwas Verschiedenes, keine
   Abkürzungen, die nicht im Bild erklärt sind.
6. Touch zuerst: Jede Grafik ist antippbar und nennt dann ihre Zahl im
   Klartext. Nichts, was nur mit der Maus erscheint.
7. Beschreibe, wie die Ansicht bei 0, 1 und 105 Datenpunkten aussieht.
8. Schrift mindestens 13 px, Bedienelemente 44 px, aria-pressed an
   Umschaltern, sprechende aria-label, helles und dunkles Thema.
Erst wenn ich die Tabelle bestätigt habe, schreibst du den Code.
API-Antworten: [Beispiel von /api/stats und /api/stats/wochen einfügen]
```

**Prompt zur Selbstprüfung** (nach jedem Vorschlag, bevor jemand den Code anfasst):

```text
Prüfe deinen Vorschlag wie ein kritischer Designer, der ihn zum ersten
Mal sieht. Gehe jedes sichtbare Element durch und beantworte: Was
bedeutet es? Woher kommt der Wert? Passt die Form zur Aussage? Was zeigt
es bei 0, bei mehr als 100 %, bei 105 Datenpunkten, auf 375 px Breite
ohne Maus? Nenne jede Stelle, an der die Darstellung mehr behauptet als
die Daten hergeben, und schlage die Korrektur vor. Lobe nichts. Wenn du
nichts findest, sage das und begründe es je Element.
```

**Prüfpunkte:** Die Gruppe geht die Liste „Semantik-Review: Schön, aber falsch“ aus `docs/checklisten.md` am Beamer durch. Eine Zahl wird nachgerechnet: `SELECT sportart, ROUND(SUM(distanz_km),1) FROM v_workout WHERE datum BETWEEN '2026-08-31' AND '2026-09-06' GROUP BY sportart;` muss die Aufteilung der Wochenkarte ergeben. Am Handy: einen Balken, ein Kalenderfeld, eine Kennzahl, eine Sportart-Kachel und eine Einheit antippen, jedes Mal öffnet ein Sheet; Tippen daneben schließt es. Den Thema-Knopf drücken, Seite neu laden: Die Wahl bleibt. „Alles“ anklicken. Tab-Taste drücken: Fokusring sichtbar? Systemeinstellung auf hell stellen: lesbar?

**Botschaft für die Gruppe:** Tests sichern die Daten, nicht die Aussage. Schöne Ergebnisse verdienen mehr Misstrauen, nicht weniger, weil sie die Prüfung abkürzen. Der Erstentwurf der KI war ein brauchbarer Schritt; gut wurde er erst durch die Kritik eines Menschen, der wusste, was ein Kreis bedeutet und was ein Ziel braucht. Deshalb legt der Prompt Bedeutung und Form vor dem Code fest, und deshalb prüft die QA-Rolle die Oberfläche mit derselben Strenge wie den Code.

**Commit:** `feat(US-7): Zweitentwurf nach Semantik-Review: Bullet-Graph, Kalender, Kacheln`

---

## Schritt 7: Docker (Termin 2, ab 1:10)

**Container in 2 Minuten:** Problem „läuft bei mir“. Lösung: App, Python und Bibliotheken in einem standardisierten Paket. Image ist der Bauplan, Container die laufende Instanz.

**Prompt** (oder die Vorlage aus dem Kurskonzept nehmen und gemeinsam Zeile für Zeile lesen):

```text
Erstelle ein Dockerfile für eine FastAPI-App mit dieser Struktur:

FitTrack/
├── backend/app/main.py      (FastAPI-App, Objekt heißt app)
├── frontend/                (statische Dateien, von main.py ausgeliefert)
└── requirements.txt

Anforderungen:
- Basis python:3.12-slim, Arbeitsverzeichnis /app
- requirements.txt zuerst kopieren und installieren, damit die Schicht
  gecacht wird; dann backend/ und frontend/ kopieren
- Start: uvicorn backend.app.main:app --host 0.0.0.0
- Der Port kommt aus der Umgebungsvariable PORT, Standard 8000
  (Render.com setzt PORT); EXPOSE 8000
- Dazu eine .dockerignore, die .git, .venv, __pycache__, backend/tests
  und docs ausschließt
- Jeder Schritt mit einem kurzen deutschen Kommentar, der erklärt, warum

Erkläre in drei Sätzen, warum requirements.txt vor dem Code kopiert wird.
```

**Prüfpunkte:** Steht `CMD` in Shell-Form oder als `["sh", "-c", "..."]`? Nur dann wird `${PORT:-8000}` ausgewertet. Ist `--host 0.0.0.0` gesetzt? Sonst ist der Container von außen nicht erreichbar.

**Befehle (alle machen mit):**

```bash
docker build -t fittrack .
docker run -p 8000:8000 fittrack
```

Browser <http://localhost:8000/health>, dann Handy im WLAN. Botschaft: Was hier läuft, läuft identisch auf jedem Server.

Zweites Terminal: `docker ps`, `docker stop <id>`. Dann `docker run -p 8000:8000 -e PORT=8000 fittrack` als Beweis, dass die Variable gelesen wird.

Wenn Port 8000 belegt ist: `-p 8001:8000`.

**Commit:** `build(Sprint 3): Dockerfile für FitTrack`

---

## Schritt 8: Render.com (Termin 2, ab 1:25)

Anleitung: `docs/dozent/render-deploy.md`. Im Kurs zeigen: `render.yaml` ins Repo, Commit, Push, Render-Dashboard beobachten, URL aufs Handy. Der Free-Plan reicht.

`render.yaml` mit den Studierenden lesen: `runtime: docker` (baut unser Dockerfile), `healthCheckPath: /health` (dafür war US-3), `autoDeploy: true` (jeder Push deployt).

**Commit:** `deploy: Render-Blueprint`

---

## Schritt 9: GitHub Actions (optional)

**Prompt:**

```text
Erstelle .github/workflows/tests.yml für GitHub Actions: bei jedem Push und
Pull Request auf ubuntu-latest Python 3.12 einrichten,
pip install -r requirements.txt und pytest ausführen. Schritte auf Deutsch
benennen, ein Kommentar am Anfang, der erklärt, wo man das Ergebnis sieht.
```

Nach dem Push: Reiter „Actions“ im Repo zeigen. Der grüne Haken ist die maschinelle Definition of Done.

**Commit:** `ci: pytest bei jedem Push`

---

## Exkurs LM Studio (Termin 2, ab 1:35)

Anleitung: `docs/dozent/lmstudio-demo.md`. Den Prompt aus Schritt 3 verwenden, Ergebnis in WebStorm einfügen, `pytest` entscheidet.

Zweiter Teil des Exkurses, wenn Zeit bleibt: dasselbe Modell spricht mit der fertigen App. Über den MCP-Server in `mcp/server.py` ruft LM Studio die API als Werkzeuge auf, und der Trainingsbot in der App beantwortet Fragen zu den eigenen Zahlen, ohne dass Daten den Rechner verlassen. Einrichtung und Beispielfragen in `docs/dozent/mcp.md`.

---

## Anhang: Wenn etwas schiefgeht

| Symptom | Ursache | Lösung |
|---|---|---|
| `ModuleNotFoundError: No module named 'app.main'` nach Schritt 1 | `main.py` liegt im falschen Ordner | Muss in `backend/app/` liegen |
| `ModuleNotFoundError: No module named 'fastapi'` | venv nicht aktiv | `source .venv/bin/activate`, in WebStorm Interpreter prüfen |
| `pytest` findet keine Tests | im falschen Ordner gestartet | Aus dem Projektordner `FitTrack/` starten, dort liegt `pytest.ini` |
| `/api/workouts` liefert 404 nach Schritt 4 | StaticFiles-Mount steht vor den Routen | Mount ans Ende von `main.py` |
| `Address already in use` | Port 8000 belegt | `--port 8001` oder `docker run -p 8001:8000` |
| Handy erreicht den Rechner nicht | Firewall oder anderes Netz | Hotspot vom Handy, Rechner damit verbinden, oder Render-URL |
| Diagramm leer, Konsole „Canvas is already in use“ | Chart wird mehrfach erzeugt | Chart in Variable merken, `update()` nutzen |
| Claude-Limit erreicht | | LM Studio, gleicher Prompt |
| Zeitnot in Termin 2 | | Schritt 6 Teil B (Ring) weglassen, Schritt 7 mit fertigem Dockerfile |
