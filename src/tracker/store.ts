import { useEffect, useState } from 'react'
import type { Entry } from './rules'

export interface TrackerState {
  entries: Entry[]
  currentPost: number
  due: Record<number, string>
}

const KEY = 'jt.tracker.v1'
const initial: TrackerState = { entries: [], currentPost: 3, due: {} }

function load(): TrackerState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return initial
    return { ...initial, ...JSON.parse(raw) }
  } catch {
    return initial
  }
}

export function isTrackerState(x: unknown): x is TrackerState {
  const s = x as TrackerState
  return !!s && Array.isArray(s.entries) && typeof s.currentPost === 'number'
}

/** Tracker data lives in this browser; use Export to keep a backup file. */
export function useTrackerStore() {
  const [state, setState] = useState<TrackerState>(load)
  const [saveFailed, setSaveFailed] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
      setSaveFailed(false)
    } catch {
      setSaveFailed(true)
    }
  }, [state])

  const today = () => new Date().toISOString().slice(0, 10)

  return {
    state,
    saveFailed,
    setPost: (currentPost: number) => setState((s) => ({ ...s, currentPost })),
    setDue: (post: number, date: string) => setState((s) => ({ ...s, due: { ...s.due, [post]: date } })),
    toggle: (personId: string) =>
      setState((s) => {
        const existing = s.entries.find((e) => e.personId === personId && e.post === s.currentPost)
        if (existing) return { ...s, entries: s.entries.filter((e) => e !== existing) }
        const entry: Entry = { id: crypto.randomUUID(), personId, post: s.currentPost, date: today() }
        return { ...s, entries: [...s.entries, entry] }
      }),
    updateEntry: (id: string, patch: Partial<Entry>) =>
      setState((s) => ({ ...s, entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
    replace: (next: TrackerState) => setState(next),
    reset: () => setState(initial),
  }
}
