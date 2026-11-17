import { motion } from 'motion/react'
import { useState } from 'react'
import type { Game } from '../game/store'
import { RULES, reviewWeek } from '../game/rules'
import { shortRange } from '../game/dates'
import Jonte from './Jonte'

interface Props {
  game: Game
  onDone: () => void
  onAddHabit: (cb: (id: string) => void) => void
  say: (msg: string) => void
}

function Star({ on }: { on: boolean }) {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true">
      <motion.path
        d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8 6.6 19.7l1.1-6.1L3.2 9.4l6.1-.8z"
        initial={false}
        animate={{ fill: on ? '#E2A73A' : 'rgba(0,0,0,0)', scale: on ? [1, 1.35, 1] : 1 }}
        stroke="#7A4E12"
        strokeWidth="1.6"
        strokeLinejoin="round"
        style={{ transformOrigin: 'center' }}
      />
    </svg>
  )
}

export default function WeekStart({ game, onDone, onAddHabit, say }: Props) {
  const save = game.save!
  const existing = game.plan
  const [active, setActive] = useState<string[]>(existing?.habitIds ?? game.suggestion.habitIds)
  const [focus, setFocus] = useState<string[]>(existing?.focusIds ?? game.suggestion.focusIds)
  const [cheer, setCheer] = useState({ kind: 'cheer' as const, n: 0 })
  const review = reviewWeek(save, game.previousWeek)
  const first = Object.keys(save.weeks).length === 0

  const toggleActive = (id: string) => {
    const h = save.habits.find((x) => x.id === id)
    if (h?.always) {
      say(`${h.name} ist immer dabei.`)
      return
    }
    setActive((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]))
    setFocus((f) => f.filter((x) => x !== id || !active.includes(id)))
  }
  const toggleFocus = (id: string) => {
    if (!focus.includes(id) && focus.length >= RULES.maxFocus) {
      say(`Höchstens ${RULES.maxFocus} Fokus-Habits pro Woche.`)
      return
    }
    setFocus((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]))
    setActive((a) => (a.includes(id) ? a : [...a, id]))
  }

  const go = () => {
    if (!active.length) {
      say('Nimm dir mindestens einen Habit vor.')
      return
    }
    const ordered = save.habits.map((h) => h.id).filter((id) => active.includes(id))
    game.startWeek(ordered, focus)
    setCheer((c) => ({ ...c, n: c.n + 1 }))
    setTimeout(onDone, existing ? 0 : 900)
  }

  return (
    <div className="screen">
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
        <div style={{ width: 120, height: 160, flex: 'none', marginBottom: -6 }}>
          <Jonte trigger={cheer} />
        </div>
        <motion.div
          className="card"
          initial={{ opacity: 0, scale: 0.8, x: -10 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 16, delay: 0.2 }}
          style={{ flex: 1, padding: 12, borderRadius: '16px 16px 16px 4px', fontSize: 14, transformOrigin: 'bottom left' }}
        >
          <div className="display" style={{ fontSize: 22, color: 'var(--red)' }}>
            {existing ? 'Kurs anpassen?' : first ? 'Ahoi, ich bin Jonte!' : 'Neue Woche, Crew!'}
          </div>
          {existing
            ? 'Neue Habits zählen ab heute.'
            : first
              ? 'Welche Habits nehmen wir uns diese Woche vor? Jeder erledigte Habit bringt Wind in die Segel.'
              : 'Die Habits der Vorwoche stehen schon im Logbuch.'}
        </motion.div>
      </div>

      <div className="kicker">Woche {shortRange(game.week)}</div>

      {review && !existing && (
        <div style={{ background: 'var(--sea-2)', border: '2px solid var(--sea-line)', borderRadius: 14, padding: '10px 12px', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 6, fontSize: 12, textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--gold-text)' }}>{review.daysAllDone}/7</div>Tage geschafft
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--gold-text)' }}>{review.longestStreak}</div>längste Serie
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--gold-text)' }}>{review.focusOk === null ? '–' : review.focusOk ? 'Ja' : 'Nein'}</div>Fokus 5 von 7
          </div>
        </div>
      )}

      <div className="muted">Tippe zum An- und Abwählen. Der Stern macht einen Habit zum Fokus: doppelter Wind, höchstens {RULES.maxFocus}.</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {save.habits.map((h, i) => {
          const a = active.includes(h.id)
          const f = focus.includes(h.id)
          const sub = !a ? 'Diese Woche pausiert' : h.always ? 'Immer dabei' : h.kind === 'lassen' ? 'Lassen · abends bestätigen' : f ? 'Fokus · doppelter Wind' : 'Abhaken'
          return (
            <motion.div
              key={h.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              className={a ? 'card' : ''}
              style={{
                display: 'flex',
                alignItems: 'center',
                borderRadius: 14,
                ...(a
                  ? { borderColor: f ? 'var(--gold)' : undefined }
                  : { background: 'rgba(244,228,193,0.12)', color: 'var(--sea-text)', border: '2px dashed #5E8E9C' }),
              }}
            >
              <button
                type="button"
                onClick={() => toggleActive(h.id)}
                aria-pressed={a}
                style={{ flex: 1, minHeight: 54, display: 'flex', alignItems: 'center', gap: 12, border: 'none', background: 'transparent', padding: '6px 4px 6px 10px', textAlign: 'left', fontWeight: 800, fontSize: 15 }}
              >
                <span style={{ width: 34, height: 34, flex: 'none', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: a ? 'var(--sea-3)' : 'transparent', border: `2px solid ${a ? 'var(--sea-1)' : '#8FC3D3'}`, color: '#fff' }}>
                  {a && (
                    <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
                      <path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="3" />
                    </svg>
                  )}
                </span>
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <span>{h.name}</span>
                  <span style={{ fontSize: 12, opacity: 0.75 }}>{sub}</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => toggleFocus(h.id)}
                aria-pressed={f}
                aria-label={(f ? 'Fokus entfernen: ' : 'Als Fokus wählen: ') + h.name}
                style={{ width: 54, height: 54, flex: 'none', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Star on={f} />
              </button>
            </motion.div>
          )
        })}
      </div>

      <button type="button" className="btn-dashed" onClick={() => onAddHabit((id) => setActive((a) => [...a, id]))}>
        + Neuer Habit
      </button>

      <button type="button" className="btn-gold" onClick={go} style={{ minHeight: 58 }}>
        {existing ? 'Kurs speichern' : 'In See stechen!'} · {active.length} Habits, {focus.length} Fokus
      </button>
    </div>
  )
}
