"""Kennzahlen aus einer Liste von Trainingseinheiten berechnen.

Bewusst ohne FastAPI: Diese Funktionen bekommen eine Liste von Dictionaries
und geben ein Dictionary zurück. So lassen sie sich einzeln testen und
in der Python-Konsole ausprobieren.
"""

from collections import defaultdict
from datetime import date, timedelta


def montag_der_woche(datum_text: str) -> date:
    """Gibt den Montag der Kalenderwoche zurück, in der das Datum liegt."""
    tag = date.fromisoformat(datum_text)
    return tag - timedelta(days=tag.weekday())


def anzahl_kalenderwochen(workouts: list[dict]) -> int:
    """Zählt die Kalenderwochen von der ersten bis zur letzten Trainingswoche, beide inklusive."""
    montage = [montag_der_woche(w["datum"]) for w in workouts]
    erste, letzte = min(montage), max(montage)
    return (letzte - erste).days // 7 + 1


def lieblingssportart(workouts: list[dict]) -> str:
    """Sportart mit der größten Gesamtdistanz. Bei Gleichstand die alphabetisch erste."""
    summe_je_sportart = defaultdict(float)
    for w in workouts:
        summe_je_sportart[w["sportart"]] += w["distanz_km"]
    # Sortieren nach: größte Summe zuerst, dann Name alphabetisch
    rangliste = sorted(summe_je_sportart.items(), key=lambda paar: (-paar[1], paar[0]))
    return rangliste[0][0]


def berechne_stats(workouts: list[dict]) -> dict:
    """Berechnet die vier Kennzahlen für /api/stats."""
    if not workouts:
        return {
            "gesamt_km": 0.0,
            "durchschnitt_km_pro_woche": 0.0,
            "lieblingssportart": None,
            "anzahl": 0,
        }
    gesamt_km = sum(w["distanz_km"] for w in workouts)
    wochen = anzahl_kalenderwochen(workouts)
    return {
        "gesamt_km": round(gesamt_km, 1),
        "durchschnitt_km_pro_woche": round(gesamt_km / wochen, 1),
        "lieblingssportart": lieblingssportart(workouts),
        "anzahl": len(workouts),
    }


def berechne_wochen(workouts: list[dict]) -> list[dict]:
    """Summiert Distanz, Anzahl und Dauer je Kalenderwoche.

    Wochen ohne Training zwischen der ersten und der letzten Trainingswoche
    erscheinen mit Nullwerten, damit Lücken im Diagramm sichtbar bleiben.
    """
    if not workouts:
        return []

    # Schritt 1: je Montag aufsummieren
    summen = defaultdict(lambda: {"distanz_km": 0.0, "anzahl": 0, "dauer_min": 0,
                                  "je_sportart": defaultdict(float)})
    for w in workouts:
        montag = montag_der_woche(w["datum"])
        summen[montag]["distanz_km"] += w["distanz_km"]
        summen[montag]["anzahl"] += 1
        summen[montag]["dauer_min"] += w["dauer_min"]
        summen[montag]["je_sportart"][w["sportart"]] += w["distanz_km"]

    # Schritt 2: alle Montage von der ersten bis zur letzten Woche durchlaufen
    wochen = []
    montag = min(summen)
    letzter_montag = max(summen)
    while montag <= letzter_montag:
        jahr, kalenderwoche, _ = montag.isocalendar()
        werte = summen[montag]   # liefert Nullwerte, wenn die Woche fehlt
        wochen.append({
            "kw": f"{jahr}-W{kalenderwoche:02d}",
            "wochenstart": montag.isoformat(),
            "distanz_km": round(werte["distanz_km"], 1),
            "anzahl": werte["anzahl"],
            "dauer_min": werte["dauer_min"],
            # Kilometer je Sportart, damit das Diagramm die Balken stapeln kann
            "je_sportart": {name: round(km, 1) for name, km in sorted(werte["je_sportart"].items())},
        })
        montag += timedelta(days=7)
    return wochen


# --- Erweiterungen für den MCP-Server: Zeiträume, einzelne Wochen, Bestwerte -----------

