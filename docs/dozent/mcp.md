# Mit FitTrack sprechen: MCP-Server und Trainingsbot

Zwei Wege, die Trainingsdaten in ein Chatfenster zu holen. Beide brauchen keine Änderung an der App auf Render.

| Weg | Wo läuft der Chat | Wer rechnet | Wofür |
|---|---|---|---|
| **MCP-Server** (`mcp/server.py`) | Claude Desktop oder LM Studio, auf Ihrem Rechner | die App: der Client ruft Werkzeuge auf, die die API abfragen | Fragen an die Daten stellen, Werkzeugaufrufe beobachten, Cloud gegen lokal vergleichen |
| **Trainingsbot** in der App | die FitTrack-Seite selbst, nur lokal | die App rechnet vorab, LM Studio formuliert | Chat über Training und die eigenen Zahlen, ohne Konto und ohne dass Daten den Rechner verlassen |

Der MCP-Server ist die Brücke, mit der ein fremdes Chatfenster an die Daten kommt. Der Trainingsbot sitzt in der App, deshalb braucht er diese Brücke nicht: Seine Route ruft dieselben Python-Funktionen auf wie die übrigen Endpunkte.

## Weg 1: MCP-Server

### Was er tut

`mcp/server.py` spricht über stdin/stdout mit dem Chat-Client, das ist der Standard des Model Context Protocol. Er holt die Einheiten einmal je Aufruf von `GET /api/workouts` und rechnet dann mit denselben Funktionen wie die App, `statistik.py` aus dem Backend. Das Modell bekommt fertige Zahlen; es muss nichts addieren, zählen oder in Kalenderwochen umrechnen. Genau da entstehen sonst die Abweichungen, denn MCP transportiert präzise, das Modell rechnet nicht präzise.

Vierzehn Werkzeuge, geordnet nach der Frageart, die das Modell sonst selbst erledigen müsste:

| Frageart | Werkzeug | Beantwortet | Parameter |
|---|---|---|---|
| Orientierung | `gesundheit` | Ist die App erreichbar? | keine |
| | `heute` | heutiges Datum, aktuelle Kalenderwoche, erste und letzte Einheit | keine; zuerst bei „letzte Woche“, „dieser Monat“ |
| | `datenumfang` | welche Felder und Sportarten es gibt, und was die App nicht erfasst | keine; bei Zweifel, ob eine Frage beantwortbar ist |
| Gesamtbild | `kennzahlen` | Kilometer, Durchschnitt je Kalenderwoche, Lieblingssportart, Anzahl, Datenzeitraum | keine |
| | `sportarten` | je Sportart Anzahl, Kilometer, Anteile, Kilometer je Einheit, letzte Einheit; häufigste nach Anzahl und nach Kilometern | `von`, `bis` optional |
| Zeitscheiben | `woche` | genau eine Kalenderwoche mit Montag, Sonntag, Summen, je Sportart, Wochenziel, Einheiten | `kalenderwoche` als `2026-W36` oder ein Datum |
| | `wochen` | Verlauf nach Kalenderwochen, Wochen ohne Training mit Nullwerten | `anzahl` (12, 0 = alle) oder `von_kw`, `bis_kw` |
| | `monate` | Verlauf nach Kalendermonaten | `anzahl` (12, 0 = alle) |
| | `zeitraum` | Summen und Durchschnitte für beliebige Tage, wahlweise je Sportart, dazu erreichte Wochenziele | `von`, `bis` einschließlich; ohne Angabe alles; `sportart` |
| | `vergleich` | zwei Zeiträume nebeneinander mit Differenz in Kilometern, Anzahl, Minuten, Kalorien und Prozent | `von_a`, `bis_a`, `von_b`, `bis_b`, `sportart` |
| Extreme und Muster | `bestwerte` | längste Einheit nach Kilometern und Minuten, schnellste Einheit, meiste Kalorien, beste Woche, Zielserien | `sportart` optional; für „schnellster Lauf“ Pflicht |
| | `pausen` | längste Pause, Wochen ohne Training, Tage seit der letzten Einheit, Zahl der Trainingstage | keine |
| | `wochentage` | Verteilung Montag bis Sonntag mit Anteilen, häufigster Trainingstag | `von`, `bis` optional |
| Einzelfälle | `einheiten` | einzelne Einheiten mit Tempo, jüngste zuerst, Trefferzahl und Summe über alle Treffer | `sportart`, `von`, `bis`, `anzahl` (20, 0 = alle); ein Tag: `von` gleich `bis` |

Drei Dinge machen die Antworten belastbar:

