# Erwartungswerte für das Fixture

Datei: `backend/tests/fixtures/workouts_klein.json`. Die Studierenden rechnen diese Werte selbst, bevor sie die KI nach Code für `/api/stats` fragen. Diese Seite ist die Lösung für den Dozenten.

## Die 8 Einheiten

| id | Datum | Wochentag | KW | Sportart | Dauer (min) | Distanz (km) | kcal |
|---|---|---|---|---|---|---|---|
| 1 | 01.06.2026 | Mo | 23 | Laufen | 30 | 5,0 | 350 |
| 2 | 03.06.2026 | Mi | 23 | Radfahren | 60 | 20,0 | 500 |
| 3 | 05.06.2026 | Fr | 23 | Laufen | 45 | 8,0 | 560 |
| 4 | 06.06.2026 | Sa | 23 | Schwimmen | 40 | 1,5 | 400 |
| 5 | 15.06.2026 | Mo | 25 | Radfahren | 90 | 30,0 | 750 |
| 6 | 17.06.2026 | Mi | 25 | Laufen | 50 | 9,0 | 630 |
| 7 | 19.06.2026 | Fr | 25 | Wandern | 120 | 10,0 | 600 |
| 8 | 21.06.2026 | So | 25 | Laufen | 25 | 4,0 | 280 |

KW 24 (08.06. bis 14.06.) hat kein Training. Das ist Absicht: So prüfen die Tests, dass Lücken korrekt behandelt werden.

## `/api/stats`

**gesamt_km** = 5,0 + 20,0 + 8,0 + 1,5 + 30,0 + 9,0 + 10,0 + 4,0 = **87,5**

**Kalenderwochen** von KW 23 bis KW 25, beide inklusive = **3**

**durchschnitt_km_pro_woche** = 87,5 / 3 = 29,1666… → gerundet **29,2**

Häufiger Fehler: Nur Wochen mit Training zählen (2) ergibt 43,75. Die Definition im README sagt „von der ersten bis zur letzten Trainingswoche“, also zählt KW 24 mit.

**lieblingssportart**: Summe je Sportart

| Sportart | Rechnung | km |
|---|---|---|
| Radfahren | 20,0 + 30,0 | 50,0 |
| Laufen | 5,0 + 8,0 + 9,0 + 4,0 | 26,0 |
| Wandern | 10,0 | 10,0 |
| Schwimmen | 1,5 | 1,5 |

→ **Radfahren**. Diskussionspunkt: Nach Anzahl der Einheiten wäre es Laufen (4 von 8). Die Story definiert Distanz. Das zeigt, warum Akzeptanzkriterien präzise sein müssen.

**anzahl** = **8**

## `/api/stats/wochen`

| kw | wochenstart | distanz_km | anzahl | dauer_min |
|---|---|---|---|---|
| 2026-W23 | 2026-06-01 | 5,0 + 20,0 + 8,0 + 1,5 = **34,5** | 4 | 30 + 60 + 45 + 40 = **175** |
| 2026-W24 | 2026-06-08 | **0,0** | 0 | **0** |
| 2026-W25 | 2026-06-15 | 30,0 + 9,0 + 10,0 + 4,0 = **53,0** | 4 | 90 + 50 + 120 + 25 = **285** |

## `/api/workouts`

Sortiert nach Datum absteigend: erstes Element hat `id` 8 (21.06.), letztes Element `id` 1 (01.06.).

## Kontrolle mit Python (für den Dozenten)

```bash
cd FitTrack
FITTRACK_DATA=backend/tests/fixtures/workouts_klein.json .venv/bin/python -c "
import sys; sys.path.insert(0, 'backend')
from app.daten import lade_workouts
from app.statistik import berechne_stats, berechne_wochen
print(berechne_stats(lade_workouts()))
for w in berechne_wochen(lade_workouts()): print(w)
"
```
