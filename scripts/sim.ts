// Balancing-Simulator: npm run sim
// Spielt jeden Kampf viele Male mit allen Faehigkeits-Kombinationen und zeigt die beste.
import { simulate, type AbilityId } from '../src/game/combat.ts'
import { CREW, ENCOUNTERS, crewDefs, type CrewId, type CrewSetup } from '../src/game/foes.ts'
import { crewStats } from '../src/game/progress.ts'

const N = 600

type Gear = { name: string; jonte: Record<string, number>; ship: Record<string, number> }
const GEAR: Record<string, Gear> = {
  ohne: { name: 'ohne', jonte: {}, ship: {} },
  einfach: { name: 'einfach', jonte: { angriff: 4, ruestung: 5, ausweichen: 2 }, ship: { tempo: 1 } },
  selten: { name: 'selten', jonte: { angriff: 11, ruestung: 10, tempo: 4, leben: 8, krit: 4 }, ship: { angriff: 3 } },
  episch: { name: 'episch', jonte: { angriff: 14, ruestung: 10, tempo: 4, leben: 8, krit: 12 }, ship: { leben: 20, ruestung: 4 } },
}

function setups(crew: CrewId[]): [string, CrewSetup][] {
  const front = crew.filter((c) => !CREW[c].ranged)
  const out: [string, CrewSetup][] = []
  const n = crew.length
  for (let mask = 0; mask < 1 << n; mask++) {
    const setup = crew.map((id, i) => ({
      id,
      row: (front.includes(id) && front.indexOf(id) < 2 ? 'vorne' : 'hinten') as 'vorne' | 'hinten',
      ability: CREW[id].abilities[(mask >> i) & 1] as AbilityId,
    }))
    out.push([setup.map((p) => p.ability).join('+'), setup])
  }
  return out
}

function run(encId: string, crew: CrewId[], level: number, gear: Gear) {
  const base = ENCOUNTERS[encId]
  // Zum Tunen: SIM_HP=1.5 SIM_ATK=1.3 skaliert alle Gegner
  const kh = Number(process.env.SIM_HP ?? 1)
  const ka = Number(process.env.SIM_ATK ?? 1)
  const enc = { ...base, foes: base.foes.map((f) => ({ ...f, stats: { ...f.stats, leben: Math.round(f.stats.leben * kh), angriff: f.stats.angriff * ka } })) }
  const stats = crewStats(level, gear.jonte, gear.ship)
  const res: { name: string; auto: number; smart: number; hp: number }[] = []
  for (const [name, s] of setups(crew)) {
    let a = 0
    let m = 0
    let hp = 0
    for (let i = 0; i < N; i++) {
      const defs = [...crewDefs(s, level, stats), ...enc.foes]
      if (simulate(defs, i * 7919 + 13, false).sieg) a++
      const r = simulate(defs, i * 7919 + 13, true)
      if (r.sieg) m++
      hp += r.crewHp
    }
    res.push({ name, auto: a / N, smart: m / N, hp: hp / N })
  }
  res.sort((x, y) => y.smart - x.smart)
  const best = res[0]
  const med = res[Math.floor(res.length / 2)]
  const pct = (x: number) => `${Math.round(x * 100)}`.padStart(3) + ' %'
  console.log(`${enc.name.padEnd(18)} St ${String(level).padStart(2)} ${gear.name.padEnd(8)} | beste ${pct(best.smart)} (auto ${pct(best.auto)}) ${best.name.padEnd(48)} | Rest-Leben ${pct(best.hp)} | mittel ${pct(med.smart)}`)
}

const C1: CrewId[] = ['jonte', 'kanonier']
const C1b: CrewId[] = ['jonte', 'kanonier', 'navigatorin']
const C2: CrewId[] = ['jonte', 'kanonier', 'navigatorin', 'smutje']

const only = process.argv[2]
const plan: [string, CrewId[], number, string][] = [
  ['moewen', C1, 1, 'ohne'],
  ['moewen', C1, 1, 'einfach'],
  ['krabbenbande', C1b, 1, 'einfach'],
  ['krabbenbande', C1b, 2, 'einfach'],
  ['schalbart', C1b, 3, 'einfach'],
  ['schalbart', C1b, 4, 'selten'],
  ['schalbart', C1b, 5, 'einfach'],
  ['schalbart', C1b, 5, 'selten'],
  ['quallen', C1b, 5, 'selten'],
  ['quallen', C1b, 6, 'selten'],
  ['geistertrupp', C1b, 6, 'selten'],
  ['geistertrupp', C1b, 7, 'selten'],
  ['geisterschiff', C2, 7, 'selten'],
  ['geisterschiff', C2, 8, 'selten'],
  ['grauhand', C2, 8, 'selten'],
  ['grauhand', C2, 9, 'episch'],
  ['grauhand', C2, 10, 'selten'],
  ['grauhand', C2, 10, 'episch'],
]
for (const [e, c, l, g] of plan) if (!only || e === only) run(e, c, l, GEAR[g])
