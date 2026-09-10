// FitTrack – Frontend-Logik
// Ablauf: Daten per fetch von der API holen, dann die Platzhalter im HTML füllen.
// Jede Funktion macht genau eine Sache und heißt nach dem, was sie anzeigt.

const SPORTARTEN = ["Laufen", "Radfahren", "Schwimmen", "Wandern"];
const LISTEN_START = 10;     // so viele Aktivitäten stehen beim Laden in der Liste
const LISTEN_SCHRITT = 20;   // so viele kommen pro Klick dazu
const WOCHENZIEL_KM = 40;    // Wochenziel über alle Sportarten; die einzige Zahl, die nicht aus der API kommt
const KALENDER_WOCHEN = 8;   // so viele Wochen zeigt der Trainingskalender
const WOCHENTAGE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const MONATE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

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
  // Liest eine CSS-Variable wie --akzent aus, damit Diagramm und Seite dieselben Farben nutzen.
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
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

function nachKilometern(jeSportart) {
  // {Laufen: 5, Radfahren: 30} -> [["Radfahren", 30], ["Laufen", 5]]
  return Object.entries(jeSportart).sort((a, b) => b[1] - a[1]);
}

// --- Kennzahlen (US-5, ergänzt in US-7) ----------------------------------------

function zeigeKennzahlen(stats, wochen) {
  document.getElementById("stat-gesamt").textContent = formatZahl(stats.gesamt_km, 0);
  document.getElementById("stat-woche").textContent = formatZahl(stats.durchschnitt_km_pro_woche);
  document.getElementById("stat-anzahl").textContent = formatZahl(stats.anzahl, 0);
  // Beste Woche aus dem Wochenverlauf, mit Kalenderwoche als Bezug
  const beste = wochen.reduce((a, b) => (b.distanz_km > a.distanz_km ? b : a), wochen[0]);
  if (beste) {
    document.getElementById("stat-beste").textContent = formatZahl(beste.distanz_km);
    document.getElementById("stat-beste-label").textContent = `Beste Woche, KW ${kalenderwoche(beste)}/${beste.kw.slice(0, 4)}`;
  }
}

function zeigeZeitraum(workouts) {
  // Die Liste kommt absteigend sortiert: erstes Element = jüngstes Training.
  if (workouts.length === 0) return;
  const juengstes = workouts[0].datum;
  const aeltestes = workouts[workouts.length - 1].datum;
  document.getElementById("zeitraum").textContent =
    `Daten vom ${formatDatum(aeltestes)} bis ${formatDatum(juengstes)}`;
  const start = alsDatum(aeltestes);
  document.getElementById("stat-gesamt-label").textContent =
    `Gesamt seit ${MONATE[start.getMonth()]} ${start.getFullYear()}`;
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
    badge.classList.add(km >= soll ? "kurs" : "offen");
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
  document.querySelector("#bullet-ziel span").textContent = "Ziel";

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
    `${wochenSpanne(woche)} · Ziel ${WOCHENZIEL_KM} km über alle Sportarten`;
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
    const li = document.createElement("li");
    li.dataset.sport = sportart;
    li.innerHTML = `<strong>${sportart}</strong> ${formatZahl(km)} km`;
    chips.appendChild(li);
  });

  document.getElementById("woche-anzahl").textContent = woche.anzahl;
  document.getElementById("woche-minuten").textContent = woche.dauer_min;
  document.getElementById("woche-schnitt").innerHTML = woche.anzahl
    ? `${formatZahl(woche.distanz_km / woche.anzahl)}<small>km</small>` : "–";
}

// --- Verlauf: ein Balken je Woche, Detail beim Tippen (US-6, überarbeitet in US-7) ---

let wochenChart = null;   // merkt sich das Diagramm, damit wir es beim Umschalten aktualisieren können
let aktuelleBalken = [];  // die gerade gezeichneten Einträge, für Tippen, Tooltip und Tabelle
let aktuellerModus = "wochen";

