# Prüfung der Lernumgebung vom 14.09.2026

Alle elf Labs und ihre 41 interaktiven Übungen wurden geprüft. Die 75 Python-Tests und 81 JavaScript-Tests bestehen. Davon prüfen 74 JavaScript-Tests die Lernumgebung einschließlich der einzelnen Übungsabläufe; sieben prüfen das Dashboard. Der Stand ist eine Momentaufnahme dieser Prüfung.

## Umfang und Nachweise

| Labs | Übungen | Geprüfter Schwerpunkt |
| --- | ---: | --- |
| 00 | 4 | Setup-Checkliste, Dateibefehle, Rollen, Scrum-Zuordnung |
| 01 | 3 | Arbeitsfolge, Verantwortungen, Git bis zum ersten Commit |
| 02 | 5 | Drei SQL-Abfragen, Datenmodell, Dateien und Zuständigkeiten |
| 03 | 4 | Erwartungswerte, SQL-Kennzahlen, Randfälle und ISO-Wochen |
| 04 | 4 | Frontend-Verständnis, API-Zuordnung, mobile Checkliste |
| 05 | 4 | Testebenen, Akzeptanzkriterien, Nachweise und Review-Checkliste |
| 06 | 4 | Image bauen, Container starten/prüfen/stoppen, Dockerfile, Compose |
| 07 | 3 | Deployment-Verständnis, Werkzeuge, simulierter Git-Push |
| 08 | 4 | Prompts, Fehlerzuordnung, Arbeitsablauf, Review-Checkliste |
| 09 | 3 | Lokale Modelle, Demo-Checkliste und Bewertung der Ergebnisse |
| 10 | 3 | Diagrammaussagen, semantische Zuordnungen und Review-Checkliste |

`tests/lab/exercises.test.cjs` spielt alle Übungen über ihre DOM-Elemente durch: leere und falsche Antworten, richtige Lösungen, Speicherung und erneutes Laden. Die sechs Terminaluebungen laufen zusätzlich in den Varianten PowerShell und CMD; der normale Durchlauf verwendet die macOS-Shell. Interne Links, Übungsplätze, Befehlskarten und die Gesamtzahl werden ebenfalls geprüft.

`tests/lab/regressions.test.cjs` prüft gezielt Fehlbewertungen und Ausfälle. Die Tests verwenden den tatsächlichen Lab-Code, JSDOM und dieselbe sql.js-Version wie die Website. `backend/tests/test_lab_daten.py` vergleicht den vollständigen SQL-Export mit der App-Datenbank und prüft die vier Musterlösungen mit Python-SQLite gegen festgelegte Ergebnisse.

Zusätzlich wurden alle elf Seiten im Chromium-Browser bei 375 px Viewport-Breite geöffnet: kein horizontales Überlaufen, keine JavaScript-Konsolenfehler, sämtliche Übungen und Mermaid-Diagramme geladen. SQL, Quiz, Zuordnung, Terminal und Wiederherstellung einer Checkliste wurden auch über echte Browserbedienelemente ausgeführt.

## Behobene Fehler

