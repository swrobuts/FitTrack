// FitTrack – Frontend-Logik
// Ablauf: Daten per fetch von der API holen, dann die Platzhalter im HTML füllen.
// Jede Funktion macht genau eine Sache und heißt nach dem, was sie anzeigt.

const KUERZEL = { Laufen: "La", Radfahren: "Ra", Schwimmen: "Sc", Wandern: "Wa" };
const LISTEN_SCHRITT = 10;   // so viele Aktivitäten werden pro Klick auf „Mehr anzeigen“ ergänzt

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

// --- Start ----------------------------------------------------------------------

async function start() {
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
