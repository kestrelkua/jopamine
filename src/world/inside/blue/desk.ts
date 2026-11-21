// "The last stand": you shrink onto the desk, and the math homework is an army of sixty paper soldiers.
import * as THREE from 'three'
import { tick } from '../../../sound'
import { clampRect, type Click, clock, cube, flat, follow, lambert, mathTexture, pushOut, put, type Reality } from './kit'

const W = 19
const D = 13

export function deskBattle(): Reality {
  const g = new THREE.Group()
  const clicks: Click[] = []

  // The desktop, its wood grain, and the drop off its edges.
  const wood = lambert('#a0704a')
  cube(g, W * 2, 1.2, D * 2, 0, -0.6, 0, wood)
  for (let k = 0; k < 14; k++) flat(g, W * 2 - 2, 0.06 + (k % 3) * 0.04, 0, -D + 1 + k * 1.85, lambert('#8a5e3c'), 0.004)
  // Far below and around: the room, enormous.
  const wall = lambert('#8fb0ea')
  cube(g, 160, 120, 2, 0, -20, -70, wall)
  cube(g, 2, 120, 160, -70, -20, 0, wall)
  cube(g, 2, 120, 160, 70, -20, 0, wall)
  const winGlow = new THREE.Mesh(new THREE.PlaneGeometry(40, 26), new THREE.MeshBasicMaterial({ color: '#fff3d0' }))
  winGlow.position.set(25, 25, -68.9)
  g.add(winGlow)
  cube(g, 2, 26, 1, 25, 25, -68.5, lambert('#f4efe4'))
  cube(g, 40, 2, 1, 25, 25, -68.5, lambert('#f4efe4'))

  // Giant things on the desk: a lamp like a lighthouse, a pencil, an eraser, books like cliffs, sheets of homework.
  const lampMat = lambert('#2b2440')
  cube(g, 6, 0.8, 6, -14, 0.4, -9, lampMat)
  cube(g, 0.8, 16, 0.8, -14, 8, -9, lampMat)
  const shade = put(g, new THREE.Mesh(new THREE.ConeGeometry(4, 4, 24, 1, true), new THREE.MeshLambertMaterial({ color: '#2b2440', side: THREE.DoubleSide })), -11, 15.5, -9)
  shade.rotation.z = -0.6
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: '#fff1c8' }))
  bulb.position.set(-10.4, 14.4, -9)
  g.add(bulb)
  const pencil = new THREE.Group()
  put(pencil, new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 16, 6), lambert('#f2b134', { flatShading: true })))
  put(pencil, new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.6, 6), lambert('#ecc9a0', { flatShading: true })), 0, 9.3, 0)
  put(pencil, new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 1.6, 6), lambert('#ef6f9a', { flatShading: true })), 0, -8.8, 0)
  pencil.rotation.z = Math.PI / 2
  pencil.rotation.y = 0.35
  put(g, pencil, 9, 0.9, -9)
  cube(g, 4, 2, 2.4, 14, 1, 6, lambert('#f4a6b8'))
  ;['#ef6f9a', '#f2b134', '#6f8fd0'].forEach((c, k) => cube(g, 9 - k * 0.8, 1.6, 6.5 - k * 0.4, -14.5, 0.8 + k * 1.6, 7, lambert(c)))
  for (let k = 0; k < 4; k++) {
    const sheet = flat(g, 6, 8, -4 + k * 4.5, -6 + (k % 2) * 2, new THREE.MeshLambertMaterial({ map: mathTexture(k) }), 0.01 + k * 0.002)
    sheet.rotation.z = (k - 1.5) * 0.15
  }

  // The army: sixty soldiers of paper in bicorne hats, six across, ten deep, marching at you.
  const hat = lambert('#2b2440')
  const textures = Array.from({ length: 8 }, (_, k) => mathTexture(k))
  const soldiers = Array.from({ length: 60 }, (_, k) => {
    const s = new THREE.Group()
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.4), new THREE.MeshLambertMaterial({ map: textures[k % 8], side: THREE.DoubleSide }))
    sheet.position.y = 0.7
    sheet.castShadow = true
    const bicorne = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.36, 3), hat)
    bicorne.scale.set(1.6, 1, 0.55)
    bicorne.position.y = 1.55
    bicorne.castShadow = true
    s.add(sheet, bicorne)
    const col = k % 6
    const row = Math.floor(k / 6)
    const home = new THREE.Vector3(-5 + col * 2, 0, -11 + row * 1.6)
    s.position.copy(home)
    g.add(s)
    const soldier = { s, home, fell: -1, row }
    clicks.push({ obj: s, fn: () => topple(soldier) })
    return soldier
  })
  let lastTick = 0
  const topple = (sd: (typeof soldiers)[number]) => {
    if (sd.fell >= 0) return
    sd.fell = clock.t
    if (sd.fell - lastTick > 0.06) {
      tick()
      lastTick = sd.fell
    }
  }
  let advance = 0

  return {
    group: g,
    spawn: new THREE.Vector3(0, 0, 10),
    facing: Math.PI,
    sky: '#7f9fd8',
    fog: [30, 110],
    light: { hemi: 1.0, sun: 3.2, sunColor: '#fff1d0', target: new THREE.Vector3(0, 0, 0), from: new THREE.Vector3(-0.5, 1, 0.4) },
    camera: follow(10, 9, 3),
    walk: (me) => {
      clampRect(me, -W + 0.8, W - 0.8, -D + 0.8, D - 0.8)
      pushOut(me, -14, -9, 3.6)
      pushOut(me, 14, 6, 2.6)
      if (me.x < -9.6 && me.z > 3.5) me.x = -9.6
      return true
    },
    update: (t, dt, me) => {
      // The front ranks advance on you until you're among them.
      if (me.z < 9) advance = Math.min(6, advance + dt * 0.25)
      for (const sd of soldiers) {
        if (sd.fell < 0) {
          sd.s.position.set(sd.home.x, Math.abs(Math.sin(t * 5 + sd.row + sd.home.x)) * 0.08, sd.home.z + advance)
          if (Math.hypot(me.x - sd.s.position.x, me.z - sd.s.position.z) < 0.75) topple(sd)
          continue
        }
        // Knocked flat, then gone.
        const k = t - sd.fell
        sd.s.rotation.x = -Math.min(1, k / 0.35) * (Math.PI / 2)
        sd.s.position.y = 0.02
        if (k > 1.4) sd.s.visible = false
      }
    },
    goal: () => soldiers.every((sd) => sd.fell >= 0),
    timeout: 45,
    portal: new THREE.Vector3(0, 0, -11.5),
    portalFacing: 0,
    hint: (me) => {
      let best: THREE.Vector3 | null = null
      let bestD = Infinity
      for (const sd of soldiers) {
        if (sd.fell >= 0) continue
        const d = me.distanceTo(sd.s.position)
        if (d < bestD) {
          bestD = d
          best = sd.s.position
        }
      }
      return best
    },
    clicks,
  }
}
