# FitTrack – Design-Spec

Stand: 10.09.2026, fortgeschrieben bis US-7. Grundlage: `docs/kurs/FitTrack_Kurskonzept_240min.md`.
Dieses Dokument beschreibt die Referenzlösung und das Lehrmaterial, das daraus abgeleitet wird. Der ursprüngliche Implementierungsplan liegt in `docs/dozent/archiv/`.

## 1. Ziel

Eine mobile-first Web-App, die persönliche Trainingsdaten anzeigt, und dazu ein Prompt-Skript, mit dem die App in zwei Terminen à 120 Minuten Schritt für Schritt im Chat-Workflow (Claude oder lokales Modell in LM Studio) entwickelt wird. Nicht agentisch: Prompt im Chat, Code lesen, in WebStorm übernehmen, Tests laufen lassen, committen.

Abweichungen vom Kurskonzept:

| Konzept | Referenzlösung | Grund |
|---|---|---|
| VS Code | WebStorm (Python-Plugin) | Wunsch des Dozenten; PyCharm funktioniert identisch |
| Handy-Test nur im WLAN | zusätzlich Deploy auf Render.com | Kickoff-Demo über öffentliche URL, unabhängig vom Raum-WLAN |
| ca. 30 Datensätze | ca. 300 Datensätze über 2 Jahre | Dashboard zeigt Verlauf und Saisonalität |
| Erwartungswerte aus Echtdaten | Erwartungswerte aus kleinem Fixture-Datensatz | 300 Zeilen sind nicht von Hand nachrechenbar |
| kein CI | optional GitHub Actions mit pytest | Definition of Done wird maschinell geprüft |

## 2. Repo

Pfad: `Vorlesungen/Datenbasierte Fallstudien/FitTrack` (eingebettetes Repo im Elternrepo, dort per `.gitignore` ausgeschlossen). GitHub: `swrobuts/FitTrack`, öffentlich. Lernumgebung: <https://swrobuts.github.io/FitTrack/>, App: <https://fittrack-k7gg.onrender.com>.

```text
FitTrack/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py            # FastAPI-Routen, StaticFiles für frontend/
│   │   ├── models.py          # Pydantic: Workout, Stats, WochenEintrag
│   │   ├── daten.py           # liest per sqlite3 aus v_workout, Pfad aus FITTRACK_DATA
│   │   ├── statistik.py       # reine Rechenfunktionen, ohne FastAPI
│   │   └── data/
│   │       ├── fittrack.db    # SQLite, ca. 300 Einheiten, Sep 2024 – Sep 2026
│   │       └── schema.sql     # Tabellen sportart, workout; Sicht v_workout
│   └── tests/
│       ├── conftest.py        # baut die Testdatenbank aus schema.sql und Fixture
│       ├── fixtures/workouts_klein.sql    # 8 Einheiten, von Hand nachrechenbar
│       └── test_api.py
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── scripts/
│   └── generate_workouts.py   # erzeugt fittrack.db reproduzierbar (fester Seed)
├── docs/
│   ├── kurs/FitTrack_Kurskonzept_240min.md   # unverändert
│   ├── setup-webstorm.md
│   ├── checklisten.md         # DoD, Review, End-Abnahme
│   └── dozent/
│       ├── 2026-09-10-fittrack-design.md     # dieses Dokument
│       └── archiv/                           # ursprünglicher Implementierungsplan (JSON-Stand)
│       ├── prompt-skript.md   # der Kern: alle Prompts in Reihenfolge
│       ├── erwartungswerte.md # Handrechnung für das Fixture
│       ├── lmstudio-demo.md
│       └── render-deploy.md
├── .github/workflows/tests.yml
├── Dockerfile
├── .dockerignore
├── .gitignore
├── render.yaml
├── requirements.txt
└── README.md
```

Branches und Tags:

- `starter`: Stand nach Schritt 0. Das bekommen die Studierenden.
- `main`: vollständige Referenz inklusive `docs/dozent/`.
- Tags auf `main`, ein Tag pro Schritt: `sprint-0`, `us-3`, `us-1`, `us-2`, `us-4`, `us-5`, `us-6`, `docker`, `render`, `ci`. Jeder Schritt ist genau ein Commit mit Story-Bezug in der Message.

