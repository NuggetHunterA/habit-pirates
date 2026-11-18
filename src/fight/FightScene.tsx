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
  type FighterStats,
  type Row,
} from '../game/combat'
import { CREW, MAX_PER_ROW, START_CREW, abilityLabel, crewDefs, crewName, crewTitle, defaultSetup, fighterSlots, type CrewId, type CrewSetup, type Encounter } from '../game/foes'
import { isSpoilerFree, portraitFor } from './art'
import { rollItem } from '../game/loot'
import type { Extra } from '../game/schools'
import { levelFor } from '../game/progress'
import type { Item } from '../game/types'
import LootList from '../components/LootList'
import { Stage } from './stage'
import './FightScene.css'

export interface FightResult {
  sieg: boolean
  xp: number
  gold: number
  items: Item[]
}

interface Props {
  encounter: Encounter
  /** Alle Piraten, die schon an Bord sind */
  crew?: CrewId[]
  level?: number
  /** Fertige Kampfwerte je Pirat (Stufe plus Ausruestung). Ohne: nur Stufe. */
  bonus?: Partial<Record<CrewId, FighterStats>>
  /** Item-Effekte, Schul- und Set-Boni fuer die gewaehlte Aufstellung */
  extras?: (fighters: CrewId[]) => Partial<Record<CrewId, Extra>>
  /** Zuletzt gewaehlte Aufstellung */
  initialSetup?: CrewSetup
  onSetup?: (s: CrewSetup) => void
  /** Vor jedem Start gefragt. Ein Text bedeutet: nicht starten (z. B. keine Boss-Versuche mehr). */
  canStart?: () => string | null
  /** Erfahrung vor dem Kampf und Hoechststufe, fuer die Stufen-Anzeige */
  xp?: number
  cap?: number
  /** Aktuelles Kapitel, bestimmt den Beute-Pool */
  chapter?: number
  onExit: (r: FightResult | null) => void
}

type Phase = 'vorbereitung' | 'kampf' | 'ende'

