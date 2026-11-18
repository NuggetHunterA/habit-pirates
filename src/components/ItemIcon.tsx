import type { Rarity, Slot } from '../game/types'
import { itemArt } from '../game/items'

export const RARITY_COLOR: Record<Rarity, { ring: string; glow: string; tagBg: string; tagFg: string; bg: string }> = {
  gewoehnlich: { ring: '#9AA5B1', glow: 'rgba(0,0,0,0)', tagBg: '#CBD2D9', tagFg: '#1F2933', bg: 'radial-gradient(circle at 50% 40%, #FFFFFF, #E4E7EB 75%)' },
  selten: { ring: '#3E9DC0', glow: 'rgba(95,179,211,0.75)', tagBg: '#1F6F8B', tagFg: '#FFFFFF', bg: 'radial-gradient(circle at 50% 40%, #E3F6FC, #9BD3E6 80%)' },
  episch: { ring: '#9C36B5', glow: 'rgba(204,93,232,0.8)', tagBg: '#862E9C', tagFg: '#FFFFFF', bg: 'radial-gradient(circle at 50% 40%, #F8E6FC, #D7A4E6 80%)' },
  legendaer: { ring: '#F08C00', glow: 'rgba(255,169,77,0.9)', tagBg: '#E8590C', tagFg: '#FFFFFF', bg: 'radial-gradient(circle at 50% 40%, #FFF4D6, #FFC266 80%)' },
}

/** Leerer Slot: blasses Symbol */
function SlotGlyph({ slot }: { slot: Slot }) {
  const st = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  return (
    <svg viewBox="0 0 52 52" width="60%" height="60%" aria-hidden="true">
      {slot === 'waffe' && <path d="M14 38L36 12h4v4L18 42zM12 34l8 8M10 42l4-4" {...st} />}
      {slot === 'hut' && <path d="M8 32c6-14 30-14 36 0-8 4-28 4-36 0zM16 26c2-8 18-8 20 0" {...st} />}
      {slot === 'kleidung' && <path d="M18 10l-9 7 4 8 4-3v20h18V22l4 3 4-8-9-7c-2 4-14 4-16 0z" {...st} />}
      {slot === 'talisman' && (
        <g {...st}>
          <path d="M26 8v8" />
          <circle cx="26" cy="29" r="12" />
        </g>
      )}
      {slot === 'schiff' && <path d="M10 32h32l-5 9H15zM26 32V9M26 11c8 4 10 12 0 17" {...st} />}
    </svg>
  )
}

interface Props {
  itemKey?: string
  slot: Slot
  rarity?: Rarity
  size?: number
  /** Kein Rahmen, nur das Bild */
  bare?: boolean
}

/** Item-Bild im Anime-Stil C mit Seltenheits-Rahmen. Ohne itemKey: leerer Slot. */
export default function ItemIcon({ itemKey, slot, rarity = 'gewoehnlich', size = 52, bare = false }: Props) {
  const src = itemKey ? itemArt(itemKey) : undefined
  const c = RARITY_COLOR[rarity]
  if (bare && src) return <img src={src} alt="" width={size} height={size} draggable={false} style={{ flex: 'none', objectFit: 'contain' }} />
  return (
    <span
      className={`item-icon ${src ? '' : 'item-icon--empty'} ${src && rarity !== 'gewoehnlich' ? 'item-icon--shine' : ''}`}
      style={{ width: size, height: size, borderRadius: size * 0.24, ...(src ? { background: c.bg, borderColor: c.ring, boxShadow: `0 0 ${size * 0.25}px ${c.glow}, inset 0 -3px 0 rgba(0,0,0,0.12)` } : null) }}
      aria-hidden="true"
    >
      {src ? <img src={src} alt="" draggable={false} /> : <SlotGlyph slot={slot} />}
    </span>
  )
}
