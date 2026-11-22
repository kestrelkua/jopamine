// The hub world: a small island split into a dopamine half and an oxytocin half, with a building for
// each post. Plain three.js; React only mounts it (see World.tsx).
import * as THREE from 'three'
import type { Post, SceneId } from '../content/types'
import { tick } from '../sound'
import { GOLD, PINK, lambert, mesh, seeded, smooth, walker } from './parts'
import { angled, makeShade } from './shade'

export interface WorldOptions {
  posts: Post[]
  /** Slug of the post the reader just came back from; they start outside its door. */
  from?: string | null
  onEnter: (post: Post, door: DOMRect) => void
  /** Buildings that aren't posts: the studio, the library. */
  places: Place[]
  onPlace: (place: Place) => void
  onFirstMove: () => void
  /** Just walked out of a building: the camera starts close on its door and pulls back. */
  arrived?: boolean
}

export interface World {
  dispose: () => void
}

const ISLAND = 26
const SPEED = 5.5

/** 0 on the dopamine (west) side, 1 on the oxytocin (east) side. */
const sideOf = (x: number) => smooth(-5, 5, x)

// ---------- buildings ----------

export interface Place {
  key: 'studio' | 'library'
  title: string
  to: string
}

interface Building {
  /** A post's slug, or a place's key. */
  key: string
  post?: Post
  place?: Place
  group: THREE.Group
  /** Where you stand to go in, in world space. */
  door: THREE.Vector3
  /** The doorway's four corners in the building's own space, for the opening animation. */
  doorway: THREE.Vector3[]
  radius: number
  label: HTMLDivElement
  labelAt: THREE.Vector3
  update: (t: number) => void
}

interface Made {
  group: THREE.Group
  frontZ: number
  doorW: number
  doorH: number
  doorY: number
  radius: number
  height: number
  update: (t: number) => void
}

function blueRoom(): Made {
  const g = new THREE.Group()
  const walls = mesh(new THREE.BoxGeometry(4, 3, 4), lambert('#6f8fd0'))
  walls.position.y = 1.5
  const roof = mesh(new THREE.ConeGeometry(3.4, 1.9, 4), lambert('#3d4f86', { flatShading: true }))
  roof.position.y = 3.95
  roof.rotation.y = Math.PI / 4
  const chimney = mesh(new THREE.BoxGeometry(0.5, 1.2, 0.5), lambert('#4a5a92'))
  chimney.position.set(1, 4.2, -0.6)
  const door = mesh(new THREE.BoxGeometry(1.1, 1.9, 0.1), lambert('#2b2440'))
  door.position.set(0, 0.95, 2.02)
  const knob = mesh(new THREE.SphereGeometry(0.06), lambert('#f2b134', { emissive: '#f2b134', emissiveIntensity: 0.6 }), false)
  knob.position.set(0.38, 0.95, 2.09)
  const glow = new THREE.MeshLambertMaterial({ color: '#ffe3a0', emissive: '#ffcf6a', emissiveIntensity: 0.9 })
  const win = mesh(new THREE.BoxGeometry(0.8, 0.8, 0.06), glow, false)
  win.position.set(-1.25, 1.9, 2.02)
  const win2 = win.clone()
  win2.position.set(1.25, 1.9, 2.02)
  const side = mesh(new THREE.BoxGeometry(0.06, 0.9, 1.2), glow, false)
  side.position.set(2.02, 1.8, 0)

  // A cat on the roof, watching whoever walks by.
  const cat = new THREE.Group()
  const fur = lambert('#2f2a33')
  const body = mesh(new THREE.BoxGeometry(0.5, 0.32, 0.3), fur)
  const head = mesh(new THREE.BoxGeometry(0.28, 0.26, 0.26), fur)
  head.position.set(0.3, 0.22, 0)
  for (const z of [-0.08, 0.08]) {
    const ear = mesh(new THREE.ConeGeometry(0.06, 0.13, 4), fur)
    ear.position.set(0.3, 0.42, z)
    cat.add(ear)
  }
  const tail = mesh(new THREE.BoxGeometry(0.06, 0.4, 0.06), fur)
  tail.position.set(-0.28, 0.25, 0)
  tail.rotation.z = 0.4
  cat.add(body, head, tail)
  cat.position.set(-0.9, 3.25, 1.4)
  cat.rotation.z = -0.5
  cat.rotation.y = -Math.PI / 2

  g.add(walls, roof, chimney, door, knob, win, win2, side, cat)
  return {
    group: g,
    frontZ: 2.05,
    doorW: 1.1,
    doorH: 1.9,
    doorY: 0,
    radius: 3,
    height: 5.2,
    update: (t) => {
      tail.rotation.z = 0.4 + Math.sin(t * 2.2) * 0.35
      glow.emissiveIntensity = 0.8 + Math.sin(t * 0.7) * 0.15
    },
  }
}

