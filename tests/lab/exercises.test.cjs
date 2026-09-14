const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {load, pages, data, plain, site, command, checkSql} = require('./helpers.cjs');

const scripts = {
  'P00-02': os => ['cd FitTrack', {mac:'ls', win:'Get-ChildItem', cmd:'dir'}[os], {mac:'cat', win:'Get-Content', cmd:'type'}[os] + ' requirements.txt'],
  'P01-03': () => ['cd FitTrack', 'git init', 'git add .', 'git commit -m "feat(US-3): Health"', 'git log --oneline'],
  'P06-01': () => ['cd FitTrack', 'docker build -t fittrack .', 'docker images'],
  'P06-02': () => ['cd FitTrack', 'docker build -t fittrack .', 'docker run -d -p 8000:8000 --name fittrack fittrack', 'docker ps', 'docker stop fittrack'],
  'P06-04': () => ['cd FitTrack', 'docker compose up --build -d', 'docker compose ps', 'docker compose down'],
  'P07-03': () => ['cd FitTrack', 'git init', 'git add .', 'git commit -m "feat: FitTrack"', 'git remote add origin https://github.com/example/FitTrack.git', 'git push -u origin main'],
};

for (const file of pages) {
  const id = file.slice(0, 6);
  test(`${id}: every exercise accepts its solution, rejects wrong input, and persists progress`, async t => {
    const lab = await load(file);
    t.after(lab.dispose);
    const exercises = data(id).uebungen;
    assert.equal(lab.runtime.LABS.find(l => l.id === id).uebungen, exercises.length);
    assert.equal(lab.document.querySelectorAll('[data-uebung]').length, exercises.length);
    assert.equal(new Set(exercises.map(u => u.id)).size, exercises.length);
    for (const u of exercises) {
      await t.test(`${u.id} (${u.typ})`, async () => {
        const box = lab.document.getElementById('uebung-' + u.id);
        assert.ok(box, 'exercise is rendered');
        const check = box.querySelector('button.primary');
        const done = () => !box.querySelector('.badge').hidden;
        assert.equal(done(), false);
        if (u.typ === 'quiz') {
          check.click();
          assert.ok(box.querySelector('.line.note'));
          const questions = [...box.querySelectorAll('.frage')];
          questions.forEach((q, i) => {
            q.querySelectorAll('input')[u.fragen[i].optionen.findIndex((_, j) => !u.fragen[i].richtig.includes(j))].click();
          });
          check.click();
          assert.ok(box.querySelector('.line.fail'));
          assert.equal(done(), false);
          questions.forEach((q, i) => q.querySelectorAll('input').forEach((input, j) => {
            input.checked = u.fragen[i].richtig.includes(j);
          }));
          check.click();
        } else if (u.typ === 'zuordnen') {
          check.click();
          assert.ok(box.querySelector('.line.note'));
          box.querySelectorAll('select').forEach((input, i) => {
            input.value = u.ziele.find(z => z.id !== u.paare[i].ziel).id;
          });
          check.click();
          assert.ok(box.querySelector('.line.fail'));
          assert.equal(done(), false);
          box.querySelectorAll('select').forEach((input, i) => { input.value = u.paare[i].ziel; });
          check.click();
        } else if (u.typ === 'checkliste') {
          const inputs = [...box.querySelectorAll('input')];
          inputs.slice(0, -1).forEach(input => input.click());
          assert.equal(done(), false);
          inputs.at(-1).click();
        } else if (u.typ === 'terminal') {
          command(lab, box, 'this-command-does-not-exist');
          assert.equal(box.querySelectorAll('li.erledigt').length, 0);
          for (const line of scripts[u.id]('mac')) command(lab, box, line);
          assert.equal(box.querySelectorAll('li.erledigt').length, u.schritte.length);
          assert.equal(box.querySelectorAll('.terminal-schirm .fehler').length, 1);
        } else if (u.typ === 'sql') {
          await checkSql(box, 'SELECT -1 AS falsch;');
          assert.ok(box.querySelector('.line.fail'));
          assert.equal(done(), false);
          await checkSql(box, u.loesung);
        } else assert.fail(`untested type: ${u.typ}`);
        assert.ok(box.querySelector('.line.ok'), box.textContent);
        assert.equal(done(), true);
        assert.equal(JSON.parse(lab.window.localStorage.getItem(`fittrack:fortschritt:${id}`))[u.id], true);
      });
    }
    assert.equal(lab.document.querySelector('[role=progressbar]').getAttribute('aria-valuenow'), String(exercises.length));
    const restored = await load(file, {storage: lab.storage()});
    t.after(restored.dispose);
    assert.equal(restored.document.querySelectorAll('.uebung-kopf .badge:not([hidden])').length, exercises.length);
    assert.deepEqual(lab.errors, []);
    assert.deepEqual(restored.errors, []);
  });
}

for (const os of ['win', 'cmd']) test(`all terminal exercises work in ${os}`, async t => {
  for (const file of pages.filter(file => data(file.slice(0, 6)).uebungen.some(u => u.typ === 'terminal'))) {
    const lab = await load(file, {storage: {'fittrack:os': os}});
    t.after(lab.dispose);
    for (const u of data(file.slice(0, 6)).uebungen.filter(u => u.typ === 'terminal')) {
      const box = lab.document.getElementById('uebung-' + u.id);
      for (const line of scripts[u.id](os)) command(lab, box, line);
      assert.equal(box.querySelectorAll('.fehler').length, 0, `${u.id}: ${box.textContent}`);
      assert.equal(box.querySelectorAll('li.erledigt').length, u.schritte.length, u.id);
    }
    assert.deepEqual(lab.errors, []);
  }
});

test('all internal links, assets, command cards and exercise slots resolve', async t => {
  let total = 0;
  for (const file of ['index.html', ...pages]) {
    const lab = await load(file);
    t.after(lab.dispose);
    if (file !== 'index.html') {
      const definitions = data(file.slice(0, 6));
      total += definitions.uebungen.length;
      for (const holder of lab.document.querySelectorAll('[data-befehl]')) assert.ok(definitions.befehle[holder.dataset.befehl]);
    }
    for (const node of lab.document.querySelectorAll('[href], [src]')) {
      const target = new URL(node.getAttribute('href') || node.getAttribute('src'), lab.window.location.href);
      if (target.origin !== lab.window.location.origin) continue;
      assert.ok(fs.existsSync(path.join(site, decodeURIComponent(target.pathname))), `${file}: ${target.href}`);
      if (target.hash && target.pathname === '/' + file) assert.ok(lab.document.getElementById(target.hash.slice(1)), `${file}: ${target.hash}`);
    }
  }
  assert.equal(total, 41);
});
