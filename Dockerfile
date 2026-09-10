# FitTrack – ein Container für Backend und Frontend
#
# Bauen:    docker build -t fittrack .
# Starten:  docker run -p 8000:8000 fittrack
# Prüfen:   http://localhost:8000/health

# 1. Basis-Image: schlankes Linux mit Python 3.12
FROM python:3.12-slim

# 2. Arbeitsverzeichnis im Container
WORKDIR /app

# 3. Erst die Abhängigkeiten installieren. Diese Schicht wird nur neu gebaut,
#    wenn sich requirements.txt ändert, was den Build deutlich beschleunigt.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. Dann den Code kopieren (was nicht mitkommen soll, steht in .dockerignore)
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# 5. Port dokumentieren und Server starten.
#    ${PORT:-8000} bedeutet: nimm die Umgebungsvariable PORT, sonst 8000.
#    Render.com setzt PORT selbst, lokal gilt 8000.
EXPOSE 8000
CMD ["sh", "-c", "uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
