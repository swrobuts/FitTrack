"""Werkzeugkatalog für den Trainingsbot: dieselben Berechnungen wie im MCP-Server, im Format der OpenAI-Schnittstelle.

LM Studio bekommt diese Liste mit jeder Anfrage. Verlangt das Modell einen
Aufruf, führt fuehre_aus() die passende Funktion aus statistik.py aus und
gibt das Ergebnis als Dictionary zurück; Prüffehler werden als {"fehler": ...}
zurückgegeben, damit das Modell die gültigen Werte sieht.

Die Beschreibungen sind bewusst kurz: Ein lokales Modell hat wenig Kontext,
und die Liste wird bei jeder Anfrage mitgeschickt.
"""

from datetime import date

from . import statistik

DATUM = {"type": "string", "description": "Datum JJJJ-MM-TT"}
SPORTART = {"type": "string", "enum": statistik.SPORTARTEN, "description": "eine der vier Sportarten; weglassen für alle"}
ANZAHL = {"type": "integer", "description": "0 für alle"}

# Name, Beschreibung, Parameter (JSON-Schema-Eigenschaften), Pflichtparameter
KATALOG = [
    ("heute", "Heutiges Datum, aktuelle Kalenderwoche, erste und letzte Einheit. Zuerst aufrufen bei relativen Zeitangaben wie letzte Woche oder dieser Monat.", {}, []),
    ("datenumfang", "Welche Felder und Sportarten es gibt und was die App nicht erfasst (Herzfrequenz, Uhrzeit, Strecke, Gewicht, Schlaf).", {}, []),
    ("kennzahlen", "Gesamtbild: Kilometer, Durchschnitt je Kalenderwoche, Lieblingssportart nach Kilometern, Anzahl, Datenzeitraum.", {}, []),
    ("sportarten", "Je Sportart Anzahl, Kilometer, Anteile, Kilometer je Einheit, letzte Einheit; häufigste nach Anzahl und meiste Kilometer.", {"von": DATUM, "bis": DATUM}, []),
    ("woche", "Eine Kalenderwoche (Montag bis Sonntag): Summen, je Sportart, Wochenziel 40 km erreicht, Einheiten.", {"kalenderwoche": {"type": "string", "description": "JJJJ-Wnn wie 2026-W36 oder ein Datum in der Woche"}}, ["kalenderwoche"]),
    ("wochen", "Verlauf nach Kalenderwochen, älteste zuerst, Wochen ohne Training mit Nullwerten.", {"anzahl": {**ANZAHL, "description": "die letzten n Wochen, 0 für alle"}, "von_kw": {"type": "string", "description": "JJJJ-Wnn"}, "bis_kw": {"type": "string", "description": "JJJJ-Wnn"}}, []),
    ("monate", "Verlauf nach Kalendermonaten, ältester zuerst.", {"anzahl": {**ANZAHL, "description": "die letzten n Monate, 0 für alle"}}, []),
    ("zeitraum", "Summen und Durchschnitte für einen Zeitraum, beide Grenzen einschließlich, wahlweise je Sportart; ohne Grenzen der gesamte Bestand. Für jede Frage nach Kilometern in einem Monat, Jahr oder freien Tagen.", {"von": DATUM, "bis": DATUM, "sportart": SPORTART}, []),
    ("vergleich", "Zwei Zeiträume nebeneinander mit Differenz b minus a in Kilometern, Anzahl, Minuten, Kalorien, Prozent.", {"von_a": DATUM, "bis_a": DATUM, "von_b": DATUM, "bis_b": DATUM, "sportart": SPORTART}, ["von_a", "bis_a", "von_b", "bis_b"]),
    ("bestwerte", "Längste Einheit nach km und Minuten, schnellste Einheit, meiste Kalorien, beste Woche, Zielserien. Für schnellster Lauf die Sportart angeben.", {"sportart": SPORTART}, []),
    ("pausen", "Längste Pause ohne Training, Wochen ohne Training, Tage seit der letzten Einheit, Zahl der Trainingstage.", {}, []),
    ("wochentage", "Verteilung auf Montag bis Sonntag mit Anteilen und häufigstem Trainingstag.", {"von": DATUM, "bis": DATUM}, []),
    ("einheiten", "Einzelne Einheiten mit Tempo, jüngste zuerst, dazu Trefferzahl und Summe über alle Treffer. Ein Tag: von gleich bis.", {"sportart": SPORTART, "von": DATUM, "bis": DATUM, "anzahl": {**ANZAHL, "description": "höchstens so viele, Standard 20"}}, []),
]
NAMEN = [name for name, _, _, _ in KATALOG]


