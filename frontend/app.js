// FitTrack – Frontend-Logik
// Ablauf: Daten per fetch von der API holen, dann die Platzhalter im HTML füllen.
// Jedes Objekt auf der Seite lässt sich antippen und öffnet dann das Sheet mit Details.
// Jede Funktion macht genau eine Sache und heißt nach dem, was sie anzeigt.

const SPORTARTEN = ["Laufen", "Radfahren", "Schwimmen", "Wandern"];
const LISTEN_START = 10;     // so viele Aktivitäten stehen beim Laden in der Liste (Handy)
const LISTEN_START_BREIT = 6; // auf dem Desktop weniger, damit die Liste neben den Sportarten endet
const LISTEN_SCHRITT = 20;   // so viele kommen pro Klick dazu
const WOCHENZIEL_KM = 40;    // Wochenziel über alle Sportarten; die einzige Zahl, die nicht aus der API kommt
const KALENDER_WOCHEN = 8;   // so viele Wochen zeigt der Trainingskalender
const WOCHENTAGE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const MONATE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

// Die geladenen Daten, damit jedes Sheet darauf zugreifen kann
let alleWorkouts = [];
let alleWochen = [];
let alleStats = null;

// --- Hilfsfunktionen ---------------------------------------------------------

async function ladeJson(url) {
  // Holt JSON von der API. Wirft einen Fehler, wenn der Server nicht mit 200 antwortet.
  const antwort = await fetch(url);
  if (!antwort.ok) {
    throw new Error(`${url} antwortet mit Status ${antwort.status}`);
  }
  return antwort.json();
}

function alsDatum(isoText) {
  // "2026-06-21" -> Date-Objekt in lokaler Zeit, ohne Zeitzonenverschiebung
  const [jahr, monat, tag] = isoText.split("-").map(Number);
  return new Date(jahr, monat - 1, tag);
}

function alsIso(datum) {
  // Date-Objekt -> "2026-06-21" in lokaler Zeit
  const mm = String(datum.getMonth() + 1).padStart(2, "0");
  const tt = String(datum.getDate()).padStart(2, "0");
  return `${datum.getFullYear()}-${mm}-${tt}`;
}

function tageSpaeter(isoText, tage) {
  // "2026-06-01" plus 6 Tage -> "2026-06-07"
  const d = alsDatum(isoText);
  d.setDate(d.getDate() + tage);
  return alsIso(d);
}

function formatDatum(isoText, mitWochentag = false) {
  // "2026-06-21" -> "21.06.2026", mit Wochentag "So, 21.06.2026"
  const [jahr, monat, tag] = isoText.split("-");
  const text = `${tag}.${monat}.${jahr}`;
  return mitWochentag ? `${WOCHENTAGE[alsDatum(isoText).getDay()]}, ${text}` : text;
}

function formatKurz(isoText) {
  // "2026-06-21" -> "21.06."
  const [, monat, tag] = isoText.split("-");
  return `${tag}.${monat}.`;
}

function formatZahl(wert, nachkommastellen = 1) {
  // Deutsche Schreibweise mit Komma, z. B. 3963 -> "3.963,0"
  return wert.toLocaleString("de-DE", {
    minimumFractionDigits: nachkommastellen,
    maximumFractionDigits: nachkommastellen,
  });
}

function farbeAusCss(name) {
  // Liest eine Farbvariable wie --akzent als fertigen rgb-Wert, damit Chart.js sie versteht.
  // Direkt ausgelesen käme nur "light-dark(…)" zurück; erst am Element löst der Browser sie auf.
  let sonde = document.getElementById("farb-sonde");
  if (!sonde) {
    sonde = document.createElement("span");
    sonde.id = "farb-sonde";
    sonde.hidden = true;
    document.body.appendChild(sonde);
  }
  sonde.style.color = `var(${name})`;
  return getComputedStyle(sonde).color;
}

function schriftAusCss() {
  return getComputedStyle(document.documentElement).getPropertyValue("--schrift").trim();
}

function sportSymbol(sportart) {
  // Symbol aus dem SVG-Sprite in index.html
  return `<span class="sport-icon" aria-hidden="true"><svg><use href="#icon-${sportart.toLowerCase()}"></use></svg></span>`;
}

function zeigeFehler(bereichId, text) {
  document.getElementById(bereichId).innerHTML = `<p class="hinweis">${text}</p>`;
}

function montagDieserWoche() {
  // Montag der laufenden Kalenderwoche als "JJJJ-MM-TT"
  const heute = new Date();
  const versatz = (heute.getDay() + 6) % 7;   // Mo = 0 … So = 6
  return alsIso(new Date(heute.getFullYear(), heute.getMonth(), heute.getDate() - versatz));
}

function kalenderwoche(eintrag) {
  // "2026-W24" -> 24
  return Number(eintrag.kw.slice(-2));
}

function wochenSpanne(eintrag) {
  // "KW 36, 31.08. bis 06.09.2026"
  return `KW ${kalenderwoche(eintrag)}, ${formatKurz(eintrag.wochenstart)} bis ${formatDatum(tageSpaeter(eintrag.wochenstart, 6))}`;
}

function seitText(wochen) {
  // Beginn des Datensatzes als "seit Sep 2024", aus der ersten Kalenderwoche
  if (!wochen.length) return "";
  const d = alsDatum(wochen[0].wochenstart);
  return `seit ${MONATE[d.getMonth()]} ${d.getFullYear()}`;
}

function nachKilometern(jeSportart) {
  // {Laufen: 5, Radfahren: 30} -> [["Radfahren", 30], ["Laufen", 5]]
  return Object.entries(jeSportart).sort((a, b) => b[1] - a[1]);
}

function workoutsImZeitraum(von, bis) {
  // Alle Einheiten mit von <= datum <= bis, jüngste zuerst
  return alleWorkouts.filter((w) => w.datum >= von && w.datum <= bis);
}

function tempo(workout) {
  // Tempo passend zur Sportart: min/km beim Laufen und Wandern, km/h beim Radfahren, min/100 m beim Schwimmen
  const minProKm = workout.dauer_min / workout.distanz_km;
  if (workout.sportart === "Radfahren") return `${formatZahl(workout.distanz_km / (workout.dauer_min / 60))} km/h`;
  if (workout.sportart === "Schwimmen") return `${formatZahl(minProKm / 10, 1)} min/100 m`;
  const minuten = Math.floor(minProKm);
  const sekunden = Math.round((minProKm - minuten) * 60);
  return `${minuten}:${String(sekunden).padStart(2, "0")} min/km`;
}

