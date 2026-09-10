# FitTrack – Ein professionelles KI-gestütztes Web-Projekt in 240 Minuten

**Lehrformat:** 2 Termine à 120 Minuten (Vorführung + Mitmachen)
**Zielgruppe:** Bachelor Business Analytics (Projekt- und IT-Management)
**Methodik:** Micro-Scrum (agil), KI-unterstützt, nicht agentisch
**Philosophie:** Kein reines Vibe Coding – sondern ein echtes Softwareprojekt mit Konzeption, Tests, Abnahme und Deployment

---

## 1. Überblick und Lernziele

### Was die Studierenden am Ende können

- Ein agiles Vorgehensmodell (Scrum, in Miniatur) praktisch durchlaufen: Vision → User Stories → Sprint Planning → Sprints → Review → Retrospektive
- Mit einem LLM (Claude, im Chat-Modus) strukturiert und professionell entwickeln: prompten, Code prüfen, in die IDE übernehmen, testen
- Ein Testkonzept umsetzen: Tests VOR der Implementation aus Akzeptanzkriterien ableiten (Test-First)
- Eine echte, mobile-first Web-App bauen (kein Dashboard-Tool wie Streamlit)
- Die App mit Docker containerisieren und auf dem Smartphone testen
- Alternativen kennen: lokale LLMs mit LM Studio (datensouverän, kostenlos)

### Warum dieses Format funktioniert

| Problem | Lösung im Kurs |
|---|---|
| 4 Stunden sind wenig | Vorbereitetes Repo-Template, Fokus auf Prozess statt Perfektion |
| Teure KI-Abos | Claude im Chat (kostenloses Kontingent reicht), alternativ lokales Modell |
| Agentisches Coden zu teuer/komplex | Klassischer Chat-Workflow: Prompt → Review → Copy-Paste in IDE |
| „Vibe Coding =_code ohne Prüfung" | Test-First + Review-Checkliste als Kern des Konzepts |

---

## 2. Das Projekt: FitTrack

Eine mobile-first Web-App zur Analyse persönlicher Fitness-Daten.

### Funktionen (MVP)

- **F1 – Datenübersicht:** Liste aller Trainingseinheiten (Datum, Sportart, Dauer, Distanz, Kalorien)
- **F2 – Statistik:** Kennzahlen (Gesamtdistanz, Ø pro Woche, Lieblingssportart)
- **F3 – Visualisierung:** Wochenverlauf als Balkendiagramm
- **F4 – Mobile-First:** Ansicht primär für das Smartphone optimiert

### Technischer Stack (bewusst schlank, aber „echt")

| Schicht | Technologie | Warum |
|---|---|---|
| Frontend | HTML + CSS (Custom Properties, Flexbox/Grid) + Vanilla JS + Chart.js | Kein Build-Step, volle Kontrolle, responsive Design greifbar |
| Backend | Python FastAPI | Studierende können Python; echte REST-API; automatische Doku (/docs) |
| Tests | pytest + fastapi TestClient | Test-First einfach umsetzbar |
| Daten | JSON-Datei (workouts.json), später CSV-Import | Kein DB-Setup nötig, aber saubere Datenmodell-Schicht |
| Container | Docker (ein Dockerfile, später optional docker-compose) | Branchenstandard, reproduzierbares Deployment |

### Ziel-Repostruktur

```text
fittrack/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI-Routen
│   │   ├── models.py        # Pydantic-Datenmodell
│   │   └── data/
│   │       └── workouts.json
│   └── tests/
│       └── test_api.py      # Test-First!
├── frontend/
│   ├── index.html           # mobile-first
│   ├── style.css
│   └── app.js               # fetch() + Chart.js
├── Dockerfile
├── requirements.txt
└── README.md                # Setup-Anleitung + Abnahmekriterien
```

---

## 3. Toolchain und Setup (Dozenten-Vorbereitung + Studierenden-Check)

> **Tipp:** Vorbereitete README mit allen Befehlen ins Kurs-Repo legen (GitHub Classroom). Studierende installieren VOR dem 1. Termin. Im Raum: 10 min Setup-Check einplanen.

### 3.1 Docker – die Container-Erklärung für Studierende (2 Minuten, Folie)

