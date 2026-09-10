# Deploy auf Render.com

Render baut das Dockerfile aus dem GitHub-Repo und stellt die App unter einer öffentlichen HTTPS-Adresse bereit. Das ersetzt für die Kickoff-Demo den Handy-Test im WLAN: Die Studierenden öffnen einfach die URL.

## Stand

Eingerichtet am 10.09.2026. URL: <https://fittrack-k7gg.onrender.com>, Blueprint „fittrack“, Service-ID `srv-daha5ku1egvs73d7r500`, Region Oregon, Free-Plan. Jeder Push auf `main` baut neu.

## Einmalige Einrichtung (ca. 10 Minuten)

1. Auf <https://render.com> anmelden, am einfachsten mit dem GitHub-Konto.
2. `New` → `Blueprint`.
3. Das Repo `swrobuts/FitTrack` verbinden. Dafür muss das GitHub-Konto einmal mit Render verbunden werden (GitHub → Connect account).
4. Render liest `render.yaml` und zeigt den Service `fittrack` an. `Apply` klicken.
5. Der erste Build dauert 2 bis 4 Minuten. Danach steht die URL im Dashboard, etwa `https://fittrack-xxxx.onrender.com`.
6. Prüfen: `https://<URL>/health` liefert `{"status": "ok"}`.

## Was dabei passiert

- Render klont das Repo, führt `docker build` aus und startet den Container.
- Render setzt die Umgebungsvariable `PORT`. Deshalb steht in der Dockerfile-CMD `${PORT:-8000}` statt einer festen Zahl.
- `healthCheckPath: /health` sorgt dafür, dass Render nur dann Verkehr weiterleitet, wenn die App antwortet. Das ist der Grund für US-3.
- `autoDeploy: true`: Jeder Push auf `main` baut neu. Für den Kurs bedeutet das: Die Referenzlösung ist immer aktuell.

## Hinweise für die Veranstaltung

- Free-Plan: Der Service schläft nach 15 Minuten ohne Zugriff ein. Der erste Aufruf dauert dann bis zu einer Minute. Vor der Demo einmal die URL aufrufen.
- Die URL auf eine Folie oder an die Tafel. Studierende testen auf dem eigenen Handy, ohne WLAN-Konfiguration.
- Wenn die Gruppen ihre eigene App deployen wollen: gleicher Ablauf mit ihrem Repo. Free-Plan reicht.

## Deploy in Termin 2 zeigen (Schritt 8 im Prompt-Skript)

Nach dem Docker-Schritt: `render.yaml` ins Repo, committen, pushen, im Render-Dashboard den Build beobachten. Die Botschaft: Was lokal im Container läuft, läuft identisch bei Render, ohne eine Zeile zu ändern.
