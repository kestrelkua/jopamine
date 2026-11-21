// The real Blue Room: where the story starts, and where it comes back to at the end.
import * as THREE from 'three'
import { pianoNote, tick } from '../../../sound'
import { cat, person } from '../../parts'
import { babyTexture, clampRect, type Click, clock, cube, ease, flat, lambert, pushOut, put, type Reality } from './kit'

const ROOM = { x0: -7, x1: 7, z0: -7, z1: 6.2, h: 4 }
const WIN = { x0: 0.6, x1: 4.8, y0: 0.9, y1: 3.3 }
const DOOR = { z0: 3, z1: 4.6, h: 2.4 }
const SIDEWALK = -12

export function realRoom(): Reality {
  const g = new THREE.Group()
  const clicks: Click[] = []
  const { x0, x1, z0, z1, h } = ROOM
  const T = 0.3
  const wx = (WIN.x0 + WIN.x1) / 2
  const wy = (WIN.y0 + WIN.y1) / 2

  // ---------- walls, floor, window, door ----------
  const wall = lambert('#8fb0ea')
  const lower = lambert('#5d7cc2')
  const trim = lambert('#f4efe4')
  flat(g, x1 - x0, z1 - z0, 0, (z0 + z1) / 2, lambert('#4a62a8'), 0)
  cube(g, WIN.x0 - x0, h, T, (x0 + WIN.x0) / 2, h / 2, z0 - T / 2, wall)
  cube(g, x1 - WIN.x1, h, T, (WIN.x1 + x1) / 2, h / 2, z0 - T / 2, wall)
  cube(g, WIN.x1 - WIN.x0, WIN.y0, T, wx, WIN.y0 / 2, z0 - T / 2, wall)
  cube(g, WIN.x1 - WIN.x0, h - WIN.y1, T, wx, (WIN.y1 + h) / 2, z0 - T / 2, wall)
  cube(g, 0.12, WIN.y1 - WIN.y0, 0.16, wx, wy, z0 - T / 2, trim)
  cube(g, WIN.x1 - WIN.x0, 0.12, 0.16, wx, wy, z0 - T / 2, trim)
  cube(g, WIN.x1 - WIN.x0 + 0.3, 0.12, 0.4, wx, WIN.y0 - 0.02, z0 + 0.05, trim)
  cube(g, T, h, z1 - z0, x1 + T / 2, h / 2, (z0 + z1) / 2, wall)
  cube(g, T, h, DOOR.z0 - z0, x0 - T / 2, h / 2, (z0 + DOOR.z0) / 2, wall)
  cube(g, T, h, z1 - DOOR.z1, x0 - T / 2, h / 2, (DOOR.z1 + z1) / 2, wall)
  cube(g, T, h - DOOR.h, DOOR.z1 - DOOR.z0, x0 - T / 2, (DOOR.h + h) / 2, (DOOR.z0 + DOOR.z1) / 2, wall)
  // Two-tone walls with a chair rail, baseboards and a cap.
  const W_ = 1.05
  cube(g, WIN.x0 - x0, W_, 0.04, (x0 + WIN.x0) / 2, W_ / 2, z0 + 0.02, lower)
  cube(g, x1 - WIN.x1, W_, 0.04, (WIN.x1 + x1) / 2, W_ / 2, z0 + 0.02, lower)
  cube(g, WIN.x1 - WIN.x0, WIN.y0, 0.04, wx, WIN.y0 / 2, z0 + 0.02, lower)
  cube(g, 0.04, W_, z1 - z0, x1 - 0.02, W_ / 2, (z0 + z1) / 2, lower)
  cube(g, 0.04, W_, DOOR.z0 - z0, x0 + 0.02, W_ / 2, (z0 + DOOR.z0) / 2, lower)
  cube(g, 0.04, W_, z1 - DOOR.z1, x0 + 0.02, W_ / 2, (DOOR.z1 + z1) / 2, lower)
  for (const y of [0.07, W_]) {
    const hh = y < 0.1 ? 0.14 : 0.07
    cube(g, WIN.x0 - x0, hh, 0.07, (x0 + WIN.x0) / 2, y, z0 + 0.04, trim)
    cube(g, x1 - WIN.x1, hh, 0.07, (WIN.x1 + x1) / 2, y, z0 + 0.04, trim)
    cube(g, 0.07, hh, z1 - z0, x1 - 0.04, y, (z0 + z1) / 2, trim)
    cube(g, 0.07, hh, DOOR.z0 - z0, x0 + 0.04, y, (z0 + DOOR.z0) / 2, trim)
    cube(g, 0.07, hh, z1 - DOOR.z1, x0 + 0.04, y, (DOOR.z1 + z1) / 2, trim)
  }
  cube(g, x1 - x0 + 2 * T, 0.12, T + 0.1, 0, h + 0.06, z0 - T / 2, trim)
  cube(g, T + 0.1, 0.12, z1 - z0, x1 + T / 2, h + 0.06, (z0 + z1) / 2, trim)
  cube(g, T + 0.1, 0.12, z1 - z0, x0 - T / 2, h + 0.06, (z0 + z1) / 2, trim)
  cube(g, 0.12, DOOR.h, 0.12, x0 + 0.03, DOOR.h / 2, DOOR.z0, trim)
  cube(g, 0.12, DOOR.h, 0.12, x0 + 0.03, DOOR.h / 2, DOOR.z1, trim)
  cube(g, 0.12, 0.12, DOOR.z1 - DOOR.z0 + 0.12, x0 + 0.03, DOOR.h, (DOOR.z0 + DOOR.z1) / 2, trim)
  const doorGlowMat = new THREE.MeshBasicMaterial({ color: '#fff4dc', transparent: true, opacity: 0 })
  const doorGlow = new THREE.Mesh(new THREE.PlaneGeometry(DOOR.z1 - DOOR.z0, DOOR.h), doorGlowMat)
  doorGlow.rotation.y = Math.PI / 2
  doorGlow.position.set(x0 - T - 0.02, DOOR.h / 2, (DOOR.z0 + DOOR.z1) / 2)
  g.add(doorGlow)
  // The window can glow: it's this room's way into the others.
  const winGlowMat = new THREE.MeshBasicMaterial({ color: '#fff1c8', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })
  const winGlow = new THREE.Mesh(new THREE.PlaneGeometry(WIN.x1 - WIN.x0, WIN.y1 - WIN.y0), winGlowMat)
  winGlow.position.set(wx, wy, z0 - 0.05)
  g.add(winGlow)

  // ---------- outside ----------
  flat(g, 120, 120, 0, -10, lambert('#9cc59a'), -0.02)
  flat(g, 80, 2, 0, SIDEWALK, lambert('#d9d4cc'), 0)
  flat(g, 80, 5, 0, SIDEWALK - 3.6, lambert('#55545e'), 0.004)
  flat(g, 1.4, 4.4, -3, z0 - 2.8, lambert('#d9d4cc'), 0.006)
  const houseColors = ['#e8c9a0', '#c9d8b6', '#e3b8c4', '#bcc8e8']
  for (let k = 0; k < 6; k++) {
    const hx = -18 + k * 7.5
    cube(g, 4.4, 2.8, 3.6, hx, 1.4, SIDEWALK - 12, lambert(houseColors[k % 4]))
    const roof = put(g, new THREE.Mesh(new THREE.ConeGeometry(3.3, 1.5, 4), lambert('#8a5a4a', { flatShading: true })), hx, 3.55, SIDEWALK - 12)
    roof.rotation.y = Math.PI / 4
  }
  for (let k = 0; k < 7; k++) {
    const tx = -16 + k * 5.5 + (k % 2) * 1.2
    const tz = SIDEWALK - 6.5 - (k % 3)
    cube(g, 0.2, 1.2, 0.2, tx, 0.6, tz, lambert('#8a6248'))
    put(g, new THREE.Mesh(new THREE.IcosahedronGeometry(1 + (k % 3) * 0.25, 0), lambert(['#7fb27a', '#94c08a', '#6fa070'][k % 3], { flatShading: true })), tx, 1.9 + (k % 3) * 0.2, tz)
  }
  const passers = ['#c96f4a', '#5a8a5a', '#8a6aa8', '#3d6fd8'].map((coat, k) => {
    const p = person(coat)
    put(g, p.group)
    return { p, x: -16 + k * 9, dir: k % 2 ? 1 : -1, speed: 1.1 + k * 0.15 }
  })

  // ---------- inside ----------
  // Shelf and baby photos. Click to take them down.
  cube(g, 4.6, 0.08, 0.45, -4, 2.15, z0 + 0.23, lambert('#e8dccb'))
  const photos = Array.from({ length: 6 }, (_, k) => {
    const f = new THREE.Group()
    put(f, new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.76, 0.05), lambert(['#c9a46b', '#f4efe4', '#8a5a4a'][k % 3])))
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.64), new THREE.MeshLambertMaterial({ map: babyTexture(k) }))
    pic.position.z = 0.03
    f.add(pic)
    f.position.set(-6 + k * 0.8, 2.75 + (k % 2) * 0.35, z0 + 0.04)
    f.rotation.z = ((k % 3) - 1) * 0.04
    g.add(f)
    const p = { f, down: -1, from: f.position.clone() }
    clicks.push({
      obj: f,
      fn: () => {
        if (p.down >= 0) return
        p.down = clock.t
        tick()
        if (photos.every((q) => q.down >= 0)) [0, 4, 7].forEach((n, j) => window.setTimeout(() => pianoNote(n + 7), 300 + j * 120))
      },
    })
    return p
  })

  // Desk, homework, lamp, books, bin, stool.
  const wood = lambert('#8a5a3a')
  cube(g, 1.4, 0.08, 2.6, -6.15, 1.0, -1, wood)
  for (const [dx, dz] of [
    [-0.6, -1.2],
    [0.6, -1.2],
    [-0.6, 1.2],
    [0.6, 1.2],
  ])
    cube(g, 0.08, 1, 0.08, -6.15 + dx, 0.5, -1 + dz, wood)
  const paper = lambert('#fbf7f1')
  for (let k = 0; k < 5; k++) cube(g, 0.42, 0.01, 0.56, -6.2 + (k % 2) * 0.12, 1.045 + k * 0.012, -1.3 + k * 0.06, paper).rotation.y = k * 0.2
  cube(g, 0.04, 0.45, 0.04, -6.6, 1.26, -2.1, lambert('#2b2440'))
  const shade = put(g, new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.18, 14, 1, true), new THREE.MeshLambertMaterial({ color: '#2b2440', side: THREE.DoubleSide })), -6.5, 1.5, -2.1)
  shade.rotation.z = -0.5
  ;['#ef6f9a', '#f2b134', '#6f8fd0'].forEach((c, k) => cube(g, 0.5 - k * 0.05, 0.07, 0.36, -6.45, 1.08 + k * 0.07, 0.05, lambert(c)))
  cube(g, 0.5, 0.06, 0.5, -5.2, 0.62, -1, wood)
  cube(g, 0.06, 0.62, 0.06, -5.2, 0.31, -1, wood)
  put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.6, 14, 1, true), new THREE.MeshLambertMaterial({ color: '#c96f4a', side: THREE.DoubleSide })), -6.2, 0.3, 1.1)

  // The fat chair, a lamp and a little table with a mug.
  const fabric = lambert('#e0a85c')
  const chair = new THREE.Group()
  put(chair, new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.45, 1.3), fabric), 0, 0.45, 0)
  put(chair, new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.1, 1.3), fabric), 0.5, 1.0, 0)
  put(chair, new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.55, 0.28), fabric), 0, 0.7, -0.6)
  put(chair, new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.55, 0.28), fabric), 0, 0.7, 0.6)
  put(g, chair, 5.6, 0, 0.6)
  const brass = lambert('#c9a46b')
  cube(g, 0.04, 1.9, 0.04, 6.3, 0.95, -0.7, brass)
  cube(g, 0.5, 0.04, 0.5, 6.3, 0.02, -0.7, brass)
  put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.36, 0.42, 16, 1, true), new THREE.MeshLambertMaterial({ color: '#fbf1dc', side: THREE.DoubleSide })), 6.3, 1.95, -0.7)
  cube(g, 0.6, 0.05, 0.6, 5.6, 0.62, 2.1, wood)
  cube(g, 0.06, 0.62, 0.06, 5.6, 0.31, 2.1, wood)
  put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.14, 12), lambert('#ef6f9a')), 5.55, 0.72, 2.05)

  // A rug, the air conditioning and its breeze, curtains, a plant.
  const rug = flat(g, 1, 1, -0.6, 2.8, lambert('#efe2c6'), 0.01, new THREE.CircleGeometry(1, 40))
  rug.scale.set(2.4, 1.6, 1)
  const rugEdge = flat(g, 1, 1, -0.6, 2.8, lambert('#e0a85c'), 0.015, new THREE.RingGeometry(0.88, 0.96, 40))
  rugEdge.scale.set(2.4, 1.6, 1)
  cube(g, 0.32, 0.38, 1.3, x1 - 0.18, 3.25, 2.8, lambert('#f4f2ee'))
  const breeze = Array.from({ length: 5 }, (_, k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.04), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }))
    g.add(m)
    return { m, off: k / 5, z: 2.3 + (k % 3) * 0.45 }
  })
  const curtainMat = new THREE.MeshLambertMaterial({ color: '#fbf1dc', side: THREE.DoubleSide })
  const curtains = [WIN.x0 - 0.35, WIN.x1 + 0.35].map((cx) => {
    const c = new THREE.Group()
    for (let f = 0; f < 4; f++) put(c, new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.9, 0.06), curtainMat), (f - 1.5) * 0.14, -1.45, (f % 2) * 0.06)
    c.position.set(cx, WIN.y1 + 0.35, z0 + 0.12)
    g.add(c)
    return c
  })
  cube(g, WIN.x1 - WIN.x0 + 1.6, 0.05, 0.05, wx, WIN.y1 + 0.38, z0 + 0.12, brass)
  put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.5, 14), lambert('#c96f4a')), 6.3, 0.25, -6.3)
  for (let k = 0; k < 6; k++) put(g, new THREE.Mesh(new THREE.ConeGeometry(0.12, 1, 5), lambert('#5f9a5a', { flatShading: true })), 6.3 + Math.cos(k) * 0.15, 0.9, -6.3 + Math.sin(k) * 0.15).rotation.set(Math.sin(k * 2) * 0.4, 0, Math.cos(k * 2) * 0.4)

  // Cats in the light.
  const cats = ['#e0904a', '#2f2a33', '#9a9aa2'].map((fur, k) => {
    const c = cat(fur)
    put(g, c.group, 1 + k, 0, -1 - k * 0.6)
    return { ...c, k, inBox: false }
  })

  // The package on the rug.
  const pkg = new THREE.Group()
  const cardboard = lambert('#c99a62')
  put(pkg, new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.7), cardboard), 0, 0.3, 0)
  const flaps = [0, 1, 2, 3].map((k) => {
    const pivot = new THREE.Group()
    const wide = k % 2 === 0
    const [px, pz] = [
      [0, -0.35],
      [-0.45, 0],
      [0, 0.35],
      [0.45, 0],
    ][k]
    pivot.position.set(px, 0.6, pz)
    put(pivot, new THREE.Mesh(new THREE.BoxGeometry(wide ? 0.9 : 0.35, 0.02, wide ? 0.35 : 0.7), cardboard), px ? -px * 0.39 : 0, 0, pz ? -pz / 2 : 0)
    pkg.add(pivot)
    return pivot
  })
  put(g, pkg, -0.6, 0, 2.8)

  // ---------- state ----------
  let finale = false
  let finaleAt = 0
  const sun = { az: 0 }
  const light = { hemi: 0.85, sun: 8, sunColor: '#ffc870', target: new THREE.Vector3(2.2, 0, -2), from: new THREE.Vector3(0, 0.55, -1) }
  const sunDir = new THREE.Vector3()

  return {
    group: g,
    spawn: new THREE.Vector3(-5.6, 0, 3.8),
    facing: Math.PI / 2,
    sky: '#bcd7f2',
    fog: null,
    light,
    camera: (me, _t, out) => {
      out.pos.set(me.x * 0.3, 11.5, 13.5 + me.z * 0.25)
      out.look.set(me.x * 0.6, 0.6, me.z * 0.7 - 1)
    },
    walk: (me) => {
      const inDoor = me.z > DOOR.z0 + 0.3 && me.z < DOOR.z1 - 0.3
      clampRect(me, inDoor && finale ? x0 - 1.4 : x0 + 0.4, x1 - 0.4, z0 + 0.4, z1 - 0.3)
      if (me.x < -5.1 && me.z > -2.5 && me.z < 0.5) me.x = -5.1
      pushOut(me, 5.6, 0.6, 1.25)
      pushOut(me, pkg.position.x, pkg.position.z, 0.8)
      return true
    },
    update: (t, dt) => {
      // The sun drifts, and the boxes of light drift with it.
      sun.az = Math.sin(t * 0.04) * 0.5
      sunDir.set(Math.sin(sun.az) * 0.9, -0.55, 1).normalize()
      light.from.copy(sunDir).multiplyScalar(-1)
      const s = -wy / sunDir.y
      const patch = new THREE.Vector3(wx + sunDir.x * s, 0, z0 + sunDir.z * s)
      cats.forEach((c) => {
        const goal = c.inBox ? pkg.position.clone().add(new THREE.Vector3((c.k - 0.5) * 0.25, 0, 0)) : patch.clone().add(new THREE.Vector3([-0.9, 0.5, 0.1][c.k], 0, [0.2, -0.5, 0.7][c.k]))
        const d = Math.hypot(goal.x - c.group.position.x, goal.z - c.group.position.z)
        if (d > 0.15) {
          const dir = goal.clone().sub(c.group.position).setY(0).normalize()
          c.group.position.addScaledVector(dir, Math.min(d, dt * (c.inBox ? 1.6 : 0.5)))
          c.group.rotation.y = Math.atan2(-dir.z, dir.x)
        }
        c.group.position.y = c.inBox && d < 0.3 ? 0.42 : 0
        c.tail.rotation.y = Math.sin(t * 1.3 + c.k * 2) * 0.5
      })
      photos.forEach((p) => {
        if (p.down < 0) return
        const k = ease((t - p.down) / 0.7)
        p.f.position.set(p.from.x, p.from.y + (2.22 - p.from.y) * k, p.from.z + 0.22 * k)
        p.f.rotation.x = (-Math.PI / 2) * k
      })
      curtains.forEach((c, k) => {
        c.rotation.x = 0.05 + Math.sin(t * 0.9 + k) * 0.05
        c.rotation.z = Math.sin(t * 0.7 + k * 2) * 0.025
      })
      breeze.forEach((b) => {
        const k = (t * 0.35 + b.off) % 1
        b.m.position.set(x1 - 0.5 - k * 1.8, 3 - k * 1.2, b.z)
        b.m.rotation.set(0, Math.PI / 2, -0.55)
        ;(b.m.material as THREE.MeshBasicMaterial).opacity = Math.sin(k * Math.PI) * 0.35
      })
      passers.forEach((p) => {
        p.x += p.dir * p.speed * dt
        if (p.x > 18) p.x = -18
        if (p.x < -18) p.x = 18
        p.p.group.position.set(p.x, 0, SIDEWALK + (p.dir > 0 ? 0.4 : -0.4))
        p.p.group.rotation.y = p.dir > 0 ? Math.PI / 2 : -Math.PI / 2
        p.p.body.position.y = Math.abs(Math.sin(t * 6 + p.x)) * 0.06
      })
      if (finale) {
        const k = t - finaleAt
        flaps.forEach((f, j) => {
          const o = ease(k / 0.6)
          if (j === 0) f.rotation.x = -2.2 * o
          if (j === 2) f.rotation.x = 2.2 * o
          if (j === 1) f.rotation.z = 2.2 * o
          if (j === 3) f.rotation.z = -2.2 * o
        })
        if (k > 1) cats.slice(0, 2).forEach((c) => (c.inBox = true))
        if (k > 2.5) pkg.rotation.z = Math.sin(t * 9) * 0.05
        doorGlowMat.opacity = Math.min(0.85, Math.max(0, (k - 1.5) / 2)) * (0.75 + Math.sin(t * 3) * 0.25)
      }
    },
    goal: () => photos.every((p) => p.down >= 0),
    timeout: 20,
    portal: new THREE.Vector3(wx, 0, z0 + 0.7),
    portalFacing: 0,
    hint: () => photos.find((p) => p.down < 0)?.from.clone().setZ(z0 + 1.2).setY(0) ?? null,
    clicks,
    ownPortal: (open, t) => {
      winGlowMat.opacity = finale ? 0 : open * (0.7 + Math.sin(t * 3) * 0.2)
    },
    finale: () => {
      finale = true
      finaleAt = clock.t
    },
    exit: (me) => finale && me.x < x0 - 0.7,
    door: new THREE.Vector3(x0 - 1, 0, (DOOR.z0 + DOOR.z1) / 2),
  }
}
