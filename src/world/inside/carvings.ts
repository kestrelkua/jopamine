// Line drawings carved into the cave wall in the piano chamber: how Polish music spread after 1776.
// Each one draws itself stroke by stroke as it appears, like it's being carved while you read.
import * as THREE from 'three'

type Stroke = (g: CanvasRenderingContext2D) => void

interface Drawing {
  caption: string
  strokes: Stroke[]
}

const line =
  (...pts: number[]): Stroke =>
  (g) => {
    g.moveTo(pts[0], pts[1])
    for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1])
  }
const circle =
  (x: number, y: number, r: number, from = 0, to = Math.PI * 2): Stroke =>
  (g) => {
    g.moveTo(x + Math.cos(from) * r, y + Math.sin(from) * r)
    g.arc(x, y, r, from, to)
  }
const oval =
  (x: number, y: number, rx: number, ry: number, tilt = 0): Stroke =>
  (g) => {
    g.moveTo(x + Math.cos(tilt) * rx, y + Math.sin(tilt) * rx)
    g.ellipse(x, y, rx, ry, tilt, 0, Math.PI * 2)
  }
const note = (x: number, y: number): Stroke[] => [oval(x, y, 11, 7, -0.4), line(x + 10, y - 2, x + 10, y - 52)]

const drawings: Drawing[] = [
  {
    // The crown of an independent Poland, cracked.
    caption: '1776',
    strokes: [line(44, 170, 44, 92, 86, 132, 128, 70, 170, 132, 212, 92, 212, 170, 44, 170), line(44, 148, 212, 148), line(128, 58, 116, 100, 140, 128, 120, 176)],
  },
  {
    // Two dancers, hands joined, a kick in their step.
    caption: 'mazurka',
    strokes: [
      circle(92, 62, 14),
      line(92, 76, 92, 128),
      line(92, 92, 128, 84, 164, 92),
      line(92, 128, 70, 172),
      line(92, 128, 116, 164),
      circle(164, 62, 14),
      line(164, 76, 164, 104, 142, 140, 186, 140, 164, 104),
      line(156, 140, 150, 176),
      line(174, 140, 196, 160),
    ],
  },
  {
    // A staff and a run of notes.
    caption: 'Chopin',
    strokes: [
      ...[80, 96, 112, 128, 144].map((y) => line(28, y, 228, y)),
      ...note(76, 136),
      ...note(116, 120),
      ...note(156, 104),
      line(86, 84, 126, 68, 166, 52),
      ...note(200, 128),
    ],
  },
  {
    caption: 'Paris',
    strokes: [line(128, 24, 98, 196), line(128, 24, 158, 196), line(110, 112, 146, 112), line(104, 150, 152, 150), circle(128, 196, 22, Math.PI, Math.PI * 2), line(128, 14, 128, 24)],
  },
  {
    caption: 'London',
    strokes: [line(104, 64, 104, 198, 152, 198, 152, 64, 104, 64), line(104, 64, 128, 26, 152, 64), circle(128, 98, 16), line(128, 98, 128, 88), line(128, 98, 136, 102), line(104, 132, 152, 132)],
  },
  {
    // A violin and its bow.
    caption: 'Vienna',
    strokes: [oval(128, 158, 34, 40), oval(128, 108, 24, 22), line(128, 86, 128, 36), circle(128, 30, 7), line(116, 146, 120, 170), line(140, 146, 136, 170), line(58, 196, 206, 58)],
  },
  {
    // A country's borders drawn and redrawn, and the music floating out past them.
    caption: 'Polska',
    strokes: [
      line(70, 90, 110, 66, 160, 74, 192, 104, 186, 150, 150, 178, 96, 172, 64, 140, 70, 90),
      line(110, 66, 124, 120, 96, 172),
      line(124, 120, 186, 150),
      ...note(36, 80),
      ...note(214, 70),
      ...note(222, 196),
    ],
  },
]

export const carvingCount = drawings.length

export interface Carving {
  mesh: THREE.Mesh
  /** 0 = not carved yet, 1 = finished. Redraws only when it changes. */
  draw: (p: number) => void
}

export function carving(i: number): Carving {
  const d = drawings[i % drawings.length]
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, color: '#d8b88a', opacity: 0.8 })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), mat)
  let last = -1

  const draw = (p: number) => {
    p = Math.max(0, Math.min(1, p))
    if (Math.abs(p - last) < 0.004) return
    last = p
    g.clearRect(0, 0, 256, 256)
    g.lineCap = 'round'
    g.lineJoin = 'round'
    const n = d.strokes.length
    // Each stroke cuts in after the one before it; a dark groove under a pale line reads as carved.
    for (const [color, dx, width] of [
      ['rgba(0, 0, 0, 0.55)', 2.5, 7],
      ['#ffffff', 0, 4.5],
    ] as const) {
      g.strokeStyle = color
      g.lineWidth = width
      d.strokes.forEach((s, j) => {
        const k = Math.max(0, Math.min(1, p * (n + 1) - j))
        if (k <= 0) return
        g.save()
        g.translate(dx, dx)
        g.setLineDash([k * 700, 4000])
        g.beginPath()
        s(g)
        g.stroke()
        g.restore()
      })
    }
    const words = Math.max(0, p * (n + 1) - n)
    if (words > 0 && d.caption) {
      g.globalAlpha = words
      g.font = '600 26px Georgia, serif'
      g.textAlign = 'center'
      g.fillStyle = 'rgba(0, 0, 0, 0.55)'
      g.fillText(d.caption, 130, 240)
      g.fillStyle = '#ffffff'
      g.fillText(d.caption, 128, 238)
      g.globalAlpha = 1
    }
    tex.needsUpdate = true
  }
  draw(0)
  return { mesh, draw }
}
