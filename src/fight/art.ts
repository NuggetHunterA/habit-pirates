import strand from '../assets/kampf/strand.webp'
import nebel from '../assets/kampf/nebel.webp'
import glut from '../assets/kampf/glut.webp'
import silhouette from '../assets/crew/silhouette.webp'
import silNavigatorin from '../assets/crew/silhouette_navigatorin.webp'
import silSmutje from '../assets/crew/silhouette_smutje.webp'
import silAusguck from '../assets/crew/silhouette_ausguck.webp'
import jonteGanz from '../assets/jonte/jonte_ganz.webp'
import type { Look } from '../game/combat'

const glob = (g: Record<string, string>) =>
  Object.fromEntries(Object.entries(g).map(([k, v]) => [k.split('/').pop()!.replace('.webp', ''), v])) as Record<string, string>

const FIG = glob(import.meta.glob('../assets/figuren/*.webp', { eager: true, import: 'default' }) as Record<string, string>)

/**
 * Vorschau-Modus: Crew, die noch nicht an Bord ist, bleibt eine Silhouette.
 * Im echten Spiel kaempft nur, wer schon beigetreten ist, darum ist er dort aus.
 */
let spoilerFree = false
export const setSpoilerFree = (v: boolean) => (spoilerFree = v)
export const isSpoilerFree = () => spoilerFree

const SILHOUETTES: Partial<Record<Look, string>> = { kanonier: silhouette, navigatorin: silNavigatorin, smutje: silSmutje, ausguck: silAusguck }

/**
 * Ganzes Bild einer Figur fuer die Kampfbuehne. Alle Figuren laufen als nahtloses Gitter (fight/mesh.ts).
 * Im Vorschau-Modus bleibt Crew, die noch nicht an Bord ist, eine Silhouette.
 */
export function figureImage(look: Look): string {
  if (spoilerFree && SILHOUETTES[look]) return SILHOUETTES[look]!
  if (look === 'jonte') return jonteGanz
  if (look === 'krabbenmatrose') return FIG.krabbenbandit
  return FIG[look]
}

export function portraitFor(look: Look): string {
  if (spoilerFree && SILHOUETTES[look]) return SILHOUETTES[look]!
  if (look === 'krabbenmatrose') return FIG.krabbenbandit_portrait
  return FIG[`${look}_portrait`] ?? FIG.jonte_portrait
}

/** Grosses Bild fuer Story-Szenen */
export const figure = (name: string) => FIG[name]

export const FIGHT_ART = {
  backgrounds: { strand, nebel, glut },
  allFigures: [...Object.values(SILHOUETTES), jonteGanz, ...Object.entries(FIG).filter(([k]) => !k.endsWith('_portrait')).map(([, v]) => v)] as string[],
}
