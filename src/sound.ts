// Tiny synthesized sounds, so there are no audio files to load.

const KEY = 'jt.sound'
let ctx: AudioContext | null = null

export function soundOn(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}

export function setSoundOn(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    // Falls back to the default next time.
  }
}

/** The shared audio context, whatever the sound-effects setting (music has its own switch). */
export function audioContext(): AudioContext | null {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function audio(): AudioContext | null {
  return soundOn() ? audioContext() : null
}

/** One soft enveloped tone. */
function tone(freq: number, { at = 0, length = 0.6, gain = 0.08, type = 'sine' as OscillatorType } = {}) {
  const a = audio()
  if (!a) return
  const t = a.currentTime + at
  const osc = a.createOscillator()
  const g = a.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(gain, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + length)
  osc.connect(g).connect(a.destination)
  osc.start(t)
  osc.stop(t + length + 0.05)
}

export function ding() {
  tone(1318.5, { length: 1.2, gain: 0.07 })
  tone(2637, { length: 0.5, gain: 0.02 })
}

/** A piano-ish note for key `i` of a white-key row starting at C4. */
export function pianoNote(i: number, black = false) {
  const whites = [0, 2, 4, 5, 7, 9, 11]
  const semis = Math.floor(i / 7) * 12 + whites[i % 7] + (black ? 1 : 0)
  const f = 261.63 * 2 ** (semis / 12)
  tone(f, { length: 1.1, gain: 0.09, type: 'triangle' })
  tone(f * 2, { length: 0.4, gain: 0.015 })
}

export function whoosh() {
  const a = audio()
  if (!a) return
  const len = 0.5
  const buf = a.createBuffer(1, a.sampleRate * len, a.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
  const src = a.createBufferSource()
  const filter = a.createBiquadFilter()
  const g = a.createGain()
  src.buffer = buf
  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(400, a.currentTime)
  filter.frequency.exponentialRampToValueAtTime(1600, a.currentTime + len)
  g.gain.value = 0.12
  src.connect(filter).connect(g).connect(a.destination)
  src.start()
}

export function tick() {
  tone(880, { length: 0.08, gain: 0.03, type: 'triangle' })
}