`docs/dozent/` und `docs/kurs/` liegen nur auf `main`. Der Starter enthält `docs/setup-webstorm.md` und `docs/checklisten.md`, aber weder das Kurskonzept noch das Dozentenmaterial.

## 3. Schrittfolge und Prompt-Skript

Jeder Schritt im Prompt-Skript hat dieselbe Struktur:

1. Rolle im Scrum, Sprint, Story
2. Ziel und Akzeptanzkriterium
3. Test zuerst: Code, den die Studierenden selbst in `test_api.py` schreiben, plus `pytest`-Aufruf mit erwartetem roten Ergebnis
4. Prompt zum Kopieren, in sich geschlossen (Kontext, Datenmodell, bestehender Code als Ausschnitt, Randbedingungen, Tests, Bitte um Erklärung)
5. Prüfpunkte: worauf im Chat-Ergebnis zu achten ist (Review-Checkliste), typische Fehler des Modells
6. Handgriffe in WebStorm: Datei anlegen, Code übernehmen, Run-Konfiguration
7. Befehle und erwartetes Ergebnis (grün)
8. Commit-Message

| Schritt | Tag | Termin | Inhalt |
|---|---|---|---|
| 0 | `sprint-0` | 1 | Starter: Struktur, `schema.sql`, `fittrack.db`, SQL-Fixture, `requirements.txt`, `conftest.py`, `test_api.py` nur mit `test_health` (rot), README, `.gitignore` |
| 1 | `us-3` | 1 | `GET /health` → `{"status": "ok"}` |
| 2 | `us-1` | 1 | `GET /api/workouts`: `models.py`, `daten.py`, Liste sortiert nach Datum absteigend |
| 3 | `us-2` | 1 | `GET /api/stats`: `statistik.py`, Erwartungswerte aus Fixture, Edge Case leere Liste |
| 4 | `us-4` | 2 | Frontend-Gerüst: `index.html`, `style.css` mobile-first, FastAPI liefert `/` aus |
| 5 | `us-5` | 2 | `app.js`: Kennzahl-Karten und Aktivitätenliste per `fetch` |
| 6 | `us-6` | 2 | `GET /api/stats/wochen` (Test zuerst) und Chart.js-Balkendiagramm mit Zeitraum-Umschalter |
| 7 | `docker` | 2 | Dockerfile, `.dockerignore`, `docker build`, `docker run`, Handy-Test |
| 8 | `render` | 2 | `render.yaml`, PORT-Variable, Deploy aus GitHub |
| 9 | `ci` | optional | GitHub Actions führt `pytest` bei jedem Push aus |

User Stories 4 bis 6 ergänzen das Konzept für Sprint 2:

```text
US-4: Als Nutzer möchte ich die App auf dem Smartphone öffnen und ein
      übersichtliches Dashboard sehen, damit ich sie unterwegs nutzen kann.
      Akzeptanz: GET / liefert die Seite; bei 375 px Breite kein horizontales
      Scrollen; Karten stapeln sich; Touch-Targets mindestens 44 px.

US-5: Als Nutzer möchte ich meine Kennzahlen und die letzten Trainings sehen,
      damit ich meinen Stand auf einen Blick erfasse.
      Akzeptanz: Kennzahl-Karten und Liste werden per fetch aus /api/stats
      und /api/workouts gefüllt, nichts ist hartkodiert.

US-6: Als Nutzer möchte ich meinen Wochenverlauf als Balkendiagramm sehen
      und den Zeitraum wählen, damit ich Trends erkenne.
      Akzeptanz: GET /api/stats/wochen liefert pro Kalenderwoche distanz_km
      und anzahl, auch für Wochen ohne Training; das Diagramm zeigt diese
      Daten; Umschalter 8 W / 6 M / 1 J / Alles.

US-7: Als Nutzer möchte ich, dass jede Zahl und jede Grafik im Dashboard
      genau das aussagt, was die Daten hergeben, damit ich mich nicht
      auf ein schönes, aber falsches Bild verlasse.
      Akzeptanz: Bullet-Graph mit Zielmarke statt Ring, Übererfüllung sichtbar;
      abgeschlossene Woche heißt Ergebnis; jede Achse und Farbe beschriftet;
      jede Grafik antippbar; GET /api/stats/wochen liefert je_sportart;
      Zeitbezug an jeder Karte; 13 px, aria-pressed, hell und dunkel.
```

