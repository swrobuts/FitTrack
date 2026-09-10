"""Baut docs/dozent/anleitung.html: die klickbare Dozentenanleitung aus den Markdown-Dateien.

Aufruf:  .venv/bin/python scripts/baue_anleitung.py
Quelle:  docs/setup-webstorm.md, docs/dozent/prompt-skript.md, docs/checklisten.md,
         docs/dozent/tests.md, docs/dozent/render-deploy.md, docs/dozent/lmstudio-demo.md
Die HTML-Datei ist in sich geschlossen (kein Internet nötig) und merkt sich abgehakte Schritte im Browser.
"""
import html
import re
from pathlib import Path

import markdown

WURZEL = Path(__file__).resolve().parent.parent
ZIEL = WURZEL / "docs" / "dozent" / "anleitung.html"

KAPITEL = [
    ("vorbereitung", "Vorbereitung", "docs/setup-webstorm.md",
     "Vor dem ersten Termin: Werkzeuge installieren, Projekt in WebStorm öffnen, Tests und App einmal starten."),
    ("ablauf", "Der Bauweg", "docs/dozent/prompt-skript.md",
     "Termin 1 und 2 in Schritten. Jeder Schritt: kurz beschrieben, dann die Handlung, dann Test, Prompt und Befehle zum Kopieren."),
    ("tests", "Die Tests", "docs/dozent/tests.md",
     "Wie die 15 Tests aufgebaut sind, was jeder prüft und wie man sie ausführt."),
    ("checklisten", "Checklisten", "docs/checklisten.md",
     "Definition of Done, Review-Checkliste, Semantik-Review, Prompt-Regeln, Endabnahme."),
    ("render", "Deploy auf Render", "docs/dozent/render-deploy.md",
     "Vom Push zur öffentlichen Adresse, einmalige Einrichtung und Hinweise für die Veranstaltung."),
    ("lmstudio", "Exkurs LM Studio", "docs/dozent/lmstudio-demo.md",
     "Derselbe Prompt an ein lokales Modell, zehn Minuten Demo."),
]

# Beschriftung der Codeblöcke nach Sprache
BLOCK_TITEL = {
    "text": ("prompt", "Prompt für den Chat"),
    "python": ("datei", "Python-Datei"),
    "bash": ("terminal", "Terminal"),
    "yaml": ("datei", "Datei"),
    "dockerfile": ("datei", "Dockerfile"),
    "sql": ("datei", "SQL"),
    "": ("text", "Ausgabe"),
}

# Fette Absatzanfänge, die eine Handlung markieren (werden farbig hervorgehoben)
HANDLUNG = ("Befehle", "Befehle (alle machen mit)", "Studierende führen aus", "WebStorm", "Commit", "Zeigen",
            "Test zuerst", "Test", "Prompt", "Prompt Teil A, Backend", "Prompt Teil B, Frontend",
            "Prüfpunkte", "Prüfpunkte A", "Prüfpunkte B", "Prompt, der solche Fehler verhindert",
            "Prompt zur Selbstprüfung", "Datenhaltung zeigen (5 Minuten)", "Agiles Setup (0:20 bis 0:40)")


def rendere_markdown(text: str) -> str:
    md = markdown.Markdown(extensions=["fenced_code", "tables", "sane_lists"])
    return md.convert(text)


def block_art(sprache: str, code: str):
    """Typ eines Codeblocks: aus der Sprache, bei text aus dem Inhalt (Prompt oder Ausgabe)."""
    if sprache == "text":
        erste = html.unescape(code).strip().splitlines()[0] if code.strip() else ""
        if erste.startswith(("Du bist", "Wir bauen", "Erstelle", "Ergänze", "Prüfe deinen", "Implementiere")):
            return "prompt", "Prompt für den Chat"
        if re.match(r"^\d+\.\s", erste):
            return "text", "Ablauf"
        return "text", "Ausgabe im Terminal"
    return BLOCK_TITEL.get(sprache, ("text", sprache or "Text"))