- **Definitionen stehen im Docstring.** Kalenderwochen sind ISO-Wochen von Montag bis Sonntag, Daten gelten einschließlich beider Grenzen, der Durchschnitt je Woche zählt auch Wochen ohne Training, die Lieblingssportart ist die mit den meisten Kilometern. Der Docstring ist die einzige Anleitung, die das Modell hat.
- **Jede Antwort nennt ihren Bezug.** `woche` liefert `von` und `bis`, `zeitraum` die tatsächlich verwendeten Grenzen, `kennzahlen` den Datenzeitraum. Das Modell muss kein Enddatum ergänzen.
- **Ungültige Eingaben geben eine Fehlermeldung mit den gültigen Werten**, etwa `Unbekannte Sportart 'Joggen'. Gültig sind: Laufen, Radfahren, Schwimmen, Wandern`. Eine Woche ohne Training ist kein Fehler, sondern liefert Nullwerte; liegt sie außerhalb der Daten, steht das im Feld `hinweis`. Technisches Detail: Die Werkzeuge werfen dafür `ToolError` aus dem SDK. Eine gewöhnliche Python-Ausnahme würde das SDK zu „Error executing tool“ ohne Text verkürzen, und das Modell wüsste nicht, was falsch war.

Dazu bekommt das Modell beim Verbinden eine Anweisung: für relative Zeitangaben zuerst `heute` aufrufen, nie selbst summieren, Fehlermeldungen wörtlich weitergeben. Und die Regel für alles, was kein Werkzeug liefert: Die Daten enthalten nur Datum, Sportart, Dauer, Kilometer und Kalorien. Fragen nach Herzfrequenz, Uhrzeit, Strecke, Höhenmetern, Gewicht, Schlaf oder Gefühl beantwortet das Modell mit dem Satz, dass die App das nicht erfasst; liefert kein Werkzeug die gefragte Zahl, sagt es das offen. Dieselbe Regel steht im Systemprompt des Trainingsbots. Welche App der Server fragt, steht in `FITTRACK_URL`. Ohne die Variable ist es `https://fittrack-k7gg.onrender.com`; der Free-Tier schläft ein, der erste Aufruf kann bis zu einer Minute dauern. Für die lokale App: `FITTRACK_URL=http://localhost:8000`.

### Einmalig vorbereiten

Das Paket `mcp` gehört nicht zur App und nicht ins Docker-Image, deshalb hat es eine eigene Datei:

```bash
uv pip install --python .venv/bin/python -r mcp/requirements.txt
```

Der Server lässt sich ohne Client prüfen. Er wartet dann auf Eingaben; `Ctrl+C` beendet ihn:

```bash
.venv/bin/python mcp/server.py
```

### Claude Desktop

Datei `~/Library/Application Support/Claude/claude_desktop_config.json` anlegen oder ergänzen (Windows: `%APPDATA%\Claude\claude_desktop_config.json`). Pfade absolut eintragen, `/ABSOLUTER/PFAD/FitTrack` durch den Projektordner ersetzen:

```json
{
  "mcpServers": {
    "fittrack": {
      "command": "/ABSOLUTER/PFAD/FitTrack/.venv/bin/python",
      "args": ["/ABSOLUTER/PFAD/FitTrack/mcp/server.py"],
      "env": { "FITTRACK_URL": "https://fittrack-k7gg.onrender.com" }
    }
  }
}
```

Claude Desktop neu starten. Im Chat erscheint das Werkzeugsymbol mit dem Eintrag `fittrack`.

### LM Studio

LM Studio unterstützt MCP ab Version 0.3.17. Im Programm unter `Program → Integrations → Edit mcp.json` denselben Block eintragen; die Datei liegt unter `~/.lmstudio/mcp.json` und hat dasselbe Format wie bei Claude Desktop. Danach im Chat rechts die Integration `fittrack` einschalten. Das Modell muss Werkzeugaufrufe beherrschen; LM Studio zeigt das mit einem Hammer-Symbol am Modell an. Gemma 4 kann es.

### Fragen zum Ausprobieren

- „Wie viele Kilometer bin ich insgesamt gefahren, und welche Sportart ist die häufigste?“ → `kennzahlen`.
- „Wie lief meine letzte Trainingswoche?“ → `heute`, dann `woche` mit der Kalenderwoche der letzten Einheit.
- „Wie viele Kilometer im August 2026, davon wie viel Radfahren?“ → `zeitraum` mit `von=2026-08-01`, `bis=2026-08-31`; die Aufteilung steht in `je_sportart`.
- „Was war mein längster Lauf, und wie viele Wochen in Folge habe ich das Ziel erreicht?“ → `bestwerte` mit `sportart=Laufen`.
- „Zeig mir meine Läufe im August 2026.“ → `einheiten` mit `sportart=Laufen`, `von=2026-08-01`, `bis=2026-08-31`.
- „War der August besser als der Juli?“ → `vergleich` mit beiden Monaten; die Differenz steht fertig in der Antwort.
- „Welche Sportart mache ich am häufigsten?“ → `sportarten`; die Antwort unterscheidet häufigste nach Anzahl und meiste Kilometer.
- „Wie hoch war mein Puls beim letzten Lauf?“ → kein Werkzeug; das Modell antwortet, dass die App keine Herzfrequenz erfasst.

Im aufgeklappten Werkzeugaufruf des Clients steht, was wirklich gefragt und geantwortet wurde. Weicht die Prosa davon ab, hat das Modell ergänzt.

