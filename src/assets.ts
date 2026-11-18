import seekarte from './assets/seekarte.webp'
import seekarteKap2 from './assets/seekarte_kap2.webp'
import schiff from './assets/ship/schiff.webp'
import krabbe from './assets/krabbe.webp'
import portrait from './assets/jonte/portrait.webp'
import rig from './assets/jonte/rig.json'

const parts = import.meta.glob('./assets/jonte/*.webp', { eager: true, import: 'default' }) as Record<string, string>

export const ART = { seekarte, schiff, krabbe, portrait }

/** Seekarten je Kapitel */
export const MAPS = { kap1: seekarte, kap2: seekarteKap2 }

export interface RigPart {
  img: string
  x: number
  y: number
  px: number
  py: number
  z: number
  parent?: string
}

export const JONTE_RIG = rig as Record<string, RigPart>
export const JONTE_PARTS: Record<string, string> = Object.fromEntries(
  Object.entries(parts).map(([k, v]) => [k.split('/').pop()!.replace('.webp', ''), v]),
)
