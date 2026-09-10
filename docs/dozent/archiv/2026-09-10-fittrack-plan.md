# FitTrack – Implementierungsplan (Archiv)

> **Historisches Dokument vom 10.09.2026, Stand vor der Umstellung auf SQLite und vor US-7.** Es beschreibt, wie die Referenzlösung ursprünglich geplant war (JSON-Datei, `workouts.json`, Ring im Frontend). Der gültige Stand steht in `README.md`, `docs/dozent/2026-09-10-fittrack-design.md` und `docs/dozent/prompt-skript.md`. Aufbewahrt, weil die Abweichung vom Plan selbst ein Lehrstück ist.


> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Referenzlösung der FitTrack-App mit einem Git-Commit und Tag pro Lehrschritt, dazu das Prompt-Skript und die Begleitdokumente.

**Architecture:** FastAPI liefert drei JSON-Endpunkte und das statische Frontend aus einem Prozess. Rechenlogik liegt in `statistik.py` ohne Framework-Abhängigkeit. Tests laufen gegen ein 8-Zeilen-Fixture, die App gegen 300 generierte Einheiten. Frontend ist Vanilla JS mit Chart.js, mobile-first, dunkles Theme.

**Tech Stack:** Python 3.12, FastAPI, uvicorn, pytest, httpx, Chart.js 4 (CDN), Docker, Render.com, GitHub Actions.

**Spec:** `docs/dozent/2026-09-10-fittrack-design.md`

## Global Constraints

- Python 3.12; nur `fastapi`, `uvicorn[standard]`, `pytest`, `httpx` in `requirements.txt`
- Deutsche Feldnamen: `id, datum, sportart, dauer_min, distanz_km, kalorien`
- Sportarten: `Laufen`, `Radfahren`, `Schwimmen`, `Wandern`
- Texte auf Deutsch mit echten Umlauten; Bezeichner ASCII
- Kein Build-Step im Frontend, keine Emojis, keine Bilder
- Ein Commit pro Lehrschritt, Commit-Message mit Story-Bezug, Tag pro Schritt
- Code für Anfänger lesbar: kurze Funktionen, sprechende Namen, ein Kommentar pro Funktion, keine Tricks

---

## Dateiverantwortungen

| Datei | Verantwortung |
|---|---|
| `backend/app/daten.py` | `lade_workouts() -> list[dict]`: JSON-Datei laden, Pfad aus `FITTRACK_DATA` |
| `backend/app/models.py` | Pydantic-Modelle `Workout`, `Stats`, `WochenEintrag` |
| `backend/app/statistik.py` | reine Funktionen `berechne_stats(workouts)`, `berechne_wochen(workouts)` |
| `backend/app/main.py` | Routen `/health`, `/api/workouts`, `/api/stats`, `/api/stats/wochen`, StaticFiles auf `/` |
| `backend/tests/conftest.py` | setzt `FITTRACK_DATA` auf Fixture vor App-Import |
| `backend/tests/test_api.py` | alle API-Tests, in Story-Reihenfolge |
| `scripts/generate_workouts.py` | erzeugt `workouts.json` deterministisch |
| `frontend/index.html` | Struktur: Kopf, Ring, Karten, Diagramm, Liste |
| `frontend/style.css` | Custom Properties, mobile-first, ein Breakpoint |
| `frontend/app.js` | fetch, Rendern, Ring, Chart, Zeitraum-Filter |

## Fixture und Erwartungswerte

`backend/tests/fixtures/workouts_klein.json`, 8 Einheiten, KW 23 bis KW 25 2026, KW 24 leer:

| id | datum | sportart | dauer_min | distanz_km | kalorien |
|---|---|---|---|---|---|
| 1 | 2026-06-01 | Laufen | 30 | 5.0 | 350 |
| 2 | 2026-06-03 | Radfahren | 60 | 20.0 | 500 |
| 3 | 2026-06-05 | Laufen | 45 | 8.0 | 560 |
| 4 | 2026-06-06 | Schwimmen | 40 | 1.5 | 400 |
| 5 | 2026-06-15 | Radfahren | 90 | 30.0 | 750 |
| 6 | 2026-06-17 | Laufen | 50 | 9.0 | 630 |
| 7 | 2026-06-19 | Wandern | 120 | 10.0 | 600 |
| 8 | 2026-06-21 | Laufen | 25 | 4.0 | 280 |

