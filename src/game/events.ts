import type { CrewId } from './foes'
import type { Item, Rarity, Save } from './types'
import { PRICE, makeItem, seededRng } from './items'
import { pickDef } from './loot'

/**
 * Zufallsereignisse (Phase 4): auf Sturm-Feldern und mit 25 % Chance nach einem Beutezug.
 * Keines bestraft: Kaempfe lassen sich immer umfahren, eine Niederlage kostet nichts.
 */

export type EventId = 'flaschenpost' | 'haendler' | 'geisterschiff' | 'seeungeheuer' | 'delfine' | 'treibgut'

/** Chance auf ein Ereignis nach einem Beutezug */
export const EVENT_AFTER_FARM = 0.25
/** Wind von den Delfinen (ein Feld) */
export const DOLPHIN_WIND = 3

interface EventDef {
  id: EventId
  title: string
  /** Ab diesem Kapitel (Geisterschiff erst, wenn man Geistern schon begegnet ist) */
  from: number
  /** Was ein Crewmitglied sagt. Es spricht nur, wer schon an Bord ist. */
  lines: Partial<Record<CrewId, string>>
  /** Wie oft es vorkommt (Gewicht) */
  weight: number
}

export const EVENTS: Record<EventId, EventDef> = {
  flaschenpost: {
    id: 'flaschenpost',
    title: 'Flaschenpost',
    from: 1,
    weight: 3,
    lines: {
      jonte: 'Da treibt was! Eine Flasche mit Korken … und darin ein Zettel.',
      kanonier: 'Eine Flasche! Leer. Schade. Moment, da steckt ja was drin.',
      navigatorin: 'Eine Flaschenpost. Die Strömung hat sie von weit her getragen.',
      smutje: 'Wenn da mal Rum drin war, hat ihn schon jemand getrunken. Aber was ist das für ein Papier?',
      ausguck: 'Hab ich doch gesagt, dass da was glitzert! Eine Flasche!',
    },
  },
  haendler: {
    id: 'haendler',
    title: 'Händler im Nebel',
    from: 1,
    weight: 2,
    lines: {
      jonte: 'Ein Boot mit Laterne, hier draußen? Der Händler winkt uns zu.',
      kanonier: 'Da verkauft einer was mitten auf dem Meer. Hoffentlich hat er Pulver.',
      navigatorin: 'Er steht auf keiner Karte. Händler wie ihn sieht man nur einmal.',
      smutje: 'Ein schwimmender Laden. Ob er Gewürze hat? Nein. Nur glänzendes Zeug.',
      ausguck: 'Den hab ich schon von Weitem gesehen. Seine Laterne leuchtet komisch.',
    },
  },
  geisterschiff: {
    id: 'geisterschiff',
    title: 'Geisterschiff',
    from: 2,
    weight: 2,
    lines: {
      jonte: 'Grüne Segel im Nebel. Das ist kein normales Schiff.',
      kanonier: 'Das Ding hat Löcher im Rumpf und schwimmt trotzdem. Die Kanone ist geladen!',
      navigatorin: 'Es hält direkt auf uns zu. Wir können kämpfen oder abdrehen.',
      smutje: 'Geister. Schon wieder Geister. Danach koche ich mir einen Tee.',
      ausguck: 'Die haben Truhen an Deck! Ich sehe sie genau!',
    },
  },
  seeungeheuer: {
    id: 'seeungeheuer',
    title: 'Seeungeheuer!',
    from: 1,
    weight: 2,
    lines: {
      jonte: 'Das Ding ist größer als unser Schiff. Aber was glitzert da in seinem Maul?',
      kanonier: 'Ich hab eine große Kanone. Das da ist größer.',
      navigatorin: 'Wir können außen herum segeln. Oder wir holen uns, was es im Maul hat.',
      smutje: 'Tentakel. Daraus könnte man Eintopf für hundert Leute kochen.',
      ausguck: 'Ich hab’s kommen sehen! Na ja, kurz vorher.',
    },
  },
  delfine: {
    id: 'delfine',
    title: 'Delfine',
    from: 1,
    weight: 2,
    lines: {
      jonte: 'Delfine! Sie schwimmen vor dem Bug und ziehen uns mit.',
      kanonier: 'Die sind schneller als wir. Und ich glaube, sie lachen mich aus.',
      navigatorin: 'Folgt den Delfinen. Sie kennen die schnellste Strömung.',
      smutje: 'Na gut, die sind niedlich. Aber nur ein bisschen.',
      ausguck: 'Ich zähle sieben. Nein, acht! Sie zeigen uns den Weg!',
    },
  },
  treibgut: {
    id: 'treibgut',
    title: 'Treibgut',
    from: 1,
    weight: 3,
    lines: {
      jonte: 'Da treiben Fässer und eine Kiste. Fischt alles raus!',
      kanonier: 'Ein Wrack! Die Kiste da ist voller Gold, ich schwör’s!',
      navigatorin: 'Hier ist ein Schiff gesunken. Was übrig ist, gehört jetzt uns.',
      smutje: 'Fässer! Vielleicht Mehl. Oder Gold. Gold geht auch.',
      ausguck: 'Ich hab die Kiste zuerst gesehen. Also krieg ich die erste Münze.',
    },
  },
}

