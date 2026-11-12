// Background music for a room, synthesized live (no audio files). The cave has bone flutes that come
// and go, a crackling fire, and, once a reader hands someone the guitar, strummed chords.
import type { SceneId } from './content/types'
import { audioContext, soundOn } from './sound'

const KEY = 'jt.music'

export function musicOn(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}

export function setMusicOn(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    // Falls back to the default next time.
  }
}

export const roomHasMusic = (room: SceneId) => room === 'cave'

const rand = (a: number, b: number) => a + Math.random() * (b - a)
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)]

let noise: AudioBuffer | null = null
function noiseBuffer(a: AudioContext) {
  if (noise) return noise
  noise = a.createBuffer(1, a.sampleRate * 2, a.sampleRate)
  const d = noise.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return noise
}

/** A long, dark echo, like a cave. */
function caveEcho(a: AudioContext) {
  const len = a.sampleRate * 3
  const buf = a.createBuffer(2, len, a.sampleRate)
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3
  }
  const conv = a.createConvolver()
  conv.buffer = buf
  return conv
}

/** One breathy flute note. */
function flute(a: AudioContext, out: AudioNode, freq: number, t: number, dur: number, level = 0.5) {
  const g = a.createGain()
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(level, t + 0.09)
  g.gain.setValueAtTime(level * 0.85, t + Math.max(0.1, dur - 0.05))
  g.gain.linearRampToValueAtTime(0, t + dur + 0.18)
  g.connect(out)

  const osc = a.createOscillator()
  osc.frequency.setValueAtTime(freq, t)
  const vib = a.createOscillator()
  const vibDepth = a.createGain()
  vib.frequency.value = 5.2
  vibDepth.gain.setValueAtTime(0, t)
  vibDepth.gain.linearRampToValueAtTime(freq * 0.007, t + Math.min(0.4, dur))
  vib.connect(vibDepth).connect(osc.frequency)
  osc.connect(g)

  const air = a.createBufferSource()
  air.buffer = noiseBuffer(a)
  air.loop = true
  const band = a.createBiquadFilter()
  band.type = 'bandpass'
  band.frequency.value = freq * 2
  band.Q.value = 3
  const airGain = a.createGain()
  airGain.gain.value = 0.18
  air.connect(band).connect(airGain).connect(g)

  for (const n of [osc, vib, air]) {
    n.start(t)
    n.stop(t + dur + 0.3)
  }
}

/** A plucked string (Karplus-Strong), cached per pitch. */
const strings = new Map<number, AudioBuffer>()
function pluck(a: AudioContext, freq: number) {
  const known = strings.get(freq)
  if (known) return known
  const sr = a.sampleRate
  const buf = a.createBuffer(1, sr * 2.5, sr)
  const d = buf.getChannelData(0)
  const ring = new Float32Array(Math.round(sr / freq)).map(() => Math.random() * 2 - 1)
  for (let i = 0, k = 0; i < d.length; i++) {
    const next = (k + 1) % ring.length
    d[i] = ring[k]
    ring[k] = 0.4985 * (ring[k] + ring[next])
    k = next
  }
  strings.set(freq, buf)
  return buf
}

const chords = [
  [110, 164.81, 220, 261.63, 329.63], // Am
  [130.81, 164.81, 196, 261.63, 329.63], // C
  [98, 146.83, 196, 246.94, 392], // G
  [146.83, 220, 293.66, 349.23], // Dm
]

function strumAt(a: AudioContext, out: AudioNode, t: number, chord = chords[0], level = 0.5) {
  const g = a.createGain()
  g.gain.value = level
  g.connect(out)
  chord.forEach((f, i) => {
    const s = a.createBufferSource()
    s.buffer = pluck(a, f)
    s.connect(g)
    s.start(t + i * 0.028)
  })
}

