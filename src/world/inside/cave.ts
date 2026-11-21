// Inside the cave: one long tunnel you walk along, a chamber for each part of the story, and things to
// do on the way. Walking forward is reading forward. React mounts it and shows the story cards (Inside.tsx).
import * as THREE from 'three'
import { ring, sing, strum, toot } from '../../music'
import { pianoNote, tick } from '../../sound'
import { GOLD, PINK, firefly, lambert, mesh, person, seeded, walker } from '../parts'
import { carving, carvingCount } from './carvings'

export interface CaveOptions {
  /** The scene focus of each part of the story, in order; each becomes a chamber. */
  stops: string[]
  /** Who was given the guitar on an earlier visit. */
  given: string | null
  chainDone: boolean
  songDone: boolean
  onSong: () => void
  onStop: (i: number) => void
  onChain: () => void
  onGive: (name: string) => void
  onExit: () => void
  onFirstMove: () => void
}

export interface Cave {
  /** Room the story card takes up on the right (wide screens) or bottom (phones), so the walker stays visible. */
  setInset: (right: number, bottom: number) => void
  /** Rushes the camera forward into the light, for leaving. */
  rush: () => void
  /** How far down the current story card the reader has scrolled, 0 to 1. */
  setReading: (p: number) => void
  dispose: () => void
}

const SPEED = 5
const STEP = 0.5 // metres between path samples
const FIRST = 16
const GAP = 24
const FOLK = ['Magnificence', 'Tony', 'Toby']

/** A hand print, painted once onto a canvas and reused. */
function handTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  g.fillStyle = '#fff'
  g.beginPath()
  g.ellipse(64, 84, 26, 30, 0, 0, Math.PI * 2)
  g.fill()
  const fingers: [number, number, number, number][] = [
    [30, 62, 9, -0.7],
    [44, 34, 8, -0.2],
    [62, 26, 8, 0],
    [80, 32, 8, 0.15],
    [94, 46, 7, 0.35],
  ]
  for (const [x, y, r, a] of fingers) {
    g.save()
    g.translate(x, y)
    g.rotate(a)
    g.beginPath()
    g.ellipse(0, 8, r, 22, 0, 0, Math.PI * 2)
    g.fill()
    g.restore()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function guitarModel() {
  const g = new THREE.Group()
  const wood = lambert('#c98a4b')
  const lower = mesh(new THREE.SphereGeometry(0.28, 16, 12), wood)
  lower.scale.set(1, 1, 0.35)
  const upper = mesh(new THREE.SphereGeometry(0.21, 16, 12), wood)
  upper.scale.set(1, 1, 0.35)
  upper.position.y = 0.3
  const hole = mesh(new THREE.CircleGeometry(0.07, 16), lambert('#2a1a10'), false)
  hole.position.set(0, 0.12, 0.1)
  const neck = mesh(new THREE.BoxGeometry(0.07, 0.6, 0.05), lambert('#6b4226'))
  neck.position.y = 0.72
  const head = mesh(new THREE.BoxGeometry(0.11, 0.16, 0.05), lambert('#3b2418'))
  head.position.y = 1.08
  g.add(lower, upper, hole, neck, head)
  return g
}

function blob(r = 0.45) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 20), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.35, depthWrite: false }))
  m.rotation.x = -Math.PI / 2
  m.position.y = 0.02
  return m
}

function blobAt(at: THREE.Vector3, r = 0.45) {
  const m = blob(r)
  m.position.set(at.x, 0.02, at.z)
  return m
}

function campfire(light: THREE.PointLight) {
  const g = new THREE.Group()
  const wood = lambert('#4a2e1c')
  for (let i = 0; i < 4; i++) {
    const log = mesh(new THREE.CylinderGeometry(0.08, 0.08, 1, 6), wood)
    log.rotation.z = Math.PI / 2
    log.rotation.y = (i * Math.PI) / 4
    log.position.y = 0.1
    g.add(log)
  }
  const flames = [0, 1, 2].map((i) => {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.22 - i * 0.05, 0.7 - i * 0.12, 6), new THREE.MeshBasicMaterial({ color: ['#ff8a2a', '#ffb347', '#ffe08a'][i] }))
    f.position.y = 0.4
    g.add(f)
    return f
  })
  light.position.set(0, 1.2, 0)
  g.add(light)
  const base = light.intensity
  return {
    group: g,
    update: (t: number) => {
      const k = 0.8 + Math.sin(t * 11) * 0.1 + Math.sin(t * 6.3) * 0.1
      light.intensity = base * k
      flames.forEach((f, i) => f.scale.set(1, k + Math.sin(t * 9 + i) * 0.1, 1))
    },
  }
}

