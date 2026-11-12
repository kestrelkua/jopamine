// Drafts written in the editor. They live in this browser until the site has a backend.
import { useEffect, useState } from 'react'
import { posts as builtIn } from '.'
import type { Doc, EBlock, Replay } from './replay'
import type { Post } from './types'

export interface Draft {
  id: string
  doc: Doc
  published: boolean
  /** The built-in post this draft was copied from; publishing replaces it. */
  sourceSlug?: string
  slug?: string
  updatedAt: number
}

const DRAFTS = 'jt.drafts.v1'
const replayKey = (id: string) => `jt.replay.${id}`
const CHANGED = 'jt-drafts-changed'

export const newId = () => crypto.randomUUID().slice(0, 8)

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'untitled'

export function loadDrafts(): Draft[] {
  try {
    return JSON.parse(localStorage.getItem(DRAFTS) ?? '[]')
  } catch {
    return []
  }
}

/** Returns false if the browser refused to save (storage full or blocked). */
export function saveDrafts(drafts: Draft[]): boolean {
  try {
    localStorage.setItem(DRAFTS, JSON.stringify(drafts))
    window.dispatchEvent(new Event(CHANGED))
    return true
  } catch {
    return false
  }
}

export function saveDraft(draft: Draft): boolean {
  const all = loadDrafts()
  const i = all.findIndex((d) => d.id === draft.id)
  if (i >= 0) all[i] = draft
  else all.unshift(draft)
  return saveDrafts(all)
}

export function deleteDraft(id: string) {
  saveDrafts(loadDrafts().filter((d) => d.id !== id))
  try {
    localStorage.removeItem(replayKey(id))
  } catch {
    /* nothing to clean up */
  }
}

export function loadReplay(id: string): Replay | null {
  try {
    const raw = localStorage.getItem(replayKey(id))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveReplay(id: string, replay: Replay): boolean {
  try {
    localStorage.setItem(replayKey(id), JSON.stringify(replay))
    return true
  } catch {
    return false
  }
}

/** Re-renders whenever drafts change, in this tab or another (e.g. the editor's preview). */
export function useDrafts(): Draft[] {
  const [drafts, setDrafts] = useState(loadDrafts)
  useEffect(() => {
    const refresh = () => setDrafts(loadDrafts())
    window.addEventListener(CHANGED, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(CHANGED, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])
  return drafts
}

const accent = { dopamine: '#f2b134', oxytocin: '#ef6f9a' } as const

export function draftToPost(d: Draft): Post {
  const { meta, blocks } = d.doc
  return {
    slug: d.slug ?? `draft-${d.id}`,
    title: meta.title || 'Untitled',
    date: meta.date,
    chemical: meta.chemical,
    scene: meta.scene,
    teaser: meta.teaser,
    theme: { card: meta.card, accent: accent[meta.chemical] },
    blocks: blocks.map((b) => {
      const { id: _id, ...rest } = b
      void _id
      return rest
    }) as Post['blocks'],
  }
}

export function postToDoc(p: Post): Doc {
  return {
    meta: { title: p.title, date: p.date, chemical: p.chemical, scene: p.scene, teaser: p.teaser, card: p.theme.card },
    blocks: p.blocks.map((b) => ({ ...b, id: newId() }) as EBlock),
  }
}

/** Built-in posts, with any published drafts layered on top (replacing the post they were copied from). */
export function allPosts(drafts: Draft[]): Post[] {
  const published = drafts.filter((d) => d.published)
  const replaced = new Set(published.map((d) => d.sourceSlug).filter(Boolean))
  const merged = [...builtIn.filter((p) => !replaced.has(p.slug)), ...published.map(draftToPost)]
  return merged.sort((a, b) => a.date.localeCompare(b.date))
}

/** The draft behind a post slug, if that post came from the editor. */
export function draftForSlug(drafts: Draft[], slug: string | undefined): Draft | undefined {
  return drafts.find((d) => d.published && draftToPost(d).slug === slug)
}
