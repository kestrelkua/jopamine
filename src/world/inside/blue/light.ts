// "Boxes of light": the room is gone; only the rectangles of sunlight are left, floating in the dark.
// Cats lie on them like little fat lizards. Step off the light and you fall (and pop back).
import * as THREE from 'three'
import { pianoNote } from '../../../sound'
import { cat } from '../../parts'
import { follow, heartTexture, put, type Reality } from './kit'

const PW = 3.4
const PD = 2.4

export function boxesOfLight(): Reality {
  const g = new THREE.Group()

  // A path of light boxes, each split by the window's cross.
  const path: [number, number, number][] = [
    [0, 6, 0],
    [1.4, 3.9, 0.12],
    [0.2, 1.8, -0.1],
    [-1.4, -0.3, 0.05],
    [-0.4, -2.4, 0.15],
    [1.2, -4.5, -0.05],
    [2.2, -6.6, 0.1],
    [1, -8.7, -0.1],
  ]
  const glow = new THREE.MeshLambertMaterial({ color: '#ffe3a0', emissive: '#ffc25a', emissiveIntensity: 0.45 })
  const cross = new THREE.MeshBasicMaterial({ color: '#7a5a3a', transparent: true, opacity: 0.45 })
  const plates = path.map(([x, z, r]) => {
    const p = new THREE.Group()
    const top = new THREE.Mesh(new THREE.BoxGeometry(PW, 0.14, PD), glow)
    top.position.y = -0.07
    top.receiveShadow = true
    p.add(top)
    for (const [w, d] of [
      [0.08, PD],
      [PW, 0.08],
    ]) {
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(w, d), cross)
      bar.rotation.x = -Math.PI / 2
      bar.position.y = 0.006
      p.add(bar)
    }
    p.position.set(x, 0, z)
    p.rotation.y = r
    g.add(p)
    return p
  })

  // Dust drifting in the dark.
  const dustGeo = new THREE.BufferGeometry()
  const dust: number[] = []
  for (let k = 0; k < 400; k++) dust.push((Math.random() - 0.5) * 50, (Math.random() - 0.6) * 20, (Math.random() - 0.5) * 50)
  dustGeo.setAttribute('position', new THREE.Float32BufferAttribute(dust, 3))
  const dustPts = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: '#ffe3a0', size: 0.08, transparent: true, opacity: 0.6 }))
  g.add(dustPts)

  // Far off, the room's window and the chair, adrift.
  const farWin = new THREE.Group()
  const frame = new THREE.MeshBasicMaterial({ color: '#8fb0ea' })
  for (const [w, h, x, y] of [
    [9, 0.4, 0, 6],
    [9, 0.4, 0, 0],
    [0.4, 6, -4.5, 3],
    [0.4, 6, 4.5, 3],
    [0.3, 6, 0, 3],
    [9, 0.3, 0, 3],
  ] as const) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.3), frame)
    m.position.set(x, y, 0)
    farWin.add(m)
  }
  farWin.position.set(-8, 2, -30)
  farWin.rotation.set(0.2, 0.4, 0.1)
  g.add(farWin)
  const farChair = new THREE.Group()
  const fabric = new THREE.MeshBasicMaterial({ color: '#7a5a3a' })
  for (const [w, h, d, x, y, z] of [
    [3, 1, 3, 0, 1, 0],
    [0.8, 2.6, 3, 1.1, 2.2, 0],
    [3, 1.2, 0.6, 0, 1.6, -1.2],
    [3, 1.2, 0.6, 0, 1.6, 1.2],
  ] as const) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), fabric)
    m.position.set(x, y, z)
    farChair.add(m)
  }
  farChair.position.set(14, -4, -22)
  farChair.rotation.set(-0.3, 0.8, 0.4)
  g.add(farChair)

  // The cats, lying on the light. Walk up to one and it loves you back.
  const heart = heartTexture()
  const cats = [
    [2, '#e0904a'],
    [4, '#2f2a33'],
    [6, '#9a9aa2'],
  ].map(([i, fur], k) => {
    const c = cat(fur as string)
    c.group.scale.setScalar(1.5)
    const plate = plates[i as number]
    put(g, c.group, plate.position.x + (k % 2 ? -0.8 : 0.8), 0, plate.position.z + 0.3)
    c.group.rotation.y = k * 1.7
    // Lying like a little fat lizard: low and long.
    c.group.scale.y = 1.1
    const love = new THREE.Sprite(new THREE.SpriteMaterial({ map: heart, transparent: true, opacity: 0, depthWrite: false }))
    love.scale.setScalar(0.6)
    g.add(love)
    return { c, love, petted: -1 }
  })

  const light = { hemi: 0.35, sun: 2.6, sunColor: '#ffd890', target: new THREE.Vector3(0, 0, -1), from: new THREE.Vector3(0.3, 1, 0.5) }
  let lastSafe = new THREE.Vector3(0, 0, 6)
  const local = new THREE.Vector3()

  const onLight = (p: THREE.Vector3) =>
    plates.some((pl) => {
      local.copy(p).sub(pl.position).applyAxisAngle(new THREE.Vector3(0, 1, 0), -pl.rotation.y)
      return Math.abs(local.x) < PW / 2 + 0.1 && Math.abs(local.z) < PD / 2 + 0.1
    })

  return {
    group: g,
    spawn: new THREE.Vector3(0, 0, 6),
    facing: Math.PI,
    sky: '#0d1330',
    fog: [14, 50],
    light,
    camera: follow(8.5, 7.5, 2.5),
    walk: (me) => {
      if (me.y < -0.01) return false
      if (onLight(me)) {
        lastSafe = me.clone()
        return true
      }
      return false
    },
    update: (t, _dt, me) => {
      if (me.y < -7) {
        // Fell off the light: back onto the last box you stood on.
        me.copy(lastSafe)
      }
      plates.forEach((p, k) => {
        const m = (p.children[0] as THREE.Mesh).material as THREE.MeshLambertMaterial
        m.emissiveIntensity = 0.4 + Math.sin(t * 1.5 + k) * 0.08
      })
      dustPts.rotation.y = t * 0.01
      farWin.rotation.z = 0.1 + Math.sin(t * 0.2) * 0.05
      farChair.rotation.y = 0.8 + t * 0.03
      cats.forEach((k) => {
        const near = Math.hypot(me.x - k.c.group.position.x, me.z - k.c.group.position.z) < 1.4
        if (near && k.petted < 0) {
          k.petted = t
          ;[12, 16, 19].forEach((n, j) => window.setTimeout(() => pianoNote(n), j * 110))
        }
        k.c.tail.rotation.y = Math.sin(t * (k.petted >= 0 ? 4 : 1.2)) * 0.6
        if (k.petted >= 0) {
          const a = t - k.petted
          const mat = k.love.material as THREE.SpriteMaterial
          mat.opacity = a < 2 ? Math.sin(Math.min(1, a / 2) * Math.PI) : 0
          k.love.position.set(k.c.group.position.x, 1.1 + a * 0.6, k.c.group.position.z)
        }
      })
    },
    goal: () => cats.every((k) => k.petted >= 0),
    timeout: 35,
    portal: new THREE.Vector3(1, 0, -9.4),
    portalFacing: 0,
    hint: () => cats.find((k) => k.petted < 0)?.c.group.position ?? null,
    clicks: [],
  }
}
