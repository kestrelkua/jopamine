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

/** A wide sea that moves a little. */
export function water(sea: Sea, size = 160) {
  const geo = new THREE.PlaneGeometry(size, size, 60, 60)
  geo.rotateX(-Math.PI / 2)
  const base = (geo.attributes.position.array as Float32Array).slice()
  const m = new THREE.Mesh(geo, angled(sea.shade, { light: 0.55, chroma: 0.85 }))
  m.receiveShadow = true
  return {
    mesh: m,
    update: (t: number) => {
      const p = geo.attributes.position.array as Float32Array
      for (let i = 0; i < p.length; i += 3) p[i + 1] = base[i + 1] - 0.25 + Math.sin(base[i] * 0.35 + t * 1.1) * 0.12 + Math.cos(base[i + 2] * 0.3 + t * 0.8) * 0.12
      geo.attributes.position.needsUpdate = true
      geo.computeVertexNormals()
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