function cave(): Made {
  const g = new THREE.Group()
  const rand = seeded(7)
  const geo = new THREE.IcosahedronGeometry(3.2, 1)
  const pos = geo.attributes.position
  // Corners are shared by several faces; each corner moves once so the rock stays whole.
  const moved = new Map<string, number>()
  for (let i = 0; i < pos.count; i++) {
    const at = [pos.getX(i), pos.getY(i), pos.getZ(i)].map((v) => v.toFixed(3)).join()
    const k = moved.get(at) ?? 0.85 + rand() * 0.3
    moved.set(at, k)
    pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k, pos.getZ(i) * k)
  }
  geo.computeVertexNormals()
  const rock = mesh(geo, lambert('#8c7a6b', { flatShading: true }))
  rock.scale.set(1.3, 0.85, 1.1)
  rock.position.y = 0.7
  // An arch-shaped opening, leaning back with the rock.
  const mouth = new THREE.Mesh(new THREE.CircleGeometry(1, 24, 0, Math.PI), new THREE.MeshBasicMaterial({ color: '#160f0d' }))
  mouth.scale.set(1.25, 1.9, 1)
  mouth.position.set(0, 0.02, 4.05)
  mouth.rotation.x = -0.5
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 6), new THREE.MeshBasicMaterial({ color: '#ffb347' }))
  flame.position.set(0, 0.32, 4.1)
  const fire = new THREE.PointLight('#ff9a3c', 6, 8, 1.6)
  fire.position.set(0, 0.8, 4.6)
  // Stones around the entrance.
  for (let i = 0; i < 5; i++) {
    const s = mesh(new THREE.DodecahedronGeometry(0.25 + rand() * 0.25), lambert('#7a6a5c', { flatShading: true }))
    const a = -0.9 + (i / 4) * 1.8
    s.position.set(Math.sin(a) * 2.2, 0.15, 3.7 + Math.cos(a) * 0.6)
    g.add(s)
  }
  g.add(rock, mouth, flame, fire)
  return {
    group: g,
    frontZ: 4.05,
    doorW: 2.5,
    doorH: 1.9,
    doorY: 0,
    radius: 3.9,
    height: 5.2,
    update: (t) => {
      const f = 0.75 + Math.sin(t * 11) * 0.1 + Math.sin(t * 7.3) * 0.12
      fire.intensity = 6 * f
      flame.scale.set(1, f * 1.2, 1)
    },
  }
}

/** Where you write: a cottage with a big window, a desk lamp, and a pencil for a chimney. */
function studio(): Made {
  const g = new THREE.Group()
  const walls = mesh(new THREE.BoxGeometry(3.6, 2.6, 3.4), lambert('#f3e6cf'))
  walls.position.y = 1.3
  const roof = mesh(new THREE.BoxGeometry(4.1, 0.25, 4), lambert('#c96f4a'))
  roof.position.set(0, 2.9, 0)
  roof.rotation.x = -0.18
  const door = mesh(new THREE.BoxGeometry(0.9, 1.8, 0.1), lambert('#7a4a32'))
  door.position.set(0.9, 0.9, 1.72)
  const knob = mesh(new THREE.SphereGeometry(0.05), lambert('#f2b134'), false)
  knob.position.set(1.2, 0.9, 1.79)
  const glow = new THREE.MeshLambertMaterial({ color: '#ffe9b8', emissive: '#ffd27a', emissiveIntensity: 0.85 })
  const win = mesh(new THREE.BoxGeometry(1.5, 1.1, 0.06), glow, false)
  win.position.set(-0.75, 1.5, 1.72)
  const frame = mesh(new THREE.BoxGeometry(0.06, 1.1, 0.08), lambert('#7a4a32'), false)
  frame.position.set(-0.75, 1.5, 1.75)
  // A desk and a lamp, seen through the window.
  const desk = mesh(new THREE.BoxGeometry(1.2, 0.08, 0.4), lambert('#7a4a32'), false)
  desk.position.set(-0.75, 1.05, 1.66)
  const lamp = mesh(new THREE.ConeGeometry(0.12, 0.16, 10), lambert('#2b2440'), false)
  lamp.position.set(-0.35, 1.35, 1.64)
  // The chimney is a pencil.
  const pencil = new THREE.Group()
  const wood = mesh(new THREE.CylinderGeometry(0.26, 0.26, 1.7, 6), lambert('#f2b134', { flatShading: true }))
  wood.position.y = 0.85
  const eraser = mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.3, 6), lambert('#ef6f9a', { flatShading: true }))
  eraser.position.y = -0.1
  const band = mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.1, 6), lambert('#c0c0c8'), false)
  band.position.y = 0.06
  const tip = mesh(new THREE.ConeGeometry(0.26, 0.45, 6), lambert('#ecc9a0', { flatShading: true }))
  tip.position.y = 1.92
  const lead = mesh(new THREE.ConeGeometry(0.08, 0.14, 6), lambert('#2b2440'), false)
  lead.position.y = 2.1
  pencil.add(wood, eraser, band, tip, lead)
  pencil.position.set(1.1, 2.7, -0.7)
  g.add(walls, roof, door, knob, win, frame, desk, lamp, pencil)
  const smoke = puffs(g, new THREE.Vector3(1.1, 4.95, -0.7))
  return { group: g, frontZ: 1.72, doorW: 0.9, doorH: 1.8, doorY: 0, radius: 2.7, height: 5, update: smoke }
}