// --- Bausteine für das Sheet -------------------------------------------------------

function htmlSportBalken(jeSportart) {
  // Ein Balken je Sportart, der längste voll
  const teile = nachKilometern(jeSportart);
  if (!teile.length) return '<p class="sheet-text">Kein Training in diesem Zeitraum.</p>';
  const groesste = teile[0][1];
  return `<ul class="sport-balken">${teile.map(([sportart, km]) => `
    <li data-sport="${sportart}"><span class="name">${sportart}</span>
      <span class="balken"><span style="width:${(km / groesste) * 100}%"></span></span>
      <span class="wert">${formatZahl(km)} km</span></li>`).join("")}</ul>`;
}

function htmlZahlen(paare) {
  // Drei Kennzahlen nebeneinander: [["Einheiten", "3"], ["Minuten", "295"], …]
  return `<dl class="sheet-zahlen">${paare.map(([label, wert]) => `<div><dt>${label}</dt><dd>${wert}</dd></div>`).join("")}</dl>`;
}

function htmlEinheiten(workouts) {
  // Kurze Liste von Einheiten, jede antippbar
  if (!workouts.length) return "";
  return `<ul class="sheet-liste">${workouts.map((w) => `
    <li data-sport="${w.sportart}">${sportSymbol(w.sportart)}
      <span><span class="aktivitaet-sport">${w.sportart}</span><br><span class="aktivitaet-datum">${formatDatum(w.datum, true)}</span></span>
      <span class="aktivitaet-werte"><strong>${formatZahl(w.distanz_km)} km</strong><span>${w.dauer_min} min</span></span></li>`).join("")}</ul>`;
}

function oeffneSheet(titel, untertitel, inhaltHtml) {
  // Füllt den Dialog und zeigt ihn als Bottom-Sheet
  document.getElementById("sheet-titel").textContent = titel;
  document.getElementById("sheet-untertitel").textContent = untertitel;
  document.getElementById("sheet-inhalt").innerHTML = inhaltHtml;
  const sheet = document.getElementById("sheet");
  if (!sheet.open) sheet.showModal();
  sheet.scrollTop = 0;
}

function verbindeSheet() {
  // Schließen per Knopf, per Tippen auf den Hintergrund oder per Escape (macht der Browser)
  const sheet = document.getElementById("sheet");
  document.getElementById("sheet-schliessen").addEventListener("click", () => sheet.close());
  sheet.addEventListener("click", (ereignis) => {
    if (ereignis.target === sheet) sheet.close();   // Klick auf den Rand, nicht auf den Inhalt
  });
}

// --- Sheets: was beim Antippen erscheint --------------------------------------------

function sheetWoche(eintrag) {
  // Eine Woche oder ein Monat: Kennzahlen, Balken je Sportart, alle Einheiten
  const monat = !eintrag.kw;
  const von = eintrag.wochenstart;
  const bis = monat ? tageSpaeter(eintrag.wochenende, 0) : tageSpaeter(von, 6);
  const titel = monat ? `${MONATE[alsDatum(von).getMonth()]} ${alsDatum(von).getFullYear()}` : `KW ${kalenderwoche(eintrag)}`;
  const untertitel = monat ? `${formatDatum(von)} bis ${formatDatum(bis)}` : `${formatKurz(von)} bis ${formatDatum(bis)}`;
  const ziel = monat ? "" : `<p class="sheet-text">${eintrag.distanz_km >= WOCHENZIEL_KM
    ? `<strong>Ziel erreicht</strong>, ${formatZahl(eintrag.distanz_km - WOCHENZIEL_KM)} km über ${WOCHENZIEL_KM} km.`
    : `<strong>${formatZahl(WOCHENZIEL_KM - eintrag.distanz_km)} km unter dem Ziel</strong> von ${WOCHENZIEL_KM} km.`}</p>`;
  oeffneSheet(titel, untertitel,
    htmlZahlen([["Kilometer", formatZahl(eintrag.distanz_km)], ["Einheiten", String(eintrag.anzahl)], ["Minuten", String(eintrag.dauer_min)]]) +
    ziel + "<h3>Je Sportart</h3>" + htmlSportBalken(eintrag.je_sportart) +
    (eintrag.anzahl ? "<h3>Einheiten</h3>" + htmlEinheiten(workoutsImZeitraum(von, bis)) : ""));
}

function sheetTag(tag) {
  // Ein Tag im Kalender: seine Einheiten oder "kein Training"
  const einheiten = workoutsImZeitraum(tag, tag);
  const km = einheiten.reduce((summe, w) => summe + w.distanz_km, 0);
  oeffneSheet(formatDatum(tag, true), einheiten.length ? `${formatZahl(km)} km in ${einheiten.length} ${einheiten.length === 1 ? "Einheit" : "Einheiten"}` : "Kein Training",
    einheiten.length ? htmlEinheiten(einheiten) : '<p class="sheet-text">An diesem Tag steht keine Einheit im Tagebuch.</p>');
}

function sheetAktivitaet(workout) {
  // Eine Einheit: alle Felder aus der API plus das daraus gerechnete Tempo
  oeffneSheet(workout.sportart, formatDatum(workout.datum, true),
    htmlZahlen([["Kilometer", formatZahl(workout.distanz_km)], ["Minuten", String(workout.dauer_min)], ["Kalorien", String(workout.kalorien)]]) +
    `<p class="sheet-text">Tempo <strong>${tempo(workout)}</strong> · ${formatZahl(workout.kalorien / workout.distanz_km, 0)} kcal je km</p>`);
}

