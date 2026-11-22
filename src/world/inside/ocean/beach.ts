// "Your shade": a grey beach until you choose your Caribbean Blue from a ring of blues. Then: the word
// "merely" is missing its e's (they're bobbing in the shallows), and a punching bag says "You get what I mean?"
import * as THREE from 'three'
import { ding, pianoNote, tick } from '../../../sound'
import { shadeColor } from '../../shade'
import { clampRect, cube, follow, lambert, put, pushOut, type Click, type Reality } from '../blue/kit'
import { BLUES, drifters, floatingWords, water, wordsTexture, type Sea } from './common'

const LETTERS = ['M', '', 'R', '', 'L', 'Y']

export function beach(sea: Sea): Reality {
  const g = new THREE.Group()
  const clicks: Click[] = []
  const sea_ = water(sea)
  sea_.mesh.position.z = -78
  g.add(sea_.mesh)
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(60, 16), lambert('#f1dcae'))
  sand.rotation.x = -Math.PI / 2
  sand.position.set(0, 0, 4)
  sand.receiveShadow = true
  g.add(sand)
  // A wet edge where the sand meets the sea.
  const wet = new THREE.Mesh(new THREE.PlaneGeometry(60, 2.4), lambert('#d8c08e'))
  wet.rotation.x = -Math.PI / 2
  wet.position.set(0, 0.005, -2.8)
  g.add(wet)
  // Palms.
  for (const [x, z, lean] of [
    [-12, 6, 0.2],
    [12.5, 7, -0.25],
    [-9, 9, -0.1],
  ]) {
    const palm = new THREE.Group()
    for (let k = 0; k < 6; k++) put(palm, new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.7, 8), lambert('#a07a52')), Math.sin(k * 0.3) * lean * k, 0.35 + k * 0.62, 0)
    for (let k = 0; k < 6; k++) {
      const leaf = put(palm, new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.4, 4), lambert('#5f9a5a', { flatShading: true })), lean * 5 + Math.cos(k) * 0.9, 4, Math.sin(k) * 0.9)
      leaf.rotation.set(Math.sin(k) * 1.2, 0, -Math.cos(k) * 1.2)
    }
    put(g, palm, x, 0, z)
  }

  // ---- the ring of blues ----
  const ringAt = new THREE.Vector3(0, 0, 3.4)
  const orbs = BLUES.map((hue, k) => {
    const a = (k / BLUES.length) * Math.PI * 2
    const color = new THREE.Color().setHSL(hue, 0.75, 0.58)
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 14), new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.45 }))
    m.castShadow = true
    const home = new THREE.Vector3(ringAt.x + Math.cos(a) * 2.6, 1.3, ringAt.z + Math.sin(a) * 2.6)
    m.position.copy(home)
    g.add(m)
    const orb = { m, hue, home, a }
    clicks.push({ obj: m, fn: () => pick(orb) })
    return orb
  })
  let pickedAt = -1
  let chosen: (typeof orbs)[number] | null = null
  const pick = (o: (typeof orbs)[number]) => {
    if (sea.picked !== null) return
    sea.picked = o.hue
    sea.shade.uBase.value = o.hue
    chosen = o
    pickedAt = now
    ;[0, 4, 7, 11].forEach((n, j) => window.setTimeout(() => pianoNote(n + 5), j * 120))
  }

  // ---- "merely" ----
  const blockMat = (ch: string, glow = false) => new THREE.MeshLambertMaterial({ map: wordsTexture(ch, { w: 128, h: 128, font: '800 92px Georgia, serif', color: glow ? '#fff6d0' : '#2b2440', shadow: 'rgba(0,0,0,0)', bg: '#f4e6c6' }), color: '#ffffff' })
  const woodSide = lambert('#e8d6b0')
  const letterBlock = (ch: string) => new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.35), [woodSide, woodSide, woodSide, woodSide, blockMat(ch), woodSide])
  const slots = LETTERS.map((ch, k) => {
    const at = new THREE.Vector3(-3.2 + k * 1.3, 0.5, -0.4)
    if (ch) {
      const b = put(g, letterBlock(ch), at.x, at.y, at.z)
      return { at, filled: true, block: b }
    }
    // An empty spot, softly outlined.
    const ghost = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.35), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.18, depthWrite: false }))
    ghost.position.copy(at)
    g.add(ghost)
    return { at, filled: false, block: ghost }
  })
  const es = [
    [-6.5, -3.6],
    [6.8, -4],
  ].map(([x, z]) => {
    const b = put(g, letterBlock('E'), x, 0.4, z)
    return { b, home: new THREE.Vector3(x, 0.4, z), state: 'sea' as 'sea' | 'carried' | 'placed' }
  })
  let carrying: (typeof es)[number] | null = null
  let spelledAt = -1

  // ---- "You get what I mean?" ----
  const bagAt = new THREE.Vector3(9, 0, 3)
  cube(g, 0.16, 3.6, 0.16, bagAt.x - 1.2, 1.8, bagAt.z, lambert('#4a4855'))
  cube(g, 1.4, 0.14, 0.14, bagAt.x - 0.55, 3.55, bagAt.z, lambert('#4a4855'))
  cube(g, 1.2, 0.1, 1.2, bagAt.x - 1.2, 0.05, bagAt.z, lambert('#4a4855'))
  const pivot = new THREE.Group()
  pivot.position.set(bagAt.x, 3.5, bagAt.z)
  put(pivot, new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), lambert('#2b2440')), 0, -0.25, 0)
  put(pivot, new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.6, 18), lambert('#c0392b')), 0, -1.3, 0)
  put(pivot, new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.12, 18), lambert('#2b2440')), 0, -0.55, 0)
  g.add(pivot)
  const bag = { ax: 0, az: 0, vx: 0, vz: 0, hits: 0, lastHit: -1, rang: false }
  const counter = floatingWords('0', 0.9, { w: 256, h: 128, font: '800 80px Georgia, serif', color: '#ffffff' })
  counter.position.set(bagAt.x, 4.5, bagAt.z)
  g.add(counter)
  const bubbles: { s: THREE.Sprite; at: number }[] = []
  const hit = (dir: THREE.Vector3) => {
    if (now - bag.lastHit < 0.35) return
    bag.lastHit = now
    bag.vx += dir.z * 2.4
    bag.vz -= dir.x * 2.4
    bag.hits++
    tick()
    const s = floatingWords('You get what I mean?', 0.7, { w: 1024, h: 128, font: 'italic 700 64px Georgia, serif' })
    s.position.set(bagAt.x + (Math.random() - 0.5), 2.6, bagAt.z)
    g.add(s)
    bubbles.push({ s, at: now })
    const c = counter.material.map as THREE.CanvasTexture
    counter.material.map = wordsTexture(String(bag.hits), { w: 256, h: 128, font: '800 80px Georgia, serif' })
    c.dispose()
    if (bag.hits === 50 && !bag.rang) {
      bag.rang = true
      ;[0, 300, 600].forEach((ms) => window.setTimeout(ding, ms))
    }
  }
  clicks.push({ obj: pivot, fn: () => hit(new THREE.Vector3(Math.random() - 0.5, 0, -1).normalize()) })

  const drift = drifters(g, sea, { x: 0, z: 3, w: 11, d: 5 }, 7)
  let now = 0
  let entered = 0
  const prev = new THREE.Vector3()

  return {
    group: g,
    // You start in the middle of the ring of blues, and choose by walking to one (or clicking it).
    spawn: new THREE.Vector3(0, 0, 3.4),
    facing: Math.PI,
    sky: '#c9d3d8',
    fog: [40, 120],
    skyNow: () => shadeColor(sea.shade, { light: 0.8, chroma: 0.55 }).lerp(new THREE.Color('#c9d3d8'), 1 - sea.shade.uSat.value),
    light: { hemi: 1.1, sun: 2.8, sunColor: '#fff4dc', target: new THREE.Vector3(0, 0, 2), from: new THREE.Vector3(0.5, 1, 0.7) },
    camera: follow(9.5, 7.5, 3),
    walk: (me) => {
      clampRect(me, -13, 13, -4.6, 9.5)
      slots.forEach((sl) => pushOut(me, sl.at.x, sl.at.z, 0.65))
      pushOut(me, bagAt.x - 1.2, bagAt.z, 0.6)
      return true
    },
    enter: (t) => {
      entered = t
    },
    update: (t, dt, me) => {
      now = t
      sea_.update(t)
      // Colour blooms in once you've chosen.
      const sat = sea.picked === null ? 0 : pickedAt < 0 ? 1 : Math.min(1, (t - pickedAt) / 2)
      sea.shade.uSat.value = sat
      if (sea.picked === null && t - entered > 45) pick(orbs[2])
      orbs.forEach((o) => {
        if (sea.picked === null) {
          o.m.position.set(o.home.x, o.home.y + Math.sin(t * 2 + o.a * 3) * 0.12, o.home.z)
          if (Math.hypot(me.x - o.home.x, me.z - o.home.z) < 0.7) pick(o)
        } else if (o === chosen) {
          // Yours rests in your hand... well, just over your shoulder.
          o.m.position.lerp(new THREE.Vector3(me.x + 0.6, 2.1 + Math.sin(t * 3) * 0.08, me.z + 0.2), 0.12)
          o.m.scale.setScalar(0.6)
        } else {
          // The others rise and scatter: they'll be drifting around you from now on.
          const k = Math.min(1, (t - pickedAt) / 1.5)
          o.m.position.y = o.home.y + k * 6
          o.m.visible = k < 1
        }
      })
      drift(t, dt, me)

      // The e's: bob in the sea, ride on your head, drop into a gap.
      for (const e of es) {
        if (e.state === 'sea') {
          e.b.position.set(e.home.x, 0.3 + Math.sin(t * 1.6 + e.home.x) * 0.15, e.home.z)
          e.b.rotation.z = Math.sin(t * 1.2 + e.home.x) * 0.25
          if (!carrying && Math.hypot(me.x - e.home.x, me.z - e.home.z) < 1.1) {
            e.state = 'carried'
            carrying = e
            tick()
          }
        } else if (e.state === 'carried') {
          e.b.position.set(me.x, 2.4 + Math.sin(t * 6) * 0.05, me.z)
          e.b.rotation.set(0, Math.atan2(-(me.x - prev.x), -(me.z - prev.z)) || 0, 0)
          const gap = slots.find((sl) => !sl.filled && Math.hypot(me.x - sl.at.x, me.z - sl.at.z) < 1.3)
          if (gap) {
            gap.filled = true
            gap.block.visible = false
            e.state = 'placed'
            e.b.position.copy(gap.at)
            e.b.rotation.set(0, 0, 0)
            carrying = null
            tick()
            if (es.every((x) => x.state === 'placed')) {
              spelledAt = t
              ;[0, 4, 7].forEach((n, j) => window.setTimeout(() => pianoNote(n + 9), 200 + j * 110))
            }
          }
        }
      }
      if (spelledAt >= 0) {
        // MERELY, spelled right: it hops, letter by letter.
        const k = t - spelledAt
        const all = [...slots.filter((sl) => sl.block.visible).map((sl) => sl.block), ...es.map((e) => e.b)].sort((a, b) => a.position.x - b.position.x)
        all.forEach((b, j) => (b.position.y = 0.5 + Math.max(0, Math.sin(Math.min(Math.PI, (k - j * 0.12) * 5))) * 0.5))
      }

      // The bag: walk into it and it swings.
      const dx = me.x - bagAt.x
      const dz = me.z - bagAt.z
      if (Math.hypot(dx, dz) < 0.85) hit(new THREE.Vector3(-dx, 0, -dz).normalize())
      bag.vx += (-bag.ax * 9 - bag.vx * 1.6) * dt
      bag.vz += (-bag.az * 9 - bag.vz * 1.6) * dt
      bag.ax += bag.vx * dt
      bag.az += bag.vz * dt
      pivot.rotation.set(bag.ax, 0, bag.az)
      counter.visible = bag.hits > 0
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i]
        const k = t - b.at
        b.s.position.y = 2.6 + k * 0.9
        b.s.material.opacity = Math.max(0, 1 - k / 1.6)
        if (k > 1.6) {
          g.remove(b.s)
          b.s.material.map?.dispose()
          b.s.material.dispose()
          bubbles.splice(i, 1)
        }
      }
      prev.copy(me)
    },
    goal: () => sea.picked !== null && spelledAt >= 0,
    timeout: 60,
    portal: new THREE.Vector3(-10, 0, 1),
    portalFacing: Math.PI / 6,
    hint: (me) => {
      if (sea.picked === null) return ringAt
      if (carrying) return slots.find((sl) => !sl.filled)?.at.clone().setY(0) ?? null
      const e = es.find((x) => x.state === 'sea')
      if (e) return e.home.clone().setY(0)
      return Math.hypot(me.x - bagAt.x, me.z - bagAt.z) > 4 && bag.hits < 3 ? bagAt : null
    },
    clicks,
  }
}