function nachMonaten(wochen) {
  // Fasst Wochen zu Monaten zusammen, damit lange Zeiträume lesbar bleiben.
  // Eine Woche zählt zu dem Monat, in dem ihr Montag liegt.
  const monate = new Map();
  for (const w of wochen) {
    const schluessel = w.wochenstart.slice(0, 7);   // "2026-09"
    if (!monate.has(schluessel)) {
      monate.set(schluessel, { wochenstart: `${schluessel}-01`, distanz_km: 0, anzahl: 0, dauer_min: 0, je_sportart: {} });
    }
    const m = monate.get(schluessel);
    m.distanz_km += w.distanz_km;
    m.anzahl += w.anzahl;
    m.dauer_min += w.dauer_min;
    for (const [sport, km] of Object.entries(w.je_sportart)) {
      m.je_sportart[sport] = (m.je_sportart[sport] ?? 0) + km;
    }
  }
  return [...monate.values()];
}

function beschriftung(eintrag) {
  // Achsenbeschriftung: Nummer der Kalenderwoche oder Monat mit Jahr
  if (aktuellerModus === "monate") {
    const d = alsDatum(eintrag.wochenstart);
    return `${MONATE[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
  }
  return String(kalenderwoche(eintrag));
}

function zeigeDetail(eintrag) {
  // Die angetippte Woche: Zeitraum, Summe und ein Balken je Sportart
  let wann;
  if (aktuellerModus === "monate") {
    const d = alsDatum(eintrag.wochenstart);
    wann = `${MONATE[d.getMonth()]} ${d.getFullYear()}`;
  } else {
    wann = wochenSpanne(eintrag);
  }
  document.getElementById("detail-titel").innerHTML =
    `<strong>${wann}</strong> · ${formatZahl(eintrag.distanz_km)} km · ${eintrag.anzahl} Einheiten · ${eintrag.dauer_min} min`;
  const liste = document.getElementById("detail-sportarten");
  liste.innerHTML = "";
  const teile = nachKilometern(eintrag.je_sportart);
  const groesste = teile.length ? teile[0][1] : 1;
  teile.forEach(([sportart, km]) => {
    const li = document.createElement("li");
    li.dataset.sport = sportart;
    li.innerHTML = `<span class="name">${sportart}</span>
      <span class="balken"><span style="width:${(km / groesste) * 100}%"></span></span>
      <span class="wert">${formatZahl(km)} km</span>`;
    liste.appendChild(li);
  });
  if (!teile.length) liste.innerHTML = '<li class="name">Kein Training</li>';
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
  Chart.defaults.font.family = farbeAusCss("--schrift");
  Chart.defaults.font.size = 13;
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

  document.getElementById("verlauf-titel").textContent =
    aktuellerModus === "monate" ? "Kilometer pro Monat" : "Kilometer pro Woche";
  document.getElementById("legende-ziel").hidden = aktuellerModus === "monate";

  if (wochenChart) {
    wochenChart.data.labels = labels;
    wochenChart.data.datasets[0].data = daten;
    wochenChart.data.datasets[0].backgroundColor = farben;
    wochenChart.options.scales.x.ticks.callback = tickText;
    wochenChart.options.scales.x.title.text = achsenTitel;
    wochenChart.options.zielKm = zielKm;
  } else {
    wochenChart = new Chart(document.getElementById("wochen-chart"), {
      type: "bar",
      data: { labels, datasets: [{ data: daten, backgroundColor: farben, borderColor: farbeAusCss("--text"), borderWidth: 0, borderRadius: 3 }] },
      plugins: [ziellinie],
      options: {
        maintainAspectRatio: false,
        zielKm,
        // Tippen irgendwo in der Spalte trifft den Balken: wichtig auf dem Handy
        interaction: { mode: "index", intersect: false },
        onClick: (_ereignis, elemente) => {
          if (elemente.length) waehleBalken(elemente[0].index);
        },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },   // das Detail steht unter dem Diagramm, nicht im Tooltip
        },
        scales: {
          x: {
            title: { display: true, text: achsenTitel, color: farbeAusCss("--text-2") },
            grid: { display: false },
            ticks: { color: farbeAusCss("--text-2"), autoSkip: false, maxRotation: 0, callback: tickText },
          },
          y: {
            beginAtZero: true,
            title: { display: true, text: "km", color: farbeAusCss("--text-2") },
            ticks: { color: farbeAusCss("--text-2"), maxTicksLimit: 5 },
            grid: { color: farbeAusCss("--linie") },
            border: { display: false },
          },
        },
      },
    });
  }
  waehleBalken(auswahl.length - 1);   // jüngster Abschnitt ist vorausgewählt
  fuelleTabelle(auswahl);
}

function waehleBalken(index) {
  // Hebt einen Balken mit Rahmen hervor und zeigt ihn im Detail
  const eintrag = aktuelleBalken[index];
  if (!eintrag) return;
  zeigeDetail(eintrag);
  wochenChart.data.datasets[0].borderWidth = aktuelleBalken.map((_, i) => (i === index ? 2 : 0));
  wochenChart.update();
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
  // Ein Feld je Tag für die letzten Wochen; Farbe nach Kilometern, Tippen zeigt die Einheit
  const raster = document.getElementById("kalender-raster");
  const detail = document.getElementById("kalender-detail");
  raster.innerHTML = "";
  if (wochen.length === 0) return;

  const jeTag = new Map();   // "2026-09-02" -> [workout, …]
  for (const w of workouts) {
    if (!jeTag.has(w.datum)) jeTag.set(w.datum, []);
    jeTag.get(w.datum).push(w);
  }
  const kmAmTag = (tag) => (jeTag.get(tag) ?? []).reduce((summe, w) => summe + w.distanz_km, 0);

  const letzteWochen = wochen.slice(-KALENDER_WOCHEN);
  const heute = alsIso(new Date());
  const tage = letzteWochen.flatMap((w) => [0, 1, 2, 3, 4, 5, 6].map((i) => tageSpaeter(w.wochenstart, i)));
  const groesste = Math.max(1, ...tage.map(kmAmTag));
  document.getElementById("kalender-untertitel").textContent =
    `${formatKurz(tage[0])} bis ${formatDatum(tage[tage.length - 1])}, ein Feld je Tag. Tippen zeigt die Einheit.`;

  tage.forEach((tag) => {
    const km = kmAmTag(tag);
    const feld = document.createElement("button");
    feld.type = "button";
    feld.setAttribute("aria-pressed", "false");
    if (km > 0) {
      feld.className = `stufe-${Math.ceil((km / groesste) * 4)}`;   // 4 Farbstufen
      feld.textContent = formatZahl(km, km < 10 ? 1 : 0);
      feld.setAttribute("aria-label", `${formatDatum(tag, true)}, ${formatZahl(km)} Kilometer`);
    } else {
      feld.setAttribute("aria-label", `${formatDatum(tag, true)}, kein Training`);
    }
    if (tag > heute) feld.classList.add("leer");
    if (tag === heute) feld.classList.add("heute");
    feld.addEventListener("click", () => {
      raster.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", "false"));
      feld.setAttribute("aria-pressed", "true");
      const einheiten = jeTag.get(tag) ?? [];
      detail.innerHTML = einheiten.length
        ? `<strong>${formatDatum(tag, true)}</strong> · ` + einheiten
            .map((w) => `${w.sportart} ${formatZahl(w.distanz_km)} km, ${w.dauer_min} min, ${w.kalorien} kcal`).join(" · ")
        : `<strong>${formatDatum(tag, true)}</strong> · kein Training`;
    });
    raster.appendChild(feld);
  });

  // Jüngster Trainingstag ist vorausgewählt
  const juengster = [...tage].reverse().find((t) => kmAmTag(t) > 0);
  if (juengster) raster.children[tage.indexOf(juengster)].click();
}

// --- Sportarten-Kacheln mit Filter (US-7) -------------------------------------------

let aktiverFilter = null;   // gewählte Sportart oder null

function zeigeSportarten(workouts) {
  // Eine Kachel je Sportart: Kilometer, Anteil, Einheiten; Tippen filtert die Liste
  const bereich = document.getElementById("sport-kacheln");
  bereich.innerHTML = "";
  const gesamt = workouts.reduce((summe, w) => summe + w.distanz_km, 0) || 1;
  SPORTARTEN.forEach((sportart) => {
    const eigene = workouts.filter((w) => w.sportart === sportart);
    if (eigene.length === 0) return;
    const km = eigene.reduce((summe, w) => summe + w.distanz_km, 0);
    const anteil = (km / gesamt) * 100;
    const kachel = document.createElement("button");
    kachel.type = "button";
    kachel.dataset.sport = sportart;
    kachel.setAttribute("aria-pressed", "false");
    kachel.innerHTML = `
      <span class="sport-kopf">${sportSymbol(sportart)}${sportart}</span>
      <span class="sport-km">${formatZahl(km, 0)}<small>km</small></span>
      <span class="anteil" aria-hidden="true"><span style="width:${anteil}%"></span></span>
      <span class="sport-meta">${formatZahl(anteil, 0)} % · ${eigene.length} Einheiten</span>`;
    kachel.addEventListener("click", () => setzeFilter(workouts, aktiverFilter === sportart ? null : sportart));
    bereich.appendChild(kachel);
  });
  document.getElementById("filter-aufheben").addEventListener("click", () => setzeFilter(workouts, null));
}

function setzeFilter(workouts, sportart) {
  // Filtert die Aktivitätenliste nach Sportart; null hebt den Filter auf
  aktiverFilter = sportart;
  document.querySelectorAll("#sport-kacheln button").forEach((k) => {
    k.setAttribute("aria-pressed", String(k.dataset.sport === sportart));
  });
  document.getElementById("aktivitaeten-titel").textContent =
    sportart ? `Letzte Aktivitäten: ${sportart}` : "Letzte Aktivitäten";
  document.getElementById("filter-aufheben").hidden = !sportart;
  zeigeAktivitaeten(sportart ? workouts.filter((w) => w.sportart === sportart) : workouts);
}

// --- Aktivitätenliste (US-5) -----------------------------------------------------------

function baueAktivitaet(workout) {
  // Erzeugt eine Listenzeile für eine Trainingseinheit.
  const zeile = document.createElement("li");
  zeile.dataset.sport = workout.sportart;   // steuert die Farbe über CSS
  zeile.innerHTML = `
    ${sportSymbol(workout.sportart)}
    <div>
      <div class="aktivitaet-sport">${workout.sportart}</div>
      <div class="aktivitaet-datum">${formatDatum(workout.datum, true)}</div>
    </div>
    <div class="aktivitaet-werte">
      <strong>${formatZahl(workout.distanz_km)} km</strong>
      <span>${workout.dauer_min} min · ${workout.kalorien} kcal</span>
    </div>`;
  return zeile;
}

function zeigeAktivitaeten(workouts) {
  const liste = document.getElementById("aktivitaeten-liste");
  const knopfMehr = document.getElementById("mehr-anzeigen");
  const knopfAlle = document.getElementById("alle-anzeigen");
  let sichtbar = 0;

  function zeigeWeitere(anzahl) {
    const naechste = workouts.slice(sichtbar, sichtbar + anzahl);
    naechste.forEach((workout) => liste.appendChild(baueAktivitaet(workout)));
    sichtbar += naechste.length;
    const rest = workouts.length - sichtbar;
    knopfMehr.hidden = knopfAlle.hidden = rest <= 0;
    knopfMehr.textContent = `${Math.min(rest, LISTEN_SCHRITT)} weitere anzeigen`;
  }

  liste.innerHTML = "";
  if (workouts.length === 0) {
    liste.innerHTML = '<li class="hinweis">Noch keine Trainingseinheiten vorhanden.</li>';
    knopfMehr.hidden = knopfAlle.hidden = true;
    return;
  }
  zeigeWeitere(LISTEN_START);
  // Alte Klick-Handler ersetzen, damit ein Filterwechsel keine doppelten Einträge erzeugt
  knopfMehr.onclick = () => zeigeWeitere(LISTEN_SCHRITT);
  knopfAlle.onclick = () => zeigeWeitere(workouts.length);
}

// --- Start ----------------------------------------------------------------------

async function start() {
  let wochen = [];
  try {
    wochen = await ladeJson("/api/stats/wochen");
    zeigeWoche(wochen);
    zeigeDiagramm(wochen, 8);
    verbindeZeitraumWahl(wochen);
  } catch (fehler) {
    zeigeFehler("woche", "Wochenverlauf konnte nicht geladen werden. Läuft der Server?");
    console.error(fehler);
  }

  try {
    const stats = await ladeJson("/api/stats");
    zeigeKennzahlen(stats, wochen);
  } catch (fehler) {
    zeigeFehler("kennzahlen", "Kennzahlen konnten nicht geladen werden. Läuft der Server?");
    console.error(fehler);
  }

  try {
    const workouts = await ladeJson("/api/workouts");
    zeigeZeitraum(workouts);
    zeigeKalender(workouts, wochen);
    zeigeSportarten(workouts);
    zeigeAktivitaeten(workouts);
  } catch (fehler) {
    zeigeFehler("aktivitaeten-liste", "Aktivitäten konnten nicht geladen werden. Läuft der Server?");
    console.error(fehler);
  }
}

start();
