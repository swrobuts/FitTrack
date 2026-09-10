// FitTrack – Frontend-Logik
// Ablauf: Daten per fetch von der API holen, dann die Platzhalter im HTML füllen.
// Jede Funktion macht genau eine Sache und heißt nach dem, was sie anzeigt.

const KUERZEL = { Laufen: "La", Radfahren: "Ra", Schwimmen: "Sc", Wandern: "Wa" };
const LISTEN_SCHRITT = 10;   // so viele Aktivitäten werden pro Klick auf „Mehr anzeigen“ ergänzt
const WOCHENZIEL_KM = 40;    // Wochenziel für den Ring
const RING_UMFANG = 327;     // 2 * pi * 52, muss zu stroke-dasharray in style.css passen

// --- Hilfsfunktionen ---------------------------------------------------------

async function ladeJson(url) {
  // Holt JSON von der API. Wirft einen Fehler, wenn der Server nicht mit 200 antwortet.
  const antwort = await fetch(url);
  if (!antwort.ok) {
    throw new Error(`${url} antwortet mit Status ${antwort.status}`);
  }
  return antwort.json();
}

function formatDatum(isoText) {
  // "2026-06-21" -> "21.06.2026"
  const [jahr, monat, tag] = isoText.split("-");
  return `${tag}.${monat}.${jahr}`;
}

function formatZahl(wert, nachkommastellen = 1) {
  // Deutsche Schreibweise mit Komma, z. B. 3963 -> "3.963,0"
  return wert.toLocaleString("de-DE", {
    minimumFractionDigits: nachkommastellen,
    maximumFractionDigits: nachkommastellen,
  });
}

function zeigeFehler(bereichId, text) {
  document.getElementById(bereichId).innerHTML = `<p class="hinweis">${text}</p>`;
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
    <span class="sport-kuerzel" aria-hidden="true">${KUERZEL[workout.sportart] ?? "?"}</span>
    <div>
      <div class="aktivitaet-sport">${workout.sportart}</div>
      <div class="aktivitaet-datum">${formatDatum(workout.datum)}</div>
    </div>
    <div class="aktivitaet-werte">
      <strong>${formatZahl(workout.distanz_km)} km</strong>
      <span>${workout.dauer_min} min, ${workout.kalorien} kcal</span>
    </div>`;
  return zeile;
}

function zeigeAktivitaeten(workouts) {
  const liste = document.getElementById("aktivitaeten-liste");
  const knopf = document.getElementById("mehr-anzeigen");
  let sichtbar = 0;

  function zeigeMehr() {
    const naechste = workouts.slice(sichtbar, sichtbar + LISTEN_SCHRITT);
    naechste.forEach((workout) => liste.appendChild(baueAktivitaet(workout)));
    sichtbar += naechste.length;
    knopf.hidden = sichtbar >= workouts.length;
  }

  liste.innerHTML = "";
  if (workouts.length === 0) {
    liste.innerHTML = '<li class="hinweis">Noch keine Trainingseinheiten vorhanden.</li>';
    return;
  }
  zeigeMehr();
  knopf.addEventListener("click", zeigeMehr);
}

function zeigeZeitraum(workouts) {
  // Die Liste kommt absteigend sortiert: erstes Element = jüngstes Training.
  if (workouts.length === 0) return;
  const juengstes = workouts[0].datum;
  const aeltestes = workouts[workouts.length - 1].datum;
  document.getElementById("zeitraum").textContent =
    `${formatDatum(aeltestes)} bis ${formatDatum(juengstes)}`;
}

// --- Wochenziel-Ring (US-6) --------------------------------------------------

function zeigeWoche(wochen) {
  // Zeigt die jüngste Woche im Datensatz gegen das Wochenziel.
  if (wochen.length === 0) return;
  const woche = wochen[wochen.length - 1];
  const anteil = woche.distanz_km / WOCHENZIEL_KM;
  const ringAnteil = Math.min(anteil, 1);   // der Ring ist bei 100 % voll, der Text zeigt den echten Wert

  document.getElementById("woche-titel").textContent = `Kalenderwoche ${woche.kw.slice(-2)}`;
  document.getElementById("woche-untertitel").textContent =
    `ab ${formatDatum(woche.wochenstart)}, Wochenziel ${WOCHENZIEL_KM} km`;
  document.getElementById("ring-prozent").textContent = `${Math.round(anteil * 100)} %`;
  document.getElementById("ring-balken").style.strokeDashoffset = RING_UMFANG * (1 - ringAnteil);
  document.getElementById("woche-km").textContent = formatZahl(woche.distanz_km);
  document.getElementById("woche-anzahl").textContent = woche.anzahl;
  document.getElementById("woche-minuten").textContent = woche.dauer_min;
}

// --- Balkendiagramm mit Zeitraumwahl (US-6) ----------------------------------

let wochenChart = null;   // merkt sich das Diagramm, damit wir es beim Umschalten aktualisieren können

function farbeAusCss(name) {
  // Liest eine CSS-Variable wie --akzent aus, damit Diagramm und Seite dieselben Farben nutzen.
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function zeigeDiagramm(wochen, anzahlWochen) {
  // anzahlWochen = 0 bedeutet: alle Wochen anzeigen
  const auswahl = anzahlWochen > 0 ? wochen.slice(-anzahlWochen) : wochen;
  const beschriftungen = auswahl.map((w) => w.kw);
  const werte = auswahl.map((w) => w.distanz_km);

  if (wochenChart) {
    wochenChart.data.labels = beschriftungen;
    wochenChart.data.datasets[0].data = werte;
    wochenChart.update();
    return;
  }

  wochenChart = new Chart(document.getElementById("wochen-chart"), {
    type: "bar",
    data: {
      labels: beschriftungen,
      datasets: [{ data: werte, backgroundColor: farbeAusCss("--akzent"), borderRadius: 4 }],
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (punkte) => `Kalenderwoche ${punkte[0].label.slice(-2)}`,
            label: (punkt) => `${formatZahl(punkt.parsed.y)} km`,
          },
        },
      },
      scales: {
        x: { ticks: { display: false }, grid: { display: false } },
        y: {
          beginAtZero: true,
          ticks: { color: farbeAusCss("--text-2"), maxTicksLimit: 5 },
          grid: { color: farbeAusCss("--linie") },
          border: { display: false },
        },
      },
    },
  });
}

function verbindeZeitraumWahl(wochen) {
  const knoepfe = document.querySelectorAll(".zeitraum-wahl button");
  knoepfe.forEach((knopf) => {
    knopf.addEventListener("click", () => {
      knoepfe.forEach((k) => k.classList.remove("aktiv"));
      knopf.classList.add("aktiv");
      zeigeDiagramm(wochen, Number(knopf.dataset.wochen));
    });
  });
}

// --- Start ----------------------------------------------------------------------

async function start() {
  try {
    const wochen = await ladeJson("/api/stats/wochen");
    zeigeWoche(wochen);
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
