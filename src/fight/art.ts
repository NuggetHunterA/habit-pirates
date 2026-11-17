import strand from '../assets/kampf/strand.webp'
import silhouette from '../assets/crew/silhouette.webp'
import krabbePortrait from '../assets/krabbe.webp'
import krabbeRig from '../assets/krabbe/rig.json'
import { ART, JONTE_PARTS, JONTE_RIG } from '../assets'

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

const kparts = import.meta.glob('../assets/krabbe/*.webp', { eager: true, import: 'default' }) as Record<string, string>
const KRABBE_PARTS: Record<string, string> = Object.fromEntries(
  Object.entries(kparts).map(([k, v]) => [k.split('/').pop()!.replace('.webp', ''), v]),
)

export const FIGHT_ART = {
  strand,
  silhouette,
  portraits: {
    jonte: ART.portrait,
    kanonier: silhouette,
    krabbenbandit: krabbePortrait,
    krabbenmatrose: krabbePortrait,
  },
  rigs: {
    jonte: { rig: JONTE_RIG as Rig, parts: JONTE_PARTS },
    krabbe: { rig: krabbeRig as Rig, parts: KRABBE_PARTS },
  },
}
