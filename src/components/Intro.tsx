import { AnimatePresence, motion } from 'motion/react'
import { useState, type ReactNode } from 'react'
import type { HabitKind } from '../game/types'
import { ART } from '../assets'
import holz from '../assets/truhen/truhe_holz.webp'
import silber from '../assets/truhen/truhe_silber.webp'
import gold from '../assets/truhen/truhe_gold.webp'
import krabbe from '../assets/figuren/krabbenbandit.webp'
import Jonte from './Jonte'
import { RULES } from '../game/rules'

/**
 * Einstieg fuer neue Spieler: vier kurze Karten mit Jonte, danach die Auswahl der ersten Habits.
 * replay: nur die Karten (aus dem Menue), ohne Habit-Auswahl.
 * Nur Regeln, nichts ueber spaetere Crew, Bosse oder Story.
 */

export interface StartHabit {
  name: string
  kind: HabitKind
  always?: boolean
}

const CHOICES: StartHabit[] = [
  { name: 'Genug trinken', kind: 'drink', always: true },
  { name: 'Vitamin D', kind: 'tap' },
  { name: '10 Seiten lesen', kind: 'tap' },
  { name: 'Zähne putzen am Abend', kind: 'tap' },
  { name: 'Sport', kind: 'tap' },
  { name: 'Spazieren gehen', kind: 'tap' },
  { name: 'Früh ins Bett', kind: 'tap' },
  { name: 'Kein Doom-Scrolling', kind: 'lassen' },
  { name: 'Meditieren', kind: 'tap' },
  { name: 'Aufräumen', kind: 'tap' },
]

interface Slide {
  title: string
  text: string
  art: ReactNode
}

function Swords() {
  return (
    <svg viewBox="0 0 120 120" width="96" height="96" aria-hidden="true">
      <path d="M25 95 L85 25" stroke="#e6ebff" strokeWidth="8" strokeLinecap="round" />
      <path d="M95 95 L35 25" stroke="#e6ebff" strokeWidth="8" strokeLinecap="round" />
      <path d="M20 82 l18 18 M100 82 l-18 18" stroke="#ffc21a" strokeWidth="8" strokeLinecap="round" />
    </svg>
  )
}

const SLIDES: Slide[] = [
  {
    title: 'Habits bringen Wind',
    text: 'Jeder erledigte Habit füllt die Segel. Fokus-Habits zählen doppelt, und ein ganz erledigter Tag gibt Bonus-Wind.',
    art: (
      <div style={{ width: 150, height: 200 }}>
        <Jonte />
      </div>
    ),
  },
  {
    title: `${RULES.windPerField} Wind = 1 Feld`,
    text: 'Mit Wind segelst du auf der Seekarte von Feld zu Feld: Inseln, Truhen, Gegner, Häfen und Stürme.',
    art: <img src={ART.seekarte} alt="" className="intro__map" />,
  },
  {
    title: 'Truhen und Ausrüstung',
    text: 'In Truhen findest du Gold und Ausrüstung. Je seltener ein Item, desto stärker. Gold gibst du im Hafen aus.',
    art: (
      <div className="intro__chests">
        <img src={holz} alt="" />
        <img src={silber} alt="" />
        <img src={gold} alt="" />
      </div>
    ),
  },
  {
    title: 'Kämpfe',
    text: 'Gegner versperren den Weg. Vorher wählst du Aufstellung, Fähigkeit und Ausrüstung, dann kämpft die Crew von allein. Verlieren kostet nichts.',
    art: (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Swords />
        <img src={krabbe} alt="" style={{ height: 170 }} />
      </div>
    ),
  },
]

interface Props {
  replay?: boolean
  onDone: (habits: StartHabit[]) => void
}

