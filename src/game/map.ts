export type FieldKind = 'start' | 'truhe' | 'insel' | 'wrack' | 'gabel' | 'gegner' | 'hafen' | 'sturm' | 'boss'

export interface Field {
  kind: FieldKind
  name: string
  x: number
  y: number
  /** Zwischenpunkte auf dem Weg HIN zu diesem Feld (Kartenpixel 1200 x 896) */
  via?: [number, number][]
  /** Kampf auf diesem Feld (Encounter-id aus game/foes). Auf Truhenfeldern: bewachte Truhe, sie oeffnet sich erst nach dem Sieg. */
  enc?: string
  /** Story-Szene (id aus game/story). Auf Sturm-Feldern: Schluessel des Zufallsereignisses (game/events). */
  story?: string
  /** Truhenart auf Truhenfeldern (Standard: Holz) */
  chest?: 'holz' | 'silber' | 'gold'
}

export const MAP_W = 1200
export const MAP_H = 896

/**
 * Kapitel 1: 20 Felder (Phase 6: Route verlaengert, damit ein Kapitel etwa 1,5 Wochen dauert).
 * Felder liegen auf dem gemalten Weg der Seekarte.
 */
export const CHAPTER_1: Field[] = [
  { kind: 'start', name: 'Starthafen', x: 318, y: 686, story: 'k1_intro' },
  { kind: 'truhe', name: 'Strandtruhe', x: 330, y: 560, via: [[352, 625]], chest: 'holz' },
  { kind: 'truhe', name: 'Muschelstrand', x: 271, y: 496, via: [[300, 529]], chest: 'holz', enc: 'moewenspaeher' },
  { kind: 'insel', name: 'Palmeninsel', x: 270, y: 413, via: [[259, 455]], story: 'k1_palmen' },
  { kind: 'sturm', name: 'Böenfeld', x: 362, y: 420, via: [[316, 415]], story: 'k1_boeen' },
  { kind: 'gegner', name: 'Möwenwrack', x: 448, y: 452, via: [[405, 435]], enc: 'moewen' },
  { kind: 'insel', name: 'Kokosinsel', x: 565, y: 402, via: [[507, 429]], story: 'k1_kokos' },
  { kind: 'truhe', name: 'Schatzinsel', x: 672, y: 333, via: [[619, 369]], chest: 'silber' },
  { kind: 'truhe', name: 'Felsenspalt', x: 747, y: 373, via: [[710, 352]], chest: 'holz', enc: 'moewennest' },
  { kind: 'gabel', name: 'Weggabelung', x: 752, y: 450, via: [[764, 409]], story: 'k1_gabel' },
  { kind: 'truhe', name: 'Korallengarten', x: 691, y: 519, via: [[722, 485]], chest: 'silber' },
  { kind: 'insel', name: 'Riff', x: 625, y: 585, via: [[658, 552]], story: 'k1_mara' },
  { kind: 'insel', name: 'Strudelbucht', x: 619, y: 709, via: [[610, 647]], story: 'k1_kurs' },
  { kind: 'gegner', name: 'Krabbenbande', x: 731, y: 757, via: [[668, 747]], enc: 'krabbenbande' },
  { kind: 'hafen', name: 'Handelsschiff', x: 880, y: 728, via: [[805, 750]] },
  { kind: 'truhe', name: 'Flaschenhals', x: 952, y: 688, via: [[918, 711]], chest: 'holz' },
  { kind: 'sturm', name: 'Sturmfront', x: 1000, y: 620, via: [[978, 655]], story: 'k1_sturm' },
  { kind: 'gegner', name: 'Zackenriff', x: 1049, y: 551, via: [[1026, 586]], enc: 'riffbande' },
  { kind: 'truhe', name: 'Treibgut', x: 1075, y: 470, via: [[1064, 511]], chest: 'holz' },
  { kind: 'boss', name: 'Klippenfestung', x: 1007, y: 328, via: [[1065, 390]], enc: 'schalbart', story: 'k1_boss' },
]

