// FitTrack – Frontend-Logik
// Ablauf: Daten per fetch von der API holen, dann die Platzhalter im HTML füllen.
// Jede Funktion macht genau eine Sache und heißt nach dem, was sie anzeigt.

const SPORTARTEN = ["Laufen", "Radfahren", "Schwimmen", "Wandern"];
const LISTEN_START = 10;     // so viele Aktivitäten stehen beim Laden in der Liste
const LISTEN_SCHRITT = 20;   // so viele kommen pro Klick dazu
const WOCHENZIEL_KM = 40;    // Wochenziel über alle Sportarten; die einzige Zahl, die nicht aus der API kommt
const RING_UMFANG = 327;     // 2 * pi * 52, muss zu stroke-dasharray in style.css passen
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

function sportFarbe(sportart) {
  return farbeAusCss(`--${sportart.toLowerCase()}`);
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

function sonntag(wochenstart) {
  const d = alsDatum(wochenstart);
  d.setDate(d.getDate() + 6);
  return alsIso(d);
}

function kalenderwoche(eintrag) {
  // "2026-W24" -> 24
  return Number(eintrag.kw.slice(-2));
}

// --- Kennzahlen (US-5) -------------------------------------------------------

function zeigeKennzahlen(stats) {
  document.getElementById("stat-gesamt").textContent = formatZahl(stats.gesamt_km, 0);
  document.getElementById("stat-woche").textContent = formatZahl(stats.durchschnitt_km_pro_woche);
  document.getElementById("stat-sport").textContent = stats.lieblingssportart ?? "–";
  document.getElementById("stat-anzahl").textContent = formatZahl(stats.anzahl, 0);
}

// --- Aktivitätenliste (US-5) -------------------------------------------------

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
    return;
  }
  zeigeWeitere(LISTEN_START);
  knopfMehr.addEventListener("click", () => zeigeWeitere(LISTEN_SCHRITT));
  knopfAlle.addEventListener("click", () => zeigeWeitere(workouts.length));
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

// --- Wochenkarte mit Ring (US-6, überarbeitet in US-7) -----------------------

function zeigeWoche(wochen) {
  // Läuft die aktuelle Kalenderwoche mit Daten, zeigt der Ring Fortschritt.
  // Sonst zeigt er das Ergebnis der letzten Trainingswoche und sagt das auch.
  if (wochen.length === 0) return;
  const montag = montagDieserWoche();
  let woche = wochen.find((w) => w.wochenstart === montag);
  const laufend = Boolean(woche);
  if (!woche) woche = wochen[wochen.length - 1];

  const erreicht = woche.distanz_km >= WOCHENZIEL_KM;
  const anteil = Math.min(woche.distanz_km / WOCHENZIEL_KM, 1);   // Ring nie über 100 %
  const differenz = Math.abs(woche.distanz_km - WOCHENZIEL_KM);

  document.getElementById("woche-titel").textContent = laufend ? "Diese Woche" : "Letzte Trainingswoche";
  document.getElementById("woche-untertitel").textContent =
    `KW ${kalenderwoche(woche)}, ${formatKurz(woche.wochenstart)} bis ${formatDatum(sonntag(woche.wochenstart))} · Ziel ${WOCHENZIEL_KM} km über alle Sportarten`;

  const ring = document.getElementById("ring");
  ring.classList.toggle("erreicht", erreicht);
  ring.setAttribute("aria-label",
    `${formatZahl(woche.distanz_km)} von ${WOCHENZIEL_KM} Kilometern, ${erreicht ? "Ziel erreicht" : "Ziel noch offen"}`);
  document.getElementById("ring-zahl").textContent = formatZahl(woche.distanz_km);
  document.getElementById("ring-label").textContent = `von ${WOCHENZIEL_KM} km`;
  document.getElementById("ring-balken").style.strokeDashoffset = RING_UMFANG * (1 - anteil);

  const status = document.getElementById("woche-status");
  status.classList.toggle("erreicht", erreicht);
  if (erreicht) {
    status.textContent = `Ziel erreicht, ${formatZahl(differenz)} km darüber`;
  } else if (laufend) {
    status.textContent = `Noch ${formatZahl(differenz)} km bis zum Ziel, Stand ${WOCHENTAGE[new Date().getDay()]}`;
  } else {
    status.textContent = `${formatZahl(differenz)} km unter dem Ziel`;
  }

  document.getElementById("woche-anzahl").textContent = woche.anzahl;
  document.getElementById("woche-minuten").textContent = woche.dauer_min;

  const chips = document.getElementById("woche-sportarten");
  chips.innerHTML = "";
  Object.entries(woche.je_sportart)
    .sort((a, b) => b[1] - a[1])
    .forEach(([sportart, km]) => {
      const li = document.createElement("li");
      li.dataset.sport = sportart;
      li.innerHTML = `<strong>${sportart}</strong> ${formatZahl(km)} km`;
      chips.appendChild(li);
    });
}