Erwartung: `gesamt_km` 87.5, Wochen 3, `durchschnitt_km_pro_woche` 29.2, `lieblingssportart` Radfahren (50.0 vor Laufen 26.0), `anzahl` 8. Wochen: W23 34.5 km / 4 / 175 min, W24 0 / 0 / 0, W25 53.0 km / 4 / 285 min.

---

### Task 0: Starter (Tag `sprint-0`, Branch `starter`)

**Files:** Create `.gitignore`, `requirements.txt`, `README.md`, `backend/app/__init__.py`, `backend/app/data/workouts.json`, `backend/tests/__init__.py`, `backend/tests/conftest.py`, `backend/tests/fixtures/workouts_klein.json`, `backend/tests/test_api.py`, `scripts/generate_workouts.py`, `docs/setup-webstorm.md`, `docs/checklisten.md`, `frontend/.gitkeep`

- [ ] `git init`, Branch `main`; `.venv` per `uv venv --python 3.12`, `uv pip install -r requirements.txt`
- [ ] `generate_workouts.py`: Seed 2024, Wochen vom 2024-09-02 bis 2026-09-06, pro Woche 2 bis 4 Einheiten, 6 Wochen ohne Training, Sportart-Gewichte je Monat, Dauer/Distanz/Kalorien je Sportart aus Bereichen; schreibt JSON sortiert nach Datum mit `id` ab 1
- [ ] `conftest.py` setzt `os.environ["FITTRACK_DATA"]` auf das Fixture und fügt `backend/` zum `sys.path` hinzu
- [ ] `test_api.py` nur mit `test_health`; `pytest` muss mit ImportError rot sein
- [ ] README: Setup mit venv, `pytest`, `uvicorn`, Ordnerstruktur, User Stories
- [ ] Commit `chore: Starter für Sprint 0`, Tag `sprint-0`, Branch `starter`

### Task 1: US-3 `/health` (Tag `us-3`)

- [ ] `main.py` mit `FastAPI(title="FitTrack")` und `GET /health` → `{"status": "ok"}`
- [ ] `pytest` grün; Commit `feat(US-3): Health-Endpunkt`, Tag

### Task 2: US-1 `/api/workouts` (Tag `us-1`)

- [ ] Tests: `test_workouts_liefert_liste`, `test_workouts_felder`, `test_workouts_sortiert_absteigend` (erste id 8, letzte id 1); rot
- [ ] `daten.py`: `DATEN_PFAD = Path(os.environ.get("FITTRACK_DATA", STANDARD))`, `lade_workouts()` gibt Liste von dicts, sortiert nach `(datum, id)` absteigend
- [ ] `models.py`: `Workout(BaseModel)` mit den sechs Feldern
- [ ] `main.py`: `GET /api/workouts` mit `response_model=list[Workout]`
- [ ] grün; Commit `feat(US-1): Workouts-Endpunkt mit Datenmodell`, Tag

### Task 3: US-2 `/api/stats` (Tag `us-2`)

- [ ] Tests: `test_stats_gesamt_km` (87.5), `test_stats_durchschnitt` (29.2), `test_stats_lieblingssportart` (Radfahren), `test_stats_anzahl` (8), `test_stats_leere_liste` (monkeypatch `main.lade_workouts` auf `lambda: []`); rot
- [ ] `statistik.py`:

```python
def berechne_stats(workouts: list[dict]) -> dict:
    if not workouts:
        return {"gesamt_km": 0.0, "durchschnitt_km_pro_woche": 0.0,
                "lieblingssportart": None, "anzahl": 0}
    gesamt = sum(w["distanz_km"] for w in workouts)
    wochen = anzahl_kalenderwochen(workouts)
    return {"gesamt_km": round(gesamt, 1),
            "durchschnitt_km_pro_woche": round(gesamt / wochen, 1),
            "lieblingssportart": lieblingssportart(workouts),
            "anzahl": len(workouts)}
```

  `anzahl_kalenderwochen`: Montag der ersten und der letzten Woche über `date.isocalendar()`, Differenz in Tagen / 7 + 1. `lieblingssportart`: Summen je Sportart, `max` mit Schlüssel `(-summe, name)`.