/** Was das Ereignis bringt */
export type EventOutcome =
  | { k: 'gold'; gold: number; text: string }
  | { k: 'hint' }
  | { k: 'wind'; wind: number }
  | { k: 'trade'; item: Item; price: number }
  | { k: 'fight'; enc: 'ereignis_seeungeheuer' | 'ereignis_geisterschiff'; hard: boolean }

export interface RolledEvent {
  id: EventId
  title: string
  speaker: CrewId
  line: string
  outcome: EventOutcome
  /** Wo es passiert: Sturm-Feld oder nach dem Beutezug */
  origin: 'feld' | 'beutezug'
  place: string
}

/** Gold waechst mit dem Kapitel */
const goldFor = (min: number, max: number, chapter: number, rnd: () => number) => Math.round((min + rnd() * (max - min)) * (1 + 0.6 * (chapter - 1)))

/**
 * Wuerfelt ein Ereignis aus. seed: fester Schluessel fuer Sturm-Felder (neu laden wuerfelt nicht neu).
 * Ohne seed zaehlt der Zufall (nach dem Beutezug).
 */
export function rollEvent(save: Save, chapter: number, origin: RolledEvent['origin'], place: string, seed?: string): RolledEvent {
  const rnd = seed ? seededRng(seed) : Math.random
  const pool = Object.values(EVENTS).filter((e) => e.from <= chapter)
  let x = rnd() * pool.reduce((s, e) => s + e.weight, 0)
  let ev = pool[pool.length - 1]
  for (const e of pool) if ((x -= e.weight) < 0) {
    ev = e
    break
  }
  const crew = (save.game.crew as CrewId[]).filter((c) => ev.lines[c])
  const speaker = crew.length ? crew[Math.floor(rnd() * crew.length)] : 'jonte'
  return { id: ev.id, title: ev.title, speaker, line: ev.lines[speaker] ?? ev.lines.jonte!, outcome: outcomeFor(ev.id, save, chapter, rnd), origin, place }
}

function outcomeFor(id: EventId, save: Save, chapter: number, rnd: () => number): EventOutcome {
  switch (id) {
    case 'flaschenpost':
      // Halb Gold, halb Hinweis. Liegt schon ein Hinweis bereit, gibt es Gold.
      return rnd() < 0.5 || save.game.hint ? { k: 'gold', gold: goldFor(20, 40, chapter, rnd), text: 'In der Flasche klimpern Goldmünzen.' } : { k: 'hint' }
    case 'haendler': {
      const rarity: Rarity = rnd() < 0.7 ? 'selten' : 'episch'
      return { k: 'trade', item: makeItem(pickDef(rarity, chapter)), price: PRICE[rarity] }
    }
    case 'geisterschiff':
      return { k: 'fight', enc: 'ereignis_geisterschiff', hard: false }
    case 'seeungeheuer':
      return { k: 'fight', enc: 'ereignis_seeungeheuer', hard: true }
    case 'delfine':
      return { k: 'wind', wind: DOLPHIN_WIND }
    case 'treibgut':
      return { k: 'gold', gold: goldFor(25, 45, chapter, rnd), text: 'Zwischen Fässern und Planken treibt eine Kiste voller Münzen.' }
  }
}