/** Kapitel 2: Nebelriff, 26 Felder. Die Route schlaengelt sich in drei Bahnen nach oben. */
export const CHAPTER_2: Field[] = [
  { kind: 'start', name: 'Nebelrand', x: 190, y: 725, story: 'k2_intro' },
  { kind: 'sturm', name: 'Nebelbank', x: 295, y: 735, story: 'k2_nebelbank' },
  { kind: 'truhe', name: 'Treibende Kiste', x: 400, y: 745, chest: 'holz' },
  { kind: 'insel', name: 'Glockenboje', x: 505, y: 773, story: 'k2_boje' },
  { kind: 'gegner', name: 'Quallenbucht', x: 610, y: 800, enc: 'quallen' },
  { kind: 'truhe', name: 'Algenfeld', x: 745, y: 790, chest: 'holz' },
  { kind: 'insel', name: 'Leuchtturm', x: 880, y: 780, story: 'k2_leuchtturm' },
  { kind: 'truhe', name: 'Klippenspalt', x: 995, y: 680, chest: 'silber', enc: 'quallenwacht' },
  { kind: 'hafen', name: 'Nebelhafen', x: 1110, y: 580 },
  { kind: 'truhe', name: 'Muschelbank', x: 1060, y: 450, chest: 'silber' },
  { kind: 'truhe', name: 'Nebelboje', x: 930, y: 475, chest: 'holz' },
  { kind: 'gegner', name: 'Geisterfelsen', x: 800, y: 500, enc: 'geistertrupp' },
  { kind: 'truhe', name: 'Versunkener Kahn', x: 700, y: 530, chest: 'holz' },
  { kind: 'sturm', name: 'Nebelwirbel', x: 600, y: 560, story: 'k2_wirbel' },
  { kind: 'truhe', name: 'Seegraswiese', x: 465, y: 560, chest: 'silber', enc: 'geisterwacht' },
  { kind: 'insel', name: 'Rauchinsel', x: 330, y: 560, story: 'k2_grummel' },
  { kind: 'insel', name: 'Pfefferfelsen', x: 290, y: 490, story: 'k2_pfeffer' },
  { kind: 'truhe', name: 'Versunkene Truhe', x: 250, y: 420, chest: 'silber' },
  { kind: 'sturm', name: 'Stille Strömung', x: 335, y: 325, story: 'k2_stroemung' },
  { kind: 'gegner', name: 'Geisterschiff', x: 420, y: 230, enc: 'geisterschiff' },
  { kind: 'truhe', name: 'Planke mit Kiste', x: 505, y: 260, chest: 'holz' },
  { kind: 'wrack', name: 'Altes Wrack', x: 589, y: 290, story: 'k2_wrack' },
  { kind: 'gegner', name: 'Leuchtende Tiefe', x: 695, y: 245, enc: 'tiefseetrupp' },
  { kind: 'truhe', name: 'Schmugglerversteck', x: 800, y: 200, chest: 'gold' },
  { kind: 'truhe', name: 'Glockenriff', x: 920, y: 185, chest: 'holz' },
  { kind: 'boss', name: 'Glockenhöhle', x: 1040, y: 170, enc: 'grauhand', story: 'k2_boss' },
]

/** Kapitel 3: Glutinseln, 30 Felder. Start im Hafen unten links, Boss in der Feuerhoehle oben rechts. */
export const CHAPTER_3: Field[] = [
  { kind: 'start', name: 'Glutbucht', x: 270, y: 735, story: 'k3_intro' },
  { kind: 'truhe', name: 'Schlackefeld', x: 210, y: 675, chest: 'holz' },
  { kind: 'insel', name: 'Bolles Dorf', x: 150, y: 615, story: 'k3_dorf' },
  { kind: 'sturm', name: 'Aschewolke', x: 240, y: 578, story: 'k3_asche' },
  { kind: 'truhe', name: 'Aschestrand', x: 330, y: 540, chest: 'holz' },
  { kind: 'truhe', name: 'Bimssteinbucht', x: 278, y: 468, chest: 'holz' },
  { kind: 'gegner', name: 'Schwarzer Strand', x: 225, y: 395, enc: 'glutkrabben' },
  { kind: 'insel', name: 'Heiße Quelle', x: 263, y: 310, story: 'k3_quelle' },
  { kind: 'hafen', name: 'Feuerhafen', x: 300, y: 225 },
  { kind: 'truhe', name: 'Obsidiansplitter', x: 360, y: 287, chest: 'silber' },
  { kind: 'truhe', name: 'Funkenklippe', x: 420, y: 348, chest: 'holz', enc: 'funkennest' },
  { kind: 'gabel', name: 'Glutgabelung', x: 480, y: 410, story: 'k3_gabel' },
  { kind: 'truhe', name: 'Lavaglas', x: 565, y: 440, chest: 'holz' },
  { kind: 'truhe', name: 'Glühender Fels', x: 650, y: 470, chest: 'silber' },
  { kind: 'sturm', name: 'Glutregen', x: 605, y: 555, story: 'k3_glutregen' },
  { kind: 'gegner', name: 'Lavabucht', x: 560, y: 640, enc: 'aschetrupp' },
  { kind: 'truhe', name: 'Schwefelbucht', x: 660, y: 680, chest: 'holz' },
  { kind: 'sturm', name: 'Feuerfontäne', x: 760, y: 720, story: 'k3_sturm' },
  { kind: 'insel', name: 'Lavaküche', x: 855, y: 670, story: 'k3_kueche' },
  { kind: 'wrack', name: 'Laternenboot', x: 950, y: 620, story: 'k3_wrack' },
  { kind: 'truhe', name: 'Rußfelsen', x: 955, y: 545, chest: 'silber' },
  { kind: 'gegner', name: 'Obsidianhöhle', x: 960, y: 470, enc: 'obsidianwache' },
  { kind: 'truhe', name: 'Glasstrand', x: 875, y: 415, chest: 'holz' },
  { kind: 'insel', name: 'Aschehang', x: 790, y: 360, story: 'k3_pip' },
  { kind: 'truhe', name: 'Kraterrand', x: 705, y: 305, chest: 'holz', enc: 'aschewacht' },
  { kind: 'truhe', name: 'Vulkanschatz', x: 620, y: 250, chest: 'gold' },
  { kind: 'gegner', name: 'Schneckenpfad', x: 730, y: 220, enc: 'schneckenfeld' },
  { kind: 'truhe', name: 'Rauchklippe', x: 840, y: 190, chest: 'silber' },
  { kind: 'truhe', name: 'Glutnest', x: 935, y: 225, chest: 'holz' },
  { kind: 'boss', name: 'Feuerhöhle', x: 1030, y: 260, enc: 'zunder', story: 'k3_boss' },
]

