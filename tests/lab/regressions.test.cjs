const test = require('node:test');
const assert = require('node:assert/strict');
const {load, pages, data, plain, sqlModule, until, command, checkSql} = require('./helpers.cjs');

test('failed terminal commands cannot complete a step', async t => {
  const lab = await load(); t.after(lab.dispose);
  const box = lab.document.getElementById('uebung-P00-02');
  command(lab, box, 'cd FitTrack');
  command(lab, box, 'ls does-not-exist');
  assert.equal(box.querySelectorAll('li.erledigt').length, 1);
  command(lab, box, 'ls');
  command(lab, box, 'cat missing.txt');
  assert.equal(box.querySelectorAll('li.erledigt').length, 2);
});

test('container exercise checks the named container, its port, background mode and stop state', async t => {
  const lab = await load('lab-06-docker.html'); t.after(lab.dispose);
  const box = lab.document.getElementById('uebung-P06-02');
  for (const line of ['cd FitTrack', 'docker build -t fittrack .',
    'docker run -d --name other -p 8000:8000 nginx',
    'docker run -d --name fittrack -p 8001:8000 fittrack']) command(lab, box, line);
  assert.equal(box.querySelectorAll('li.erledigt').length, 0, 'another container cannot supply the port');
  box.querySelector('.terminal-kopf button:last-child').click();
  for (const line of ['cd FitTrack', 'docker build -t fittrack .', 'docker run --name fittrack -p 8000:8000 fittrack']) command(lab, box, line);
  assert.equal(box.querySelectorAll('li.erledigt').length, 0, 'foreground run does not meet background task');
  command(lab, box, 'docker rm -f fittrack');
  command(lab, box, 'docker run -d --name fittrack -p 8000:8000 nginx');
  assert.equal(box.querySelectorAll('li.erledigt').length, 0, 'the container must use the FitTrack image');
  command(lab, box, 'docker rm -f fittrack');
  command(lab, box, 'docker run -d --name fittrack -p 8000:8000 fittrack');
  command(lab, box, 'docker ps');
  command(lab, box, 'docker run -d --name other nginx');
  command(lab, box, 'docker stop other');
  assert.equal(box.querySelectorAll('li.erledigt').length, 2);
  command(lab, box, 'docker stop fittrack');
  assert.equal(box.querySelectorAll('li.erledigt').length, 3);
});

test('all quiz questions, explanations, feedback and labels follow language changes', async t => {
  for (const file of pages) {
    const lab = await load(file); t.after(lab.dispose);
    const definitions = data(file.slice(0, 6));
    for (const u of definitions.uebungen) {
      const box = lab.document.getElementById('uebung-' + u.id);
      if (u.typ === 'quiz') {
        box.querySelectorAll('.frage').forEach((q, i) => q.querySelectorAll('input').forEach((input, j) => { input.checked = u.fragen[i].richtig.includes(j); }));
        box.querySelector('button.primary').click();
      }
    }
    lab.runtime.setzeSprache('en');
    const textOf = html => { const span = lab.document.createElement('span'); span.innerHTML = html; return span.textContent; };
    for (const u of definitions.uebungen) {
      const box = lab.document.getElementById('uebung-' + u.id);
      if (u.typ === 'quiz') {
        box.querySelectorAll('.frage').forEach((q, i) => {
          assert.equal(q.querySelector('p').textContent, textOf(u.fragen[i].frage.en), u.id);
          if (u.fragen[i].erklaerung) assert.equal(q.querySelector('.erklaerung').textContent, textOf(u.fragen[i].erklaerung.en), u.id);
        });
        assert.equal(box.querySelector('.line strong').textContent, 'Correct.');
      }
      if (u.typ === 'zuordnen') box.querySelectorAll('select').forEach((select, i) => assert.equal(select.getAttribute('aria-label'), u.paare[i].begriff.en));
      if (u.typ === 'sql') assert.equal(box.querySelector('textarea').getAttribute('aria-label'), u.titel.en);
    }
    assert.ok(lab.document.documentElement.lang === 'en');
    assert.deepEqual(lab.errors, []);
  }
});

test('saved OS is visibly selected on first rendering', async t => {
  for (const os of ['mac', 'win', 'cmd']) {
    const lab = await load(pages[0], {storage: {'fittrack:os': os}}); t.after(lab.dispose);
    const buttons = [...lab.document.querySelectorAll('[data-os-btn]')];
    assert.ok(buttons.length);
    buttons.forEach(button => {
      assert.equal(button.getAttribute('aria-pressed'), String(button.dataset.osBtn === os));
      assert.equal(button.classList.contains('active'), button.dataset.osBtn === os);
    });
  }
});

