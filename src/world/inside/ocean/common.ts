// Shared by every part of Caribbean Blue: your shade, the other shades drifting around, the sea, the way on.
import * as THREE from 'three'
import type { Section } from '../../../content/types'
import { angled, makeShade, type ShadeUniforms } from '../../shade'
import { walker } from '../../parts'
import { ease, lambert, put } from '../blue/kit'

export interface Sea {
  shade: ShadeUniforms
  /** The hue you picked on the beach, or null until you do. */
  picked: number | null
  sections: Section[]
}

export function makeSea(sections: Section[]): Sea {
  // Grey until you choose a shade.
  return { shade: makeShade(0.53, 0, 0.09), picked: null, sections }
}

/** The ring of blues you choose from (and, once you have, the shades you didn't choose). */
export const BLUES = [0.47, 0.5, 0.53, 0.56, 0.59, 0.62, 0.66, 0.44]

/**
 * The sea, made of shapes: a field of flat geometric facets (triangles, and fans of four around a moving
 * centre), each its own blue for where it is: lighter on the crests, deeper in the troughs, brighter where
 * it tilts to the light. The corners slide sideways as well as up and down, so every shape keeps changing,
 * its edges stretching and shrinking, and the changing shapes are the waves.
 */
export function water(sea: Sea, size = 160) {
  const N = Math.round(size / 2.7)
  const cell = size / N
  const half = size / 2
  // Lattice corners, then one moving centre for each fanned cell.
  const base: number[] = []
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) base.push(-half + i * cell, -half + j * cell)
  const corner = (i: number, j: number) => j * (N + 1) + i
  const tris: number[] = []
  const hash = (i: number, j: number) => {
    const h = Math.sin(i * 127.1 + j * 311.7) * 43758.5453
    return h - Math.floor(h)
  }
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const a = corner(i, j)
      const b = corner(i + 1, j)
      const c = corner(i + 1, j + 1)
      const d = corner(i, j + 1)
      const kind = hash(i, j)
      if (kind < 0.36) tris.push(a, d, b, b, d, c)
      else if (kind < 0.72) tris.push(a, d, c, a, c, b)
      else {
        const m = base.length / 2
        base.push(-half + (i + 0.5) * cell, -half + (j + 0.5) * cell)
        tris.push(a, d, m, d, c, m, c, b, m, b, a, m)
      }
    }
  const points = base.length / 2
  const tri = tris.length / 3
  const jitter = Float32Array.from({ length: tri }, (_, k) => hash(k, 7.3) - 0.5)
  const P = new Float32Array(points * 3)
  const pos = new Float32Array(tri * 9)
  const col = new Float32Array(tri * 9)
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
  const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }))
  m.receiveShadow = true
  m.frustumCulled = false
  const c = new THREE.Color()
  const sun = new THREE.Vector3(0.4, 0.85, 0.35).normalize()
  const mixHue = (a: number, b: number, k: number) => a + ((((b - a + 0.5) % 1) + 1) % 1 - 0.5) * k
  return {
    mesh: m,
    update: (t: number) => {
      // Move every corner: up and down with the swell, and sideways so the shapes reshape.
      for (let k = 0; k < points; k++) {
        const x = base[k * 2]
        const z = base[k * 2 + 1]
        const fan = k >= (N + 1) * (N + 1)
        const sway = fan ? 0.42 : 0.24
        P[k * 3] = x + Math.sin(z * 0.21 + t * 0.9 + x * 0.05) * cell * sway
        P[k * 3 + 2] = z + Math.cos(x * 0.19 + t * 0.75 - z * 0.04) * cell * sway
        P[k * 3 + 1] = -0.42 + Math.sin(x * 0.16 + t * 1.05) * 0.22 + Math.sin(z * 0.23 - t * 0.85 + x * 0.07) * 0.16 + Math.sin((x + z) * 0.5 + t * 1.7) * 0.05 + (fan ? Math.sin(t * 1.3 + x) * 0.06 : 0)
      }
      const u = sea.shade
      const sat = 0.88 * u.uSat.value
      for (let f = 0; f < tri; f++) {
        const a = tris[f * 3] * 3
        const b = tris[f * 3 + 1] * 3
        const d = tris[f * 3 + 2] * 3
        const o = f * 9
        pos[o] = P[a]
        pos[o + 1] = P[a + 1]
        pos[o + 2] = P[a + 2]
        pos[o + 3] = P[b]
        pos[o + 4] = P[b + 1]
        pos[o + 5] = P[b + 2]
        pos[o + 6] = P[d]
        pos[o + 7] = P[d + 1]
        pos[o + 8] = P[d + 2]
        // The facet's tilt.
        const e1x = P[b] - P[a]
        const e1y = P[b + 1] - P[a + 1]
        const e1z = P[b + 2] - P[a + 2]
        const e2x = P[d] - P[a]
        const e2y = P[d + 1] - P[a + 1]
        const e2z = P[d + 2] - P[a + 2]
        let nx = e1y * e2z - e1z * e2y
        let ny = e1z * e2x - e1x * e2z
        let nz = e1x * e2y - e1y * e2x
        const nl = Math.hypot(nx, ny, nz) || 1
        const flip = ny < 0 ? -1 : 1
        nx = (nx / nl) * flip
        ny = (ny / nl) * flip
        nz = (nz / nl) * flip
        const h = (P[a + 1] + P[b + 1] + P[d + 1]) / 3 + 0.42 // 0 at the mean, + on crests
        const lit = nx * sun.x + ny * sun.y + nz * sun.z
        // A blue that makes sense where it is: crests drift toward teal and light, troughs toward deep blue.
        let hue = u.uBase.value - h * 0.16 + nx * 0.07 + jitter[f] * 0.06
        hue = mixHue(hue, u.uDriftHue.value, u.uDrift.value * 0.8)
        const light = Math.min(0.78, Math.max(0.14, 0.3 + h * 0.6 + (lit - 0.85) * 1.6 + jitter[f] * 0.08))
        c.setHSL(((hue % 1) + 1) % 1, sat, light)
        for (let q = 0; q < 9; q += 3) {
          col[o + q] = c.r
          col[o + q + 1] = c.g
          col[o + q + 2] = c.b
        }
      }
      geo.attributes.position.needsUpdate = true
      geo.attributes.color.needsUpdate = true
    },
  }
}

