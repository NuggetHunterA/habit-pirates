/** Eigenstaendige Vorschau des Kampf-Grunddesigns (npm run build:kampf) */
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../styles.css'
import FightScene, { type FightResult } from './FightScene'
import { FULL_CREW, KRABBENBANDE, START_CREW } from '../game/foes'

function Preview() {
  const [n, setN] = useState(0)
  const [, setLast] = useState<FightResult | null>(null)
  const [full, setFull] = useState(false)
  return (
    <div className="app" style={{ maxWidth: 820, margin: '0 auto' }}>
      <header className="topbar">
        <div className="topbar__title">Kampf-Vorschau</div>
        <div className="seg seg--dark" style={{ marginLeft: 'auto' }}>
          <button type="button" aria-pressed={!full} onClick={() => (setFull(false), setN((x) => x + 1))}>
            Start-Crew
          </button>
          <button type="button" aria-pressed={full} onClick={() => (setFull(true), setN((x) => x + 1))}>
            Volle Crew
          </button>
        </div>
      </header>
      <main className="main" style={{ display: 'flex', flexDirection: 'column' }}>
        <FightScene
          key={n}
          encounter={KRABBENBANDE}
          crew={full ? FULL_CREW : START_CREW}
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
