// Prueft, dass alle Item-Wirkungen im Kampf laufen: npm run fxcheck
import { simulate, type Mods } from '../src/game/combat.ts'
import { ENCOUNTERS, crewDefs, defaultSetup } from '../src/game/foes.ts'
import { crewStats } from '../src/game/progress.ts'

const ALL: Mods = {
  critBleed: true, bleedMax: 5, critVsBrand: 20, critVsBlutung: 30, doubleEvery: 3, startShield: 0.1, shieldRefresh: 0.15,
  counter: 0.6, lifesteal: 0.05, lastStand: { below: 0.3, heal: 0.4 }, healBonus: 0.3, brandBonus: 0.3, explode: 0.5,
  poisonWeakens: true, firstCrit: true, abilityBurn: true, poisonOnMiss: true, rage: { below: 0.35, atk: 0.3 }, slowHits: 2,
  regen: { every: 4, pct: 0.05 }, slowFoesAtStart: true,
}
const crew = ['jonte', 'kanonier', 'navigatorin', 'smutje'] as const
const setup = defaultSetup([...crew])
const N = 300
for (const [id, enc] of Object.entries(ENCOUNTERS)) {
  const stats = crewStats(6, {}, {})
  let plain = 0
  let fx = 0
  for (let i = 0; i < N; i++) {
    const a = [...crewDefs(setup, 6, stats), ...enc.foes]
    const b = [...crewDefs(setup, 6, stats, false, Object.fromEntries(crew.map((c) => [c, { stats: {}, pct: {}, mods: ALL }]))), ...enc.foes]
    if (simulate(a, i * 31 + 7).sieg) plain++
    if (simulate(b, i * 31 + 7).sieg) fx++
  }
  console.log(`${id.padEnd(16)} ohne Effekte ${Math.round((plain / N) * 100)} %  mit allen Effekten ${Math.round((fx / N) * 100)} %`)
}