/**
 * The shades you didn't pick, drifting through the world. When one drifts close, everything (and your scarf)
 * washes toward its shade for a moment, then eases back to yours: many shades acting on you at once.
 */
export function drifters(parent: THREE.Object3D, sea: Sea, area: { x: number; z: number; w: number; d: number }, count = 6) {
  const list = Array.from({ length: count }, (_, k) => {
    const hue = BLUES[(k * 3) % BLUES.length] + (k % 3 === 2 ? 0.25 : 0) // a few aren't blue at all
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(hue % 1, 0.8, 0.62), transparent: true, opacity: 0.9 })
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), mat)
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), new THREE.MeshBasicMaterial({ color: mat.color, transparent: true, opacity: 0.18, depthWrite: false }))
    m.add(halo)
    parent.add(m)
    return { m, hue: hue % 1, ox: Math.random() * 10, oz: Math.random() * 10, sp: 0.15 + Math.random() * 0.15 }
  })
  let wash = 0
  let washHue = 0.53
  return (t: number, dt: number, me: THREE.Vector3) => {
    const show = sea.picked !== null
    let nearest = Infinity
    for (const d of list) {
      d.m.visible = show
      d.m.position.set(area.x + Math.sin(t * d.sp + d.ox) * area.w, 1.6 + Math.sin(t * 0.7 + d.oz) * 0.5, area.z + Math.cos(t * d.sp * 0.8 + d.oz) * area.d)
      const dist = Math.hypot(d.m.position.x - me.x, d.m.position.z - me.z)
      if (show && dist < 2.2 && dist < nearest) {
        nearest = dist
        washHue = d.hue
      }
    }
    const want = nearest < 2.2 ? 0.75 * (1 - nearest / 2.2) + 0.25 : 0
    wash += (want - wash) * Math.min(1, dt * 2.5)
    sea.shade.uDriftHue.value = washHue
    sea.shade.uDrift.value = wash
  }
}