/** One strum right now (used when the guitar changes hands). Follows the sound-effects switch. */
export function strum() {
  if (!soundOn()) return
  const a = audioContext()
  if (a) strumAt(a, a.destination, a.currentTime + 0.05, chords[0], 0.35)
}

export interface RoomMusic {
  stop: () => void
}

const scale = [440, 523.25, 587.33, 659.25, 783.99, 880] // A minor pentatonic

/** Starts the cave's music. `guitar()` says whether someone in the room is playing the guitar. */
export function startMusic(room: SceneId, guitar: () => boolean): RoomMusic | null {
  if (!roomHasMusic(room)) return null
  const a = audioContext()
  if (!a) return null

  const master = a.createGain()
  master.gain.setValueAtTime(0, a.currentTime)
  master.gain.linearRampToValueAtTime(0.16, a.currentTime + 3)
  master.connect(a.destination)
  const echo = caveEcho(a)
  const wet = a.createGain()
  wet.gain.value = 0.55
  echo.connect(wet).connect(master)
  const dry = a.createGain()
  dry.gain.value = 0.7
  dry.connect(master)
  dry.connect(echo)

  // Each loop keeps only its next timer.
  const timers = { phrase: 0, crackle: 0 }
  const later = (loop: keyof typeof timers, fn: () => void, ms: number) => (timers[loop] = window.setTimeout(fn, ms))

  /** A few notes wandering around the scale, then silence. */
  const phrase = () => {
    let t = a.currentTime + 0.1
    let i = Math.floor(rand(1, 4))
    const notes = Math.floor(rand(4, 8))
    const playing = guitar()
    const chord = pick(chords)
    if (playing) strumAt(a, dry, t, chord, 0.4)
    for (let k = 0; k < notes; k++) {
      const dur = k === notes - 1 ? 1.6 : pick([0.35, 0.5, 0.5, 0.75, 1.1])
      flute(a, dry, scale[i], t, dur)
      if (playing && k === Math.floor(notes / 2)) strumAt(a, dry, t, chord, 0.3)
      t += dur
      i = Math.max(0, Math.min(scale.length - 1, i + pick([-2, -1, -1, 1, 1, 2])))
    }
    // Sometimes a second, lower flute answers.
    if (Math.random() < 0.45) {
      let j = Math.floor(rand(0, 3))
      for (let k = 0; k < 3; k++) {
        const dur = pick([0.5, 0.75, 1.2])
        flute(a, dry, scale[j] / 2, t + 0.4, dur, 0.4)
        t += dur
        j = Math.max(0, Math.min(scale.length - 1, j + pick([-1, 1, 2])))
      }
    }
    const rest = (t - a.currentTime) * 1000 + rand(4000, 10000)
    later('phrase', phrase, rest)
  }

  /** The fire: tiny pops of filtered noise. */
  const crackle = () => {
    const s = a.createBufferSource()
    s.buffer = noiseBuffer(a)
    const f = a.createBiquadFilter()
    f.type = 'highpass'
    f.frequency.value = rand(1500, 4000)
    const g = a.createGain()
    const t = a.currentTime
    g.gain.setValueAtTime(rand(0.04, 0.12), t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + rand(0.02, 0.07))
    s.connect(f).connect(g).connect(master)
    s.start(t, rand(0, 1.5), 0.1)
    later('crackle', crackle, rand(60, 450))
  }

  later('phrase', phrase, 1200)
  crackle()

  return {
    stop: () => {
      Object.values(timers).forEach((id) => window.clearTimeout(id))
      // Notes already sounding carry on and the echo rings out while everything dies away slowly.
      const t = a.currentTime
      master.gain.cancelScheduledValues(t)
      master.gain.setValueAtTime(master.gain.value, t)
      master.gain.setTargetAtTime(0, t + 0.6, 1.1)
      // A background tab may delay timers, so also end on the audio clock itself.
      master.gain.setValueAtTime(0, t + 6)
      window.setTimeout(() => master.disconnect(), 7000)
    },
  }
}