export default function Intro({ replay, onDone }: Props) {
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [picked, setPicked] = useState<string[]>([])
  const [own, setOwn] = useState<StartHabit[]>([])
  const [ownName, setOwnName] = useState('')
  const [ownOpen, setOwnOpen] = useState(false)
  const last = SLIDES.length - 1
  const choices = [...CHOICES, ...own]

  const go = (n: number) => {
    if (n < 0) return
    if (n > last) {
      if (replay) onDone([])
      else setStep(SLIDES.length)
      return
    }
    setDir(n > step ? 1 : -1)
    setStep(n)
  }
  const skip = () => (replay ? onDone([]) : setStep(SLIDES.length))

  const addOwn = () => {
    const name = ownName.trim()
    if (!name) return
    if (!choices.some((c) => c.name === name)) setOwn((o) => [...o, { name, kind: 'tap' }])
    setPicked((p) => (p.includes(name) ? p : [...p, name]))
    setOwnName('')
    setOwnOpen(false)
  }

  if (step >= SLIDES.length) {
    return (
      <div className="screen intro">
        <div className="kicker">Deine ersten Habits</div>
        <h1 className="h1">Was nimmst du dir vor?</h1>
        <div className="muted">Tipp an, was passt. Alles lässt sich später ändern, auch der Rhythmus.</div>
        <div className="intro__pick">
          {choices.map((c) => {
            const on = picked.includes(c.name)
            return (
              <button key={c.name} type="button" aria-pressed={on} onClick={() => setPicked((p) => (on ? p.filter((x) => x !== c.name) : [...p, c.name]))}>
                {c.name}
              </button>
            )
          })}
          {!ownOpen && (
            <button type="button" className="intro__own" onClick={() => setOwnOpen(true)}>
              + Eigener Habit
            </button>
          )}
        </div>
        {ownOpen && (
          <form
            style={{ display: 'flex', gap: 8 }}
            onSubmit={(e) => {
              e.preventDefault()
              addOwn()
            }}
          >
            <input className="input" style={{ flex: 1, minWidth: 0 }} value={ownName} onChange={(e) => setOwnName(e.target.value)} placeholder="z. B. 10 Minuten dehnen" maxLength={40} autoFocus />
            <button type="submit" className="btn-gold" style={{ minHeight: 48, padding: '0 16px' }} disabled={!ownName.trim()}>
              Dazu
            </button>
          </form>
        )}
        <div style={{ flex: 1 }} />
        <div className="muted" style={{ fontSize: 13 }}>
          {picked.length ? `${picked.length} ausgewählt · danach planst du deine erste Woche` : 'Wähle mindestens einen Habit.'}
        </div>
        <button type="button" className="btn-gold" style={{ minHeight: 56 }} disabled={!picked.length} onClick={() => onDone(choices.filter((c) => picked.includes(c.name)))}>
          Weiter zur Woche
        </button>
      </div>
    )
  }

  const s = SLIDES[step]
  return (
    <div className="screen intro">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="kicker">
          {step + 1} von {SLIDES.length}
        </span>
        {step < last && (
          <button type="button" className="intro__skip" onClick={skip}>
            Überspringen
          </button>
        )}
      </div>
      <AnimatePresence mode="wait" custom={dir} initial={false}>
        <motion.div
          key={step}
          className="intro__slide"
          initial={{ opacity: 0, x: 40 * dir }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 * dir }}
          transition={{ duration: 0.2 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.3}
          onDragEnd={(_, info) => {
            if (info.offset.x < -60) go(step + 1)
            else if (info.offset.x > 60) go(step - 1)
          }}
        >
          <div className="intro__art">{s.art}</div>
          <div className="intro__bubble">
            <b className="display">{s.title}</b>
            {s.text}
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="intro__dots" aria-hidden="true">
        {SLIDES.map((_, i) => (
          <i key={i} className={i === step ? 'on' : ''} />
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', gap: 10 }}>
        {step > 0 && (
          <button type="button" className="btn-wood" style={{ minHeight: 56 }} onClick={() => go(step - 1)}>
            Zurück
          </button>
        )}
        <button type="button" className="btn-gold" style={{ minHeight: 56, flex: 1 }} onClick={() => go(step + 1)}>
          {step < last ? 'Weiter' : replay ? 'Fertig' : 'Leinen los!'}
        </button>
      </div>
    </div>
  )
}
