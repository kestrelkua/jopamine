// "Every angle": a sandbar out into the sea. A pair of glasses shows it red-green colour deficient ("blue
// might be yellow for you"). Then four nested parentheses: each one smaller, and you shrink walking into it,
// one aside per bracket, until at the deepest you find a tiny copy of this whole town. Then a cube with a
// different way of learning on every face; see it from every angle.
import * as THREE from 'three'
import { pianoNote, tick } from '../../../sound'
import { angled, shadeColor } from '../../shade'
import { cat } from '../../parts'
import { clampRect, cube, ease, lambert, put, type Click, type Reality } from '../blue/kit'
import { drifters, floatingWords, tinyTown, water, type Sea } from './common'

const ARCHES = [
  { z: -3, h: 7, w: 4.6, aside: '(Claude, in this case' },
  { z: -9, h: 5.2, w: 3.6, aside: '(Sorry Dr. Majerus!!' },
  { z: -14, h: 3.8, w: 2.8, aside: '(This is a triple paranthases...' },
  { z: -18, h: 2.6, w: 2, aside: '(QUADRUPLE! I believe this is called meta-narration.))))' },
]
const TOWN_Z = -21.5
const CUBE_Z = -31

function faceTexture(title: string, draw: (g: CanvasRenderingContext2D) => void, bg: string) {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  g.fillStyle = bg
  g.fillRect(0, 0, 256, 256)
  g.strokeStyle = '#ffffff'
  g.fillStyle = '#ffffff'
  g.lineWidth = 8
  g.lineCap = 'round'
  g.lineJoin = 'round'
  draw(g)
  g.font = '700 30px Georgia, serif'
  g.textAlign = 'center'
  g.fillText(title, 128, 228)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

const FACES: [string, string, (g: CanvasRenderingContext2D) => void][] = [
  [
    'type it',
    '#1f8fb0',
    (g) => {
      for (let r = 0; r < 3; r++) for (let k = 0; k < 5 - (r === 2 ? 1 : 0); k++) g.strokeRect(36 + k * 38 + r * 12, 50 + r * 42, 30, 30)
    },
  ],
  [
    'graphs',
    '#2a6fb8',
    (g) => {
      ;[60, 110, 80, 150].forEach((h, k) => g.fillRect(50 + k * 42, 190 - h, 28, h))
    },
  ],
  [
    'put it together',
    '#3a5cc4',
    (g) => {
      g.strokeRect(60, 50, 60, 60)
      g.strokeRect(136, 50, 60, 60)
      g.strokeRect(60, 126, 60, 60)
      g.beginPath()
      g.arc(166, 156, 26, 0, Math.PI * 2)
      g.stroke()
    },
  ],
  [
    'a video',
    '#167fa0',
    (g) => {
      g.beginPath()
      g.moveTo(100, 60)
      g.lineTo(100, 170)
      g.lineTo(190, 115)
      g.closePath()
      g.fill()
    },
  ],
  [
    'concept-writing',
    '#2b8fc9',
    (g) => {
      g.beginPath()
      g.arc(128, 110, 22, 0, Math.PI * 2)
      for (const [x, y] of [
        [60, 60],
        [196, 60],
        [60, 170],
        [196, 170],
      ]) {
        g.moveTo(128, 110)
        g.lineTo(x, y)
        g.moveTo(x + 14, y)
        g.arc(x, y, 14, 0, Math.PI * 2)
      }
      g.stroke()
    },
  ],
  [
    'mini-projects',
    '#4250b8',
    (g) => {
      g.beginPath()
      g.moveTo(70, 180)
      g.lineTo(150, 100)
      g.stroke()
      g.beginPath()
      g.arc(170, 80, 30, Math.PI * 0.2, Math.PI * 1.8)
      g.stroke()
    },
  ],
]

/** A bracket, "(" or ")", as a curved tube standing on the sand. */
function bracket(h: number, w: number, side: -1 | 1, mat: THREE.Material) {
  const pts: THREE.Vector3[] = []
  for (let k = 0; k <= 24; k++) {
    const a = (k / 24) * Math.PI
    pts.push(new THREE.Vector3(side * (w / 2 + Math.sin(a) * h * 0.18), (1 - Math.cos(a)) * (h / 2), 0))
  }
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.12 + h * 0.025, 10), mat)
  m.castShadow = true
  return m
}

