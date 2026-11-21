// Inside the Blue Room: one blue, square room seen like a dollhouse, with a stop for each part of the
// story. Real sunlight through the window draws the "boxes of light" on the carpet, and the cats lie in them.
import * as THREE from 'three'
import { ding, pianoNote, tick } from '../../sound'
import { cat, firefly, lambert, mesh, person, walker } from '../parts'
import type { Cave } from './cave'

export interface RoomOptions {
  /** The scene focus of each part of the story, in order. */
  stops: string[]
  onStop: (i: number) => void
  onExit: () => void
  onFirstMove: () => void
}

const SPEED = 4.2
const ROOM = { x0: -7, x1: 7, z0: -7, z1: 6.2, h: 4 }
const WIN = { x0: 0.6, x1: 4.8, y0: 0.9, y1: 3.3 }
const DOOR = { z0: 3, z1: 4.6, h: 2.4 }
const SIDEWALK = -12

/** A baby picture, painted on a canvas: round face, a curl of hair, and a different mood each time. */
function babyTexture(k: number) {
  const c = document.createElement('canvas')
  c.width = 96
  c.height = 120
  const g = c.getContext('2d')!
  g.fillStyle = ['#f6d6e0', '#d6e6f6', '#f6ecd0', '#dff0dc', '#ead8f4', '#f8dccc'][k % 6]
  g.fillRect(0, 0, 96, 120)
  g.fillStyle = '#f1cfae'
  g.beginPath()
  g.arc(48, 62, 30, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = '#6b4a2a'
  g.lineWidth = 3
  g.beginPath()
  g.arc(50, 30, 7, Math.PI * 0.9, Math.PI * 2.2)
  g.stroke()
  g.fillStyle = '#2b2440'
  for (const x of [38, 58]) {
    g.beginPath()
    g.arc(x, 58, 3, 0, Math.PI * 2)
    g.fill()
  }
  g.lineWidth = 2.5
  g.beginPath()
  if (k % 3 === 0) g.arc(48, 70, 8, 0.1 * Math.PI, 0.9 * Math.PI)
  else if (k % 3 === 1) g.ellipse(48, 74, 4, 5, 0, 0, Math.PI * 2)
  else g.arc(48, 80, 8, 1.15 * Math.PI, 1.85 * Math.PI)
  g.stroke()
  g.fillStyle = 'rgba(239, 111, 154, 0.35)'
  for (const x of [32, 64]) {
    g.beginPath()
    g.arc(x, 68, 5, 0, Math.PI * 2)
    g.fill()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function smileyTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  g.fillStyle = '#ffd23f'
  g.beginPath()
  g.arc(32, 32, 30, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#2b2440'
  for (const x of [22, 42]) {
    g.beginPath()
    g.arc(x, 26, 4, 0, Math.PI * 2)
    g.fill()
  }
  g.strokeStyle = '#2b2440'
  g.lineWidth = 4
  g.beginPath()
  g.arc(32, 34, 14, 0.15 * Math.PI, 0.85 * Math.PI)
  g.stroke()
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export function createBlueRoom(container: HTMLElement, opts: RoomOptions): Cave {
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  container.appendChild(renderer.domElement)
  const canvas = renderer.domElement

  const scene = new THREE.Scene()
  const day = new THREE.Color('#bcd7f2')
  const dusk = new THREE.Color('#3d3566')
  const sky = day.clone()
  scene.background = sky

  const hemi = new THREE.HemisphereLight('#e4ecff', '#4a4570', 0.85)
  scene.add(hemi)
  // The sun, outside, shining in through the window.
  const sun = new THREE.DirectionalLight('#ffc870', 8)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 60 })
  sun.shadow.bias = -0.0008
  sun.shadow.normalBias = 0.02
  const sunTarget = new THREE.Object3D()
  sunTarget.position.set(2.2, 0, -2)
  scene.add(sun, sunTarget)
  sun.target = sunTarget

  const solid = (m: THREE.Mesh) => {
    m.castShadow = true
    m.receiveShadow = true
    scene.add(m)
    return m
  }
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
    m.position.set(x, y, z)
    return solid(m)
  }

  // ---------- the room ----------
  const wall = lambert('#8fb0ea')
  const trim = lambert('#f4efe4')
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.x1 - ROOM.x0, ROOM.z1 - ROOM.z0), lambert('#4a62a8'))
  floor.rotation.x = -Math.PI / 2
  floor.position.set(0, 0, (ROOM.z0 + ROOM.z1) / 2)
  floor.receiveShadow = true
  scene.add(floor)
  const T = 0.3
  const { x0, x1, z0, z1, h } = ROOM
  // Back wall, built around the window opening.
  box(WIN.x0 - x0, h, T, (x0 + WIN.x0) / 2, h / 2, z0 - T / 2, wall)
  box(x1 - WIN.x1, h, T, (WIN.x1 + x1) / 2, h / 2, z0 - T / 2, wall)
  box(WIN.x1 - WIN.x0, WIN.y0, T, (WIN.x0 + WIN.x1) / 2, WIN.y0 / 2, z0 - T / 2, wall)
  box(WIN.x1 - WIN.x0, h - WIN.y1, T, (WIN.x0 + WIN.x1) / 2, (WIN.y1 + h) / 2, z0 - T / 2, wall)
  // Window frame and its cross, which the sunlight carries onto the carpet.
  const wx = (WIN.x0 + WIN.x1) / 2
  const wy = (WIN.y0 + WIN.y1) / 2
  box(0.12, WIN.y1 - WIN.y0, 0.16, wx, wy, z0 - T / 2, trim)
  box(WIN.x1 - WIN.x0, 0.12, 0.16, wx, wy, z0 - T / 2, trim)
  box(WIN.x1 - WIN.x0 + 0.3, 0.12, 0.4, wx, WIN.y0 - 0.02, z0 + 0.05, trim)
  // Right wall, and the left wall with a doorway near the front.
  box(T, h, z1 - z0, x1 + T / 2, h / 2, (z0 + z1) / 2, wall)
  box(T, h, DOOR.z0 - z0, x0 - T / 2, h / 2, (z0 + DOOR.z0) / 2, wall)
  box(T, h, z1 - DOOR.z1, x0 - T / 2, h / 2, (DOOR.z1 + z1) / 2, wall)
  box(T, h - DOOR.h, DOOR.z1 - DOOR.z0, x0 - T / 2, (DOOR.h + h) / 2, (DOOR.z0 + DOOR.z1) / 2, wall)
  const doorGlowMat = new THREE.MeshBasicMaterial({ color: '#fff4dc', transparent: true, opacity: 0 })
  const doorGlow = new THREE.Mesh(new THREE.PlaneGeometry(DOOR.z1 - DOOR.z0, DOOR.h), doorGlowMat)
  doorGlow.rotation.y = Math.PI / 2
  doorGlow.position.set(x0 - T - 0.02, DOOR.h / 2, (DOOR.z0 + DOOR.z1) / 2)
  scene.add(doorGlow)
  // Baseboards
  box(x1 - x0, 0.14, 0.05, 0, 0.07, z0 + 0.02, trim)
  box(0.05, 0.14, z1 - z0, x1 - 0.02, 0.07, (z0 + z1) / 2, trim)

  // ---------- outside the window ----------
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), lambert('#9cc59a'))
  grass.rotation.x = -Math.PI / 2
  grass.position.set(0, -0.02, -10)
  grass.receiveShadow = true
  scene.add(grass)
  const walk = new THREE.Mesh(new THREE.PlaneGeometry(80, 2), lambert('#d9d4cc'))
  walk.rotation.x = -Math.PI / 2
  walk.position.set(0, 0, SIDEWALK)
  const road = new THREE.Mesh(new THREE.PlaneGeometry(80, 5), lambert('#55545e'))
  road.rotation.x = -Math.PI / 2
  road.position.set(0, 0.005, SIDEWALK - 3.6)
  const porch = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 4.4), lambert('#d9d4cc'))
  porch.rotation.x = -Math.PI / 2
  porch.position.set(-3, 0.004, z0 - 2.8)
  scene.add(walk, road, porch)
  const houseColors = ['#e8c9a0', '#c9d8b6', '#e3b8c4', '#bcc8e8']
  for (let k = 0; k < 6; k++) {
    const hx = -18 + k * 7.5
    box(4.4, 2.8, 3.6, hx, 1.4, SIDEWALK - 12, lambert(houseColors[k % 4]))
    const roof = solid(new THREE.Mesh(new THREE.ConeGeometry(3.3, 1.5, 4), lambert('#8a5a4a', { flatShading: true })))
    roof.position.set(hx, 3.55, SIDEWALK - 12)
    roof.rotation.y = Math.PI / 4
  }
  // Street lamps that come on at dusk.
  const lampMat = new THREE.MeshBasicMaterial({ color: '#6b6875' })
  const lamps: THREE.MeshBasicMaterial[] = []
  for (let k = 0; k < 5; k++) {
    const lx = -12 + k * 6
    box(0.1, 3, 0.1, lx, 1.5, SIDEWALK - 1.3, lambert('#4a4855'))
    const bulb = lampMat.clone()
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), bulb)
    m.position.set(lx, 3.05, SIDEWALK - 1.3)
    scene.add(m)
    lamps.push(bulb)
  }
  // Stars, for later.
  const starGeo = new THREE.BufferGeometry()
  const starPos: number[] = []
  for (let k = 0; k < 120; k++) starPos.push((Math.random() - 0.5) * 80, 8 + Math.random() * 20, -30 - Math.random() * 20)
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3))
  const starMat = new THREE.PointsMaterial({ color: '#fff6dc', size: 0.25, transparent: true, opacity: 0 })
  scene.add(new THREE.Points(starGeo, starMat))

  // ---------- story pieces ----------
  const clickables: { obj: THREE.Object3D; fn: () => void }[] = []
  const stations: { focus: string; at: THREE.Vector3; reach: number; ready: () => boolean; window?: boolean }[] = []
  const at = (x: number, z: number) => new THREE.Vector3(x, 0, z)

  // The baby photos above the shelf. Click one to take it down.
  const shelf = box(4.6, 0.08, 0.45, -4, 2.15, z0 + 0.23, lambert('#e8dccb'))
  shelf.castShadow = true
  const photos = Array.from({ length: 6 }, (_, k) => {
    const g = new THREE.Group()
    const frame = mesh(new THREE.BoxGeometry(0.62, 0.76, 0.05), lambert(['#c9a46b', '#f4efe4', '#8a5a4a'][k % 3]))
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.64), new THREE.MeshLambertMaterial({ map: babyTexture(k) }))
    pic.position.z = 0.03
    g.add(frame, pic)
    g.position.set(-6 + k * 0.8, 2.75 + (k % 2) * 0.35, z0 + 0.04)
    g.rotation.z = (k % 3 - 1) * 0.04
    scene.add(g)
    const p = { g, down: false, at: 0, from: g.position.clone() }
    clickables.push({
      obj: g,
      fn: () => {
        if (p.down) return
        p.down = true
        p.at = performance.now() / 1000
        tick()
        if (photos.every((q) => q.down)) [0, 4, 7].forEach((n, j) => window.setTimeout(() => pianoNote(n + 7), 300 + j * 120))
      },
    })
    return p
  })

  // The desk, and the math homework: a little army of paper soldiers in bicorne hats.
  const wood = lambert('#8a5a3a')
  box(1.4, 0.08, 2.6, -6.15, 1.0, -1, wood)
  for (const [dx, dz] of [
    [-0.6, -1.2],
    [0.6, -1.2],
    [-0.6, 1.2],
    [0.6, 1.2],
  ])
    box(0.08, 1, 0.08, -6.15 + dx, 0.5, -1 + dz, wood)
  const bin = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.6, 14, 1, true), new THREE.MeshLambertMaterial({ color: '#c96f4a', side: THREE.DoubleSide })))
  bin.position.set(-6.2, 0.3, 1.1)
  const paper = new THREE.MeshLambertMaterial({ color: '#fbf7f1', side: THREE.DoubleSide })
  const hat = lambert('#2b2440')
  const soldiers = Array.from({ length: 12 }, (_, k) => {
    const g = new THREE.Group()
    const sheet = mesh(new THREE.PlaneGeometry(0.16, 0.22), paper)
    sheet.position.y = 0.11
    const bicorne = mesh(new THREE.ConeGeometry(0.07, 0.06, 3), hat)
    bicorne.scale.set(1.6, 1, 0.6)
    bicorne.position.y = 0.25
    g.add(sheet, bicorne)
    g.rotation.y = Math.PI / 2
    scene.add(g)
    const s = { g, row: k % 3, col: Math.floor(k / 3), gone: -1, from: new THREE.Vector3() }
    clickables.push({
      obj: g,
      fn: () => {
        if (s.gone >= 0) return
        s.gone = performance.now() / 1000
        s.from.copy(g.position)
        sheet.geometry = new THREE.IcosahedronGeometry(0.07, 0)
        bicorne.visible = false
        tick()
      },
    })
    return s
  })
  const flag = new THREE.Group()
  const pole = mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.45, 6), lambert('#4a4855'))
  pole.position.y = 0.22
  const cloth = mesh(new THREE.PlaneGeometry(0.22, 0.14), paper)
  cloth.position.set(0.11, 0.38, 0)
  flag.add(pole, cloth)
  flag.position.set(-6.15, 1.04, -1)
  flag.rotation.y = Math.PI / 2
  flag.scale.setScalar(0.001)
  scene.add(flag)

  // The very nice fat chair (not round; a square-shaped cushion chair).
  const chair = new THREE.Group()
  const fabric = lambert('#e0a85c')
  const seat = mesh(new THREE.BoxGeometry(1.3, 0.45, 1.3), fabric)
  seat.position.y = 0.45
  const back = mesh(new THREE.BoxGeometry(0.35, 1.1, 1.3), fabric)
  back.position.set(0.5, 1.0, 0)
  const armL = mesh(new THREE.BoxGeometry(1.3, 0.55, 0.28), fabric)
  armL.position.set(0, 0.7, -0.6)
  const armR = armL.clone()
  armR.position.z = 0.6
  chair.add(seat, back, armL, armR)
  chair.position.set(5.6, 0, 0.6)
  chair.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true
      o.receiveShadow = true
    }
  })
  scene.add(chair)
  const seatAt = new THREE.Vector3(5.5, 0.5, 0.6)

  // The cats: they lie in the boxes of light and follow them as the sun moves.
  const cats = ['#e0904a', '#2f2a33', '#9a9aa2'].map((fur, k) => {
    const c = cat(fur)
    c.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.castShadow = true
    })
    c.group.position.set(1 + k, 0, -1 - k * 0.6)
    scene.add(c.group)
    return { ...c, k, inBox: false }
  })

  // The package.
  const pkg = new THREE.Group()
  const cardboard = lambert('#c99a62')
  const base = mesh(new THREE.BoxGeometry(0.9, 0.6, 0.7), cardboard)
  base.position.y = 0.3
  const flaps = [0, 1, 2, 3].map((k) => {
    const pivot = new THREE.Group()
    const wide = k % 2 === 0
    const f = mesh(new THREE.BoxGeometry(wide ? 0.9 : 0.35, 0.02, wide ? 0.35 : 0.7), cardboard)
    // Each flap hinges on one top edge of the box.
    const [px, pz] = [
      [0, -0.35],
      [-0.45, 0],
      [0, 0.35],
      [0.45, 0],
    ][k]
    pivot.position.set(px, 0.6, pz)
    f.position.set(px ? -px * 0.39 : 0, 0, pz ? -pz / 2 : 0)
    pivot.add(f)
    pkg.add(pivot)
    return pivot
  })
  pkg.add(base)
  pkg.position.set(-1, 0, 3)
  pkg.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = true
  })
  scene.add(pkg)
  const uniform = new THREE.Group()
  const navy = lambert('#2c3e6b')
  const torso = mesh(new THREE.BoxGeometry(0.5, 0.6, 0.12), navy)
  for (const sd of [-1, 1]) {
    const m = mesh(new THREE.BoxGeometry(0.34, 0.14, 0.12), navy)
    m.position.set(sd * 0.36, 0.2, 0)
    m.rotation.z = sd * -0.5
    uniform.add(m)
  }
  const collar = mesh(new THREE.BoxGeometry(0.2, 0.06, 0.13), lambert('#f4efe4'))
  collar.position.y = 0.3
  uniform.add(torso, collar)
  uniform.visible = false
  uniform.position.set(-1, 0.4, 3)
  scene.add(uniform)
  let opened = -1
  const open = () => {
    if (opened >= 0) return
    opened = performance.now() / 1000
    uniform.visible = true
    tick()
  }
  clickables.push({ obj: pkg, fn: open })

  // People walking past outside; one of them, in a blue vest with a smiley face, is bringing the package.
  const passers = ['#c96f4a', '#5a8a5a', '#8a6aa8', '#c9a46b'].map((coat, k) => {
    const p = person(coat)
    p.group.scale.setScalar(0.95)
    p.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.castShadow = true
    })
    scene.add(p.group)
    return { p, x: -16 + k * 9, dir: k % 2 ? 1 : -1, speed: 1.1 + k * 0.15 }
  })
  const courier = person('#3d6fd8')
  const smiley = new THREE.Mesh(new THREE.CircleGeometry(0.14, 20), new THREE.MeshBasicMaterial({ map: smileyTexture() }))
  smiley.position.set(0, 0.75, 0.35)
  courier.body.add(smiley)
  const parcel = mesh(new THREE.BoxGeometry(0.5, 0.36, 0.4), cardboard)
  parcel.position.set(0, 0.75, 0.55)
  courier.body.add(parcel)
  courier.arms.forEach((a) => (a.rotation.x = -1.2))
  courier.group.visible = false
  scene.add(courier.group)
  const delivery = { started: -1, x: 16, spotted: false, rang: false, doneAt: -1, wave: 0 }
  clickables.push({
    obj: courier.group,
    fn: () => {
      if (delivery.started < 0 || delivery.rang) return
      delivery.spotted = true
      delivery.rang = true
      delivery.doneAt = performance.now() / 1000
      delivery.wave = 1
      ding()
    },
  })

  // Uniform flight and dusk
  let duskK = 0

  // ---------- stations, in story order ----------
  const spots: Record<string, { at: THREE.Vector3; reach?: number; ready?: () => boolean; window?: boolean }> = {
    photos: { at: at(-4, -5.6) },
    battle: { at: at(-4.6, -1) },
    sunlight: { at: at(1.6, -2.6), reach: 2.6 },
    chair: { at: at(4.4, 0.6) },
    arrival: { at: at(2.7, -5.7), window: true },
    window: { at: at(2.7, -5.7), window: true, ready: () => delivery.doneAt > 0 && performance.now() / 1000 - delivery.doneAt > 3.5 },
    box: { at: at(-1, 2.2) },
  }
  opts.stops.forEach((focus, k) => {
    const sp = spots[focus] ?? { at: at(-4 + k * 1.4, 0) }
    stations.push({ focus, at: sp.at, reach: sp.reach ?? 1.8, ready: sp.ready ?? (() => true), window: sp.window })
  })

  // ---------- walker, guide, camera ----------
  const me = walker()
  me.group.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = true
  })
  scene.add(me.group)
  const pos = me.group.position
  pos.set(-5.6, 0, 3.8)
  me.group.rotation.y = Math.PI / 2
  const guide = firefly()
  guide.group.position.set(-4.5, 1.8, 3.6)
  scene.add(guide.group)

  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 160)
  let backOff = 1
  const inset = { right: 0, bottom: 0, x: 0, y: 0 }
  const resize = () => {
    const { clientWidth: w, clientHeight: hh } = container
    renderer.setSize(w, hh)
    camera.aspect = w / hh
    backOff = Math.min(1.7, Math.max(1, (1.3 / camera.aspect) ** 0.7))
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
  let sitting = false
  const firstMove = () => {
    if (moved) return
    moved = true
    opts.onFirstMove()
  }
  const onKey = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase()
    if (!['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) return
    if (e.metaKey || e.ctrlKey || e.altKey) return
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
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  const aim = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect()
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    ray.setFromCamera(ndc, camera)
  }
  const floorHit = () => {
    const p = new THREE.Vector3()
    return ray.ray.intersectPlane(ground, p) ? p : null
  }
  const onDown = (e: PointerEvent) => {
    aim(e)
    firstMove()
    for (const c of clickables) if (ray.intersectObject(c.obj, true).length) return c.fn()
    if (ray.intersectObject(chair, true).length) {
      target = at(4.4, 0.6)
      sitNext = true
      return
    }
    const p = floorHit()
    if (!p) return
    target = p
    holding = true
    canvas.setPointerCapture(e.pointerId)
  }
  let sitNext = false
  const onMove = (e: PointerEvent) => {
    aim(e)
    if (holding) {
      const p = floorHit()
      if (p) target = p
      return
    }
    if (e.pointerType === 'mouse') canvas.style.cursor = clickables.some((c) => ray.intersectObject(c.obj, true).length) || ray.intersectObject(chair, true).length ? 'pointer' : ''
  }
  const onUp = () => (holding = false)
  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerup', onUp)
  canvas.addEventListener('pointercancel', onUp)

  // ---------- each frame ----------
  const vel = new THREE.Vector3()
  const want = new THREE.Vector3()
  const look = new THREE.Vector3()
  const camPos = new THREE.Vector3()
  const tmp = new THREE.Vector3()
  const sunDir = new THREE.Vector3()
  let windowCam = 0
  let reached = -1
  let stop = -2
  let step = 0
  let last = performance.now()
  let raf = 0
  const bornAt = performance.now() / 1000
  let rushAt = -1
  const ease = (k: number) => 1 - (1 - k) ** 3

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame)
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000))
    last = now
    const t = now / 1000

    // ---- walking ----
    want.set(0, 0, 0)
    if (!gone) {
      if (keys.has('w') || keys.has('arrowup')) want.z -= 1
      if (keys.has('s') || keys.has('arrowdown')) want.z += 1
      if (keys.has('a') || keys.has('arrowleft')) want.x -= 1
      if (keys.has('d') || keys.has('arrowright')) want.x += 1
      if (want.lengthSq() === 0 && target) {
        want.subVectors(target, pos).setY(0)
        const d = want.length()
        if (d < 0.2) {
          want.set(0, 0, 0)
          if (!holding) target = null
        } else want.multiplyScalar(Math.min(1, d / 0.7) / d)
      }
      if (want.lengthSq() > 1) want.normalize()
    }
    if (sitting && want.lengthSq() > 0.01) {
      // Get up.
      sitting = false
      pos.set(4.4, 0, 0.6)
    }
    if (!sitting) {
      vel.lerp(want.multiplyScalar(SPEED), 1 - Math.exp(-dt * 10))
      pos.addScaledVector(vel, dt)
      // Walls, the desk, the chair, the box.
      const inDoor = pos.z > DOOR.z0 + 0.3 && pos.z < DOOR.z1 - 0.3
      pos.x = Math.max(inDoor ? x0 - 1.2 : x0 + 0.4, Math.min(x1 - 0.4, pos.x))
      pos.z = Math.max(z0 + 0.4, Math.min(z1 - 0.3, pos.z))
      if (pos.x < -5.1 && pos.z > -2.5 && pos.z < 0.5) pos.x = -5.1
      for (const [cx, cz, r] of [
        [5.6, 0.6, 0.95],
        [pkg.position.x, pkg.position.z, 0.65],
      ]) {
        const dx = pos.x - cx
        const dz = pos.z - cz
        const d = Math.hypot(dx, dz)
        if (d < r + 0.3 && d > 0) pos.set(cx + (dx / d) * (r + 0.3), 0, cz + (dz / d) * (r + 0.3))
      }
      pos.y = 0
      // Sit in the chair when you walk into it (or clicked it and got there).
      const atChair = Math.hypot(pos.x - 4.35, pos.z - 0.6) < 0.4
      if (atChair && (sitNext || vel.x > 1.2)) {
        sitting = true
        sitNext = false
        vel.set(0, 0, 0)
        target = null
      }
    }
    const speed = sitting ? 0 : Math.hypot(vel.x, vel.z)
    if (sitting) {
      pos.lerp(seatAt, 1 - Math.exp(-dt * 10))
      let diff = -Math.PI / 2 - me.group.rotation.y
      diff = Math.atan2(Math.sin(diff), Math.cos(diff))
      me.group.rotation.y += diff * Math.min(1, dt * 10)
      me.body.position.y = -0.25
      seat.scale.y = 0.85
      seat.position.y = 0.42
    } else {
      seat.scale.y += (1 - seat.scale.y) * 0.1
      seat.position.y = 0.45
      if (speed > 0.3) {
        let diff = Math.atan2(vel.x, vel.z) - me.group.rotation.y
        diff = Math.atan2(Math.sin(diff), Math.cos(diff))
        me.group.rotation.y += diff * Math.min(1, dt * 12)
      }
      step += speed * dt * 2.4
      me.body.position.y = Math.abs(Math.sin(step)) * 0.12 * Math.min(1, speed / 2)
    }
    me.body.rotation.x = Math.min(0.25, speed * 0.04)
    me.tail.rotation.x = -0.3 - Math.min(0.9, speed * 0.15)
    me.scarf.color.set('#f2b134')

    // ---- stations ----
    const next = stations[reached + 1]
    if (next && next.ready() && pos.distanceTo(next.at) < next.reach) reached++
    let here = reached
    stations.forEach((s, k) => {
      if (k <= reached && pos.distanceTo(s.at) < s.reach) here = k
    })
    if (stations[reached]?.focus === 'window' && stations[here]?.focus === 'arrival') here = reached
    if (here !== stop) {
      stop = here
      opts.onStop(stop)
    }
    const focus = stations[stop]?.focus

    // ---- the sun, the light boxes, dusk ----
    const azimuth = Math.sin(t * 0.04) * 0.5
    sunDir.set(Math.sin(azimuth) * 0.9, -0.55, 1).normalize()
    sun.position.copy(sunTarget.position).addScaledVector(sunDir, -30)
    const windowIdx = stations.findIndex((st) => st.focus === 'window')
    const duskWant = windowIdx >= 0 && reached >= windowIdx ? 1 : 0
    duskK += (duskWant - duskK) * Math.min(1, dt * 0.4)
    sky.copy(day).lerp(dusk, duskK)
    sun.intensity = 8 * (1 - duskK * 0.85) * (focus === 'sunlight' ? 1.15 : 1)
    sun.color.set('#ffc870').lerp(new THREE.Color('#ff9a6a'), duskK)
    hemi.intensity = 0.85 - duskK * 0.35
    starMat.opacity = duskK
    lamps.forEach((l) => l.color.set('#6b6875').lerp(new THREE.Color('#ffe6a0'), duskK))

    // Where the window's light lands on the carpet.
    const winC = tmp.set(wx, wy, z0)
    const s = -winC.y / sunDir.y
    const patch = new THREE.Vector3(winC.x + sunDir.x * s, 0, winC.z + sunDir.z * s)

    // ---- cats ----
    cats.forEach((c) => {
      let goal: THREE.Vector3
      if (c.inBox) goal = pkg.position.clone().add(new THREE.Vector3((c.k - 0.5) * 0.25, 0, 0))
      else goal = patch.clone().add(new THREE.Vector3([-0.9, 0.5, 0.1][c.k], 0, [0.2, -0.5, 0.7][c.k]))
      const d = c.group.position.distanceTo(goal.clone().setY(c.group.position.y))
      if (d > 0.15) {
        const dir = goal.clone().sub(c.group.position).setY(0).normalize()
        c.group.position.addScaledVector(dir, Math.min(d, dt * (c.inBox ? 1.6 : 0.5)))
        c.group.rotation.y = Math.atan2(-dir.z, dir.x)
      }
      c.group.position.y = c.inBox ? 0.42 : 0
      c.tail.rotation.y = Math.sin(t * 1.3 + c.k * 2) * 0.5
      // Look up at you when you come close.
      c.head.position.y = pos.distanceTo(c.group.position) < 1.3 ? 0.36 : 0.28
    })

    // ---- photos ----
    photos.forEach((p) => {
      if (!p.down) return
      const k = Math.min(1, (t - p.at) / 0.7)
      p.g.position.set(p.from.x, p.from.y + (2.22 - p.from.y) * ease(k), p.from.z + 0.22 * ease(k))
      p.g.rotation.x = -Math.PI / 2 * ease(k)
      p.g.rotation.z *= 0.9
    })

    // ---- paper soldiers ----
    let standing = 0
    soldiers.forEach((sd) => {
      if (sd.gone < 0) {
        standing++
        const march = Math.sin(t * 0.6) * 0.5
        sd.g.position.set(-6.45 + sd.row * 0.28, 1.04 + Math.abs(Math.sin(t * 6 + sd.col + sd.row)) * 0.03, -1.9 + sd.col * 0.5 + march)
        return
      }
      // Crumpled and tossed in an arc into the bin.
      const k = Math.min(1, (t - sd.gone) / 0.7)
      sd.g.position.lerpVectors(sd.from, bin.position.clone().setY(0.35), k)
      sd.g.position.y += Math.sin(k * Math.PI) * 0.8
      if (k >= 1) sd.g.visible = false
    })
    if (standing === 0) flag.scale.setScalar(Math.min(1, flag.scale.x + dt * 2))
    cloth.rotation.y = Math.sin(t * 4) * 0.3

    // ---- the delivery ----
    const arrivalIdx = stations.findIndex((st) => st.focus === 'arrival')
    if (arrivalIdx >= 0 && reached >= arrivalIdx && delivery.started < 0) {
      delivery.started = t
      courier.group.visible = true
    }
    passers.forEach((p) => {
      p.x += p.dir * p.speed * dt
      if (p.x > 18) p.x = -18
      if (p.x < -18) p.x = 18
      p.p.group.position.set(p.x, 0, SIDEWALK + (p.dir > 0 ? 0.4 : -0.4))
      p.p.group.rotation.y = p.dir > 0 ? Math.PI / 2 : -Math.PI / 2
      p.p.body.position.y = Math.abs(Math.sin(t * 6 + p.x)) * 0.06
    })
    if (delivery.started >= 0) {
      const cg = courier.group
      if (delivery.x > -3) {
        delivery.x -= dt * (delivery.rang ? 2.2 : 1.1)
        cg.position.set(delivery.x, 0, SIDEWALK + 0.2)
        cg.rotation.y = -Math.PI / 2
      } else {
        // Up the path to the porch.
        cg.position.z = Math.min(z0 - 1, cg.position.z + dt * 1.6)
        cg.rotation.y = 0
        if (!delivery.rang && cg.position.z >= z0 - 1) {
          delivery.rang = true
          delivery.doneAt = t
          ding()
          window.setTimeout(ding, 260)
        }
        if (cg.position.z >= z0 - 1) cg.visible = false
      }
      courier.body.position.y = Math.abs(Math.sin(t * 6)) * 0.06
      if (delivery.wave > 0) {
        delivery.wave = Math.max(0, delivery.wave - dt * 0.4)
        courier.arms[1].rotation.set(0, 0, 2.6 + Math.sin(t * 12) * 0.3)
      }
    }

    // ---- the box ----
    const boxIdx = stations.findIndex((st) => st.focus === 'box')
    if (opened < 0 && boxIdx >= 0 && reached >= boxIdx && pos.distanceTo(pkg.position) < 1.25) open()
    if (opened >= 0) {
      const k = t - opened
      flaps.forEach((f, j) => {
        const o = ease(Math.min(1, k / 0.6))
        if (j === 0) f.rotation.x = -2.2 * o
        if (j === 2) f.rotation.x = 2.2 * o
        if (j === 1) f.rotation.z = 2.2 * o
        if (j === 3) f.rotation.z = -2.2 * o
      })
      // The uniform rises out and drifts away through the window: it needs to get out of the box.
      const rise = Math.min(1, k / 1.4)
      const fly = Math.max(0, Math.min(1, (k - 1.4) / 5))
      const from = new THREE.Vector3(-1, 0.4 + rise * 1.8, 3)
      const to = new THREE.Vector3(wx + 3, 9, z0 - 30)
      uniform.position.lerpVectors(from, to, fly * fly)
      uniform.rotation.y = k * 0.8
      uniform.rotation.z = Math.sin(k * 2) * 0.2
      uniform.scale.setScalar(1 - fly * 0.6)
      if (k > 2.5) cats.slice(0, 2).forEach((c) => (c.inBox = true))
      if (k > 3.5) pkg.rotation.z = Math.sin(t * 9) * 0.05 * Math.min(1, k - 3.5)
      doorGlowMat.opacity = Math.min(0.85, Math.max(0, (k - 3) / 2)) * (0.75 + Math.sin(t * 3) * 0.25)
    }

    // ---- leaving ----
    if (!gone && pos.x < x0 - 0.6) {
      gone = true
      rushAt = t
      opts.onExit()
    }

    // ---- the guide ----
    let goal: THREE.Vector3
    if (opened >= 0) goal = at(x0 + 0.6, (DOOR.z0 + DOOR.z1) / 2)
    else if (focus === 'arrival' && !delivery.rang && delivery.started >= 0) goal = courier.group.position.clone().setZ(z0 + 0.6).setX(Math.max(WIN.x0 + 0.4, Math.min(WIN.x1 - 0.4, courier.group.position.x)))
    else goal = stations[reached + 1]?.at ?? pkg.position
    const toGoal = goal.clone().sub(pos).setY(0)
    const d = toGoal.length()
    const flyTo = d < 2 ? goal.clone() : pos.clone().addScaledVector(toGoal.normalize(), Math.min(2.5, d * 0.6))
    flyTo.y = 2 + Math.sin(t * 3) * 0.15
    guide.group.position.lerp(flyTo, 1 - Math.exp(-dt * 3))
    guide.update(t, camera)

    // ---- camera ----
    const nearWindow = stations[stop]?.window && pos.distanceTo(stations[stop].at) < 2.2 ? 1 : 0
    windowCam += (nearWindow - windowCam) * Math.min(1, dt * 2)
    // A dollhouse view from the open front of the room, following you a little.
    camPos.set(pos.x * 0.35, 10.5 * backOff, 12.5 * backOff + pos.z * 0.3)
    look.set(pos.x * 0.6, 0.6, pos.z * 0.7 - 1)
    // At the window, it comes down behind you to look out.
    camPos.lerp(tmp.set(wx, 2.7, z0 + 3.4), ease(windowCam))
    look.lerp(new THREE.Vector3(wx, 1.4, SIDEWALK - 2), ease(windowCam))
    const rise = ease(Math.min(1, (t - bornAt) / 2))
    camPos.lerp(tmp.set(pos.x + 1.5, 1.6, pos.z + 2.5), 1 - rise)
    if (rushAt >= 0) {
      const r = Math.min(1, (t - rushAt) / 0.9) ** 3
      camPos.lerp(tmp.set(x0 - 2, 1.4, (DOOR.z0 + DOOR.z1) / 2), r)
      look.lerp(tmp.set(x0 - 10, 1.2, (DOOR.z0 + DOOR.z1) / 2), r)
    }
    camera.position.lerp(camPos, rise < 1 || rushAt >= 0 ? 1 : 1 - Math.exp(-dt * 4))
    camera.lookAt(look)
    inset.x += (inset.right / 2 - inset.x) * Math.min(1, dt * 5)
    inset.y += (inset.bottom / 2 - inset.y) * Math.min(1, dt * 5)
    const { clientWidth: w, clientHeight: hh } = container
    camera.setViewOffset(w, hh, inset.x, inset.y, w, hh)

    renderer.render(scene, camera)
  }
  raf = requestAnimationFrame(frame)

  return {
    rush: () => {
      gone = true
      if (rushAt < 0) rushAt = performance.now() / 1000
    },
    setReading: () => {},
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
        if (o instanceof THREE.Mesh || o instanceof THREE.Points) {
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
    },
  }
}