def katalog() -> list[dict]:
    """Die Werkzeuge im Format, das die OpenAI-Schnittstelle von LM Studio erwartet."""
    return [{
        "type": "function",
        "function": {
            "name": name,
            "description": beschreibung,
            "parameters": {"type": "object", "properties": parameter, "required": pflicht},
        },
    } for name, beschreibung, parameter, pflicht in KATALOG]


def heute(workouts: list[dict]) -> dict:
    """Wie im MCP-Server: Datum, Kalenderwoche und Datenstand."""
    zeitraum = statistik.datenzeitraum(workouts)
    heute_datum = date.today().isoformat()
    return {
        "heute": heute_datum,
        "aktuelle_kalenderwoche": statistik.kalenderwoche_text(heute_datum),
        "erste_einheit": zeitraum["von"],
        "letzte_einheit": zeitraum["bis"],
        "kalenderwoche_der_letzten_einheit": statistik.kalenderwoche_text(zeitraum["bis"]) if zeitraum["bis"] else None,
    }


def einheiten(workouts: list[dict], sportart=None, von=None, bis=None, anzahl=20) -> dict:
    """Gefilterte Einheiten mit Tempo, Trefferzahl und Summe."""
    sportart = statistik.pruefe_sportart(sportart)
    von = statistik.pruefe_datum(von, "von") if von else None
    bis = statistik.pruefe_datum(bis, "bis") if bis else None
    treffer = statistik.im_zeitraum(workouts, von, bis, sportart)
    return {
        "treffer": len(treffer),
        "distanz_km": round(sum(w["distanz_km"] for w in treffer), 1),
        "einheiten": [statistik.mit_tempo(w) for w in (treffer[:anzahl] if anzahl and anzahl > 0 else treffer)],
    }


def wochen(workouts: list[dict], anzahl=12, von_kw=None, bis_kw=None) -> list[dict]:
    """Verlauf nach Kalenderwochen, wahlweise als Bereich."""
    alle = statistik.berechne_wochen(workouts)
    if von_kw or bis_kw:
        von = statistik.wochenbereich(von_kw)[0] if von_kw else "0000-00-00"
        bis = statistik.wochenbereich(bis_kw)[0] if bis_kw else "9999-99-99"
        return [w for w in alle if von <= w["wochenstart"] <= bis]
    return alle[-anzahl:] if anzahl and anzahl > 0 else alle


def monate(workouts: list[dict], anzahl=12) -> list[dict]:
    """Verlauf nach Kalendermonaten."""
    alle = statistik.nach_monaten(workouts)
    return alle[-anzahl:] if anzahl and anzahl > 0 else alle


FUNKTIONEN = {
    "heute": heute,
    "datenumfang": statistik.datenumfang,
    "kennzahlen": lambda workouts: {**statistik.berechne_stats(workouts), "zeitraum": statistik.datenzeitraum(workouts)},
    "sportarten": statistik.sportarten_uebersicht,
    "woche": lambda workouts, kalenderwoche: statistik.woche_details(workouts, kalenderwoche),
    "wochen": wochen,
    "monate": monate,
    "zeitraum": statistik.zeitraum_zusammenfassung,
    "vergleich": statistik.vergleich,
    "bestwerte": statistik.bestwerte,
    "pausen": lambda workouts: statistik.pausen(workouts, date.today().isoformat()),
    "wochentage": statistik.nach_wochentagen,
    "einheiten": einheiten,
}


def fuehre_aus(name: str, argumente: dict, workouts: list[dict]):
    """Führt ein Werkzeug aus; Fehler kommen als Dictionary zurück, damit das Modell sie lesen kann."""
    funktion = FUNKTIONEN.get(name)
    if funktion is None:
        return {"fehler": f"Unbekanntes Werkzeug {name!r}. Gültig sind: {', '.join(NAMEN)}"}
    try:
        return funktion(workouts, **{k: v for k, v in argumente.items() if v is not None})
    except (ValueError, TypeError) as fehler:
        return {"fehler": str(fehler)}