WOCHENZIEL_KM = 40                    # dieselbe Zahl wie im Frontend (app.js)
SPORTARTEN = ["Laufen", "Radfahren", "Schwimmen", "Wandern"]


def pruefe_datum(text: str, name: str) -> str:
    """Prüft ein Datum im Format JJJJ-MM-TT und gibt es unverändert zurück."""
    try:
        return date.fromisoformat(text).isoformat()
    except (TypeError, ValueError):
        raise ValueError(f"{name} muss ein Datum im Format JJJJ-MM-TT sein, nicht {text!r}")


def pruefe_sportart(name: str | None) -> str | None:
    """Gibt die Sportart in der Schreibweise der App zurück; None heißt alle Sportarten."""
    if name is None or name == "":
        return None
    for sportart in SPORTARTEN:
        if sportart.lower() == name.strip().lower():
            return sportart
    raise ValueError(f"Unbekannte Sportart {name!r}. Gültig sind: {', '.join(SPORTARTEN)}")


def kalenderwoche_text(datum_text: str) -> str:
    """Kalenderwoche eines Datums nach ISO 8601, z. B. 2026-W36."""
    jahr, woche, _ = date.fromisoformat(datum_text).isocalendar()
    return f"{jahr}-W{woche:02d}"


def wochenbereich(kw_oder_datum: str) -> tuple[str, str]:
    """Montag und Sonntag einer Kalenderwoche; nimmt 2026-W36 oder ein Datum in der Woche."""
    text = kw_oder_datum.strip().upper()
    try:
        if "-W" in text:
            jahr, woche = text.split("-W")
            montag = date.fromisocalendar(int(jahr), int(woche), 1)
        else:
            montag = montag_der_woche(text)
    except ValueError:
        raise ValueError(f"Kalenderwoche als JJJJ-Wnn oder Datum als JJJJ-MM-TT angeben, nicht {kw_oder_datum!r}")
    return montag.isoformat(), (montag + timedelta(days=6)).isoformat()


def datenzeitraum(workouts: list[dict]) -> dict:
    """Erste und letzte Einheit und die Zahl der Kalenderwochen dazwischen, beide einschließlich."""
    if not workouts:
        return {"von": None, "bis": None, "kalenderwochen": 0}
    daten = [w["datum"] for w in workouts]
    return {"von": min(daten), "bis": max(daten), "kalenderwochen": anzahl_kalenderwochen(workouts)}


def kilometer_je_sportart(workouts: list[dict]) -> dict:
    """Summe der Kilometer je Sportart, größte zuerst, gerundet auf eine Nachkommastelle."""
    summen = defaultdict(float)
    for w in workouts:
        summen[w["sportart"]] += w["distanz_km"]
    return {name: round(km, 1) for name, km in sorted(summen.items(), key=lambda paar: (-paar[1], paar[0]))}


def im_zeitraum(workouts: list[dict], von: str | None, bis: str | None, sportart: str | None) -> list[dict]:
    """Filtert Einheiten nach Datum (beide Grenzen einschließlich) und Sportart."""
    return [w for w in workouts
            if (von is None or w["datum"] >= von)
            and (bis is None or w["datum"] <= bis)
            and (sportart is None or w["sportart"] == sportart)]


def zeitraum_zusammenfassung(workouts: list[dict], von: str | None = None, bis: str | None = None,
                             sportart: str | None = None) -> dict:
    """Summen und Durchschnitte für einen Zeitraum; ohne Grenzen gilt der gesamte Datenbestand."""
    gesamt = datenzeitraum(workouts)
    von = pruefe_datum(von, "von") if von else gesamt["von"]
    bis = pruefe_datum(bis, "bis") if bis else gesamt["bis"]
    if von and bis and von > bis:
        raise ValueError(f"von ({von}) liegt nach bis ({bis})")
    sportart = pruefe_sportart(sportart)
    treffer = im_zeitraum(workouts, von, bis, sportart)
    distanz = round(sum(w["distanz_km"] for w in treffer), 1)
    wochen = anzahl_kalenderwochen(treffer) if treffer else 0
    return {
        "von": von, "bis": bis, "sportart": sportart or "alle",
        "distanz_km": distanz,
        "anzahl": len(treffer),
        "dauer_min": sum(w["dauer_min"] for w in treffer),
        "kalorien": sum(w["kalorien"] for w in treffer),
        "je_sportart": kilometer_je_sportart(treffer),
        "durchschnitt_km_pro_einheit": round(distanz / len(treffer), 1) if treffer else 0.0,
        "kalenderwochen": wochen,
        "durchschnitt_km_pro_woche": round(distanz / wochen, 1) if wochen else 0.0,
        "wochenziel_km": WOCHENZIEL_KM,
        "wochen_mit_ziel": sum(1 for w in berechne_wochen(treffer) if w["distanz_km"] >= WOCHENZIEL_KM),
    }


