/** Aenderungsliste fuer das Menue ("Was ist neu"). Neueste Version zuerst, knapp und sachlich, ohne Story-Spoiler. */
export const CHANGELOG: { version: string; date: string; items: string[] }[] = [
  {
    version: '1.2.1',
    date: '25.11.2026',
    items: [
      'Android: Die Zurück-Taste schließt offene Blätter und führt zum vorherigen Ort, statt die App zu beenden',
      'Erst auf dem Deck beendet Zurück die App',
    ],
  },
  {
    version: '1.2.0',
    date: '25.11.2026',
    items: [
      'Neuer Look: Holz, Pergament und Messing statt Blau und Weiß',
      'Fünf Orte unten: Deck, Seekarte, Mannschaft, Hafen und Logbuch',
      'Deck: Das Segel zeigt oben den Wind, darunter direkt die Habits',
      'Abhaken mit Goldmünze, Funken und Münzflug ins Segel, beim letzten Habit „Volle Segel!“',
      'Mannschaft: Tipp auf einen Platz zeigt alle passenden Items mit Vergleich',
      'Logbuch statt Menü: Serie, Woche planen und Einstellungen an einem Ort',
    ],
  },
  {
    version: '1.1.1',
    date: '24.11.2026',
    items: [
      'Kapitel 1: Die Kämpfe auf der Route sind leichter, auch mit wenig Ausrüstung gut zu schaffen',
      'Der erste Kampf gegen die Möwenpiraten ist kein Stolperstein mehr',
    ],
  },
  {
    version: '1.1.0',
    date: '23.11.2026',
    items: [
      'Bewachte Truhen: In jedem Kapitel werden zwei Truhen von Gegnern bewacht',
      'Nach dem Sieg öffnet sich die Truhe, verlieren kostet nichts',
    ],
  },
  {
    version: '1.0.0',
    date: '22.11.2026',
    items: [
      'Drei Kapitel mit 20, 26 und 30 Feldern',
      'Ein Feld und ein Beutezug kosten 4 Wind',
      'Kämpfe, Bosse und Erfahrung neu abgestimmt',
      'Neue Insel-Szenen und mehr Zufallsereignisse unterwegs',
      'Rund 120 Items mit Schulen, Sets, Werft und Spezialhändler',
      'Serien-Truhen, Rettungsring, Rückenwind und Fokus-Truhe',
      'Habits bearbeiten, mit Rhythmus planen und gestern nachtragen',
      'Läuft auch im Flugmodus vollständig',
    ],
  },
]
