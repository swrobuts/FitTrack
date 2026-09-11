"""MCP-Server für FitTrack: macht die Trainingsdaten als Werkzeuge für Claude Desktop und LM Studio verfügbar.

Start übernimmt der Chat-Client (siehe docs/dozent/mcp.md):
    .venv/bin/python mcp/server.py

Der Server holt die Einheiten per HTTP von der App (FITTRACK_URL, ohne Angabe
die Adresse auf Render) und rechnet mit denselben Funktionen wie die App
selbst: statistik.py aus dem Backend. Das Modell bekommt fertige Zahlen und
muss nichts addieren, zählen oder umrechnen.
"""

import functools
import os
import sys
from datetime import date
from pathlib import Path

import httpx2
from mcp.server.mcpserver import MCPServer
from mcp.server.mcpserver.exceptions import ToolError

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))   # Projektordner, damit backend importierbar ist
from backend.app import statistik  # noqa: E402

STANDARD_URL = "https://fittrack-k7gg.onrender.com"
ZEITLIMIT = 60.0   # Render im Free-Tier schläft ein und braucht bis zu einer Minute zum Aufwachen

ANWEISUNG = """Trainingsdaten der App FitTrack: Einheiten (Laufen, Radfahren, Schwimmen, Wandern) mit Datum, Dauer, Kilometern, Kalorien.
Regeln für die Werkzeuge:
- Alle Zahlen berechnet die App. Nie selbst addieren, zählen oder mitteln; für Summen über einen Zeitraum zeitraum() aufrufen.
- Bei relativen Zeitangaben (letzte Woche, dieser Monat, zuletzt) zuerst heute() aufrufen; die Daten enden nicht zwingend heute.
- Wochen sind ISO-Kalenderwochen von Montag bis Sonntag, Schreibweise JJJJ-Wnn, z. B. 2026-W36. Daten im Format JJJJ-MM-TT, beide Grenzen einschließlich.
- Jede Antwort nennt ihren Zeitraum (von, bis). Diese Angaben übernehmen, keine Daten ergänzen oder umrechnen.
- Fehlermeldungen der Werkzeuge wörtlich weitergeben, keine Werte erfinden."""

server = MCPServer("fittrack", instructions=ANWEISUNG)


def app_url() -> str:
    """Adresse der App, ohne Schrägstrich am Ende."""
    return os.environ.get("FITTRACK_URL", STANDARD_URL).rstrip("/")


def hole(pfad: str):
    """Ruft eine Route der App auf und gibt die JSON-Antwort zurück."""
    antwort = httpx2.get(f"{app_url()}{pfad}", timeout=ZEITLIMIT)
    antwort.raise_for_status()
    return antwort.json()


