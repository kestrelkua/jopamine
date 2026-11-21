// "What's in the box": you're inside it. Cardboard walls, the flaps open overhead, and the cats, enormous,
// peering in over the edge. The uniform lies on the floor; it needs to get out of the box.
import * as THREE from 'three'
import { tick } from '../../../sound'
import { cat } from '../../parts'
import { boxPrintTexture, clampRect, clock, cube, ease, follow, lambert, put, type Reality } from './kit'

const S = 6 // half the box's width
const H = 6

export function insideBox(): Reality {
  const g = new THREE.Group()
  const card = lambert('#c99a62')
  const cardDark = lambert('#b5884f')

  cube(g, S * 2, 0.4, S * 2, 0, -0.2, 0, cardDark)
  // Walls (no front one, so you can see in), seams of tape, and printing.
  cube(g, S * 2, H, 0.3, 0, H / 2, -S, card)
  cube(g, 0.3, H, S * 2, -S, H / 2, 0, card)
  cube(g, 0.3, H, S * 2, S, H / 2, 0, card)
  const tape = lambert('#e8d6a8')
  cube(g, 1.2, H, 0.05, 0, H / 2, -S + 0.18, tape)
  cube(g, S * 2, 0.05, 1.2, 0, 0.02, 0, tape)
  const print = new THREE.Mesh(new THREE.PlaneGeometry(5, 2.5), new THREE.MeshBasicMaterial({ map: boxPrintTexture(), transparent: true }))
  print.position.set(-S + 0.17, 4.5, 0)
  print.rotation.y = Math.PI / 2
  g.add(print)
  // Flaps open at the top.
  const flapBack = put(g, new THREE.Mesh(new THREE.BoxGeometry(S * 2, 0.2, 5), card), 0, H + 1.8, -S - 1.9)
  flapBack.rotation.x = -1.1
  const flapL = put(g, new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, S * 2), card), -S - 1.6, H + 1.4, 0)
  flapL.rotation.z = 1.1
  const flapR = put(g, new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, S * 2), card), S + 1.6, H + 1.4, 0)
  flapR.rotation.z = -1.1

  // The cats, enormous, looking in over the edge.
  const giants = [
    { fur: '#e0904a', x: -2.5, z: -S - 1.4, ry: -Math.PI / 2 },
    { fur: '#2f2a33', x: S + 1.4, z: -1, ry: Math.PI },
    { fur: '#9a9aa2', x: -S - 1.4, z: 2, ry: 0 },
  ].map((c, k) => {
    const kitty = cat(c.fur)
    kitty.group.scale.setScalar(7)
    kitty.group.rotation.y = c.ry
    kitty.group.rotation.z = -0.5
    put(g, kitty.group, c.x, H - 1.1, c.z)
    return { ...kitty, k, base: kitty.group.position.clone() }
  })

  // The uniform, folded on the floor.
  const uniform = new THREE.Group()
  const navy = lambert('#2c3e6b')
  put(uniform, new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.7, 0.3), navy))
  for (const sd of [-1, 1]) put(uniform, new THREE.Mesh(new THREE.BoxGeometry(1, 0.38, 0.3), navy), sd * 1.05, 0.55, 0).rotation.z = sd * -0.5
  put(uniform, new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.32), lambert('#f4efe4')), 0, 0.86, 0)
  for (let k = 0; k < 3; k++) put(uniform, new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), lambert('#f2b134')), 0, 0.4 - k * 0.35, 0.17)
  uniform.rotation.x = -Math.PI / 2
  put(g, uniform, 0, 0.18, -1.5)

  let freed = -1

  return {
    group: g,
    spawn: new THREE.Vector3(0, 0, 4),
    facing: Math.PI,
    sky: '#8fb0ea',
    fog: null,
    light: { hemi: 0.9, sun: 2.4, sunColor: '#fff0d6', target: new THREE.Vector3(0, 0, 0), from: new THREE.Vector3(0.3, 1, 0.5) },
    camera: (me, t, out) => {
      follow(9.5, 7, 1)(me, t, out)
      out.look.y = 3
      // When the uniform rises, look up after it.
      if (freed >= 0) out.look.y = 3 + ease((t - freed) / 2.5) * 5
    },
    walk: (me) => {
      clampRect(me, -S + 0.6, S - 0.6, -S + 0.6, S + 1.5)
      return true
    },
    update: (t, _dt, me) => {
      if (freed < 0 && Math.hypot(me.x - uniform.position.x, me.z - uniform.position.z) < 1.4) {
        freed = t
        tick()
      }
      if (freed >= 0) {
        // It unfolds, stands, then rises out through the open top and away.
        const k = t - freed
        uniform.rotation.x = -Math.PI / 2 * (1 - ease(k / 0.8))
        uniform.position.y = 0.18 + ease(k / 0.8) * 1.2 + Math.max(0, k - 0.8) ** 1.6 * 2.2
        uniform.rotation.y = Math.max(0, k - 0.8) * 1.4
        uniform.position.x = Math.sin(k * 1.3) * 0.6
      }
      giants.forEach((c) => {
        // The giant cats lean in, blink, and follow the uniform with their heads.
        c.group.position.y = c.base.y + Math.sin(t * 0.8 + c.k) * 0.25
        c.tail.rotation.y = Math.sin(t * 1.3 + c.k) * 0.6
        const blink = (t * 0.7 + c.k * 0.37) % 4 < 0.08
        c.head.scale.y = blink ? 0.8 : 1
        c.head.position.y = freed >= 0 ? 0.28 + Math.min(0.12, (t - freed) * 0.05) : 0.28
      })
    },
    goal: () => freed >= 0 && clock.t - freed > 3,
    timeout: 30,
    portal: new THREE.Vector3(0, 0, -S + 1.2),
    portalFacing: 0,
    hint: () => (freed < 0 ? uniform.position.clone().setY(0) : null),
    clicks: [],
  }
}
