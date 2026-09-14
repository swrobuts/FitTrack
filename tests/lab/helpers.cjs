const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');
const initSqlJs = require('sql.js');

const root = path.resolve(__dirname, '../..');
const site = path.join(root, 'site');
const read = file => fs.readFileSync(path.join(site, file), 'utf8');
const pages = fs.readdirSync(site).filter(f => /^lab-.*\.html$/.test(f)).sort();
const data = id => JSON.parse(read(`data/uebungen/${id}.json`));
const plain = value => JSON.parse(JSON.stringify(value));
const sqlModule = initSqlJs();

async function until(predicate) {
  for (let i = 0; i < 100; i++) {
    if (predicate()) return;
    await new Promise(resolve => setImmediate(resolve));
  }
  throw new Error('Lab did not finish its asynchronous action');
}

async function load(file = pages[0], options = {}) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error));
  const dom = new JSDOM(read(file), {
    url: `https://fittrack.test/${file}${options.lang ? '?lang=' + options.lang : ''}`,
    runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole,
  });
  const { window } = dom;
  for (const [key, value] of Object.entries(options.storage || {})) window.localStorage.setItem(key, value);
  if (options.blockStorage) Object.defineProperty(window, 'localStorage', {
    get() { throw new window.DOMException('Storage blocked', 'SecurityError'); },
  });
  if (options.failWrites) window.Storage.prototype.setItem = () => { throw new window.DOMException('Quota full', 'QuotaExceededError'); };
  window.confirm = () => true;
  window.IntersectionObserver = class { observe() {} disconnect() {} };
  window.fetch = async resource => {
    const pathname = new URL(resource).pathname.slice(1);
    const content = read(pathname);
    return { ok: true, text: async () => content, json: async () => JSON.parse(content) };
  };
  window.initSqlJs = options.initSqlJs || (() => sqlModule);
  const moduleSource = file => read('assets/' + file).replace(/\bexport /g, '');
  window.__terminal = window.eval(`(() => { ${moduleSource('terminal.js')}\nreturn {neueWelt, zuruecksetzen, fuehreAus, prompt, pfadText}; })()`);
  window.__pruefung = window.eval(`(() => { ${moduleSource('pruefung.js')}\nreturn {zustandTrifft, schrittErfuellt}; })()`);
  const source = moduleSource('fittrack.js')
    .replace(/^import .*$/gm, '')
    .replaceAll('import.meta.url', "'https://fittrack.test/assets/fittrack.js'")
    .replace(/if \(document.readyState === 'loading'\)[\s\S]*$/, '');
  const runtime = window.eval(`(() => {
    const {neueWelt, zuruecksetzen: weltZuruecksetzen, fuehreAus, prompt, pfadText} = window.__terminal;
    const {zustandTrifft, schrittErfuellt} = window.__pruefung;
    ${source}
    return {LABS, initSprache, initOs, initTitel, initSeitennavigation, initKopierbloecke,
      starteLab, karteFortschritt, baueTerminal, holeDb, setzeSprache, setzeOs};
  })()`);
  runtime.initSprache(); runtime.initOs(); runtime.initTitel();
  runtime.initSeitennavigation(); runtime.initKopierbloecke();
  if (window.document.body.dataset.lab) await runtime.starteLab(window.document.body.dataset.lab);
  else runtime.karteFortschritt();
  if (window.document.querySelector('.db-status')) await until(() => !window.document.querySelector('.db-status.busy'));
  return {
    window, document: window.document, runtime, terminal: window.__terminal, errors,
    dispose: () => dom.window.close(),
    storage: () => Object.fromEntries(Object.keys(window.localStorage).map(k => [k, window.localStorage.getItem(k)])),
  };
}

function command(lab, box, text) {
  const input = box.querySelector('.terminal-eingabe input');
  input.value = text;
  input.dispatchEvent(new lab.window.KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
  input.dispatchEvent(new lab.window.KeyboardEvent('keyup', {key: 'Enter', bubbles: true}));
}

async function checkSql(box, sql) {
  box.querySelector('textarea').value = sql;
  const button = box.querySelector('button.primary');
  button.click();
  await until(() => !button.disabled);
}

module.exports = {load, read, root, site, pages, data, plain, sqlModule, until, command, checkSql};