def codebloecke_verpacken(seite: str) -> str:
    """Jeder Codeblock bekommt eine Kopfzeile mit Typ und Kopierknopf (ein Durchlauf, keine Doppelrahmen)."""
    def ersatz(m):
        sprache = (m.group(1) or "").strip()
        code = m.group(2)
        art, titel = block_art(sprache, code)
        return (f'<div class="block block-{art}"><div class="block-kopf"><span>{titel}</span>'
                f'<button type="button" class="kopieren">Kopieren</button></div>'
                f'<pre><code>{code}</code></pre></div>')
    return re.sub(r'<pre><code(?: class="language-([a-zA-Z0-9_-]*)")?>(.*?)</code></pre>', ersatz, seite, flags=re.S)


def labels_markieren(seite: str) -> str:
    """<p><strong>Befehle:</strong> ... -> Absatz mit Klasse, damit Handlungen hervorstechen."""
    def ersatz(m):
        label = html.unescape(m.group(1))
        klasse = "handlung" if label in HANDLUNG or label.startswith(("Prompt", "Befehle", "Prüfpunkte", "Commit")) else "info"
        return f'<p class="label label-{klasse}"><strong>{m.group(1)}:</strong>'
    return re.sub(r'<p><strong>([^<]{2,60}):</strong>', ersatz, seite)


def schritte_bauen(kap_id: str, body_html: str, ueberschrift_ebene: str = "h2"):
    """Teilt das gerenderte Kapitel an den h2-Überschriften in abhakbare Schritte."""
    teile = re.split(rf'(?=<{ueberschrift_ebene}>)', body_html)
    einleitung = teile[0] if not teile[0].startswith(f"<{ueberschrift_ebene}>") else ""
    schritte = []
    for t in teile:
        if not t.startswith(f"<{ueberschrift_ebene}>"):
            continue
        titel = re.search(rf'<{ueberschrift_ebene}>(.*?)</{ueberschrift_ebene}>', t, re.S).group(1)
        rest = re.sub(rf'^<{ueberschrift_ebene}>.*?</{ueberschrift_ebene}>', "", t, count=1, flags=re.S)
        sid = kap_id + "-" + re.sub(r'[^a-z0-9]+', "-", html.unescape(re.sub(r'<[^>]+>', '', titel)).lower()).strip("-")[:50]
        schritte.append((sid, titel, rest))
    return einleitung, schritte


def baue():
    nav = []
    inhalt = []
    for kap_id, kap_titel, pfad, kurz in KAPITEL:
        text = (WURZEL / pfad).read_text(encoding="utf-8")
        text = re.sub(r'^# .*\n', '', text, count=1)          # Dokumenttitel weg, das Kapitel hat seinen eigenen
        body = rendere_markdown(text)
        body = codebloecke_verpacken(body)
        body = labels_markieren(body)
        einleitung, schritte = schritte_bauen(kap_id, body)
        nav.append(f'<li class="nav-kapitel"><a href="#{kap_id}">{kap_titel}</a><ul>' +
                   "".join(f'<li><a href="#{sid}" data-schritt="{sid}"><span class="haken"></span>{t}</a></li>' for sid, t, _ in schritte) +
                   "</ul></li>")
        abschnitte = "".join(
            f'<section class="schritt" id="{sid}"><header class="schritt-kopf">'
            f'<label class="erledigt"><input type="checkbox" data-schritt="{sid}"> <span>erledigt</span></label>'
            f'<h2>{t}</h2></header><div class="schritt-inhalt">{rest}</div></section>'
            for sid, t, rest in schritte)
        inhalt.append(f'<article class="kapitel" id="{kap_id}"><h1>{kap_titel}</h1><p class="kapitel-kurz">{kurz}</p>'
                      f'{einleitung}{abschnitte}</article>')

    seite = VORLAGE.replace("{{NAV}}", "".join(nav)).replace("{{INHALT}}", "".join(inhalt))
    ZIEL.write_text(seite, encoding="utf-8")
    print("geschrieben:", ZIEL, f"{ZIEL.stat().st_size // 1024} KB")


