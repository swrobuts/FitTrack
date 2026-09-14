// Ohne zusätzliche Pakete: node --test frontend/tests/*.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function ladeApp(zusaetze = {}) {
  const elemente = new Map();
  const element = (id) => {
    if (!elemente.has(id)) elemente.set(id, {
      textContent: '', innerHTML: '', style: {}, dataset: {},
      classList: { add() {}, remove() {}, toggle() {} },
      addEventListener() {}, setAttribute() {}, appendChild() {}, showModal() {},
    });
    return elemente.get(id);
  };
  const kontext = vm.createContext({
    document: { getElementById: element, querySelector: element, querySelectorAll: () => [] },
    ...zusaetze,
  });
  const code = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  vm.runInContext(code.replace(/\nstart\(\);\s*$/, ''), kontext);
  return { run: (code) => vm.runInContext(code, kontext), element };
}

test('Tempo rundet mit Minutenübertrag und zeigt keine Division durch null', () => {
  const { run } = ladeApp();
  assert.equal(run('tempo({sportart:"Laufen",dauer_min:299,distanz_km:49.9})'), '6:00 min/km');
  assert.equal(run('tempo({sportart:"Laufen",dauer_min:30,distanz_km:0})'), '–');
});

test('Monate verwenden Trainingstage, erhalten leere Monate und Jahresgrenzen', () => {
  const { run } = ladeApp();
  const monate = JSON.parse(run(`JSON.stringify(nachMonaten([
    {datum:'2026-09-01',sportart:'Laufen',distanz_km:8,anzahl:1,dauer_min:40,wochenstart:'2026-08-31',je_sportart:{Laufen:8}},
    {datum:'2026-08-31',sportart:'Radfahren',distanz_km:20,anzahl:1,dauer_min:60,wochenstart:'2026-08-31',je_sportart:{Radfahren:20}},
    {datum:'2026-12-31',sportart:'Laufen',distanz_km:5,anzahl:1,dauer_min:30,wochenstart:'2026-12-28',je_sportart:{Laufen:5}},
    {datum:'2027-01-01',sportart:'Laufen',distanz_km:6,anzahl:1,dauer_min:35,wochenstart:'2026-12-28',je_sportart:{Laufen:6}}
  ]))`));
  assert.deepEqual(monate.map(m => m.distanz_km), [20, 8, 0, 0, 5, 6]);
  assert.equal(monate[0].wochenstart, '2026-08-01');
  assert.equal(monate[0].wochenende, '2026-08-31');
  assert.equal(monate[1].wochenende, '2026-09-30');
  assert.deepEqual(monate[1].je_sportart, { Laufen: 8 });
  assert.equal(monate[1].anzahl, 1);
  assert.equal(monate[1].dauer_min, 40);
});

test('Kennzahl-Details zeigen bei leerem Datenbestand einen Hinweis', () => {
  const { run, element } = ladeApp();
  run('sheetKennzahl("gesamt")');
  assert.match(element('sheet-inhalt').innerHTML, /keine Trainingseinheiten/i);
});

test('Einheiten-Balken bleiben auch bei mehr Radfahrten als Läufen innerhalb ihrer Skala', () => {
  const { run, element } = ladeApp();
  run(`alleStats = {anzahl: 3}; alleWochen = [{}];
    alleWorkouts = [
      {sportart:'Radfahren',datum:'2026-06-03',distanz_km:20},
      {sportart:'Radfahren',datum:'2026-06-02',distanz_km:20},
      {sportart:'Laufen',datum:'2026-06-01',distanz_km:5}
    ]; sheetKennzahl('anzahl');`);
  const breiten = [...element('sheet-inhalt').innerHTML.matchAll(/width:([\d.]+)%/g)].map(m => Number(m[1]));
  assert.equal(Math.max(...breiten), 100);
  assert.ok(breiten.every(b => b >= 0 && b <= 100));
});

test('Null Kilometer ergeben in Details weder Infinity noch NaN', () => {
  const { run, element } = ladeApp();
  run(`sheetAktivitaet({sportart:'Laufen',datum:'2026-06-01',distanz_km:0,dauer_min:30,kalorien:100})`);
  assert.doesNotMatch(element('sheet-inhalt').innerHTML, /Infinity|NaN|∞/);
  assert.doesNotMatch(run('htmlSportBalken({Laufen:0})'), /NaN|Infinity/);
});

test('Jahresansicht hat zwölf Kalendermonate und die Wochen-Zielmarke bleibt im Diagramm', () => {
  class Chart {
    static defaults = { font: {} };
    constructor(element, config) { Object.assign(this, config); }
    update() {}
  }
  const { run, element } = ladeApp({ Chart });
  run(`farbeAusCss = () => '#000'; schriftAusCss = () => 'sans-serif';
    alleWorkouts = [
      {datum:'2025-08-31',sportart:'Laufen',distanz_km:7,dauer_min:40},
      {datum:'2026-09-01',sportart:'Laufen',distanz_km:8,dauer_min:40}
    ]; zeigeDiagramm([], 52);`);
  assert.equal(run('aktuelleBalken.length'), 12);
  assert.equal(run('aktuelleBalken[0].wochenstart'), '2025-10-01');
  assert.equal(run('aktuelleBalken[11].distanz_km'), 8);
  assert.equal(element('verlauf-legende').hidden, true);
  run(`zeigeDiagramm([{kw:'2026-W36',wochenstart:'2026-08-31',distanz_km:8,anzahl:1}], 8)`);
  assert.equal(element('verlauf-legende').hidden, false);
  assert.equal(run('wochenChart.options.scales.y.suggestedMax'), 40);
});

test('Start lädt alle Datensätze vor dem Freischalten von Detailansichten', async () => {
  let liefereWorkouts;
  const workouts = new Promise(resolve => { liefereWorkouts = resolve; });
  const gerendert = [];
  const { run } = ladeApp({
    fetch: async (url) => ({ ok: true, json: () => url === '/api/workouts' ? workouts : [] }),
    melde: (art) => gerendert.push(art),
  });
  run(`verbindeThemaWechsel = verbindeBot = ladeBotStatus = verbindeSheet = () => {};
    zeigeWoche = zeigeDiagramm = verbindeZeitraumWahl = zeigeKennzahlen = zeigeZeitraum =
    zeigeKalender = zeigeSportarten = zeigeAktivitaeten = () => melde(alleWorkouts.length);`);
  const start = run('start()');
  await Promise.resolve();
  assert.deepEqual(gerendert, []);
  liefereWorkouts([{ datum: '2026-09-01' }]);
  await start;
  assert.equal(gerendert.length, 8);
  assert.ok(gerendert.every(anzahl => anzahl === 1));
});
