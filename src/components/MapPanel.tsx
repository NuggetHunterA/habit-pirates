import { AnimatePresence, motion } from 'motion/react'
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { Game } from '../game/store'
import { blocked, bossTriesLeft, doneFields, BOSS_TRIES } from '../game/store'
import { CHAPTERS, FIELD_TEXT, chapterOf } from '../game/map'
import { ENCOUNTERS, FARM_TIERS, type FarmTier } from '../game/foes'
import { levelProgress } from '../game/progress'
import { RULES, windAvailable } from '../game/rules'
import { portraitFor } from '../fight/art'
import SeaMap from './SeaMap'
import Sheet from './Sheet'
import { CHEST_LABEL, chestAt } from '../game/loot'
import './MapPanel.css'

export interface FightRequest {
  enc: string
  /** Feld des Kampfs; null beim Beutezug */
  field: number | null
  boss: boolean
  farm: boolean
  /** Beutezug-Stufe am Boss-Feld */
  tier?: FarmTier
  /** Waechter einer verfluchten Truhe */
  guard?: boolean
  /** Kampf aus einem Zufallsereignis: kostet keinen Wind, Niederlage kostet nichts */
  event?: boolean
  /** Hinweis aus der Flaschenpost: dieser Beutezug bringt sicher ein Item, mindestens selten */
  hint?: boolean
}

interface Props {
  game: Game
  onShop: () => void
  onChest: () => void
  onFight: (r: FightRequest) => void
  onStory: (id: string) => void
  say: (m: string) => void
}