US-7 entsteht im Sprint Review 2 aus der Kritik am Erstentwurf (Ring bei 161 % über einer vergangenen Woche, gestapelte Säulen ohne Achse). Sie ist das Lehrstück „Schön, aber falsch“ im Deck, in Lab 10 und in Schritt 6b des Prompt-Skripts.

Die Prompts werden vom Dozenten selbst gegen Claude im Chat durchgespielt. Der Code im Repo ist das Ergebnis eines sauberen Durchlaufs nach Review, nicht die rohe Modellantwort. Der Prompt für US-2 dient zusätzlich als Vergleichsprompt für die LM-Studio-Demo.

## 4. Datenmodell und Fachlogik

### Workout

| Feld | Typ | Beispiel |
|---|---|---|
| `id` | int | 42 |
| `datum` | str, ISO `YYYY-MM-DD` | `2026-05-14` |
| `sportart` | str | `Laufen`, `Radfahren`, `Schwimmen`, `Wandern` |
| `dauer_min` | int | 47 |
| `distanz_km` | float, 1 Nachkommastelle | 8.3 |
| `kalorien` | int | 512 |

### Datenhaltung in SQLite

Änderung vom 10.09.2026 auf Wunsch des Dozenten: statt einer JSON-Datei eine SQLite-Datenbank. Zwei Tabellen, `sportart` (id, name, einheit) und `workout` (id, datum, sportart_id, dauer_min, distanz_km, kalorien) mit Fremdschlüssel und CHECK-Regeln, dazu die Sicht `v_workout`, die beide verbindet und genau die sechs Felder der API liefert. Das Schema liegt versioniert in `schema.sql`, die Datenbank wird daraus vom Generator erzeugt. Der Datenzugriff bleibt bei der Standardbibliothek `sqlite3`, kein ORM.

### Echtdaten `fittrack.db`

Erzeugt durch `scripts/generate_workouts.py` mit festem Seed, damit die Datei reproduzierbar ist. Zeitraum 2024-09-02 bis 2026-09-06, rund 300 Einheiten, 2 bis 4 pro Woche. Saisonalität: Radfahren und Schwimmen vor allem April bis September, Wandern vor allem Mai bis Oktober, Laufen ganzjährig. Plausible Verhältnisse von Dauer, Distanz und Kalorien je Sportart. Einige Wochen ohne Training (Urlaub, Krankheit), damit Lücken im Diagramm sichtbar sind.

### Fixture `workouts_klein.sql`

8 Einheiten über 3 Kalenderwochen, so gewählt, dass alle Kennzahlen mit Taschenrechner nachrechenbar sind und die Lieblingssportart eindeutig ist. Die Handrechnung steht in `docs/dozent/erwartungswerte.md`.

### Kennzahlen (`/api/stats`)

- `gesamt_km`: Summe aller `distanz_km`, gerundet auf 1 Nachkommastelle.
- `durchschnitt_km_pro_woche`: `gesamt_km` geteilt durch die Anzahl der ISO-Kalenderwochen von der Woche des ersten bis zur Woche des letzten Trainings, beide inklusive, gerundet auf 1 Nachkommastelle.
- `lieblingssportart`: Sportart mit der größten Summe `distanz_km`. Bei Gleichstand die alphabetisch erste.
- `anzahl`: Anzahl Einheiten.
- Leere Liste: `gesamt_km` 0.0, `durchschnitt_km_pro_woche` 0.0, `lieblingssportart` null, `anzahl` 0.

### Wochenverlauf (`/api/stats/wochen`)