def woche_details(workouts: list[dict], kw_oder_datum: str) -> dict:
    """Eine Kalenderwoche mit Summen, Kilometern je Sportart, Zielstatus und ihren Einheiten."""
    von, bis = wochenbereich(kw_oder_datum)
    treffer = im_zeitraum(workouts, von, bis, None)
    distanz = round(sum(w["distanz_km"] for w in treffer), 1)
    ergebnis = {
        "kalenderwoche": kalenderwoche_text(von), "von": von, "bis": bis,
        "distanz_km": distanz,
        "anzahl": len(treffer),
        "dauer_min": sum(w["dauer_min"] for w in treffer),
        "je_sportart": kilometer_je_sportart(treffer),
        "wochenziel_km": WOCHENZIEL_KM,
        "ziel_erreicht": distanz >= WOCHENZIEL_KM,
        "einheiten": treffer,
    }
    gesamt = datenzeitraum(workouts)
    if gesamt["von"] and (bis < gesamt["von"] or von > gesamt["bis"]):
        ergebnis["hinweis"] = f"Die Woche liegt außerhalb der Daten ({gesamt['von']} bis {gesamt['bis']})."
    return ergebnis


def zielserien(wochen: list[dict]) -> tuple[int, int]:
    """Längste und aktuelle Folge von Kalenderwochen, die das Wochenziel erreichen."""
    laengste = aktuelle = 0
    for woche in wochen:
        aktuelle = aktuelle + 1 if woche["distanz_km"] >= WOCHENZIEL_KM else 0
        laengste = max(laengste, aktuelle)
    return laengste, aktuelle


def bestwerte(workouts: list[dict], sportart: str | None = None) -> dict:
    """Längste Einheit nach Kilometern und Minuten, beste Woche und Zielserien, wahlweise je Sportart."""
    sportart = pruefe_sportart(sportart)
    treffer = im_zeitraum(workouts, None, None, sportart)
    if not treffer:
        return {"sportart": sportart or "alle", "hinweis": "keine Einheiten"}
    wochen = berechne_wochen(workouts)          # Serien immer über alle Sportarten, wie das Wochenziel
    if sportart:
        beste = max(wochen, key=lambda w: (w["je_sportart"].get(sportart, 0.0), w["kw"]))
        beste_woche = {"kw": beste["kw"], "distanz_km": beste["je_sportart"].get(sportart, 0.0)}
    else:
        beste = max(wochen, key=lambda w: (w["distanz_km"], w["kw"]))
        beste_woche = {"kw": beste["kw"], "distanz_km": beste["distanz_km"]}
    laengste, aktuelle = zielserien(wochen)
    return {
        "sportart": sportart or "alle",
        "laengste_einheit_km": mit_tempo(max(treffer, key=lambda w: (w["distanz_km"], w["datum"]))),
        "laengste_einheit_min": mit_tempo(max(treffer, key=lambda w: (w["dauer_min"], w["datum"]))),
        # Tempo über alle Sportarten ist immer Radfahren; aussagekräftig nur mit sportart
        "schnellste_einheit": mit_tempo(max(treffer, key=lambda w: (w["distanz_km"] / w["dauer_min"], w["datum"]))),
        "meiste_kalorien": mit_tempo(max(treffer, key=lambda w: (w["kalorien"], w["datum"]))),
        "beste_woche": beste_woche,
        "wochenziel_km": WOCHENZIEL_KM,
        "laengste_zielserie_wochen": laengste,
        "aktuelle_zielserie_wochen": aktuelle,
    }


