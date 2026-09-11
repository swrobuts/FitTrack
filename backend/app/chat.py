"""Chat über die eigenen Trainingsdaten mit einem lokalen Sprachmodell.

Das Modell kommt aus LM Studio, das auf demselben Rechner läuft und unter
LMSTUDIO_URL eine Schnittstelle im OpenAI-Format anbietet. Die App schickt
ihm keine rohen Daten zum Nachrechnen, sondern fertige Zahlen: Kennzahlen,
Wochen und Summen je Sportart rechnet statistik.py, das Modell formuliert nur.

Ohne erreichbares LM Studio, etwa auf Render, meldet status() "nicht
verfügbar" und das Frontend blendet den Chat aus.
"""

import json
import os
import re
from datetime import date

import httpx2

from . import werkzeuge
from .statistik import berechne_stats, berechne_wochen

STANDARD_URL = "http://localhost:1234/v1"
WOCHEN_IM_KONTEXT = 12
EINHEITEN_IM_KONTEXT = 10
VERLAUF_MAX = 10
MAX_RUNDEN = 5          # so oft darf das Modell Werkzeuge verlangen, bevor die Antwort erzwungen wird

ROLLE = {"nutzer": "user", "bot": "assistant"}   # Namen der App -> Namen der Schnittstelle

ANWEISUNG = """Du bist der Trainingsassistent der App FitTrack und sprichst mit der Person, deren Trainingsdaten unten stehen.
Antworte auf Deutsch, kurz und in ganzen Sätzen, ohne Aufzählungszeichen, wenn es nicht um eine Liste geht.
Alle Zahlen berechnet die App. Rechne nicht selbst nach und erfinde keine Werte.
Für alles, was unten nicht steht, rufst du ein Werkzeug auf: Summen über Zeiträume mit zeitraum, einzelne Wochen mit woche, Vergleiche mit vergleich, Bestwerte, Pausen, Wochentage, einzelne Einheiten. Bei relativen Zeitangaben zuerst heute.
Wochen sind ISO-Kalenderwochen von Montag bis Sonntag (JJJJ-Wnn), Daten im Format JJJJ-MM-TT, Grenzen einschließlich. Übernimm Zeiträume aus den Antworten, ergänze keine Daten.
Allgemeine Fragen zu Training, Regeneration und Ernährung beantwortest du mit gängigem Wissen.
Bei Beschwerden oder gesundheitlichen Fragen empfiehlst du ärztlichen Rat.
Die Daten enthalten nur Datum, Sportart, Dauer, Kilometer und Kalorien. Fragen nach Herzfrequenz, Uhrzeit, Strecke, Gewicht oder Schlaf beantwortest du damit, dass die App das nicht erfasst. Liefert kein Werkzeug die gefragte Zahl, sage das offen."""


def lmstudio_url() -> str:
    """Adresse der LM-Studio-Schnittstelle, ohne Schrägstrich am Ende."""
    return os.environ.get("LMSTUDIO_URL", STANDARD_URL).rstrip("/")


def lmstudio_modelle() -> list[str]:
    """Namen der in LM Studio geladenen Modelle; leer, wenn LM Studio nicht antwortet."""
    try:
        antwort = httpx2.get(f"{lmstudio_url()}/models", timeout=2.0)
        antwort.raise_for_status()
        return [eintrag["id"] for eintrag in antwort.json().get("data", [])]
    except (httpx2.ConnectError, httpx2.TimeoutException, httpx2.HTTPStatusError, ValueError, KeyError):
        return []


def aktives_modell() -> str | None:
    """Das Modell für den Chat: LMSTUDIO_MODELL, wenn gesetzt und geladen, sonst das erste geladene."""
    modelle = lmstudio_modelle()
    if not modelle:
        return None
    gewuenscht = os.environ.get("LMSTUDIO_MODELL")
    return gewuenscht if gewuenscht in modelle else modelle[0]


def status() -> dict:
    """Für /api/chat/status: ob ein Modell erreichbar ist und welches."""
    modell = aktives_modell()
    return {"verfuegbar": modell is not None, "modell": modell}


