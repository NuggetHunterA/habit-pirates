/** Testbuehne fuer die Figuren-Animation (nur in der Kampf-Vorschau: ?poses=crew|feinde|boss) */
import { useEffect, useRef } from 'react'
import type { Look } from '../game/combat'
import { Stage } from './stage'

const GROUPS: Record<string, [Look, 'crew' | 'feind', number, number][]> = {
  crew: [
    ['ausguck', 'crew', 140, 500],
    ['smutje', 'crew', 290, 500],
    ['kanonier', 'crew', 440, 500],
    ['navigatorin', 'crew', 590, 500],
    ['jonte', 'crew', 750, 500],
  ],
  feinde: [
    ['krabbenbandit', 'feind', 220, 500],
    ['moewenpirat', 'feind', 400, 470],
    ['nebelqualle', 'feind', 540, 500],
    ['geisterpirat', 'feind', 690, 500],
    ['irrlicht', 'feind', 840, 500],
  ],
  boss: [
    ['jonte', 'crew', 200, 500],
    ['schalbart', 'feind', 470, 510],
    ['grauhand', 'feind', 760, 510],
  ],
}

export default function PoseLab({ group }: { group: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const st = new Stage(ref.current!)
    st.bg = group === 'crew' ? 'strand' : 'nebel'
    const list = GROUPS[group] ?? GROUPS.crew
    list.forEach(([look, side, x, y], i) => st.addActor({ id: 'f' + i, look, side, name: look, x, y, hp: 1, hpMax: 1, energy: 0, hasAbility: false, alive: true }))
    const w = window as unknown as { setAnim: (k: string) => void; setHolt: (v: boolean) => void }
    w.setAnim = (k) => list.forEach((_, i) => st.play('f' + i, k as 'idle'))
    w.setHolt = (v) => list.forEach((_, i) => (st.actors.get('f' + i)!.holtAus = v))
    return () => st.destroy()
  }, [group])
  return <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />
}