function sheetSportart(sportart) {
  // Eine Sportart über den ganzen Zeitraum, mit Knopf zum Filtern der Liste
  const eigene = alleWorkouts.filter((w) => w.sportart === sportart);
  const km = eigene.reduce((summe, w) => summe + w.distanz_km, 0);
  const min = eigene.reduce((summe, w) => summe + w.dauer_min, 0);
  const laengste = eigene.reduce((a, b) => (b.distanz_km > a.distanz_km ? b : a), eigene[0]);
  const gesamt = alleWorkouts.reduce((summe, w) => summe + w.distanz_km, 0) || 1;
  const gefiltert = aktiverFilter === sportart;
  oeffneSheet(sportart, `${formatZahl((km / gesamt) * 100, 0)} % aller Kilometer ${seitText(alleWochen)}`,
    htmlZahlen([["Kilometer", formatZahl(km, 0)], ["Einheiten", String(eigene.length)], ["Ø je Einheit", `${formatZahl(km / eigene.length)}<small>km</small>`]]) +
    `<p class="sheet-text">Längste Einheit <strong>${formatZahl(laengste.distanz_km)} km</strong> am ${formatDatum(laengste.datum)} · ${formatZahl(min / 60, 0)} Stunden insgesamt</p>` +
    `<button type="button" class="knopf knopf-voll" id="sheet-filter">${gefiltert ? "Filter aufheben" : `Nur ${sportart} in der Liste zeigen`}</button>`);
  document.getElementById("sheet-filter").addEventListener("click", () => {
    setzeFilter(gefiltert ? null : sportart);
    document.getElementById("sheet").close();
    document.getElementById("aktivitaeten").scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function sheetKennzahl(name) {
  // Wie eine Kennzahl gerechnet wird, mit den echten Zahlen
  const stats = alleStats;
  const erste = alleWorkouts[alleWorkouts.length - 1].datum;
  const letzte = alleWorkouts[0].datum;
  const jeSportart = {};
  for (const w of alleWorkouts) jeSportart[w.sportart] = (jeSportart[w.sportart] ?? 0) + w.distanz_km;
  if (name === "gesamt") {
    oeffneSheet(`${formatZahl(stats.gesamt_km, 0)} km gesamt`, `${formatDatum(erste)} bis ${formatDatum(letzte)}`,
      `<p class="sheet-text">Summe aller Kilometer aus <strong>${stats.anzahl} Einheiten</strong>, gerundet auf eine Nachkommastelle: ${formatZahl(stats.gesamt_km)} km.</p>` +
      "<h3>Je Sportart</h3>" + htmlSportBalken(jeSportart));
  } else if (name === "woche") {
    oeffneSheet(`Ø ${formatZahl(stats.durchschnitt_km_pro_woche)} km pro Woche`,
      `${alleWochen.length} Kalenderwochen, ${formatDatum(alleWochen[0].wochenstart)} bis ${formatDatum(tageSpaeter(alleWochen[alleWochen.length - 1].wochenstart, 6))}`,
      `<p class="sheet-text"><strong>${formatZahl(stats.gesamt_km)} km</strong> geteilt durch <strong>${alleWochen.length} Kalenderwochen</strong> von der Woche des ersten bis zur Woche des letzten Trainings, Wochen ohne Training zählen mit. Das Wochenziel liegt bei ${WOCHENZIEL_KM} km.</p>` +
      htmlZahlen([["Ziel erreicht", `${alleWochen.filter((w) => w.distanz_km >= WOCHENZIEL_KM).length}<small>Wochen</small>`], ["Unter dem Ziel", `${alleWochen.filter((w) => w.distanz_km < WOCHENZIEL_KM && w.anzahl > 0).length}<small>Wochen</small>`], ["Ohne Training", `${alleWochen.filter((w) => w.anzahl === 0).length}<small>Wochen</small>`]]));
  } else if (name === "beste") {
    sheetWoche(alleWochen.reduce((a, b) => (b.distanz_km > a.distanz_km ? b : a), alleWochen[0]));
  } else {
    const jeSportartAnzahl = SPORTARTEN.map((s) => [s, alleWorkouts.filter((w) => w.sportart === s).length]).filter(([, n]) => n > 0);
    oeffneSheet(`${stats.anzahl} Einheiten`, `${formatDatum(erste)} bis ${formatDatum(letzte)}`,
      `<p class="sheet-text">Im Schnitt <strong>${formatZahl(stats.anzahl / alleWochen.length)} Einheiten je Woche</strong>.</p>` +
      `<ul class="sport-balken">${jeSportartAnzahl.map(([s, n]) => `<li data-sport="${s}"><span class="name">${s}</span><span class="balken"><span style="width:${(n / jeSportartAnzahl[0][1]) * 100}%"></span></span><span class="wert">${n}</span></li>`).join("")}</ul>`);
  }
}

// --- Thema: hell oder dunkel ------------------------------------------------------------

function aktuellesThema() {
  // Gewählt per Knopf, sonst die Einstellung des Geräts
  const gewaehlt = document.documentElement.dataset.thema;
  if (gewaehlt) return gewaehlt;
  return matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function verbindeThemaWechsel() {
  const knopf = document.getElementById("thema-wechsel");
  const beschrifte = () => {
    knopf.setAttribute("aria-label", aktuellesThema() === "dark" ? "Helles Design einschalten" : "Dunkles Design einschalten");
  };
  knopf.addEventListener("click", () => {
    const neu = aktuellesThema() === "dark" ? "light" : "dark";
    document.documentElement.dataset.thema = neu;
    try { localStorage.setItem("fittrack-thema", neu); } catch (fehler) { /* privater Modus: dann eben ohne Speichern */ }
    beschrifte();
    if (wochenChart) zeigeDiagramm(alleWochen, aktuelleAuswahl);   // Diagrammfarben neu lesen
  });
  beschrifte();
}

// --- Trainingsbot: Chat über die eigenen Daten, nur lokal mit LM Studio ---------------

let botStatus = { verfuegbar: false, modell: null };
let chatVerlauf = [];      // [{rolle: "nutzer" | "bot", text}], bleibt bis zum Neuladen
let chatWartet = false;    // solange eine Antwort aussteht, ist die Eingabe gesperrt

function botGewuenscht() {
  // Die Option im Seitenfuß; ohne gespeicherten Wert ist der Bot eingeschaltet
  try { return localStorage.getItem("fittrack-bot") !== "aus"; } catch (fehler) { return true; }
}

function zeigeBotOption() {
  // Knopf nur, wenn ein Modell erreichbar ist und die Option an ist; sonst der Hinweis im Fuß
  const option = document.getElementById("bot-option");
  const hinweis = document.getElementById("bot-hinweis");
  const knopf = document.getElementById("chat-knopf");
  option.hidden = !botStatus.verfuegbar;
  hinweis.hidden = botStatus.verfuegbar;
  document.getElementById("bot-anzeigen").checked = botGewuenscht();
  knopf.hidden = !(botStatus.verfuegbar && botGewuenscht());
}

async function ladeBotStatus() {
  // Fragt den Server, ob LM Studio erreichbar ist; auf Render ist die Antwort immer "nein"
  try {
    botStatus = await ladeJson("/api/chat/status");
  } catch (fehler) {
    botStatus = { verfuegbar: false, modell: null };
  }
  zeigeBotOption();
}

function zeigeChatVerlauf() {
  // Baut die Sprechblasen neu auf; Text kommt per textContent, damit nichts als HTML gedeutet wird
  const verlauf = document.getElementById("chat-verlauf");
  verlauf.innerHTML = "";
  for (const eintrag of chatVerlauf) {
    const blase = document.createElement("div");
    blase.className = `chat-nachricht ${eintrag.rolle}`;
    blase.textContent = eintrag.text;
    if (eintrag.aufrufe && eintrag.aufrufe.length) {
      // Welche Werkzeuge das Modell für diese Antwort aufgerufen hat, mit Argumenten
      const zeile = document.createElement("div");
      zeile.className = "chat-werkzeuge";
      zeile.textContent = "Werkzeuge: " + eintrag.aufrufe.map(werkzeugText).join(" · ");
      blase.appendChild(zeile);
    }
    verlauf.appendChild(blase);
  }
  if (chatWartet) {
    const blase = document.createElement("div");
    blase.className = "chat-nachricht bot wartet";
    blase.textContent = "Der Bot denkt nach …";
    verlauf.appendChild(blase);
  }
  document.getElementById("chat-vorschlaege").hidden = chatVerlauf.length > 0;
  verlauf.scrollTop = verlauf.scrollHeight;
}

function werkzeugText(aufruf) {
  // zeitraum(von=2026-08-01, bis=2026-08-31)
  const argumente = Object.entries(aufruf.argumente || {}).map(([name, wert]) => `${name}=${wert}`).join(", ");
  return `${aufruf.werkzeug}(${argumente})`;
}

function sperreEingabe(gesperrt) {
  document.getElementById("chat-eingabe").disabled = gesperrt;
  document.getElementById("chat-senden").disabled = gesperrt;
}

async function sendeFrage(frage) {
  // Schickt Frage und bisherigen Verlauf an den Server und hängt die Antwort an
  const text = frage.trim();
  if (!text || chatWartet) return;
  const bisher = chatVerlauf.slice();
  chatVerlauf.push({ rolle: "nutzer", text });
  chatWartet = true;
  sperreEingabe(true);
  zeigeChatVerlauf();
  try {
    const antwort = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frage: text, verlauf: bisher.filter((e) => e.rolle !== "fehler").map((e) => ({ rolle: e.rolle, text: e.text })) }),
    });
    if (!antwort.ok) throw new Error(`HTTP ${antwort.status}`);
    const daten = await antwort.json();
    chatVerlauf.push({ rolle: "bot", text: daten.antwort, aufrufe: daten.aufrufe });
  } catch (fehler) {
    chatVerlauf.push({ rolle: "fehler", text: "Keine Antwort von LM Studio. Läuft der Server dort noch? Frage einfach noch einmal stellen." });
    console.error(fehler);
  } finally {
    chatWartet = false;
    sperreEingabe(false);
    zeigeChatVerlauf();
    document.getElementById("chat-eingabe").focus();
  }
}

