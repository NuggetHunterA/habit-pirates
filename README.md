# Habit Pirates

Gute Gewohnheiten als Piratenreise: Jeder erledigte Habit bringt Wind in die Segel, das Schiff segelt über die Seekarte und findet Truhen. Installierbare Web-App für das Galaxy Fold (zugeklappt eine Spalte, aufgeklappt zwei Spalten).

## Stand: Prototyp 0.1

- Profil wählen (Adrian oder Ulrike, ohne Passwort)
- Wochenstart mit Kapitän Jonte: Habits der Vorwoche vorausgewählt, bis zu 2 Fokus-Habits (doppelter Wind), neue Habits anlegen
- Heute: Habits abhaken (Goldmünze), „Lassen“-Habits abends bestätigen, Trinken mit 6 Gläsern (Wasser oder Spaßgetränk, mind. 2 Wasser)
- Wind: 1 pro Habit, 2 pro Fokus-Habit, +2 wenn alles erledigt ist; ein Feld kostet 3 Wind
- Seekarte Kapitel 1 mit 12 Feldern, animiertes Segeln
- Truhe öffnen mit Gold und Items (gewöhnlich, selten, selten episch)

Noch nicht enthalten: Kämpfe, Story-Szenen, Shop, Ausrüstungs-Tab, frei verschiebbare Karte, Supabase-Sync. Der Spielstand liegt im Prototyp im Browser des Geräts.

## Entwickeln

```bash
npm install
npm run dev          # lokale Entwicklung
npm run build        # Produktions-Build nach dist/
npm run build:single # eine einzelne HTML-Datei mit allen Bildern (zum schnellen Testen)
npm run assets       # Grafiken aus dem Design-Ordner neu aufbereiten (braucht Python + Pillow)
```

## Aufbau

- `src/game/` Spielregeln (`rules.ts`), Karte (`map.ts`), Beute (`loot.ts`), Spielstand (`store.ts`)
- `src/components/` Bildschirme und Bausteine (Seekarte, Truhe, Jonte als Einzelteil-Animation)
- `src/assets/` aufbereitete Grafiken im Anime-Stil C (aus `scripts/prepare_assets.py`)

Bei jedem Push auf `main` wird die App über GitHub Actions auf GitHub Pages veröffentlicht.
