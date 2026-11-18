import { useState } from 'react'
import type { Habit, HabitKind, Rhythm } from '../game/types'
import { WEEKDAYS_SHORT, currentRhythm, weekday } from '../game/rules'
import Sheet from './Sheet'

export interface HabitInput {
  name: string
  kind: HabitKind
  always: boolean
  rhythm: Rhythm
}

interface Props {
  /** Vorhandener Habit: Bearbeiten. Ohne: neuer Habit. */
  habit?: Habit
  midWeek: boolean
  today: string
  onClose: () => void
  onSave: (v: HabitInput) => void
  onDelete?: () => void
}

const label = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 800 } as const
const hint = { fontWeight: 700, color: 'var(--ink-soft)', fontSize: 13 } as const

/** Neuer Habit oder Habit bearbeiten: Name, Art, Rhythmus, immer dabei, loeschen */
export default function HabitSheet({ habit, midWeek, today, onClose, onSave, onDelete }: Props) {
  const start = habit ? currentRhythm(habit) : ({ kind: 'daily' } as Rhythm)
  const [name, setName] = useState(habit?.name ?? '')
  const [kind, setKind] = useState<HabitKind>(habit?.kind ?? 'tap')
  const [always, setAlways] = useState(!!habit?.always)
  const [rk, setRk] = useState<Rhythm['kind']>(start.kind)
  const [n, setN] = useState(start.kind === 'every' ? start.n : 2)
  const [days, setDays] = useState<number[]>(start.kind === 'days' ? start.days : [weekday(today)])
  const [confirmDel, setConfirmDel] = useState(false)
  const rhythm: Rhythm = rk === 'every' ? { kind: 'every', n } : rk === 'days' ? { kind: 'days', days: [...days].sort() } : { kind: 'daily' }
  const ok = name.trim().length > 0 && (rk !== 'days' || days.length > 0)
  const isDrink = habit?.kind === 'drink'

  return (
    <Sheet onClose={onClose} label={habit ? 'Habit bearbeiten' : 'Neuer Habit'}>
      <h2>{habit ? 'Habit bearbeiten' : 'Neuer Habit'}</h2>
      <label style={label}>
        Name
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. 10 Minuten dehnen" autoFocus={!habit} maxLength={40} />
      </label>
      {!isDrink && (
        <div style={label}>
          Art
          <div className="seg">
            <button type="button" aria-pressed={kind === 'tap'} onClick={() => setKind('tap')}>
              Abhaken
            </button>
            <button type="button" aria-pressed={kind === 'lassen'} onClick={() => setKind('lassen')}>
              Lassen
            </button>
          </div>
          <span style={hint}>{kind === 'tap' ? 'Einmal antippen, wenn du es getan hast.' : 'Am Abend bestätigen, dass du es nicht getan hast.'}</span>
        </div>
      )}
      <div style={label}>
        Rhythmus
        <div className="seg">
          <button type="button" aria-pressed={rk === 'daily'} onClick={() => setRk('daily')}>
            Täglich
          </button>
          <button type="button" aria-pressed={rk === 'every'} onClick={() => setRk('every')}>
            Alle X Tage
          </button>
          <button type="button" aria-pressed={rk === 'days'} onClick={() => setRk('days')}>
            Wochentage
          </button>
        </div>
        {rk === 'every' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 15 }}>
              <button type="button" className="small-btn" style={{ width: 44, padding: 0 }} onClick={() => setN((x) => Math.max(2, x - 1))} disabled={n <= 2} aria-label="Weniger Tage">
                −
              </button>
              <b style={{ minWidth: 92, textAlign: 'center' }}>alle {n} Tage</b>
              <button type="button" className="small-btn" style={{ width: 44, padding: 0 }} onClick={() => setN((x) => Math.min(7, x + 1))} disabled={n >= 7} aria-label="Mehr Tage">
                +
              </button>
            </div>
            <span style={hint}>Wieder fällig {n} Tage nach dem letzten Erledigen. Verpasst du ihn, bleibt er fällig.</span>
          </>
        )}
        {rk === 'days' && (
          <>
            <div className="daypick" role="group" aria-label="Wochentage">
              {WEEKDAYS_SHORT.map((d, i) => (
                <button key={d} type="button" aria-pressed={days.includes(i)} onClick={() => setDays((x) => (x.includes(i) ? x.filter((y) => y !== i) : [...x, i]))}>
                  {d}
                </button>
              ))}
            </div>
            {!days.length && <span style={hint}>Wähle mindestens einen Tag.</span>}
          </>
        )}
        {rk !== 'daily' && <span style={hint}>An anderen Tagen steht er unter „Heute frei“ und zählt nicht für vollen Wind und Serien.</span>}
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, fontWeight: 800 }}>
        <input type="checkbox" checked={always} onChange={(e) => setAlways(e.target.checked)} style={{ width: 24, height: 24, accentColor: '#1F6F8B' }} />
        Immer dabei (jede Woche automatisch)
      </label>
      {!habit && midWeek && <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Er zählt ab heute.</div>}
      {habit && <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Änderungen gelten ab heute.</div>}
      <button
        type="button"
        className="btn-gold"
        disabled={!ok}
        onClick={() => {
          onSave({ name, kind, always, rhythm })
          onClose()
        }}
      >
        {habit ? 'Speichern' : 'Hinzufügen'}
      </button>
      {habit && onDelete && (
        <button
          type="button"
          className="del-btn"
          onClick={() => {
            if (!confirmDel) return setConfirmDel(true)
            onDelete()
            onClose()
          }}
        >
          {confirmDel ? 'Wirklich löschen? Nochmal tippen' : 'Habit löschen'}
        </button>
      )}
    </Sheet>
  )
}
