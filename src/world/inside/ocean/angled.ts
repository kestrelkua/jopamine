// "Angled": the world splits down the middle. On one side, a flat grey page of just words; on the other, the
// sea in every shade. You walk the seam. A glass prism stands on it: walk around it and the camera goes with
// you, so every colour turns with your angle. At the end, drop your shade of blue into the sea.
import * as THREE from 'three'
import { pianoNote } from '../../../sound'
import { angled, shadeColor } from '../../shade'
import { clampRect, follow, lambert, pushOut, type Reality } from '../blue/kit'
import { drifters, floatingWords, water, type Sea } from './common'

const PRISM = new THREE.Vector3(0, 0, -9)
const EDGE_X = 7.5

/** A page of plain grey words: what a post looks like when it's just words. */
function pageTexture(text: string) {
  const c = document.createElement('canvas')
  c.width = 768
  c.height = 1536
  const g = c.getContext('2d')!
  g.fillStyle = '#f4f4f2'
  g.fillRect(0, 0, 768, 1536)
  g.fillStyle = '#8a8a8a'
  g.font = '400 30px Arial, sans-serif'
  const words = text.split(/\s+/)
  let line = ''
  let y = 90
  for (const w of words) {
    if (g.measureText(line + w).width > 660) {
      g.fillText(line, 54, y)
      line = ''
      y += 44
      if (y > 1500) break
    }
    line += w + ' '
  }
  if (y <= 1500) g.fillText(line, 54, y)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export function angledEnd(sea: Sea): Reality {
  const g = new THREE.Group()
  const sea_ = water(sea, 120)
  sea_.mesh.position.x = 62
  g.add(sea_.mesh)
  // The coloured side: sand along the seam.
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(EDGE_X + 0.5, 34), lambert('#f1dcae'))
  sand.rotation.x = -Math.PI / 2
  sand.position.set((EDGE_X + 0.5) / 2, 0.01, -7)
  sand.receiveShadow = true
  g.add(sand)
  // The grey side: a flat page of words, as far as you can see.
  const allText = sea.sections.flatMap((s) => s.blocks.map((b) => ('text' in b ? b.text : ''))).join(' ')
  const page = new THREE.Mesh(new THREE.PlaneGeometry(40, 80), new THREE.MeshBasicMaterial({ map: pageTexture(allText) }))
  page.rotation.x = -Math.PI / 2
  page.position.set(-20, 0.015, -14)
  g.add(page)
  const greyGround = new THREE.Mesh(new THREE.PlaneGeometry(120, 160), new THREE.MeshBasicMaterial({ color: '#dedede' }))
  greyGround.rotation.x = -Math.PI / 2
  greyGround.position.set(-60, 0, -14)
  g.add(greyGround)
  // The seam itself.
  const seam = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 34), new THREE.MeshBasicMaterial({ color: '#2b2440' }))
  seam.rotation.x = -Math.PI / 2
  seam.position.set(0, 0.03, -7)
  g.add(seam)

  // The prism.
  const prism = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 4.5, 3), angled(sea.shade, { light: 0.8, chroma: 0.9, opacity: 0.75, emissive: 0.35 }))
  prism.position.copy(PRISM).setY(2.6)
  prism.castShadow = true
  g.add(prism)
  const question = floatingWords('Do you think colors can become angled??', 1.1, { w: 1536, h: 128, font: 'italic 700 64px Georgia, serif', color: '#ffffff', shadow: 'rgba(0,0,0,0.35)' })
  question.position.copy(PRISM).setY(7.2)
  g.add(question)

  // Your shade, following you, to give back to the sea.
  const mine = new THREE.Mesh(new THREE.SphereGeometry(0.26, 18, 14), new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.4 }))
  g.add(mine)
  const ripple = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.1, 48), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }))
  ripple.rotation.x = -Math.PI / 2
  g.add(ripple)
  let dropped = -1
  const dropAt = new THREE.Vector3()

  const drift = drifters(g, sea, { x: 4, z: -7, w: 3.5, d: 12 }, 6)
  let now = 0
  let yaw = 0

  return {
    group: g,
    spawn: new THREE.Vector3(0, 0, 5),
    facing: Math.PI,
    sky: '#bfe6f2',
    fog: [40, 120],
    skyNow: () => shadeColor(sea.shade, { light: 0.8, chroma: 0.6, offset: yaw * 0.08 }),
    light: { hemi: 1.1, sun: 2.4, sunColor: '#fff4dc', target: new THREE.Vector3(0, 0, -8), from: new THREE.Vector3(0.6, 1, 0.5) },
    camera: (me, t, out) => {
      follow(9, 6.5, 3)(me, t, out)
      // Near the prism, the camera circles it with you: walk around it and the whole world turns colour.
      const toMe = new THREE.Vector3(me.x - PRISM.x, 0, me.z - PRISM.z)
      const d = toMe.length()
      const k = Math.max(0, Math.min(1, (10 - d) / 4))
      if (k > 0) {
        yaw = Math.atan2(toMe.x, toMe.z)
        const orbit = PRISM.clone().addScaledVector(toMe.normalize(), d + 7.5).setY(5.5)
        out.pos.lerp(orbit, k)
        out.look.lerp(PRISM.clone().setY(2.2), k)
      }
    },
    walk: (me) => {
      clampRect(me, -10, EDGE_X - 0.3, -22, 6.5)
      pushOut(me, PRISM.x, PRISM.z, 2.1)
      return true
    },
    update: (t, dt, me) => {
      now = t
      sea_.update(t)
      drift(t, dt, me)
      // The angle you're at swings the shade further here than anywhere else.
      sea.shade.uSpread.value = 0.09 + Math.min(1, Math.max(0, (10 - Math.hypot(me.x - PRISM.x, me.z - PRISM.z)) / 4)) * 0.2
      prism.rotation.y = t * 0.25
      question.material.opacity = Math.min(1, Math.max(0, (14 - Math.hypot(me.x - PRISM.x, me.z - PRISM.z)) / 6))
      const c = new THREE.Color().setHSL(sea.picked ?? 0.53, 0.75, 0.58)
      ;(mine.material as THREE.MeshLambertMaterial).color.copy(c)
      ;(mine.material as THREE.MeshLambertMaterial).emissive.copy(c)
      if (dropped < 0) {
        mine.position.lerp(new THREE.Vector3(me.x + 0.6, 2.1 + Math.sin(t * 3) * 0.08, me.z + 0.2), 0.12)
        if (me.x > EDGE_X - 0.8) {
          dropped = t
          dropAt.set(EDGE_X + 1.5, 0, me.z)
          ;[0, 4, 7, 12, 16].forEach((n, j) => window.setTimeout(() => pianoNote(n + 5), j * 130))
        }
      } else {
        // It arcs into the sea, and its colour spreads out in a ring.
        const k = Math.min(1, (t - dropped) / 0.9)
        mine.position.lerpVectors(mine.position, dropAt, k * 0.25)
        mine.position.y = Math.max(-0.4, 2.1 * (1 - k) + Math.sin(k * Math.PI) * 1.2)
        mine.visible = k < 1
        const r = t - dropped - 0.9
        if (r > 0) {
          ripple.position.copy(dropAt).setY(0.05)
          ripple.scale.setScalar(1 + r * 6)
          const m = ripple.material as THREE.MeshBasicMaterial
          m.color.copy(c)
          m.opacity = Math.max(0, 0.8 - r * 0.2)
        }
      }
    },
    goal: () => dropped >= 0 && now - dropped > 2,
    timeout: 60,
    portal: new THREE.Vector3(2.5, 0, -19),
    portalFacing: 0,
    hint: (me) => (dropped < 0 ? (Math.hypot(me.x - PRISM.x, me.z - PRISM.z) > 6 && me.z > PRISM.z ? PRISM.clone().add(new THREE.Vector3(3, 0, 2)) : new THREE.Vector3(EDGE_X - 0.5, 0, me.z)) : null),
    clicks: [],
  }
}
