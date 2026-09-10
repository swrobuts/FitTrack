# Setup: WebStorm für FitTrack

WebStorm ist eigentlich eine JavaScript-IDE. Mit dem Python-Plugin von JetBrains bearbeitet sie auch den FastAPI-Teil. Wer PyCharm hat, kann alle Schritte dort identisch ausführen.

## 1. Installation prüfen (vor dem ersten Termin)

| Werkzeug | Test im Terminal | Erwartung |
|---|---|---|
| Python 3.12 | `python3 --version` | `Python 3.12.x` |
| Git | `git --version` | eine Versionsnummer |
| Docker Desktop | `docker run hello-world` | Text „Hello from Docker!“ |
| WebStorm | App öffnen | Startbildschirm |

Git einmalig konfigurieren:

```bash
git config --global user.name "Vorname Nachname"
git config --global user.email "mail@example.com"
```

## 2. Python-Plugin in WebStorm

1. WebStorm öffnen, `Settings` (macOS: `⌘,`, Windows: `Ctrl+Alt+S`).
2. `Plugins` → `Marketplace` → nach „Python“ suchen → das Plugin von JetBrains installieren.
3. WebStorm neu starten.

## 3. Projekt öffnen und Interpreter setzen

1. `File → Open…` → den Ordner `FitTrack` wählen.
2. Terminal in WebStorm öffnen (`View → Tool Windows → Terminal`) und ausführen:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

3. `Settings → Languages & Frameworks → Python → Python Interpreter` → `Add Interpreter → Existing` → `.venv/bin/python` im Projektordner wählen.

Danach zeigt WebStorm rote Unterstreichungen bei Importfehlern und bietet Autovervollständigung für FastAPI.

## 4. Tests laufen lassen

Im Terminal:

```bash
pytest
```

Oder in WebStorm: Rechtsklick auf `backend/tests/test_api.py` → `Run 'pytest in test_api.py'`. Danach erscheint oben rechts eine Run-Konfiguration, die sich mit dem grünen Pfeil wiederholen lässt.

## 5. App starten

Im Terminal:

```bash
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

`--reload` startet den Server automatisch neu, sobald eine Datei gespeichert wird. Im Browser: <http://localhost:8000>. API-Dokumentation: <http://localhost:8000/docs>.

## 6. Code aus dem Chat übernehmen

1. Im Chat auf „Kopieren“ am Codeblock klicken.
2. In WebStorm die Zieldatei öffnen oder anlegen (Rechtsklick auf Ordner → `New → File`).
3. Einfügen, dann `⌘⌥L` (Windows: `Ctrl+Alt+L`) für automatische Formatierung.
4. Speichern. Tests laufen lassen. Erst dann committen.

## 7. Committen in WebStorm

`Git → Commit…` (oder `⌘K` / `Ctrl+K`). Geänderte Dateien anhaken, Commit-Message mit Story-Bezug schreiben, z. B. `feat(US-1): Workouts-Endpunkt`. Dann `Commit and Push`.

## 8. Handy-Test im WLAN

1. IP-Adresse des Rechners herausfinden: macOS `ipconfig getifaddr en0`, Windows `ipconfig`.
2. Server mit `--host 0.0.0.0` starten (siehe oben).
3. Auf dem Smartphone im selben WLAN `http://<IP>:8000` öffnen.

Wenn das Handy nicht zugreifen kann: Firewall des Rechners prüfen, oder Hotspot vom Handy nutzen und den Rechner damit verbinden.

## 9. Docker aus WebStorm heraus (statt Terminal)

Das Docker-Plugin ist in WebStorm enthalten. Damit lassen sich Image bauen und Container starten per Klick. Docker Desktop muss dafür laufen.

### Einmalig: Docker-Verbindung anlegen

Ohne diesen Schritt erscheint beim Klick auf den grünen Pfeil die Meldung `Error running 'docker-compose.yml': Server is not specified`.

1. `Settings → Build, Execution, Deployment → Docker`.
2. Auf `+` klicken, `Docker for Mac` (Windows: `Docker for Windows`) wählen.
3. Unten muss `Connection successful` erscheinen. `OK`.

Falls die Verbindung fehlschlägt: In Docker Desktop unter `Settings → Advanced` den Punkt `Allow the default Docker socket to be used` aktivieren und Docker Desktop neu starten.

### Container starten

- In `docker-compose.yml` steht links neben `services:` ein grüner Doppelpfeil. Ein Klick baut das Image und startet den Container. Beim ersten Mal fragt WebStorm nach dem Docker-Server: die eben angelegte Verbindung wählen.
- Alternativ in der `Dockerfile` neben `FROM` auf den Pfeil klicken → `Run on Docker`. Das baut das Image und startet einen Container ohne Port-Zuordnung. Diese ergänzt man in der Run-Konfiguration unter `Bind ports`: `8000` auf dem Rechner → `8000` im Container.

Unten öffnet sich das Fenster `Services`. Dort stehen Logs, ein Stop-Knopf und unter `Ports` ein Link, der die App im Browser öffnet.

### Port 8000 belegt

In der Run-Konfiguration der `docker-compose.yml` (Bearbeiten über das Dropdown oben rechts → `Edit Configurations…`) unter `Environment variables` den Eintrag `FITTRACK_PORT=8001` setzen. Dann ist die App unter <http://localhost:8001> erreichbar.

### Was Docker Desktop selbst kann

Docker Desktop zeigt unter `Containers` und `Images` alles an, was WebStorm oder das Terminal gebaut haben: starten, stoppen, Logs lesen, Port-Link öffnen. Ein Image aus einem Dockerfile bauen kann Docker Desktop nicht. Dafür braucht es WebStorm oder das Terminal.

Für den Kurs gilt: Die drei Befehle `docker build`, `docker run` und `docker ps` im Terminal sind Lernziel. WebStorm und Docker Desktop sind die Bequemlichkeit obendrauf.
