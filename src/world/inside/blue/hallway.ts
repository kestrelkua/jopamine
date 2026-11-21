// "Ding!": the room stretches into an endless hallway. However far you walk, the window stays just as far,
// like the waiting. People pass outside it. Spot the courier in the blue smiley vest and the hallway snaps short.
import * as THREE from 'three'
import { ding } from '../../../sound'
import { person } from '../../parts'
import { babyTexture, type Click, clock, ease, lambert, put, type Reality, smileyTexture } from './kit'

const HW = 2.2 // half the hallway's width
const TILE = 4
const AHEAD = 11 // how far ahead the window stays while you wait

export function endlessHallway(): Reality {
  const g = new THREE.Group()
  const clicks: Click[] = []
  const wall = lambert('#8fb0ea')
  const lower = lambert('#5d7cc2')
  const trim = lambert('#f4efe4')
  const carpet = lambert('#4a62a8')

  // Hallway pieces, recycled as you walk so it never ends.
  const tiles = Array.from({ length: 14 }, (_, k) => {
    const t = new THREE.Group()
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(HW * 2, TILE), carpet)
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    t.add(floor)
    for (const side of [-1, 1]) {
      put(t, new THREE.Mesh(new THREE.BoxGeometry(0.2, 4, TILE), wall), side * (HW + 0.1), 2, 0)
      put(t, new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.05, TILE), lower), side * (HW - 0.02), 0.52, 0)
      put(t, new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, TILE), trim), side * (HW - 0.04), 1.05, 0)
      // The same baby photos, over and over down the hall.
      if ((k + (side > 0 ? 1 : 0)) % 2 === 0) {
        const f = new THREE.Group()
        put(f, new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.76, 0.62), lambert('#c9a46b')))
        const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.64), new THREE.MeshLambertMaterial({ map: babyTexture(k) }))
        pic.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2
        pic.position.x = -side * 0.03
        f.add(pic)
        f.position.set(side * (HW - 0.05), 2.4, 0)
        t.add(f)
      }
    }
    g.add(t)
    return t
  })

  // The far end: a wall with the window, and the street outside it.
  const end = new THREE.Group()
  const W0 = -1.5
  const W1 = 1.5
  put(end, new THREE.Mesh(new THREE.BoxGeometry(HW + W0 + 0.2, 4, 0.3), wall), (-HW - 0.2 + W0) / 2, 2, 0)
  put(end, new THREE.Mesh(new THREE.BoxGeometry(HW - W1 + 0.2, 4, 0.3), wall), (HW + 0.2 + W1) / 2, 2, 0)
  put(end, new THREE.Mesh(new THREE.BoxGeometry(W1 - W0, 0.9, 0.3), wall), 0, 0.45, 0)
  put(end, new THREE.Mesh(new THREE.BoxGeometry(W1 - W0, 0.7, 0.3), wall), 0, 3.65, 0)
  put(end, new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.4, 0.16), trim), 0, 2.1, 0)
  put(end, new THREE.Mesh(new THREE.BoxGeometry(W1 - W0, 0.1, 0.16), trim), 0, 2.1, 0)
  const paneMat = new THREE.MeshBasicMaterial({ color: '#fff1c8', transparent: true, opacity: 0, depthWrite: false })
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(W1 - W0, 2.4), paneMat)
  pane.position.set(0, 2.1, 0.02)
  end.add(pane)
  // Outside.
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), lambert('#9cc59a'))
  grass.rotation.x = -Math.PI / 2
  grass.position.set(0, -0.02, -15)
  end.add(grass)
  const walk = new THREE.Mesh(new THREE.PlaneGeometry(60, 1.8), lambert('#d9d4cc'))
  walk.rotation.x = -Math.PI / 2
  walk.position.set(0, 0, -5)
  end.add(walk)
  for (let k = 0; k < 4; k++) {
    put(end, new THREE.Mesh(new THREE.BoxGeometry(4, 2.8, 3), lambert(['#e8c9a0', '#c9d8b6', '#e3b8c4', '#bcc8e8'][k])), -9 + k * 6, 1.4, -14)
    const roof = put(end, new THREE.Mesh(new THREE.ConeGeometry(3, 1.4, 4), lambert('#8a5a4a', { flatShading: true })), -9 + k * 6, 3.5, -14)
    roof.rotation.y = Math.PI / 4
  }
  g.add(end)

  const passers = ['#c96f4a', '#5a8a5a', '#8a6aa8'].map((coat, k) => {
    const p = person(coat)
    put(end, p.group)
    return { p, x: -9 + k * 7, dir: k % 2 ? 1 : -1, speed: 0.9 + k * 0.2 }
  })
  const courier = person('#3d6fd8')
  const smiley = new THREE.Mesh(new THREE.CircleGeometry(0.14, 20), new THREE.MeshBasicMaterial({ map: smileyTexture() }))
  smiley.position.set(0, 0.75, 0.35)
  courier.body.add(smiley)
  put(courier.body, new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.36, 0.4), lambert('#c99a62')), 0, 0.75, 0.55)
  courier.arms.forEach((a) => (a.rotation.x = -1.2))
  // He's far away: a generous invisible target makes him easy to click.
  courier.group.add(new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.4, 1.2), new THREE.MeshBasicMaterial({ visible: false })).translateY(1.1))
  put(end, courier.group, 9, 0, -4.8)

  const state = { enteredAt: -1, spotted: -1, x: 9, endZ: -AHEAD, collapse: -1, fromZ: 0, toZ: 0 }
  clicks.push({
    obj: courier.group,
    fn: () => {
      if (state.spotted >= 0) return
      state.spotted = clock.t
      ding()
    },
  })

  return {
    group: g,
    spawn: new THREE.Vector3(0, 0, 0),
    facing: Math.PI,
    sky: '#bcd7f2',
    fog: [30, 70],
    light: { hemi: 1.0, sun: 2.2, sunColor: '#fff0d6', target: new THREE.Vector3(0, 0, -6), from: new THREE.Vector3(0.4, 1, -0.6) },
    camera: (me, _t, out) => {
      out.pos.set(me.x * 0.5, 3.1, me.z + 5.6)
      out.look.set(0, 1.7, me.z - 12)
    },
    walk: (me) => {
      me.x = Math.max(-HW + 0.5, Math.min(HW - 0.5, me.x))
      me.z = Math.min(2, Math.max(end.position.z + 0.6, me.z))
      return true
    },
    enter: (t) => {
      state.enteredAt = t
    },
    update: (t, dt, me) => {
      // The window stays AHEAD metres away while you wait; once you spot the courier, the hallway snaps short.
      if (state.spotted < 0 && t - state.enteredAt > 32) {
        // Missed him: he rings anyway.
        state.spotted = t
        ding()
        window.setTimeout(ding, 260)
      }
      if (state.spotted < 0) state.endZ = Math.min(me.z - AHEAD, state.endZ)
      else {
        if (state.collapse < 0) {
          state.collapse = t
          state.fromZ = state.endZ
          state.toZ = me.z - 3.2
        }
        // The far window rushes up to just ahead of you, and stays there.
        state.endZ = state.fromZ + (state.toZ - state.fromZ) * ease((t - state.collapse) / 1.3)
      }
      end.position.z = state.endZ
      // Recycle the hallway's pieces between you and the window.
      const base = Math.floor(me.z / TILE) * TILE
      tiles.forEach((tl, k) => {
        const z = base + 4 - k * TILE
        tl.position.z = z
        tl.visible = z - TILE / 2 > end.position.z - 0.2
      })
      passers.forEach((p) => {
        p.x += p.dir * p.speed * dt
        if (p.x > 12) p.x = -12
        if (p.x < -12) p.x = 12
        p.p.group.position.set(p.x, 0, -5 + (p.dir > 0 ? 0.3 : -0.3))
        p.p.group.rotation.y = p.dir > 0 ? Math.PI / 2 : -Math.PI / 2
        p.p.body.position.y = Math.abs(Math.sin(t * 6 + p.x)) * 0.06
      })
      // The courier walks back and forth past the window until you spot him; then he waves.
      if (state.spotted < 0) {
        state.x -= dt * 1.2
        if (state.x < -9) state.x = 9
        courier.group.position.set(state.x, 0, -5)
        courier.group.rotation.y = -Math.PI / 2
      } else {
        courier.group.rotation.y = 0
        courier.arms[1].rotation.set(0, 0, 2.6 + Math.sin(t * 12) * 0.3)
      }
      courier.body.position.y = Math.abs(Math.sin(t * 6)) * 0.06
    },
    goal: () => state.spotted >= 0 && state.collapse >= 0 && clock.t - state.collapse > 1.3,
    timeout: Infinity,
    get portal() {
      return new THREE.Vector3(0, 0, end.position.z + 0.6)
    },
    portalFacing: 0,
    hint: () => courier.group.position.clone().add(end.position).setY(0).setZ(end.position.z + 1),
    clicks,
    ownPortal: (open, t) => {
      paneMat.opacity = open * (0.7 + Math.sin(t * 3) * 0.2)
    },
  }
}
