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