const PANEL_KEY = 'hp.mapPanel'

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
  /** Feld-Panel eingeklappt (Standard), damit die Karte frei bleibt. Die Wahl bleibt gespeichert. */
  const [collapsed, setCollapsedState] = useState(() => {
    try {
      return localStorage.getItem(PANEL_KEY) !== 'open'
    } catch {
      return true
    }
  })
  const setCollapsed = (v: boolean) => {
    setCollapsedState(v)
    try {
      localStorage.setItem(PANEL_KEY, v ? 'closed' : 'open')
    } catch {
      /* egal */
    }
  }
  const drag = useRef<number | null>(null)
  /** Hoehe des Panels als CSS-Variable, damit der Kompass-Knopf der Karte immer darueber sitzt */
  const wrap = useRef<HTMLDivElement>(null)
  const card = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const c = card.current
    const w = wrap.current
    if (!c || !w) return
    const set = () => w.style.setProperty('--map-panel-h', `${c.offsetHeight}px`)
    set()
    const ro = new ResizeObserver(set)
    ro.observe(c)
    return () => ro.disconnect()
  }, [])

  const sail = () => {
    if (wind < RULES.windPerField) return say(`Noch ${RULES.windPerField - Math.max(0, wind)} Wind nötig. Hake Habits ab!`)
    game.sail()
  }

  /** Menue am Boss-Feld: Boss angreifen oder Beutezug in drei Stufen */
  const [menu, setMenu] = useState(false)
  const farm = () => setMenu(true)
  const startFarm = (tier: FarmTier) => {
    if (wind < RULES.windPerField) return say(`Ein Beutezug braucht ${RULES.windPerField} Wind. Hake Habits ab!`)
    setMenu(false)
    // Schwer: ohne den groessten Kampf des Kapitels, der waere mit 60 % mehr kaum zu schaffen
    const pool = tier === 'schwer' && chapter.farm.length > 2 ? chapter.farm.slice(0, -1) : chapter.farm
    onFight({ enc: pick(pool), field: null, boss: false, farm: true, tier, hint: !!g.hint })
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
    if (f.kind === 'truhe') say(chestAt(save.profile, chapter.n, i) === 'verflucht' ? 'Eine verfluchte Truhe! Sie wird bewacht.' : `${CHEST_LABEL[chestAt(save.profile, chapter.n, i)]} in Sicht!`)
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
    text = chestAt(save.profile, chapter.n, ship) === 'verflucht' ? 'Eine verfluchte Truhe. Ein Wächter bewacht sie.' : `${CHEST_LABEL[chestAt(save.profile, chapter.n, ship)]}: Öffne sie und sieh, was drin ist.`
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

  const startNext = () => {
    if (!nextChapter) return
    game.nextChapter()
    const st = nextChapter.fields[0].story
    if (st) window.setTimeout(() => onStory(st), 300)
  }

  /** Wichtigste Aktion fuer die eingeklappte Leiste */
  const primary: ReactNode = sailing ? null : storyHere ? (
    <Pulse small onClick={() => onStory(storyHere)}>{here.kind === 'sturm' || here.kind === 'wrack' ? 'Nachsehen' : 'Szene'}</Pulse>
  ) : atChest ? (
    <Pulse small onClick={onChest}>Öffnen!</Pulse>
  ) : fightHere ? (
    <Pulse small onClick={() => onFight({ enc: here.enc!, field: ship, boss: false, farm: false })}>Kämpfen!</Pulse>
  ) : boss ? (
    !bossBeaten ? (
      <button type="button" className="btn-gold map-card__btn" onClick={farm}>
        Boss
      </button>
    ) : outroPending ? (
      <Pulse small onClick={() => onStory(chapter.outro)}>Szene</Pulse>
    ) : nextChapter ? (
      <button type="button" className="btn-gold map-card__btn" onClick={startNext}>
        Weiter
      </button>
    ) : (
      <button type="button" className="btn-sea map-card__btn" onClick={farm}>
        Beutezug
      </button>
    )
  ) : (
    <button type="button" className={`btn-sea map-card__btn ${canSail ? '' : 'btn-sea--off'}`} onClick={sail}>
      Segeln · {RULES.windPerField}
    </button>
  )

  return (
    <div ref={wrap} style={{ position: 'absolute', inset: 0 }}>
      <SeaMap key={chapter.n} chapter={chapter} field={ship} done={doneFields(save)} onArrive={arrive} onSailingChange={setSailing} />

      <div style={{ position: 'absolute', left: 12, right: 12, top: 12, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, pointerEvents: 'none' }}>
        <div className="map-chip">
          <div className="display" style={{ fontSize: 20, lineHeight: 1 }}>
            Kapitel {chapter.n} <span style={{ fontSize: 15, opacity: 0.85 }}>von {CHAPTERS.length}</span>
          </div>
          <div style={{ fontSize: 12, fontWeight: 800 }}>
            {chapter.name} · Feld {ship + 1}/{fields.length}
          </div>
          {chapter.n === CHAPTERS.length && (
            <div style={{ marginTop: 5, display: 'inline-block', fontSize: 11, fontWeight: 900, padding: '2px 8px', borderRadius: 999, background: '#ffe066', color: '#3b1d00' }}>
              Letztes fertiges Kapitel
            </div>
          )}
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
        ref={card}
        className={`card map-card ${collapsed ? 'map-card--collapsed' : ''}`}
        layout
        transition={{ type: 'spring', stiffness: 420, damping: 36 }}
      >
        <button
          type="button"
          className="map-card__handle"
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Feld-Details aufklappen' : 'Feld-Details einklappen'}
          onClick={() => setCollapsed(!collapsed)}
          onPointerDown={(e) => (drag.current = e.clientY)}
          onPointerUp={(e) => {
            const d = e.clientY - (drag.current ?? e.clientY)
            drag.current = null
            if (d < -20) setCollapsed(false)
            else if (d > 20) setCollapsed(true)
          }}
        >
          <span />
        </button>
        <div className="map-card__row">
          <AnimatePresence>
            {portrait && (
              <motion.img
                key={portrait}
                src={portrait}
                alt=""
                className="map-card__portrait"
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0 }}
              />
            )}
          </AnimatePresence>
          <div className="map-card__text" onClick={() => collapsed && setCollapsed(false)}>
            <span className="map-card__kicker">{kicker}</span>
            <span className="display map-card__title">{title}</span>
            {!collapsed && <span style={{ fontSize: 13, fontWeight: 700 }}>{text}</span>}
          </div>
          {collapsed && primary}
        </div>
        {!collapsed && (sailing ? null : storyHere ? (
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
              <button type="button" className="btn-gold" onClick={startNext}>
                Weiter: Kapitel {nextChapter.n}
              </button>
            )}
            <button type="button" className="btn-sea" onClick={farm}>
              Beutezug
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
        ))}
      </motion.div>
      <AnimatePresence>
        {menu && (
          <Sheet onClose={() => setMenu(false)} label="Boss-Feld">
            <div className="farm">
              <div className="kicker">{here.name}</div>
              {!bossBeaten && boss && (
                <div className="farm__boss card">
                  <img src={portraitFor(boss.foes[0].look)} alt="" className="farm__portrait" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="display" style={{ fontSize: 20 }}>
                      {boss.name}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>
                      Heute noch {triesLeft} von {BOSS_TRIES} Versuchen
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`btn-gold ${triesLeft > 0 ? '' : 'btn-gold--off'}`}
                    onClick={() => {
                      setMenu(false)
                      attackBoss()
                    }}
                  >
                    Angreifen
                  </button>
                </div>
              )}
              <div className="farm__head">
                <span className="display" style={{ fontSize: 22 }}>
                  Beutezug
                </span>
                <span style={{ fontSize: 13, fontWeight: 800 }}>je {RULES.windPerField} Wind · {Math.max(0, wind)} an Bord</span>
              </div>
              {(Object.keys(FARM_TIERS) as FarmTier[]).map((t) => (
                <button key={t} type="button" className={`farm__tier farm__tier--${t} ${wind >= RULES.windPerField ? '' : 'farm__tier--off'}`} onClick={() => startFarm(t)}>
                  <span style={{ flex: 1, textAlign: 'left' }}>
                    <span className="display" style={{ fontSize: 19, display: 'block' }}>
                      {FARM_TIERS[t].name}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{FARM_TIERS[t].text}</span>
                  </span>
                  <span className="farm__cost">≋ {RULES.windPerField}</span>
                </button>
              ))}
              {g.hint && (
                <div className="farm__hint">
                  <b>Schatzkarte aus der Flaschenpost:</b> Der nächste Beutezug bringt sicher ein Item, mindestens selten.
                </div>
              )}
              <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>
                Der Wind wird beim Start bezahlt. Bei einer Niederlage ist er weg, die Crew bekommt die halbe Erfahrung.
              </p>
            </div>
          </Sheet>
        )}
      </AnimatePresence>
    </div>
  )
}

function Pulse({ onClick, children, small }: { onClick: () => void; children: ReactNode; small?: boolean }) {
  return (
    <motion.button type="button" className={`btn-gold ${small ? 'map-card__btn' : ''}`} onClick={onClick} animate={{ scale: [1, 1.04, 1] }} transition={{ repeat: Infinity, duration: 1.4 }}>
      {children}
    </motion.button>
  )
}