test('completed checklists restore their ticks and can become incomplete again', async t => {
  const key = 'fittrack:fortschritt:lab-00';
  const lab = await load(pages[0], {storage: {[key]: '{"P00-01":true}'}}); t.after(lab.dispose);
  const box = lab.document.getElementById('uebung-P00-01');
  assert.ok([...box.querySelectorAll('input')].every(input => input.checked));
  box.querySelector('input').click();
  assert.equal(box.querySelector('.badge').hidden, true);
  assert.ok(!box.querySelector('.line.ok'));
  assert.equal(JSON.parse(lab.window.localStorage.getItem(key))['P00-01'], undefined);
  assert.equal(lab.document.querySelector('[role=progressbar]').getAttribute('aria-valuenow'), '0');
});

test('malformed or foreign progress entries cannot crash or inflate progress', async t => {
  for (const value of ['null', 'false', '[]', '42', '"text"', '{bad', '{"P00-01":false,"P00-02":1,"foreign":true}']) {
    const lab = await load(pages[0], {storage: {'fittrack:fortschritt:lab-00': value}}); t.after(lab.dispose);
    assert.equal(lab.document.querySelector('[role=progressbar]').getAttribute('aria-valuenow'), '0', value);
    lab.document.querySelectorAll('#uebung-P00-01 input').forEach(input => input.click());
    assert.equal(lab.document.querySelector('[role=progressbar]').getAttribute('aria-valuenow'), '1');
  }
});

test('progress remains usable for the current page when browser storage is blocked', async t => {
  const lab = await load(pages[0], {blockStorage: true}); t.after(lab.dispose);
  lab.document.querySelectorAll('#uebung-P00-01 input').forEach(input => input.click());
  assert.equal(lab.document.querySelector('[role=progressbar]').getAttribute('aria-valuenow'), '1');
  assert.deepEqual(lab.errors, []);
});

test('full storage still permits progress within the current page', async t => {
  const lab = await load(pages[0], {failWrites: true}); t.after(lab.dispose);
  lab.document.querySelectorAll('#uebung-P00-01 input').forEach(input => input.click());
  assert.equal(lab.document.querySelector('[role=progressbar]').getAttribute('aria-valuenow'), '1');
  assert.deepEqual(lab.errors, []);
});

test('homepage totals and reset confirmation preserve unrelated storage', async t => {
  const storage = Object.fromEntries(pages.map(file => {
    const id = file.slice(0, 6);
    return ['fittrack:fortschritt:' + id, JSON.stringify(Object.fromEntries(data(id).uebungen.map(u => [u.id, true])))];
  }));
  storage.unrelated = 'keep me';
  const lab = await load('index.html', {storage, lang: 'en'}); t.after(lab.dispose);
  const count = () => lab.document.querySelector('[role=progressbar]').getAttribute('aria-valuenow');
  assert.equal(count(), '41');
  lab.window.confirm = () => false;
  lab.document.querySelector('.fortschritt button').click();
  assert.equal(count(), '41');
  lab.window.confirm = () => true;
  lab.document.querySelector('.fortschritt button').click();
  assert.equal(count(), '0');
  assert.equal(lab.window.localStorage.getItem('unrelated'), 'keep me');
  assert.match(lab.document.querySelector('.fortschritt').textContent, /Learning progress has been deleted/);
});

test('SQL grading checks column aliases as required by the task', async t => {
  const lab = await load('lab-03-kennzahlen.html'); t.after(lab.dispose);
  const box = lab.document.getElementById('uebung-P03-02');
  await checkSql(box, 'SELECT ROUND(SUM(distanz_km), 1) AS falsch, COUNT(*) AS anzahl FROM v_workout;');
  assert.ok(box.querySelector('.line.fail'));
  assert.equal(box.querySelector('.badge').hidden, true);
});

test('SQL grading rejects wrong values and wrong ordering even with correct columns', async t => {
  const lab = await load('lab-02-daten.html'); t.after(lab.dispose);
  const box = lab.document.getElementById('uebung-P02-02');
  for (const sql of [
    'SELECT sportart, ROUND(SUM(distanz_km), 1) AS km FROM v_workout GROUP BY sportart ORDER BY km ASC;',
    'SELECT sportart, ROUND(SUM(distanz_km), 1) + 1 AS km FROM v_workout GROUP BY sportart ORDER BY km DESC;',
  ]) {
    await checkSql(box, sql);
    assert.ok(box.querySelector('.line.fail'));
    assert.equal(box.querySelector('.badge').hidden, true);
  }
});

test('database reset clears user tables and connection options as well as restoring records', async t => {
  const lab = await load('lab-02-daten.html'); t.after(lab.dispose);
  const db = await lab.runtime.holeDb();
  db.exec('CREATE TABLE experiment (id INTEGER); DELETE FROM workout; PRAGMA query_only = ON;');
  lab.document.querySelector('.db-status button').click();
  await until(() => !!lab.document.querySelector('.db-status.ready'));
  const restored = await lab.runtime.holeDb();
  assert.equal(restored.exec('SELECT COUNT(*) FROM workout')[0].values[0][0], 311);
  assert.equal(restored.exec('PRAGMA query_only')[0].values[0][0], 0);
  assert.throws(() => restored.exec('SELECT * FROM experiment'));
});

