import type { Look } from './combat'
import type { CrewId } from './foes'

/** Belohnung einer Szene. item: ein zufaelliges Item aus der Truhen-Tabelle */
export interface Reward {
  gold?: number
  item?: boolean
}

export interface Line {
  /** Sprecher: Figur (Look), 'erzaehler' oder ein Name aus SPEAKERS */
  who: string
  text: string
}

export interface Choice {
  prompt: string
  options: { label: string; text: string; reward: Reward }[]
}

export interface Story {
  id: string
  title: string
  bg: 'strand' | 'nebel'
  /** Figuren auf der Buehne: links, rechts */
  cast: [Look, Look?]
  lines: Line[]
  /** Wer am Ende der Crew beitritt */
  join?: CrewId
  choice?: Choice
  reward?: Reward
}

export const SPEAKERS: Record<string, string> = {
  erzaehler: '',
  jonte: 'Jonte',
  kanonier: 'Bolle',
  navigatorin: 'Mara',
  smutje: 'Grummel',
  ausguck: 'Pip',
  schalbart: 'Fürst Schalbart',
  grauhand: 'Kapitän Grauhand',
  moewenpirat: 'Möwenpirat',
  waerterin: 'Leuchtturmwärterin Oda',
}

const S: Story[] = [
  // ---------------- Kapitel 1: Die Krabbenküste ----------------
  {
    id: 'k1_intro',
    title: 'Leinen los!',
    bg: 'strand',
    cast: ['jonte', 'kanonier'],
    lines: [
      { who: 'erzaehler', text: 'Ein kleiner Hafen, ein kleines Schiff und ein Kapitän mit sehr großem Hut.' },
      { who: 'jonte', text: 'Bolle! Heute ist es so weit. Wir stechen in See!' },
      { who: 'kanonier', text: 'Hab die Kanone geputzt, die Pulverfässer gezählt und zweimal gefrühstückt. Ich bin bereit.' },
      { who: 'jonte', text: 'Man sagt, irgendwo hinter dem Ende jeder Karte liegt die Windquelle. Dort wird jeder Wind geboren.' },
      { who: 'kanonier', text: 'Und jeder Wind, den wir unterwegs fangen, bringt uns ein Stück näher. Also los, Käpt’n.' },
      { who: 'erzaehler', text: 'Jede erledigte Gewohnheit füllt die Segel mit Wind. Mit Wind segelst du von Feld zu Feld.' },
    ],
  },
  {
    id: 'k1_palmen',
    title: 'Das Schild am Strand',
    bg: 'strand',
    cast: ['jonte', 'kanonier'],
    lines: [
      { who: 'erzaehler', text: 'Auf der Palmeninsel steckt ein Schild im Sand. Es ist mit Krabbenscheren beschrieben.' },
      { who: 'kanonier', text: '„Wer hier segelt, zahlt Zoll an Fürst Schalbart. Gezeichnet: Fürst Schalbart.“' },
      { who: 'jonte', text: 'Wer ist denn dieser Schalbart?' },
      { who: 'kanonier', text: 'Ein Einsiedlerkrebs, so groß wie eine Burg. Er trägt sogar eine auf dem Rücken. Die Klippenfestung.' },
      { who: 'jonte', text: 'Na, dann zahlen wir eben nicht.' },
      { who: 'erzaehler', text: 'Unter dem Schild liegt ein vergessener Beutel mit Münzen. Zoll, den nie jemand abgeholt hat.' },
    ],
    reward: { gold: 15 },
  },
  {
    id: 'k1_gabel',
    title: 'Zwei Wege',
    bg: 'strand',
    cast: ['jonte', 'kanonier'],
    lines: [
      { who: 'erzaehler', text: 'Vor euch teilt sich das Wasser. Links glitzern flache Untiefen, rechts liegt ein Felsen voller Robben.' },
      { who: 'kanonier', text: 'Links könnte was im Sand liegen. Rechts sieht’s aus, als hätten die Robben was gefunden.' },
    ],
    choice: {
      prompt: 'Welchen Weg nimmst du?',
      options: [
        { label: 'Durch die Untiefen', text: 'Im flachen Wasser liegen alte Münzen. Bolle fischt sie mit dem Kanonenwischer heraus.', reward: { gold: 30 } },
        { label: 'Am Robbenfelsen vorbei', text: 'Eine Robbe schiebt euch ein Bündel zu und will dafür nur gekrault werden.', reward: { item: true } },
      ],
    },
  },
  {
    id: 'k1_mara',
    title: 'Die Navigatorin',
    bg: 'strand',
    cast: ['jonte', 'navigatorin'],
    lines: [
      { who: 'erzaehler', text: 'Auf dem Riff sitzt eine junge Frau neben einem kaputten Ruderboot. Sie zeichnet in eine Karte.' },
      { who: 'navigatorin', text: 'Ihr seid nicht von Schalbart? Gut. Dann muss ich euch nicht mit dem Degen begrüßen.' },
      { who: 'jonte', text: 'Ich bin Jonte, Kapitän. Und du?' },
      { who: 'navigatorin', text: 'Mara. Schalbart hat mich ein Jahr lang Karten für seine Zollwege zeichnen lassen. Heute Nacht bin ich abgehauen.' },
      { who: 'navigatorin', text: 'Er hat etwas, das mir gehört: ein Stück der Windkarte. Sie zeigt den Weg zur Windquelle.' },
      { who: 'jonte', text: 'Zur Windquelle? Da wollen wir hin! Komm mit uns. Wir holen dir das Stück zurück.' },
      { who: 'navigatorin', text: 'Ein Kapitän ohne Navigatorin? Ihr hättet das Riff nie gefunden. Abgemacht.' },
    ],
    join: 'navigatorin',
  },
  {
    id: 'k1_sturm',
    title: 'Sturmfront',
    bg: 'strand',
    cast: ['kanonier', 'navigatorin'],
    lines: [
      { who: 'erzaehler', text: 'Der Himmel wird schwarz. Wellen schlagen über das Deck.' },
      { who: 'navigatorin', text: 'Ruder hart Steuerbord! Hinter der Welle ist es ruhig!' },
      { who: 'kanonier', text: 'Ich halte die Kanone fest! Und das Fass da! Und ... was ist das für ein Fass?' },
      { who: 'erzaehler', text: 'Als der Sturm vorbei ist, steht ein fremdes Fass an Deck. Darin klimpert es.' },
    ],
    reward: { gold: 25, item: true },
  },
  {
    id: 'k1_boss',
    title: 'Die Klippenfestung',
    bg: 'strand',
    cast: ['jonte', 'schalbart'],
    lines: [
      { who: 'erzaehler', text: 'Die Klippe bewegt sich. Unter dem Fels kommen Scheren hervor, dann zwei wütende Augen.' },
      { who: 'schalbart', text: 'Wer wagt es, ohne Zoll durch MEINE Gewässer zu segeln?' },
      { who: 'jonte', text: 'Kapitän Jonte. Wir wollen Maras Kartenstück zurück.' },
      { who: 'schalbart', text: 'Die kleine Kartenzeichnerin! Hohoho. Holt es euch doch, wenn ihr durch mein Haus kommt.' },
      { who: 'navigatorin', text: 'Achtung: Solange sein Schneckenhaus ganz ist, prallt viel ab. Und wenn er wütend wird, kommt die Ankerflut.' },
      { who: 'erzaehler', text: 'Du hast drei Versuche pro Tag. Wird es zu schwer: Geh auf Beutezug, sammle Erfahrung und bessere Ausrüstung.' },
    ],
  },
  {
    id: 'k1_ende',
    title: 'Das erste Kartenstück',
    bg: 'strand',
    cast: ['jonte', 'navigatorin'],
    lines: [
      { who: 'schalbart', text: 'Schon gut, schon gut! Nehmt euer Papier. Mein Haus ist ganz zerkratzt ...' },
      { who: 'erzaehler', text: 'Schalbart zieht sich in sein Schneckenhaus zurück. Nur der Bart schaut noch heraus.' },
      { who: 'navigatorin', text: 'Das erste Stück der Windkarte. Seht ihr die Linie? Sie führt nach Norden, mitten in den Nebel.' },
      { who: 'kanonier', text: 'Ins Nebelriff? Da fahren nicht mal Geister freiwillig hin.' },
      { who: 'jonte', text: 'Dann sind wir eben die Ersten. Kurs Nord!' },
    ],
    reward: { gold: 50 },
  },

  // ---------------- Kapitel 2: Das Nebelriff ----------------
  {
    id: 'k2_intro',
    title: 'Im Nebel',
    bg: 'nebel',
    cast: ['jonte', 'navigatorin'],
    lines: [
      { who: 'erzaehler', text: 'Der Nebel ist so dicht, dass man die eigene Hand kaum sieht. Irgendwo läutet eine Glocke.' },
      { who: 'navigatorin', text: 'Die Sterne sind weg. Ich navigiere nach Gefühl und nach der Karte.' },
      { who: 'kanonier', text: 'Hört ihr das? Diese Glocke. Sie läutet immer, wenn ich nicht hinsehe.' },
      { who: 'jonte', text: 'Laut der Karte liegt das zweite Stück irgendwo in diesem Riff. Augen auf, Crew.' },
    ],
  },
  {
    id: 'k2_leuchtturm',
    title: 'Der dunkle Leuchtturm',
    bg: 'nebel',
    cast: ['jonte', 'navigatorin'],
    lines: [
      { who: 'erzaehler', text: 'Auf einer Felsnadel steht ein Leuchtturm. Sein Licht ist aus. Oben winkt eine alte Frau mit Laterne.' },
      { who: 'waerterin', text: 'Besuch! Seit Jahren kommt keiner mehr. Nicht, seit Kapitän Grauhand im Riff wohnt.' },
      { who: 'jonte', text: 'Grauhand?' },
      { who: 'waerterin', text: 'Ein Kapitän, der seine Crew im Nebel verloren hat. Jetzt läutet er die Totenglocke, und die Geister gehorchen ihm.' },
      { who: 'waerterin', text: 'Er hat etwas in seiner Höhle versteckt. Ein Stück Papier, auf das er immer starrt. Nehmt das hier, ihr werdet’s brauchen.' },
    ],
    reward: { item: true },
  },
  {
    id: 'k2_wirbel',
    title: 'Nebelwirbel',
    bg: 'nebel',
    cast: ['navigatorin', 'kanonier'],
    lines: [
      { who: 'erzaehler', text: 'Der Nebel dreht sich im Kreis wie Wasser im Abfluss. Das Schiff dreht sich mit.' },
      { who: 'navigatorin', text: 'Nicht gegenan steuern! Mitdrehen und dann raus!' },
      { who: 'kanonier', text: 'Mir wird schlecht. Mir wird ... oh, da treibt was!' },
      { who: 'erzaehler', text: 'Am Rand des Wirbels kreist eine verlorene Seemannskiste. Bolle angelt sie mit einem Tau heraus.' },
    ],
    reward: { item: true },
  },
  {
    id: 'k2_grummel',
    title: 'Der Smutje',
    bg: 'nebel',
    cast: ['jonte', 'smutje'],
    lines: [
      { who: 'erzaehler', text: 'Über der Rauchinsel hängt kein Nebel. Nur Rauch. Und er riecht nach Eintopf.' },
      { who: 'smutje', text: 'Wer da? Wenn ihr Geister seid: Raus aus meiner Küche! Die vertragen meinen Pfeffer nicht.' },
      { who: 'jonte', text: 'Wir sind keine Geister. Nur hungrig.' },
      { who: 'smutje', text: 'Hungrig, sagt er. Grummel heiß ich. Mein Schiff hat Grauhand geholt. Seitdem koche ich hier gegen die Geister an.' },
      { who: 'kanonier', text: '... Das ist der beste Eintopf, den ich je gegessen habe. Käpt’n. KÄPT’N. Wir brauchen ihn.' },
      { who: 'smutje', text: 'Ihr wollt zu Grauhand? Dann komm ich mit. Ich hab noch eine Rechnung mit dem offen. Und einen Kessel.' },
    ],
    join: 'smutje',
  },
  {
    id: 'k2_wrack',
    title: 'Das alte Wrack',
    bg: 'nebel',
    cast: ['jonte', 'smutje'],
    lines: [
      { who: 'erzaehler', text: 'Halb im Riff steckt ein Wrack. Die Galionsfigur schaut traurig ins Wasser.' },
      { who: 'smutje', text: 'Das war mal die „Fette Forelle“. Mein altes Schiff. Die Kombüse ist noch heil!' },
      { who: 'erzaehler', text: 'Grummel holt seine Lieblingspfanne und eine Truhe aus dem Wrack.' },
    ],
    reward: { gold: 40, item: true },
  },
  {
    id: 'k2_boss',
    title: 'Die Glockenhöhle',
    bg: 'nebel',
    cast: ['jonte', 'grauhand'],
    lines: [
      { who: 'erzaehler', text: 'In der Höhle hängt eine riesige Glocke. Davor schwebt ein Kapitän aus Nebel und Seetang.' },
      { who: 'grauhand', text: 'Lebende. Wie lange ist das her ... Ihr kommt wegen des Papiers. Alle kommen wegen des Papiers.' },
      { who: 'jonte', text: 'Es ist ein Stück der Windkarte. Wir brauchen es, um die Windquelle zu finden.' },
      { who: 'grauhand', text: 'Die Windquelle. Die habe ich auch gesucht. Meine Crew hat sie nie gesehen. Ihr auch nicht.' },
      { who: 'navigatorin', text: 'Vorsicht: Im Nebel ist er schwer zu treffen. Wenn er die Totenglocke läutet, unterbrich ihn!' },
    ],
  },
  {
    id: 'k2_ende',
    title: 'Der Ausguck',
    bg: 'nebel',
    cast: ['jonte', 'ausguck'],
    lines: [
      { who: 'erzaehler', text: 'Die Glocke bekommt einen Riss. Der Nebel fällt in sich zusammen, und zum ersten Mal scheint die Sonne ins Riff.' },
      { who: 'grauhand', text: 'Meine Crew ... sie ist frei. Nehmt die Karte. Und findet, was ich nicht gefunden habe.' },
      { who: 'erzaehler', text: 'Von oben aus der Höhle plumpst ein Junge mit Mütze und Fernrohr. Auf seiner Schulter schimpft ein grüner Papagei.' },
      { who: 'ausguck', text: 'Autsch. Ich bin Pip. Ich hab euch die ganze Zeit beobachtet. Vom Leuchtturm, von den Felsen, von überall.' },
      { who: 'ausguck', text: 'Ich sehe Sachen, bevor sie passieren. Fast. Und ich will auf ein richtiges Schiff. Bitte?' },
      { who: 'jonte', text: 'Ein Ausguck hat uns noch gefehlt. Willkommen an Bord, Pip.' },
      { who: 'navigatorin', text: 'Das zweite Kartenstück passt an das erste. Die Linie führt weiter nach Osten. Dorthin, wo der Horizont glüht.' },
    ],
    join: 'ausguck',
    reward: { gold: 80 },
  },
]

export const STORIES: Record<string, Story> = Object.fromEntries(S.map((s) => [s.id, s]))