def baue_kontext(workouts: list[dict]) -> str:
    """Fasst die Trainingsdaten als Text zusammen, den das Modell als Wissen bekommt."""
    if not workouts:
        return "Es liegen noch keine Trainingseinheiten vor."
    stats = berechne_stats(workouts)
    wochen = berechne_wochen(workouts)
    je_sportart: dict[str, float] = {}
    for w in workouts:
        je_sportart[w["sportart"]] = je_sportart.get(w["sportart"], 0.0) + w["distanz_km"]

    zeilen = [
        f"Heute ist der {date.today().isoformat()}.",
        f"Zeitraum der Daten: {workouts[-1]['datum']} bis {workouts[0]['datum']}.",
        "",
        "Kennzahlen über alle Einheiten:",
        f"- Kilometer gesamt: {stats['gesamt_km']}",
        f"- Einheiten: {stats['anzahl']}",
        f"- Durchschnitt je Kalenderwoche: {stats['durchschnitt_km_pro_woche']} km",
        f"- Lieblingssportart nach Kilometern: {stats['lieblingssportart']}",
        "- Kilometer je Sportart: " + ", ".join(
            f"{name}: {km:.1f} km" for name, km in sorted(je_sportart.items(), key=lambda paar: -paar[1])),
        "",
        f"Die letzten {WOCHEN_IM_KONTEXT} Kalenderwochen (Wochenziel 40 km):",
    ]
    for woche in wochen[-WOCHEN_IM_KONTEXT:]:
        sport = ", ".join(f"{name} {km} km" for name, km in woche["je_sportart"].items()) or "kein Training"
        zeilen.append(f"- {woche['kw']} ab {woche['wochenstart']}: {woche['distanz_km']} km in "
                      f"{woche['anzahl']} Einheiten, {woche['dauer_min']} min ({sport})")
    zeilen.append("")
    zeilen.append(f"Die letzten {EINHEITEN_IM_KONTEXT} Einheiten, jüngste zuerst:")
    for w in workouts[:EINHEITEN_IM_KONTEXT]:
        zeilen.append(f"- {w['datum']} {w['sportart']}: {w['distanz_km']} km, {w['dauer_min']} min, {w['kalorien']} kcal")
    return "\n".join(zeilen)


def baue_nachrichten(workouts: list[dict], verlauf: list[dict], frage: str) -> list[dict]:
    """Setzt Anweisung, Datenkontext, bisherigen Verlauf und die neue Frage zusammen."""
    nachrichten = [{"role": "system", "content": ANWEISUNG + "\n\n" + baue_kontext(workouts)}]
    for eintrag in verlauf[-VERLAUF_MAX:]:
        nachrichten.append({"role": ROLLE[eintrag["rolle"]], "content": eintrag["text"]})
    nachrichten.append({"role": "user", "content": frage})
    return nachrichten


def frage_lmstudio(nachrichten: list[dict], modell: str, werkzeuge_schema: list[dict] | None = None) -> dict:
    """Schickt die Nachrichten an LM Studio und gibt die Antwortnachricht zurück (Text oder Werkzeugaufrufe)."""
    anfrage = {
        "model": modell,
        "messages": nachrichten,
        "temperature": 0.3,
        "max_tokens": 800,
        # Denkende Modelle wie Gemma 4 füllen sonst das Budget mit Überlegungen und liefern keinen Text
        "reasoning_effort": "none",
    }
    if werkzeuge_schema:
        anfrage["tools"] = werkzeuge_schema
    antwort = httpx2.post(
        f"{lmstudio_url()}/chat/completions",
        json=anfrage,
        timeout=180.0,   # ein lokales Modell braucht auf dem Notebook auch mal eine Minute
    )
    antwort.raise_for_status()
    nachricht = antwort.json()["choices"][0]["message"]
    if not nachricht.get("content") and not nachricht.get("tool_calls"):
        raise ValueError("leere Antwort, vermutlich hat das Modell nur nachgedacht")
    return nachricht


def bereinige(text: str) -> str:
    """Entfernt Marken des Denkkanals, die Gemma 4 nach Werkzeugaufrufen vor die Antwort setzt."""
    text = re.sub(r"<\|channel>.*?<channel\|>", "", text, flags=re.DOTALL)   # <|channel>thought ... <channel|>
    text = re.sub(r"<\|?channel\|?>", "", text)                              # Reste einzelner Marken
    return text.strip()


def chat_mit_werkzeugen(workouts: list[dict], verlauf: list[dict], frage: str, modell: str) -> tuple[str, list[dict]]:
    """Fragt das Modell, führt verlangte Werkzeuge aus und fragt erneut, bis eine Textantwort kommt."""
    nachrichten = baue_nachrichten(workouts, verlauf, frage)
    aufrufe = []
    for _ in range(MAX_RUNDEN):
        nachricht = frage_lmstudio(nachrichten, modell, werkzeuge.katalog())
        if not nachricht.get("tool_calls"):
            return bereinige(nachricht.get("content") or ""), aufrufe
        nachrichten.append({"role": "assistant", "content": nachricht.get("content"), "tool_calls": nachricht["tool_calls"]})
        for aufruf in nachricht["tool_calls"]:
            name = aufruf["function"]["name"]
            try:
                argumente = json.loads(aufruf["function"].get("arguments") or "{}")
            except json.JSONDecodeError:
                argumente = {}
            ergebnis = werkzeuge.fuehre_aus(name, argumente, workouts)
            aufrufe.append({"werkzeug": name, "argumente": argumente})
            nachrichten.append({"role": "tool", "tool_call_id": aufruf["id"], "content": json.dumps(ergebnis, ensure_ascii=False)})
    return ("Ich habe die Werkzeuge mehrfach befragt, aber keine Antwort formulieren können. "
            "Bitte die Frage enger stellen, etwa mit einem Zeitraum."), aufrufe