export function createCave(container: HTMLElement, opts: CaveOptions): Cave {
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  container.appendChild(renderer.domElement)
  const canvas = renderer.domElement
  const overlay = document.createElement('div')
  overlay.className = 'world-overlay'
  container.appendChild(overlay)

  const scene = new THREE.Scene()
  const dark = new THREE.Color('#0e0907')
  scene.background = dark
  scene.fog = new THREE.Fog(dark, 12, 34)
  scene.add(new THREE.HemisphereLight('#a8836a', '#1c120c', 1.6))

  // ---------- the tunnel ----------
  const stopS = opts.stops.map((_, i) => FIRST + i * GAP)
  const length = (stopS[stopS.length - 1] ?? FIRST) + 22
  const ctrl: THREE.Vector3[] = []
  for (let z = -16; z <= length + 8; z += 8) ctrl.push(new THREE.Vector3(5 * Math.sin(z * 0.045) + 2.5 * Math.sin(z * 0.11 + 1) - 2.5 * Math.sin(1), 0, -z))
  const curve = new THREE.CatmullRomCurve3(ctrl)
  const curveLen = curve.getLength()
  const n = Math.ceil(length / STEP) + 1
  const P: THREE.Vector3[] = []
  const T: THREE.Vector3[] = []
  const R: THREE.Vector3[] = []
  const W: number[] = []
  const at0 = 16 / curveLen // the curve starts a little behind the entrance
  for (let i = 0; i < n; i++) {
    const s = i * STEP
    const u = Math.min(1, at0 + s / curveLen)
    P.push(curve.getPointAt(u))
    const t = curve.getTangentAt(u).setY(0).normalize()
    T.push(t)
    R.push(new THREE.Vector3(-t.z, 0, t.x))
    let w = 3
    for (const c of stopS) w += 4.5 * Math.exp(-(((s - c) / 7) ** 2))
    W.push(w)
  }
  const idxOf = (s: number) => Math.max(0, Math.min(n - 1, Math.round(s / STEP)))
  /** A spot in the tunnel: `s` metres along it, `side` metres to the right of the middle. */
  const spot = (s: number, side = 0, y = 0) => {
    const i = idxOf(s)
    return P[i].clone().addScaledVector(R[i], side).setY(y)
  }
  /** Turns something to face back toward the entrance (and the camera). */
  const faceBack = (o: THREE.Object3D, s: number) => {
    const t = T[idxOf(s)]
    o.rotation.y = Math.atan2(-t.x, -t.z)
  }

  const rand = seeded(11)
  {
    // Floor
    const pos: number[] = []
    const col: number[] = []
    const ix: number[] = []
    const c = new THREE.Color()
    for (let i = 0; i < n; i++) {
      for (const side of [-1, 1]) {
        const p = P[i].clone().addScaledVector(R[i], side * (W[i] + 3))
        pos.push(p.x, 0, p.z)
        c.set('#3a2a20').offsetHSL(0, 0, (rand() - 0.5) * 0.04)
        col.push(c.r, c.g, c.b)
      }
      if (i > 0) {
        const a = (i - 1) * 2
        ix.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
      }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
    geo.setIndex(ix)
    geo.computeVertexNormals()
    scene.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })))
  }
  {
    // Walls: two rows of boulders down each side.
    const rock = new THREE.IcosahedronGeometry(1, 0)
    const p = rock.attributes.position
    const moved = new Map<string, number>()
    for (let i = 0; i < p.count; i++) {
      const key = [p.getX(i), p.getY(i), p.getZ(i)].map((v) => v.toFixed(3)).join()
      const k = moved.get(key) ?? 0.8 + rand() * 0.4
      moved.set(key, k)
      p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k)
    }
    rock.computeVertexNormals()
    const places: [THREE.Vector3, THREE.Vector3][] = []
    for (let i = 0; i < n; i += 2) {
      for (const side of [-1, 1]) {
        const near = W[i] + 0.9 + rand() * 0.8
        places.push([P[i].clone().addScaledVector(R[i], side * near), new THREE.Vector3(1 + rand() * 1.2, 1.4 + rand() * 1.8, 1 + rand() * 1.2)])
        if (i % 4 === 0) places.push([P[i].clone().addScaledVector(R[i], side * (near + 2.4 + rand())), new THREE.Vector3(2 + rand() * 1.5, 2.8 + rand() * 2.2, 2 + rand() * 1.5)])
      }
    }
    // Close the tunnel off behind the entrance.
    for (let k = -3; k <= 3; k++) places.push([P[0].clone().addScaledVector(T[0], -14 - rand()).addScaledVector(R[0], k * 1.6), new THREE.Vector3(1.6, 2 + rand() * 2, 1.6)])
    const walls = new THREE.InstancedMesh(rock, new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true }), places.length)
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const c = new THREE.Color()
    places.forEach(([at, size], i) => {
      q.setFromEuler(new THREE.Euler(rand() * 0.4, rand() * Math.PI * 2, rand() * 0.4))
      m.compose(at.clone().setY(size.y * 0.35), q, size)
      walls.setMatrixAt(i, m)
      walls.setColorAt(i, c.set('#5b4a3e').offsetHSL((rand() - 0.5) * 0.02, 0, (rand() - 0.5) * 0.08))
    })
    scene.add(walls)
  }

  // Ground under everything, so there's never a gap at the edges.
  {
    const under = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshLambertMaterial({ color: '#2a1d15' }))
    under.rotation.x = -Math.PI / 2
    under.position.y = -0.02
    scene.add(under)
  }

  // Gold stones down the middle light up behind you: how far you've come.
  const crumbEvery = 3
  const crumbs = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.13, 0.15, 0.06, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }), Math.floor(length / crumbEvery))
  {
    const m = new THREE.Matrix4()
    const dim = new THREE.Color('#4a3a30')
    for (let i = 0; i < crumbs.count; i++) {
      m.makeTranslation(spot((i + 1) * crumbEvery, 0, 0.03))
      crumbs.setMatrixAt(i, m)
      crumbs.setColorAt(i, dim)
    }
    scene.add(crumbs)
  }
  let crumbsLit = 0
  const lightCrumbs = (s: number) => {
    const k = Math.min(crumbs.count, Math.floor(s / crumbEvery))
    if (k <= crumbsLit) return
    for (let i = crumbsLit; i < k; i++) crumbs.setColorAt(i, GOLD)
    crumbsLit = k
    crumbs.instanceColor!.needsUpdate = true
  }

  // The way out, at the far end.
  {
    const out = new THREE.Mesh(new THREE.CircleGeometry(2.6, 32), new THREE.MeshBasicMaterial({ color: '#ffe6b0', fog: false }))
    out.position.copy(spot(length + 1.5, 0, 1.8))
    faceBack(out, length)
    const glow = new THREE.PointLight('#ffd89a', 10, 16, 1.4)
    glow.position.copy(spot(length - 1, 0, 2))
    scene.add(out, glow)
  }

  // ---------- chambers ----------
  const updates: ((t: number, me: THREE.Vector3) => void)[] = []
  /** Things you can click (or drag across, for `drag`) without your walker going anywhere. */
  const clickables: { obj: THREE.Object3D; fn: (hit: THREE.Intersection) => void; drag?: boolean }[] = []
  const reading = { stop: -1, p: 0 }
  let stop = -2
  const bornAt = performance.now() / 1000
  let rushAt = -1
  const easeOut = (k: number) => 1 - (1 - k) ** 3
  const easeIn = (k: number) => k * k * k
  const labels: { el: HTMLDivElement; at: () => THREE.Vector3; near: () => boolean }[] = []
  const label = (text: string, at: () => THREE.Vector3, near: () => boolean) => {
    const el = document.createElement('div')
    el.className = 'world-label chem-oxytocin'
    el.textContent = text
    overlay.appendChild(el)
    labels.push({ el, at, near })
  }
  const me = walker()
  scene.add(me.group)
  const myShadow = blob()
  scene.add(myShadow)

  const fireAt = (s: number, side: number, color = '#ff9a3c', power = 9) => {
    const f = campfire(new THREE.PointLight(color, power, 14, 1.4))
    f.group.position.copy(spot(s, side))
    scene.add(f.group)
    updates.push((t) => f.update(t))
    return f.group.position
  }

  let pianoUp = () => {}
  const song = { center: null as THREE.Vector3 | null, stop: -1, done: false, doneAt: 0 }
  const scratch2 = new THREE.Vector3()
  // Story state the games share.
  const chain = { figures: [] as { p: ReturnType<typeof person>; at: THREE.Vector3; ring: THREE.Mesh }[], linked: 0, done: opts.chainDone, gate: null as THREE.Group | null, gateS: Infinity, startS: Infinity }
  const gift = { guitar: null as THREE.Group | null, carried: false, given: opts.given, folk: [] as { name: string; p: ReturnType<typeof person>; at: THREE.Vector3 }[], startS: Infinity }
  /** People you bump into instead of walking through. */
  const solids: THREE.Vector3[] = []
  const chord = [220, 261.63, 329.63, 392, 440, 523.25, 659.25]

  const chambers: Record<string, (s: number, i: number) => void> = {
    fire: (s) => {
      fireAt(s + 2, -3.2)
      // A bone flute on a rock. Walk up to it and it plays.
      const rockM = mesh(new THREE.DodecahedronGeometry(0.5), lambert('#6b5a4c', { flatShading: true }))
      const at = spot(s + 3, 3)
      rockM.position.copy(at).setY(0.3)
      const flute = new THREE.Group()
      const bone = mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.8, 8), lambert('#efe4cf'))
      bone.rotation.z = Math.PI / 2
      flute.add(bone)
      for (const x of [-0.15, 0, 0.15]) {
        const hole = mesh(new THREE.SphereGeometry(0.018, 6, 6), lambert('#2a1a10'), false)
        hole.position.set(x, 0.045, 0)
        flute.add(hole)
      }
      flute.position.copy(at).setY(0.85)
      scene.add(rockM, flute)
      let played = -10
      const play = () => {
        if (performance.now() / 1000 - played < 4) return
        played = performance.now() / 1000
        toot()
      }
      clickables.push({ obj: flute, fn: play })
      updates.push((t, pos) => {
        if (pos.distanceTo(at) < 1.6) play()
        const since = t - played
        flute.position.y = 0.85 + (since < 3 ? Math.sin(since * Math.PI / 3) * 0.6 : 0)
        flute.rotation.y = since < 3 ? since * 2 : flute.rotation.y
      })
    },
    synchrony: (s) => {
      const c = fireAt(s + 2, 3)
      const folk = ['#7a4a3a', '#4a5a3a', '#5a4a6a', '#8a6a3a'].map((coat, i) => {
        const p = person(coat)
        const a = (i / 4) * Math.PI * 2 + 0.4
        p.group.position.copy(c).add(new THREE.Vector3(Math.cos(a) * 1.7, 0, Math.sin(a) * 1.7))
        p.group.lookAt(c.x, 0, c.z)
        p.group.scale.setScalar(0.9)
        scene.add(p.group, blobAt(p.group.position))
        solids.push(p.group.position)
        return p
      })
      // Everyone moves to one beat.
      updates.push((t) => {
        const beat = Math.abs(Math.sin(t * Math.PI * 1.1))
        for (const p of folk) {
          p.body.position.y = beat * 0.12
          p.arms[0].rotation.z = -0.3 - beat * 0.5
          p.arms[1].rotation.z = 0.3 + beat * 0.5
        }
      })
    },
    spread: (s) => {
      fireAt(s + 1, 0, '#d9744a', 6)
      const tex = handTexture()
      const hands: { m: THREE.Mesh; at: THREE.Vector3 }[] = []
      for (let k = 0; k < 14; k++) {
        const along = s - 8 + k * 1.3
        const side = (k % 2 ? 1 : -1) * (W[idxOf(along)] + 0.2)
        const mat = new THREE.MeshBasicMaterial({ map: tex, color: '#c4562e', transparent: true, opacity: 0.15, depthWrite: false, side: THREE.DoubleSide })
        const m = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), mat)
        m.position.copy(spot(along, side, 1 + rand() * 0.8))
        m.lookAt(spot(along, 0, m.position.y))
        m.rotation.z += (rand() - 0.5) * 0.8
        scene.add(m)
        hands.push({ m, at: m.position })
      }
      // Hand prints of everyone who passed before glow as you go by.
      updates.push((_, pos) => {
        for (const h of hands) {
          const mat = h.m.material as THREE.MeshBasicMaterial
          const want = pos.distanceTo(h.at) < 4 ? 0.95 : mat.opacity > 0.5 ? 0.6 : 0.15
          mat.opacity += (want - mat.opacity) * 0.08
        }
      })
    },
    piano: (s, i) => {
      const g = new THREE.Group()
      const wood = lambert('#3b2418')
      const body = mesh(new THREE.BoxGeometry(2.2, 1.6, 0.7), wood)
      body.position.y = 0.8
      const shelf = mesh(new THREE.BoxGeometry(2.2, 0.12, 0.45), wood)
      shelf.position.set(0, 0.92, 0.5)
      const keys = mesh(new THREE.BoxGeometry(2, 0.06, 0.32), lambert('#f4efe4'))
      keys.position.set(0, 1.0, 0.56)
      g.add(body, shelf, keys)
      for (let k = 0; k < 14; k++) {
        if ([2, 6, 9, 13].includes(k)) continue
        const black = mesh(new THREE.BoxGeometry(0.07, 0.06, 0.18), lambert('#1a1210'), false)
        black.position.set(-0.93 + k * 0.143, 1.05, 0.5)
        g.add(black)
      }
      // Candles
      const candleLight = new THREE.PointLight('#ffc070', 7, 10, 1.5)
      candleLight.position.set(0, 2.2, 0.4)
      g.add(candleLight)
      const flames: THREE.Mesh[] = []
      for (const x of [-0.8, 0, 0.8]) {
        const c = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8), lambert('#f4efe4'))
        c.position.set(x, 1.75, 0.1)
        const f = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 6), new THREE.MeshBasicMaterial({ color: '#ffd27a' }))
        f.position.set(x, 1.96, 0.1)
        g.add(c, f)
        flames.push(f)
      }
      g.position.copy(spot(s + 2, -3.6))
      g.lookAt(spot(s + 2, 0))
      scene.add(g)
      // Clicking anywhere on the piano plays it (never walks you there); drag across for a run of notes.
      const hitBox = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.4, 1.6), new THREE.MeshBasicMaterial({ visible: false }))
      hitBox.position.set(0, 1.1, 0.3)
      g.add(hitBox)
      let lastKey = -1
      clickables.push({
        obj: g,
        drag: true,
        fn: (hit) => {
          const local = keys.worldToLocal(hit.point.clone())
          const key = Math.max(0, Math.min(13, Math.floor(((local.x + 1) / 2) * 14)))
          if (key === lastKey) return
          lastKey = key
          pianoNote(key)
        },
      })
      pianoUp = () => (lastKey = -1)

      // While you read this part, drawings of where the music went carve themselves into the walls.
      const marks = Array.from({ length: carvingCount }, (_, k) => {
        const along = s - 6 + k * 3
        const sideSign = k % 2 ? -1 : 1
        const c = carving(k)
        const y = 1.7 + (k % 3) * 0.25
        // In front of the wall rocks, turned a little toward whoever's coming.
        c.mesh.position.copy(spot(along, sideSign * (W[idxOf(along)] - 1.9), y))
        c.mesh.lookAt(spot(along - 6, 0, y))
        c.mesh.rotation.z += (rand() - 0.5) * 0.12
        scene.add(c.mesh)
        return { ...c, start: -1 }
      })
      let since = -1
      updates.push((t) => {
        candleLight.intensity = 7 * (0.9 + Math.sin(t * 13) * 0.06)
        flames.forEach((f, k) => (f.scale.y = 1 + Math.sin(t * 10 + k * 2) * 0.15))
        if (stop === i && since < 0) since = t
        if (since < 0) return
        // One new drawing every couple of seconds, or sooner if you read ahead.
        const read = reading.stop === i ? reading.p : 0
        const due = Math.min(marks.length, Math.max(Math.floor((t - since) / 2.4) + 1, Math.ceil(read * marks.length)))
        marks.forEach((m, k) => {
          if (k < due && m.start < 0) {
            m.start = t + k * 0.05
            tick()
          }
          if (m.start >= 0) m.draw((t - m.start) / 2.6)
        })
      })
    },
    chain: (s) => {
      fireAt(s - 2, -3, '#e8a060', 6)
      chain.startS = s
      const coats = ['#6a4a3a', '#3a4a5a', '#5a3a4a', '#4a5a3a', '#7a5a3a', '#3a3a5a', '#5a4a3a']
      coats.forEach((coat, k) => {
        const along = s + 2 + k * 2.2
        const p = person(coat)
        const at = spot(along, (k % 2 ? 1 : -1) * 1.6)
        p.group.position.copy(at)
        faceBack(p.group, along)
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.62, 28), new THREE.MeshBasicMaterial({ color: PINK, transparent: true, opacity: 0, depthWrite: false }))
        ring.rotation.x = -Math.PI / 2
        ring.position.copy(at).setY(0.03)
        scene.add(p.group, ring, blobAt(at))
        solids.push(at)
        chain.figures.push({ p, at, ring })
      })
      // A fall of rocks blocks the way on until everyone is holding hands.
      chain.gateS = s + 2 + coats.length * 2.2 + 1.5
      const gate = new THREE.Group()
      const w = W[idxOf(chain.gateS)] + 1
      for (let x = -w; x <= w; x += 1.1) {
        const r = mesh(new THREE.DodecahedronGeometry(0.7 + rand() * 0.4), lambert('#6b5a4c', { flatShading: true }))
        r.position.set(x, 0.5 + rand() * 0.6, rand() * 0.6)
        gate.add(r)
      }
      gate.position.copy(spot(chain.gateS))
      faceBack(gate, chain.gateS)
      scene.add(gate)
      chain.gate = gate
      if (chain.done) {
        chain.linked = coats.length
        gate.position.y = -3
      }
    },
    steps: (s, i) => {
      fireAt(s - 2, 4, '#d98a4a', 6)
      // Pages of songbooks, carried up on the draft.
      const pages = Array.from({ length: 16 }, (_, k) => {
        const m = mesh(new THREE.PlaneGeometry(0.32, 0.42), new THREE.MeshLambertMaterial({ color: '#efe4cf', side: THREE.DoubleSide }), false)
        scene.add(m)
        return { m, a: rand() * Math.PI * 2, r: 0.5 + rand() * 1.4, h: rand() * 4, sp: 0.4 + rand() * 0.4, k }
      })
      const column = spot(s + 2, -4)
      const sack = lambert('#8a6a45', { flatShading: true })
      for (let k = 0; k < 3; k++) {
        const m = mesh(new THREE.IcosahedronGeometry(0.45, 1), sack)
        m.scale.set(1, 1.2, 1)
        m.position.copy(spot(s - 4 + k * 0.9, 3.6 + (k % 2) * 0.5, 0.5))
        scene.add(m)
      }

      // The game: songs kept without notation. A singer sings a tune; sing it back on the ringing stones.
      const pitches = [293.66, 349.23, 392, 440, 523.25]
      const tune = [2, 4, 3, 1, 0]
      const rounds = [3, 4, 5]
      const stones = pitches.map((f, k) => {
        // An arc of stones across the chamber, lowest note on the left, like bells facing you.
        const along = s + 6 + (k - 2) ** 2 * 0.35
        const mat = lambert('#7d6a5a', { flatShading: true, emissive: '#ef6f9a', emissiveIntensity: 0 })
        const h = 1.5 - k * 0.15
        const m = mesh(new THREE.ConeGeometry(0.42, h, 6), mat)
        const at = spot(along, (k - 2) * 1.55)
        m.position.copy(at).setY(h / 2)
        scene.add(m, blobAt(at, 0.5))
        solids.push(at)
        return { m, mat, at, f, glow: 0, inside: false }
      })
      const singer = person('#3a6a4a')
      const singerAt = spot(s + 9.5, 2.8)
      singer.group.position.copy(singerAt)
      singer.group.lookAt(spot(s + 4, 0))
      scene.add(singer.group, blobAt(singerAt))
      solids.push(singerAt)
      const book = new THREE.Group()
      const cover = mesh(new THREE.BoxGeometry(0.42, 0.06, 0.32), lambert('#6f8fd0'))
      const leaves = mesh(new THREE.BoxGeometry(0.38, 0.05, 0.3), lambert('#fbf7f1'), false)
      leaves.position.y = 0.04
      book.add(cover, leaves)
      book.position.set(0, 1.0, 0.42)
      book.visible = false
      singer.body.add(book)
      song.center = spot(s + 6.4, 0)
      song.stop = i

      let round = 0
      let heard: number[] = []
      let phase: 'wait' | 'sing' | 'turn' | 'done' = opts.songDone ? 'done' : 'wait'
      let nextAt = 0
      let mouth = 0
      const sound = (k: number) => {
        stones[k].glow = 1
        ring(stones[k].f)
      }
      const singTune = (t: number) => {
        phase = 'sing'
        heard = []
        const n = rounds[round]
        for (let k = 0; k < n; k++) {
          window.setTimeout(() => {
            sing(pitches[tune[k]], { length: 0.75, level: 0.06 })
            stones[tune[k]].glow = 0.7
            mouth = 1
          }, 700 * k)
        }
        nextAt = t + 0.7 * n + 0.3
      }
      const press = (k: number) => {
        sound(k)
        if (phase !== 'turn') return
        heard.push(k)
        const want = tune.slice(0, rounds[round])
        if (heard[heard.length - 1] !== want[heard.length - 1]) {
          // Not quite: the singer hums the tune again.
          phase = 'wait'
          nextAt = performance.now() / 1000 + 1.2
          sing(196, { length: 0.6, level: 0.04 })
          return
        }
        if (heard.length < want.length) return
        round++
        if (round < rounds.length) {
          phase = 'wait'
          nextAt = performance.now() / 1000 + 1.4
          return
        }
        // The whole tune, from memory: now it can be written down.
        phase = 'done'
        song.done = true
        song.doneAt = performance.now() / 1000
        tune.forEach((k, j) => window.setTimeout(() => sing(pitches[k], { length: 0.9, level: 0.06 }), 400 + j * 450))
        opts.onSong()
      }
      stones.forEach((st, k) => clickables.push({ obj: st.m, fn: () => press(k) }))
      clickables.push({ obj: singer.group, fn: () => phase !== 'done' && phase !== 'sing' && singTune(performance.now() / 1000) })
      if (phase === 'done') {
        song.done = true
        song.doneAt = -100
      }

      updates.push((t, pos) => {
        // Stepping up to a stone rings it too.
        stones.forEach((st, k) => {
          const near = Math.hypot(pos.x - st.at.x, pos.z - st.at.z) < 0.95
          if (near && !st.inside) press(k)
          st.inside = near
          st.glow = Math.max(0, st.glow - 0.025)
          st.mat.emissiveIntensity = st.glow * 0.9 + (phase === 'turn' ? 0.08 + Math.sin(t * 3) * 0.05 : 0)
        })
        if (phase === 'wait' && stop === i && pos.distanceTo(song.center!) < 7 && t > nextAt) singTune(t)
        if (phase === 'sing' && t > nextAt) phase = 'turn'
        // The singer sways while singing.
        mouth = Math.max(0, mouth - 0.04)
        singer.body.rotation.z = phase === 'sing' || mouth > 0 ? Math.sin(t * 3) * 0.06 : 0
        singer.arms[0].rotation.z = -0.2 - mouth * 0.5
        singer.arms[1].rotation.z = 0.2 + mouth * 0.5

        // Pages swirl until the song is sung; then they fly together into a book in the singer's hands.
        const gather = song.done ? Math.min(1, (t - song.doneAt) / 2.5) : 0
        const hands = scratch2.copy(singerAt).setY(1.05)
        for (const p of pages) {
          const y = (p.h + t * p.sp) % 4.5
          const sx = column.x + Math.cos(p.a + t * 0.6) * p.r
          const sz = column.z + Math.sin(p.a + t * 0.6) * p.r
          p.m.position.set(sx + (hands.x - sx) * gather, 0.3 + y + (hands.y - 0.3 - y) * gather, sz + (hands.z - sz) * gather)
          p.m.rotation.set((t * 1.3 + p.k) * (1 - gather), (t * 0.9 + p.k) * (1 - gather), 0)
          p.m.scale.setScalar(1 - gather * 0.9)
          p.m.visible = gather < 1
        }
        book.visible = gather >= 1
        if (book.visible) singer.arms.forEach((a, k) => (a.rotation.z = (k ? 1 : -1) * 0.25))
      })
    },
    finale: (s) => {
      gift.startS = s
      const c = fireAt(s + 5, -1.5)
      const coats = ['#8a3a4a', '#3a5a6a', '#6a5a2a']
      FOLK.forEach((name, k) => {
        const p = person(coats[k])
        const a = Math.PI * (0.15 + k * 0.35)
        const at = c.clone().add(new THREE.Vector3(Math.cos(a) * 2.2, 0, Math.sin(a) * 2.2))
        p.group.position.copy(at)
        p.group.lookAt(spot(s, 0))
        scene.add(p.group, blobAt(at))
        solids.push(at)
        gift.folk.push({ name, p, at })
        label(name, () => at.clone().setY(2.3), () => gift.carried || gift.given === name)
      })
      // The guitar waits on a rock on the way in.
      const rockM = mesh(new THREE.DodecahedronGeometry(0.45), lambert('#6b5a4c', { flatShading: true }))
      const at = spot(s - 1, 2.6)
      rockM.position.copy(at).setY(0.25)
      const guitar = guitarModel()
      guitar.position.copy(at).setY(0.75)
      guitar.rotation.z = 0.3
      scene.add(rockM, guitar)
      gift.guitar = guitar
      if (gift.given) {
        const f = gift.folk.find((x) => x.name === gift.given) ?? gift.folk[2]
        hold(f.p)
      }
    },
  }

  function hold(p: ReturnType<typeof person>) {
    const g = gift.guitar!
    p.body.add(g)
    g.position.set(0.05, 0.55, 0.36)
    g.rotation.set(0, 0, 1.1)
    g.scale.setScalar(0.9)
  }

  opts.stops.forEach((focus, i) => {
    const make = chambers[focus]
    if (make) make(stopS[i], i)
    else fireAt(stopS[i] + 2, -3)
  })

  // ---------- the guide: a firefly that flies on ahead ----------
  const guide = firefly()
  const fly = guide.group
  scene.add(fly)
  const torch = new THREE.PointLight('#ffb070', 9, 14, 1.3)
  scene.add(torch)

  // ---------- camera ----------
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 120)
  let back = 1
  const inset = { right: 0, bottom: 0, x: 0, y: 0 }
  const resize = () => {
    const { clientWidth: w, clientHeight: h } = container
    renderer.setSize(w, h)
    camera.aspect = w / h
    back = Math.min(1.5, Math.max(1, (1.2 / camera.aspect) ** 0.6))
    camera.updateProjectionMatrix()
  }
  resize()
  window.addEventListener('resize', resize)

  // ---------- input ----------
  const keys = new Set<string>()
  let target: THREE.Vector3 | null = null
  let holding = false
  let moved = false
  let gone = false
  const firstMove = () => {
    if (moved) return
    moved = true
    opts.onFirstMove()
  }
  const onKey = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase()
    if (!['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) return
    if (e.metaKey || e.ctrlKey || e.altKey) return
    if ((e.target as HTMLElement | null)?.closest?.('input, textarea, [contenteditable]')) return
    e.preventDefault()
    if (e.type === 'keydown') {
      keys.add(k)
      target = null
      firstMove()
    } else keys.delete(k)
  }
  const blur = () => keys.clear()
  window.addEventListener('keydown', onKey)
  window.addEventListener('keyup', onKey)
  window.addEventListener('blur', blur)

  const ray = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  const aim = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect()
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    ray.setFromCamera(ndc, camera)
  }
  const floorHit = () => {
    const p = new THREE.Vector3()
    return ray.ray.intersectPlane(floor, p) ? p : null
  }
  const onDown = (e: PointerEvent) => {
    aim(e)
    firstMove()
    for (const c of clickables) {
      const hit = ray.intersectObject(c.obj, true)[0]
      if (hit) {
        if (c.drag) {
          dragging = c
          canvas.setPointerCapture(e.pointerId)
        }
        return c.fn(hit)
      }
    }
    const p = floorHit()
    if (!p) return
    target = p
    holding = true
    canvas.setPointerCapture(e.pointerId)
  }
  const onMove = (e: PointerEvent) => {
    aim(e)
    if (dragging) {
      const hit = ray.intersectObject(dragging.obj, true)[0]
      if (hit) dragging.fn(hit)
      return
    }
    if (holding) {
      const p = floorHit()
      if (p) target = p
      return
    }
    if (e.pointerType === 'mouse') canvas.style.cursor = clickables.some((c) => ray.intersectObject(c.obj, true).length) ? 'pointer' : ''
  }
  let dragging: (typeof clickables)[number] | null = null
  const onUp = () => {
    holding = false
    dragging = null
    pianoUp()
  }
  // Scrolling walks you along the path, like reading.
  let idx = 0
  const onWheel = (e: WheelEvent) => {
    e.preventDefault()
    firstMove()
    const from = target ? idxOf(nearestS(target)) : idx
    target = P[Math.max(0, Math.min(n - 1, from + Math.round(e.deltaY * 0.02)))].clone()
  }
  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerup', onUp)
  canvas.addEventListener('pointercancel', onUp)
  canvas.addEventListener('wheel', onWheel, { passive: false })

  /** How far along the tunnel a point is (searching near where we were). */
  function nearestS(p: THREE.Vector3, around = -1) {
    let best = 0
    let bestD = Infinity
    const lo = around < 0 ? 0 : Math.max(0, around - 40)
    const hi = around < 0 ? n - 1 : Math.min(n - 1, around + 40)
    for (let i = lo; i <= hi; i++) {
      const d = (P[i].x - p.x) ** 2 + (P[i].z - p.z) ** 2
      if (d < bestD) {
        bestD = d
        best = i
      }
    }
    return best * STEP
  }

  // ---------- each frame ----------
  const pos = me.group.position
  pos.copy(spot(2))
  faceBack(me.group, 2)
  me.group.rotation.y += Math.PI
  const vel = new THREE.Vector3()
  const want = new THREE.Vector3()
  const fwd = T[0].clone()
  const focus = pos.clone()
  const scratch = new THREE.Vector3()
  const scarf = new THREE.Color()
  let step = 0
  let last = performance.now()
  let raf = 0
  camera.position.copy(pos).addScaledVector(fwd, -8.5 * back).add(new THREE.Vector3(0, 6.5 * back, 0))

  const linkLines: THREE.Mesh[] = []
  const linkMat = new THREE.MeshBasicMaterial({ color: '#ffc0d4', fog: false })
  const hand = (k: number) => chain.figures[k].at.clone().setY(1.0)
  const drawLink = (k: number) => {
    const a = hand(k - 1)
    const b = hand(k)
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, a.distanceTo(b), 6), linkMat)
    line.position.copy(a).add(b).multiplyScalar(0.5)
    line.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize())
    scene.add(line)
    linkLines.push(line)
  }
  for (let k = 1; k < chain.linked; k++) drawLink(k)
  let chainSwell = chain.done ? -1 : 0

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame)
    // The first frame's clock can read a hair before `last`; a negative step would run everything backward.
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000))
    last = now
    const t = now / 1000

    // Which way is "forward" for the keys: along the camera's view.
    want.set(0, 0, 0)
    if (!gone) {
      const right = scratch.set(-fwd.z, 0, fwd.x)
      if (keys.has('w') || keys.has('arrowup')) want.add(fwd)
      if (keys.has('s') || keys.has('arrowdown')) want.sub(fwd)
      if (keys.has('a') || keys.has('arrowleft')) want.sub(right)
      if (keys.has('d') || keys.has('arrowright')) want.add(right)
      if (want.lengthSq() === 0 && target) {
        want.subVectors(target, pos).setY(0)
        const d = want.length()
        if (d < 0.25) {
          want.set(0, 0, 0)
          if (!holding) target = null
        } else want.multiplyScalar(Math.min(1, d / 0.8) / d)
      }
      if (want.lengthSq() > 1) want.normalize()
    }
    vel.lerp(want.multiplyScalar(SPEED), 1 - Math.exp(-dt * 10))
    pos.addScaledVector(vel, dt)

    // Stay inside the tunnel, and behind the rockfall until it's cleared.
    idx = idxOf(nearestS(pos, idx))
    let s = idx * STEP
    const maxS = chain.done ? length + 2 : Math.min(length + 2, chain.gateS - 1.2)
    if (s > maxS) {
      idx = idxOf(maxS)
      s = maxS
    }
    if (s < 0.5) {
      idx = 1
      s = idx * STEP
    }
    const side = scratch.subVectors(pos, P[idx]).dot(R[idx])
    const lim = W[idx] - 0.5
    const along = scratch.subVectors(pos, P[idx]).dot(T[idx])
    pos.copy(P[idx]).addScaledVector(R[idx], Math.max(-lim, Math.min(lim, side))).addScaledVector(T[idx], Math.max(-STEP, Math.min(STEP, along)))
    pos.y = 0
    for (const o of solids) {
      const dx = pos.x - o.x
      const dz = pos.z - o.z
      const d = Math.hypot(dx, dz)
      if (d < 0.7 && d > 0) pos.set(o.x + (dx / d) * 0.7, 0, o.z + (dz / d) * 0.7)
    }
    lightCrumbs(s)

    // Walk, bob, lean.
    const speed = Math.hypot(vel.x, vel.z)
    if (speed > 0.3) {
      let diff = Math.atan2(vel.x, vel.z) - me.group.rotation.y
      diff = Math.atan2(Math.sin(diff), Math.cos(diff))
      me.group.rotation.y += diff * Math.min(1, dt * 12)
    }
    step += speed * dt * 2.4
    me.body.position.y = Math.abs(Math.sin(step)) * 0.12 * Math.min(1, speed / 2)
    me.body.rotation.x = Math.min(0.25, speed * 0.04)
    me.tail.rotation.x = -0.3 - Math.min(0.9, speed * 0.15)
    me.scarf.color.copy(scarf.copy(PINK))
    myShadow.position.set(pos.x, 0.02, pos.z)
    torch.position.set(pos.x + fwd.x * 1.5, 3.2, pos.z + fwd.z * 1.5)

    // Which part of the story are we in?
    let now_ = -1
    stopS.forEach((c, i) => {
      if (s >= c - 4) now_ = i
    })
    if (now_ !== stop) {
      stop = now_
      opts.onStop(stop)
    }

    // ---- the human chain ----
    if (chain.figures.length && !chain.done) {
      const k = chain.linked
      const next = chain.figures[k]
      chain.figures.forEach((f, i) => ((f.ring.material as THREE.MeshBasicMaterial).opacity = i === k && s > chain.startS - 6 ? 0.45 + Math.sin(t * 4) * 0.25 : 0))
      if (next && pos.distanceTo(next.at) < 1.5) {
        chain.linked++
        sing(chord[k] / 2, { level: 0.07 })
        tick()
        if (k > 0) drawLink(k)
        if (chain.linked === chain.figures.length) {
          chain.done = true
          chainSwell = t
          chord.forEach((f, i) => sing(f / 2, { at: 0.6 + i * 0.08, length: 4.5, level: 0.05 }))
          opts.onChain()
        }
      }
    }
    chain.figures.forEach((f, i) => {
      const held = i < chain.linked
      const lift = held ? 1.15 : 0.15
      f.p.arms[0].rotation.z += (-lift - f.p.arms[0].rotation.z) * 0.1
      f.p.arms[1].rotation.z += (lift - f.p.arms[1].rotation.z) * 0.1
      // Once the whole line is holding hands, they sway together.
      f.p.body.rotation.z = chain.done ? Math.sin(t * 1.6) * 0.08 : 0
      f.p.body.position.y = held && !chain.done ? Math.abs(Math.sin(t * 3 + i)) * 0.05 : 0
    })
    if (chain.gate && chainSwell > 0) {
      const k = Math.min(1, (t - chainSwell - 0.8) / 2.5)
      if (k > 0) chain.gate.position.y = -3 * k * k
      chain.gate.position.x += Math.sin(t * 40) * 0.01 * (k > 0 && k < 1 ? 1 : 0)
    }

    // ---- the guitar ----
    if (gift.guitar && !gift.given) {
      if (!gift.carried && Math.hypot(pos.x - gift.guitar.position.x, pos.z - gift.guitar.position.z) < 1.3) {
        gift.carried = true
        me.body.add(gift.guitar)
        gift.guitar.position.set(0, 0.9, -0.38)
        gift.guitar.rotation.set(0, 0, 0.6)
        tick()
      }
      if (gift.carried) {
        const f = gift.folk.find((x) => pos.distanceTo(x.at) < 1.6)
        if (f) {
          gift.given = f.name
          gift.carried = false
          hold(f.p)
          strum()
          opts.onGive(f.name)
        }
      } else if (!gift.carried) {
        gift.guitar.rotation.y = t * 0.8
        gift.guitar.position.y = 0.8 + Math.sin(t * 2) * 0.05
      }
    }
    gift.folk.forEach((f, i) => {
      const playing = gift.given === f.name
      const beat = gift.given ? Math.abs(Math.sin(t * Math.PI * 1.2 + (playing ? 0 : 0))) : Math.abs(Math.sin(t * 0.8 + i))
      f.p.body.position.y = beat * (gift.given ? 0.14 : 0.03)
      if (playing) f.p.arms[1].rotation.z = 0.6 + Math.sin(t * 9) * 0.35
    })

    for (const u of updates) u(t, pos)

    // ---- the firefly flies toward whatever's next ----
    let goal: THREE.Vector3
    if (chain.figures.length && !chain.done && s > chain.startS - 6) goal = chain.figures[chain.linked].at
    else if (song.center && !song.done && stop === song.stop) goal = song.center
    else if (gift.guitar && !gift.given && s > gift.startS - 8) goal = gift.carried ? gift.folk[2].at : gift.guitar.position
    else {
      const nextStop = stopS.find((c) => c > s + 3)
      goal = spot(nextStop ?? length + 1)
    }
    const toGoal = scratch.subVectors(goal, pos).setY(0)
    const d = toGoal.length()
    const flyTo = d < 2 ? goal.clone() : pos.clone().addScaledVector(toGoal.normalize(), Math.min(3, d * 0.6))
    flyTo.y = 1.9 + Math.sin(t * 3) * 0.15
    flyTo.x += Math.sin(t * 2.3) * 0.2
    fly.position.lerp(flyTo, 1 - Math.exp(-dt * 3))
    guide.update(t, camera)

    // The way out.
    if (!gone && s > length - 1.5) {
      gone = true
      rushAt = t
      opts.onExit()
    }

    // ---- camera: behind you, looking down the tunnel ----
    fwd.lerp(T[idx], 1 - Math.exp(-dt * 2)).normalize()
    focus.lerp(pos, 1 - Math.exp(-dt * 4))
    // Arriving, it starts low and close behind you and rises up and back; leaving, it rushes ahead into the light.
    const rise = easeOut(Math.min(1, (t - bornAt) / 2.2))
    const rushK = rushAt < 0 ? 0 : easeIn(Math.min(1, (t - rushAt) / 0.9))
    const dist = (2.2 + (8.5 - 2.2) * rise) * back
    const height = (1.3 + (6.5 - 1.3) * rise) * back
    const camTo = scratch.copy(focus).addScaledVector(fwd, -dist + rushK * 14).add(new THREE.Vector3(0, height - rushK * 3, 0))
    if (rise < 1 || rushK > 0) camera.position.copy(camTo)
    else camera.position.lerp(camTo, 1 - Math.exp(-dt * 4))
    camera.lookAt(scratch.copy(focus).addScaledVector(fwd, 3 + rushK * 12).setY(1 + rushK))
    const fov = 50 + rushK * 38
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }
    // Slide the picture over so the story card doesn't cover you.
    inset.x += (inset.right / 2 - inset.x) * Math.min(1, dt * 5)
    inset.y += (inset.bottom / 2 - inset.y) * Math.min(1, dt * 5)
    const { clientWidth: w, clientHeight: h } = container
    camera.setViewOffset(w, h, inset.x, inset.y, w, h)

    const r = canvas.getBoundingClientRect()
    for (const l of labels) {
      l.el.classList.toggle('show', l.near() && pos.distanceTo(l.at()) < 9)
      scratch.copy(l.at()).project(camera)
      l.el.style.transform = `translate(${((scratch.x + 1) / 2) * r.width}px, ${((1 - scratch.y) / 2) * r.height}px) translate(-50%, -100%)`
    }

    renderer.render(scene, camera)
  }
  raf = requestAnimationFrame(frame)

  return {
    rush: () => {
      gone = true
      if (rushAt < 0) rushAt = performance.now() / 1000
    },
    setReading: (p) => {
      reading.stop = stop
      reading.p = p
    },
    setInset: (right, bottom) => {
      inset.right = right
      inset.bottom = bottom
    },
    dispose: () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
      window.removeEventListener('blur', blur)
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose()
          const mats = Array.isArray(o.material) ? o.material : [o.material]
          mats.forEach((m) => {
            ;(m as THREE.MeshBasicMaterial).map?.dispose()
            m.dispose()
          })
        }
      })
      renderer.dispose()
      canvas.remove()
      overlay.remove()
    },
  }
}