- **Problem:** „Läuft bei mir" – Software hängt von Betriebssystem, Python-Version, Bibliotheken ab.
- **Lösung:** Ein Container paketiert App + alle Abhängigkeiten + Laufzeit in ein standardisiertes, isoliertes Paket.
- **Analogie:** Container-Schifffahrt – der Container ist überall gleich, egal welches Schiff/Hafen-Betriebssystem darunter liegt.
- **Begriffe:** *Image* = Bauplan/Vorlage (aus Dockerfile gebaut), *Container* = laufende Instanz eines Images.

**Drei Befehle, die jeder im Kurs können muss:**

```bash
docker build -t fittrack .          # Image bauen
docker run -p 8000:8000 fittrack    # Container starten → http://localhost:8000
docker ps / docker stop <id>        # laufende Container sehen/stoppen
```

### 3.2 Checkliste Installation (vor dem 1. Termin)

- [ ] **Docker Desktop** installiert → Test: `docker run hello-world`
- [ ] **VS Code** (+ Python-Extension) installiert
- [ ] **Git** konfiguriert (`git config --global user.name/email`)
- [ ] **Claude** (claude.ai) – kostenloses Konto angelegt
- [ ] (Optional) **LM Studio** installiert – für die lokale Variante (Abschnitt 9)

### 3.3 Kurs-Repo vorbereiten (Dozent)

- GitHub Classroom Assignment anlegen (jede Kleingruppe erhält eigenes Repo)
- Starter-Repo enthält: Ordnerstruktur (s. o.), `workouts.json` mit ~30 Beispieldatensätzen, leere `test_api.py` mit einer Funktion `health()` als Startpunkt, README mit Setup-Schritten

---

## 4. Vorgehensmodell: Micro-Scrum

### Rollen (in 3er-Gruppen rotierend)

| Rolle | Aufgabe | ROTATION |
|---|---|---|
| Product Owner (PO) | Formuliert User Stories, akzeptiert/fordert zurück | Sprint 1 |
| Developer (Dev) | Promptet Claude, prüft und übernimmt Code | Sprint 2 |
| Quality/Review (QA) | Pflegt Tests, prüft Abnahmekriterien, Review-Checkliste | Sprint 3 |

> Didaktischer Kern: Jede/r sieht alle Perspektiven – genau wie im echten Projekt.

### Die Scrum-Artefakte in Miniatur

1. **Product Vision** (1 Satz): *„FitTrack zeigt mir meine Trainingsdaten auf dem Smartphone – verständlich, aktuell, ansprechend."*
2. **Product Backlog:** priorisierte User Stories (s. Abschnitt 7)
3. **Sprint Backlog:** Was schaffen wir in diesem Sprint? (Timebox!)
4. **Definition of Done (DoD):** siehe Checkliste unten – gilt für jede Story
5. **Sprint Review:** Live-Demo gegen Abnahmekriterien, PO stimmt ab
6. **Retrospektive:** Was hat beim KI-Workflow funktioniert? Was nicht?

### Definition of Done (im Kurs, pro User Story)

- [ ] Code läuft lokal ohne Fehler
- [ ] Zugehörige Tests vorhanden und grün (`pytest`)
- [ ] Abnahmekriterium der Story nachweislich erfüllt (Demo am Handy!)
- [ ] Code von mindestens einer Person reviewingt (Review-Checkliste, Abschnitt 8)
- [ ] Commit + Push mit aussagekräftiger Message

---

## 5. Termin 1 (120 Min): Konzeption + Sprint 1 „Daten & API"

| Zeit | Phase | Inhalt | Format |
|---|---|---|---|
| 0:00–0:10 | Kickoff | Vision, Live-Demo des Endzustands (Dozent zeigt fertige App im Container auf dem Handy) | Plenum |
| 0:10–0:20 | Setup-Check | Docker-Test bei allen, Repo klonen, venv + `pip install fastapi uvicorn pytest httpx` | Mitmachen |
| 0:20–0:40 | Agiles Setup | Product Vision, User Stories schreiben, Backlog priorisieren, Rollen vergeben, Sprint 1 planen | Gruppen |
| 0:40–0:55 | Testkonzept | Aus Akzeptanzkriterien pytest-Tests ableiten → Tests zuerst schreiben (rot) | Gruppen + Vorführung |
| 0:55–1:45 | **Sprint 1** | Datenmodell + API-Endpunkte mit Claude entwickeln (Chat-Workflow, s. Abschnitt 8) | Gruppen |
| 1:45–1:55 | Sprint Review 1 | PO nimmt jede erledigte Story ab (Tests grün? Kriterium erfüllt?) | Gruppen |
| 1:55–2:00 | Wrap-up | Commit + Push, Ausblick auf Termin 2 | Plenum |