function oeffneChat() {
  document.getElementById("chat-untertitel").textContent = `${botStatus.modell} · lokal in LM Studio`;
  zeigeChatVerlauf();
  const chat = document.getElementById("chat");
  if (!chat.open) chat.showModal();
  document.getElementById("chat-eingabe").focus();
}

function verbindeBot() {
  // Knopf im Kopf, Option im Fuß, Formular, Vorschläge und Schließen
  const chat = document.getElementById("chat");
  document.getElementById("chat-knopf").addEventListener("click", oeffneChat);
  document.getElementById("bot-anzeigen").addEventListener("change", (ereignis) => {
    try { localStorage.setItem("fittrack-bot", ereignis.target.checked ? "an" : "aus"); } catch (fehler) { /* dann eben ohne Speichern */ }
    zeigeBotOption();
  });
  document.getElementById("chat-form").addEventListener("submit", (ereignis) => {
    ereignis.preventDefault();
    const eingabe = document.getElementById("chat-eingabe");
    const frage = eingabe.value;
    eingabe.value = "";
    sendeFrage(frage);
  });
  document.querySelectorAll("#chat-vorschlaege button").forEach((knopf) => {
    knopf.addEventListener("click", () => sendeFrage(knopf.textContent));
  });
  document.getElementById("chat-schliessen").addEventListener("click", () => chat.close());
  chat.addEventListener("click", (ereignis) => {
    if (ereignis.target === chat) chat.close();
  });
}

// --- Kennzahlen (US-5, ergänzt in US-7) ----------------------------------------

function zeigeKennzahlen(stats, wochen) {
  // Jede Kachel: Bezug in der Überschrift, Zahl, eine Zeile Einordnung darunter
  document.getElementById("stat-gesamt").textContent = formatZahl(stats.gesamt_km, 0);
  document.getElementById("stat-gesamt-sub").textContent = `in ${stats.anzahl} Einheiten`;
  document.getElementById("stat-woche").textContent = formatZahl(stats.durchschnitt_km_pro_woche);
  const erreicht = wochen.filter((w) => w.distanz_km >= WOCHENZIEL_KM).length;
  document.getElementById("stat-woche-sub").textContent = `${wochen.length} Wochen ${seitText(wochen)}, Ziel in ${erreicht}`;
  document.getElementById("stat-anzahl").textContent = formatZahl(stats.anzahl, 0);
  document.getElementById("stat-anzahl-sub").textContent = wochen.length
    ? `Ø ${formatZahl(stats.anzahl / wochen.length)} je Woche` : "";
  // Beste Woche aus dem Wochenverlauf, mit Kalenderwoche und Jahr als Bezug
  const beste = wochen.reduce((a, b) => (b.distanz_km > a.distanz_km ? b : a), wochen[0]);
  if (beste) {
    document.getElementById("stat-beste").textContent = formatZahl(beste.distanz_km);
    document.getElementById("stat-beste-sub").textContent = `KW ${kalenderwoche(beste)}/${beste.kw.slice(0, 4)} · ${beste.anzahl} Einheiten`;
  }
  document.querySelectorAll("#kennzahlen .kachel").forEach((kachel) => {
    kachel.addEventListener("click", () => sheetKennzahl(kachel.dataset.kennzahl));
  });
}

