// "The chair": you're tiny on the giant cushion, which can't decide if it's round or square.
// Find the comfortable spot in the middle and sit.
import * as THREE from 'three'
import { pianoNote } from '../../../sound'
import { cube, follow, lambert, put, type Reality } from './kit'

const R = 9
const SAMPLES = 96

/** How far the cushion's edge reaches at angle `a`, for roundness `n` (2 is a circle, bigger is squarer). */
const edge = (a: number, n: number) => R / (Math.abs(Math.cos(a)) ** n + Math.abs(Math.sin(a)) ** n) ** (1 / n)

export function giantChair(): Reality {
  const g = new THREE.Group()
  const fabric = lambert('#e0a85c')
  const top = lambert('#ecb978')

  // The cushion: its outline is rebuilt every frame as it shifts between round and square.
  const pos = new Float32Array((SAMPLES + 1) * 3 * 2)
  const idx: number[] = []
  // vertex 0: centre top; 1..SAMPLES: top rim; SAMPLES+1..2*SAMPLES: bottom rim
  for (let k = 0; k < SAMPLES; k++) {
    const a = 1 + k
    const b = 1 + ((k + 1) % SAMPLES)
    idx.push(0, b, a)
    const a2 = a + SAMPLES
    const b2 = b + SAMPLES
    idx.push(a, b, b2, a, b2, a2)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setIndex(idx)
  const cushion = new THREE.Mesh(geo, top)
  cushion.receiveShadow = true
  cushion.castShadow = true
  g.add(cushion)
  let n = 2
  const reshape = () => {
    pos.set([0, 0, 0], 0)
    for (let k = 0; k < SAMPLES; k++) {
      const a = (k / SAMPLES) * Math.PI * 2
      const r = edge(a, n)
      pos.set([Math.cos(a) * r, 0, Math.sin(a) * r], (1 + k) * 3)
      pos.set([Math.cos(a) * r, -3, Math.sin(a) * r], (1 + SAMPLES + k) * 3)
    }
    geo.attributes.position.needsUpdate = true
    geo.computeVertexNormals()
    geo.computeBoundingSphere()
  }
  reshape()

  // Tufting buttons in a grid; the ones past the edge hide.
  const buttonMat = lambert('#c98a3c')
  const buttons: THREE.Mesh[] = []
  for (let x = -6; x <= 6; x += 3)
    for (let z = -6; z <= 6; z += 3) {
      if (x === 0 && z === 0) continue
      const b = put(g, new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 8), buttonMat), x, 0.05, z)
      b.scale.y = 0.4
      buttons.push(b)
    }

  // Piping around the cushion's edge, following its shape.
  const piping = new THREE.Mesh(new THREE.BufferGeometry(), lambert('#c98a3c'))
  piping.castShadow = true
  g.add(piping)
  const rim = () => {
    const pts: THREE.Vector3[] = []
    for (let k = 0; k <= SAMPLES; k++) {
      const a = (k / SAMPLES) * Math.PI * 2
      const r = edge(a, n)
      pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r))
    }
    piping.geometry.dispose()
    piping.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), SAMPLES, 0.22, 6, true)
  }

  // Arms and back, huge.
  cube(g, 4, 6, 20, -R - 2, 0, 0, fabric)
  cube(g, 4, 6, 20, R + 2, 0, 0, fabric)
  cube(g, 26, 16, 5, 0, 3, -R - 2.5, fabric)
  cube(g, 26, 1.2, 5.2, 0, 11.1, -R - 2.5, lambert('#d29a4e'))

  // The comfortable spot.
  const spotMat = new THREE.MeshBasicMaterial({ color: '#fff1c8', transparent: true, opacity: 0.4, depthWrite: false })
  const spot = new THREE.Mesh(new THREE.CircleGeometry(1.1, 32), spotMat)
  spot.rotation.x = -Math.PI / 2
  spot.position.y = 0.02
  g.add(spot)
  const dent = new THREE.Mesh(new THREE.CircleGeometry(2.2, 32), new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0, depthWrite: false }))
  dent.rotation.x = -Math.PI / 2
  dent.position.y = 0.015
  g.add(dent)

  let sat = -1
  let inSpot = 0
  let now = 0
  /** Sitting for a few seconds, then up again (the way on is open by then). */
  const seated = () => sat >= 0 && now - sat < 4

  return {
    group: g,
    spawn: new THREE.Vector3(0, 0, 6.5),
    facing: Math.PI,
    sky: '#f3dfbf',
    fog: [26, 80],
    light: { hemi: 1.0, sun: 2.8, sunColor: '#fff0d6', target: new THREE.Vector3(0, 0, 0), from: new THREE.Vector3(0.6, 1, 0.8) },
    camera: (me, t, out) => {
      follow(12, 10.5, 1)(me, t, out)
      // Once you sit, it settles in close.
      if (seated()) {
        const k = Math.min(1, (t - sat) / 2)
        out.pos.lerp(new THREE.Vector3(2.5, 2.6, 4), k)
        out.look.lerp(new THREE.Vector3(0, 0.9, 0), k)
      }
    },
    walk: (me) => {
      if (seated()) {
        me.set(0, 0, 0)
        return true
      }
      const a = Math.atan2(me.z, me.x)
      const lim = edge(a, n) - 0.6
      const d = Math.hypot(me.x, me.z)
      if (d > lim) me.multiplyScalar(lim / d).setY(0)
      return true
    },
    update: (t, dt, me) => {
      now = t
      // Never quite round, never quite square.
      n = sat >= 0 ? 4.5 : 3.6 + Math.sin(t * 0.7) * 2.2
      reshape()
      rim()
      buttons.forEach((b) => {
        const a = Math.atan2(b.position.z, b.position.x)
        b.visible = Math.hypot(b.position.x, b.position.z) < edge(a, n) - 0.4
      })
      // A springy cushion: the walker bounces a little more than usual (the engine handles the walker; we bounce the spot).
      spotMat.opacity = sat >= 0 ? 0 : 0.3 + Math.sin(t * 3) * 0.15
      if (sat < 0) {
        inSpot = Math.hypot(me.x, me.z) < 1 ? inSpot + dt : 0
        if (inSpot > 0.6) {
          sat = t
          ;[0, 4, 7, 12].forEach((k, j) => window.setTimeout(() => pianoNote(k + 5), j * 140))
        }
      } else {
        // Sinking in.
        ;(dent.material as THREE.MeshBasicMaterial).opacity = Math.min(0.18, (t - sat) * 0.2)
        cushion.position.y = -Math.min(0.25, (t - sat) * 0.3)
      }
    },
    goal: () => sat >= 0,
    timeout: 30,
    portal: new THREE.Vector3(0, 0, -5.5),
    portalFacing: 0,
    hint: () => new THREE.Vector3(0, 0, 0),
    clicks: [],
    sitting: seated,
  }
}
