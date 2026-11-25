import { motion } from 'motion/react'

/** Die fuenf Orte der App */
export type Tab = 'deck' | 'karte' | 'crew' | 'hafen' | 'logbuch'

const LABEL: Record<Tab, string> = { deck: 'Deck', karte: 'Seekarte', crew: 'Mannschaft', hafen: 'Hafen', logbuch: 'Logbuch' }

const ICON: Record<Tab, string> = {
  // Steuerrad
  deck: 'M14 7a7 7 0 1 0 .01 0M14 11.8a2.2 2.2 0 1 0 .01 0M14 2v5M14 21v5M2 14h5M21 14h5M5.5 5.5 9 9M19 19l3.5 3.5M22.5 5.5 19 9M9 19l-3.5 3.5',
  karte: 'M3 6l7-2.5 8 2.5 7-2.5v18l-7 2.5-8-2.5-7 2.5zM10 3.5v18M18 6v18',
  crew: 'M10 12a4 4 0 1 0 .01 0M3 25c0-4 3-7 7-7s7 3 7 7M19 11a3 3 0 1 0 .01 0M18 17c4 0 7 3 7 7',
  // Anker
  hafen: 'M14 3a2.5 2.5 0 1 0 .01 0M14 8v17M8 12h12M4 17c0 5 4 8 10 8s10-3 10-8M4 17l-1.5 2M24 17l1.5 2',
  logbuch: 'M5 4h13a3 3 0 0 1 3 3v17H8a3 3 0 0 1-3-3zM5 21a3 3 0 0 1 3-3h13M10 9h7M10 13h5',
}

interface Props {
  tab: Tab
  wide: boolean
  onTab: (t: Tab) => void
  badges?: Partial<Record<Tab, boolean>>
}

/** Untere Leiste aus Holz. Aufgeklappt ohne "Deck", weil die Habits links immer zu sehen sind. */
export default function TabBar({ tab, wide, onTab, badges = {} }: Props) {
  const tabs: Tab[] = wide ? ['karte', 'crew', 'hafen', 'logbuch'] : ['deck', 'karte', 'crew', 'hafen', 'logbuch']
  return (
    <nav className={`tabbar ${wide ? 'tabbar--wide' : ''}`} aria-label="Orte">
      {tabs.map((t) => (
        <button key={t} type="button" className="tabbar__btn" aria-current={tab === t ? 'page' : undefined} onClick={() => onTab(t)}>
          {tab === t && <motion.span layoutId="tabbar-plate" className="tabbar__plate" transition={{ type: 'spring', stiffness: 420, damping: 32 }} />}
          <span className="tabbar__icon">
            <svg width="26" height="26" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={ICON[t]} />
            </svg>
            {badges[t] && tab !== t && <span className="tabbar__badge" />}
          </span>
          <span className="tabbar__label">{LABEL[t]}</span>
        </button>
      ))}
    </nav>
  )
}
