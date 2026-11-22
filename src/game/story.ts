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
  bg: 'strand' | 'nebel' | 'glut'
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
  tante: 'Tante Glimma',
  papagei: 'Papagei',
  zunder: 'Zunder',
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
  // ---------------- Kapitel 3: Die Glutinseln ----------------
  {
    id: 'k3_intro',
    title: 'Glut am Horizont',
    bg: 'glut',
    cast: ['jonte', 'kanonier'],
    lines: [
      { who: 'erzaehler', text: 'Das Meer wird warm. Am Horizont glüht ein Vulkan, und Asche rieselt wie grauer Schnee aufs Deck.' },
      { who: 'navigatorin', text: 'Die Glutinseln. Das dritte Kartenstück liegt hier irgendwo, ganz hinten in einer Höhle.' },
      { who: 'jonte', text: 'Bolle? Du bist so still. Sonst redest du beim Anlegen immer übers Frühstück.' },
      { who: 'kanonier', text: 'Ich ... kenne diese Bucht, Käpt’n. Hier bin ich aufgewachsen. Bis der Berg Feuer gespuckt hat.' },
      { who: 'ausguck', text: 'Da drüben am Ufer winkt jemand. Mit einem Kochlöffel.' },
    ],
  },
  {
    id: 'k3_dorf',
    title: 'Bolles Dorf',
    bg: 'glut',
    cast: ['kanonier', 'smutje'],
    lines: [
      { who: 'erzaehler', text: 'Zwischen schwarzen Felsen stehen kleine Häuser. Eine kräftige Frau rennt auf Bolle zu.' },
      { who: 'tante', text: 'Bolle! Mein kleiner Bolle! Du bist ja riesig geworden! Hast du auch immer ordentlich gefrühstückt?' },
      { who: 'kanonier', text: 'Zweimal am Tag, Tante Glimma. Mindestens.' },
      { who: 'tante', text: 'Dann nimm das hier mit. Das Rezept für unser Feuerpulver. Und was Warmes für unterwegs.' },
      { who: 'smutje', text: 'Ein Rezept? Darf ich ... nur mal kurz lesen? Für die Kombüse natürlich.' },
      { who: 'kanonier', text: 'Grummel. Das ist für die Kanone, nicht für den Eintopf.' },
    ],
    reward: { gold: 40, item: true },
  },
  {
    id: 'k3_gabel',
    title: 'Lava oder Asche',
    bg: 'glut',
    cast: ['navigatorin', 'kanonier'],
    lines: [
      { who: 'erzaehler', text: 'Links fließt ein Lavastrom ins Meer und lässt das Wasser zischen. Rechts liegt eine graue, stille Ascheküste.' },
      { who: 'navigatorin', text: 'Beide Wege führen weiter. Der Lavastrom ist heiß, aber schnell.' },
      { who: 'kanonier', text: 'An der Ascheküste haben wir als Kinder nach Schätzen gegraben. Meistens Muscheln. Manchmal nicht.' },
    ],
    choice: {
      prompt: 'Welchen Weg nimmst du?',
      options: [
        { label: 'Am Lavastrom entlang', text: 'In der Hitze schmelzen alte Goldmünzen aus dem Gestein. Mara sammelt sie mit dem Kescher ein.', reward: { gold: 70 } },
        { label: 'Über die Ascheküste', text: 'Bolle gräbt an seiner alten Stelle und findet eine Kiste, die nicht nach Muscheln klingt.', reward: { item: true } },
      ],
    },
  },
  {
    id: 'k3_wrack',
    title: 'Das Laternenboot',
    bg: 'glut',
    cast: ['jonte', 'ausguck'],
    lines: [
      { who: 'erzaehler', text: 'Auf einer Sandbank liegt ein ausgebranntes Boot. Am Bug hängt ein Wappen mit einer Laterne.' },
      { who: 'jonte', text: 'Eine Laterne. Wie beim Leuchtturm im Nebelriff. Komischer Zufall.' },
      { who: 'ausguck', text: 'Das ist kein ... ich meine ... können wir einfach weiterfahren? Bitte?' },
      { who: 'smutje', text: 'Der Junge ist ja ganz blass. Hier, nimm ein Stück Brot.' },
      { who: 'erzaehler', text: 'Unter einer Planke liegt eine Kiste. Pip schaut sie nicht an.' },
    ],
    reward: { gold: 50, item: true },
  },
  {
    id: 'k3_pip',
    title: 'Pip will etwas sagen',
    bg: 'glut',
    cast: ['ausguck', 'navigatorin'],
    lines: [
      { who: 'erzaehler', text: 'Am Abend sitzt Pip ganz oben im Mast und starrt Richtung Westen, wo der Nebel liegt.' },
      { who: 'ausguck', text: 'Mara? Ich hab manchmal Bilder im Kopf. Von Sachen, die noch nicht passiert sind. Und jetzt sehe ich ...' },
      { who: 'navigatorin', text: 'Was siehst du, Pip?' },
      { who: 'kanonier', text: 'Essen ist fertig! Grummel hat das Feuerpulver-Rezept ausprobiert. Es ist ... scharf.' },
      { who: 'ausguck', text: 'Ach, nichts. Ist bestimmt nichts.' },
    ],
  },
  {
    id: 'k3_boss',
    title: 'Der Wächter der Glut',
    bg: 'glut',
    cast: ['jonte', 'zunder'],
    lines: [
      { who: 'erzaehler', text: 'Tief in der Höhle glüht das dritte Kartenstück auf einem Stein. Davor steht ein Feuersalamander mit Speer.' },
      { who: 'zunder', text: 'Halt. Ich bin Zunder. Ich bewache dieses Stück, seit der Berg es ausgespuckt hat.' },
      { who: 'jonte', text: 'Wir brauchen es, um die Windquelle zu finden. Wir wollen niemandem schaden.' },
      { who: 'zunder', text: 'Das hat die mit der Laterne auch gesagt. Sie war hier. Ihr gebt ihr nichts. Zeigt mir, dass euer Wind echt ist.' },
      { who: 'navigatorin', text: 'Wenn er seine Feuerwalze holt, unterbrich ihn! Ab der Hälfte schützt ihn ein Glutpanzer.' },
    ],
  },
  {
    id: 'k3_ende',
    title: 'Die Karte',
    bg: 'glut',
    cast: ['navigatorin', 'ausguck'],
    lines: [
      { who: 'zunder', text: 'Euer Wind ist echt. Nehmt das Stück. Aber passt auf die Laterne auf.' },
      { who: 'erzaehler', text: 'An Deck legt Mara drei Kartenstücke aneinander. Die Ränder schmelzen zusammen, und die Karte beginnt zu leuchten.' },
      { who: 'navigatorin', text: 'Seht ihr? Eine Linie quer übers Meer. Das ist der Weg zur Windquelle!' },
      { who: 'erzaehler', text: 'Da erstirbt der Wind. Die Segel hängen schlaff. Auf dem Achterdeck steht eine alte Frau mit Laterne.' },
      { who: 'waerterin', text: 'Danke, Kinder. Ihr habt mehr gefunden als alle vor euch. Ab hier übernehme ich.' },
      { who: 'erzaehler', text: 'Ein kalter Nebel zieht über das Deck. Als er sich hebt, sind Oda und die Karte verschwunden.' },
      { who: 'ausguck', text: 'Ich hab’s gesehen. Ich hab’s die ganze Zeit gesehen. Und ich hab’s nicht gesagt.' },
      { who: 'jonte', text: 'Dann holen wir sie uns zurück, Pip. Zusammen. Ohne Karte, wenn’s sein muss.' },
    ],
    reward: { gold: 120 },
  },
  // ---------------- Phase 6: kurze Szenen auf den verlaengerten Routen ----------------
  {
    id: 'k1_kokos',
    title: 'Die Kokos-Kanone',
    bg: 'strand',
    cast: ['jonte', 'kanonier'],
    lines: [
      { who: 'erzaehler', text: 'Auf der kleinen Insel steht eine einzige Palme. Ganz oben hängen drei riesige Kokosnüsse.' },
      { who: 'kanonier', text: 'Käpt’n, ich hab eine Idee. Sie hat mit der Kanone zu tun.' },
      { who: 'jonte', text: 'Das sagst du jedes Mal. Und jedes Mal brennt danach etwas.' },
      { who: 'erzaehler', text: 'Bumm. Die Palme wackelt. Zwei Kokosnüsse fallen ins Wasser, die dritte auf Jontes Hut.' },
      { who: 'kanonier', text: 'Moment, da hing noch was im Wipfel. Ein Beutel! Den hat wohl eine Möwe versteckt.' },
    ],
    reward: { item: true },
  },
  {
    id: 'k1_kurs',
    title: 'Maras Kurs',
    bg: 'strand',
    cast: ['navigatorin', 'kanonier'],
    lines: [
      { who: 'erzaehler', text: 'In der Bucht dreht sich das Wasser im Kreis. Das Schiff dreht sich mit.' },
      { who: 'jonte', text: 'Volle Kraft geradeaus!' },
      { who: 'navigatorin', text: 'Geradeaus ist genau falsch. Zwei Striche Backbord, dann mit der Strömung raus. Vertrau mir.' },
      { who: 'kanonier', text: 'Mir ist schlecht. Ich hab zweimal gefrühstückt, und beide Frühstücke drehen sich gerade mit.' },
      { who: 'erzaehler', text: 'Maras Kurs passt. Am Rand des Strudels treibt ein Beutel mit Münzen, den sich das Wasser geholt hatte.' },
    ],
    reward: { gold: 35 },
  },
  {
    id: 'k2_boje',
    title: 'Die sprechende Boje',
    bg: 'nebel',
    cast: ['jonte', 'navigatorin'],
    lines: [
      { who: 'erzaehler', text: 'Aus dem Nebel taucht eine rostige Boje auf. Darauf sitzt ein grüner Papagei.' },
      { who: 'papagei', text: 'Quallen voraus! Quallen voraus! Krah!' },
      { who: 'kanonier', text: 'Hat der Vogel gerade mit uns geredet?' },
      { who: 'navigatorin', text: 'Papageien plappern nach, was sie hören. Die Frage ist, von wem er das hat.' },
      { who: 'erzaehler', text: 'Der Papagei flattert in den Nebel davon. An der Boje hängt ein Netz, und darin zappelt etwas Glänzendes.' },
    ],
    reward: { item: true },
  },
  {
    id: 'k2_pfeffer',
    title: 'Pfeffer gegen Geister',
    bg: 'nebel',
    cast: ['smutje', 'kanonier'],
    lines: [
      { who: 'erzaehler', text: 'Kaum ist Grummel an Bord, riecht das ganze Schiff nach Pfeffer und Zwiebeln.' },
      { who: 'smutje', text: 'Geister hassen drei Dinge: Licht, Lärm und meinen Pfeffer. Darum streue ich ihn überall hin.' },
      { who: 'kanonier', text: 'Auch in meine Kanone?' },
      { who: 'smutje', text: 'Besonders in deine Kanone. Wenn die knallt, niest das ganze Riff.' },
      { who: 'navigatorin', text: 'Solange wir dafür nicht mehr in den Nebel horchen müssen, ist mir alles recht.' },
    ],
    reward: { gold: 45 },
  },
  {
    id: 'k3_quelle',
    title: 'Die heiße Quelle',
    bg: 'glut',
    cast: ['smutje', 'kanonier'],
    lines: [
      { who: 'erzaehler', text: 'Zwischen den schwarzen Felsen dampft eine Quelle. Das Wasser blubbert wie ein Kochtopf.' },
      { who: 'smutje', text: 'Ein Kochtopf, den die Natur gemacht hat! Pip, gib mir die Eier.' },
      { who: 'ausguck', text: 'Welche Eier? Die hab ich vorhin gegessen. Alle zwölf. Roh.' },
      { who: 'kanonier', text: 'Als Kinder haben wir hier Muscheln gekocht. Und Goldstücke gesucht, die der Berg ausspuckt.' },
      { who: 'erzaehler', text: 'Am Grund der Quelle glitzert es tatsächlich. Grummel fischt die Münzen mit der Kelle heraus.' },
    ],
    reward: { gold: 60 },
  },
  {
    id: 'k3_kueche',
    title: 'Die Lavaküche',
    bg: 'glut',
    cast: ['smutje', 'kanonier'],
    lines: [
      { who: 'erzaehler', text: 'Auf einer flachen Insel fließt ein dünner Lavastrom direkt über einen Felsen. Grummel strahlt.' },
      { who: 'smutje', text: 'Ein Herd, der nie ausgeht! Hier bleibe ich. Ihr könnt mich auf dem Rückweg abholen.' },
      { who: 'kanonier', text: 'Und wer kocht dann für uns? Nein, nein. Du kommst mit. Ich trag dich notfalls.' },
      { who: 'navigatorin', text: 'Bevor hier jemand getragen wird: Hinter dem Felsen liegt eine Kiste. Halb geschmolzen, aber zu.' },
    ],
    reward: { item: true },
  },
]

export const STORIES: Record<string, Story> = Object.fromEntries(S.map((s) => [s.id, s]))
