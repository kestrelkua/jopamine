// The rules from "Comments on NFW blogs and blog groups", per blog post:
//   • every other writer in your blog group
//   • ≥1 blog in your section, outside your group
//   • ≥1 blog from the other section
//   • ≥1 blog you haven't commented on yet this cycle (≥2 if your group has 3 people)
//   • at least six comments in total
// The handout says the "haven't commented on yet" comment can overlap with the
// section and other-section ones, so it is counted among non-group comments.
import { me, personById, roster, type Person } from './roster'

export type Category = 'group' | 'section' | 'other'

export interface Entry {
  id: string
  personId: string
  post: number
  date: string
  link?: string
}

export const POSTS = [1, 2, 3, 4]
export const MIN_TOTAL = 6

export function categoryOf(p: Person): Category {
  if (p.section !== me.section) return 'other'
  return p.group === me.group ? 'group' : 'section'
}

export const categoryLabel: Record<Category, string> = {
  group: 'Your group',
  section: 'Your section',
  other: 'Other section',
}

export const myGroup = roster.filter((p) => p.id !== me.id && categoryOf(p) === 'group')
const newNeeded = myGroup.length <= 2 ? 2 : 1

/** True if this person has no comment logged on an earlier post this cycle. */
export function isFirstTime(personId: string, post: number, entries: Entry[]): boolean {
  return !entries.some((e) => e.personId === personId && e.post < post)
}

export interface Check {
  key: string
  label: string
  have: number
  need: number
  ok: boolean
}

export function evaluate(post: number, entries: Entry[]) {
  const forPost = entries.filter((e) => e.post === post)
  const people = forPost.map((e) => personById.get(e.personId)).filter((p): p is Person => !!p)
  const cat = (c: Category) => people.filter((p) => categoryOf(p) === c)
  const firstTime = people.filter((p) => categoryOf(p) !== 'group' && isFirstTime(p.id, post, entries))

  const checks: Check[] = [
    { key: 'group', label: `Everyone else in group ${me.group}`, have: cat('group').length, need: myGroup.length, ok: false },
    { key: 'section', label: 'Someone in your section, outside your group', have: cat('section').length, need: 1, ok: false },
    { key: 'other', label: 'Someone from the other section', have: cat('other').length, need: 1, ok: false },
    { key: 'new', label: newNeeded === 1 ? 'Someone you haven’t commented on yet' : 'Two people you haven’t commented on yet', have: firstTime.length, need: newNeeded, ok: false },
    { key: 'total', label: 'At least six comments', have: people.length, need: MIN_TOTAL, ok: false },
  ]
  for (const c of checks) c.ok = c.have >= c.need

  return { forPost, people, checks, complete: checks.every((c) => c.ok), firstTime }
}

export interface Suggestion {
  person: Person
  reasons: string[]
}

/** People to comment on next, ranked by how many open requirements they would meet. */
export function suggest(post: number, entries: Entry[]): Suggestion[] {
  const { checks, people } = evaluate(post, entries)
  const open = new Set(checks.filter((c) => !c.ok).map((c) => c.key))
  if (open.size === 0) return []
  const done = new Set(people.map((p) => p.id))

  const out: Suggestion[] = []
  for (const p of roster) {
    if (p.id === me.id || done.has(p.id)) continue
    const c = categoryOf(p)
    const fresh = c !== 'group' && isFirstTime(p.id, post, entries)
    const reasons: string[] = []
    if (c === 'group' && open.has('group')) reasons.push('your group')
    if (c === 'section' && open.has('section')) reasons.push('your section')
    if (c === 'other' && open.has('other')) reasons.push('other section')
    if (fresh && open.has('new')) reasons.push('first time')
    if (reasons.length === 0 && open.has('total') && fresh) reasons.push('counts toward six')
    if (reasons.length) out.push({ person: p, reasons })
  }
  // Group members are all required, so they always come first.
  const rank = (s: Suggestion) => (categoryOf(s.person) === 'group' ? 10 : 0) + s.reasons.length
  return out.sort((a, b) => rank(b) - rank(a) || a.person.name.localeCompare(b.person.name))
}

/** Lays one post's comments out like the columns of the paper tally sheet. */
export function tallyColumns(post: number, entries: Entry[]) {
  const forPost = entries.filter((e) => e.post === post)
  const withPerson = forPost.map((e) => ({ e, p: personById.get(e.personId)! })).filter((x) => x.p)
  const fresh = (id: string) => isFirstTime(id, post, entries)
  const group = withPerson.filter((x) => categoryOf(x.p) === 'group')
  const pick = (c: Category) => {
    const list = withPerson.filter((x) => categoryOf(x.p) === c)
    // Prefer a repeat here so first-timers can land in the last column.
    return list.find((x) => !fresh(x.p.id)) ?? list[0]
  }
  const section = pick('section')
  const other = pick('other')
  const rest = withPerson.filter((x) => categoryOf(x.p) !== 'group' && x !== section && x !== other)
  const label = (x: { p: Person } | undefined) => (x ? `${x.p.name}${categoryOf(x.p) !== 'group' && fresh(x.p.id) ? ' ★' : ''}` : '')
  return {
    group: group.map(label),
    section: label(section),
    other: label(other),
    firstPlusOne: rest.map(label),
  }
}