# --- Ausbau: Tempo, Sportarten, Monate, Vergleich, Pausen, Wochentage ------------------

FELDER = ["datum", "sportart", "dauer_min", "distanz_km", "kalorien"]
NICHT_ENTHALTEN = ["Herzfrequenz", "Uhrzeit", "Strecke oder GPS", "Höhenmeter", "Gewicht", "Schlaf", "Gefühl oder Notizen"]
WOCHENTAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]


def mit_tempo(w: dict) -> dict:
    """Kopie einer Einheit mit Tempo in min/km, als Text mm:ss und in km/h."""
    e = dict(w)
    if w["distanz_km"] > 0:
        minuten = w["dauer_min"] / w["distanz_km"]
        e["tempo_min_pro_km"] = round(minuten, 2)
        e["tempo_text"] = f"{int(minuten)}:{round((minuten - int(minuten)) * 60):02d} min/km"
        e["km_pro_h"] = round(w["distanz_km"] / (w["dauer_min"] / 60), 1)
    return e


def datenumfang(workouts: list[dict]) -> dict:
    """Welche Felder und Sportarten es gibt, und welche Daten die App nicht erfasst."""
    return {
        "felder": FELDER,
        "sportarten": SPORTARTEN,
        "anzahl": len(workouts),
        "zeitraum": datenzeitraum(workouts),
        "nicht_enthalten": NICHT_ENTHALTEN,
    }


def sportarten_uebersicht(workouts: list[dict], von: str | None = None, bis: str | None = None) -> dict:
    """Je Sportart Anzahl, Kilometer, Dauer, Kalorien, Anteil und letzte Einheit; ohne Grenzen der ganze Bestand."""
    gesamt = datenzeitraum(workouts)
    von = pruefe_datum(von, "von") if von else gesamt["von"]
    bis = pruefe_datum(bis, "bis") if bis else gesamt["bis"]
    treffer = im_zeitraum(workouts, von, bis, None)
    gesamt_km = sum(w["distanz_km"] for w in treffer)
    liste = []
    for sportart in SPORTARTEN:
        eigene = [w for w in treffer if w["sportart"] == sportart]
        if not eigene:
            continue
        km = sum(w["distanz_km"] for w in eigene)
        liste.append({
            "sportart": sportart,
            "anzahl": len(eigene),
            "distanz_km": round(km, 1),
            "dauer_min": sum(w["dauer_min"] for w in eigene),
            "kalorien": sum(w["kalorien"] for w in eigene),
            "anteil_km_prozent": round(100 * km / gesamt_km, 1) if gesamt_km else 0.0,
            "anteil_anzahl_prozent": round(100 * len(eigene) / len(treffer), 1),
            "durchschnitt_km_pro_einheit": round(km / len(eigene), 1),
            "letzte_einheit": max(w["datum"] for w in eigene),
        })
    liste.sort(key=lambda s: (-s["distanz_km"], s["sportart"]))
    return {
        "von": von, "bis": bis,
        "sportarten": liste,
        "haeufigste_nach_anzahl": max(liste, key=lambda s: (s["anzahl"], s["distanz_km"]))["sportart"] if liste else None,
        "meiste_kilometer": liste[0]["sportart"] if liste else None,
    }


def letzter_tag_im_monat(jahr: int, monat: int) -> date:
    """Der letzte Kalendertag eines Monats."""
    erster_naechster = date(jahr + (monat == 12), monat % 12 + 1, 1)
    return erster_naechster - timedelta(days=1)