/** The way on: a standing ring of water. */
export function oceanPortal(sea: Sea) {
  const g = new THREE.Group()
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.16, 12, 48), angled(sea.shade, { light: 0.85, chroma: 0.6, emissive: 0.4 }))
  ring.position.y = 1.7
  const pane = new THREE.Mesh(new THREE.CircleGeometry(1.36, 48), angled(sea.shade, { light: 0.9, chroma: 0.45, opacity: 0.7, emissive: 0.6, side: THREE.DoubleSide }))
  pane.position.y = 1.7
  const light = new THREE.PointLight('#bff3ff', 0, 9, 1.4)
  light.position.set(0, 1.7, 1)
  g.add(ring, pane, light)
  return {
    group: g,
    set: (open: number, t: number) => {
      g.visible = open > 0.001
      g.position.y = -3.6 * (1 - ease(open))
      ring.rotation.z = t * 0.6
      pane.scale.setScalar(0.92 + Math.sin(t * 2.2) * 0.05)
      light.intensity = 5 * open
    },
  }
}

/** A canvas texture with words on it. */
export function wordsTexture(text: string, { w = 512, h = 128, font = '700 64px Georgia, serif', color = '#ffffff', shadow = 'rgba(0,30,50,0.5)', bg = '' } = {}) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')!
  if (bg) {
    g.fillStyle = bg
    g.fillRect(0, 0, w, h)
  }
  g.font = font
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillStyle = shadow
  g.fillText(text, w / 2 + 3, h / 2 + 3)
  g.fillStyle = color
  g.fillText(text, w / 2, h / 2)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** A flat label floating in the air, always facing you. */
export function floatingWords(text: string, scale = 1, opts: Parameters<typeof wordsTexture>[1] = {}) {
  const tex = wordsTexture(text, opts)
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }))
  const w = (opts.w ?? 512) / 128
  const h = (opts.h ?? 128) / 128
  s.scale.set(w * scale, h * scale, 1)
  return s
}

/** A tiny copy of the whole town: the island, the buildings, a drop of ocean, and you. */
export function tinyTown(sea: Sea) {
  const g = new THREE.Group()
  const ground = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.1, 0.25, 40), lambert('#ecd9a4'))
  ground.position.y = 0.12
  const pink = new THREE.Mesh(new THREE.CylinderGeometry(1.31, 1.11, 0.26, 40, 1, false, 0, Math.PI), lambert('#f1c9d3'))
  pink.position.y = 0.12
  g.add(ground, pink)
  put(g, new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.26, 0.34), lambert('#6f8fd0')), -0.6, 0.38, -0.3)
  put(g, new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.18, 4), lambert('#3d4f86')), -0.6, 0.6, -0.3).rotation.y = Math.PI / 4
  put(g, new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 0), lambert('#8c7a6b', { flatShading: true })), 0.6, 0.38, -0.3)
  put(g, new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.26), lambert('#f3e6cf')), -0.2, 0.36, -0.7)
  put(g, new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.26), lambert('#ece3d3')), 0.25, 0.36, -0.7)
  const drop = put(g, new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), angled(sea.shade, { light: 0.6, emissive: 0.2 })), -0.7, 0.7, 0.4)
  const you = walker()
  you.group.scale.setScalar(0.13)
  g.add(you.group)
  you.group.position.set(0.1, 0.25, 0.3)
  return { group: g, drop, you }
}

