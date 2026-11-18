// Prueft, dass alle Item-Wirkungen im Kampf laufen: npm run fxcheck
import { simulate, type Mods } from '../src/game/combat.ts'
import { ENCOUNTERS, crewDefs, defaultSetup } from '../src/game/foes.ts'
import { crewStats } from '../src/game/progress.ts'

const ALL: Mods = {
  critBleed: true, bleedMax: 5, critVsBrand: 20, critVsBlutung: 30, doubleEvery: 3, startShield: 0.1, shieldRefresh: 0.15,
  counter: 0.6, lifesteal: 0.05, lastStand: { below: 0.3, heal: 0.4 }, healBonus: 0.3, brandBonus: 0.3, explode: 0.5,
  poisonWeakens: true, firstCrit: true, abilityBurn: true, poisonOnMiss: true, rage: { below: 0.35, atk: 0.3 }, slowHits: 2,
  regen: { every: 4, pct: 0.05 }, slowFoesAtStart: true,
  burnChance: 0.25, bleedChance: 0.3, poisonChance: 0.25, weakChance: 0.25, slowChance: 0.25, kritVsBlutung: 20,
  critDodge: 5, critTempo: 4, killRush: 10, dodgeCrit: true, dodgeHeal: 0.06, weakOnMiss: true, lifestealVsGift: 0.15,
  dmgVsGift: 0.15, dmgVsBrand: 0.25, thorns: 0.15, burnBack: 0.3, veils: 2, revive: 0.3, teamDodge: 5, teamShield: 0.06,
  startEnergy: 20, startGauge: 30, startBurn: true, startPoison: true, buffHeal: 0.1,
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

// Jede Wirkung einzeln: darf nicht abstuerzen und keinen Kampf haengen lassen
for (const [k, v] of Object.entries(ALL)) {
  const mods = { [k]: v } as Mods
  for (const enc of Object.values(ENCOUNTERS)) {
    const stats = crewStats(6, {}, {})
    for (let i = 0; i < 20; i++) simulate([...crewDefs(setup, 6, stats, false, Object.fromEntries(crew.map((c) => [c, { stats: {}, pct: {}, mods }]))), ...enc.foes], i)
  }
}
console.log(`${Object.keys(ALL).length} Wirkungen einzeln geprüft`)