// --- Balkendiagramm mit Zeitraumwahl (US-6, überarbeitet in US-7) --------------

let wochenChart = null;   // merkt sich das Diagramm, damit wir es beim Umschalten aktualisieren können
let aktuelleBalken = [];  // die gerade gezeichneten Einträge, für Klick, Tooltip und Tabelle
let aktuellerModus = "wochen";

function nachMonaten(wochen) {
  // Fasst Wochen zu Monaten zusammen, damit "Alles" lesbar bleibt (statt 105 dünner Balken).
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
  // Achsenbeschriftung: Kalenderwoche oder Monat
  if (aktuellerModus === "monate") {
    const d = alsDatum(eintrag.wochenstart);
    return `${MONATE[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
  }
  return String(kalenderwoche(eintrag));   // die Achse heißt "Kalenderwoche"
}

function beschreibeBalken(eintrag) {
  // Text unter dem Diagramm für den gewählten Balken
  const teile = Object.entries(eintrag.je_sportart)
    .sort((a, b) => b[1] - a[1])
    .map(([sport, km]) => `${sport} ${formatZahl(km)}`);
  let wann;
  if (aktuellerModus === "monate") {
    const d = alsDatum(eintrag.wochenstart);
    wann = `${MONATE[d.getMonth()]} ${d.getFullYear()}`;
  } else {
    wann = `KW ${kalenderwoche(eintrag)}, ${formatKurz(eintrag.wochenstart)} bis ${formatDatum(sonntag(eintrag.wochenstart))}`;
  }
  return `<strong>${wann}</strong> · ${formatZahl(eintrag.distanz_km)} km in ${eintrag.anzahl} Einheiten` +
    (teile.length ? ` · ${teile.join(" km, ")} km` : " · kein Training");
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
    ctx.strokeStyle = farbeAusCss("--akzent");
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
    ctx.restore();
  },
};

function zeigeDiagramm(wochen, anzahlWochen) {
  // anzahlWochen = 0 bedeutet: alle, dann nach Monaten zusammengefasst
  Chart.defaults.font.family = farbeAusCss("--schrift");
  Chart.defaults.font.size = 13;
  aktuellerModus = anzahlWochen === 0 ? "monate" : "wochen";
  const auswahl = aktuellerModus === "monate" ? nachMonaten(wochen) : wochen.slice(-anzahlWochen);
  aktuelleBalken = auswahl;
  const labels = auswahl.map(beschriftung);
  const datasets = SPORTARTEN.map((sport) => ({
    label: sport,
    data: auswahl.map((e) => e.je_sportart[sport] ?? 0),
    backgroundColor: sportFarbe(sport),
    borderColor: farbeAusCss("--text"),
    borderWidth: 0,
  }));
  // Wie viele Achsenbeschriftungen passen? Bei 8 Balken alle, sonst jede n-te.
  const jede = { 8: 1, 26: 4, 52: 8 }[anzahlWochen] ?? 3;
  const zielKm = aktuellerModus === "monate" ? null : WOCHENZIEL_KM;
  const tickText = (wert, index) => (index % jede === 0 ? labels[index] : "");
  document.getElementById("diagramm-titel").textContent =
    aktuellerModus === "monate" ? "Kilometer pro Monat" : "Kilometer pro Woche";
  document.querySelector("#diagramm-legende .ziel").hidden = aktuellerModus === "monate";

  if (wochenChart) {
    wochenChart.data.labels = labels;
    datasets.forEach((d, i) => { wochenChart.data.datasets[i].data = d.data; });
    wochenChart.options.scales.x.ticks.callback = tickText;
    wochenChart.options.scales.x.title.text = aktuellerModus === "monate" ? "Monat" : "Kalenderwoche";
    wochenChart.options.zielKm = zielKm;
  } else {
    wochenChart = new Chart(document.getElementById("wochen-chart"), {
      type: "bar",
      data: { labels, datasets },
      plugins: [ziellinie],
      options: {
        maintainAspectRatio: false,
        zielKm,
        onClick: (_ereignis, elemente) => {
          if (elemente.length) waehleBalken(elemente[0].index);
        },
        plugins: {
          legend: { display: false },   // die Legende steht als HTML über dem Diagramm
          tooltip: {
            callbacks: {
              label: (punkt) => (punkt.parsed.y ? `${punkt.dataset.label}: ${formatZahl(punkt.parsed.y)} km` : null),
              footer: (punkte) => `${formatZahl(aktuelleBalken[punkte[0].dataIndex].distanz_km)} km gesamt`,
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            title: { display: true, text: "Kalenderwoche", color: farbeAusCss("--text-2") },
            grid: { display: false },
            ticks: { color: farbeAusCss("--text-2"), autoSkip: false, maxRotation: 0, callback: tickText },
          },
          y: {
            stacked: true,
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
  // Hebt einen Balken mit Rahmen hervor und beschreibt ihn unter dem Diagramm
  const eintrag = aktuelleBalken[index];
  if (!eintrag) return;
  document.getElementById("diagramm-auswahl").innerHTML = beschreibeBalken(eintrag);
  wochenChart.data.datasets.forEach((d) => {
    d.borderWidth = aktuelleBalken.map((_, i) => (i === index ? 2 : 0));
  });
  wochenChart.update();
}

function fuelleTabelle(auswahl) {
  // Dieselben Daten als Tabelle, nur für Screenreader sichtbar
  const koerper = document.querySelector("#diagramm-tabelle tbody");
  koerper.innerHTML = auswahl
    .map((e) => `<tr><td>${aktuellerModus === "monate" ? beschriftung(e) : `KW ${beschriftung(e)}`}</td><td>${formatZahl(e.distanz_km)}</td><td>${e.anzahl}</td></tr>`)
    .join("");
}

function zeigeLegende(wochen) {
  // Nur Sportarten, die im Datensatz vorkommen, plus die Ziellinie
  const vorhanden = new Set(wochen.flatMap((w) => Object.keys(w.je_sportart)));
  const legende = document.getElementById("diagramm-legende");
  legende.innerHTML = "";
  SPORTARTEN.filter((s) => vorhanden.has(s)).forEach((sport) => {
    const li = document.createElement("li");
    li.dataset.sport = sport;
    li.textContent = sport;
    legende.appendChild(li);
  });
  const ziel = document.createElement("li");
  ziel.className = "ziel";
  ziel.textContent = `Wochenziel ${WOCHENZIEL_KM} km`;
  legende.appendChild(ziel);
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

// --- Start ----------------------------------------------------------------------

async function start() {
  try {
    const wochen = await ladeJson("/api/stats/wochen");
    zeigeWoche(wochen);
    zeigeLegende(wochen);
    zeigeDiagramm(wochen, 8);
    verbindeZeitraumWahl(wochen);
  } catch (fehler) {
    zeigeFehler("woche", "Wochenverlauf konnte nicht geladen werden. Läuft der Server?");
    console.error(fehler);
  }

  try {
    const stats = await ladeJson("/api/stats");
    zeigeKennzahlen(stats);
  } catch (fehler) {
    zeigeFehler("kennzahlen", "Kennzahlen konnten nicht geladen werden. Läuft der Server?");
    console.error(fehler);
  }

  try {
    const workouts = await ladeJson("/api/workouts");
    zeigeZeitraum(workouts);
    zeigeAktivitaeten(workouts);
  } catch (fehler) {
    zeigeFehler("aktivitaeten-liste", "Aktivitäten konnten nicht geladen werden. Läuft der Server?");
    console.error(fehler);
  }
}

start();