/** Where every post is shelved: columns, a pediment, and a staircase of books. */
function library(): Made {
  const g = new THREE.Group()
  const stone = lambert('#ece3d3')
  const hall = mesh(new THREE.BoxGeometry(4.2, 2.8, 3), stone)
  hall.position.set(0, 1.4, -0.3)
  const roof = mesh(new THREE.CylinderGeometry(1, 1, 4.6, 3), lambert('#d8cbb4', { flatShading: true }))
  roof.rotation.z = Math.PI / 2
  roof.scale.set(1, 1, 1.9)
  roof.position.set(0, 3.25, 0.05)
  const ledge = mesh(new THREE.BoxGeometry(4.6, 0.2, 3.9), stone)
  ledge.position.set(0, 2.85, 0.05)
  g.add(hall, roof, ledge)
  for (const x of [-1.6, -0.55, 0.55, 1.6]) {
    const col = mesh(new THREE.CylinderGeometry(0.17, 0.2, 2.6, 10), stone)
    col.position.set(x, 1.45, 1.55)
    g.add(col)
  }
  const door = mesh(new THREE.BoxGeometry(1, 1.9, 0.1), lambert('#3b2c4a'))
  door.position.set(0, 1.1, 1.22)
  g.add(door)
  // The front steps are three giant books.
  const spines = ['#6f8fd0', '#ef6f9a', '#f2b134']
  spines.forEach((c, k) => {
    const book = mesh(new THREE.BoxGeometry(4 - k * 0.5, 0.18, 0.9 - k * 0.15), lambert(c))
    book.position.set((k - 1) * 0.08, 0.09 + k * 0.18, 2.15 - k * 0.3)
    const pages = mesh(new THREE.BoxGeometry(4 - k * 0.5 - 0.1, 0.12, 0.05), lambert('#fbf7f1'), false)
    pages.position.set(book.position.x, book.position.y, book.position.z + (0.9 - k * 0.15) / 2)
    g.add(book, pages)
  })
  const win = mesh(new THREE.CircleGeometry(0.32, 20), new THREE.MeshLambertMaterial({ color: '#ffe9b8', emissive: '#ffd27a', emissiveIntensity: 0.8 }), false)
  win.position.set(0, 3.25, 1.47)
  g.add(win)
  return { group: g, frontZ: 1.22, doorW: 1, doorH: 1.9, doorY: 0.2, radius: 2.9, height: 4.6, update: () => {} }
}

/** Soft smoke puffs drifting up from a point. */
function puffs(parent: THREE.Group, from: THREE.Vector3) {
  const mat = new THREE.MeshLambertMaterial({ color: '#ffffff', transparent: true, opacity: 0.6, depthWrite: false })
  const list = Array.from({ length: 6 }, (_, k) => {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), mat.clone())
    parent.add(m)
    return { m, off: k / 6 }
  })
  return (t: number) => {
    for (const p of list) {
      const k = (t * 0.22 + p.off) % 1
      p.m.position.set(from.x + Math.sin(k * 5 + p.off * 9) * 0.25 + k * 0.6, from.y + k * 2.4, from.z)
      p.m.scale.setScalar(0.5 + k * 1.4)
      ;(p.m.material as THREE.MeshLambertMaterial).opacity = 0.55 * (1 - k) * Math.min(1, k * 6)
    }
  }
}