Liste aufsteigend nach Woche. Jeder Eintrag: `kw` als ISO-Wochenstring `2026-W23`, `wochenstart` als ISO-Datum des Montags, `distanz_km`, `anzahl`, `dauer_min` und seit US-7 `je_sportart` (Kilometer je Sportart, leeres Objekt in Wochen ohne Training). Alle Wochen zwischen erster und letzter Trainingswoche sind enthalten, Wochen ohne Training mit 0. Leere Liste ergibt leere Liste.

### `/api/workouts`

Liste aller Einheiten, sortiert nach `datum` absteigend, bei gleichem Datum nach `id` absteigend.

Die Rechenfunktionen liegen in `statistik.py` ohne FastAPI-Abhängigkeit, damit sie einzeln testbar sind.

## 5. Backend

- Python 3.12, `fastapi`, `uvicorn[standard]`, `pytest`, `httpx2` in `requirements.txt`, Versionen mit Untergrenze festgelegt. Starlette 1.6 verlangt für den TestClient `httpx2` statt `httpx`.
- `daten.py` liest den Pfad aus `FITTRACK_DATA`, Standard ist `backend/app/data/fittrack.db` relativ zum Modul; `lade_workouts(pfad=None)` nimmt optional einen expliziten Pfad. Damit funktioniert die App aus jedem Arbeitsverzeichnis und im Container.
- `conftest.py` baut aus `schema.sql` und dem SQL-Fixture eine temporäre Datenbank und setzt `FITTRACK_DATA` darauf, bevor `app.main` importiert wird.
- `main.py` mountet `frontend/` als StaticFiles unter `/` mit `html=True`. API-Routen werden vor dem Mount registriert.
- Start lokal: `uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000`.

## 6. Frontend

Anlehnung an Garmin Connect, Apple Fitness und RingConn: Karten, große Kennzahlen, je Sportart eine Akzentfarbe und ein SVG-Symbol, ruhige Typografie. Dunkel ist Standard, hell folgt dem Gerät oder dem Umschalter im Kopf (`light-dark()` im CSS, Wahl im `localStorage`).

### Erstentwurf (US-4 bis US-6, Tag `us-6`)

Wochenziel-Ring für die jüngste Datenwoche, vier Kennzahl-Kacheln, Balkendiagramm mit Umschalter „8 W / 6 M / 1 J / Alles“, Liste mit Kürzeln „La, Ra, Sc, Wa“. Dieser Stand besteht alle Tests und ist bewusst der Erstentwurf der KI: Ring geschlossen bei 161 %, vergangene Woche als Fortschritt, Balken ohne Achse, Stapel auf 375 px unlesbar, Kürzel, „Einheiten“ zweimal mit anderem Bezug, 12 px, kein `aria-pressed`, nur dunkel.

### Zweitentwurf (US-7, Tag `us-7`), Reihenfolge auf dem Smartphone

1. Kopfzeile: Titel, „Daten vom … bis …“, Thema-Umschalter.
2. Wochenkarte: „Letzte Trainingswoche“ oder „Diese Woche“ mit Wochenspanne, Badge (Ziel erreicht, Auf Kurs, Im Rückstand, Unter dem Ziel; Serie erreichter Wochen), große Kilometerzahl mit Abstand zum Ziel, Bullet-Graph (Balken nach Sportart gefärbt, Zielmarke 40 km, Skala über das Ziel hinaus), Kilometer je Sportart, Einheiten, Minuten, Ø je Einheit.
3. Kennzahl-Kacheln (2er-Raster, weiß): Bezug in der Überschrift („Gesamt seit Sep 2024“, „Einheiten seit Sep 2024“), Zahl, Einordnung darunter („Ziel in 33 von 105 Wochen“, „KW 37/2025 · 4 Einheiten“, „Ø 3,0 je Woche“).
4. Sportarten: eine Kachel je Sportart mit Kilometern, Anteil als Balken, Einheiten, Ø je Einheit, letzte Einheit; Untertitel „Alle 311 Einheiten seit Sep 2024“.
5. Letzte Aktivitäten: 10 Einträge (Desktop 6), Untertitel mit der Spanne der sichtbaren Einträge, „20 weitere anzeigen“, „Alle anzeigen“, „Wieder einklappen“.
6. Kilometer pro Woche: Legende unter der Überschrift, Untertitel mit KW-Spanne und Jahr, ein Balken je Woche (grün ab Ziel), Ziellinie, Zeitraumwahl unter dem Diagramm; ab einem Jahr Monatssummen.
7. Trainingskalender: letzte 8 Wochen, ein Feld je Tag, vier Farbstufen, Zahl im Feld.

