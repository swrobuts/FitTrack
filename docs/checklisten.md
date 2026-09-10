# Checklisten

## Definition of Done (pro User Story)

- [ ] Code läuft lokal ohne Fehler
- [ ] Zugehörige Tests vorhanden und grün (`pytest`)
- [ ] Akzeptanzkriterium der Story nachweislich erfüllt (Demo am Handy)
- [ ] Code von mindestens einer Person reviewt (Review-Checkliste unten)
- [ ] Commit mit aussagekräftiger Message und Story-Bezug, z. B. `feat(US-2): Kennzahlen-Endpunkt`

## Review-Checkliste für übernommenen KI-Code (QA-Rolle)

- [ ] Habe ich jede Funktion verstanden? Kann ich sie in einem Satz erklären?
- [ ] Existieren alle Imports wirklich? (Halluzinierte Pakete oder Funktionen?)
- [ ] Sind Randfälle behandelt: leere Liste, `None`, ungültige IDs?
- [ ] Gibt es hartkodierte Werte, die in die Daten oder in die Konfiguration gehören?
- [ ] Bestehen die Tests, und testen die Tests wirklich das Verhalten aus der Story?
- [ ] Ist der Code stilistisch konsistent mit dem Rest (Namen, Struktur, Sprache)?

## Prompt-Regeln

1. Eine Story pro Prompt, nicht „bau mir die ganze App“.
2. Kontext mitliefern: Datenmodell, genutzte Bibliotheken, bestehender Code als Ausschnitt.
3. Randbedingungen nennen: Versionen, verbotene Pakete, Namenskonventionen.
4. Erklärung anfordern: „Erkläre in drei Sätzen deine wichtigsten Entscheidungen.“
5. Fehlermeldungen wörtlich zurückspielen: Traceback kopieren, nicht paraphrasieren.
6. Niemals Unverstandenes committen: Jede Zeile muss jemand in der Gruppe erklären können.

## End-Abnahme (Termin 2, wird abgezeichnet)

- [ ] Alle User Stories aus dem Backlog: erfüllt oder bewusst zurückgestellt (dokumentiert)
- [ ] `pytest` läuft komplett grün
- [ ] App läuft im Docker-Container (`/health` antwortet mit `{"status": "ok"}`)
- [ ] Darstellung auf dem Smartphone geprüft (Breite ≤ 480 px): kein horizontales Scrollen, Karten stapeln sich
- [ ] Diagramm zeigt echte Daten aus der API, nicht hartkodiert
- [ ] README beschreibt Setup, Test-Ausführung, Docker-Start
- [ ] Git-Historie zeigt sinnvolle Commits mit Bezug zu den Stories
