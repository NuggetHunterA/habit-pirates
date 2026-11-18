// Balancing-Simulator: npx tsx scripts/sim.ts  (oder node --experimental-strip-types)
import { simulate, type AbilityId, type Row } from '../src/game/combat.ts'
import { KRABBENBANDE, crewDefs, type CrewSetup } from '../src/game/foes.ts'

const N = 4000
const S = (j: [Row, AbilityId], k: [Row, AbilityId]): CrewSetup => [
  { id: 'jonte', row: j[0], ability: j[1] },
  { id: 'kanonier', row: k[0], ability: k[1] },
]
const setups: [string, CrewSetup][] = [
  ['Sturmklinge + Donnerbüchse', S(['vorne', 'sturmklinge'], ['hinten', 'donnerbuechse'])],
  ['Kapitänsruf + Donnerbüchse', S(['vorne', 'kapitaensruf'], ['hinten', 'donnerbuechse'])],
  ['Sturmklinge + Kettenkugel', S(['vorne', 'sturmklinge'], ['hinten', 'kettenkugel'])],
  ['Reihen vertauscht', S(['hinten', 'sturmklinge'], ['vorne', 'donnerbuechse'])],
]
for (const level of [1, 2, 3]) {
  for (const [name, s] of setups) {
    for (const smart of [false, true]) {
      let win = 0, act = 0, hp = 0
      for (let i = 0; i < N; i++) {
        const r = simulate([...crewDefs(s, level), ...KRABBENBANDE.foes], i * 7919 + 13, smart)
        if (r.sieg) { win++; hp += r.crewHp }
        act += r.aktionen
      }
      console.log(`Stufe ${level} | ${name.padEnd(28)} | ${smart ? 'getimt' : 'auto  '} | Sieg ${(100 * win / N).toFixed(0).padStart(3)} % | Aktionen ${(act / N).toFixed(0)} | Rest-Leben ${(100 * hp / Math.max(1, win)).toFixed(0)} %`)
    }
  }
}