/** Caribbean Blue: a drop of ocean floating over a little dock. Its colour changes with the angle you see it from. */
function ocean(): Made {
  const g = new THREE.Group()
  const shade = makeShade(0.53, 1, 0.16)
  const drop = mesh(new THREE.SphereGeometry(2.3, 40, 30), angled(shade, { light: 0.62, chroma: 0.8, opacity: 0.86, emissive: 0.15 }), false)
  drop.scale.set(1, 1.15, 1)
  drop.position.y = 4.2
  // Fish swimming inside.
  const fish = [0, 1, 2, 3].map((k) => {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 6), new THREE.MeshLambertMaterial({ color: ['#ffd06a', '#ff8a6a', '#ffe9a0', '#f2b134'][k] }))
    f.rotation.z = Math.PI / 2
    const pivot = new THREE.Group()
    pivot.position.y = 4.2 + (k - 1.5) * 0.5
    f.position.x = 1 + (k % 2) * 0.5
    pivot.add(f)
    g.add(pivot)
    return pivot
  })
  // The dock under it, and a ring of light on the ground.
  const wood = lambert('#b88a5a')
  const deck = mesh(new THREE.BoxGeometry(2.4, 0.18, 3.4), wood)
  deck.position.set(0, 0.35, 0.8)
  g.add(deck)
  for (const [x, z] of [
    [-1, -0.7],
    [1, -0.7],
    [-1, 2.3],
    [1, 2.3],
  ]) {
    const post = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.7, 8), lambert('#8a6248'))
    post.position.set(x, 0.3, z)
    g.add(post)
  }
  const pool = mesh(new THREE.CircleGeometry(3.4, 40), angled(shade, { light: 0.55, chroma: 0.7 }), false)
  pool.rotation.x = -Math.PI / 2
  pool.position.y = 0.02
  g.add(pool)
  // A thin stream of water falling from the drop back into the pool.
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 2, 8, 1, true), angled(shade, { light: 0.8, chroma: 0.5, opacity: 0.6, emissive: 0.2 }))
  stream.position.set(0.9, 1.5, -0.6)
  g.add(drop, stream)
  return {
    group: g,
    frontZ: 2.5,
    doorW: 2.4,
    doorH: 2.6,
    doorY: 2.2,
    radius: 3,
    height: 7.6,
    update: (t) => {
      drop.position.y = 4.2 + Math.sin(t * 0.9) * 0.25
      drop.scale.set(1 + Math.sin(t * 1.7) * 0.02, 1.15 + Math.sin(t * 1.3) * 0.03, 1 + Math.cos(t * 1.5) * 0.02)
      fish.forEach((f, k) => (f.rotation.y = t * (0.6 + k * 0.15) * (k % 2 ? -1 : 1)))
      shade.uBase.value = 0.53 + Math.sin(t * 0.15) * 0.03
    },
  }
}

const builders: Record<SceneId, () => Made> = { 'blue-room': blueRoom, cave, ocean }

/** Spots for buildings on the dopamine side, nearest the middle first; the oxytocin side mirrors them.
 *  They sit on the far half of the island so their doors face the camera. */
const slots: [number, number][] = [
  [-10, -6],
  [-9.5, 5],
  [-15, -11],
  [-21, -5],
  [-11, -19],
]

/** The studio and the library stand side by side at the back, between the two halves. */
const placeSpots: Record<Place['key'], [number, number]> = { studio: [-3.8, -15.5], library: [3.8, -15.5] }

function placeBuildings(posts: Post[], places: Place[], scene: THREE.Scene, overlay: HTMLElement): Building[] {
  const used = { dopamine: 0, oxytocin: 0 }
  const plans = [
    ...posts.flatMap((post) => {
      const i = used[post.chemical]++
      if (i >= slots.length) return []
      const [sx, z] = slots[i]
      return [{ key: post.slug, title: post.title, chem: post.chemical as string, x: post.chemical === 'dopamine' ? sx : -sx, z, made: builders[post.scene](), post, place: undefined as Place | undefined }]
    }),
    ...places.map((place) => {
      const [x, z] = placeSpots[place.key]
      return { key: place.key, title: place.title, chem: 'place', x, z, made: (place.key === 'studio' ? studio : library)(), post: undefined as Post | undefined, place }
    }),
  ]
  return plans.map(({ key, title, chem, x, z, made, post, place }) => {
    const group = made.group
    group.position.set(x, 0, z)
    group.rotation.y = Math.atan2(-x, -z) // front faces the middle of the island
    group.userData.slug = key
    scene.add(group)
    group.updateMatrixWorld(true)

    const door = new THREE.Vector3(0, 0, made.radius + 0.55).applyMatrix4(group.matrixWorld)
    const { doorW: w, doorH: h, doorY: y, frontZ: f } = made
    const doorway = [new THREE.Vector3(-w / 2, y, f), new THREE.Vector3(w / 2, y, f), new THREE.Vector3(-w / 2, y + h, f), new THREE.Vector3(w / 2, y + h, f)]

    const label = document.createElement('div')
    label.className = `world-label chem-${chem}`
    label.textContent = title
    overlay.appendChild(label)

    return { key, post, place, group, door, doorway, radius: made.radius, label, labelAt: new THREE.Vector3(x, made.height + 0.6, z), update: made.update }
  })
}