Für die Lehre lohnt der Vergleich: dieselbe Frage einmal in Claude Desktop, einmal in LM Studio mit Gemma 4. Beide rufen dieselben Werkzeuge auf; Unterschiede liegen in der Wahl der Parameter und in der Formulierung, nicht in den Zahlen.

## Weg 2: Trainingsbot in der App

### Voraussetzungen

1. LM Studio läuft, ein Modell ist geladen, der lokale Server ist an: im Programm der Reiter `Developer → Start Server`, oder im Terminal `lms server start`. Der Server antwortet unter `http://localhost:1234/v1`.
2. FitTrack läuft lokal mit `uvicorn` oder aus Docker.

Sonst ist nichts einzustellen. Beim Laden fragt die Seite `GET /api/chat/status`; antwortet LM Studio, erscheint im Kopf der Chat-Knopf und im Seitenfuß die Option „Trainingsbot anzeigen“. Antwortet es nicht, etwa auf Render, bleibt der Knopf weg und im Fuß steht, dass der Bot nur lokal verfügbar ist.

### Umgebungsvariablen

| Variable | Standard | Zweck |
|---|---|---|
| `LMSTUDIO_URL` | `http://localhost:1234/v1` | Adresse der LM-Studio-Schnittstelle |
| `LMSTUDIO_MODELL` | das erste geladene Modell | ein bestimmtes Modell erzwingen, wenn mehrere geladen sind |

Aus dem Docker-Container heißt der Rechner nicht `localhost`; `docker-compose.yml` setzt deshalb `LMSTUDIO_URL=http://host.docker.internal:1234/v1`. Damit LM Studio Anfragen aus dem Container annimmt, in LM Studio unter `Developer → Settings` den Punkt `Serve on Local Network` einschalten.

### Wie die Route arbeitet

`POST /api/chat` bekommt die Frage und den bisherigen Verlauf. Die Route in `backend/app/chat.py`:

1. rechnet mit `statistik.py` Kennzahlen, die letzten zwölf Kalenderwochen mit Kilometern je Sportart und die letzten zehn Einheiten,
2. legt diese Zahlen als Text in den Systemprompt, zusammen mit der Anweisung, nicht selbst zu rechnen und keine Werte zu erfinden,
3. schickt Systemprompt, Verlauf und Frage im OpenAI-Format an LM Studio und gibt die Antwort zurück.

Das Modell bekommt also keine rohen Einheiten zum Addieren. Das ist die Lehre aus „Schön, aber falsch“: Zahlen kommen aus Python, das Modell formuliert. Die Wochensumme der KW 36 im Bot ist deshalb dieselbe wie auf der Wochenkarte.

Zwei Details, die man kennen sollte:

- **Denkende Modelle.** Gemma 4 überlegt vor der Antwort und füllt damit das Token-Budget, der Antworttext bleibt leer. Die Route schickt deshalb `reasoning_effort: "none"` mit. Modelle ohne diese Funktion ignorieren den Parameter.
- **Zeit.** Eine Antwort von Gemma 4 12B dauert auf einem MacBook mit Apple Silicon fünf bis dreißig Sekunden. Solange ist die Eingabe gesperrt und der Bot zeigt „denkt nach“.

### Was der Bot nicht kann

- Fragen zu Einheiten, die älter sind als die letzten zehn, oder zu Wochen vor den letzten zwölf, beantwortet er nur über die Kennzahlen. Wer alles braucht, nimmt Weg 1 mit `einheiten` und `wochen`.
- Der Verlauf lebt im Browser bis zum Neuladen. Nichts wird gespeichert, weder in der App noch in LM Studio.
- Datumsangaben rechnet das Modell gelegentlich selbst um und vertut sich dabei um einen Tag. Die Kilometer stimmen, weil sie aus der App kommen.

### Tests

21 Tests in `backend/tests/test_mcp.py` prüfen die Werkzeuge des MCP-Servers gegen das Fixture, der HTTP-Abruf ist durch die Testdatenbank ersetzt: Zeitraum ohne Grenzen gleich 87,5 km über drei Kalenderwochen, KW 24 mit Nullwerten und Ziel nicht erreicht, Läufe im Juni gleich 26,0 km in 150 Minuten, beste Woche 2026-W25, ungültige Sportart und falsches Datumsformat als Fehlermeldung.

Fünf Tests in `test_api.py` decken den Chat ab, zusätzlich zu den 15 Tests des Bauwegs. LM Studio wird darin durch `monkeypatch` ersetzt, die Tests laufen also ohne Modell:

| Test | Prüft |
|---|---|
| `test_chat_status_ohne_lmstudio` | Status meldet `verfuegbar: false`, wenn kein Modell erreichbar ist |
| `test_chat_status_mit_lmstudio` | Status nennt das geladene Modell |
| `test_chat_ohne_lmstudio_ist_503` | die Route lehnt ohne Modell mit 503 ab |
| `test_chat_antwortet_mit_kontext` | Systemprompt enthält die Fixture-Zahlen, der Verlauf wird in der richtigen Reihenfolge übergeben |
| `test_chat_kontext_enthaelt_wochen_und_sportarten` | der Datenkontext nennt Wochen, Sportarten und die Anzahl der Einheiten |
