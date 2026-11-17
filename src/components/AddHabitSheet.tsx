import { useState } from 'react'
import type { HabitKind } from '../game/types'
import Sheet from './Sheet'

interface Props {
  midWeek: boolean
  onClose: () => void
  onAdd: (name: string, kind: HabitKind, always: boolean) => void
}

export default function AddHabitSheet({ midWeek, onClose, onAdd }: Props) {
  const [name, setName] = useState('')
  const [kind, setKind] = useState<HabitKind>('tap')
  const [always, setAlways] = useState(false)
  const ok = name.trim().length > 0
  return (
    <Sheet onClose={onClose} label="Neuer Habit">
      <h2>Neuer Habit</h2>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 800 }}>
        Name
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. 10 Minuten dehnen" autoFocus maxLength={40} />
      </label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 800 }}>
        Art
        <div className="seg">
          <button type="button" aria-pressed={kind === 'tap'} onClick={() => setKind('tap')}>
            Abhaken
          </button>
          <button type="button" aria-pressed={kind === 'lassen'} onClick={() => setKind('lassen')}>
            Lassen
          </button>
        </div>
        <span style={{ fontWeight: 700, color: 'var(--ink-soft)' }}>
          {kind === 'tap' ? 'Einmal antippen, wenn du es getan hast.' : 'Am Abend bestätigen, dass du es nicht getan hast.'}
        </span>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, fontWeight: 800 }}>
        <input type="checkbox" checked={always} onChange={(e) => setAlways(e.target.checked)} style={{ width: 24, height: 24, accentColor: '#1F6F8B' }} />
        Immer dabei (jede Woche automatisch)
      </label>
      {midWeek && <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Er zählt ab heute.</div>}
      <button
        type="button"
        className="btn-gold"
        disabled={!ok}
        onClick={() => {
          onAdd(name, kind, always)
          onClose()
        }}
      >
        Hinzufügen
      </button>
    </Sheet>
  )
}
