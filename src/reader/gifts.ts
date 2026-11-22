import type { SceneId } from '../content/types'

/** What a reader leaves behind at the end of a post, by room. */
export type Gift =
  | { kind: 'spark'; line: string }
  /** Drag an instrument onto someone in the room; they start playing it. */
  | { kind: 'guitar'; line: string; endFocus: string }

export const gifts: Record<SceneId, Gift> = {
  'blue-room': { kind: 'spark', line: 'Leave a little light in the room' },
  ocean: { kind: 'spark', line: 'Drop in your shade of blue' },
  cave: { kind: 'guitar', line: 'Give some of your own musicking', endFocus: 'gift' },
}

export function loadGiven(key: string): string | null {
  try {
    const raw = localStorage.getItem(key)
    const v = raw ? JSON.parse(raw) : null
    return typeof v?.to === 'string' ? v.to : null
  } catch {
    return null
  }
}

export function saveGiven(key: string, to: string) {
  try {
    localStorage.setItem(key, JSON.stringify({ to }))
  } catch {
    // The gift just won't be remembered.
  }
}
