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

/** The guide: a little firefly with a face, two wings, and a glow. Call `update` every frame. */
export function firefly() {
  const fly = new THREE.Group()
  const flyBody = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 16), new THREE.MeshBasicMaterial({ color: '#ffe08a', fog: false }))
  // A soft halo behind it.
  const haloTex = (() => {
    const c = document.createElement('canvas')
    c.width = c.height = 64
    const g = c.getContext('2d')!
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    grad.addColorStop(0, 'rgba(255, 220, 130, 0.9)')
    grad.addColorStop(1, 'rgba(255, 220, 130, 0)')
    g.fillStyle = grad
    g.fillRect(0, 0, 64, 64)
    return new THREE.CanvasTexture(c)
  })()
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }))
  halo.scale.setScalar(1.1)
  // Its face: two eyes and a smile, always turned toward you.
  const face = new THREE.Group()
  const ink = new THREE.MeshBasicMaterial({ color: '#3a2418', fog: false })
  const eyes = [-0.05, 0.05].map((x) => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), ink)
    e.position.set(x, 0.03, 0.14)
    face.add(e)
    return e
  })
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.011, 6, 14, Math.PI), ink)
  smile.rotation.z = Math.PI
  smile.position.set(0, -0.005, 0.142)
  const cheeks = new THREE.MeshBasicMaterial({ color: '#ff9fb8', transparent: true, opacity: 0.7, fog: false })
  for (const x of [-0.09, 0.09]) {
    const c = new THREE.Mesh(new THREE.CircleGeometry(0.022, 10), cheeks)
    c.position.set(x, -0.01, 0.125)
    c.rotation.y = x * 4
    face.add(c)
  }
  face.add(smile)
  // Little wings that flutter.
  const wingMat = new THREE.MeshBasicMaterial({ color: '#fff6dc', transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false, fog: false })
  const wings = [-1, 1].map((side) => {
    const pivot = new THREE.Group()
    pivot.position.set(side * 0.08, 0.08, -0.04)
    const w = new THREE.Mesh(new THREE.CircleGeometry(0.11, 12), wingMat)
    w.scale.set(1, 0.6, 1)
    w.position.x = side * 0.1
    pivot.add(w)
    face.add(pivot)
    return pivot
  })
  const flyLight = new THREE.PointLight('#ffd27a', 3, 6, 1.6)
  fly.add(halo, flyBody, face, flyLight)
  let blinkAt = 3
  return {
    group: fly,
    update: (t: number, camera: THREE.Camera) => {
      flyLight.intensity = 2.5 + Math.sin(t * 7) * 0.5
      face.lookAt(camera.position)
      wings.forEach((w, k) => (w.rotation.y = (k ? -1 : 1) * (0.3 + Math.sin(t * 28) * 0.5)))
      // Blink now and then.
      if (t > blinkAt) blinkAt = t + 2.5 + Math.random() * 3
      const shut = blinkAt - t < 0.12
      eyes.forEach((e) => (e.scale.y = shut ? 0.15 : 1))
    },
  }
}

/** A cat, lying or sitting; `tail` can be swished. */
export function cat(fur: THREE.ColorRepresentation) {
  const g = new THREE.Group()
  const m = lambert(fur)
  const body = mesh(new THREE.CapsuleGeometry(0.17, 0.42, 4, 10), m)
  body.rotation.z = Math.PI / 2
  body.position.y = 0.18
  const head = mesh(new THREE.SphereGeometry(0.15, 12, 10), m)
  head.position.set(0.36, 0.28, 0)
  for (const z of [-0.07, 0.07]) {
    const ear = mesh(new THREE.ConeGeometry(0.05, 0.11, 4), m)
    ear.position.set(0.38, 0.42, z)
    g.add(ear)
  }
  const eye = lambert('#e8d36a')
  for (const z of [-0.055, 0.055]) {
    const e = mesh(new THREE.SphereGeometry(0.022, 6, 6), eye, false)
    e.position.set(0.49, 0.3, z)
    g.add(e)
  }
  const tail = new THREE.Group()
  tail.position.set(-0.36, 0.2, 0)
  const t = mesh(new THREE.CapsuleGeometry(0.04, 0.36, 4, 6), m)
  t.rotation.z = Math.PI / 2
  t.position.x = -0.18
  tail.add(t)
  g.add(body, head, tail)
  return { group: g, tail, head }
}
