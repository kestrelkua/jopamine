// Blog groups (4th and 1st period). Classmates' names are not in the code: the roster is loaded once
// from a JSON file kept on Jakub's computer (private/roster.json) and saved in this browser.
// File shape: { "4th": { "A1": ["Last, First Middle", ...], ... }, "1st": { ... } }
export type SectionId = '4th' | '1st'

export interface Person {
  id: string
  name: string
  section: SectionId
  group: string
}

type RawRoster = Record<SectionId, Record<string, string[]>>

const KEY = 'jt.roster.v1'

/** Checks a parsed file looks like a roster before keeping it. */
function isRoster(v: unknown): v is RawRoster {
  if (!v || typeof v !== 'object') return false
  return (['4th', '1st'] as const).every((s) => {
    const groups = (v as Record<string, unknown>)[s]
    return !!groups && typeof groups === 'object' && Object.values(groups).every((g) => Array.isArray(g) && g.every((n) => typeof n === 'string'))
  })
}

function loadRaw(): RawRoster | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    return isRoster(v) ? v : null
  } catch {
    return null
  }
}

/** Saves a roster file's text; returns false if it isn't a roster. */
export function saveRoster(text: string): boolean {
  try {
    const v = JSON.parse(text)
    if (!isRoster(v)) return false
    localStorage.setItem(KEY, JSON.stringify(v))
    return true
  } catch {
    return false
  }
}

/** "Lovelace, Ada King" → "Ada Lovelace" */
function displayName(full: string): string {
  const [last, first = ''] = full.split(',').map((s) => s.trim())
  return `${first.split(/\s+/)[0]} ${last}`.trim()
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const raw = loadRaw()
export const hasRoster = raw !== null

export const roster: Person[] = raw
  ? (Object.keys(raw) as SectionId[]).flatMap((section) =>
      Object.entries(raw[section]).flatMap(([group, names]) =>
        names.map((full) => ({ id: slug(full), name: displayName(full), section, group })),
      ),
    )
  : []

export const ME_ID = 'tinoco-lewandowski-jakub'
export const me: Person = roster.find((p) => p.id === ME_ID) ?? { id: ME_ID, name: 'Jakub Tinoco', section: '4th', group: 'B1' }

export const sectionName: Record<SectionId, string> = { '4th': '4th period', '1st': '1st period' }

export const personById = new Map(roster.map((p) => [p.id, p]))
