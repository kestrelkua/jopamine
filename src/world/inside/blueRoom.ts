// The Blue Room: one room, many realities. Each part of the story takes you to a different version of the
// same room (shrunk onto the desk, floating on boxes of light, lost on the giant chair, down an endless
// hallway, adrift in a dusk sky, inside the box). Step into the glowing window to go on; the room folds
// up and unfolds as the next reality. At the end you come back to the real room and walk out the door.
import * as THREE from 'three'
import { whoosh } from '../../sound'
import { firefly, walker } from '../parts'
import { insideBox } from './blue/box'
import { giantChair } from './blue/chair'
import { deskBattle } from './blue/desk'
import { endlessHallway } from './blue/hallway'
import { clock, ease, portalWindow, type Reality } from './blue/kit'
import { boxesOfLight } from './blue/light'
import { realRoom } from './blue/room'
import { duskSky } from './blue/sky'
import type { Cave } from './cave'

export interface RoomOptions {
  /** The scene focus of each part of the story, in order: each becomes a reality. */
  stops: string[]
  onStop: (i: number) => void
  onExit: () => void
  onFirstMove: () => void
  /** Going from one reality to the next (the page flashes). */
  onWarp?: () => void
}

const SPEED = 4.4
const WARP = 1.4
const SWAP = 0.45 // fraction of the warp when the next reality takes over

const realities: Record<string, () => Reality> = {
  photos: realRoom,
  battle: deskBattle,
  sunlight: boxesOfLight,
  chair: giantChair,
  arrival: endlessHallway,
  window: duskSky,
  box: insideBox,
}

