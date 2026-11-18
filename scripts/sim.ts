// Balancing-Simulator: npm run sim
// Spielt jeden Kampf viele Male mit allen Faehigkeits-Kombinationen und zeigt die beste.
import { simulate, type AbilityId } from '../src/game/combat.ts'
import { CREW, ENCOUNTERS, crewDefs, seaMonster, strengthen, type CrewId, type CrewSetup } from '../src/game/foes.ts'
import { crewStats } from '../src/game/progress.ts'

const N = 600

type Gear = { name: string; jonte: Record<string, number>; ship: Record<string, number>; all?: boolean }
const GEAR: Record<string, Gear> = {
  ohne: { name: 'ohne', jonte: {}, ship: {} },
  einfach: { name: 'einfach', jonte: { angriff: 4, ruestung: 5, ausweichen: 2 }, ship: { tempo: 1 } },
  selten: { name: 'selten', jonte: { angriff: 11, ruestung: 10, tempo: 4, leben: 8, krit: 4 }, ship: { angriff: 3 } },
  episch: { name: 'episch', jonte: { angriff: 14, ruestung: 10, tempo: 4, leben: 8, krit: 12 }, ship: { leben: 20, ruestung: 4 } },
  // Passende Ausruestung fuer alle Piraten (Phase 3): Kapitel 1 gewoehnlich, Kapitel 2 seltene Teile aus Kapitel 1
  k1: { name: 'k1 alle', jonte: { angriff: 4, ruestung: 3, leben: 8, krit: 3 }, ship: { tempo: 1 }, all: true },
  k2: { name: 'k2 alle', jonte: { angriff: 7, krit: 5, ruestung: 10, tempo: 4, leben: 28, ausweichen: 4 }, ship: { angriff: 4, krit: 3 }, all: true },
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
  // Seeungeheuer der Ereignisse: ungeheuer1, ungeheuer2. Schwerer Beutezug: Suffix :schwer
  const [id, tier] = encId.split(':')
  const raw = id.startsWith('ungeheuer') ? seaMonster(Number(id.slice(9))) : ENCOUNTERS[id]
  const base = tier === 'schwer' ? strengthen(raw, 1.6) : raw
  // Zum Tunen: SIM_HP=1.5 SIM_ATK=1.3 skaliert alle Gegner
  const kh = Number(process.env.SIM_HP ?? 1)
  const ka = Number(process.env.SIM_ATK ?? 1)
  const enc = { ...base, foes: base.foes.map((f) => ({ ...f, stats: { ...f.stats, leben: Math.round(f.stats.leben * kh), angriff: f.stats.angriff * ka } })) }
  const stats = crewStats(level, gear.all ? Object.fromEntries(crew.map((c) => [c, gear.jonte])) : { jonte: gear.jonte }, gear.ship)
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
// Normale Kaempfe mit passender Ausruestung fuer alle: Ziel etwa 75 % (mittlere Faehigkeitswahl)
const normal: [string, CrewId[], number, string][] = [
  ['moewen', C1, 1, 'k1'],
  ['moewen', C1, 2, 'k1'],
  ['krabbenbande', C1, 2, 'k1'],
  ['krabbenbande', C1, 3, 'k1'],
  ['riffbande', C1b, 3, 'k1'],
  ['riffbande', C1b, 4, 'k1'],
  ['quallen', C1b, 5, 'k2'],
  ['quallen', C1b, 6, 'k2'],
  ['geistertrupp', C1b, 6, 'k2'],
  ['geistertrupp', C1b, 7, 'k2'],
  ['tiefseetrupp', C2, 7, 'k2'],
  ['tiefseetrupp', C2, 8, 'k2'],
  ['geisterschiff', C2, 7, 'k2'],
  ['geisterschiff', C2, 8, 'k2'],
]
// Bosse und Beutezug-Stufen mit Ausruestung fuer alle (SIM_BOSS=1)
const boss: [string, CrewId[], number, string][] = [
  ['schalbart', C1b, 3, 'k1'],
  ['schalbart', C1b, 5, 'k1'],
  ['schalbart', C1b, 5, 'k2'],
  ['grauhand', C2, 8, 'k2'],
  ['grauhand', C2, 10, 'k2'],
]
// Beutezug am Boss-Feld auf Hoechststufe (SIM_FARM=1, Stufe per SIM_HP/SIM_ATK)
const farm: [string, CrewId[], number, string][] = [
  ['moewen', C1b, 5, 'k1'],
  ['krabbenbande', C1b, 5, 'k1'],
  ['quallen', C2, 10, 'k2'],
  ['geistertrupp', C2, 10, 'k2'],
  ['geisterschiff', C2, 10, 'k2'],
]
// Zufallsereignis Seeungeheuer auf Hoechststufe, verglichen mit dem schweren Beutezug (SIM_EVENT=1)
const event: [string, CrewId[], number, string][] = [
  ['krabbenbande:schwer', C1b, 5, 'k1'],
  ['riffbande:schwer', C1b, 5, 'k1'],
  ['ungeheuer1', C1b, 5, 'k1'],
  ['ungeheuer1', C1b, 5, 'k2'],
  ['geistertrupp:schwer', C2, 10, 'k2'],
  ['tiefseetrupp:schwer', C2, 10, 'k2'],
  ['ungeheuer2', C2, 10, 'k2'],
]
const list = process.env.SIM_EVENT ? event : process.env.SIM_NORMAL ? normal : process.env.SIM_BOSS ? boss : process.env.SIM_FARM ? farm : plan
for (const [e, c, l, g] of list) if (!only || e.startsWith(only)) run(e, c, l, GEAR[g])
