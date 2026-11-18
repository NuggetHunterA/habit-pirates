/**
 * Gelenkpunkte je Figur (in Pixeln des jeweiligen Bildes).
 * Daraus baut mesh.ts das Gitter, das die Figur nahtlos biegt.
 */
import type { Look } from '../game/combat'
import type { MeshSpec, V2 } from './mesh'

const p = (x: number, y: number): V2 => ({ x, y })

export interface Figure {
  /** Hoehe des Bildes, fuer das die Punkte gelten (Silhouetten sind kleiner) */
  refH: number
  spec: MeshSpec
}

export const FIGURES: Record<Look, Figure> = {
  // Kapitaen Jonte: Gesamtbild aus dem Deck (782 x 1087), schaut nach rechts
  jonte: {
    refH: 1087,
    spec: {
      facesRight: true,
      feet: p(400, 1080),
      knee: 880,
      waist: p(430, 510),
      neck: p(430, 240),
      brow: 125,
      armA: { path: [p(515, 290), p(572, 610), p(655, 750), p(765, 895)], r: 72 },
      armB: { path: [p(285, 320), p(262, 470), p(275, 600)], r: 40 },
      waves: [{ x0: 0, y0: 470, x1: 330, y1: 820, amp: 12, freq: 1.7, k: 0.25 }],
    },
  },
  kanonier: {
    refH: 400,
    spec: {
      shoot: true,
      feet: p(130, 395),
      knee: 320,
      waist: p(130, 215),
      neck: p(140, 100),
      brow: 42,
      armA: { path: [p(62, 135), p(38, 200), p(60, 258)], r: 26, extra: [[p(5, 240), p(160, 295)]] },
      armB: { path: [p(212, 130), p(238, 200), p(242, 268)], r: 24 },
    },
  },
  navigatorin: {
    refH: 400,
    spec: {
      feet: p(135, 395),
      knee: 300,
      waist: p(150, 155),
      neck: p(150, 65),
      armA: { path: [p(108, 80), p(78, 160), p(66, 205)], r: 20, extra: [[p(66, 205), p(0, 330)]] },
      armB: { path: [p(185, 80), p(205, 155), p(225, 185)], r: 20, extra: [[p(200, 215), p(255, 150)]] },
      waves: [
        { x0: 30, y0: 60, x1: 75, y1: 180, amp: 4, freq: 1.8, k: 0.5 },
        { x0: 55, y0: 240, x1: 220, y1: 320, amp: 5, freq: 1.6, k: 0.4 },
      ],
    },
  },
  smutje: {
    refH: 400,
    spec: {
      feet: p(140, 395),
      knee: 330,
      waist: p(145, 230),
      neck: p(150, 95),
      brow: 36,
      armA: { path: [p(78, 140), p(42, 170)], r: 24, extra: [[p(42, 175), p(10, 70)]] },
      armB: { path: [p(210, 130), p(272, 210), p(252, 265)], r: 26, extra: [[p(285, 240), p(220, 315)]] },
    },
  },
  ausguck: {
    refH: 400,
    spec: {
      shoot: true,
      feet: p(100, 395),
      knee: 330,
      waist: p(110, 215),
      neck: p(115, 120),
      brow: 74,
      armA: { path: [p(168, 140), p(172, 210), p(160, 262)], r: 20, extra: [[p(195, 212), p(140, 300)]] },
      armB: { path: [p(45, 140), p(12, 215), p(10, 280)], r: 18 },
    },
  },
  krabbenbandit: {
    refH: 300,
    spec: {
      feet: p(210, 296),
      knee: 262,
      waist: p(200, 225),
      neck: p(200, 200),
      brow: 92,
      armA: { path: [p(118, 215), p(62, 198)], r: 30, extra: [[p(62, 198), p(14, 8)]] },
      armB: { path: [p(285, 205), p(365, 200)], r: 70 },
      waves: [{ x0: 90, y0: 225, x1: 360, y1: 300, amp: 3, freq: 5, k: 1.4 }],
    },
  },
  krabbenmatrose: {
    refH: 300,
    spec: {
      feet: p(210, 296),
      knee: 262,
      waist: p(200, 225),
      neck: p(200, 200),
      brow: 92,
      armA: { path: [p(118, 215), p(62, 198)], r: 30, extra: [[p(62, 198), p(14, 8)]] },
      armB: { path: [p(285, 205), p(365, 200)], r: 70 },
      waves: [{ x0: 90, y0: 225, x1: 360, y1: 300, amp: 3, freq: 6, k: 1.4 }],
    },
  },
  moewenpirat: {
    refH: 300,
    spec: {
      float: true,
      flap: true,
      feet: p(180, 290),
      knee: 300,
      waist: p(180, 210),
      neck: p(175, 135),
      brow: 62,
      armA: { path: [p(140, 160), p(90, 110), p(25, 30)], r: 46, extra: [[p(78, 172), p(8, 85)]] },
      armB: { path: [p(235, 145), p(300, 95), p(395, 10)], r: 50, extra: [[p(260, 190), p(330, 232)]] },
      waves: [{ x0: 100, y0: 230, x1: 260, y1: 300, amp: 4, freq: 6, k: 1 }],
    },
  },
  nebelqualle: {
    refH: 300,
    spec: {
      float: true,
      feet: p(140, 300),
      knee: 400,
      waist: p(140, 150),
      neck: p(140, 140),
      brow: 34,
      waves: [{ x0: 0, y0: 130, x1: 217, y1: 300, amp: 14, freq: 2.6, k: 0.5 }],
    },
  },
  geisterpirat: {
    refH: 320,
    spec: {
      float: true,
      feet: p(130, 315),
      knee: 400,
      waist: p(125, 180),
      neck: p(120, 80),
      brow: 36,
      armA: { path: [p(98, 110), p(85, 160), p(62, 170)], r: 22, extra: [[p(62, 170), p(8, 48)]] },
      armB: { path: [p(175, 105), p(192, 165)], r: 22, extra: [[p(192, 165), p(258, 205)]] },
      waves: [{ x0: 60, y0: 190, x1: 264, y1: 320, amp: 10, freq: 2.2, k: 0.6 }],
    },
  },
  irrlicht: {
    refH: 260,
    spec: {
      float: true,
      shoot: true,
      feet: p(90, 255),
      knee: 400,
      waist: p(95, 180),
      neck: p(100, 60),
      brow: 28,
      waves: [
        { x0: 0, y0: 70, x1: 40, y1: 220, amp: 5, freq: 3, k: 0.8 },
        { x0: 120, y0: 70, x1: 151, y1: 220, amp: 5, freq: 3.4, k: 0.8 },
      ],
    },
  },
  schalbart: {
    refH: 460,
    spec: {
      armScale: 0.5,
      feet: p(250, 455),
      knee: 420,
      waist: p(300, 330),
      neck: p(235, 230),
      brow: 205,
      armA: { path: [p(190, 320), p(110, 278), p(62, 300)], r: 40, extra: [[p(55, 220), p(70, 330), p(85, 440)]] },
      armB: { path: [p(330, 325), p(300, 380), p(255, 430)], r: 44, extra: [[p(300, 380), p(370, 420)]] },
      waves: [{ x0: 380, y0: 140, x1: 449, y1: 330, amp: 5, freq: 2, k: 0.6 }],
    },
  },
  grauhand: {
    refH: 460,
    spec: {
      armScale: 0.8,
      float: true,
      feet: p(230, 450),
      knee: 600,
      waist: p(215, 225),
      neck: p(205, 112),
      brow: 62,
      armA: { path: [p(150, 118), p(82, 200), p(60, 258)], r: 42, extra: [[p(60, 258), p(40, 330)], [p(60, 258), p(8, 280)]] },
      armB: { path: [p(268, 112), p(322, 104), p(352, 82)], r: 34 },
      pendants: [
        { x0: 312, y0: 112, x1: 388, y1: 225, pivot: p(350, 108) },
        { x0: 222, y0: 238, x1: 278, y1: 308, pivot: p(242, 236) },
      ],
      waves: [
        { x0: 80, y0: 300, x1: 419, y1: 460, amp: 12, freq: 1.8, k: 0.45 },
        { x0: 0, y0: 170, x1: 80, y1: 360, amp: 6, freq: 2.6, k: 0.8 },
      ],
    },
  },
}

/** Punkte fuer ein kleineres oder groesseres Bild umrechnen */
export function scaleSpec(s: MeshSpec, f: number): MeshSpec {
  if (f === 1) return s
  const q = (v: V2) => ({ x: v.x * f, y: v.y * f })
  const limb = (l?: MeshSpec['armA']) => l && { r: l.r * f, path: l.path.map(q), extra: l.extra?.map((e) => e.map(q)) }
  return {
    ...s,
    feet: q(s.feet),
    knee: s.knee * f,
    waist: q(s.waist),
    neck: q(s.neck),
    brow: s.brow != null ? s.brow * f : undefined,
    armA: limb(s.armA),
    armB: limb(s.armB),
    pendants: s.pendants?.map((d) => ({ x0: d.x0 * f, y0: d.y0 * f, x1: d.x1 * f, y1: d.y1 * f, pivot: q(d.pivot) })),
    waves: s.waves?.map((w) => ({ ...w, x0: w.x0 * f, y0: w.y0 * f, x1: w.x1 * f, y1: w.y1 * f, amp: w.amp * f })),
  }
}