test('SQL model solution uses an independent database even if the submitted SQL changes connection state', async t => {
  const lab = await load('lab-02-daten.html'); t.after(lab.dispose);
  const box = lab.document.getElementById('uebung-P02-02');
  const solution = data('lab-02').uebungen.find(u => u.id === 'P02-02').loesung;
  await checkSql(box, 'PRAGMA query_only = ON; ' + solution);
  assert.ok(box.querySelector('.line.ok'), box.querySelector('.uebung-status').textContent);
  const db = await lab.runtime.holeDb();
  db.exec('DELETE FROM workout;');
  assert.equal(db.exec('SELECT COUNT(*) FROM workout')[0].values[0][0], 0, 'grading must not change the playground connection');
  await checkSql(box, solution);
  assert.ok(box.querySelector('.line.ok'));
  assert.equal(db.exec('SELECT COUNT(*) FROM workout')[0].values[0][0], 0);
});

test('SQL checks run concurrently without changing each other or the playground', async t => {
  const lab = await load('lab-02-daten.html'); t.after(lab.dispose);
  const exercises = data('lab-02').uebungen.filter(u => u.typ === 'sql');
  await Promise.all(exercises.map(u => checkSql(lab.document.getElementById('uebung-' + u.id), u.loesung)));
  exercises.forEach(u => assert.ok(lab.document.querySelector(`#uebung-${u.id} .line.ok`), u.id));
});

test('SQL initialization can recover after a transient download failure', async t => {
  let attempts = 0;
  const lab = await load('lab-02-daten.html', {initSqlJs: async () => {
    if (++attempts === 1) throw new Error('Temporary download failure');
    return sqlModule;
  }}); t.after(lab.dispose);
  assert.ok(lab.document.querySelector('.db-status.failed'));
  const button = lab.document.querySelector('.db-status button');
  assert.equal(button.disabled, false, 'retry remains available');
  button.click();
  await until(() => !!lab.document.querySelector('.db-status.ready'));
  assert.equal(attempts, 2);
});

test('empty quoted terminal command is reported without crashing', async t => {
  const lab = await load(); t.after(lab.dispose);
  const world = lab.terminal.neueWelt();
  for (const line of ['""', "''"]) assert.ok(lab.terminal.fuehreAus(world, line).zeilen.some(z => z.art === 'fehler'));
});

test('Docker build uses its context, keeps unique tags and runs locally built images', async t => {
  const lab = await load(); t.after(lab.dispose);
  const world = lab.terminal.neueWelt();
  assert.ok(lab.terminal.fuehreAus(world, 'docker run -d fittrack').zeilen.some(z => z.art === 'fehler'), 'FitTrack must be built first');
  const run = line => {
    const result = lab.terminal.fuehreAus(world, line);
    assert.ok(!result.zeilen.some(z => z.art === 'fehler'), `${line}: ${JSON.stringify(result)}`);
  };
  run('docker build -t custom:demo FitTrack');
  run('docker build -t custom:demo FitTrack');
  assert.equal(world.docker.abbilder.filter(a => a.voll === 'custom:demo').length, 1);
  run('docker run -d --name custom custom:demo');
  run('cd FitTrack');
  run('docker build .');
  assert.ok(!world.docker.abbilder.some(a => a.name === '.'));
  run('docker build -t fittrack .');
  run('docker run -d --name fittrack fittrack');
  assert.equal(world.docker.abbilder.filter(a => a.name === 'fittrack').length, 1);
  assert.ok(lab.terminal.fuehreAus(world, 'docker build -t broken missing').zeilen.some(z => z.art === 'fehler'));
});

test('Compose status and logs refer only to the current project', async t => {
  const lab = await load(); t.after(lab.dispose);
  const world = lab.terminal.neueWelt();
  const run = line => lab.terminal.fuehreAus(world, line);
  run('docker run -d --name unrelated nginx');
  run('cd FitTrack'); run('docker compose up -d');
  assert.ok(!JSON.stringify(run('docker compose ps')).includes('unrelated'));
  assert.ok(!run('docker compose logs').zeilen.some(z => z.art === 'fehler'));
});

test('Git commands outside the initialized repository fail', async t => {
  const lab = await load(); t.after(lab.dispose);
  const world = lab.terminal.neueWelt();
  for (const line of ['cd FitTrack', 'git init', 'cd ..']) lab.terminal.fuehreAus(world, line);
  assert.ok(lab.terminal.fuehreAus(world, 'git add .').zeilen.some(z => z.art === 'fehler'));
  assert.equal(world.git.index.length, 0);
});
