# Habit Pirates

Gute Gewohnheiten als Piratenreise: Jeder erledigte Habit bringt Wind in die Segel, das Schiff segelt über die Seekarte und findet Truhen. Installierbare Web-App für das Galaxy Fold (zugeklappt eine Spalte, aufgeklappt zwei Spalten).

## Stand: 0.2 (Phase 1 des Release-Plans)

- Profil wählen (Adrian oder Ulrike, ohne Passwort)
- Wochenstart mit Kapitän Jonte: Habits der Vorwoche vorausgewählt, bis zu 2 Fokus-Habits (doppelter Wind), neue Habits anlegen
- Heute: Habits abhaken (Goldmünze), „Lassen“-Habits abends bestätigen, Trinken mit 6 Gläsern (Wasser oder Spaßgetränk, mind. 2 Wasser)
- Wind: 1 pro Habit, 2 pro Fokus-Habit, +2 wenn alles erledigt ist; ein Feld kostet 3 Wind
- Seekarte Kapitel 1 mit 12 Feldern, animiertes Segeln
- Truhe öffnen mit Gold und Items (gewöhnlich, selten, selten episch)

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
npm run sim          # Balancing-Simulator (SIM_NORMAL=1 normale Kämpfe, SIM_BOSS=1 Bosse, SIM_FARM=1 Beutezüge)
npm run assets       # Grafiken aus dem Design-Ordner neu aufbereiten (braucht Python + Pillow)
```

## Aufbau

- `src/game/` Spielregeln und Wind (`rules.ts`), Serien und Belohnungs-Truhen (`motivation.ts`), Karte (`map.ts`), Beute (`loot.ts`), Spielstand (`store.ts`), Kampf (`combat.ts`), Schulen und Sets (`schools.ts`)
- `src/components/` Bildschirme und Bausteine (Seekarte, Truhe, Jonte als Einzelteil-Animation)
- `src/assets/` aufbereitete Grafiken im Anime-Stil C (aus `scripts/prepare_assets.py`)

Gehostet auf Vercel: Jeder Push auf `main` geht live, jeder Pull Request bekommt eine Vorschau-Adresse.
