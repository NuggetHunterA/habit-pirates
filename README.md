# Habit Pirates

Gute Gewohnheiten als Piratenreise: Jeder erledigte Habit bringt Wind in die Segel, das Schiff segelt über die Seekarte und findet Truhen. Installierbare Web-App für das Galaxy Fold (zugeklappt eine Spalte, aufgeklappt zwei Spalten).

## Stand: 1.0.0 (Release)

- Profil wählen (Adrian oder Ulrike, ohne Passwort), Einführung und erste Habits
- Wochenplanung mit Fokus-Habits, Rhythmus, Habits bearbeiten, gestern bis 12 Uhr nachtragen
- Wind nach der Wind-Formel; ein Feld und ein Beutezug kosten 4 Wind
- Drei Kapitel mit 20, 26 und 30 Feldern, Story-Szenen, Zufallsereignissen und Boss
- Kampfsystem mit Mesh-Animation, rund 120 Items, Schulen, Sets, Werft, Spezialhändler
- Serien-Truhen, Rettungsring, Rückenwind, Fokus-Truhe
- Offline vollständig nutzbar (Service Worker lädt alle Dateien vorab)

Kapiteldauer laut Reise-Simulator (5 bis 6 Habits, 80 % volle Tage): Kapitel 1 etwa 9 bis 10 Tage, Kapitel 2 etwa 12 bis 14, Kapitel 3 etwa 16 bis 19, zusammen etwa 5,5 bis 6 Wochen.

## Release-Check

```bash
npm run build && npm run check:release   # Fold zu/auf, Tages- und Wochenwechsel, Zeitumstellung, Hintergrund, offline, Ladezeit
```

## Spielstand

Der Spielstand liegt in Supabase (Projekt von Putzy, Schema `pirates`, ein Datensatz pro Profil, siehe `supabase/migrations/`). Die App spricht nur mit den Funktionen `pirates_load` und `pirates_save`. Im Browser bleibt eine Kopie für offline. Beim Start, beim Zurückkehren in die App und nach jeder Änderung wird abgeglichen; bei einem Konflikt gewinnt der neuere Stand.

Der Testmodus (+3 Wind, +100 Gold, +100 Erfahrung) ist nur in der Vercel-Vorschau und lokal sichtbar. In der Live-Version schaltet man ihn mit 7-mal Tippen auf die Versionszeile im Menü frei.

## Entwickeln

```bash
npm install
npm run dev          # lokale Entwicklung
npm run build        # Produktions-Build nach dist/
npm run build:single # eine einzelne HTML-Datei mit allen Bildern (zum schnellen Testen)
npm run fxcheck      # prüft alle Item-Effekte im Kampf-Simulator
npm run motcheck     # prüft Wind-Formel, Serien, Rettungsring, Rückenwind und Fokus-Truhe
npm run journey      # Reise-Simulator: ganze Reise Tag für Tag mit echter Beute, Laden, Werft (RUNS, FULL, SMART, TUNE=1 schlägt Gegnerstärken vor)
npm run sim          # Einzelkämpfe mit festen Ausrüstungs-Annahmen; SIM_NORMAL=1, SIM_BOSS=1, SIM_FARM=1 oder SIM_EVENT=1 (Seeungeheuer gegen schweren Beutezug)
npm run assets       # Grafiken aus dem Design-Ordner neu aufbereiten (braucht Python + Pillow)
```

## Aufbau

- `src/game/` Spielregeln und Wind (`rules.ts`), Serien und Belohnungs-Truhen (`motivation.ts`), Zufallsereignisse (`events.ts`), Karte (`map.ts`), Beute (`loot.ts`), Spielstand (`store.ts`), Kampf (`combat.ts`), Schulen und Sets (`schools.ts`)
- `src/components/` Bildschirme und Bausteine (Seekarte, Truhe, Jonte als Einzelteil-Animation)
- `src/assets/` aufbereitete Grafiken im Anime-Stil C (aus `scripts/prepare_assets.py`)

Gehostet auf Vercel: Jeder Push auf `main` geht live, jeder Pull Request bekommt eine Vorschau-Adresse.