### Sprint-1-Ziel (Sprint Goal)

*„Am Ende liefern unsere API-Endpunkte `/api/workouts` und `/api/stats` korrekte, getestete Daten."*

### User Stories für Sprint 1 (Vorlage)

```text
US-1: Als Nutzer möchte ich alle meine Trainingseinheiten als JSON abrufen,
      damit die App sie anzeigen kann.
      Akzeptanz: GET /api/workouts liefert Status 200 und eine Liste;
      jedes Element enthält id, datum, sportart, dauer_min, distanz_km, kalorien.

US-2: Als Nutzer möchte ich meine Kennzahlen abrufen,
      damit ich meinen Fortschritt sehe.
      Akzeptanz: GET /api/stats liefert gesamt_km, durchschnitt_km_pro_woche,
      lieblingssportart – korrekt berechnet für den Beispieldatensatz.

US-3: Als Entwickler möchte ich einen Health-Endpunkt,
      damit ich später im Container prüfen kann, ob die App läuft.
      Akzeptanz: GET /health liefert {"status": "ok"}.
```

### Der Test-First-Schritt (vorgeführt, 15 Min)

Kernbotschaft an die Studis: **„Wir schreiben die Tests BEVOR Claude den Code schreibt – dann prüfen wir gegen das Soll-Verhalten, nicht gegen das, was die KI zufällig gebaut hat."**

```python
# backend/tests/test_api.py – zuerst schreiben, muss ROT sein
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}

def test_workouts_returns_list():
    r = client.get("/api/workouts")
    assert r.status_code == 200
    assert isinstance(r.json(), list)
    assert len(r.json()) > 0

def test_stats_are_correct():
    r = client.get("/api/stats")
    data = r.json()
    assert "gesamt_km" in data
    assert "lieblingssportart" in data
    assert data["gesamt_km"] == pytest.approx(123.4)  # Wert vorher manuell aus Daten berechnen!
```

> **Wichtige didaktische Pointe:** Den erwarteten Wert (`123.4`) berechnen die Studierenden selbst aus den Daten – nicht von der KI vorgeben lassen. Sonst testen wir nur, dass die KI mit sich selbst konsistent ist.

---

## 6. Termin 2 (120 Min): Sprint 2 „Frontend" + Sprint 3 „Docker & Abnahme"

| Zeit | Phase | Inhalt | Format |
|---|---|---|---|
| 0:00–0:05 | Recap | Stand des Backlogs, Sprint Goal 2 vorstellen | Plenum |
| 0:05–1:00 | **Sprint 2** | Mobile-first Frontend: HTML-Struktur, CSS (Breakpoint!), fetch() + Chart.js | Gruppen |
| 1:00–1:10 | Sprint Review 2 | Abnahme AM SMARTPHONE (Handy im WLAN → `http://<rechner-ip>:8000`) | Gruppen |
| 1:10–1:35 | **Sprint 3** | Dockerfile schreiben, Image bauen, Container starten, Handy-Test aus dem Container | Mitmachen |
| 1:35–1:45 | Exkurs | Lokale LLMs: Live-Demo LM Studio + Qwen3-Coder (Abschnitt 9) | Vorführung |
| 1:45–1:55 | Abnahme & Review | Abschluss-Abnahme gegen Gesamt-Checkliste, Code-Review nach Checkliste | Gruppen |
| 1:55–2:00 | Retrospektive | Was hat der KI-Workflow gebracht? Wo war Review unverzichtbar? | Plenum |

### Sprint-2-Ziel

*„Die App sieht auf dem Smartphone gut aus und zeigt Daten + Statistik + Diagramm live aus der API."*

### Mobile-First in 3 Regeln (Folieninhalt)

