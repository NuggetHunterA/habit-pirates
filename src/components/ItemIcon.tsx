import type { Rarity, Slot } from '../game/types'

export const RARITY_COLOR: Record<Rarity, { ring: string; glow: string; tagBg: string; tagFg: string }> = {
  gewoehnlich: { ring: '#9AA5B1', glow: 'rgba(0,0,0,0)', tagBg: '#CBD2D9', tagFg: '#1F2933' },
  selten: { ring: '#3E9DC0', glow: 'rgba(95,179,211,0.75)', tagBg: '#1F6F8B', tagFg: '#FFFFFF' },
  episch: { ring: '#9C36B5', glow: 'rgba(204,93,232,0.8)', tagBg: '#862E9C', tagFg: '#FFFFFF' },
  legendaer: { ring: '#F08C00', glow: 'rgba(255,169,77,0.9)', tagBg: '#E8590C', tagFg: '#FFFFFF' },
}

/** Vorlaeufige Item-Symbole, bis die Item-Boegen aus dem Bildgenerator kommen */
export default function ItemIcon({ slot, rarity, size = 52 }: { slot: Slot; rarity: Rarity; size?: number }) {
  const c = RARITY_COLOR[rarity]
  const st = { fill: 'none', stroke: '#3B2414', strokeWidth: 2.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" aria-hidden="true" style={{ flex: 'none' }}>
      <rect x="2" y="2" width="48" height="48" rx="12" fill="#FFF6E2" stroke={c.ring} strokeWidth="3" />
      {slot === 'waffe' && (
        <g>
          <path d="M14 38L36 12l4 0 0 4L18 42z" {...st} fill="#D9E2EC" />
          <path d="M12 34l8 8M10 42l4-4" {...st} />
          <path d="M11 33l9 9" stroke="#C89B4A" strokeWidth="4" strokeLinecap="round" />
        </g>
      )}
      {slot === 'hut' && (
        <g>
          <path d="M8 32c6-14 30-14 36 0-8 4-28 4-36 0z" {...st} fill="#3B2F2F" />
          <path d="M16 26c2-8 18-8 20 0" {...st} fill="#3B2F2F" />
          <path d="M36 22c4-6 9-7 11-6-3 3-6 6-11 6z" {...st} fill="#FFFFFF" />
        </g>
      )}
      {slot === 'kleidung' && (
        <g>
          <path d="M18 10l-9 7 4 8 4-3v20h18V22l4 3 4-8-9-7c-2 4-14 4-16 0z" {...st} fill="#B23A2A" />
          <path d="M17 30h18" stroke="#E2A73A" strokeWidth="3" />
        </g>
      )}
      {slot === 'talisman' && (
        <g>
          <path d="M26 8v8" {...st} />
          <circle cx="26" cy="29" r="12" {...st} fill="#FFD978" />
          <path d="M26 22l2 5h5l-4 3 2 5-5-3-5 3 2-5-4-3h5z" fill="#E2A73A" stroke="#7A4E12" strokeWidth="1.5" strokeLinejoin="round" />
        </g>
      )}
      {slot === 'schiff' && (
        <g>
          <path d="M10 32h32l-5 9H15z" {...st} fill="#8B5A2B" />
          <path d="M26 32V9M26 11c8 4 10 12 0 17" {...st} fill="#F4E4C1" />
          <path d="M26 13c-6 4-8 10 0 15" {...st} fill="#F4E4C1" />
        </g>
      )}
    </svg>
  )
}
