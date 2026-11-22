// "No stops": no story card here. The words are written line after line across a ribbon of light on the
// sea, and you read them by walking: a picture book without the discrete linear stops. A fruit fly buzzes
// around you; stand still and time slows down (as it does for the fly). Try to swat it. You can't.
import * as THREE from 'three'
import type { Section } from '../../../content/types'
import { tick, whoosh } from '../../../sound'
import { angled, shadeColor } from '../../shade'
import { ease, lambert, type Click, type Reality } from '../blue/kit'
import { drifters, water, type Sea } from './common'

const LINE_GAP = 1.05
const WIDTH = 6.4
const CHARS = 36

function wrap(text: string) {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    if ((line + ' ' + word).trim().length > CHARS) {
      lines.push(line.trim())
      line = word
    } else line += ' ' + word
  }
  if (line.trim()) lines.push(line.trim())
  return lines
}

function lineTexture(text: string) {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 96
  const g = c.getContext('2d')!
  g.font = '600 50px Georgia, serif'
  g.textBaseline = 'middle'
  g.fillStyle = 'rgba(0, 30, 50, 0.45)'
  g.fillText(text, 26, 51)
  g.fillStyle = '#ffffff'
  g.fillText(text, 22, 48)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

export function noStops(sea: Sea, section: Section | undefined): Reality {
  const g = new THREE.Group()
  const clicks: Click[] = []
  const sea_ = water(sea)
  g.add(sea_.mesh)

  const text = (section?.blocks ?? []).map((b) => ('text' in b ? b.text : '')).join(' ')
  const lines = wrap(text)
  const length = lines.length * LINE_GAP + 8
  // The path curves gently, like a line of thought.
  const at = (s: number) => new THREE.Vector3(Math.sin(s * 0.07) * 3, 0, 3 - s)
  const tangentAt = (s: number) => at(s + 0.5).sub(at(s - 0.5)).normalize()

  // The ribbon of light you walk on.
  const pts: THREE.Vector3[] = []
  for (let s = -3; s <= length + 3; s += 1) pts.push(at(s))
  const ribbonGeo = new THREE.BufferGeometry()
  const pos: number[] = []
  const idx: number[] = []
  pts.forEach((p, k) => {
    const tng = tangentAt(-3 + k)
    const side = new THREE.Vector3(-tng.z, 0, tng.x).multiplyScalar(WIDTH / 2 + 0.4)
    pos.push(p.x - side.x, 0.02, p.z - side.z, p.x + side.x, 0.02, p.z + side.z)
    if (k > 0) {
      const a = (k - 1) * 2
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  })
  ribbonGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  ribbonGeo.setIndex(idx)
  ribbonGeo.computeVertexNormals()
  const ribbon = new THREE.Mesh(ribbonGeo, angled(sea.shade, { light: 0.36, chroma: 0.8, opacity: 0.9, emissive: 0.1, side: THREE.DoubleSide }))
  ribbon.receiveShadow = true
  g.add(ribbon)

  // The words, one line after another across the ribbon.
  const words = lines.map((line, k) => {
    const mat = new THREE.MeshBasicMaterial({ map: lineTexture(line), transparent: true, opacity: 0, depthWrite: false })
    const m = new THREE.Mesh(new THREE.PlaneGeometry(WIDTH, WIDTH * (96 / 1024)), mat)
    const s = 2 + k * LINE_GAP
    const p = at(s)
    const tng = tangentAt(s)
    m.rotation.order = 'YXZ'
    m.rotation.set(-Math.PI / 2, Math.atan2(-tng.x, -tng.z), 0)
    m.position.set(p.x, 0.05, p.z)
    g.add(m)
    return { m, mat, s }
  })

  // The fruit fly, and the newspaper you'll never hit it with.
  const fly = new THREE.Group()
  const flyBody = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), lambert('#2b2440'))
  flyBody.scale.set(1.4, 1, 1)
  const eyeMat = lambert('#c0392b')
  for (const z of [-0.035, 0.035]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), eyeMat)
    e.position.set(0.08, 0.02, z)
    fly.add(e)
  }
  const wingMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, side: THREE.DoubleSide })
  const wings = [-1, 1].map((sd) => {
    const w = new THREE.Mesh(new THREE.CircleGeometry(0.08, 10), wingMat)
    w.position.set(-0.02, 0.05, sd * 0.06)
    fly.add(w)
    return w
  })
  fly.add(flyBody)
  // A generous invisible target so it's easy to try.
  fly.add(new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshBasicMaterial({ visible: false })))
  g.add(fly)
  const paper = new THREE.Group()
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.1, 12), lambert('#e8e4dc'))
  roll.rotation.z = Math.PI / 2
  roll.position.x = 0.55
  paper.add(roll)
  paper.visible = false
  g.add(paper)
  let swatAt = -10
  const swatTarget = new THREE.Vector3()
  const dodge = new THREE.Vector3()
  clicks.push({
    obj: fly,
    fn: () => {
      if (now - swatAt < 0.6) return
      swatAt = now
      swatTarget.copy(fly.position)
      // It sees it coming, in slow motion, and is already somewhere else.
      dodge.set((Math.random() - 0.5) * 2.4, 0.6 + Math.random() * 0.6, (Math.random() - 0.5) * 2.4)
      whoosh()
    },
  })

  const drift = drifters(g, sea, { x: 0, z: -length / 2, w: 5, d: length / 2 }, 6)
  let now = 0
  let still = 0
  let slow = 0
  let tt = 0
  let near = 0
  const last = new THREE.Vector3()
  const flyHome = new THREE.Vector3()

  const nearestS = (p: THREE.Vector3) => {
    let best = 0
    let bestD = Infinity
    for (let s = Math.max(-3, near - 6); s <= Math.min(length + 3, near + 6); s += 0.25) {
      const q = at(s)
      const d = (q.x - p.x) ** 2 + (q.z - p.z) ** 2
      if (d < bestD) {
        bestD = d
        best = s
      }
    }
    return best
  }

  return {
    group: g,
    noCard: true,
    spawn: at(-1.5),
    facing: Math.PI,
    sky: '#bfe6f2',
    fog: [30, 90],
    skyNow: () => shadeColor(sea.shade, { light: 0.82 - slow * 0.25, chroma: 0.5 }),
    light: { hemi: 1.1, sun: 2.2, sunColor: '#fff4dc', target: new THREE.Vector3(0, 0, -10), from: new THREE.Vector3(0.3, 1, 0.5) },
    camera: (me, _t, out) => {
      // Up and behind, looking down the page.
      const s = nearestS(me)
      const tng = tangentAt(s)
      out.pos.set(me.x - tng.x * 5.5, 7.2, me.z - tng.z * 5.5)
      out.look.copy(at(s + 4.5)).setY(0)
    },
    walk: (me) => {
      const s = nearestS(me)
      near = s
      const c = at(s)
      const off = new THREE.Vector3(me.x - c.x, 0, me.z - c.z)
      const lim = WIDTH / 2 + 0.2
      if (off.length() > lim) off.setLength(lim)
      me.x = c.x + off.x
      me.z = c.z + off.z
      if (s < -2.5) me.copy(at(-2.5)).add(off)
      return true
    },
    update: (t, dt, me) => {
      now = t
      // Standing still, time slows down: the more you take in, the slower you experience.
      still = me.distanceTo(last) < 0.002 ? still + dt : 0
      last.copy(me)
      slow += ((still > 0.7 ? 1 : 0) - slow) * Math.min(1, dt * 2.5)
      const step = dt * (1 - slow * 0.85)
      tt += step
      sea_.update(tt)
      drift(tt, step, me)
      // The words ahead come up out of the water as you get near them.
      const s = nearestS(me)
      words.forEach((w) => {
        const want = w.s < s + 11 ? 1 : w.s < s + 15 ? 0.25 : 0
        w.mat.opacity += (want - w.mat.opacity) * Math.min(1, dt * 3)
      })
      // The fly orbits your head, never quite still.
      flyHome.set(me.x + Math.sin(tt * 2.3) * 1.1 + Math.sin(tt * 7.1) * 0.25, 1.7 + Math.sin(tt * 3.7) * 0.35, me.z + Math.cos(tt * 1.9) * 1.1 + Math.cos(tt * 6.3) * 0.25)
      const sinceSwat = t - swatAt
      if (sinceSwat < 0.9) flyHome.add(dodge.clone().multiplyScalar(Math.min(1, sinceSwat * 6)))
      fly.position.lerp(flyHome, Math.min(1, step * 8))
      fly.rotation.y = Math.atan2(-(flyHome.x - fly.position.x), flyHome.z - fly.position.z) + Math.PI / 2
      wings.forEach((w, k) => (w.rotation.x = (k ? 1 : -1) * (0.4 + Math.sin(tt * 90) * 0.5)))
      // The swat: a rolled newspaper comes down where the fly was a moment ago.
      paper.visible = sinceSwat < 0.6
      if (paper.visible) {
        const k = ease(sinceSwat / 0.22)
        paper.position.copy(swatTarget).add(new THREE.Vector3(-0.5, 0, 0))
        paper.rotation.z = 1.4 * (1 - k)
        if (sinceSwat > 0.2 && sinceSwat - dt <= 0.2) tick()
      }
    },
    goal: () => near > length - 4,
    timeout: Infinity,
    get portal() {
      return at(length + 0.5)
    },
    portalFacing: 0,
    hint: () => at(Math.min(length, near + 4)),
    clicks,
    fx: () => ({ slow }),
  }
}
