import type { Stats } from '../game/types'

const COLOR: Record<keyof Stats, string> = {
  leben: '#E5484D',
  angriff: '#F08C00',
  ruestung: '#5E8E9C',
  tempo: '#3E9DC0',
  krit: '#E2A73A',
  ausweichen: '#2FB38E',
  kritSchaden: '#D9480F',
}

/** Kleine Symbole fuer die Kampfwerte */
export default function StatIcon({ stat, size = 20 }: { stat: keyof Stats; size?: number }) {
  const c = COLOR[stat]
  const st = { stroke: '#2A190D', strokeWidth: 1.6, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" style={{ flex: 'none' }}>
      {stat === 'leben' && <path d="M10 17s-7-4.2-7-9a3.8 3.8 0 0 1 7-2 3.8 3.8 0 0 1 7 2c0 4.8-7 9-7 9z" fill={c} {...st} />}
      {stat === 'angriff' && (
        <g {...st}>
          <path d="M4 16L14.5 4.5H17V7L5.5 17.5z" fill="#E4E7EB" />
          <path d="M3 13l4 4M2.5 17.5l2-2" stroke={c} strokeWidth="2.6" />
        </g>
      )}
      {stat === 'ruestung' && <path d="M10 2l6.5 2.5V9c0 4.4-3 7.3-6.5 9-3.5-1.7-6.5-4.6-6.5-9V4.5z" fill={c} {...st} />}
      {stat === 'tempo' && (
        <g {...st} fill="none">
          <path d="M2 7h9M4 11h10M2 15h7" stroke={c} strokeWidth="2.4" />
          <path d="M13 4c3 0 5 2 5 4s-2 3-4 3" stroke={c} strokeWidth="2.4" />
        </g>
      )}
      {stat === 'krit' && <path d="M10 1.5l2.4 5.3 5.6.5-4.3 3.8 1.3 5.6L10 13.8l-5 2.9 1.3-5.6L2 7.3l5.6-.5z" fill={c} {...st} />}
      {stat === 'kritSchaden' && (
        <g {...st}>
          <path d="M10 1.5l2.4 5.3 5.6.5-4.3 3.8 1.3 5.6L10 13.8l-5 2.9 1.3-5.6L2 7.3l5.6-.5z" fill={c} />
          <path d="M10 6v5M10 13.2v.4" stroke="#fff" strokeWidth="2" />
        </g>
      )}
      {stat === 'ausweichen' && (
        <g {...st}>
          <path d="M3 10c3-6 11-6 14 0-3 6-11 6-14 0z" fill="#fff" />
          <circle cx="10" cy="10" r="2.8" fill={c} />
        </g>
      )}
    </svg>
  )
}