1. **Mobile zuerst stylen** – Basis-CSS für schmale Screens (max-width 480 px), danach mit `@media (min-width: 768px)` für Tablet/Desktop erweitern
2. **Flexbox/Grid statt fixe Breiten** – `100%` Breite für Karten, Karten stapeln sich von selbst
3. **Daumen-freundlich** – Touch-Targets ≥ 44 px, Schriftgröße ≥ 16 px (verhindert Zoom beim Fokus)

### Das Dockerfile (gemeinsam erarbeitet, Vorlage)

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./backend/
COPY frontend/ ./frontend/
EXPOSE 8000
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Vorführen:** `docker build` → `docker run -p 8000:8000 fittrack` → App auf dem Handy im WLAN öffnen. Botschaft: *„Was hier läuft, läuft identisch auf jedem Server der Welt."*

**Ausbaustufe (falls Zeit):** docker-compose mit getrenntem nginx-Container fürs Frontend – zeigt, wie Services orchestriert werden.

---

## 7. Test- und Abnahmekonzept

### Testpyramide im Miniaturprojekt

| Ebene | Womit | Beispiel |
|---|---|---|
| Unit-Tests | pytest | `test_stats_are_correct()` – Berechnungslogik |
| Integration/API-Tests | pytest + TestClient | Endpunkt liefert 200 + korrekte Struktur |
| Manuelle Abnahmetests | Checkliste am Handy | Responsive Darstellung, Bedienbarkeit, echte Daten |

### Grundsätze fürs Testen von KI-generiertem Code (Folieninhalt)

1. **Tests schreiben/bestimmen VOR dem Code** – gegen die Spezifikation testen, nicht gegen die zufällige Implementierung
2. **Trennung der Kontexte:** Wer die Tests definiert, soll nicht blind dem Code-Generierenden vertrauen – im Kurs: PO/QA-Rolle definiert Erwartungswerte, Dev promptet
3. **Edge Cases mitdenken:** leere Datenliste, eine einzige Trainingseinheit, ungültige IDs – KI-Code versagt hier statistisch am ehesten
4. **„AI-Code reviewen wie den PR eines Junior-Entwicklers"** – nie ungeprüft übernehmen
5. **Grenzen der Selbstprüfung kennen:** KI-generierte Tests für KI-generierten Code allein reichen NICHT als Qualitätsnachweis

### End-Abnahme: Gesamt-Checkliste (1:45, wird abgezeichnet)

- [ ] Alle User Stories aus dem Backlog: erfüllt / bewusst zurückgestellt (dokumentiert)
- [ ] `pytest` läuft komplett grün
- [ ] App läuft im Docker-Container (`/health` → ok)
- [ ] Darstellung auf Smartphone getestet (Breite ≤ 480 px): keine horizontalen Scrollbalken, Karten stapeln sich
- [ ] Diagramm zeigt echte Daten aus der API (nicht hartkodiert)
- [ ] README beschreibt Setup, Test-Ausführung, Docker-Start
- [ ] Git-Historie zeigt sinnvolle Commits mit Bezug zu den Stories (US-1, US-2 …)

---

## 8. Der Claude-Workflow: Professionell prompten, nicht agentisch

### Grundprinzip des Chat-basierten Entwickelns

```text
Anforderung präzise formulieren (User Story + Akzeptanzkriterien)
        ↓
Claude im Chat → Code Vorschlag
        ↓
LESEN & PRÜFEN (nicht blind kopieren!)
        ↓
In IDE übernehmen, manuell anpassen
        ↓
Tests laufen lassen → rot? → Fehlerbeschreibung zurück in den Chat
        ↓
grün → Commit mit Story-Bezug
```

### Prompt-Vorlage für Coding-Anfragen (an die Tafel / Folie)

```text
Du bist ein erfahrener Python-Entwickler. Kontext: Wir bauen mit FastAPI
eine kleine Fitness-App. Es gibt eine JSON-Datei mit Trainingseinheiten
(Felder: id, datum, sportart, dauer_min, distanz_km, kalorien).

Aufgabe: Implementiere den Endpunkt GET /api/stats mit folgenden
Anforderungen:
- Rückgabe: {"gesamt_km": float, "durchschnitt_km_pro_woche": float,
  "lieblingssportart": str}
- lieblingssportart = die Sportart mit der größten Gesamtdistanz

Randbedingungen:
- Nur Standardbibliothek + FastAPI/Pydantic, keine zusätzlichen Pakete
- Der Code muss diese Tests bestehen: [Tests einfügen]
- Bitte erkläre in 3 Sätzen deine wichtigsten Entscheidungen.
```

