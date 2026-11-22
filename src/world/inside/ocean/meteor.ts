// "Light years away": dusk on a little sandbar. The blog-comment tally sheet lies on the sand; check its six
// boxes. Then a shade of blue falls from outer space into the sea, and out of the splash rises a town of
// buildings for blogposts (this one), on an island that's a little bit of a parallelogram.
import * as THREE from 'three'
import { pianoNote, tick, whoosh } from '../../../sound'
import { angled } from '../../shade'
import { clampRect, ease, follow, lambert, put, type Reality } from '../blue/kit'
import { drifters, tinyTown, water, type Sea } from './common'

const SPLASH = new THREE.Vector3(0, 0, -19)

function tallyTexture(checked: boolean[]) {
  const c = document.createElement('canvas')
  c.width = 360
  c.height = 500
  const g = c.getContext('2d')!
  g.fillStyle = '#fbf7f1'
  g.fillRect(0, 0, 360, 500)
  g.strokeStyle = '#a9c4ea'
  g.lineWidth = 2
  for (let y = 60; y < 500; y += 34) {
    g.beginPath()
    g.moveTo(0, y)
    g.lineTo(360, y)
    g.stroke()
  }
  g.fillStyle = '#2b2440'
  g.font = '700 30px Georgia, serif'
  g.fillText('comment tally', 30, 42)
  checked.forEach((on, k) => {
    const y = 90 + k * 66
    g.strokeStyle = '#2b2440'
    g.lineWidth = 4
    g.strokeRect(36, y, 40, 40)
    g.fillStyle = '#c9c4cf'
    g.fillRect(100, y + 14, 200, 12)
    if (on) {
      g.strokeStyle = '#1f8fb0'
      g.lineWidth = 7
      g.beginPath()
      g.moveTo(40, y + 20)
      g.lineTo(54, y + 36)
      g.lineTo(84, y - 6)
      g.stroke()
    }
  })
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export function lightYears(sea: Sea): Reality {
  const g = new THREE.Group()
  const sea_ = water(sea)
  g.add(sea_.mesh)
  const sand = new THREE.Mesh(new THREE.CircleGeometry(7, 40), lambert('#e9d3a2'))
  sand.rotation.x = -Math.PI / 2
  sand.position.set(0, 0.01, 2)
  sand.scale.set(1, 0.85, 1)
  sand.receiveShadow = true
  g.add(sand)

  // Stars come out overhead.
  const starGeo = new THREE.BufferGeometry()
  const stars: number[] = []
  for (let k = 0; k < 500; k++) {
    const a = Math.random() * Math.PI * 2
    const e = 0.1 + Math.random() * 0.9
    stars.push(Math.cos(a) * 90 * Math.cos(e), Math.sin(e) * 70, Math.sin(a) * 90 * Math.cos(e) - 30)
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(stars, 3))
  g.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#fff6dc', size: 0.35, fog: false })))

  // The tally sheet, with six boxes to check.
  const checked = [false, false, false, false, false, false]
  const sheetMat = new THREE.MeshLambertMaterial({ map: tallyTexture(checked) })
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 5), sheetMat)
  sheet.rotation.x = -Math.PI / 2
  sheet.rotation.z = 0.12
  sheet.position.set(0, 0.03, 2.2)
  sheet.receiveShadow = true
  g.add(sheet)
  /** Where box k sits on the sand (the sheet is 1 cm per canvas pixel, turned a little). */
  const boxAt = (k: number) => {
    const x = -1.8 + 0.56
    const y = 2.5 - (1.1 + k * 0.66)
    const r = sheet.rotation.z
    return new THREE.Vector3(x * Math.cos(r) - y * Math.sin(r), 0, sheet.position.z - (x * Math.sin(r) + y * Math.cos(r)))
  }
  let tallied = -1

  // The meteor, the splash, and the island that rises.
  const shadeMat = angled(sea.shade, { light: 0.85, chroma: 0.8, emissive: 0.9 })
  const meteor = new THREE.Mesh(new THREE.SphereGeometry(0.9, 20, 14), shadeMat)
  const trail = new THREE.Mesh(new THREE.ConeGeometry(0.85, 14, 16, 1, true), angled(sea.shade, { light: 0.9, chroma: 0.6, opacity: 0.45, emissive: 1 }))
  trail.position.y = 7
  meteor.add(trail)
  meteor.visible = false
  g.add(meteor)
  const from = new THREE.Vector3(70, 80, -130)
  const meteorLight = new THREE.PointLight('#bff3ff', 0, 40, 1.2)
  g.add(meteorLight)
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.18, 8, 48), angled(sea.shade, { light: 0.95, chroma: 0.4, emissive: 0.6, opacity: 0.9 }))
  ring.rotation.x = Math.PI / 2
  ring.position.copy(SPLASH)
  ring.visible = false
  g.add(ring)
  const spray = Array.from({ length: 40 }, () => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), shadeMat)
    m.visible = false
    g.add(m)
    return { m, v: new THREE.Vector3((Math.random() - 0.5) * 9, 6 + Math.random() * 8, (Math.random() - 0.5) * 9) }
  })
  // The island: a parallelogram, of course.
  const island = new THREE.Group()
  const slab = put(island, new THREE.Mesh(new THREE.BoxGeometry(9, 1.2, 7), lambert('#ecd9a4')), 0, -0.6, 0)
  slab.geometry.applyMatrix4(new THREE.Matrix4().makeShear(0, 0, 0, 0, 0.35, 0))
  const town = tinyTown(sea)
  town.group.scale.setScalar(3.4)
  island.add(town.group)
  // "Oh, riddle me' timbers": a little flag.
  put(island, new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), lambert('#4a4855')), 3.4, 1.2, 2.2)
  const flag = put(island, new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.55), new THREE.MeshLambertMaterial({ color: '#2b2440', side: THREE.DoubleSide })), 3.85, 2.1, 2.2)
  island.position.copy(SPLASH).setY(-5)
  island.visible = false
  g.add(island)
  const bridge = put(g, new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.3, 11), lambert('#e9d3a2')), 0, -2, -9.6)

  const drift = drifters(g, sea, { x: 0, z: 0, w: 6, d: 5 }, 5)
  let now = 0
  let entered = 0
  let fallAt = -1

  return {
    group: g,
    spawn: new THREE.Vector3(0, 0, 6.5),
    facing: Math.PI,
    sky: '#1d2a55',
    fog: [50, 160],
    skyNow: () => new THREE.Color('#1d2a55').lerp(new THREE.Color().setHSL(sea.shade.uBase.value, 0.5, 0.3), 0.35 + (fallAt >= 0 ? Math.max(0, 0.4 - (now - fallAt - 2.5) * 0.2) : 0)),
    light: { hemi: 0.6, sun: 1.3, sunColor: '#c9d8ff', target: new THREE.Vector3(0, 0, -6), from: new THREE.Vector3(0.6, 1, 0.4) },
    camera: (me, t, out) => {
      follow(9.5, 6.5, 4)(me, t, out)
      // Look up for the meteor as it comes.
      if (fallAt >= 0) {
        const k = Math.min(1, (t - fallAt) / 1.2) * Math.max(0, 1 - Math.max(0, t - fallAt - 3) / 1.5)
        out.look.lerp(new THREE.Vector3(SPLASH.x, 9, SPLASH.z), k * 0.7)
      }
    },
    walk: (me) => {
      const up = fallAt >= 0 && now - fallAt > 5.5
      // The sandbar, then (once it's risen) the bridge and the island.
      if (up && me.z < -3) {
        if (me.z > SPLASH.z + 3.2) me.x = Math.max(-1, Math.min(1, me.x))
        else clampRect(me, SPLASH.x - 4, SPLASH.x + 4, SPLASH.z - 3, SPLASH.z + 3.2)
        me.z = Math.max(SPLASH.z - 3, me.z)
        return true
      }
      const dx = me.x / 6.6
      const dz = (me.z - 2) / 5.6
      const d = Math.hypot(dx, dz)
      if (d > 1) {
        me.x /= d
        me.z = 2 + (me.z - 2) / d
      }
      return true
    },
    enter: (t) => {
      entered = t
    },
    update: (t, dt, me) => {
      now = t
      sea_.update(t)
      drift(t, dt, me)
      // Check the boxes by walking over them.
      checked.forEach((on, k) => {
        if (on) return
        const b = boxAt(k)
        if (Math.hypot(me.x - b.x, me.z - b.z) < 0.55) {
          checked[k] = true
          tick()
          const old = sheetMat.map
          sheetMat.map = tallyTexture(checked)
          old?.dispose()
          if (checked.every(Boolean)) tallied = t
        }
      })
      // Done tallying (or waited long enough): a shade of blue hits from outer space.
      if (fallAt < 0 && ((tallied >= 0 && t - tallied > 1.2) || t - entered > 30)) {
        fallAt = t
        meteor.visible = true
        whoosh()
      }
      if (fallAt >= 0) {
        const k = (t - fallAt) / 2.5
        if (k < 1) {
          meteor.position.lerpVectors(from, SPLASH, k * k)
          meteor.lookAt(from)
          meteor.rotateX(Math.PI / 2)
          meteorLight.position.copy(meteor.position)
          meteorLight.intensity = 30
        } else {
          meteor.visible = false
          meteorLight.intensity = Math.max(0, 30 - (k - 1) * 30)
          if (!ring.visible && k < 1.1) {
            ring.visible = true
            spray.forEach((s) => {
              s.m.visible = true
              s.m.position.copy(SPLASH)
            })
            ;[0, 7, 12, 16].forEach((n, j) => window.setTimeout(() => pianoNote(n + 3), j * 90))
          }
          const a = t - fallAt - 2.5
          ring.scale.setScalar(1 + a * 9)
          ;(ring.material as THREE.MeshLambertMaterial).opacity = Math.max(0, 0.9 - a * 0.35)
          spray.forEach((s) => {
            s.m.position.copy(SPLASH).addScaledVector(s.v, a).setY(Math.max(-1, s.v.y * a - 11 * a * a))
          })
          // The island rises out of the splash, and the bridge with it.
          const r = ease((a - 0.6) / 2.2)
          island.visible = a > 0.5
          island.position.y = -5 + r * 5.6
          bridge.position.y = -2 + ease((a - 1.8) / 1.4) * 1.9
        }
      }
      flag.rotation.y = Math.sin(t * 3) * 0.3
      town.drop.position.y = 0.7 + Math.sin(t * 1.5) * 0.05
    },
    goal: () => fallAt >= 0 && now - fallAt > 6,
    timeout: Infinity,
    portal: new THREE.Vector3(SPLASH.x + 2.6, 0, SPLASH.z - 1.4),
    portalFacing: 0,
    hint: (me) => {
      if (fallAt < 0) {
        const k = checked.findIndex((on) => !on)
        return k >= 0 ? boxAt(k) : me
      }
      return new THREE.Vector3(0, 0, SPLASH.z)
    },
    clicks: [],
  }
}
