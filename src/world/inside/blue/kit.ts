// What every reality of the Blue Room is made of, and small shared pieces (textures, helpers).
import * as THREE from 'three'

export interface Click {
  obj: THREE.Object3D
  fn: (hit: THREE.Intersection) => void
}

/** One version of the room. The engine (../blueRoom.ts) walks you through them in story order. */
export interface Reality {
  group: THREE.Group
  spawn: THREE.Vector3
  /** Which way the walker faces on arrival (rotation.y). */
  facing: number
  sky: THREE.ColorRepresentation
  fog: [number, number] | null
  light: { hemi: number; sun: number; sunColor: THREE.ColorRepresentation; target: THREE.Vector3; from: THREE.Vector3 }
  /** Where the camera wants to be for a walker at `me`. */
  camera: (me: THREE.Vector3, t: number, out: { pos: THREE.Vector3; look: THREE.Vector3 }) => void
  /** Keeps the walker on the ground. Returns false if there's no ground under it (it falls). */
  walk: (me: THREE.Vector3) => boolean
  update: (t: number, dt: number, me: THREE.Vector3) => void
  /** The thing to do here is done; the way on opens. */
  goal: () => boolean
  /** Seconds after arriving before the way on opens anyway, so nobody gets stuck. */
  timeout: number
  /** Where to step to go on to the next reality. */
  portal: THREE.Vector3
  portalFacing: number
  /** Where the firefly should lead while the goal isn't done. */
  hint: (me: THREE.Vector3) => THREE.Vector3 | null
  clicks: Click[]
  enter?: (t: number) => void
  /** Draws its own way on (the real room uses its window), instead of the standing window frame. */
  ownPortal?: (open: number, t: number) => void
  /** The real room, at the very end: back from all the other realities. */
  finale?: () => void
  /** The real room at the end: walking out the door. */
  exit?: (me: THREE.Vector3) => boolean
  /** Hides the story card: this reality writes its words into the world instead. */
  noCard?: boolean
  /** Effects to apply right now: a colour-vision filter, and how slowed-down time feels (0 to 1). */
  fx?: () => { deut?: boolean; slow?: number }
  /** A sky colour that changes over time, instead of the fixed `sky`. */
  skyNow?: (t: number) => THREE.Color
  /** How big the walker is right now (1 = normal). */
  walkerScale?: () => number
  /** The walker is sitting down. */
  sitting?: () => boolean
  /** Where the way out is, at the end. */
  door?: THREE.Vector3
}

/** The room's clock, in seconds; the engine sets it every frame. Use it instead of performance.now(). */
export const clock = { t: 0 }

export const lambert = (color: THREE.ColorRepresentation, extra: THREE.MeshLambertMaterialParameters = {}) => new THREE.MeshLambertMaterial({ color, ...extra })

/** Adds a mesh to `parent` with shadows on. */
export function put<T extends THREE.Object3D>(parent: THREE.Object3D, o: T, x = 0, y = 0, z = 0): T {
  o.position.set(x, y, z)
  o.traverse((c) => {
    if (c instanceof THREE.Mesh) {
      c.castShadow = true
      c.receiveShadow = true
    }
  })
  parent.add(o)
  return o
}

export const cube = (parent: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material) => put(parent, new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat), x, y, z)

export function flat(parent: THREE.Object3D, w: number, d: number, x: number, z: number, mat: THREE.Material, y = 0.005, geo: THREE.BufferGeometry = new THREE.PlaneGeometry(w, d)) {
  const m = new THREE.Mesh(geo, mat)
  m.rotation.x = -Math.PI / 2
  m.position.set(x, y, z)
  m.receiveShadow = true
  parent.add(m)
  return m
}

export const ease = (k: number) => 1 - (1 - Math.min(1, Math.max(0, k))) ** 3

/** Keeps a point inside a rectangle. */
export function clampRect(p: THREE.Vector3, x0: number, x1: number, z0: number, z1: number) {
  p.x = Math.max(x0, Math.min(x1, p.x))
  p.z = Math.max(z0, Math.min(z1, p.z))
}

/** Pushes a point out of a circle. */
export function pushOut(p: THREE.Vector3, cx: number, cz: number, r: number) {
  const dx = p.x - cx
  const dz = p.z - cz
  const d = Math.hypot(dx, dz)
  if (d < r && d > 0) {
    p.x = cx + (dx / d) * r
    p.z = cz + (dz / d) * r
  }
}

