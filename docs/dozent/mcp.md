# Mit FitTrack sprechen: MCP-Server und Trainingsbot

Zwei Wege, die Trainingsdaten in ein Chatfenster zu holen. Beide brauchen keine Änderung an der App auf Render.

| Weg | Wo läuft der Chat | Wer rechnet | Wofür |
|---|---|---|---|
| **MCP-Server** (`mcp/server.py`) | Claude Desktop oder LM Studio, auf Ihrem Rechner | die App: der Client ruft Werkzeuge auf, die die API abfragen | Fragen an die Daten stellen, Werkzeugaufrufe beobachten, Cloud gegen lokal vergleichen |
| **Trainingsbot** in der App | die FitTrack-Seite selbst, nur lokal | die App rechnet vorab, LM Studio formuliert | Chat über Training und die eigenen Zahlen, ohne Konto und ohne dass Daten den Rechner verlassen |

Der MCP-Server ist die Brücke, mit der ein fremdes Chatfenster an die Daten kommt. Der Trainingsbot sitzt in der App, deshalb braucht er diese Brücke nicht: Seine Route ruft dieselben Python-Funktionen auf wie die übrigen Endpunkte.

## Weg 1: MCP-Server

### Was er tut

`mcp/server.py` spricht über stdin/stdout mit dem Chat-Client, das ist der Standard des Model Context Protocol. Er bietet vier Werkzeuge an, jedes ruft eine Route der App auf:

| Werkzeug | Route | Parameter |
|---|---|---|
| `gesundheit` | `GET /health` | keine |
| `kennzahlen` | `GET /api/stats` | keine |
| `wochen` | `GET /api/stats/wochen` | `anzahl` (Standard 12, 0 für alle) |
| `einheiten` | `GET /api/workouts` | `sportart`, `von`, `bis`, `anzahl` (Standard 20) |

Welche App er fragt, steht in `FITTRACK_URL`. Ohne die Variable ist es `https://fittrack-k7gg.onrender.com`. Der Free-Tier auf Render schläft ein; der erste Aufruf kann bis zu einer Minute dauern, das Zeitlimit ist entsprechend gesetzt. Für die lokale App: `FITTRACK_URL=http://localhost:8000`.

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

- „Wie viele Kilometer bin ich insgesamt gefahren, und welche Sportart ist die häufigste?“ → ein Aufruf von `kennzahlen`.
- „Wie liefen die letzten vier Wochen, und in welchen habe ich das Wochenziel von 40 km erreicht?“ → `wochen` mit `anzahl=4`, das Modell vergleicht mit 40.
- „Zeig mir meine Läufe im August 2026.“ → `einheiten` mit `sportart=Laufen`, `von=2026-08-01`, `bis=2026-08-31`.

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

Fünf Tests in `test_api.py` decken den Chat ab, zusätzlich zu den 15 Tests des Bauwegs. LM Studio wird darin durch `monkeypatch` ersetzt, die Tests laufen also ohne Modell:

| Test | Prüft |
|---|---|
| `test_chat_status_ohne_lmstudio` | Status meldet `verfuegbar: false`, wenn kein Modell erreichbar ist |
| `test_chat_status_mit_lmstudio` | Status nennt das geladene Modell |
| `test_chat_ohne_lmstudio_ist_503` | die Route lehnt ohne Modell mit 503 ab |
| `test_chat_antwortet_mit_kontext` | Systemprompt enthält die Fixture-Zahlen, der Verlauf wird in der richtigen Reihenfolge übergeben |
| `test_chat_kontext_enthaelt_wochen_und_sportarten` | der Datenkontext nennt Wochen, Sportarten und die Anzahl der Einheiten |
