"""MCP-Server für FitTrack: macht die API der App als Werkzeuge für Claude Desktop und LM Studio verfügbar.

Start (macht der Chat-Client selbst, siehe docs/dozent/mcp.md):
    .venv/bin/python mcp/server.py

Der Server spricht über stdin/stdout mit dem Chat-Client und ruft die vier
Routen der App per HTTP auf. Welche App, steht in FITTRACK_URL; ohne die
Variable ist es die Adresse auf Render. Lokal: http://localhost:8000.
"""

import os

import httpx2
from mcp.server.mcpserver import MCPServer

STANDARD_URL = "https://fittrack-k7gg.onrender.com"
ZEITLIMIT = 60.0   # Render im Free-Tier schläft ein und braucht bis zu einer Minute zum Aufwachen

server = MCPServer(
    "fittrack",
    instructions="Trainingsdaten der App FitTrack: Einheiten, Kennzahlen und Kalenderwochen. "
                 "Alle Zahlen sind von der App berechnet; nicht selbst nachrechnen, sondern die Werkzeuge nutzen.",
)


def app_url() -> str:
    """Adresse der App, ohne Schrägstrich am Ende."""
    return os.environ.get("FITTRACK_URL", STANDARD_URL).rstrip("/")


def hole(pfad: str):
    """Ruft eine Route der App auf und gibt die JSON-Antwort zurück."""
    antwort = httpx2.get(f"{app_url()}{pfad}", timeout=ZEITLIMIT)
    antwort.raise_for_status()
    return antwort.json()


@server.tool()
def gesundheit() -> dict:
    """Prüft, ob die FitTrack-App erreichbar ist, und nennt ihre Adresse."""
    return {"app": app_url(), **hole("/health")}


@server.tool()
def kennzahlen() -> dict:
    """Kennzahlen über alle Einheiten: Kilometer gesamt, Durchschnitt je Kalenderwoche, Lieblingssportart, Anzahl."""
    return hole("/api/stats")


@server.tool()
def wochen(anzahl: int = 12) -> list[dict]:
    """Die letzten Kalenderwochen mit Kilometern, Einheiten, Minuten und Kilometern je Sportart, älteste zuerst.

    anzahl: wie viele Wochen, gezählt vom Ende; 0 liefert alle Wochen seit der ersten Einheit.
    """
    alle = hole("/api/stats/wochen")
    return alle[-anzahl:] if anzahl > 0 else alle


@server.tool()
def einheiten(sportart: str | None = None, von: str | None = None, bis: str | None = None, anzahl: int = 20) -> list[dict]:
    """Trainingseinheiten, jüngste zuerst, mit Datum, Sportart, Dauer, Kilometern und Kalorien.

    sportart: Laufen, Radfahren, Schwimmen oder Wandern; leer für alle.
    von, bis: Datum im Format JJJJ-MM-TT, beide einschließlich; leer für keine Grenze.
    anzahl: höchstens so viele Einheiten; 0 liefert alle passenden.
    """
    alle = hole("/api/workouts")
    treffer = [w for w in alle
               if (sportart is None or w["sportart"].lower() == sportart.lower())
               and (von is None or w["datum"] >= von)
               and (bis is None or w["datum"] <= bis)]
    return treffer[:anzahl] if anzahl > 0 else treffer


if __name__ == "__main__":
    server.run()
