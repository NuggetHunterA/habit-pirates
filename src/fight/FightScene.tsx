import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ABILITIES,
  TRAIT_TEXT,
  abilityReady,
  alive,
  byId,
  createBattle,
  step,
  turnOrder,
  type AbilityId,
  type Battle,
  type FightEvent,
  type FighterDef,
  type Row,
} from '../game/combat'
import { CREW_ABILITIES, DEFAULT_SETUP, crewDefs, type CrewSetup, type Encounter } from '../game/foes'
import { FIGHT_ART } from './art'
import { Stage } from './stage'
import './FightScene.css'

export interface FightResult {
  sieg: boolean
  xp: number
  gold: number
}

interface Props {
  encounter: Encounter
  level?: number
  onExit: (r: FightResult | null) => void
}

type Phase = 'vorbereitung' | 'kampf' | 'ende'

/** Feste Plaetze auf der Buehne */
const SLOTS = {
  crew: { vorne: [[372, 480]], hinten: [[222, 458]] },
  feind: {
    vorne: [
      [600, 470],
      [700, 505],
    ],
    hinten: [[800, 455]],
  },
} as const

function place(defs: FighterDef[]) {
  const used: Record<string, number> = {}
  return defs.map((d) => {
    const key = `${d.side}-${d.row}`
    const i = used[key] ?? 0
    used[key] = i + 1
    const list = SLOTS[d.side][d.row] as readonly (readonly [number, number])[]
    const [x, y] = list[Math.min(i, list.length - 1)]
    return { d, x: x + (i >= list.length ? 40 : 0), y }
  })
}

