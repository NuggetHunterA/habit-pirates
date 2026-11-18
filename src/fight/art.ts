import strand from '../assets/kampf/strand.webp'
import nebel from '../assets/kampf/nebel.webp'
import silhouette from '../assets/crew/silhouette.webp'
import silNavigatorin from '../assets/crew/silhouette_navigatorin.webp'
import silSmutje from '../assets/crew/silhouette_smutje.webp'
import silAusguck from '../assets/crew/silhouette_ausguck.webp'
import krabbeRig from '../assets/krabbe/rig.json'
import { JONTE_PARTS, JONTE_RIG } from '../assets'
import type { Look } from '../game/combat'

export interface RigPart {
  img: string
  x: number
  y: number
  px: number
  py: number
  z: number
  parent?: string
  /** Ruhe-Drehung (Bogenmass) und Ruhe-Skalierung */
  r?: number
  s?: number
}
export type Rig = Record<string, RigPart>

const glob = (g: Record<string, string>) =>
  Object.fromEntries(Object.entries(g).map(([k, v]) => [k.split('/').pop()!.replace('.webp', ''), v])) as Record<string, string>

const KRABBE_PARTS = glob(import.meta.glob('../assets/krabbe/*.webp', { eager: true, import: 'default' }) as Record<string, string>)
const FIG = glob(import.meta.glob('../assets/figuren/*.webp', { eager: true, import: 'default' }) as Record<string, string>)

/**
 * Vorschau-Modus: Crew, die noch nicht an Bord ist, bleibt eine Silhouette.
 * Im echten Spiel kaempft nur, wer schon beigetreten ist, darum ist er dort aus.
 */
let spoilerFree = false
export const setSpoilerFree = (v: boolean) => (spoilerFree = v)
export const isSpoilerFree = () => spoilerFree

const SILHOUETTES: Partial<Record<Look, string>> = { kanonier: silhouette, navigatorin: silNavigatorin, smutje: silSmutje, ausguck: silAusguck }

/** Figuren als ganzes Bild (mit Code-Animation). Jonte und die Krabben laufen als Einzelteil-Rig. */
const SPRITE_LOOKS: Look[] = ['kanonier', 'navigatorin', 'smutje', 'ausguck', 'moewenpirat', 'nebelqualle', 'geisterpirat', 'irrlicht', 'schalbart', 'grauhand']

export function spriteFor(look: Look): string | undefined {
  if (spoilerFree && SILHOUETTES[look]) return SILHOUETTES[look]
  return SPRITE_LOOKS.includes(look) ? FIG[look] : undefined
}

export function portraitFor(look: Look): string {
  if (spoilerFree && SILHOUETTES[look]) return SILHOUETTES[look]!
  if (look === 'krabbenmatrose') return FIG.krabbenbandit_portrait
  return FIG[`${look}_portrait`] ?? FIG.jonte_portrait
}

/** Grosses Bild fuer Story-Szenen */
export const figure = (name: string) => FIG[name]

export const FIGHT_ART = {
  backgrounds: { strand, nebel },
  allSprites: [...Object.values(SILHOUETTES), ...SPRITE_LOOKS.map((l) => FIG[l])] as string[],
  rigs: {
    jonte: { rig: JONTE_RIG as Rig, parts: JONTE_PARTS },
    krabbe: { rig: krabbeRig as Rig, parts: KRABBE_PARTS },
  },
}