- [ ] `models.py`: `Stats(BaseModel)` mit `lieblingssportart: str | None`
- [ ] `main.py`: `GET /api/stats`
- [ ] grün; Commit `feat(US-2): Kennzahlen-Endpunkt`, Tag

### Task 4: US-4 Frontend-Gerüst (Tag `us-4`)

- [ ] Test `test_index_liefert_html` (`GET /` → 200, `text/html`, enthält `FitTrack`); rot
- [ ] `index.html`: `<main>` mit Sektionen `#woche`, `#kennzahlen`, `#diagramm`, `#aktivitaeten`, Platzhaltertexte „…“; Chart.js-Script und `app.js` am Ende
- [ ] `style.css`: Variablen (`--bg`, `--karte`, `--text`, `--text-2`, `--akzent`, `--laufen`, `--radfahren`, `--schwimmen`, `--wandern`), Basis für schmal, `@media (min-width: 768px)`
- [ ] `main.py`: `app.mount("/", StaticFiles(directory=FRONTEND, html=True))` nach den Routen
- [ ] grün; Browser 375 px ohne horizontales Scrollen; Commit `feat(US-4): Mobile-first Gerüst`, Tag

### Task 5: US-5 Kennzahlen und Liste (Tag `us-5`)

- [ ] `app.js`: `ladeJson(url)`, `zeigeKennzahlen(stats)`, `zeigeAktivitaeten(workouts)` mit „Mehr anzeigen“ (10er-Schritte), Sportart-Symbol als Inline-SVG aus einer Tabelle, Fehlertext bei fehlgeschlagenem fetch
- [ ] Manuell im Browser prüfen; Commit `feat(US-5): Kennzahlen und Aktivitäten per fetch`, Tag

### Task 6: US-6 Wochenverlauf (Tag `us-6`)

- [ ] Tests: `test_wochen_anzahl_und_luecken` (3 Einträge, mittlerer 0), `test_wochen_summen` (W23 34.5/4/175, W25 53.0/4/285), `test_wochen_leer`; rot
- [ ] `statistik.py`: `berechne_wochen(workouts)`: Montag je Datum, Dictionary je Montag summieren, alle Montage von erster bis letzter Woche durchlaufen, `kw` als `f"{jahr}-W{woche:02d}"`
- [ ] `models.py`: `WochenEintrag`
- [ ] `main.py`: `GET /api/stats/wochen`
- [ ] `app.js`: `zeigeWoche(wochen)` für den Ring (letzter Eintrag, Ziel 30 km, SVG-Kreis mit `stroke-dasharray`), `zeigeDiagramm(wochen, zeitraum)` mit Chart.js, Umschalter 8 W / 6 M (26) / 1 J (52) / Alles
- [ ] grün; Browser prüfen; Commit `feat(US-6): Wochenverlauf mit Diagramm und Zeitraumwahl`, Tag

### Task 7: Docker (Tag `docker`)

- [ ] `Dockerfile` wie Spec, `.dockerignore`; `docker build -t fittrack .`, `docker run -p 8000:8000 fittrack`, `curl localhost:8000/health`
- [ ] README-Abschnitt Docker; Commit `build: Dockerfile für FitTrack`, Tag

### Task 8: Render (Tag `render`)

- [ ] `render.yaml`; `docs/dozent/render-deploy.md`; README-Abschnitt; Commit `deploy: Render-Blueprint`, Tag

### Task 9: CI (Tag `ci`)

- [ ] `.github/workflows/tests.yml`; Commit `ci: pytest bei Push`, Tag

### Task 10: Dozentenmaterial und GitHub

- [ ] `docs/kurs/` mit Kurskonzept, `docs/dozent/prompt-skript.md`, `erwartungswerte.md`, `lmstudio-demo.md`, Ergänzung README; Commit `docs: Prompt-Skript und Dozentenmaterial`
- [ ] `gh repo create swrobuts/FitTrack --private`, Push `main`, `starter`, Tags
- [ ] Elternrepo: `FitTrack/` in `.gitignore`