export default function FightScene({ encounter, level = 1, onExit }: Props) {
  const [phase, setPhase] = useState<Phase>('vorbereitung')
  const [setup, setSetup] = useState<CrewSetup>(DEFAULT_SETUP)
  const [result, setResult] = useState<FightResult | null>(null)
  const [runId, setRunId] = useState(0)

  const start = () => {
    setRunId((n) => n + 1)
    setPhase('kampf')
  }

  return (
    <div className="fight">
      <AnimatePresence mode="wait" initial={false}>
        {phase === 'vorbereitung' && (
          <motion.div key="prep" className="fight__prep" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Prep encounter={encounter} setup={setup} setSetup={setSetup} onStart={start} onBack={() => onExit(null)} />
          </motion.div>
        )}
        {phase !== 'vorbereitung' && (
          <motion.div key={'kampf' + runId} className="fight__battle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <BattleView
              encounter={encounter}
              setup={setup}
              level={level}
              onEnd={(r) => {
                setResult(r)
                setPhase('ende')
              }}
            />
            <AnimatePresence>
              {phase === 'ende' && result && (
                <motion.div className="fight__result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <motion.div className={`result-card ${result.sieg ? 'result-card--win' : ''}`} initial={{ scale: 0.6, y: 30 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }}>
                    <div className="result-card__title display">{result.sieg ? 'Sieg!' : 'Rückzug'}</div>
                    {result.sieg ? (
                      <>
                        <p>Die Krabbenbande zieht sich ins Riff zurück. Der Weg ist frei.</p>
                        <div className="result-card__loot">
                          <span>
                            <b>+{result.xp}</b> Erfahrung
                          </span>
                          <span>
                            <span className="coin" /> <b>+{result.gold}</b> Gold
                          </span>
                        </div>
                      </>
                    ) : (
                      <p>Du verlierst nichts. Probier eine andere Aufstellung oder Fähigkeit, sammle Ausrüstung und versuch es nochmal.</p>
                    )}
                    <div className="result-card__actions">
                      {!result.sieg && (
                        <button type="button" className="btn-sea" onClick={() => setPhase('vorbereitung')}>
                          Aufstellung ändern
                        </button>
                      )}
                      <button type="button" className="btn-gold" onClick={() => onExit(result)}>
                        {result.sieg ? 'Weitersegeln' : 'Zur Karte'}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ---------------------------------------------------------------- Vorbereitung
function Prep({ encounter, setup, setSetup, onStart, onBack }: { encounter: Encounter; setup: CrewSetup; setSetup: (s: CrewSetup) => void; onStart: () => void; onBack: () => void }) {
  const swap = () =>
    setSetup({
      jonte: { ...setup.jonte, row: setup.kanonier.row },
      kanonier: { ...setup.kanonier, row: setup.jonte.row },
    })
  const setAbility = (who: 'jonte' | 'kanonier', ability: AbilityId) => setSetup({ ...setup, [who]: { ...setup[who], ability } })
  const traits = Array.from(new Set(encounter.foes.flatMap((f) => f.traits ?? [])))

  const crewCard = (who: 'jonte' | 'kanonier', row: Row) => (
    <div className="prep-pirate" key={who}>
      <div className="prep-pirate__head">
        <img src={FIGHT_ART.portraits[who]} alt="" className={who === 'kanonier' ? 'is-secret' : ''} />
        <div>
          <div className="prep-pirate__name">{who === 'jonte' ? 'Kapitän Jonte' : 'Zweiter Pirat'}</div>
          <div className="prep-pirate__row">{row === 'vorne' ? 'Vordere Reihe' : 'Hintere Reihe'}</div>
        </div>
      </div>
      <div className="prep-pirate__abilities" role="radiogroup" aria-label="Fähigkeit wählen">
        {CREW_ABILITIES[who].map((id) => (
          <button key={id} type="button" role="radio" aria-checked={setup[who].ability === id} className="ability-chip" onClick={() => setAbility(who, id)}>
            <b>{ABILITIES[id].name}</b>
            <span>{ABILITIES[id].text}</span>
          </button>
        ))}
      </div>
    </div>
  )

  const front = setup.jonte.row === 'vorne' ? 'jonte' : 'kanonier'
  const back = front === 'jonte' ? 'kanonier' : 'jonte'

  return (
    <div className="prep">
      <div className="prep__top">
        <button type="button" className="btn-wood" onClick={onBack}>
          ← Karte
        </button>
        <div className="prep__title display">{encounter.name}</div>
      </div>
      <p className="prep__intro">{encounter.intro}</p>

      <section className="prep__foes" aria-label="Gegner">
        {encounter.foes.map((f) => (
          <div key={f.id} className="foe-chip">
            <img src={FIGHT_ART.portraits[f.look]} alt="" className={f.look === 'krabbenmatrose' ? 'is-matrose' : ''} />
            <div>
              <b>{f.name}</b>
              <span>
                {f.stats.leben} Leben · {f.row === 'vorne' ? 'vorne' : 'hinten'}
              </span>
            </div>
          </div>
        ))}
      </section>
      <ul className="prep__traits">
        {traits.map((t) => (
          <li key={t}>{TRAIT_TEXT[t]}</li>
        ))}
      </ul>

      <section className="prep__crew" aria-label="Aufstellung">
        <div className="prep__rowlabel">
          <span>Aufstellung</span>
          <button type="button" className="btn-dashed prep__swap" onClick={swap}>
            ⇅ Reihen tauschen
          </button>
        </div>
        <p className="prep__hint">Vorne wird öfter getroffen. Nahkämpfer machen hinten weniger Schaden, Fernkämpfer treffen von überall.</p>
        {crewCard(front, 'vorne')}
        {crewCard(back, 'hinten')}
      </section>

      <button type="button" className="btn-gold prep__go" onClick={onStart}>
        Angreifen!
      </button>
    </div>
  )
}

// ---------------------------------------------------------------- Kampf
interface Banner {
  n: number
  text: string
  sub?: string
  tone: 'crew' | 'feind' | 'info'
}

function BattleView({ encounter, setup, level, onEnd }: { encounter: Encounter; setup: CrewSetup; level: number; onEnd: (r: FightResult) => void }) {
  const cvRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<Stage | null>(null)
  const battleRef = useRef<Battle | null>(null)
  const wants = useRef(new Set<string>())
  const autoRef = useRef(false)
  const [auto, setAuto] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [, force] = useState(0)
  const [banner, setBanner] = useState<Banner | null>(null)
  const [log, setLog] = useState<string[]>([])
  const bannerN = useRef(0)
  const rerender = useCallback(() => force((n) => n + 1), [])

  const showBanner = useCallback((text: string, tone: Banner['tone'], sub?: string) => {
    bannerN.current++
    setBanner({ n: bannerN.current, text, sub, tone })
  }, [])

  useEffect(() => {
    autoRef.current = auto
  }, [auto])
  useEffect(() => {
    if (stageRef.current) stageRef.current.speed = speed
  }, [speed])

  useEffect(() => {
    const stage = new Stage(cvRef.current!)
    stage.speed = speed
    stageRef.current = stage
    const defs = [...crewDefs(setup, level), ...encounter.foes]
    const b = createBattle(defs)
    battleRef.current = b
    for (const { d, x, y } of place(defs)) {
      stage.addActor({ id: d.id, look: d.look, side: d.side, name: d.name, x, y, hp: d.stats.leben, hpMax: d.stats.leben, energy: 0, hasAbility: !!d.ability, alive: true })
    }
    let cancelled = false
    const sync = () => {
      for (const f of b.fighters) {
        const a = stage.actors.get(f.id)!
        a.energy = f.energy
        a.holtAus = f.holtAus
        a.brand = f.brand
        a.buff = f.ruf
      }
    }

    const run = async () => {
      showBanner(encounter.name, 'feind', 'Kampf beginnt!')
      await stage.wait(1.1)
      while (!b.over && !cancelled) {
        if (autoRef.current) for (const f of alive(b, 'crew')) if (abilityReady(f)) wants.current.add(f.id)
        const ev = step(b, wants.current)
        const lines = describe(b, ev)
        if (lines.length) setLog((l) => [...lines.reverse(), ...l].slice(0, 30))
        await playEvents(stage, b, ev, showBanner)
        sync()
        rerender()
        if (cancelled) return
        await stage.wait(0.18)
      }
      if (cancelled) return
      await stage.wait(0.4)
      const win = b.sieg
      if (win) for (const f of alive(b, 'crew')) stage.play(f.id, 'cheer')
      await stage.wait(1.2)
      const [g0, g1] = encounter.reward.gold
      onEnd({ sieg: win, xp: win ? encounter.reward.xp : 0, gold: win ? g0 + Math.floor(Math.random() * (g1 - g0 + 1)) : 0 })
    }
    void run()
    return () => {
      cancelled = true
      stage.destroy()
    }
    // Kampf startet einmal pro Mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const b = battleRef.current
  const crew = b ? b.fighters.filter((f) => f.side === 'crew') : []
  const order = b && !b.over ? turnOrder(b, 6) : []
  const threat = b ? alive(b, 'feind').some((f) => f.holtAus) : false

  return (
    <div className="battle">
      <div className="battle__order" aria-label="Zugreihenfolge">
        <span className="battle__order-label">Als Nächstes</span>
        {order.map((id, i) => {
          const f = byId(b!, id)
          return (
            <motion.img
              layout
              key={id + '-' + i}
              src={FIGHT_ART.portraits[f.look]}
              alt={f.name}
              className={`order-icon order-icon--${f.side} ${f.look === 'krabbenmatrose' ? 'is-matrose' : ''} ${f.look === 'kanonier' ? 'is-secret' : ''} ${i === 0 ? 'is-next' : ''}`}
            />
          )
        })}
      </div>
      <div className="battle__stage">
        <canvas ref={cvRef} className="battle__canvas" role="img" aria-label={`Kampf gegen ${encounter.name}`} />
        <AnimatePresence>
          {banner && (
            <motion.div
              key={banner.n}
              className={`battle__banner battle__banner--${banner.tone}`}
              initial={{ opacity: 0, scale: 1.4 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18 }}
              onAnimationComplete={() => window.setTimeout(() => setBanner((x) => (x?.n === banner.n ? null : x)), 900 / speed)}
            >
              <div className="display">{banner.text}</div>
              {banner.sub && <small>{banner.sub}</small>}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="battle__controls">
          <button type="button" className="ctl" aria-pressed={speed === 2} onClick={() => setSpeed((s) => (s === 1 ? 2 : 1))}>
            {speed}×
          </button>
          <button type="button" className="ctl" aria-pressed={auto} onClick={() => setAuto((a) => !a)}>
            Auto
          </button>
        </div>
      </div>
      <div className="battle__abilities">
        {crew.map((f) => {
          const ready = abilityReady(f) && !b!.over
          const queued = wants.current.has(f.id)
          const hint = ready && threat && f.ability === 'sturmklinge' && !auto
          return (
            <button
              key={f.id}
              type="button"
              className={`skill ${ready ? 'is-ready' : ''} ${hint ? 'is-hint' : ''} ${f.hp <= 0 ? 'is-down' : ''}`}
              disabled={!ready || queued}
              onClick={() => {
                wants.current.add(f.id)
                rerender()
              }}
              aria-label={`${ABILITIES[f.ability!].name} auslösen`}
            >
              <span className="skill__ring" style={{ ['--e' as string]: `${Math.min(100, f.energy)}%` }}>
                <img src={FIGHT_ART.portraits[f.look]} alt="" className={f.look === 'kanonier' ? 'is-secret' : ''} />
              </span>
              <span className="skill__text">
                <b>{ABILITIES[f.ability!].name}</b>
                <small>{f.hp <= 0 ? 'Kampfunfähig' : queued ? 'Gleich!' : ready ? (hint ? 'Jetzt! Unterbricht den Großangriff' : 'Bereit, antippen') : `${Math.round(f.energy)} %`}</small>
              </span>
            </button>
          )
        })}
      </div>
      <ol className="battle__log" aria-label="Kampfverlauf">
        {log.map((l, i) => (
          <li key={log.length - i}>{l}</li>
        ))}
      </ol>
    </div>
  )
}

/** Kurzer Text fuer den Kampfverlauf */
function describe(b: Battle, ev: FightEvent[]): string[] {
  const n = (id: string) => {
    const f = byId(b, id)
    return f.name === '???' ? 'Zweiter Pirat' : f.name
  }
  const out: string[] = []
  for (const e of ev) {
    if (e.t === 'treffer') out.push(`${n(e.who)} trifft ${n(e.target)}: ${e.dmg}${e.krit ? ' (kritisch!)' : ''}${e.geblockt ? ' (Ankerschild)' : ''}`)
    else if (e.t === 'verfehlt') out.push(`${n(e.target)} weicht ${n(e.who)} aus`)
    else if (e.t === 'faehigkeit') out.push(`${n(e.who)} setzt ${ABILITIES[e.ability].name} ein`)
    else if (e.t === 'holtAus') out.push(`${n(e.who)} holt zum Scherenwirbel aus!`)
    else if (e.t === 'unterbrochen') out.push(`${n(e.who)} wurde unterbrochen`)
    else if (e.t === 'brand') out.push(`${n(e.target)} brennt: ${e.dmg}`)
    else if (e.t === 'heilung') out.push(`${n(e.target)} heilt ${e.amount}`)
    else if (e.t === 'besiegt') out.push(`${n(e.who)} ist besiegt`)
  }
  return out
}

// ---------------------------------------------------------------- Abspielen
async function playEvents(stage: Stage, b: Battle, ev: FightEvent[], banner: (t: string, tone: Banner['tone'], sub?: string) => void) {
  let i = 0
  const name = (id: string) => byId(b, id).name
  /** Treffer-Ereignisse, die direkt zu einer Aktion gehoeren */
  const takeHits = () => {
    const out: FightEvent[] = []
    while (i < ev.length && ['treffer', 'verfehlt', 'besiegt', 'zurueck', 'unterbrochen', 'heilung'].includes(ev[i].t)) out.push(ev[i++])
    return out
  }
  const showHits = async (hits: FightEvent[]) => {
    for (const h of hits) {
      if (h.t === 'treffer') {
        const a = stage.actors.get(h.target)!
        a.hp = Math.max(0, a.hp - h.dmg)
        stage.play(h.target, 'hit')
        stage.hitFx(h.target, h.krit, h.geblockt)
        stage.float(h.target, h.krit ? `${h.dmg}!` : String(h.dmg), h.krit ? '#ffd43b' : a.side === 'crew' ? '#ff8787' : '#ffffff', h.krit ? 40 : 30)
        if (h.geblockt) stage.float(h.target, 'Ankerschild', '#bac8ff', 16)
        void stage.knock(h.target, a.side === 'crew' ? -10 : 10)
      } else if (h.t === 'verfehlt') {
        stage.play(h.target, 'dodge')
        stage.float(h.target, 'Daneben!', '#d0ebff', 22)
      } else if (h.t === 'besiegt') {
        const a = stage.actors.get(h.who)!
        a.alive = false
        a.hp = 0
        stage.play(h.who, 'down')
      } else if (h.t === 'zurueck') {
        void stage.knock(h.target, 60)
        stage.float(h.target, 'Zurückgeworfen', '#96f2d7', 16)
      } else if (h.t === 'unterbrochen') {
        stage.actors.get(h.who)!.holtAus = false
        const c = stage.center(h.who)
        stage.floatAt(c.x, c.y - 90, 'Unterbrochen!', '#63e6be', 34)
        stage.ring(c.x, c.y, 120, 'rgba(99,230,190,0.9)')
      } else if (h.t === 'heilung') {
        const a = stage.actors.get(h.target)!
        a.hp = Math.min(a.hpMax, a.hp + h.amount)
        stage.float(h.target, `+${h.amount}`, '#8ce99a', 26)
        const c = stage.center(h.target)
        stage.burst(c.x, c.y + 30, 14, ['#ffe066', '#fff3bf', '#8ce99a'], 120, -220, true)
      }
    }
  }

  while (i < ev.length) {
    const e = ev[i++]
    switch (e.t) {
      case 'zug':
        break
      case 'brand': {
        const a = stage.actors.get(e.target)!
        a.hp = Math.max(0, a.hp - e.dmg)
        stage.float(e.target, String(e.dmg), '#ff922b', 24)
        const c = stage.center(e.target)
        stage.burst(c.x, c.y, 10, ['#ffd43b', '#ff922b', '#f03e3e'], 140, -200, true)
        await stage.wait(0.35)
        break
      }
      case 'angriff': {
        if (e.ranged) {
          stage.play(e.who, 'attack')
          const m = stage.muzzle(e.who)
          stage.burst(m.x, m.y, 10, ['#fff3bf', '#ffd43b', '#ff922b'], 200, 0, true)
          stage.burst(m.x, m.y, 5, ['#868e96', '#495057'], 80, -80, false, 7)
          await stage.shoot('kugel', e.who, e.target, 0.32, 30, m)
          await showHits(takeHits())
          await stage.wait(0.3)
        } else {
          await stage.lunge(e.who, e.target, 0.22)
          stage.play(e.who, 'attack')
          await stage.wait(0.13)
          await showHits(takeHits())
          await stage.wait(0.2)
          await stage.back(e.who, 0.22)
        }
        break
      }
      case 'faehigkeit': {
        const ab = ABILITIES[e.ability]
        stage.setDim(1)
        banner(ab.name, 'crew', name(e.who) === '???' ? undefined : name(e.who))
        stage.play(e.who, 'cast')
        await stage.wait(0.45)
        if (e.ability === 'sturmklinge') {
          const from = stage.center(e.who)
          stage.burst(from.x + 40, from.y - 30, 16, ['#c3fae8', '#63e6be', '#ffffff'], 260, 0, true)
          await stage.shoot('wind', e.who, e.targets[0], 0.3)
          stage.doShake(12)
          await showHits(takeHits())
          await stage.wait(0.35)
        } else if (e.ability === 'kapitaensruf') {
          for (const id of e.targets) {
            const c = stage.center(id)
            stage.ring(c.x, c.y, 90, 'rgba(255,212,59,0.95)', 0.6)
          }
          await stage.wait(0.2)
          await showHits(takeHits())
          await stage.wait(0.5)
        } else if (e.ability === 'donnerbuechse') {
          const m = stage.muzzle(e.who)
          stage.burst(m.x, m.y, 24, ['#fff3bf', '#ffd43b', '#ff922b'], 320, 0, true)
          const cs = e.targets.map((id) => stage.center(id))
          const mid = { x: cs.reduce((s, c) => s + c.x, 0) / cs.length, y: cs.reduce((s, c) => s + c.y, 0) / cs.length }
          await stage.shootAt('feuer', m, mid, 0.5, 110)
          stage.explode(mid.x, mid.y, 1.2)
          await showHits(takeHits())
          await stage.wait(0.5)
        } else if (e.ability === 'kettenkugel') {
          const m = stage.muzzle(e.who)
          stage.burst(m.x, m.y, 16, ['#fff3bf', '#ffd43b'], 260, 0, true)
          await stage.shoot('kette', e.who, e.targets[0], 0.4, 40, m)
          await showHits(takeHits())
          stage.float(e.targets[0], 'Rüstung halbiert', '#ffa8a8', 16)
          await stage.wait(0.4)
        }
        stage.setDim(0)
        break
      }
      case 'holtAus': {
        stage.actors.get(e.who)!.holtAus = true
        banner('Scherenwirbel!', 'feind', `${name(e.who)} holt zum Großangriff aus`)
        stage.doShake(4)
        await stage.wait(1.0)
        break
      }
      case 'wirbel': {
        const a = stage.actors.get(e.who)!
        a.holtAus = false
        banner('Scherenwirbel', 'feind')
        stage.setDim(0.6)
        const crewIds = e.targets
        await stage.lunge(e.who, crewIds[0], 0.25)
        stage.play(e.who, 'spin')
        await stage.wait(0.3)
        stage.doShake(12)
        await showHits(takeHits())
        await stage.wait(0.45)
        stage.setDim(0)
        await stage.back(e.who, 0.3)
        break
      }
      case 'treffer':
      case 'verfehlt':
      case 'besiegt':
      case 'zurueck':
      case 'unterbrochen':
      case 'heilung':
        i--
        await showHits(takeHits())
        await stage.wait(0.4)
        break
      case 'ende':
        banner(e.sieg ? 'Sieg!' : 'Niederlage', e.sieg ? 'crew' : 'feind')
        break
    }
  }
}
