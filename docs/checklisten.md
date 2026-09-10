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

## Semantik-Review: Schön, aber falsch (vor jeder Abnahme einer Oberfläche)

Ein Vorschlag, der gut aussieht, ist noch nicht richtig. Der Erstentwurf des FitTrack-Dashboards bestand alle Tests und zeigte trotzdem einen geschlossenen Ring mit „161 %“ für eine Woche, die längst vorbei war. Erst die Kritik eines Menschen machte aus dem Erstentwurf den Zweitentwurf: KI allein liefert einen brauchbaren Schritt, KI mit Kritik ein gutes Ergebnis. Die Tests prüfen die API, nicht die Aussage der Oberfläche. Deshalb geht diese Liste vor jeder Abnahme einmal über jedes sichtbare Element.

- [ ] **Bedeutung:** Kann ich zu jeder Zahl sagen, was sie zeigt, in welcher Einheit und für welchen Zeitraum? Steht das auch dran?
- [ ] **Nachrechnen:** Kann ich die Zahl aus den Rohdaten (Datenbank, API-Antwort) selbst herleiten? Stichprobe machen.
- [ ] **Zustände:** Was bedeutet das Element bei 0 %, bei 100 %, bei mehr als 100 %? Was zeigt es, wenn es „voll“ ist? Ist die Aussage dann noch wahr?
- [ ] **Form passt zur Aussage:** Ein Kreis zeigt Anteile an einem Ganzen. Ein Ziel braucht eine Marke am Balken (Bullet-Graph), damit Verfehlen und Übertreffen sichtbar bleiben. Verläufe als ein Balken je Zeitabschnitt; keine Stapel auf 375 px.
- [ ] **Zeitbezug:** Ist der Zeitraum abgeschlossen oder laufend? Ein Fortschrittsbalken für eine vergangene Woche ist ein Ergebnis, kein Fortschritt.
- [ ] **Achsen und Legende:** Hat jede Achse Titel und Einheit? Ist jede Farbe erklärt? Weiß ich, welcher Balken welche Woche ist?
- [ ] **Gleiche Wörter, gleiche Bedeutung:** Kommt ein Begriff zweimal vor („Einheiten“), meint er beide Male dasselbe? Sonst Bezug ergänzen.
- [ ] **Abkürzungen:** Versteht jemand ohne Einweisung „8 W“, „Sc“, „Ø“? Ausschreiben oder erklären.
- [ ] **Extremfälle:** Sieht die Ansicht mit 0, 1 und 105 Datenpunkten noch sinnvoll aus? „Alles“ ausprobieren.
- [ ] **Bedienbarkeit:** Schrift mindestens 13 px, Bedienelemente 44 px, Tastatur (Tab, Fokusring), Screenreader (`aria-pressed`, sprechende `aria-label`), Kontrast, helles und dunkles Thema.
- [ ] **Touch:** Jedes Objekt ist antippbar und öffnet dann seine Details im Klartext, etwa in einem Sheet (Balken, Kalenderfeld, Kennzahl, Kachel, Einheit). Kein Tooltip, der nur mit der Maus erscheint. Hell und dunkel per Knopf, nicht nur per Systemeinstellung.
- [ ] **Zehn-Sekunden-Test:** Die Ansicht jemandem zehn Sekunden zeigen und erklären lassen. Was falsch erklärt wird, ist falsch dargestellt.

Eine Story gilt erst als abgenommen, wenn jeder Punkt entweder erfüllt ist oder bewusst zurückgestellt wurde.

## Prompt-Regeln

1. Eine Story pro Prompt, nicht „bau mir die ganze App“.
2. Kontext mitliefern: Datenmodell, genutzte Bibliotheken, bestehender Code als Ausschnitt.
3. Randbedingungen nennen: Versionen, verbotene Pakete, Namenskonventionen.
4. Erklärung anfordern: „Erkläre in drei Sätzen deine wichtigsten Entscheidungen.“
5. Fehlermeldungen wörtlich zurückspielen: Traceback kopieren, nicht paraphrasieren.
6. Niemals Unverstandenes committen: Jede Zeile muss jemand in der Gruppe erklären können.
7. Bei Oberflächen zuerst die Bedeutung festlegen, dann Code anfordern: Für jedes Element Aussage, Einheit, Zeitbezug, Zustände und die passende Form in einer Tabelle bestätigen lassen (Vorlage im Prompt-Skript, Schritt 6b).
8. Jeden Vorschlag vom Modell selbst prüfen lassen: „Nenne jede Stelle, an der die Darstellung mehr behauptet als die Daten hergeben.“ Das ersetzt die eigene Prüfung nicht, findet aber die offensichtlichen Fälle.

## End-Abnahme (Termin 2, wird abgezeichnet)

- [ ] Alle User Stories aus dem Backlog: erfüllt oder bewusst zurückgestellt (dokumentiert)
- [ ] `pytest` läuft komplett grün
- [ ] App läuft im Docker-Container (`/health` antwortet mit `{"status": "ok"}`)
- [ ] Darstellung auf dem Smartphone geprüft (Breite ≤ 480 px): kein horizontales Scrollen, Karten stapeln sich
- [ ] Diagramm zeigt echte Daten aus der API, nicht hartkodiert
- [ ] Semantik-Review (oben) über das ganze Dashboard, mit Nachrechnen einer Zahl
- [ ] README beschreibt Setup, Test-Ausführung, Docker-Start
- [ ] Git-Historie zeigt sinnvolle Commits mit Bezug zu den Stories