### Prompt-Regeln für die Studis (Folie)

1. **Eine Story pro Prompt** – nicht „bau mir die ganze App"
2. **Kontext mitliefern** – Datenmodell, genutzte Bibliotheken, bestehender Code (Ausschnitt)
3. **Randbedingungen nennen** – Versionen, verbotene Pakete, Performance-Anforderungen
4. **Erklärung anfordern** – „Erkläre deine Entscheidungen" zwingt zur Auseinandersetzung mit dem Code
5. **Fehlermeldungen wörtlich zurückspielen** – Traceback kopieren, nicht paraphrasieren
6. **Niemals Unverstandenes committen** – jede Zeile im Code muss jemand in der Gruppe erklären können

### Review-Checkliste für übernommenen KI-Code (QA-Rolle)

- [ ] Habe ich jede Funktion verstanden (Kann ich sie in einem Satz erklären)?
- [ ] Enthält der Code halluzinierte Pakete/Funktionen? (Existieren alle Imports?)
- [ ] Sind Edge Cases behandelt (leere Liste, None, ungültige IDs)?
- [ ] Gibt es hartkodierte Werte, die in die Daten/Konfiguration gehören?
- [ ] Bestehen die Tests UND testen die Tests wirklich das Verhalten aus der Story?
- [ ] Ist der Code stilistisch konsistent mit dem Rest (Naming, Struktur)?

---

## 9. Flankierend: Lokale LLMs mit LM Studio (10-Minuten-Demo)

### Botschaft an die Studis

*„Alles, was wir heute mit Claude im Chat gemacht haben, geht auch komplett lokal, offline und datensouverän – auf dem eigenen Rechner, ohne Abo."*

### Empfehlung Modelle (Stand September 2026)

| Modell | Größe (Q4_K_M) | Braucht | Stärke | Einsatz |
|---|---|---|---|---|
| **Qwen3-Coder-30B-A3B** ⭐ | ~18,6 GB | 32–48 GB RAM (Mac M-Series / 24-GB-GPU) | Coding-Spezialist, MoE (nur 3B aktiv → schnell), 256K Kontext, Apache-2.0 | Dozenten-Demo, leistungsstarke Rechner |
| **Qwen2.5-Coder 7B** | ~4,7 GB | 8–16 GB RAM | solider Coding-Einstieg | Studierende mit normalen Laptops |
| **Gemma 3 27B** | ~17 GB | 24–32 GB RAM | starker Generalist, multimodal; beim Coding schwächer als Qwen3-Coder | Demo „Generalist vs. Spezialist" |
| **Gemma 3 4B** | ~3 GB | 8 GB RAM | kleinster brauchbarer Einstieg | alte Rechner |