def klare_fehler(fn):
    """Reicht Prüffehler als Text an das Modell durch; ohne das sieht es nur "Error executing tool"."""
    @functools.wraps(fn)
    def umhuellt(*args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except ValueError as fehler:
            raise ToolError(str(fehler)) from fehler
    return umhuellt


def hole_workouts() -> list[dict]:
    """Alle Einheiten der App, jüngste zuerst. Die Tests ersetzen diese Funktion durch das Fixture."""
    return hole("/api/workouts")


@server.tool()
def gesundheit() -> dict:
    """Prüft, ob die FitTrack-App erreichbar ist, und nennt ihre Adresse. Beim ersten Aufruf kann Render bis zu einer Minute brauchen."""
    return {"app": app_url(), **hole("/health")}


@server.tool()
def heute() -> dict:
    """Heutiges Datum, aktuelle Kalenderwoche und der Stand der Daten (erste und letzte Einheit).

    Zuerst aufrufen, wenn eine Frage relative Zeitangaben enthält (letzte Woche, dieser Monat, zuletzt):
    Die Daten können vor heute enden, dann ist die letzte Trainingswoche nicht die aktuelle Kalenderwoche.
    """
    workouts = hole_workouts()
    zeitraum = statistik.datenzeitraum(workouts)
    heute_datum = date.today().isoformat()
    return {
        "heute": heute_datum,
        "aktuelle_kalenderwoche": statistik.kalenderwoche_text(heute_datum),
        "erste_einheit": zeitraum["von"],
        "letzte_einheit": zeitraum["bis"],
        "kalenderwoche_der_letzten_einheit": statistik.kalenderwoche_text(zeitraum["bis"]) if zeitraum["bis"] else None,
        "kalenderwochen_gesamt": zeitraum["kalenderwochen"],
    }


@server.tool()
def kennzahlen() -> dict:
    """Kennzahlen über den gesamten Datenbestand, erste bis letzte Einheit einschließlich.

    gesamt_km: Summe aller Kilometer. durchschnitt_km_pro_woche: gesamt_km geteilt durch alle Kalenderwochen
    von der ersten bis zur letzten Einheit, auch Wochen ohne Training. lieblingssportart: die Sportart mit den
    meisten Kilometern (nicht den meisten Einheiten). anzahl: Zahl der Einheiten. zeitraum: von, bis, Kalenderwochen.
    """
    workouts = hole_workouts()
    return {**statistik.berechne_stats(workouts), "zeitraum": statistik.datenzeitraum(workouts)}


@server.tool()
@klare_fehler
def woche(kalenderwoche: str) -> dict:
    """Genau eine Kalenderwoche: Summen, Kilometer je Sportart, ob das Wochenziel von 40 km erreicht wurde, und die Einheiten.

    kalenderwoche: ISO-Woche als JJJJ-Wnn (z. B. 2026-W36) oder ein beliebiges Datum in der Woche als JJJJ-MM-TT.
    Die Antwort nennt Montag (von) und Sonntag (bis). Eine Woche ohne Training liefert Nullwerte, keine Fehlermeldung;
    liegt die Woche außerhalb der Daten, steht das im Feld hinweis.
    """
    return statistik.woche_details(hole_workouts(), kalenderwoche)


@server.tool()
@klare_fehler
def wochen(anzahl: int = 12, von_kw: str | None = None, bis_kw: str | None = None) -> list[dict]:
    """Kalenderwochen als Liste, älteste zuerst, je Woche Kilometer, Anzahl, Minuten und Kilometer je Sportart.

    Wochen ohne Training stehen mit Nullwerten in der Liste. Entweder anzahl (die letzten n Wochen, 0 = alle seit der
    ersten Einheit) oder ein Bereich von_kw bis bis_kw als JJJJ-Wnn, beide einschließlich. Für die Summe über mehrere
    Wochen zeitraum() verwenden, nicht selbst addieren.
    """
    alle = statistik.berechne_wochen(hole_workouts())
    if von_kw or bis_kw:
        von = statistik.wochenbereich(von_kw)[0] if von_kw else "0000-00-00"
        bis = statistik.wochenbereich(bis_kw)[0] if bis_kw else "9999-99-99"
        return [w for w in alle if von <= w["wochenstart"] <= bis]
    return alle[-anzahl:] if anzahl > 0 else alle


@server.tool()
@klare_fehler
def zeitraum(von: str | None = None, bis: str | None = None, sportart: str | None = None) -> dict:
    """Summen und Durchschnitte für einen Zeitraum, wahlweise für eine Sportart. Das Werkzeug für jede Frage nach Kilometern in einem Monat, Quartal, Jahr oder frei gewählten Tagen.

    von, bis: Datum als JJJJ-MM-TT, beide Tage einschließlich. Ohne Angabe gilt der gesamte Datenbestand von der ersten
    bis zur letzten Einheit; die Antwort nennt die tatsächlich verwendeten Grenzen. Ein Monat ist z. B. von=2026-08-01,
    bis=2026-08-31. sportart: Laufen, Radfahren, Schwimmen oder Wandern; leer für alle.
    Ergebnis: distanz_km, anzahl, dauer_min, kalorien, je_sportart, durchschnitt_km_pro_einheit, kalenderwochen im
    Zeitraum und durchschnitt_km_pro_woche. Ungültige Eingaben liefern eine Fehlermeldung mit den gültigen Werten.
    """
    return statistik.zeitraum_zusammenfassung(hole_workouts(), von, bis, sportart)


@server.tool()
@klare_fehler
def bestwerte(sportart: str | None = None) -> dict:
    """Bestwerte über den gesamten Datenbestand: längste Einheit nach Kilometern und nach Minuten, beste Kalenderwoche, längste und aktuelle Serie von Wochen mit erreichtem Wochenziel (40 km).

    sportart: Laufen, Radfahren, Schwimmen oder Wandern schränkt Einheiten und beste Woche auf diese Sportart ein;
    die Zielserien gelten immer über alle Sportarten, weil das Wochenziel so definiert ist.
    """
    return statistik.bestwerte(hole_workouts(), sportart)


@server.tool()
@klare_fehler
def einheiten(sportart: str | None = None, von: str | None = None, bis: str | None = None, anzahl: int = 20) -> dict:
    """Einzelne Trainingseinheiten, jüngste zuerst, mit Datum, Sportart, Dauer, Kilometern und Kalorien.

    sportart: Laufen, Radfahren, Schwimmen oder Wandern; leer für alle. von, bis: JJJJ-MM-TT, beide einschließlich.
    anzahl: höchstens so viele Einheiten in der Liste, 0 für alle. treffer und distanz_km beziehen sich auf alle
    passenden Einheiten, auch die nicht gezeigten; für weitere Summen zeitraum() verwenden.
    """
    sportart = statistik.pruefe_sportart(sportart)
    von = statistik.pruefe_datum(von, "von") if von else None
    bis = statistik.pruefe_datum(bis, "bis") if bis else None
    treffer = statistik.im_zeitraum(hole_workouts(), von, bis, sportart)
    return {
        "treffer": len(treffer),
        "distanz_km": round(sum(w["distanz_km"] for w in treffer), 1),
        "einheiten": treffer[:anzahl] if anzahl > 0 else treffer,
    }


if __name__ == "__main__":
    server.run()