// ---------- scenery ----------

function island(scene: THREE.Scene) {
  const geo = new THREE.CircleGeometry(ISLAND, 128, 0, Math.PI * 2)
  geo.rotateX(-Math.PI / 2)
  const pos = geo.attributes.position
  const colors = new Float32Array(pos.count * 3)
  const west = new THREE.Color('#ecd9a4')
  const east = new THREE.Color('#f1c9d3')
  const c = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    c.copy(west).lerp(east, sideOf(pos.getX(i)))
    colors.set([c.r, c.g, c.b], i * 3)
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const ground = mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }), false)
  const edge = mesh(new THREE.CylinderGeometry(ISLAND, ISLAND - 2, 3, 128, 1, true), lambert('#b98c6b'), false)
  edge.position.y = -1.5
  const plaza = mesh(new THREE.CircleGeometry(3.2, 48), lambert('#f7efe3'), false)
  plaza.rotation.x = -Math.PI / 2
  plaza.position.y = 0.01
  scene.add(ground, edge, plaza)
}

function paths(scene: THREE.Scene, buildings: Building[]) {
  const mat = lambert('#f7efe3')
  for (const b of buildings) {
    const to = b.door
    const len = Math.hypot(to.x, to.z)
    const strip = mesh(new THREE.PlaneGeometry(1.6, len), mat, false)
    strip.rotation.x = -Math.PI / 2
    strip.rotation.z = Math.atan2(to.x, to.z) // spins it flat on the ground to point at the door
    strip.position.set(to.x / 2, 0.008, to.z / 2)
    scene.add(strip)
  }
}

interface Tree {
  group: THREE.Group
  x: number
  z: number
  lean: THREE.Vector2
}

function trees(scene: THREE.Scene, buildings: Building[]): Tree[] {
  const rand = seeded(42)
  const out: Tree[] = []
  const trunk = lambert('#8a6248')
  for (let tries = 0; tries < 400 && out.length < 46; tries++) {
    const a = rand() * Math.PI * 2
    const r = 5 + Math.sqrt(rand()) * (ISLAND - 7)
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    if (Math.abs(x) < 1.5) continue // keep the seam between the sides open
    if (buildings.some((b) => Math.hypot(b.group.position.x - x, b.group.position.z - z) < b.radius + 2.2)) continue
    if (buildings.some((b) => distToSegment(x, z, b.door.x, b.door.z) < 1.8)) continue
    if (out.some((t) => Math.hypot(t.x - x, t.z - z) < 2.2)) continue
    const s = sideOf(x)
    const g = new THREE.Group()
    const size = 0.8 + rand() * 0.6
    const t = mesh(new THREE.CylinderGeometry(0.12 * size, 0.18 * size, 1.2 * size, 6), trunk)
    t.position.y = 0.6 * size
    g.add(t)
    const leaf = new THREE.Color(s < 0.5 ? '#e7b84a' : '#f19ab6').offsetHSL((rand() - 0.5) * 0.04, 0, (rand() - 0.5) * 0.1)
    if (s < 0.5) {
      // Dopamine side: round, sunny trees.
      const crown = mesh(new THREE.IcosahedronGeometry(0.9 * size, 0), lambert(leaf, { flatShading: true }))
      crown.position.y = 1.7 * size
      g.add(crown)
    } else {
      // Oxytocin side: blossoms in clusters.
      for (let k = 0; k < 3; k++) {
        const crown = mesh(new THREE.IcosahedronGeometry(0.55 * size, 0), lambert(leaf, { flatShading: true }))
        crown.position.set(Math.cos(k * 2.1) * 0.4 * size, 1.6 * size + k * 0.2 * size, Math.sin(k * 2.1) * 0.4 * size)
        g.add(crown)
      }
    }
    g.position.set(x, 0, z)
    g.rotation.y = rand() * Math.PI
    scene.add(g)
    out.push({ group: g, x, z, lean: new THREE.Vector2() })
  }
  return out
}

/** Distance from (x, z) to the path running from the middle of the island to (bx, bz). */
function distToSegment(x: number, z: number, bx: number, bz: number) {
  const len2 = bx * bx + bz * bz
  const t = Math.max(0, Math.min(1, (x * bx + z * bz) / len2))
  return Math.hypot(x - bx * t, z - bz * t)
}

interface Pebble {
  mesh: THREE.Mesh
  v: THREE.Vector2
  r: number
}

