-- FitTrack: Datenbankschema (SQLite)
--
-- Zwei Tabellen und eine Sicht. Die Sportart ist eine eigene Tabelle, damit
-- ihr Name genau einmal gespeichert ist und Tippfehler wie "laufen" oder
-- "Lauffen" gar nicht erst in die Daten kommen. Jede Trainingseinheit
-- verweist per Fremdschlüssel auf ihre Sportart.

PRAGMA foreign_keys = ON;

CREATE TABLE sportart (
    id       INTEGER PRIMARY KEY,
    name     TEXT    NOT NULL UNIQUE,          -- Laufen, Radfahren, Schwimmen, Wandern
    einheit  TEXT    NOT NULL DEFAULT 'km'     -- Einheit der Distanz
);

CREATE TABLE workout (
    id           INTEGER PRIMARY KEY,
    datum        TEXT    NOT NULL CHECK (length(datum) = 10),   -- ISO-Format JJJJ-MM-TT
    sportart_id  INTEGER NOT NULL REFERENCES sportart(id),
    dauer_min    INTEGER NOT NULL CHECK (dauer_min > 0),
    distanz_km   REAL    NOT NULL CHECK (distanz_km >= 0),
    kalorien     INTEGER NOT NULL CHECK (kalorien >= 0)
);

-- Die App fragt fast immer nach Datum. Der Index macht diese Abfragen schnell.
CREATE INDEX idx_workout_datum ON workout (datum);

-- Die Sicht liefert genau die Form, die die API braucht: eine Zeile je
-- Einheit mit dem Namen der Sportart statt der Fremdschlüssel-Nummer.
CREATE VIEW v_workout AS
SELECT w.id,
       w.datum,
       s.name AS sportart,
       w.dauer_min,
       w.distanz_km,
       w.kalorien
FROM   workout  w
JOIN   sportart s ON s.id = w.sportart_id;