VORLAGE = r"""<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>FitTrack · Dozentenanleitung</title>
<style>
  :root { --bordeaux: #7A1E32; --gold: #E0B15A; --tinte: #1F171A; --grau: #5c5458; --linie: #e3dcdc; --hell: #faf6f6; --sand: #f6efe2; --gruen: #2e7d4f; --blau: #1f4e79; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 16px/1.5 "Manrope", system-ui, -apple-system, "Segoe UI", sans-serif; color: var(--tinte); background: #fff; }
  .rahmen { display: grid; grid-template-columns: 300px minmax(0, 1fr); min-height: 100vh; }
  nav { position: sticky; top: 0; height: 100vh; overflow: auto; background: var(--hell); border-right: 1px solid var(--linie); padding: 20px 16px; }
  nav .marke { font-weight: 800; color: var(--bordeaux); font-size: 18px; margin-bottom: 4px; }
  nav .fortschritt { font-size: 13px; color: var(--grau); margin-bottom: 12px; }
  nav .balken { height: 6px; background: var(--linie); border-radius: 3px; overflow: hidden; margin-bottom: 16px; }
  nav .balken span { display: block; height: 100%; background: var(--bordeaux); width: 0; transition: width .3s; }
  nav ul { list-style: none; margin: 0; padding: 0; }
  nav .nav-kapitel { margin-bottom: 12px; }
  nav .nav-kapitel > a { font-weight: 700; color: var(--bordeaux); text-decoration: none; display: block; padding: 4px 0; }
  nav .nav-kapitel ul { margin-left: 4px; border-left: 2px solid var(--linie); }
  nav .nav-kapitel ul a { display: flex; gap: 8px; align-items: flex-start; font-size: 13.5px; color: var(--tinte); text-decoration: none; padding: 4px 8px; border-radius: 6px; }
  nav .nav-kapitel ul a:hover { background: #fff; }
  nav .nav-kapitel ul a.aktiv { background: #fff; box-shadow: inset 0 0 0 1px var(--linie); }
  .haken { flex: 0 0 14px; width: 14px; height: 14px; border: 1.5px solid var(--grau); border-radius: 4px; margin-top: 4px; }
  a.fertig .haken { background: var(--gruen); border-color: var(--gruen); }
  a.fertig { color: var(--grau); text-decoration: line-through; }
  nav .werkzeuge { margin-top: 20px; display: flex; gap: 8px; flex-wrap: wrap; }
  nav .werkzeuge button { font: inherit; font-size: 12.5px; border: 1px solid var(--linie); background: #fff; border-radius: 6px; padding: 5px 8px; cursor: pointer; }
  main { padding: 28px 48px 80px; max-width: 980px; }
  .kapitel { margin-bottom: 56px; }
  .kapitel > h1 { color: var(--bordeaux); font-size: 30px; margin: 0 0 4px; letter-spacing: -0.01em; }
  .kapitel-kurz { color: var(--grau); margin: 0 0 24px; font-size: 15px; }
  .schritt { border: 1px solid var(--linie); border-radius: 12px; margin: 18px 0; overflow: hidden; }
  .schritt-kopf { display: flex; align-items: center; gap: 16px; padding: 12px 20px; background: var(--hell); border-bottom: 1px solid var(--linie); }
  .schritt-kopf h2 { margin: 0; font-size: 19px; }
  .schritt.fertig .schritt-kopf { background: #eef6f0; }
  .schritt.fertig .schritt-kopf h2 { color: var(--grau); }
  .erledigt { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--grau); white-space: nowrap; cursor: pointer; }
  .erledigt input { width: 18px; height: 18px; accent-color: var(--gruen); }
  .schritt-inhalt { padding: 6px 20px 20px; }
  .schritt-inhalt h3 { font-size: 16px; margin: 20px 0 6px; }
  p.label { margin: 14px 0 6px; }
  p.label-handlung strong { display: inline-block; background: var(--bordeaux); color: #fff; padding: 2px 8px; border-radius: 5px; font-size: 13px; margin-right: 6px; }
  p.label-info strong { display: inline-block; background: var(--sand); color: var(--tinte); padding: 2px 8px; border-radius: 5px; font-size: 13px; margin-right: 6px; }
  .block { border: 1px solid var(--linie); border-radius: 10px; margin: 10px 0 16px; overflow: hidden; }
  .block-kopf { display: flex; justify-content: space-between; align-items: center; padding: 6px 12px; font-size: 12.5px; font-weight: 700; letter-spacing: .02em; }
  .block-prompt .block-kopf { background: var(--bordeaux); color: #fff; }
  .block-terminal .block-kopf { background: var(--tinte); color: #fff; }
  .block-datei .block-kopf { background: var(--blau); color: #fff; }
  .block-text .block-kopf { background: var(--sand); color: var(--tinte); }
  .block pre { margin: 0; padding: 12px 14px; overflow: auto; font: 13px/1.5 ui-monospace, "SF Mono", Menlo, Consolas, monospace; background: #fff; white-space: pre; }
  .block-prompt pre { background: #fdf7f8; white-space: pre-wrap; }
  .kopieren { font: inherit; font-size: 12px; border: 1px solid rgba(255,255,255,.5); background: transparent; color: inherit; border-radius: 6px; padding: 3px 10px; cursor: pointer; }
  .block-text .kopieren { border-color: var(--grau); }
  .kopieren.ok { background: var(--gruen); border-color: var(--gruen); color: #fff; }
  code { font: 13px ui-monospace, "SF Mono", Menlo, Consolas, monospace; background: var(--sand); padding: 1px 5px; border-radius: 4px; }
  pre code { background: none; padding: 0; }
  table { border-collapse: collapse; width: 100%; font-size: 14px; margin: 10px 0 16px; }
  th, td { border: 1px solid var(--linie); padding: 6px 10px; text-align: left; vertical-align: top; }
  th { background: var(--hell); }
  blockquote { margin: 12px 0; padding: 8px 14px; border-left: 4px solid var(--gold); background: var(--sand); }
  ul.checkliste, .schritt-inhalt ul { padding-left: 22px; }
  .schritt-inhalt li { margin: 4px 0; }
  .hinweis-oben { background: var(--sand); border-radius: 10px; padding: 14px 18px; margin: 0 0 28px; font-size: 15px; }
  .hinweis-oben b { color: var(--bordeaux); }
  @media (max-width: 900px) { .rahmen { grid-template-columns: 1fr; } nav { position: static; height: auto; } main { padding: 20px; } }
  @media print { nav { display: none; } .rahmen { display: block; } .kopieren, .erledigt { display: none; } .schritt { break-inside: avoid; } }
</style>
</head>
<body>
<div class="rahmen">
<nav>
  <div class="marke">FitTrack · Dozentenanleitung</div>
  <div class="fortschritt"><span id="zaehler">0 von 0</span> Schritten erledigt</div>
  <div class="balken"><span id="balken"></span></div>
  <ul>{{NAV}}</ul>
  <div class="werkzeuge">
    <button type="button" id="alle-zu">Erledigte einklappen</button>
    <button type="button" id="alle-auf">Alle ausklappen</button>
    <button type="button" id="zuruecksetzen">Haken zurücksetzen</button>
  </div>
</nav>
<main>
  <div class="hinweis-oben">
    <b>So arbeiten Sie mit dieser Anleitung.</b> Jeder Schritt hat dieselbe Form: kurze Beschreibung, dann die Handlung
    (rote Marke), dann Test, Prompt oder Befehl zum Kopieren. Prompts gehen in das Chat-Fenster, Befehle in das Terminal von
    WebStorm, Dateien werden in WebStorm angelegt. Der Chat sieht Ihr Repository nicht, deshalb steht alles Nötige im Prompt.
    Abgehakte Schritte merkt sich der Browser auf diesem Rechner.
  </div>
  {{INHALT}}
</main>
</div>
<script>
(function () {
  var SCHLUESSEL = "fittrack-anleitung";
  var stand = {};
  try { stand = JSON.parse(localStorage.getItem(SCHLUESSEL) || "{}"); } catch (e) {}
  var kaesten = document.querySelectorAll("input[type=checkbox][data-schritt]");
  function speichern() { try { localStorage.setItem(SCHLUESSEL, JSON.stringify(stand)); } catch (e) {} }
  function anzeigen() {
    var fertig = 0;
    kaesten.forEach(function (k) {
      var id = k.dataset.schritt, ist = !!stand[id];
      k.checked = ist; if (ist) fertig++;
      k.closest(".schritt").classList.toggle("fertig", ist);
      var link = document.querySelector('nav a[data-schritt="' + id + '"]');
      if (link) link.classList.toggle("fertig", ist);
    });
    document.getElementById("zaehler").textContent = fertig + " von " + kaesten.length;
    document.getElementById("balken").style.width = (kaesten.length ? 100 * fertig / kaesten.length : 0) + "%";
  }
  kaesten.forEach(function (k) { k.addEventListener("change", function () { stand[k.dataset.schritt] = k.checked; speichern(); anzeigen(); }); });
  anzeigen();
  document.getElementById("zuruecksetzen").addEventListener("click", function () { if (confirm("Alle Haken entfernen?")) { stand = {}; speichern(); anzeigen(); } });
  document.getElementById("alle-zu").addEventListener("click", function () { document.querySelectorAll(".schritt.fertig .schritt-inhalt").forEach(function (e) { e.hidden = true; }); });
  document.getElementById("alle-auf").addEventListener("click", function () { document.querySelectorAll(".schritt-inhalt").forEach(function (e) { e.hidden = false; }); });
  document.querySelectorAll(".schritt-kopf h2").forEach(function (h) { h.style.cursor = "pointer"; h.addEventListener("click", function () { var i = h.closest(".schritt").querySelector(".schritt-inhalt"); i.hidden = !i.hidden; }); });
  // Kopieren: Clipboard-API, sonst Auswahl plus execCommand (für file:// in älteren Browsern)
  document.querySelectorAll(".kopieren").forEach(function (b) {
    b.addEventListener("click", function () {
      var text = b.closest(".block").querySelector("pre").innerText;
      function fertig() { b.textContent = "Kopiert"; b.classList.add("ok"); setTimeout(function () { b.textContent = "Kopieren"; b.classList.remove("ok"); }, 1500); }
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(fertig, function () { ersatz(text); fertig(); }); }
      else { ersatz(text); fertig(); }
    });
  });
  function ersatz(text) { var t = document.createElement("textarea"); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); } catch (e) {} document.body.removeChild(t); }
  // Aktiven Schritt in der Navigation markieren
  var beobachter = new IntersectionObserver(function (eintraege) {
    eintraege.forEach(function (e) { if (e.isIntersecting) { document.querySelectorAll("nav a.aktiv").forEach(function (a) { a.classList.remove("aktiv"); }); var a = document.querySelector('nav a[data-schritt="' + e.target.id + '"]'); if (a) a.classList.add("aktiv"); } });
  }, { rootMargin: "-10% 0px -80% 0px" });
  document.querySelectorAll(".schritt").forEach(function (s) { beobachter.observe(s); });
})();
</script>
</body>
</html>
"""

if __name__ == "__main__":
    baue()