/** A camera that follows from behind and above. */
export const follow =
  (back: number, up: number, ahead = 2) =>
  (me: THREE.Vector3, _t: number, out: { pos: THREE.Vector3; look: THREE.Vector3 }) => {
    out.pos.set(me.x * 0.85, up, me.z + back)
    out.look.set(me.x * 0.9, 0.8, me.z - ahead)
  }

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d')!)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** A baby picture: round face, a curl of hair, a different mood each time. */
export const babyTexture = (k: number) =>
  canvasTexture(96, 120, (g) => {
    g.fillStyle = ['#f6d6e0', '#d6e6f6', '#f6ecd0', '#dff0dc', '#ead8f4', '#f8dccc'][k % 6]
    g.fillRect(0, 0, 96, 120)
    g.fillStyle = '#f1cfae'
    g.beginPath()
    g.arc(48, 62, 30, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = '#6b4a2a'
    g.lineWidth = 3
    g.beginPath()
    g.arc(50, 30, 7, Math.PI * 0.9, Math.PI * 2.2)
    g.stroke()
    g.fillStyle = '#2b2440'
    for (const x of [38, 58]) {
      g.beginPath()
      g.arc(x, 58, 3, 0, Math.PI * 2)
      g.fill()
    }
    g.lineWidth = 2.5
    g.beginPath()
    if (k % 3 === 0) g.arc(48, 70, 8, 0.1 * Math.PI, 0.9 * Math.PI)
    else if (k % 3 === 1) g.ellipse(48, 74, 4, 5, 0, 0, Math.PI * 2)
    else g.arc(48, 80, 8, 1.15 * Math.PI, 1.85 * Math.PI)
    g.stroke()
    g.fillStyle = 'rgba(239, 111, 154, 0.35)'
    for (const x of [32, 64]) {
      g.beginPath()
      g.arc(x, 68, 5, 0, Math.PI * 2)
      g.fill()
    }
  })

export const smileyTexture = () =>
  canvasTexture(64, 64, (g) => {
    g.fillStyle = '#ffd23f'
    g.beginPath()
    g.arc(32, 32, 30, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#2b2440'
    for (const x of [22, 42]) {
      g.beginPath()
      g.arc(x, 26, 4, 0, Math.PI * 2)
      g.fill()
    }
    g.strokeStyle = '#2b2440'
    g.lineWidth = 4
    g.beginPath()
    g.arc(32, 34, 14, 0.15 * Math.PI, 0.85 * Math.PI)
    g.stroke()
  })

/** A sheet of homework with a problem on it. */
export const mathTexture = (k: number) =>
  canvasTexture(80, 112, (g) => {
    g.fillStyle = '#fbf7f1'
    g.fillRect(0, 0, 80, 112)
    g.strokeStyle = '#a9c4ea'
    g.lineWidth = 1
    for (let y = 18; y < 112; y += 10) {
      g.beginPath()
      g.moveTo(0, y)
      g.lineTo(80, y)
      g.stroke()
    }
    g.strokeStyle = '#ef9ab4'
    g.beginPath()
    g.moveTo(12, 0)
    g.lineTo(12, 112)
    g.stroke()
    g.fillStyle = '#2b2440'
    g.font = '600 15px Georgia, serif'
    g.textAlign = 'center'
    g.fillText(['7 × 8 =', 'x² + 3x', '∫ f(x)dx', 'sin θ =', '√144', 'a² + b²', 'y = mx + b', '3x = 27'][k % 8], 44, 50)
    g.font = '600 11px Georgia, serif'
    g.fillText(`#${k + 1}`, 44, 74)
  })

export const heartTexture = () =>
  canvasTexture(64, 64, (g) => {
    g.fillStyle = '#ef6f9a'
    g.beginPath()
    g.moveTo(32, 54)
    g.bezierCurveTo(4, 36, 6, 10, 22, 10)
    g.bezierCurveTo(28, 10, 32, 16, 32, 20)
    g.bezierCurveTo(32, 16, 36, 10, 42, 10)
    g.bezierCurveTo(58, 10, 60, 36, 32, 54)
    g.fill()
  })

/** Printing on the cardboard: "THIS SIDE UP" with arrows. */
export const boxPrintTexture = () =>
  canvasTexture(256, 128, (g) => {
    g.clearRect(0, 0, 256, 128)
    g.fillStyle = 'rgba(60, 35, 20, 0.75)'
    g.font = '800 30px Arial, sans-serif'
    g.textAlign = 'center'
    g.fillText('THIS SIDE UP', 128, 112)
    for (const x of [92, 164]) {
      g.beginPath()
      g.moveTo(x, 20)
      g.lineTo(x - 22, 50)
      g.lineTo(x - 8, 50)
      g.lineTo(x - 8, 80)
      g.lineTo(x + 8, 80)
      g.lineTo(x + 8, 50)
      g.lineTo(x + 22, 50)
      g.closePath()
      g.fill()
    }
  })

/** The standing window everyone steps through between realities: the Blue Room's window, glowing. */
export function portalWindow() {
  const g = new THREE.Group()
  const trim = new THREE.MeshLambertMaterial({ color: '#f4efe4' })
  const W = 2.4
  const H = 3
  for (const [w, h, x, y] of [
    [W + 0.2, 0.14, 0, H],
    [W + 0.2, 0.14, 0, 0],
    [0.14, H, -W / 2, H / 2],
    [0.14, H, W / 2, H / 2],
    [0.1, H, 0, H / 2],
    [W, 0.1, 0, H / 2],
  ] as const)
    put(g, new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.14), trim), x, y, 0)
  const glowMat = new THREE.MeshBasicMaterial({ color: '#fff1c8', transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false })
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(W, H), glowMat)
  pane.position.y = H / 2
  g.add(pane)
  // Light spilling from it onto the ground.
  const spillMat = new THREE.MeshBasicMaterial({ color: '#ffe2a0', transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending })
  const spill = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.3, 3.4), spillMat)
  spill.rotation.x = -Math.PI / 2
  spill.position.set(0, 0.03, 1.7)
  g.add(spill)
  const light = new THREE.PointLight('#ffd890', 0, 10, 1.4)
  light.position.set(0, 1.6, 1.2)
  g.add(light)
  return {
    group: g,
    set: (open: number, t: number) => {
      g.visible = open > 0.001
      g.position.y = -3.4 * (1 - ease(open))
      const pulse = 0.85 + Math.sin(t * 3) * 0.15
      glowMat.opacity = 0.85 * pulse
      spillMat.opacity = 0.35 * open * pulse
      light.intensity = 6 * open * pulse
    },
  }
}