Jedes Objekt (Woche, Balken, Kalendertag, Kennzahl, Sportart, Einheit) öffnet beim Antippen ein Sheet (`<dialog>`, auf dem Handy von unten, am Desktop mittig) mit den Details, zum Beispiel der Rechnung einer Kennzahl oder dem Tempo einer Einheit. Keine Tooltips, die nur mit der Maus erscheinen. Desktop ab 768 px in zwei Spalten: Woche und Kennzahlen, Sportarten und Aktivitäten, Verlauf und Kalender.

CSS: Custom Properties, Basis für schmale Screens, Raster mit `minmax(0, 1fr)`, ein Breakpoint bei 768 px, eine Stufe unter 380 px für Frontdisplays. Schrift mindestens 13 px in Beschriftungen und 16 px im Fließtext, Bedienelemente 44 px, `viewport-fit=cover` mit `safe-area`-Rändern. Chart.js 4 per CDN; die Farben werden über ein Sondenelement aufgelöst, weil `light-dark()` roh nicht lesbar ist. Fehlerfall: Antwortet die API nicht, zeigt jede Karte einen kurzen Hinweistext.

## 7. Docker, Render, CI

Dockerfile wie im Konzept, mit zwei Änderungen: `.dockerignore` schließt Tests, docs, `.git` und `__pycache__` aus; die CMD liest `PORT` mit Standard 8000, weil Render den Port vorgibt:

```dockerfile
CMD ["sh", "-c", "uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
```

`render.yaml`: ein Web Service, `runtime: docker`, `plan: free`, `healthCheckPath: /health`. Deploy per Blueprint aus dem GitHub-Repo; die Anleitung steht in `docs/dozent/render-deploy.md`. Der Free-Plan schläft nach Inaktivität ein, der erste Aufruf dauert dann bis zu einer Minute; das steht als Hinweis für die Kickoff-Demo dabei.

`.github/workflows/tests.yml`: bei Push und Pull Request `pip install -r requirements.txt` und `pytest`. Optionaler Schritt 9.

## 8. Tests

`backend/tests/test_api.py`, alle gegen das Fixture:

- `test_health`
- `test_workouts_liefert_liste`, `test_workouts_felder`, `test_workouts_sortiert_absteigend`
- `test_stats_gesamt_km`, `test_stats_durchschnitt`, `test_stats_lieblingssportart`, `test_stats_leere_liste` (über `monkeypatch` auf leere Liste)
- `test_wochen_anzahl_und_luecken`, `test_wochen_summen`, `test_wochen_leer`
- `test_wochen_je_sportart` (US-7)
- `test_index_liefert_html`

Ein Smoke-Test lädt die Echtdaten und prüft nur Anzahl größer 250 und gültige Felder, damit eine kaputte `fittrack.db` auffällt.

## 9. Verifikation der Referenzlösung

- `pytest` grün nach jedem Schritt, Commit erst danach.
- `docker build` und `docker run`, `curl /health` aus dem Container.
- Oberfläche im Browser bei 375 px und 1024 px Breite geprüft: kein horizontales Scrollen, Diagramm und Umschalter funktionieren, Liste lädt nach.
- Render-Deploy per Blueprint eingerichtet, Auto-Deploy bei jedem Push auf `main`; die Lernumgebung wird per GitHub Actions auf Pages veröffentlicht.
- Dashboard bei 320, 353, 375 und 1280 px geprüft: kein horizontales Scrollen, jedes Sheet öffnet und schließt, Thema-Wahl bleibt nach Neuladen.

## 10. Nicht enthalten

Kein CSV-Import, kein Datenbankserver (SQLite ist eine Datei), kein Login, kein Schreiben von Workouts, kein Build-Step im Frontend. Docker Compose ist nur Bequemlichkeit für WebStorm, kein Lernziel.