function zeigeZeitraum(workouts) {
  // Die Liste kommt absteigend sortiert: erstes Element = jüngstes Training.
  if (workouts.length === 0) return;
  const juengstes = workouts[0].datum;
  const aeltestes = workouts[workouts.length - 1].datum;
  document.getElementById("zeitraum").textContent =
    `Daten vom ${formatDatum(aeltestes)} bis ${formatDatum(juengstes)}`;
  const start = alsDatum(aeltestes);
  const seit = `seit ${MONATE[start.getMonth()]} ${start.getFullYear()}`;
  document.getElementById("stat-gesamt-label").textContent = `Gesamt ${seit}`;
  document.getElementById("stat-anzahl-label").textContent = `Einheiten ${seit}`;
}

// --- Wochenkarte mit Bullet-Graph (US-7) ------------------------------------------

function serieErreichterWochen(wochen, index) {
  // Zählt rückwärts ab index, wie viele Wochen in Folge das Ziel erreicht haben
  let anzahl = 0;
  for (let i = index; i >= 0 && wochen[i].distanz_km >= WOCHENZIEL_KM; i--) anzahl++;
  return anzahl;
}

function zeigeBadge(woche, laufend, serie) {
  // Ein Wort für den Stand: Ziel erreicht, auf Kurs, im Rückstand, unter dem Ziel
  const badge = document.getElementById("badge-status");
  const km = woche.distanz_km;
  badge.className = "badge";
  if (km >= WOCHENZIEL_KM) {
    badge.textContent = "Ziel erreicht";
    badge.classList.add("erreicht");
  } else if (laufend) {
    // Sollwert bis heute: Ziel anteilig nach verstrichenen Tagen der Woche
    const tageVorbei = ((new Date().getDay() + 6) % 7) + 1;
    const soll = (WOCHENZIEL_KM * tageVorbei) / 7;
    badge.textContent = km >= soll ? "Auf Kurs" : "Im Rückstand";
    if (km >= soll) badge.classList.add("kurs");
  } else {
    badge.textContent = "Unter dem Ziel";
  }
  const serieBadge = document.getElementById("badge-serie");
  serieBadge.hidden = serie < 2;
  serieBadge.textContent = `${serie} Wochen in Folge`;
}

function zeigeBullet(woche, skalaMax) {
  // Bullet-Graph: Balken je Sportart, Zielbereich bis 40 km, Zielmarke, Achse 0 bis skalaMax
  const prozent = (km) => `${Math.min((km / skalaMax) * 100, 100)}%`;
  document.getElementById("bullet-zielbereich").style.width = prozent(WOCHENZIEL_KM);
  document.getElementById("bullet-ziel").style.left = prozent(WOCHENZIEL_KM);

  const balken = document.getElementById("bullet-balken");
  balken.innerHTML = "";
  balken.style.width = prozent(woche.distanz_km);
  const gesamt = woche.distanz_km || 1;
  nachKilometern(woche.je_sportart).forEach(([sportart, km]) => {
    const teil = document.createElement("span");
    teil.dataset.sport = sportart;
    teil.style.width = `${(km / gesamt) * 100}%`;
    balken.appendChild(teil);
  });

  const achse = document.getElementById("bullet-achse");
  achse.innerHTML = "";
  [0, skalaMax / 2, skalaMax].forEach((wert) => {
    const marke = document.createElement("span");
    marke.style.left = prozent(wert);
    marke.textContent = `${formatZahl(wert, 0)} km`;
    achse.appendChild(marke);
  });

  const erreicht = woche.distanz_km >= WOCHENZIEL_KM;
  document.getElementById("bullet").setAttribute("aria-label",
    `${formatZahl(woche.distanz_km)} von ${WOCHENZIEL_KM} Kilometern, ${erreicht ? "Ziel erreicht" : "Ziel noch offen"}`);
}

function zeigeWoche(wochen) {
  // Läuft die aktuelle Kalenderwoche mit Daten, zeigt die Karte Fortschritt.
  // Sonst zeigt sie das Ergebnis der letzten Trainingswoche und sagt das auch.
  if (wochen.length === 0) return;
  const montag = montagDieserWoche();
  let index = wochen.findIndex((w) => w.wochenstart === montag);
  const laufend = index >= 0;
  if (!laufend) index = wochen.length - 1;
  const woche = wochen[index];
  const differenz = Math.abs(woche.distanz_km - WOCHENZIEL_KM);

  document.getElementById("woche-titel").textContent = laufend ? "Diese Woche" : "Letzte Trainingswoche";
  document.getElementById("woche-untertitel").textContent =
    `${wochenSpanne(woche)} · Ziel ${WOCHENZIEL_KM} km, alle Sportarten`;
  document.getElementById("woche-km").textContent = formatZahl(woche.distanz_km);

  const status = document.getElementById("woche-status");
  if (woche.distanz_km >= WOCHENZIEL_KM) {
    status.textContent = `${formatZahl(differenz)} km über dem Ziel`;
  } else if (laufend) {
    status.textContent = `noch ${formatZahl(differenz)} km, Stand ${WOCHENTAGE[new Date().getDay()]}`;
  } else {
    status.textContent = `${formatZahl(differenz)} km unter dem Ziel`;
  }

  zeigeBadge(woche, laufend, serieErreichterWochen(wochen, index));

  // Skala: bis zur größten der letzten 8 Wochen oder 125 % des Ziels, auf 10 gerundet
  const letzte = wochen.slice(Math.max(0, index - 7), index + 1);
  const groesste = Math.max(WOCHENZIEL_KM * 1.25, ...letzte.map((w) => w.distanz_km));
  zeigeBullet(woche, Math.ceil(groesste / 10) * 10);

  const chips = document.getElementById("woche-sportarten");
  chips.innerHTML = "";
  nachKilometern(woche.je_sportart).forEach(([sportart, km]) => {
    const chip = document.createElement("span");
    chip.dataset.sport = sportart;
    chip.innerHTML = `<strong>${sportart}</strong> ${formatZahl(km)} km`;
    chips.appendChild(chip);
  });

  document.getElementById("woche-zahlen").textContent = woche.anzahl
    ? `${woche.anzahl} Einheiten · ${woche.dauer_min} min · Ø ${formatZahl(woche.distanz_km / woche.anzahl)} km je Einheit`
    : "Keine Einheit in dieser Woche";
  document.getElementById("woche-knopf").addEventListener("click", () => sheetWoche(woche));
}