/** Feste Plaetze auf der Buehne */
const SLOTS = {
  crew: {
    vorne: [
      [402, 462],
      [318, 516],
    ],
    hinten: [
      [248, 440],
      [162, 502],
    ],
  },
  feind: {
    vorne: [
      [600, 470],
      [700, 505],
    ],
    hinten: [
      [805, 452],
      [870, 505],
    ],
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

export default function FightScene({ encounter, crew = START_CREW, level = 1, bonus, extras, initialSetup, onSetup, canStart, xp, cap, chapter = 1, onExit }: Props) {
  const [phase, setPhase] = useState<Phase>('vorbereitung')
  const [setup, setSetup] = useState<CrewSetup>(() => validSetup(initialSetup, crew) ?? defaultSetup(crew))
  const [result, setResult] = useState<FightResult | null>(null)
  const [runId, setRunId] = useState(0)
  const [note, setNote] = useState<string | null>(null)

  const start = () => {
    const err = canStart?.() ?? null
    setNote(err)
    if (err) {
      setPhase('vorbereitung')
      return
    }
    onSetup?.(setup)
    setRunId((n) => n + 1)
    setPhase('kampf')
  }
  const lvBefore = xp != null && cap ? levelFor(xp, cap) : 0
  const lvAfter = xp != null && cap && result?.sieg ? levelFor(xp + result.xp, cap) : 0

  return (
    <div className="fight">
      <AnimatePresence mode="wait" initial={false}>
        {phase === 'vorbereitung' && (
          <motion.div key="prep" className="fight__prep" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Prep encounter={encounter} crew={crew} setup={setup} setSetup={setSetup} onStart={start} onBack={() => onExit(null)} note={note} />
          </motion.div>
        )}
        {phase !== 'vorbereitung' && (
          <motion.div key={'kampf' + runId} className="fight__battle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <BattleView
              encounter={encounter}
              setup={setup}
              level={level}
              bonus={bonus}
              extras={extras}
              chapter={chapter}
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
                        <p>{encounter.outro}</p>
                        {lvAfter > lvBefore && (
                          <motion.div className="result-card__level display" initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }} transition={{ delay: 0.5 }}>
                            Stufe {lvAfter} erreicht!
                          </motion.div>
                        )}
                        <LootList xp={result.xp} gold={result.gold} items={result.items} />
                      </>
                    ) : (
                      <p>Du verlierst nichts. Probier eine andere Aufstellung oder Fähigkeit, sammle Ausrüstung und versuch es nochmal.</p>
                    )}
                    <div className="result-card__actions">
                      {!result.sieg && (
                        <button type="button" className="btn-sea" onClick={() => (setNote(null), setPhase('vorbereitung'))}>
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

/** Gespeicherte Aufstellung nur nutzen, wenn alle darin noch an Bord sind */
function validSetup(s: CrewSetup | undefined, crew: CrewId[]): CrewSetup | null {
  if (!s?.length || s.some((p) => !crew.includes(p.id) || !CREW[p.id].abilities.includes(p.ability))) return null
  return s
}

const isSecret = (look: string) => isSpoilerFree() && look in CREW && CREW[look as CrewId].secret

// ---------------------------------------------------------------- Vorbereitung
function Prep({
  encounter,
  crew,
  setup,
  setSetup,
  onStart,
  onBack,
  note,
}: {
  encounter: Encounter
  crew: CrewId[]
  setup: CrewSetup
  setSetup: (s: CrewSetup) => void
  onStart: () => void
  onBack: () => void
  note?: string | null
}) {
  const slots = fighterSlots(crew.length)
  const traits = Array.from(new Set(encounter.foes.flatMap((f) => f.traits ?? [])))
  const inRow = (row: Row) => setup.filter((p) => p.row === row)
  const picked = (id: CrewId) => setup.find((p) => p.id === id)

  const toggle = (id: CrewId) => {
    if (picked(id)) {
      if (setup.length > 1) setSetup(setup.filter((p) => p.id !== id))
      return
    }
    if (setup.length >= slots) return
    const m = CREW[id]
    const want: Row = m.ranged ? 'hinten' : 'vorne'
    const row: Row = inRow(want).length < MAX_PER_ROW ? want : want === 'vorne' ? 'hinten' : 'vorne'
    setSetup([...setup, { id, row, ability: m.abilities[0] }])
  }
  const move = (id: CrewId) =>
    setSetup(setup.map((p) => (p.id === id ? { ...p, row: p.row === 'vorne' ? 'hinten' : 'vorne' } : p)))
  const setAbility = (id: CrewId, ability: AbilityId) => setSetup(setup.map((p) => (p.id === id ? { ...p, ability } : p)))

  const card = (id: CrewId) => {
    const p = picked(id)!
    const m = CREW[id]
    const hide = isSpoilerFree() && !!m.hideAbilities
    const other: Row = p.row === 'vorne' ? 'hinten' : 'vorne'
    const full = inRow(other).length >= MAX_PER_ROW
    return (
      <div className="prep-pirate" key={id}>
        <div className="prep-pirate__head">
          <img src={portraitFor(id)} alt="" className={isSecret(id) ? 'is-secret' : ''} />
          <div className="prep-pirate__who">
            <div className="prep-pirate__name">{crewTitle(id, isSpoilerFree())}</div>
            <div className="prep-pirate__row">{m.ranged ? 'Fernkampf' : 'Nahkampf'}</div>
          </div>
          <button type="button" className="btn-wood prep-pirate__move" disabled={full} onClick={() => move(id)}>
            {p.row === 'vorne' ? '↓ Nach hinten' : '↑ Nach vorne'}
          </button>
        </div>
        <div className="prep-pirate__abilities" role="radiogroup" aria-label="Fähigkeit wählen">
          {m.abilities.map((ab, i) => (
            <button key={ab} type="button" role="radio" aria-checked={p.ability === ab} className="ability-chip" onClick={() => setAbility(id, ab)}>
              <b>{hide ? `Fähigkeit ${i + 1}` : ABILITIES[ab].name}</b>
              <span>{hide ? 'Wird verraten, wenn dieser Pirat an Bord kommt.' : ABILITIES[ab].text}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const rowBox = (row: Row) => (
    <div className={`prep-row prep-row--${row}`}>
      <div className="prep-row__label">
        {row === 'vorne' ? 'Vordere Reihe' : 'Hintere Reihe'} <span>{inRow(row).length}/{MAX_PER_ROW}</span>
      </div>
      {inRow(row).map((p) => card(p.id))}
      {!inRow(row).length && <div className="prep-row__empty">Niemand. {row === 'vorne' ? 'Dann wird die hintere Reihe direkt angegriffen.' : ''}</div>}
    </div>
  )

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
            <img src={portraitFor(f.look)} alt="" className={f.look === 'krabbenmatrose' ? 'is-matrose' : ''} />
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

      <section className="prep__crew" aria-label="Crew auswählen">
        <div className="prep__rowlabel">
          <span>Wer kämpft?</span>
          <span className="prep__count">
            {setup.length} von {slots} Plätzen
          </span>
        </div>
        <div className="roster" role="group" aria-label="Crew an Bord">
          {crew.map((id) => {
            const on = !!picked(id)
            const blocked = !on && setup.length >= slots
            return (
              <button key={id} type="button" className={`roster__pirate ${on ? 'is-on' : ''}`} aria-pressed={on} disabled={blocked || (on && setup.length === 1)} onClick={() => toggle(id)}>
                <img src={portraitFor(id)} alt="" className={isSecret(id) ? 'is-secret' : ''} />
                <span>{crewName(id, isSpoilerFree())}</span>
              </button>
            )
          })}
        </div>
        <p className="prep__hint">
          {crew.length > slots
            ? `Es kämpfen höchstens ${slots} Piraten. Tipp einen an, um ihn an Land zu lassen, und dann einen anderen, um ihn aufzustellen.`
            : 'Mit jedem neuen Crewmitglied kommt ein Platz dazu, bis vier Piraten kämpfen.'}{' '}
          Vorne wird öfter getroffen, Nahkämpfer machen hinten weniger Schaden.
        </p>
        {rowBox('vorne')}
        {rowBox('hinten')}
      </section>

      {note && (
        <p className="prep__note" role="alert">
          {note}
        </p>
      )}
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

function BattleView({ encounter, setup, level, bonus, extras, chapter, onEnd }: { encounter: Encounter; setup: CrewSetup; level: number; bonus?: Partial<Record<CrewId, FighterStats>>; extras?: (fighters: CrewId[]) => Partial<Record<CrewId, Extra>>; chapter: number; onEnd: (r: FightResult) => void }) {
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
    const ex = extras?.(setup.map((p) => p.id))
    const defs = [...crewDefs(setup, level, bonus, isSpoilerFree(), ex), ...encounter.foes]
    stage.bg = encounter.bg
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
      // Glueck-Schule und Goldene-Moewe-Set: mehr Beute
      const crewMods = defs.filter((d) => d.side === 'crew').map((d) => d.mods ?? {})
      const goldBonus = Math.max(0, ...crewMods.map((m) => m.goldBonus ?? 0))
      const extraItem = Math.max(0, ...crewMods.map((m) => m.extraItem ?? 0))
      const items = win && Math.random() < encounter.reward.itemChance ? [rollItem(encounter.boss ? 'selten' : 'gewoehnlich', chapter)] : []
      if (win && extraItem && Math.random() < extraItem) items.push(rollItem('gewoehnlich', chapter))
      const gold = win ? Math.round((g0 + Math.floor(Math.random() * (g1 - g0 + 1))) * (1 + goldBonus)) : 0
      onEnd({ sieg: win, xp: win ? encounter.reward.xp : 0, gold, items })
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
              src={portraitFor(f.look)}
              alt={f.name}
              className={`order-icon order-icon--${f.side} ${f.look === 'krabbenmatrose' ? 'is-matrose' : ''} ${isSecret(f.look) ? 'is-secret' : ''} ${i === 0 ? 'is-next' : ''}`}
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
              aria-label={`${abilityLabel(f.id as CrewId, f.ability!, ABILITIES, isSpoilerFree())} auslösen`}
            >
              <span className="skill__ring" style={{ ['--e' as string]: `${Math.min(100, f.energy)}%` }}>
                <img src={portraitFor(f.look)} alt="" className={isSecret(f.look) ? 'is-secret' : ''} />
              </span>
              <span className="skill__text">
                <b>{abilityLabel(f.id as CrewId, f.ability!, ABILITIES, isSpoilerFree())}</b>
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
    return f.name === '???' ? 'Geheimer Pirat' : f.name
  }
  const out: string[] = []
  for (const e of ev) {
    if (e.t === 'treffer') out.push(`${n(e.who)} trifft ${n(e.target)}: ${e.dmg}${e.krit ? ' (kritisch!)' : ''}${e.geblockt ? ' (Ankerschild)' : ''}`)
    else if (e.t === 'verfehlt') out.push(`${n(e.target)} weicht ${n(e.who)} aus`)
    else if (e.t === 'faehigkeit') out.push(`${n(e.who)} setzt ${e.who in CREW ? abilityLabel(e.who as CrewId, e.ability, ABILITIES, isSpoilerFree()) : ABILITIES[e.ability].name} ein`)
    else if (e.t === 'holtAus') out.push(`${n(e.who)} holt zum ${e.name} aus!`)
    else if (e.t === 'phase') out.push(e.text)
    else if (e.t === 'durch') out.push(`${n(e.who)} schlägt durch ${n(e.target)} hindurch`)
    else if (e.t === 'unterbrochen') out.push(`${n(e.who)} wurde unterbrochen`)
    else if (e.t === 'brand') out.push(`${n(e.target)} ${e.blut ? 'blutet' : e.gift ? 'leidet unter Gift' : 'brennt'}: ${e.dmg}`)
    else if (e.t === 'effekt') out.push(`${n(e.target)}: ${e.text}`)
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
    while (i < ev.length && ['treffer', 'verfehlt', 'besiegt', 'zurueck', 'unterbrochen', 'heilung', 'durch', 'phase', 'verstaerkung', 'effekt'].includes(ev[i].t)) out.push(ev[i++])
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
      } else if (h.t === 'durch') {
        stage.play(h.target, 'dodge')
        stage.float(h.target, 'Durch den Schleier!', '#ced4da', 20)
      } else if (h.t === 'phase') {
        banner(h.text, 'feind')
        stage.play(h.who, 'cheer')
        stage.doShake(10)
        const c = stage.center(h.who)
        stage.ring(c.x, c.y, 160, 'rgba(255,135,135,0.9)')
        await stage.wait(1.1)
      } else if (h.t === 'verstaerkung') {
        const free = [...SLOTS.feind.vorne, ...SLOTS.feind.hinten].filter(([x, y]) => ![...stage.actors.values()].some((a) => a.alive && a.side === 'feind' && Math.abs(a.x - x) < 30 && Math.abs(a.y - y) < 30))
        h.adds.forEach((id, k) => {
          const f = byId(b, id)
          const [x, y] = free[k] ?? [760 + k * 50, 480]
          stage.addActor({ id, look: f.look, side: 'feind', name: f.name, x, y, hp: f.hp, hpMax: f.stats.leben, energy: 0, hasAbility: false, alive: true })
          stage.burst(x, y - 60, 18, ['#dee2e6', '#adb5bd', '#96f2d7'], 160, -120, true)
        })
        await stage.wait(0.8)
      } else if (h.t === 'effekt') {
        stage.float(h.target, h.text, h.tone === 'gut' ? '#ffe066' : '#ffa8a8', 17)
        await stage.wait(0.15)
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
        stage.float(e.target, String(e.dmg), e.gift ? '#8ce99a' : e.blut ? '#ff6b6b' : '#ff922b', 24)
        const c = stage.center(e.target)
        stage.burst(c.x, c.y, 10, e.gift ? ['#b2f2bb', '#69db7c', '#2b8a3e'] : e.blut ? ['#ffa8a8', '#e03131', '#a61e4d'] : ['#ffd43b', '#ff922b', '#f03e3e'], 140, -200, true)
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
        stage.setDim(1)
        banner(abilityLabel(e.who as CrewId, e.ability, ABILITIES, isSpoilerFree()), 'crew', name(e.who) === '???' ? undefined : name(e.who))
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
        } else if (e.ability === 'sternenkurs') {
          const t = e.targets[0]
          const c0 = stage.center(e.who)
          stage.burst(c0.x, c0.y, 18, ['#fff3bf', '#ffffff', '#a5d8ff'], 260, 0, true)
          await stage.lunge(e.who, t, 0.12)
          stage.play(e.who, 'attack')
          await showHits(takeHits())
          const c = stage.center(t)
          stage.burst(c.x, c.y, 20, ['#fff3bf', '#ffffff', '#a5d8ff'], 380, 0, true)
          await stage.wait(0.25)
          await stage.back(e.who, 0.15)
          stage.float(e.who, 'Ausweichen +40 %', '#a5d8ff', 16)
          await stage.wait(0.3)
        } else if (e.ability === 'windstille') {
          for (const id of e.targets) {
            const c = stage.center(id)
            stage.ring(c.x, c.y, 80, 'rgba(165,216,255,0.95)', 0.7)
            stage.burst(c.x, c.y, 10, ['#e7f5ff', '#a5d8ff'], 120, 0, true)
          }
          await showHits(takeHits())
          await stage.wait(0.6)
        } else if (e.ability === 'kombuesenfeuer' || e.ability === 'eintopf') {
          for (const id of e.targets) {
            const c = stage.center(id)
            stage.ring(c.x, c.y, 90, e.ability === 'eintopf' ? 'rgba(255,212,59,0.95)' : 'rgba(140,233,154,0.95)', 0.6)
          }
          await stage.wait(0.2)
          await showHits(takeHits())
          await stage.wait(0.5)
        } else if (e.ability === 'adlerauge' || e.ability === 'sturzflug') {
          const m = stage.muzzle(e.who)
          for (const t of e.targets) {
            await stage.shoot('wind', e.who, t, 0.28, 60, m)
            const c = stage.center(t)
            stage.ring(c.x, c.y, 60, 'rgba(255,107,107,0.95)', 0.5)
          }
          await showHits(takeHits())
          if (e.ability === 'adlerauge') stage.float(e.targets[0], 'Markiert: +30 % Schaden', '#ffa8a8', 16)
          await stage.wait(0.4)
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
        banner(`${e.name}!`, 'feind', `${name(e.who)} holt zum Großangriff aus`)
        stage.doShake(4)
        await stage.wait(1.0)
        break
      }
      case 'wirbel': {
        const a = stage.actors.get(e.who)!
        a.holtAus = false
        banner(e.name, 'feind')
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
      case 'durch':
      case 'phase':
      case 'verstaerkung':
      case 'effekt':
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