export interface Chapter {
  n: number
  name: string
  /** Seekarte (Bild-Schluessel in assets) */
  art: 'kap1' | 'kap2' | 'kap3'
  fields: Field[]
  /** Hoechste Stufe in diesem Kapitel */
  cap: number
  /** Kaempfe fuer Beutezuege vor dem Boss */
  farm: string[]
  /** Szene nach dem Bosssieg */
  outro: string
}

export const CHAPTERS: Chapter[] = [
  { n: 1, name: 'Die Krabbenküste', art: 'kap1', fields: CHAPTER_1, cap: 5, farm: ['moewen', 'riffbande', 'krabbenbande'], outro: 'k1_ende' },
  { n: 2, name: 'Das Nebelriff', art: 'kap2', fields: CHAPTER_2, cap: 10, farm: ['quallen', 'tiefseetrupp', 'geistertrupp', 'geisterschiff'], outro: 'k2_ende' },
  { n: 3, name: 'Die Glutinseln', art: 'kap3', fields: CHAPTER_3, cap: 15, farm: ['glutkrabben', 'funkenschwarm', 'schneckenfeld', 'aschetrupp', 'obsidianwache'], outro: 'k3_ende' },
]

export const chapterOf = (n: number | undefined): Chapter => CHAPTERS[Math.min(CHAPTERS.length, Math.max(1, n ?? 1)) - 1]

export const FIELD_TEXT: Record<FieldKind, string> = {
  start: 'Hier beginnt die Reise.',
  truhe: 'Eine Truhe! Was ist wohl drin?',
  insel: 'Hier wartet eine Geschichte.',
  wrack: 'Ein altes Wrack. Vielleicht ist noch etwas zu holen.',
  gabel: 'Der Weg teilt sich. Du musst dich entscheiden.',
  gegner: 'Gegner voraus! Erst nach einem Sieg geht es weiter.',
  hafen: 'Ein Handelsschiff mit Hafenladen. Hier kannst du einkaufen.',
  sturm: 'Ein Sturm zieht auf. Mal sehen, was er bringt.',
  boss: 'Der Kapitelboss wartet.',
}

type P = [number, number]

/** Punkte des Wegs von Feld i nach Feld i+1 (inklusive beider Felder) */
function legPoints(fields: Field[], i: number): P[] {
  const a = fields[i]
  const b = fields[i + 1]
  return [[a.x, a.y], ...(b.via ?? []), [b.x, b.y]]
}

function catmull(p0: P, p1: P, p2: P, p3: P, t: number): P {
  const t2 = t * t
  const t3 = t2 * t
  const f = (a: number, b: number, c: number, d: number) =>
    0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
  return [f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]
}

/** Glatter Weg mit gleichmaessigen Abstaenden */
export function legPath(fields: Field[], i: number, steps = 60): P[] {
  const pts = legPoints(fields, i)
  const raw: P[] = []
  for (let s = 0; s < pts.length - 1; s++) {
    const p0 = pts[Math.max(0, s - 1)]
    const p3 = pts[Math.min(pts.length - 1, s + 2)]
    for (let k = 0; k < steps; k++) raw.push(catmull(p0, pts[s], pts[s + 1], p3, k / steps))
  }
  raw.push(pts[pts.length - 1])
  return raw
}

export function routeSvgPath(fields: Field[]): string {
  let d = ''
  for (let i = 0; i < fields.length - 1; i++) {
    const pts = legPath(fields, i, 16)
    d += (i === 0 ? 'M' : 'L') + pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L')
  }
  return d
}

/** Position entlang eines Wegs bei Anteil t (0..1), nach Laenge */
export function pointAt(path: P[], t: number): { x: number; y: number; dx: number } {
  const lens = [0]
  for (let i = 1; i < path.length; i++) {
    lens.push(lens[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]))
  }
  const target = lens[lens.length - 1] * Math.min(1, Math.max(0, t))
  let i = 1
  while (i < lens.length - 1 && lens[i] < target) i++
  const seg = lens[i] - lens[i - 1] || 1
  const u = (target - lens[i - 1]) / seg
  const x = path[i - 1][0] + (path[i][0] - path[i - 1][0]) * u
  const y = path[i - 1][1] + (path[i][1] - path[i - 1][1]) * u
  return { x, y, dx: path[i][0] - path[i - 1][0] }
}