export function createBlueRoom(container: HTMLElement, opts: RoomOptions): Cave {
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  container.appendChild(renderer.domElement)
  const canvas = renderer.domElement

  const scene = new THREE.Scene()
  const hemi = new THREE.HemisphereLight('#e4ecff', '#4a4570', 1)
  const sun = new THREE.DirectionalLight('#ffffff', 2)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 100 })
  sun.shadow.camera.updateProjectionMatrix()
  sun.shadow.bias = -0.0008
  sun.shadow.normalBias = 0.02
  const sunTarget = new THREE.Object3D()
  sun.target = sunTarget
  scene.add(hemi, sun, sunTarget)

  const worlds = opts.stops.map((focus) => (realities[focus] ?? realRoom)())
  worlds.forEach((w) => {
    w.group.visible = false
    scene.add(w.group)
  })
  const home = Math.max(0, opts.stops.indexOf('photos'))
  const portal = portalWindow()
  scene.add(portal.group)

  const me = walker()
  me.group.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = true
  })
  scene.add(me.group)
  const pos = me.group.position
  const guide = firefly()
  scene.add(guide.group)

  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 300)
  let backOff = 1
  const inset = { right: 0, bottom: 0, x: 0, y: 0 }
  const resize = () => {
    const { clientWidth: w, clientHeight: h } = container
    renderer.setSize(w, h)
    camera.aspect = w / h
    backOff = Math.min(1.7, Math.max(1, (1.3 / camera.aspect) ** 0.7))
    camera.updateProjectionMatrix()
  }
  resize()
  window.addEventListener('resize', resize)

  // ---------- input ----------
  const keys = new Set<string>()
  let target: THREE.Vector3 | null = null
  let holding = false
  let gone = false
  let started = false

  // ---------- realities ----------
  let cur = 0
  let enteredAt = 0
  let openAt = -1
  let finale = false
  let warp: { at: number; from: number; to: number; swapped: boolean } | null = null
  let vy = 0
  const want = new THREE.Vector3()
  const vel = new THREE.Vector3()

  const apply = (r: Reality) => {
    const sky = new THREE.Color(r.sky)
    scene.background = sky
    scene.fog = r.fog ? new THREE.Fog(sky, r.fog[0], r.fog[1]) : null
    hemi.intensity = r.light.hemi
    sun.intensity = r.light.sun
    sun.color.set(r.light.sunColor)
  }
  const enter = (i: number, t: number) => {
    worlds.forEach((w, k) => (w.group.visible = k === i))
    cur = i
    const r = worlds[i]
    pos.copy(r.spawn)
    me.group.rotation.y = r.facing
    vel.set(0, 0, 0)
    vy = 0
    target = null
    enteredAt = t
    openAt = -1
    r.enter?.(t)
    apply(r)
    if (started) opts.onStop(finale ? worlds.length - 1 : i)
  }
  const now0 = performance.now() / 1000
  clock.t = now0
  // Local testing only: ?reality=3 starts in that reality.
  const jump = import.meta.env.DEV ? Number(new URLSearchParams(location.search).get('reality') ?? NaN) : NaN
  enter(Number.isInteger(jump) && worlds[jump] ? jump : home, now0)

  const startWarp = (t: number) => {
    if (warp) return
    const to = cur + 1 < worlds.length ? cur + 1 : home
    if (to === home && cur !== home) {
      finale = true
      worlds[home].finale?.()
    }
    warp = { at: t, from: cur, to, swapped: false }
    whoosh()
    opts.onWarp?.()
  }

  const firstMove = () => {
    if (started) return
    started = true
    opts.onFirstMove()
    opts.onStop(cur)
  }
  const onKey = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase()
    if (!['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) return
    if (e.metaKey || e.ctrlKey || e.altKey) return
    e.preventDefault()
    if (e.type === 'keydown') {
      keys.add(k)
      target = null
      firstMove()
    } else keys.delete(k)
  }
  const blur = () => keys.clear()
  window.addEventListener('keydown', onKey)
  window.addEventListener('keyup', onKey)
  window.addEventListener('blur', blur)
  const ray = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  const aim = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect()
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    ray.setFromCamera(ndc, camera)
  }
  const onDown = (e: PointerEvent) => {
    aim(e)
    firstMove()
    if (warp) return
    for (const c of worlds[cur].clicks) {
      const hit = ray.intersectObject(c.obj, true)[0]
      if (hit) return c.fn(hit)
    }
    const p = new THREE.Vector3()
    if (!ray.ray.intersectPlane(ground, p)) return
    target = p
    holding = true
    canvas.setPointerCapture(e.pointerId)
  }
  const onMove = (e: PointerEvent) => {
    aim(e)
    if (holding) {
      const p = new THREE.Vector3()
      if (ray.ray.intersectPlane(ground, p)) target = p
      return
    }
    if (e.pointerType === 'mouse') canvas.style.cursor = worlds[cur].clicks.some((c) => ray.intersectObject(c.obj, true).length) ? 'pointer' : ''
  }
  const onUp = () => (holding = false)
  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerup', onUp)
  canvas.addEventListener('pointercancel', onUp)

  // ---------- each frame ----------
  const cam = { pos: new THREE.Vector3(), look: new THREE.Vector3() }
  const look = new THREE.Vector3()
  const tmp = new THREE.Vector3()
  let step = 0
  let last = performance.now()
  let raf = 0
  const bornAt = now0
  let rushAt = -1
  let snap = true

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame)
    tick(now)
  }
  const tick = (now: number) => {
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000))
    last = now
    const t = now / 1000
    clock.t = t
    let r = worlds[cur]

    // ---- the warp between realities: fold up, swap, unfold ----
    let lift = 0
    if (warp) {
      const k = (t - warp.at) / WARP
      const from = worlds[warp.from].group
      if (!warp.swapped && k < SWAP) {
        const e = ease(k / SWAP)
        from.scale.set(1 + e * 0.15, 1 - e * 0.98, 1 + e * 0.15)
        from.rotation.y = e * 0.7
        lift = e
      } else {
        if (!warp.swapped) {
          warp.swapped = true
          from.scale.set(1, 1, 1)
          from.rotation.y = 0
          enter(warp.to, t)
          r = worlds[cur]
          snap = true
        }
        const e = ease((k - SWAP) / (1 - SWAP))
        // Unfolds with a little overshoot as it settles.
        const y = e + Math.sin(e * Math.PI) * 0.12
        r.group.scale.set(1, Math.max(0.02, y), 1)
        r.group.rotation.y = (1 - e) * -0.7
        lift = 1 - e
        if (k >= 1) {
          r.group.scale.set(1, 1, 1)
          r.group.rotation.y = 0
          warp = null
        }
      }
    }

    // ---- walking ----
    want.set(0, 0, 0)
    if (!gone && !warp) {
      if (keys.has('w') || keys.has('arrowup')) want.z -= 1
      if (keys.has('s') || keys.has('arrowdown')) want.z += 1
      if (keys.has('a') || keys.has('arrowleft')) want.x -= 1
      if (keys.has('d') || keys.has('arrowright')) want.x += 1
      if (want.lengthSq() === 0 && target) {
        want.subVectors(target, pos).setY(0)
        const d = want.length()
        if (d < 0.2) {
          want.set(0, 0, 0)
          if (!holding) target = null
        } else want.multiplyScalar(Math.min(1, d / 0.7) / d)
      }
      if (want.lengthSq() > 1) want.normalize()
    }
    vel.lerp(want.multiplyScalar(SPEED), 1 - Math.exp(-dt * 10))
    if (!warp) {
      pos.x += vel.x * dt
      pos.z += vel.z * dt
      const grounded = r.walk(pos)
      if (grounded && pos.y >= -0.01) {
        pos.y = 0
        vy = 0
      } else {
        // Nothing under you: fall.
        vy -= 22 * dt
        pos.y += vy * dt
      }
    } else pos.y = 0
    r.update(t, dt, pos)
    if (pos.y === 0) vy = 0

    // ---- the way on ----
    if (!warp && openAt < 0 && !finale && (r.goal() || t - enteredAt > r.timeout)) openAt = t
    const open = openAt < 0 || finale ? 0 : ease((t - openAt) / 1.2)
    const portalAt = r.portal
    if (r.ownPortal) {
      r.ownPortal(open, t)
      portal.set(0, t)
    } else {
      portal.group.position.set(portalAt.x, 0, portalAt.z)
      portal.group.rotation.y = r.portalFacing
      portal.set(open, t)
    }
    if (!warp && open > 0.8 && Math.hypot(pos.x - portalAt.x, pos.z - portalAt.z) < 1 && pos.y > -0.5) startWarp(t)
    if (!gone && finale && cur === home && r.exit?.(pos)) {
      gone = true
      rushAt = t
      opts.onExit()
    }

    // ---- the walker ----
    const speed = Math.hypot(vel.x, vel.z)
    const seated = r.sitting?.() ?? false
    if (speed > 0.3 && !seated) {
      let diff = Math.atan2(vel.x, vel.z) - me.group.rotation.y
      diff = Math.atan2(Math.sin(diff), Math.cos(diff))
      me.group.rotation.y += diff * Math.min(1, dt * 12)
    }
    step += speed * dt * 2.4
    me.body.position.y = seated ? -0.3 : Math.abs(Math.sin(step)) * 0.12 * Math.min(1, speed / 2) + lift * 1.4
    me.body.rotation.x = Math.min(0.25, speed * 0.04)
    me.body.rotation.y = lift * Math.PI * 2
    me.tail.rotation.x = -0.3 - Math.min(0.9, speed * 0.15)
    me.scarf.color.set('#f2b134')

    // ---- the guide ----
    let goal: THREE.Vector3 | null
    if (finale && cur === home) goal = r.door ?? null
    else if (open > 0) goal = portalAt
    else goal = r.hint(pos)
    const aimAt = goal ?? portalAt
    const toGoal = tmp.copy(aimAt).sub(pos).setY(0)
    const d = toGoal.length()
    const flyTo = d < 2 ? aimAt.clone() : pos.clone().addScaledVector(toGoal.normalize(), Math.min(2.5, d * 0.6))
    flyTo.y = pos.y + 2 + Math.sin(t * 3) * 0.15 + lift * 1.4
    if (snap) guide.group.position.copy(flyTo)
    guide.group.position.lerp(flyTo, 1 - Math.exp(-dt * 3))
    guide.update(t, camera)

    // ---- light follows you, so shadows are sharp where you are ----
    sunTarget.position.set(pos.x, 0, pos.z)
    sun.position.copy(sunTarget.position).addScaledVector(tmp.copy(r.light.from).normalize(), 40)

    // ---- camera ----
    r.camera(pos.clone().setY(Math.max(pos.y, -1)), t, cam)
    cam.pos.sub(cam.look).multiplyScalar(backOff).add(cam.look)
    const rise = ease((t - bornAt) / 2)
    if (rise < 1) cam.pos.lerp(tmp.set(pos.x + 1.5, 1.6, pos.z + 2.5), 1 - rise)
    if (rushAt >= 0) {
      const k = Math.min(1, (t - rushAt) / 0.9) ** 3
      const door = r.door ?? pos
      cam.pos.lerp(tmp.set(door.x + 1, 1.4, door.z), k)
      cam.look.lerp(tmp.set(door.x - 10, 1.2, door.z), k)
    }
    if (snap) {
      camera.position.copy(cam.pos)
      look.copy(cam.look)
      snap = false
    }
    const follow = rise < 1 || rushAt >= 0 ? 1 : 1 - Math.exp(-dt * 4)
    camera.position.lerp(cam.pos, follow)
    look.lerp(cam.look, follow)
    camera.lookAt(look)
    // A punch of the lens during the warp.
    const fov = 46 + (warp ? Math.sin(Math.min(1, (t - warp.at) / WARP) * Math.PI) * 30 : 0)
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }
    inset.x += (inset.right / 2 - inset.x) * Math.min(1, dt * 5)
    inset.y += (inset.bottom / 2 - inset.y) * Math.min(1, dt * 5)
    const { clientWidth: w, clientHeight: h } = container
    camera.setViewOffset(w, h, inset.x, inset.y, w, h)

    renderer.render(scene, camera)
  }
  raf = requestAnimationFrame(frame)
  // Local testing only.
  if (import.meta.env.DEV) {
    const dev = window as unknown as { __walk: (x: number, z: number) => void; __next: () => void; __step: (ms: number) => void; __state: () => object }
    dev.__state = () => ({ cur, focus: opts.stops[cur], pos: pos.toArray().map((v) => +v.toFixed(2)), open: openAt >= 0, goal: worlds[cur].goal(), finale, warp: !!warp, hint: worlds[cur].hint(pos)?.toArray().map((v) => +v.toFixed(2)), portal: worlds[cur].portal.toArray().map((v) => +v.toFixed(2)) })
    dev.__walk = (x, z) => pos.set(x, 0, z)
    ;(dev as unknown as { __goto: (i: number) => void }).__goto = (i) => enter(i, last / 1000)
    dev.__next = () => startWarp(last / 1000)
    // Runs the room forward by hand, for when the browser isn't drawing frames.
    dev.__step = (ms) => {
      for (let k = 0; k < ms / 16; k++) tick(last + 16)
    }
  }

  return {
    rush: () => {
      gone = true
      if (rushAt < 0) rushAt = clock.t
    },
    setReading: () => {},
    setInset: (right, bottom) => {
      inset.right = right
      inset.bottom = bottom
    },
    dispose: () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
      window.removeEventListener('blur', blur)
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Points || o instanceof THREE.Sprite) {
          o.geometry.dispose()
          const mats = Array.isArray(o.material) ? o.material : [o.material]
          mats.forEach((m) => {
            ;(m as THREE.MeshBasicMaterial).map?.dispose()
            m.dispose()
          })
        }
      })
      renderer.dispose()
      canvas.remove()
    },
  }
}
