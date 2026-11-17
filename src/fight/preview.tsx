/** Eigenstaendige Vorschau des Kampf-Grunddesigns (npm run build:kampf) */
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../styles.css'
import FightScene, { type FightResult } from './FightScene'
import { KRABBENBANDE } from '../game/foes'

function Preview() {
  const [n, setN] = useState(0)
  const [last, setLast] = useState<FightResult | null>(null)
  return (
    <div className="app" style={{ maxWidth: 820, margin: '0 auto' }}>
      <header className="topbar">
        <div className="topbar__title">Kampf-Vorschau</div>
        {last && <div className="pill">{last.sieg ? `Sieg · +${last.gold} Gold` : 'Niederlage'}</div>}
      </header>
      <main className="main" style={{ display: 'flex', flexDirection: 'column' }}>
        <FightScene
          key={n}
          encounter={KRABBENBANDE}
          onExit={(r) => {
            setLast(r)
            setN((x) => x + 1)
          }}
        />
      </main>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Preview />
  </StrictMode>,
)