> **Hinweis zur Modellwahl:** Für das Coding-Beispiel ist Qwen3-Coder-30B-A3B die bessere Wahl als Gemma 3 – es ist das aktuell führende Open-Source-Coding-Modell, direkt über den LM-Studio-Katalog installierbar (Suche: „Qwen3 Coder 30B"). Gemma 3 eignet sich gut als Kontrast: gleicher Prompt, spürbar anderer Code – hervorragender Diskussionsanlass über Modellspezialisierung.

### Demo-Ablauf (vorbereiten!)

1. LM Studio öffnen → Discover → „Qwen3 Coder 30B A3B" → Q4_K_M herunterladen (VOR der Veranstaltung!)
2. Prompt aus Abschnitt 8 (die /api/stats-Anfrage) an Qwen3-Coder stellen
3. Gleichen Prompt an Gemma 3 27B (falls geladen) oder ein kleineres Modell → Unterschiede zeigen
4. Vergleichen mit der Claude-Antwort: Qualität, Stil, Erklärungen
5. Diskussionsfragen: Wann reicht lokal? (Datenschutz, Kosten, Offline) Wann Cloud? (Komplexität, Kontextlänge)

### Verbinden mit der IDE (Ausblick, 2 Min)

LM Studio stellt einen lokalen OpenAI-kompatiblen Server bereit (Developer-Tab → Start Server, `http://localhost:1234/v1`). Damit lässt sich z. B. VS Code mit der Continue-Extension anbinden – Autocomplete und Chat komplett lokal, kostenfrei.

---

## 10. Dozenten-Vorbereitungs-Checkliste

**Eine Woche vorher:**

- [ ] GitHub Classroom Assignment + Starter-Repo anlegen (Struktur s. Abschnitt 2, `workouts.json` mit ~30 Datensätzen)
- [ ] README mit Installationsanleitung (Abschnitt 3.2) verteilen
- [ ] Fertige Referenz-App einmal komplett durchspielen (Zeit nehmen! ggf. Umfang kürzen)
- [ ] LM Studio: Modelle herunterladen, Demo-Prompts testen

**Am Veranstaltungstag:**

- [ ] WLAN-/Hotspot-Zugang für Handy-Tests klären; lokale IP des Dozenten-Rechners notieren
- [ ] Referenz-Container starten (`docker run -p 8000:8000 fittrack`) – für die Eröffnungs-Demo
- [ ] Terminal + Browser + Claude + LM Studio in virtuellen Desktops/Spaces vorbereitet
- [ ] Ausgedruckte Checklisten (DoD, Review, End-Abnahme) pro Gruppe

**Risiken & Plan B:**

| Risiko | Plan B |
|---|---|
| Docker-Installation schlägt fehl | Lokal mit `uvicorn` laufen lassen, Docker nur vorführen |
| Claude-Limit erreicht | Auf lokales Modell (LM Studio) ausweichen – der Workflow ist identisch |
| Gruppe zu langsam | Sprint Goals priorisieren: US-1 und US-3 sind Pflicht, US-2 optional |
| Zeitnot in Termin 2 | Sprint 3 kürzen: fertiges Dockerfile verteilen, nur `build`/`run` gemeinsam machen |

---

## 11. Quellen und Vertiefung (für Folien-Fußnoten / further reading)

**Bücher:**

- Gene Kim & Steve Yegge: *Vibe Coding: Building Production-Grade Software With GenAI* – das credibelste Buch zum professionellen KI-gestützten Entwickeln
- Addy Osmani: *Beyond Vibe Coding* (O'Reilly) – vom Coder zum Entwickler im KI-Zeitalter
- Mahmoud Zalt: *Vibe Coding with Confidence* – kostenloses Online-Handbook, 142+ Kapitel inkl. Prompt-Katalog: https://zalt.me
- Tomasz Lelek & Artur Skowronski: *Vibe Engineering* (Manning, Early Access) – provider-agnostisch, kleine reviewbare Änderungen

**Grundlagen & Begriff:**

- Wikipedia: Vibe Coding (inkl. Studien zu Qualität/Sicherheit KI-generierten Codes): https://en.wikipedia.org/wiki/Vibe_coding
- Simon Willison's Weblog (kritische Stimme + 124 eigene AI-assisted Tools): https://simonwillison.net

**Testing von KI-Code:**

- SitePoint, „Testing AI-Generated Code: Practical Strategies" (10-Punkte-Checkliste): https://www.sitepoint.com/testing-ai-generated-code/
- Shiplight, „Testing Strategy for AI-Generated Code: The 7-Layer Model": https://www.shiplight.ai/blog/testing-strategy-for-ai-generated-code

**Lokale LLMs / LM Studio:**

- LM Studio Modelkatalog (Qwen3-Coder-30B): https://lmstudio.ai/models/qwen/qwen3-coder-30b
- Klymentiev, „Best Local LLM 2026: Top Open Models by Hardware": https://klymentiev.com/blog/best-local-llm
- Deutschsprachig: Never Code Alone, Vibe-Coding-Guides und Ollama-Modellübersichten: https://nevercodealone.de/de/vibe-coding

**Tools:**

- FastAPI: https://fastapi.tiangolo.com | Chart.js: https://www.chartjs.org | pytest: https://docs.pytest.org
- GitHub Classroom: https://classroom.github.com | LM Studio: https://lmstudio.ai