- Fehlgeschlagene Terminalbefehle konnten den nächsten Schritt abhaken. Die Bewertung setzt jetzt eine erfolgreiche Ausführung voraus. Die Containerübung verlangt das richtige Image, den Port am benannten Container, Hintergrundbetrieb und das Stoppen dieses Containers.
- `docker build` ignorierte den angegebenen Baukontext, konnte ohne `-t` den Punkt als Imagenamen verwenden und legte doppelte Tags an. Lokal gebaute Images lassen sich nun mit ihrem Tag starten; FitTrack muss vorher gebaut werden. Compose zeigt Status und Logs des jeweiligen Projekts. Git weist Befehle außerhalb des Repository-Ordners zurück. Leere, in Anführungszeichen gesetzte Befehle verursachen keinen JavaScript-Absturz mehr.
- SQL-Prüfungen setzten dieselbe Verbindung zwischen mehreren asynchronen Schritten zurück. Gleichzeitige Prüfungen konnten deshalb korrekte Lösungen ablehnen. Eingabe und Musterlösung verwenden jetzt jeweils eine eigene frische Datenbank. Auch Verbindungsoptionen wie `PRAGMA query_only` können die nächste Prüfung nicht mehr beschädigen. Die freie Konsole behält ihren eigenen Zustand.
- Die SQL-Bewertung prüfte nur die Anzahl der Spalten. Nun werden auch die verlangten Spaltennamen geprüft. Falsche Werte und eine falsche Sortierung werden weiterhin zurückgewiesen.
- Nach einem SQL-Ladefehler blieb der Wiederholungsversuch gesperrt. Der Knopf ist jetzt wieder nutzbar. Ein Datenbank-Reset ersetzt die Verbindung vollständig und entfernt dadurch auch zusätzliche Tabellen und geänderte Verbindungsoptionen.
- Gespeicherte Checklisten zeigten „Erledigt“, aber keine Häkchen. Die Häkchen werden wiederhergestellt; Abwählen macht die Checkliste wieder unvollständig. Ungültige Fortschrittsdaten werden verworfen, fremde Schlüssel nicht mitgezählt. Bei gesperrtem oder vollem Browserspeicher bleibt der Fortschritt während der aktuellen Seite nutzbar. Die Rückmeldung nach dem Löschen bleibt sichtbar.
- Der gespeicherte Shell-Typ war beim ersten Aufbau der Befehlskarten nicht markiert. Aktiver Zustand und `aria-pressed` stimmen jetzt sofort. Bereits vorhandene englische Übungstexte, Erklärungen, Rückmeldungen und Eingabebeschriftungen folgen der Sprachwahl. Die statischen Lehrtexte bleiben deutsch.
- Zwei Erklärungen waren sachlich ungenau: Im kleinen Fixture haben Laufen und Radfahren jeweils 150 Minuten Gesamtdauer; Wandern hat die längste einzelne Einheit. Eine nicht expandierte `${PORT:-8000}` in der Docker-Exec-Form scheitert auch lokal. Die Erläuterung wurde mit der [Dockerfile-Referenz zur Variablenersetzung](https://docs.docker.com/reference/dockerfile/#variable-substitution) abgeglichen.

## Auswirkungen auf die Trainingsdaten

Die Lab-Fehler betreffen Bedienung, Bewertung und Erklärungen. Sie haben keine gespeicherten Trainingsdaten der App verändert. Tabellen und Sicht des Lab-Exports stimmen zeilenweise mit der App-Datenbank überein.

| Musterlösung | Kontrolliertes Ergebnis |
| --- | --- |
| P02-01, fünf jüngste Einheiten | IDs 311, 310, 309, 308, 307 in dieser Reihenfolge |
| P02-02, Kilometer je Sportart | Radfahren 1.992,0; Laufen 1.334,1; Wandern 547,8; Schwimmen 89,1 |
| P02-05, Einheiten 2026 | 104 |
| P03-02, Gesamtdistanz und Anzahl | 3.963,0 km; 311 Einheiten |

Ein zuvor irrtümlich gesetzter Terminal- oder SQL-Haken lässt sich nachträglich nicht sicher erkennen: Gespeichert wird nur die Erledigung, nicht die damalige Eingabe. Bestehende Lernfortschritte werden daher nicht pauschal gelöscht.

## Grenzen

Die Setup-, Smartphone-, Review- und LM-Studio-Checklisten sind Selbstauskünfte. Geprüft wurden ihre Bedienung und Speicherung; die Tests installieren keine Werkzeuge auf Studierendenrechnern, führen keine lokale Modellauswertung aus und ersetzen keine Abnahme an einem echten Smartphone. Die Konsole ist eine begrenzte Simulation. Der Test der Deployment-Übung erstellt keinen neuen Render-Dienst und führt keinen echten Push aus der Simulation aus.

Ausführen: `pytest` sowie nach `npm ci --ignore-scripts` der Befehl `npm test`. Beide Prüfungen laufen auch in GitHub Actions.