// --- Verlauf: ein Balken je Woche, Sheet beim Tippen (US-6, überarbeitet in US-7) ---

let wochenChart = null;   // merkt sich das Diagramm, damit wir es beim Umschalten aktualisieren können
let aktuelleBalken = [];  // die gerade gezeichneten Einträge, für Tippen und Tabelle
let aktuellerModus = "wochen";
let aktuelleAuswahl = 8;

function nachMonaten(wochen) {
  // Fasst Wochen zu Monaten zusammen, damit lange Zeiträume lesbar bleiben.
  // Eine Woche zählt zu dem Monat, in dem ihr Montag liegt.
  const monate = new Map();
  for (const w of wochen) {
    const schluessel = w.wochenstart.slice(0, 7);   // "2026-09"
    if (!monate.has(schluessel)) {
      monate.set(schluessel, { wochenstart: w.wochenstart, wochenende: w.wochenstart, distanz_km: 0, anzahl: 0, dauer_min: 0, je_sportart: {} });
    }
    const m = monate.get(schluessel);
    m.wochenende = tageSpaeter(w.wochenstart, 6);
    m.distanz_km += w.distanz_km;
    m.anzahl += w.anzahl;
    m.dauer_min += w.dauer_min;
    for (const [sport, km] of Object.entries(w.je_sportart)) {
      m.je_sportart[sport] = (m.je_sportart[sport] ?? 0) + km;
    }
  }
  return [...monate.values()];
}

function zeitraumText(auswahl) {
  // "KW 29 bis 36, 13.07. bis 06.09.2026" oder "Sep 2024 bis Aug 2026"; das Jahr steht immer dabei
  if (!auswahl.length) return "";
  const erster = auswahl[0];
  const letzter = auswahl[auswahl.length - 1];
  if (aktuellerModus === "monate") {
    const a = alsDatum(erster.wochenstart);
    const b = alsDatum(letzter.wochenstart);
    return `${MONATE[a.getMonth()]} ${a.getFullYear()} bis ${MONATE[b.getMonth()]} ${b.getFullYear()}`;
  }
  const jahrA = erster.kw.slice(0, 4);
  const jahrB = letzter.kw.slice(0, 4);
  const kwText = jahrA === jahrB
    ? `KW ${kalenderwoche(erster)} bis ${kalenderwoche(letzter)}`
    : `KW ${kalenderwoche(erster)}/${jahrA} bis KW ${kalenderwoche(letzter)}/${jahrB}`;
  return `${kwText}, ${formatKurz(erster.wochenstart)} bis ${formatDatum(tageSpaeter(letzter.wochenstart, 6))}`;
}