def nach_monaten(workouts: list[dict]) -> list[dict]:
    """Summen je Kalendermonat vom ersten bis zum letzten Monat, Monate ohne Training mit Nullwerten."""
    if not workouts:
        return []
    erster = date.fromisoformat(min(w["datum"] for w in workouts)).replace(day=1)
    letzter = date.fromisoformat(max(w["datum"] for w in workouts)).replace(day=1)
    monate = []
    aktuell = erster
    while aktuell <= letzter:
        von, bis = aktuell.isoformat(), letzter_tag_im_monat(aktuell.year, aktuell.month).isoformat()
        treffer = im_zeitraum(workouts, von, bis, None)
        monate.append({
            "monat": aktuell.strftime("%Y-%m"), "von": von, "bis": bis,
            "distanz_km": round(sum(w["distanz_km"] for w in treffer), 1),
            "anzahl": len(treffer),
            "dauer_min": sum(w["dauer_min"] for w in treffer),
            "kalorien": sum(w["kalorien"] for w in treffer),
            "je_sportart": kilometer_je_sportart(treffer),
        })
        aktuell = date(aktuell.year + (aktuell.month == 12), aktuell.month % 12 + 1, 1)
    return monate


def vergleich(workouts: list[dict], von_a: str, bis_a: str, von_b: str, bis_b: str, sportart: str | None = None) -> dict:
    """Zwei Zeiträume nebeneinander, dazu die Differenz b minus a in Kilometern, Anzahl, Minuten, Kalorien und Prozent."""
    a = zeitraum_zusammenfassung(workouts, von_a, bis_a, sportart)
    b = zeitraum_zusammenfassung(workouts, von_b, bis_b, sportart)
    return {
        "a": a, "b": b,
        "differenz": {
            "distanz_km": round(b["distanz_km"] - a["distanz_km"], 1),
            "anzahl": b["anzahl"] - a["anzahl"],
            "dauer_min": b["dauer_min"] - a["dauer_min"],
            "kalorien": b["kalorien"] - a["kalorien"],
            "distanz_prozent": round(100 * (b["distanz_km"] - a["distanz_km"]) / a["distanz_km"], 1) if a["distanz_km"] else None,
        },
    }


def pausen(workouts: list[dict], heute_datum: str) -> dict:
    """Längste Pause zwischen zwei Trainingstagen, Wochen ohne Training und die Tage seit der letzten Einheit."""
    if not workouts:
        return {"hinweis": "keine Einheiten"}
    tage = sorted({w["datum"] for w in workouts})
    laengste = {"tage": 0, "von": None, "bis": None}
    for vorher, nachher in zip(tage, tage[1:]):
        luecke = (date.fromisoformat(nachher) - date.fromisoformat(vorher)).days - 1
        if luecke > laengste["tage"]:
            laengste = {"tage": luecke,
                        "von": (date.fromisoformat(vorher) + timedelta(days=1)).isoformat(),
                        "bis": (date.fromisoformat(nachher) - timedelta(days=1)).isoformat()}
    return {
        "laengste_pause": laengste,
        "wochen_ohne_training": [w["kw"] for w in berechne_wochen(workouts) if w["anzahl"] == 0],
        "letzte_einheit": tage[-1],
        "tage_seit_letzter_einheit": (date.fromisoformat(heute_datum) - date.fromisoformat(tage[-1])).days,
        "trainingstage": len(tage),
    }


def nach_wochentagen(workouts: list[dict], von: str | None = None, bis: str | None = None) -> dict:
    """Anzahl und Kilometer je Wochentag Montag bis Sonntag, mit Anteilen; ohne Grenzen der ganze Bestand."""
    gesamt = datenzeitraum(workouts)
    von = pruefe_datum(von, "von") if von else gesamt["von"]
    bis = pruefe_datum(bis, "bis") if bis else gesamt["bis"]
    treffer = im_zeitraum(workouts, von, bis, None)
    liste = []
    for index, name in enumerate(WOCHENTAGE):
        eigene = [w for w in treffer if date.fromisoformat(w["datum"]).weekday() == index]
        liste.append({
            "wochentag": name,
            "anzahl": len(eigene),
            "distanz_km": round(sum(w["distanz_km"] for w in eigene), 1),
            "anteil_anzahl_prozent": round(100 * len(eigene) / len(treffer), 1) if treffer else 0.0,
        })
    haeufigster = max(liste, key=lambda t: (t["anzahl"], t["distanz_km"])) if treffer else None
    return {"von": von, "bis": bis, "wochentage": liste, "haeufigster_tag": haeufigster["wochentag"] if haeufigster else None}
