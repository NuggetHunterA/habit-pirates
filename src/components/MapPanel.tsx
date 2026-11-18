import { AnimatePresence, motion } from 'motion/react'
import { useState, type ReactNode } from 'react'
import type { Game } from '../game/store'
import { blocked, bossTriesLeft, doneFields, BOSS_TRIES } from '../game/store'
import { CHAPTERS, FIELD_TEXT, chapterOf } from '../game/map'
import { ENCOUNTERS } from '../game/foes'
import { levelProgress } from '../game/progress'
import { RULES, windAvailable } from '../game/rules'
import { portraitFor } from '../fight/art'
import SeaMap from './SeaMap'
import './MapPanel.css'

export interface FightRequest {
  enc: string
  /** Feld des Kampfs; null beim Beutezug */
  field: number | null
  boss: boolean
  farm: boolean
}

interface Props {
  game: Game
  onShop: () => void
  onChest: () => void
  onFight: (r: FightRequest) => void
  onStory: (id: string) => void
  say: (m: string) => void
}

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]

export default function MapPanel({ game, onChest, onShop, onFight, onStory, say }: Props) {
  const save = game.save!
  const g = save.game
  const chapter = chapterOf(g.chapter)
  const fields = chapter.fields
  const ship = g.field
  const [sailing, setSailing] = useState(false)
  const wind = windAvailable(save)
  const here = fields[ship]
  const atEnd = ship >= fields.length - 1
  const next = fields[Math.min(ship + 1, fields.length - 1)]
  const storyHere = here.story && !g.seen.includes(here.story) ? here.story : null
  const atChest = here.kind === 'truhe' && !g.looted.includes(ship)
  const fightHere = blocked(save) && here.enc ? ENCOUNTERS[here.enc] : null
  const boss = atEnd && here.enc ? ENCOUNTERS[here.enc] : null
  const bossBeaten = g.bossBeaten.includes(chapter.n)
  const outroPending = bossBeaten && !g.seen.includes(chapter.outro)
  const triesLeft = bossTriesLeft(save, game.today)
  const canSail = wind >= RULES.windPerField && !atEnd && !sailing && !fightHere
  const lp = levelProgress(g.xp, chapter.cap)
  const nextChapter = CHAPTERS.find((c) => c.n === chapter.n + 1)

  const sail = () => {
    if (wind < RULES.windPerField) return say(`Noch ${RULES.windPerField - Math.max(0, wind)} Wind nötig. Hake Habits ab!`)
    game.sail()
  }

  const farm = () => {
    if (wind < RULES.windPerField) return say(`Ein Beutezug braucht ${RULES.windPerField} Wind. Hake Habits ab!`)
    onFight({ enc: pick(chapter.farm), field: null, boss: false, farm: true })
  }

  const attackBoss = () => {
    if (triesLeft <= 0) return say('Für heute ist die Crew erschöpft. Morgen gibt es neue Versuche.')
    onFight({ enc: here.enc!, field: ship, boss: true, farm: false })
  }

  const arrive = (i: number) => {
    const f = fields[i]
    if (f.story && !g.seen.includes(f.story)) {
      window.setTimeout(() => onStory(f.story!), 450)
      return
    }
    if (f.kind === 'truhe') say('Truhe in Sicht!')
    else if (f.kind === 'hafen') say(`${f.name} erreicht. Der Hafenladen hat geöffnet!`)
    else if (f.enc) say(`${ENCOUNTERS[f.enc].name} voraus!`)
  }

  let kicker = 'Nächstes Feld'
  let title = next.name
  let text = FIELD_TEXT[next.kind]
  let portrait: string | null = null
  if (sailing) {
    kicker = 'Unterwegs'
    title = `Kurs auf ${next.name}`
    text = 'Volle Fahrt voraus!'
  } else if (storyHere) {
    kicker = 'Du bist hier'
    title = here.name
    text = here.kind === 'start' ? 'Ein neues Kapitel beginnt.' : FIELD_TEXT[here.kind]
  } else if (atChest) {
    kicker = 'Du bist hier'
    title = here.name
    text = 'Öffne sie und sieh, was drin ist.'
  } else if (fightHere) {
    kicker = 'Kampf'
    title = fightHere.name
    text = fightHere.intro
    portrait = portraitFor(fightHere.foes[0].look)
  } else if (boss && !bossBeaten) {
    kicker = 'Kapitelboss'
    title = boss.name
    text = triesLeft > 0 ? `Noch ${triesLeft} von ${BOSS_TRIES} Versuchen heute. Zu schwer? Beutezüge bringen Erfahrung und Ausrüstung.` : 'Heute keine Versuche mehr. Beutezüge gehen weiter.'
    portrait = portraitFor(boss.foes[0].look)
  } else if (boss && bossBeaten) {
    kicker = `Kapitel ${chapter.n} geschafft`
    title = outroPending ? boss.name + ' besiegt!' : nextChapter ? `Auf zu Kapitel ${nextChapter.n}` : 'Fortsetzung folgt'
    text = outroPending ? 'Die Crew hat etwas gefunden.' : nextChapter ? `${nextChapter.name} wartet.` : 'Kapitel 3 kommt bald. Bis dahin kannst du weiter auf Beutezug gehen.'
    portrait = portraitFor(boss.foes[0].look)
  }

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <SeaMap key={chapter.n} chapter={chapter} field={ship} done={doneFields(save)} onArrive={arrive} onSailingChange={setSailing} />

      <div style={{ position: 'absolute', left: 12, right: 12, top: 12, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, pointerEvents: 'none' }}>
        <div className="map-chip">
          <div className="display" style={{ fontSize: 20, lineHeight: 1 }}>
            Kapitel {chapter.n}
          </div>
          <div style={{ fontSize: 12, fontWeight: 800 }}>
            {chapter.name} · Feld {ship + 1}/{fields.length}
          </div>
        </div>
        <div className="map-chip map-chip--level" aria-label={`Stufe ${lp.level}`}>
          <div className="display" style={{ fontSize: 20, lineHeight: 1 }}>
            Stufe {lp.level}
          </div>
          <div className="xpbar" title={lp.max ? 'Höchste Stufe in diesem Kapitel' : `${lp.into} / ${lp.need} Erfahrung`}>
            <span style={{ width: lp.max ? '100%' : `${(100 * lp.into) / lp.need}%` }} />
          </div>
          <div style={{ fontSize: 11, fontWeight: 800 }}>{lp.max ? `Max. in Kapitel ${chapter.n}` : `${lp.into}/${lp.need} EP`}</div>
        </div>
      </div>

      <motion.div
        className="card"
        layout
        style={{ position: 'absolute', left: 12, right: 12, bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))', padding: 12, borderRadius: 18, borderWidth: 3, boxShadow: '0 6px 0 var(--wood-2), 0 10px 24px rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 520, margin: '0 auto' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <AnimatePresence>
            {portrait && (
              <motion.img
                key={portrait}
                src={portrait}
                alt=""
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0 }}
                style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 12, border: '2px solid var(--wood-3)', flex: 'none', background: 'linear-gradient(#3b5bdb, #16206b)' }}
              />
            )}
          </AnimatePresence>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 12, fontWeight: 900, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{kicker}</span>
            <span className="display" style={{ fontSize: 26, lineHeight: 1.1 }}>
              {title}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{text}</span>
          </div>
        </div>
        {sailing ? null : storyHere ? (
          <Pulse onClick={() => onStory(storyHere)}>{here.kind === 'sturm' || here.kind === 'wrack' ? 'Nachsehen' : 'Szene ansehen'}</Pulse>
        ) : atChest ? (
          <Pulse onClick={onChest}>Truhe öffnen!</Pulse>
        ) : fightHere ? (
          <Pulse onClick={() => onFight({ enc: here.enc!, field: ship, boss: false, farm: false })}>Kämpfen!</Pulse>
        ) : boss ? (
          <div className="map-actions">
            {!bossBeaten && (
              <button type="button" className={`btn-gold ${triesLeft > 0 ? '' : 'btn-gold--off'}`} onClick={attackBoss}>
                Boss angreifen
              </button>
            )}
            {outroPending && (
              <button type="button" className="btn-gold" onClick={() => onStory(chapter.outro)}>
                Szene ansehen
              </button>
            )}
            {bossBeaten && !outroPending && nextChapter && (
              <button
                type="button"
                className="btn-gold"
                onClick={() => {
                  game.nextChapter()
                  const st = nextChapter.fields[0].story
                  if (st) window.setTimeout(() => onStory(st), 300)
                }}
              >
                Weiter: Kapitel {nextChapter.n}
              </button>
            )}
            <button type="button" className={`btn-sea ${wind >= RULES.windPerField ? '' : 'btn-sea--off'}`} onClick={farm}>
              Beutezug · {RULES.windPerField} Wind
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {here.kind === 'hafen' && (
              <button type="button" className="btn-gold" style={{ minHeight: 48, fontSize: 16 }} onClick={onShop}>
                Hafenladen
              </button>
            )}
            <button type="button" className={`btn-sea ${canSail ? '' : 'btn-sea--off'}`} onClick={sail}>
              Segeln · {RULES.windPerField} Wind
            </button>
            <div style={{ fontSize: 13, fontWeight: 800 }}>{Math.max(0, wind)} Wind an Bord</div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

function Pulse({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <motion.button type="button" className="btn-gold" onClick={onClick} animate={{ scale: [1, 1.04, 1] }} transition={{ repeat: Infinity, duration: 1.4 }}>
      {children}
    </motion.button>
  )
}
