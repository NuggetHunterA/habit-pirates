import { motion } from 'motion/react'

export type Tab = 'deck' | 'karte' | 'ausruestung' | 'laden'

const LABEL: Record<Tab, string> = { deck: 'Deck', karte: 'Karte', ausruestung: 'Ausrüstung', laden: 'Laden' }

function TabIcon({ tab }: { tab: Tab }) {
  const st = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
      {tab === 'deck' && (
        // Steuerrad
        <g {...st}>
          <circle cx="14" cy="14" r="7" />
          <circle cx="14" cy="14" r="2.2" fill="currentColor" />
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i / 8) * Math.PI * 2
            return <path key={i} d={`M${14 + Math.cos(a) * 2.2} ${14 + Math.sin(a) * 2.2}L${14 + Math.cos(a) * 12} ${14 + Math.sin(a) * 12}`} />
          })}
        </g>
      )}
      {tab === 'karte' && (
        <g {...st}>
          <path d="M3 6l7-2.5 8 2.5 7-2.5v18l-7 2.5-8-2.5-7 2.5z" />
          <path d="M10 3.5v18M18 6v18" opacity="0.5" />
          <path d="M12 12l3 3M15 12l-3 3" strokeWidth="2.6" />
        </g>
      )}
      {tab === 'ausruestung' && (
        <g {...st}>
          <path d="M6 22L19 7h3v3L7 23z" />
          <path d="M4 19l5 5M3 24l2-2" />
          <path d="M16 20c4-1 7-4 8-8" opacity="0.6" />
        </g>
      )}
      {tab === 'laden' && (
        <g {...st}>
          <path d="M9 9c-3 3-5 7-4 11 1 3 4 4 9 4s8-1 9-4c1-4-1-8-4-11z" />
          <path d="M9 9l-1-4c2 1 4 1 6 0s4-1 6 0l-1 4z" />
          <path d="M14 13v7M11.5 15c0-1 1-1.6 2.5-1.6s2.5.6 2.5 1.6-1 1.4-2.5 1.6-2.5.6-2.5 1.6 1 1.6 2.5 1.6 2.5-.6 2.5-1.6" strokeWidth="1.8" />
        </g>
      )}
    </svg>
  )
}

interface Props {
  tab: Tab
  wide: boolean
  onTab: (t: Tab) => void
  badges?: Partial<Record<Tab, boolean>>
}

/** Untere Leiste aus Holz. Aufgeklappt ohne "Deck", weil die Habits links immer zu sehen sind. */
export default function TabBar({ tab, wide, onTab, badges = {} }: Props) {
  const tabs: Tab[] = wide ? ['karte', 'ausruestung', 'laden'] : ['deck', 'karte', 'ausruestung', 'laden']
  return (
    <nav className={`tabbar ${wide ? 'tabbar--wide' : ''}`} aria-label="Bereiche">
      {tabs.map((t) => (
        <button key={t} type="button" className="tabbar__btn" aria-current={tab === t ? 'page' : undefined} onClick={() => onTab(t)}>
          {tab === t && <motion.span layoutId="tabbar-plate" className="tabbar__plate" transition={{ type: 'spring', stiffness: 420, damping: 32 }} />}
          <span className="tabbar__icon">
            <TabIcon tab={t} />
            {badges[t] && tab !== t && <span className="tabbar__badge" />}
          </span>
          <span className="tabbar__label">{LABEL[t]}</span>
        </button>
      ))}
    </nav>
  )
}
