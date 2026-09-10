# Exkurs: Lokale LLMs mit LM Studio (10 Minuten)

Botschaft: Alles, was wir heute mit Claude im Chat gemacht haben, geht auch lokal, offline und ohne Abo.

## Vorbereitung (vor der Veranstaltung)

1. LM Studio öffnen → `Discover` → nach „Qwen3 Coder 30B A3B“ suchen → Variante `Q4_K_M` (ca. 18,6 GB) herunterladen. Auf dem Mac ist die MLX-Variante schneller, falls angeboten.
2. Stand 10.09.2026 sind auf diesem Rechner installiert: Qwen2.5-14B-Instruct, ein Qwen3.5-27B-Distillat, Gemma 4 12B und 31B, Mistral Small 3.2. Qwen3-Coder fehlt noch. Für den Kontrast „Generalist vs. Spezialist“ reicht Gemma 4 27B/31B gegen Qwen3-Coder.
3. Modell laden, Kontextlänge auf mindestens 8192 Token stellen, damit der Prompt mit Tests hineinpasst.
4. Den Prompt aus Schritt 3 des Prompt-Skripts (`/api/stats`) in eine Textdatei legen, um ihn schnell einzufügen.

## Ablauf

1. Prompt für `/api/stats` an Qwen3-Coder stellen. Antwortzeit und Tokens pro Sekunde beobachten.
2. Denselben Prompt an Gemma stellen.
3. Beide Antworten neben die Claude-Antwort aus Termin 1 legen. Vergleichen:
   - Besteht der Code die Tests? (In WebStorm einfügen, `pytest` laufen lassen. Das ist der eigentliche Beweis.)
   - Wurde die Randbedingung „nur Standardbibliothek“ eingehalten?
   - Wie ist die Erklärung? Stimmt sie mit dem Code überein?
   - Wurde die Rundung richtig gemacht? Zählt das Modell die leere Woche mit?
4. Diskussionsfragen:
   - Wann reicht lokal? Datenschutz, Kosten, Offline-Betrieb, Firmencode, der das Haus nicht verlassen darf.
   - Wann Cloud? Komplexe Aufgaben, langer Kontext, wenn die Hardware fehlt.

## Typische Beobachtungen

- Kleinere Modelle ignorieren häufiger die Randbedingungen (zusätzliche Pakete, andere Feldnamen).
- Die Erklärung klingt bei allen Modellen sicher. Ob der Code stimmt, zeigen nur die Tests. Das ist der Kern des Testkonzepts.
- Generalisten formatieren schöner, Coding-Modelle halten sich enger an die Tests.

## Anbindung an WebStorm (Ausblick, 2 Minuten)

LM Studio stellt unter `Developer` → `Start Server` eine OpenAI-kompatible Schnittstelle bereit (`http://localhost:1234/v1`). Das JetBrains-Plugin „Continue“ oder der JetBrains AI Assistant mit lokalem Modell können sie nutzen: Autovervollständigung und Chat komplett lokal.
