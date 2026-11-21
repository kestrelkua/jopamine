// Pieces shared by the hub and the insides of the buildings.
import * as THREE from 'three'

export const GOLD = new THREE.Color('#f2b134')
export const PINK = new THREE.Color('#ef6f9a')

/** Small seeded random, so the trees grow in the same places every visit. */
export function seeded(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export const lambert = (color: THREE.ColorRepresentation, extra: THREE.MeshLambertMaterialParameters = {}) => new THREE.MeshLambertMaterial({ color, ...extra })

export function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, shadow = true) {
  const m = new THREE.Mesh(geo, mat)
  m.castShadow = shadow
  m.receiveShadow = true
  return m
}

/** The little walker in a scarf. */
export function walker() {
  const g = new THREE.Group()
  const body = new THREE.Group()
  const coat = mesh(new THREE.CapsuleGeometry(0.34, 0.5, 6, 12), lambert('#2b2440'))
  coat.position.y = 0.62
  const head = mesh(new THREE.SphereGeometry(0.3, 20, 16), lambert('#f6e6d4'))
  head.position.y = 1.42
  const scarfMat = lambert('#f2b134')
  const scarf = mesh(new THREE.TorusGeometry(0.24, 0.08, 8, 20), scarfMat)
  scarf.rotation.x = Math.PI / 2
  scarf.position.y = 1.13
  const tail = mesh(new THREE.BoxGeometry(0.12, 0.34, 0.05), scarfMat)
  tail.position.set(0.12, 0.98, -0.26)
  const eye = lambert('#1f1b24')
  for (const x of [-0.1, 0.1]) {
    const e = mesh(new THREE.SphereGeometry(0.04, 8, 8), eye, false)
    e.position.set(x, 1.46, 0.27)
    body.add(e)
  }
  body.add(coat, head, scarf, tail)
  g.add(body)
  return { group: g, body, scarf: scarfMat, tail }
}


/** Someone who lives in a story: a coat, a head, eyes, and arms that can lift. */
export function person(coat: THREE.ColorRepresentation, skin: THREE.ColorRepresentation = '#e9c9a8') {
  const g = new THREE.Group()
  const body = new THREE.Group()
  const cloth = lambert(coat)
  const torso = mesh(new THREE.CapsuleGeometry(0.34, 0.5, 6, 12), cloth)
  torso.position.y = 0.62
  const head = mesh(new THREE.SphereGeometry(0.3, 20, 16), lambert(skin))
  head.position.y = 1.42
  const eye = lambert('#1f1b24')
  for (const x of [-0.1, 0.1]) {
    const e = mesh(new THREE.SphereGeometry(0.04, 8, 8), eye, false)
    e.position.set(x, 1.46, 0.27)
    body.add(e)
  }
  // Arms hang from the shoulders; rotating a shoulder lifts its arm out to the side.
  const arms = [-1, 1].map((side) => {
    const shoulder = new THREE.Group()
    shoulder.position.set(side * 0.36, 1.02, 0)
    const arm = mesh(new THREE.CapsuleGeometry(0.08, 0.42, 4, 8), cloth)
    arm.position.y = -0.3
    shoulder.add(arm)
    body.add(shoulder)
    return shoulder
  })
  body.add(torso, head)
  g.add(body)
  return { group: g, body, arms }
}