function pebbles(scene: THREE.Scene): Pebble[] {
  const rand = seeded(9)
  const out: Pebble[] = []
  for (let i = 0; i < 9; i++) {
    const r = 0.22 + rand() * 0.16
    const x = (rand() - 0.5) * 8
    const color = new THREE.Color().copy(GOLD).lerp(PINK, sideOf(x)).offsetHSL(0, -0.1, 0.05)
    const m = mesh(new THREE.IcosahedronGeometry(r, 1), lambert(color, { flatShading: true }))
    m.position.set(x, r, (rand() - 0.5) * 8)
    if (Math.hypot(m.position.x, m.position.z) < 1.5) m.position.x += 2
    scene.add(m)
    out.push({ mesh: m, v: new THREE.Vector2(), r })
  }
  return out
}

// ---------- the walker ----------

// ---------- the world ----------

export function createWorld(container: HTMLElement, opts: WorldOptions): World {
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.outputColorSpace = THREE.SRGBColorSpace
  container.appendChild(renderer.domElement)
  const canvas = renderer.domElement

  const overlay = document.createElement('div')
  overlay.className = 'world-overlay'
  container.appendChild(overlay)

  const scene = new THREE.Scene()
  const sky = new THREE.Color('#f6eee4')
  scene.background = sky
  const fog = new THREE.Fog(sky, 30, 62)
  scene.fog = fog

  scene.add(new THREE.HemisphereLight('#fff6ea', '#c9a98f', 1.7))
  const sun = new THREE.DirectionalLight('#fff1dc', 2.2)
  sun.position.set(10, 18, 8)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 60 })
  sun.shadow.bias = -0.0005
  scene.add(sun)

  island(scene)
  const buildings = placeBuildings(opts.posts, opts.places, scene, overlay)
  paths(scene, buildings)
  const grove = trees(scene, buildings)
  const stones = pebbles(scene)
  const me = walker()
  scene.add(me.group)

  let stepOut: THREE.Vector3 | null = null
  let intro: { at: number; from: THREE.Vector3; look: THREE.Vector3 } | null = null
  /** Going in: the camera swoops down to the doorway. */
  let swoop: { at: number; from: THREE.Vector3; look: THREE.Vector3; to: THREE.Vector3; into: THREE.Vector3 } | null = null
  const ease = (k: number) => (k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2)
  // Start in the middle, or outside the door you just came out of.
  const back = buildings.find((b) => b.key === opts.from)
  if (back) {
    const out = new THREE.Vector3().subVectors(back.door, back.group.position).setY(0).normalize()
    // Step out of the doorway.
    me.group.position.copy(back.door).addScaledVector(out, 0.2)
    me.group.rotation.y = Math.atan2(out.x, out.z)
    stepOut = back.door.clone().addScaledVector(out, 1.8)
    if (opts.arrived) {
      intro = {
        at: performance.now() / 1000,
        from: back.door.clone().addScaledVector(out, 2.4).setY(1.5),
        look: back.door.clone().setY(1.1),
      }
    }
  } else {
    me.group.rotation.y = Math.PI * 0.85
  }

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200)
  const camOffset = new THREE.Vector3(0, 15, 16)
  camera.position.copy(me.group.position).add(camOffset)
  camera.lookAt(me.group.position)

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = container
    renderer.setSize(w, h)
    camera.aspect = w / h
    // Pull back on narrow screens so both sides still fit, and push the fog back to match.
    const back = Math.min(2.1, Math.max(1, (1.25 / camera.aspect) ** 0.8))
    camOffset.set(0, 15, 16).multiplyScalar(back)
    fog.near = 30 * back
    fog.far = 62 * back
    camera.updateProjectionMatrix()
  }
  resize()
  window.addEventListener('resize', resize)

  // ---------- input ----------
  const keys = new Set<string>()
  let target: THREE.Vector3 | null = stepOut
  let goingIn: Building | null = null
  let holding = false
  let moved = false
  let entered = false
  let hovered: Building | null = null

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
      goingIn = null
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
  const buildingHit = () => {
    const hit = ray.intersectObjects(
      buildings.map((b) => b.group),
      true,
    )[0]
    if (!hit) return null
    let o: THREE.Object3D | null = hit.object
    while (o && !o.userData.slug) o = o.parent
    return buildings.find((b) => b.group === o) ?? null
  }
  const floorHit = () => {
    const p = new THREE.Vector3()
    return ray.ray.intersectPlane(floor, p) ? p : null
  }

  const onDown = (e: PointerEvent) => {
    if (entered) return
    aim(e)
    firstMove()
    const b = buildingHit()
    if (b) {
      target = b.door.clone()
      goingIn = b
      return
    }
    const p = floorHit()
    if (!p) return
    target = p
    goingIn = null
    holding = true
    canvas.setPointerCapture(e.pointerId)
  }
  const onMove = (e: PointerEvent) => {
    aim(e)
    if (holding) {
      const p = floorHit()
      if (p) target = p
      return
    }
    if (e.pointerType !== 'mouse') return
    hovered = buildingHit()
    canvas.style.cursor = hovered ? 'pointer' : ''
  }
  const onUp = () => {
    holding = false
  }
  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerup', onUp)
  canvas.addEventListener('pointercancel', onUp)

  // ---------- each frame ----------
  const vel = new THREE.Vector3()
  const want = new THREE.Vector3()
  const look = new THREE.Vector3()
  const scratch = new THREE.Vector3()
  const scarfColor = new THREE.Color()
  let step = 0
  const lean = new THREE.Vector2()
  const focus = me.group.position.clone()
  let last = performance.now()
  let raf = 0

  const enter = (b: Building) => {
    entered = true
    keys.clear()
    target = null
    b.group.updateMatrixWorld(true)
    if (b.post) {
      const out = new THREE.Vector3().subVectors(b.door, b.group.position).setY(0).normalize()
      swoop = {
        at: performance.now() / 1000,
        from: camera.position.clone(),
        look: focus.clone().setY(0.8),
        to: b.door.clone().addScaledVector(out, 4.2).setY(2.8),
        into: b.door.clone().addScaledVector(out, -2.5).setY(0.9),
      }
    }
    const r = canvas.getBoundingClientRect()
    let x0 = Infinity
    let y0 = Infinity
    let x1 = -Infinity
    let y1 = -Infinity
    for (const c of b.doorway) {
      scratch.copy(c).applyMatrix4(b.group.matrixWorld).project(camera)
      const x = r.left + ((scratch.x + 1) / 2) * r.width
      const y = r.top + ((1 - scratch.y) / 2) * r.height
      x0 = Math.min(x0, x)
      y0 = Math.min(y0, y)
      x1 = Math.max(x1, x)
      y1 = Math.max(y1, y)
    }
    if (b.post) opts.onEnter(b.post, new DOMRect(x0, y0, x1 - x0, y1 - y0))
    else if (b.place) opts.onPlace(b.place)
  }

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame)
    // The first frame's clock can read a hair before `last`; a negative step would run everything backward.
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000))
    last = now
    const t = now / 1000
    const pos = me.group.position

    // Where do we want to go?
    want.set(0, 0, 0)
    if (!entered) {
      if (keys.has('w') || keys.has('arrowup')) want.z -= 1
      if (keys.has('s') || keys.has('arrowdown')) want.z += 1
      if (keys.has('a') || keys.has('arrowleft')) want.x -= 1
      if (keys.has('d') || keys.has('arrowright')) want.x += 1
      if (want.lengthSq() === 0 && target) {
        want.subVectors(target, pos).setY(0)
        const d = want.length()
        if (d < 0.25) {
          want.set(0, 0, 0)
          if (!holding) target = null
        } else want.multiplyScalar(Math.min(1, d / 0.8) / d) // slow down on arrival
      }
      if (want.lengthSq() > 1) want.normalize()
    }
    if (swoop) {
      // Keep walking, through the doorway and into the dark.
      want.subVectors(swoop.into, pos).setY(0)
      if (want.length() > 0.3) want.normalize().multiplyScalar(0.6)
      else want.set(0, 0, 0)
    }
    vel.lerp(want.multiplyScalar(SPEED), 1 - Math.exp(-dt * 10))
    pos.addScaledVector(vel, dt)

    // Stay on the island and out of the walls.
    const fromMid = Math.hypot(pos.x, pos.z)
    if (fromMid > ISLAND - 1.2) pos.multiplyScalar((ISLAND - 1.2) / fromMid)
    for (const b of buildings) {
      scratch.subVectors(pos, b.group.position).setY(0)
      const d = scratch.length()
      if (d < b.radius + 0.35 && !swoop) pos.copy(b.group.position).addScaledVector(scratch.normalize(), b.radius + 0.35).setY(0)
      if (!entered && pos.distanceTo(b.door) < 0.9) {
        // Walking up to a door, by keys or by click, takes you in.
        const facing = new THREE.Vector3().subVectors(b.group.position, pos).setY(0).normalize()
        if (goingIn === b || vel.dot(facing) > 1.5) enter(b)
      }
    }

    // Turn, bob and lean.
    const speed = Math.hypot(vel.x, vel.z)
    if (speed > 0.3) {
      const heading = Math.atan2(vel.x, vel.z)
      let diff = heading - me.group.rotation.y
      diff = Math.atan2(Math.sin(diff), Math.cos(diff))
      me.group.rotation.y += diff * Math.min(1, dt * 12)
    }
    step += speed * dt * 2.4
    me.body.position.y = Math.abs(Math.sin(step)) * 0.12 * Math.min(1, speed / 2)
    me.body.rotation.x = Math.min(0.25, speed * 0.04)
    me.tail.rotation.x = -0.3 - Math.min(0.9, speed * 0.15) + Math.sin(t * 9) * 0.06 * Math.min(1, speed)
    // The scarf turns gold or pink with the side you are on.
    me.scarf.color.copy(scarfColor.copy(GOLD).lerp(PINK, sideOf(pos.x)))

    // Trees lean away as you brush past.
    for (const tr of grove) {
      const dx = tr.x - pos.x
      const dz = tr.z - pos.z
      const d = Math.hypot(dx, dz)
      const push = d < 1.8 ? (1 - d / 1.8) * 0.35 : 0
      tr.lean.lerp(lean.set((dx / (d || 1)) * push, (dz / (d || 1)) * push), 1 - Math.exp(-dt * 6))
      tr.group.rotation.z = -tr.lean.x + Math.sin(t * 1.3 + tr.x) * 0.015
      tr.group.rotation.x = tr.lean.y
    }

    // Pebbles get kicked and roll.
    for (const p of stones) {
      const m = p.mesh.position
      const dx = m.x - pos.x
      const dz = m.z - pos.z
      const d = Math.hypot(dx, dz)
      const reach = p.r + 0.38
      if (d < reach && d > 0) {
        m.x = pos.x + (dx / d) * reach
        m.z = pos.z + (dz / d) * reach
        const kick = Math.max(speed * 1.4, 1.5)
        if (p.v.length() < 1) tick()
        p.v.set((dx / d) * kick, (dz / d) * kick)
      }
      m.x += p.v.x * dt
      m.z += p.v.y * dt
      p.mesh.rotation.z -= (p.v.x * dt) / p.r
      p.mesh.rotation.x += (p.v.y * dt) / p.r
      p.v.multiplyScalar(Math.exp(-dt * 1.8))
      const r = Math.hypot(m.x, m.z)
      if (r > ISLAND - 0.6) {
        const nx = m.x / r
        const nz = m.z / r
        const into = p.v.x * nx + p.v.y * nz
        if (into > 0) p.v.set(p.v.x - 2 * into * nx, p.v.y - 2 * into * nz)
        m.x = nx * (ISLAND - 0.6)
        m.z = nz * (ISLAND - 0.6)
      }
      for (const b of buildings) {
        const bx = m.x - b.group.position.x
        const bz = m.z - b.group.position.z
        const bd = Math.hypot(bx, bz)
        if (bd < b.radius + p.r) {
          const nx = bx / bd
          const nz = bz / bd
          const into = p.v.x * nx + p.v.y * nz
          if (into < 0) p.v.set(p.v.x - 2 * into * nx, p.v.y - 2 * into * nz).multiplyScalar(0.6)
          m.x = b.group.position.x + nx * (b.radius + p.r)
          m.z = b.group.position.z + nz * (b.radius + p.r)
        }
      }
    }

    for (const b of buildings) b.update(t)

    // Follow along.
    focus.lerp(pos, 1 - Math.exp(-dt * 3))
    camera.position.copy(focus).add(camOffset)
    look.copy(focus).setY(0.8)
    if (intro) {
      const k = ease(Math.min(1, (t - intro.at) / 2))
      camera.position.lerpVectors(intro.from, camera.position, k)
      look.lerpVectors(intro.look, look, k)
      if (k >= 1) intro = null
    }
    if (swoop) {
      const k = ease(Math.min(1, (t - swoop.at) / 0.8))
      camera.position.lerpVectors(swoop.from, swoop.to, k)
      look.lerpVectors(swoop.look, swoop.into, k)
    }
    camera.lookAt(look)

    // Names over the buildings when you are close or pointing at them.
    const r = canvas.getBoundingClientRect()
    for (const b of buildings) {
      const near = Math.hypot(b.group.position.x - pos.x, b.group.position.z - pos.z) < b.radius + 4.5
      b.label.classList.toggle('show', near || hovered === b)
      scratch.copy(b.labelAt).project(camera)
      b.label.style.transform = `translate(${((scratch.x + 1) / 2) * r.width}px, ${((1 - scratch.y) / 2) * r.height}px) translate(-50%, -100%)`
    }

    renderer.render(scene, camera)
  }
  raf = requestAnimationFrame(frame)

  return {
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
          mats.forEach((m) => m.dispose())
        }
      })
      renderer.dispose()
      canvas.remove()
      overlay.remove()
    },
  }
}
