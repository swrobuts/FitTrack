-- Testdaten für FitTrack: 8 Trainingseinheiten in KW 23 bis KW 25 (2026), KW 24 leer.
-- Das Schema kommt aus backend/app/data/schema.sql, diese Datei füllt nur die Tabellen.
-- Die Werte sind so gewählt, dass sich alle Kennzahlen von Hand nachrechnen lassen:
--   gesamt_km = 87.5, 3 Kalenderwochen, durchschnitt 29.2, Lieblingssportart Radfahren (50.0)

INSERT INTO sportart (id, name) VALUES
    (1, 'Laufen'),
    (2, 'Radfahren'),
    (3, 'Schwimmen'),
    (4, 'Wandern');

INSERT INTO workout (id, datum, sportart_id, dauer_min, distanz_km, kalorien) VALUES
    (1, '2026-06-01', 1,  30,  5.0, 350),   -- Mo, KW 23, Laufen
    (2, '2026-06-03', 2,  60, 20.0, 500),   -- Mi, KW 23, Radfahren
    (3, '2026-06-05', 1,  45,  8.0, 560),   -- Fr, KW 23, Laufen
    (4, '2026-06-06', 3,  40,  1.5, 400),   -- Sa, KW 23, Schwimmen
    (5, '2026-06-15', 2,  90, 30.0, 750),   -- Mo, KW 25, Radfahren
    (6, '2026-06-17', 1,  50,  9.0, 630),   -- Mi, KW 25, Laufen
    (7, '2026-06-19', 4, 120, 10.0, 600),   -- Fr, KW 25, Wandern
    (8, '2026-06-21', 1,  25,  4.0, 280);   -- So, KW 25, Laufen