function beschriftung(eintrag) {
  // Achsenbeschriftung: Nummer der Kalenderwoche oder Monat mit Jahr
  if (aktuellerModus === "monate") {
    const d = alsDatum(eintrag.wochenstart);
    return `${MONATE[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
  }
  return String(kalenderwoche(eintrag));
}

// Zeichnet die gestrichelte Ziellinie ins Diagramm (nur bei Wochen, nicht bei Monaten)
const ziellinie = {
  id: "ziellinie",
  afterDatasetsDraw(chart) {
    if (chart.options.zielKm == null) return;
    const y = chart.scales.y.getPixelForValue(chart.options.zielKm);
    const { left, right } = chart.chartArea;
    const ctx = chart.ctx;
    ctx.save();
    ctx.strokeStyle = farbeAusCss("--text");
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
    ctx.restore();
  },
};

function balkenFarben(auswahl) {
  // Grün, wenn die Woche das Ziel erreicht hat, sonst Akzentfarbe; Monate immer Akzent
  const erreicht = farbeAusCss("--erreicht");
  const offen = farbeAusCss("--akzent");
  return auswahl.map((e) => (aktuellerModus === "wochen" && e.distanz_km >= WOCHENZIEL_KM ? erreicht : offen));
}

function zeigeDiagramm(wochen, anzahlWochen) {
  // anzahlWochen = 0 bedeutet alle; ab einem Jahr wird nach Monaten zusammengefasst
  Chart.defaults.font.family = schriftAusCss();
  Chart.defaults.font.size = 13;
  aktuelleAuswahl = anzahlWochen;
  aktuellerModus = anzahlWochen === 0 || anzahlWochen >= 52 ? "monate" : "wochen";
  const basis = anzahlWochen === 0 ? wochen : wochen.slice(-anzahlWochen);
  const auswahl = aktuellerModus === "monate" ? nachMonaten(basis) : basis;
  aktuelleBalken = auswahl;
  const labels = auswahl.map(beschriftung);
  const daten = auswahl.map((e) => e.distanz_km);
  const farben = balkenFarben(auswahl);
  // Wie viele Achsenbeschriftungen passen? Bei 8 Balken alle, sonst jede n-te.
  const jede = anzahlWochen === 8 ? 1 : anzahlWochen === 26 ? 4 : 3;
  const tickText = (wert, index) => (index % jede === 0 ? labels[index] : "");
  const zielKm = aktuellerModus === "monate" ? null : WOCHENZIEL_KM;
  const achsenTitel = aktuellerModus === "monate" ? "Monat" : "Kalenderwoche";
  const textFarbe = farbeAusCss("--text-2");

  document.getElementById("verlauf-titel").textContent =
    aktuellerModus === "monate" ? "Kilometer pro Monat" : "Kilometer pro Woche";
  document.getElementById("verlauf-untertitel").textContent = zeitraumText(auswahl);
  document.getElementById("legende-ziel").hidden = aktuellerModus === "monate";

  if (wochenChart) {
    wochenChart.data.labels = labels;
    wochenChart.data.datasets[0].data = daten;
    wochenChart.data.datasets[0].backgroundColor = farben;
    wochenChart.options.scales.x.ticks.callback = tickText;
    wochenChart.options.scales.x.ticks.color = textFarbe;
    wochenChart.options.scales.x.title.text = achsenTitel;
    wochenChart.options.scales.x.title.color = textFarbe;
    wochenChart.options.scales.y.ticks.color = textFarbe;
    wochenChart.options.scales.y.title.color = textFarbe;
    wochenChart.options.scales.y.grid.color = farbeAusCss("--linie");
    wochenChart.options.zielKm = zielKm;
    wochenChart.update();
  } else {
    wochenChart = new Chart(document.getElementById("wochen-chart"), {
      type: "bar",
      data: { labels, datasets: [{ data: daten, backgroundColor: farben, borderWidth: 0, borderRadius: 3 }] },
      plugins: [ziellinie],
      options: {
        maintainAspectRatio: false,
        zielKm,
        // Tippen irgendwo in der Spalte trifft den Balken: wichtig auf dem Handy
        interaction: { mode: "index", intersect: false },
        onClick: (_ereignis, elemente) => {
          if (elemente.length) sheetWoche(aktuelleBalken[elemente[0].index]);
        },
        onHover: (ereignis, elemente) => {
          ereignis.native.target.style.cursor = elemente.length ? "pointer" : "default";
        },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },   // Details zeigt das Sheet, nicht ein Tooltip
        },
        scales: {
          x: {
            title: { display: true, text: achsenTitel, color: textFarbe },
            grid: { display: false },
            ticks: { color: textFarbe, autoSkip: false, maxRotation: 0, callback: tickText },
          },
          y: {
            beginAtZero: true,
            title: { display: true, text: "km", color: textFarbe },
            ticks: { color: textFarbe, maxTicksLimit: 5 },
            grid: { color: farbeAusCss("--linie") },
            border: { display: false },
          },
        },
      },
    });
  }
  fuelleTabelle(auswahl);
}

function fuelleTabelle(auswahl) {
  // Dieselben Daten als Tabelle, nur für Screenreader sichtbar
  const koerper = document.querySelector("#diagramm-tabelle tbody");
  koerper.innerHTML = auswahl
    .map((e) => `<tr><td>${aktuellerModus === "monate" ? beschriftung(e) : `KW ${beschriftung(e)}`}</td><td>${formatZahl(e.distanz_km)}</td><td>${e.anzahl}</td></tr>`)
    .join("");
}

function verbindeZeitraumWahl(wochen) {
  const knoepfe = document.querySelectorAll(".zeitraum-wahl button");
  knoepfe.forEach((knopf) => {
    knopf.addEventListener("click", () => {
      knoepfe.forEach((k) => k.setAttribute("aria-pressed", "false"));
      knopf.setAttribute("aria-pressed", "true");
      zeigeDiagramm(wochen, Number(knopf.dataset.wochen));
    });
  });
}

// --- Trainingskalender (US-7) ---------------------------------------------------------

function zeigeKalender(workouts, wochen) {
  // Ein Feld je Tag für die letzten Wochen; Farbe nach Kilometern, Tippen öffnet den Tag
  const raster = document.getElementById("kalender-raster");
  raster.innerHTML = "";
  if (wochen.length === 0) return;

  const kmJeTag = new Map();   // "2026-09-02" -> 9.8
  for (const w of workouts) kmJeTag.set(w.datum, (kmJeTag.get(w.datum) ?? 0) + w.distanz_km);

  const letzteWochen = wochen.slice(-KALENDER_WOCHEN);
  const heute = alsIso(new Date());
  const tage = letzteWochen.flatMap((w) => [0, 1, 2, 3, 4, 5, 6].map((i) => tageSpaeter(w.wochenstart, i)));
  const groesste = Math.max(1, ...tage.map((t) => kmJeTag.get(t) ?? 0));
  document.getElementById("kalender-untertitel").textContent =
    `${formatKurz(tage[0])} bis ${formatDatum(tage[tage.length - 1])}`;

  tage.forEach((tag) => {
    const km = kmJeTag.get(tag) ?? 0;
    const feld = document.createElement("button");
    feld.type = "button";
    if (km > 0) {
      feld.className = `stufe-${Math.ceil((km / groesste) * 4)}`;   // 4 Farbstufen
      feld.textContent = formatZahl(km, km < 10 ? 1 : 0);
      feld.setAttribute("aria-label", `${formatDatum(tag, true)}, ${formatZahl(km)} Kilometer`);
    } else {
      feld.setAttribute("aria-label", `${formatDatum(tag, true)}, kein Training`);
    }
    if (tag > heute) feld.classList.add("leer");
    if (tag === heute) feld.classList.add("heute");
    feld.addEventListener("click", () => sheetTag(tag));
    raster.appendChild(feld);
  });
}

// --- Sportarten-Kacheln mit Filter (US-7) -------------------------------------------

let aktiverFilter = null;   // gewählte Sportart oder null

function zeigeSportarten(workouts) {
  // Eine Kachel je Sportart: Kilometer, Anteil, Einheiten; Tippen öffnet die Sportart
  const bereich = document.getElementById("sport-kacheln");
  bereich.innerHTML = "";
  document.getElementById("sportarten-untertitel").textContent =
    `Alle ${workouts.length} Einheiten ${seitText(alleWochen)}`;
  const gesamt = workouts.reduce((summe, w) => summe + w.distanz_km, 0) || 1;
  SPORTARTEN.forEach((sportart) => {
    const eigene = workouts.filter((w) => w.sportart === sportart);
    if (eigene.length === 0) return;
    const km = eigene.reduce((summe, w) => summe + w.distanz_km, 0);
    const anteil = (km / gesamt) * 100;
    const letzte = eigene[0];   // Liste ist absteigend sortiert: erste eigene = jüngste
    const kachel = document.createElement("button");
    kachel.type = "button";
    kachel.className = "tippbar";
    kachel.dataset.sport = sportart;
    kachel.innerHTML = `
      <span class="sport-kopf">${sportSymbol(sportart)}${sportart}</span>
      <span class="sport-km">${formatZahl(km, 0)}<small>km</small></span>
      <span class="anteil" aria-hidden="true"><span style="width:${anteil}%"></span></span>
      <span class="sport-meta">${formatZahl(anteil, 0)} % · ${eigene.length} Einheiten</span>
      <span class="sport-meta">Ø ${formatZahl(km / eigene.length)} km je Einheit · zuletzt ${formatDatum(letzte.datum)}</span>`;
    kachel.addEventListener("click", () => sheetSportart(sportart));
    bereich.appendChild(kachel);
  });
  document.getElementById("filter-aufheben").addEventListener("click", () => setzeFilter(null));
}

function setzeFilter(sportart) {
  // Filtert die Aktivitätenliste nach Sportart; null hebt den Filter auf
  aktiverFilter = sportart;
  document.querySelectorAll("#sport-kacheln button").forEach((k) => {
    k.classList.toggle("gefiltert", k.dataset.sport === sportart);
  });
  document.getElementById("aktivitaeten-titel").textContent =
    sportart ? `Letzte Aktivitäten: ${sportart}` : "Letzte Aktivitäten";
  document.getElementById("filter-aufheben").hidden = !sportart;
  zeigeAktivitaeten(sportart ? alleWorkouts.filter((w) => w.sportart === sportart) : alleWorkouts);
}

// --- Aktivitätenliste (US-5) -----------------------------------------------------------

function baueAktivitaet(workout) {
  // Erzeugt eine Listenzeile mit Knopf für eine Trainingseinheit.
  const zeile = document.createElement("li");
  zeile.dataset.sport = workout.sportart;   // steuert die Farbe über CSS
  zeile.innerHTML = `
    <button type="button" class="aktivitaet tippbar">
      ${sportSymbol(workout.sportart)}
      <span>
        <span class="aktivitaet-sport">${workout.sportart}</span><br>
        <span class="aktivitaet-datum">${formatDatum(workout.datum, true)}</span>
      </span>
      <span class="aktivitaet-werte">
        <strong>${formatZahl(workout.distanz_km)} km</strong>
        <span>${workout.dauer_min} min</span>
      </span>
    </button>`;
  zeile.querySelector("button").addEventListener("click", () => sheetAktivitaet(workout));
  return zeile;
}

function zeigeAktivitaeten(workouts) {
  const liste = document.getElementById("aktivitaeten-liste");
  const knopfMehr = document.getElementById("mehr-anzeigen");
  const knopfAlle = document.getElementById("alle-anzeigen");
  const knopfZu = document.getElementById("einklappen");
  const start = matchMedia("(min-width: 768px)").matches ? LISTEN_START_BREIT : LISTEN_START;
  let sichtbar = 0;

  function knoepfeSetzen() {
    // Mehr und Alle, solange etwas fehlt; Einklappen, sobald mehr als der Start sichtbar ist
    const rest = workouts.length - sichtbar;
    knopfMehr.hidden = knopfAlle.hidden = rest <= 0;
    knopfMehr.textContent = `${Math.min(rest, LISTEN_SCHRITT)} weitere anzeigen`;
    knopfZu.hidden = sichtbar <= start;
    // Zeitbezug: welche Einheiten gerade zu sehen sind, jüngste zuerst
    const aelteste = workouts[sichtbar - 1];
    document.getElementById("aktivitaeten-untertitel").textContent =
      `${sichtbar} von ${workouts.length} Einheiten${aktiverFilter ? ` ${aktiverFilter}` : ""}, ${formatKurz(aelteste.datum)} bis ${formatDatum(workouts[0].datum)}`;
  }

  function zeigeWeitere(anzahl) {
    const naechste = workouts.slice(sichtbar, sichtbar + anzahl);
    naechste.forEach((workout) => liste.appendChild(baueAktivitaet(workout)));
    sichtbar += naechste.length;
    knoepfeSetzen();
  }

  function einklappen() {
    // Zurück auf den Startumfang und zur Liste scrollen, damit man nicht im Leeren steht
    [...liste.children].slice(start).forEach((zeile) => zeile.remove());
    sichtbar = Math.min(sichtbar, start);
    knoepfeSetzen();
    document.getElementById("aktivitaeten").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  liste.innerHTML = "";
  sichtbar = 0;
  if (workouts.length === 0) {
    liste.innerHTML = '<li class="hinweis">Noch keine Trainingseinheiten vorhanden.</li>';
    knopfMehr.hidden = knopfAlle.hidden = knopfZu.hidden = true;
    document.getElementById("aktivitaeten-untertitel").textContent = "";
    return;
  }
  zeigeWeitere(start);
  // Alte Klick-Handler ersetzen, damit ein Filterwechsel keine doppelten Einträge erzeugt
  knopfMehr.onclick = () => zeigeWeitere(LISTEN_SCHRITT);
  knopfAlle.onclick = () => zeigeWeitere(workouts.length);
  knopfZu.onclick = einklappen;
}

// --- Start ----------------------------------------------------------------------

async function start() {
  verbindeThemaWechsel();
  verbindeBot();
  ladeBotStatus();   // läuft nebenher, die Daten warten nicht darauf
  verbindeSheet();

  try {
    alleWochen = await ladeJson("/api/stats/wochen");
    zeigeWoche(alleWochen);
    zeigeDiagramm(alleWochen, 8);
    verbindeZeitraumWahl(alleWochen);
  } catch (fehler) {
    zeigeFehler("woche", "Wochenverlauf konnte nicht geladen werden. Läuft der Server?");
    console.error(fehler);
  }

  try {
    alleStats = await ladeJson("/api/stats");
    zeigeKennzahlen(alleStats, alleWochen);
  } catch (fehler) {
    zeigeFehler("kennzahlen", "Kennzahlen konnten nicht geladen werden. Läuft der Server?");
    console.error(fehler);
  }

  try {
    alleWorkouts = await ladeJson("/api/workouts");
    zeigeZeitraum(alleWorkouts);
    zeigeKalender(alleWorkouts, alleWochen);
    zeigeSportarten(alleWorkouts);
    zeigeAktivitaeten(alleWorkouts);
  } catch (fehler) {
    zeigeFehler("aktivitaeten-liste", "Aktivitäten konnten nicht geladen werden. Läuft der Server?");
    console.error(fehler);
  }
}

start();