export function everyAngle(sea: Sea): Reality {
  const g = new THREE.Group()
  const clicks: Click[] = []
  const sea_ = water(sea)
  g.add(sea_.mesh)
  const bar = new THREE.Mesh(new THREE.PlaneGeometry(9, 50), lambert('#f1dcae'))
  bar.rotation.x = -Math.PI / 2
  bar.position.set(0, 0.01, -14)
  bar.receiveShadow = true
  g.add(bar)

  // The glasses.
  const glasses = new THREE.Group()
  const frame = lambert('#2b2440')
  for (const x of [-0.32, 0.32]) {
    const lens = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.04, 8, 24), frame)
    lens.position.x = x
    glasses.add(lens)
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.25, 24), new THREE.MeshBasicMaterial({ color: '#f2d06a', transparent: true, opacity: 0.45, side: THREE.DoubleSide }))
    glass.position.x = x
    glasses.add(glass)
  }
  put(glasses, new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.035, 6, 12, Math.PI), frame), 0, 0.05, 0)
  glasses.position.set(2.6, 1.6, 3)
  g.add(glasses)
  cube(g, 0.5, 1.2, 0.5, 2.6, 0.6, 3, lambert('#e8d6b0'))
  let deut = false
  let lastToggle = -10
  const toggle = () => {
    if (now - lastToggle < 0.8) return
    lastToggle = now
    deut = !deut
    tick()
  }
  clicks.push({ obj: glasses, fn: toggle })

  // The brackets: "(" on the left and ")" on the right of each, nested smaller and smaller.
  const archMat = angled(sea.shade, { light: 0.9, chroma: 0.55, emissive: 0.25 })
  ARCHES.forEach((a) => {
    const pair = new THREE.Group()
    pair.add(bracket(a.h, a.w, -1, archMat), bracket(a.h, a.w, 1, archMat))
    pair.position.z = a.z
    g.add(pair)
    const words = floatingWords(a.aside, 0.5 + a.h * 0.06, { w: 1024, h: 128, font: 'italic 700 46px Georgia, serif' })
    words.position.set(0, a.h + 0.4, a.z)
    g.add(words)
  })
  const town = tinyTown(sea)
  town.group.position.set(0, 0, TOWN_Z)
  g.add(town.group)

  // Every angle: a cube with a different way of learning on each face.
  const cubeMats = FACES.map(([title, bg, draw]) => new THREE.MeshLambertMaterial({ map: faceTexture(title, draw, bg), emissive: '#ffffff', emissiveIntensity: 0.08 }))
  const box = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.4, 3.4), cubeMats)
  box.castShadow = true
  box.position.set(0, 3.2, CUBE_Z)
  g.add(box)
  const seen = new Set<number>()
  let turnFrom = new THREE.Quaternion()
  let turnTo = new THREE.Quaternion()
  let turnAt = -10
  const turn = () => {
    turnFrom = box.quaternion.clone()
    const axis = Math.random() < 0.5 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
    turnTo = new THREE.Quaternion().setFromAxisAngle(axis, Math.PI / 2).multiply(turnFrom)
    turnAt = now
    tick()
  }
  clicks.push({ obj: box, fn: turn })
  const faceNormals = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, -1, 0),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 0, -1),
  ]

  // A cat, because there is always a cat.
  const kitty = cat('#e0904a')
  put(g, kitty.group, -2.6, 0, 4)

  const drift = drifters(g, sea, { x: 0, z: -14, w: 4, d: 18 }, 6)
  let now = 0
  let doneAt = -1
  const camLook = new THREE.Vector3()

  /** How big you are: smaller inside every bracket, back to normal once you're out of them. */
  const sizeAt = (z: number) => {
    let s = 1
    for (const a of ARCHES) s *= 1 - 0.22 * Math.min(1, Math.max(0, (a.z + 0.5 - z) / 1.5))
    const out = Math.min(1, Math.max(0, (TOWN_Z - 2 - z) / 3))
    return s + (1 - s) * out
  }
  let size = 1
  /** Where the camera goes to circle the cube, and how much (0 far away, 1 close). */
  const eyeFor = (me: THREE.Vector3) => {
    const dir = new THREE.Vector3(me.x - box.position.x, 0, me.z - box.position.z)
    const d = dir.length()
    const k = Math.max(0, Math.min(1, (10 - d) / 4))
    const pos = box.position.clone().addScaledVector(dir.normalize(), d + 7).setY(6.5)
    return { pos, k }
  }

  return {
    group: g,
    spawn: new THREE.Vector3(0, 0, 5.5),
    facing: Math.PI,
    sky: '#bfe6f2',
    fog: [40, 120],
    skyNow: () => shadeColor(sea.shade, { light: 0.8, chroma: 0.55 }),
    light: { hemi: 1.1, sun: 2.6, sunColor: '#fff4dc', target: new THREE.Vector3(0, 0, -10), from: new THREE.Vector3(-0.5, 1, 0.6) },
    camera: (me, _t, out) => {
      // The camera comes in close as you shrink, and backs off to look at the cube.
      const s = size
      const atCube = Math.min(1, Math.max(0, (TOWN_Z - 4 - me.z) / 4))
      out.pos.set(me.x * 0.8, 1.2 + 6.5 * s + atCube * 1.5, me.z + 2 + 7.5 * s + atCube * 2)
      camLook.set(me.x * 0.9, 0.5 + 0.6 * s, me.z - 2.5 * s)
      camLook.lerp(new THREE.Vector3(0, 2.6, CUBE_Z), atCube * 0.8)
      out.look.copy(camLook)
      // Close to the cube, the camera circles it with you: walk around it to see it from every angle.
      const eye = eyeFor(me)
      if (eye.k > 0) {
        out.pos.lerp(eye.pos, eye.k)
        out.look.lerp(box.position, eye.k)
      }
    },
    walk: (me) => {
      clampRect(me, -4, 4, CUBE_Z - 5.5, 6.5)
      // Around the cube's shadow on the sand, not through it.
      const d = Math.hypot(me.x, me.z - CUBE_Z)
      if (d < 2.3 && d > 0) {
        me.x = (me.x / d) * 2.3
        me.z = CUBE_Z + ((me.z - CUBE_Z) / d) * 2.3
      }
      return true
    },
    update: (t, dt, me) => {
      now = t
      sea_.update(t)
      drift(t, dt, me)
      size = sizeAt(me.z)
      glasses.rotation.y = Math.sin(t) * 0.4
      if (Math.hypot(me.x - 2.6, me.z - 3) < 0.8) toggle()
      town.drop.position.y = 0.7 + Math.sin(t * 1.5) * 0.05
      town.you.group.position.x = 0.1 + Math.sin(t * 0.8) * 0.3
      kitty.tail.rotation.y = Math.sin(t * 1.2) * 0.5
      // The cube turns when clicked, and slowly on its own; we count the faces you've seen face-on.
      const k = Math.min(1, (t - turnAt) / 0.6)
      if (k < 1) box.quaternion.slerpQuaternions(turnFrom, turnTo, ease(k))
      else box.rotateY(dt * 0.12)
      box.position.y = 3.2 + Math.sin(t * 0.8) * 0.15
      // Which face is toward the camera.
      const toMe = eyeFor(me).pos.clone().sub(box.position).normalize()
      let best = -1
      let bestDot = 0.8
      faceNormals.forEach((n, i) => {
        const d = n.clone().applyQuaternion(box.quaternion).dot(toMe)
        if (d > bestDot) {
          bestDot = d
          best = i
        }
      })
      if (best >= 0 && eyeFor(me).k > 0.6 && !seen.has(best)) {
        seen.add(best)
        pianoNote(5 + seen.size * 2)
        if (seen.size === 4) doneAt = t
      }
    },
    goal: () => doneAt >= 0,
    timeout: 70,
    portal: new THREE.Vector3(0, 0, CUBE_Z - 4.5),
    portalFacing: 0,
    hint: (me) => (me.z > TOWN_Z - 2 ? new THREE.Vector3(0, 0, Math.max(TOWN_Z - 3, me.z - 4)) : new THREE.Vector3(Math.sin(now * 0.3) * 3.5, 0, CUBE_Z + Math.cos(now * 0.3) * 3.5)),
    clicks,
    fx: () => ({ deut }),
    walkerScale: () => size,
  }
}
