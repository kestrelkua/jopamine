// "Something new": the walls fall away and the room floats in a dusk sky. Out there drift little worlds —
// D.C., Mexico — the new things. Click one and a paper plane sets off for it.
import * as THREE from 'three'
import { pianoNote } from '../../../sound'
import { cat } from '../../parts'
import { clampRect, type Click, clock, cube, ease, flat, follow, lambert, put, type Reality } from './kit'

const FX = 6
const FZ = 5.5

export function duskSky(): Reality {
  const g = new THREE.Group()
  const clicks: Click[] = []

  // The floor, floating, a slab of the room.
  cube(g, FX * 2, 1.2, FZ * 2, 0, -0.6, 0, lambert('#4a62a8'))
  cube(g, FX * 2 + 0.1, 0.9, FZ * 2 + 0.1, 0, -1.6, 0, lambert('#6b5a7a'))
  const rug = flat(g, 1, 1, 0, 1.4, lambert('#efe2c6'), 0.01, new THREE.CircleGeometry(1, 40))
  rug.scale.set(2.2, 1.5, 1)
  // The chair and a lamp, still here.
  const fabric = lambert('#e0a85c')
  const chair = new THREE.Group()
  put(chair, new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.45, 1.3), fabric), 0, 0.45, 0)
  put(chair, new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.1, 1.3), fabric), 0.5, 1, 0)
  put(chair, new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.55, 0.28), fabric), 0, 0.7, -0.6)
  put(chair, new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.55, 0.28), fabric), 0, 0.7, 0.6)
  put(g, chair, 4.6, 0, 3)
  const lamp = new THREE.PointLight('#ffc070', 6, 10, 1.6)
  lamp.position.set(5.2, 1.9, 1.4)
  g.add(lamp)
  cube(g, 0.04, 1.9, 0.04, 5.2, 0.95, 1.4, lambert('#c9a46b'))
  put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.36, 0.42, 16, 1, true), new THREE.MeshLambertMaterial({ color: '#fbf1dc', emissive: '#ffcf80', emissiveIntensity: 0.9, side: THREE.DoubleSide })), 5.2, 1.95, 1.4)
  const kitty = cat('#2f2a33')
  put(g, kitty.group, -3.5, 0, 3.4)

  // The walls, which fall away when you arrive.
  const wallMat = lambert('#8fb0ea')
  const walls = [
    { w: FX * 2, x: 0, z: -FZ, ry: 0 },
    { w: FZ * 2, x: -FX, z: 0, ry: Math.PI / 2 },
    { w: FZ * 2, x: FX, z: 0, ry: -Math.PI / 2 },
  ].map(({ w, x, z, ry }) => {
    const pivot = new THREE.Group()
    pivot.position.set(x, 0, z)
    pivot.rotation.y = ry
    put(pivot, new THREE.Mesh(new THREE.BoxGeometry(w, 4, 0.25), wallMat), 0, 2, -0.12)
    g.add(pivot)
    return pivot
  })

  // Stars.
  const starGeo = new THREE.BufferGeometry()
  const stars: number[] = []
  for (let k = 0; k < 500; k++) {
    const a = Math.random() * Math.PI * 2
    const e = Math.random() * 0.9
    stars.push(Math.cos(a) * 90 * Math.cos(e), 5 + Math.sin(e) * 70, Math.sin(a) * 90 * Math.cos(e))
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(stars, 3))
  const starMat = new THREE.PointsMaterial({ color: '#fff6dc', size: 0.35, transparent: true, opacity: 0.9, fog: false })
  g.add(new THREE.Points(starGeo, starMat))

  // Floating islands, each a little world.
  const island = (x: number, y: number, z: number, build: (top: THREE.Group) => void) => {
    const isl = new THREE.Group()
    const rock = put(isl, new THREE.Mesh(new THREE.ConeGeometry(4, 6, 7), lambert('#7a6a8a', { flatShading: true })), 0, -3, 0)
    rock.rotation.x = Math.PI
    put(isl, new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 0.6, 7), lambert('#9cc59a', { flatShading: true })), 0, 0.3, 0)
    const top = new THREE.Group()
    top.position.y = 0.6
    isl.add(top)
    build(top)
    isl.position.set(x, y, z)
    g.add(isl)
    return isl
  }
  const white = lambert('#f4efe4')
  // D.C.: a domed capitol and a tall obelisk.
  const dc = island(-17, 1, -26, (top) => {
    cube(top, 3.6, 1.2, 1.8, 0, 0.6, 0, white)
    put(top, new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), white), 0, 1.2, 0)
    cube(top, 0.2, 0.5, 0.2, 0, 2.3, 0, white)
    cube(top, 0.4, 4, 0.4, 2.6, 2, 1.2, white)
    put(top, new THREE.Mesh(new THREE.ConeGeometry(0.29, 0.5, 4), white), 2.6, 4.25, 1.2).rotation.y = Math.PI / 4
  })
  // Mexico: a stepped pyramid and cacti.
  const mx = island(18, -1, -30, (top) => {
    const stone = lambert('#c9a46b', { flatShading: true })
    for (let k = 0; k < 4; k++) cube(top, 4 - k * 0.9, 0.6, 4 - k * 0.9, -0.5, 0.3 + k * 0.6, 0, stone)
    cube(top, 0.6, 0.5, 0.6, -0.5, 2.65, 0, stone)
    const green = lambert('#5f9a5a')
    for (const [x, z] of [
      [2.4, 1.4],
      [2.8, -1.2],
    ]) {
      put(top, new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 1.2, 4, 8), green), x, 0.8, z)
      put(top, new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.5, 4, 8), green), x + 0.3, 1.1, z).rotation.z = -0.9
    }
  })
  // And one more, further, that you can't quite make out: the ones you can't see.
  const far = island(2, 6, -55, (top) => {
    const q = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3, 0), new THREE.MeshBasicMaterial({ color: '#ffe6a0', transparent: true, opacity: 0.6 }))
    q.position.y = 1.8
    top.add(q)
  })
  far.scale.setScalar(0.8)

  // Paper planes that fly to an island when you click it.
  const planes: { m: THREE.Mesh; from: THREE.Vector3; to: THREE.Vector3; at: number }[] = []
  const planeGeo = new THREE.ConeGeometry(0.25, 0.8, 3)
  planeGeo.rotateX(-Math.PI / 2)
  const islands = [dc, mx, far].map((isl, k) => {
    const s = { isl, lit: -1 }
    clicks.push({
      obj: isl,
      fn: () => {
        if (s.lit < 0) {
          s.lit = clock.t
          ;[0, 7, 12].forEach((n, j) => window.setTimeout(() => pianoNote(n + k * 2), j * 120))
        }
        const m = new THREE.Mesh(planeGeo, lambert('#fbf7f1'))
        m.scale.set(1, 0.3, 1)
        g.add(m)
        planes.push({ m, from: new THREE.Vector3(0, 1.4, -FZ + 0.5), to: isl.position.clone().add(new THREE.Vector3(0, 2, 0)), at: clock.t })
      },
    })
    return s
  })

  let enteredAt = 0

  return {
    group: g,
    spawn: new THREE.Vector3(0, 0, 3),
    facing: Math.PI,
    sky: '#3d3566',
    fog: [60, 140],
    light: { hemi: 0.6, sun: 1.4, sunColor: '#ff9a7a', target: new THREE.Vector3(0, 0, 0), from: new THREE.Vector3(-0.8, 0.5, -1) },
    camera: (me, t, out) => {
      follow(10, 6.5, 6)(me, t, out)
      out.look.y = 2.5
    },
    walk: (me) => {
      clampRect(me, -FX + 0.4, FX - 0.4, -FZ + 0.4, FZ - 0.4)
      return true
    },
    enter: (t) => {
      enteredAt = t
    },
    update: (t) => {
      // The walls tip outward and fall.
      const k = (t - enteredAt - 0.8) / 1.6
      walls.forEach((w, i) => {
        const fall = ease(k - i * 0.15)
        w.children[0].rotation.x = -fall * 1.9
        w.children[0].position.y = 2 - fall * fall * 30
        w.visible = fall < 0.99
      })
      ;[dc, mx, far].forEach((isl, i) => {
        isl.position.y += Math.sin(t * 0.5 + i * 2) * 0.004
        isl.rotation.y = t * 0.05 * (i % 2 ? -1 : 1)
      })
      islands.forEach((s) => {
        if (s.lit < 0) return
        s.isl.scale.setScalar((s.isl === far ? 0.8 : 1) * (1 + Math.max(0, 0.15 - (t - s.lit) * 0.1)))
      })
      for (const p of planes) {
        const a = Math.min(1, (t - p.at) / 3.5)
        p.m.position.lerpVectors(p.from, p.to, a)
        p.m.position.y += Math.sin(a * Math.PI) * 4
        p.m.lookAt(p.to)
        p.m.visible = a < 1
      }
      kitty.tail.rotation.y = Math.sin(t * 1.2) * 0.5
      starMat.opacity = Math.min(0.9, (t - enteredAt) * 0.3)
    },
    goal: () => islands.filter((s) => s.lit >= 0).length >= 2,
    timeout: 22,
    portal: new THREE.Vector3(0, 0, -FZ + 0.9),
    portalFacing: 0,
    hint: () => {
      const s = islands.find((i) => i.lit < 0 && i.isl !== far)
      return s ? new THREE.Vector3(Math.sign(s.isl.position.x) * (FX - 1), 0, -FZ + 1) : null
    },
    clicks,
  }
}
