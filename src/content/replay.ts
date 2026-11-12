// Writing replay: the editor records every change as a small op, so a reader
// can later watch a post being written, from the first word to the last edit.
import type { Block, Chemical, SceneId } from './types'

export type EBlock = Block & { id: string }

export interface Meta {
  title: string
  date: string
  chemical: Chemical
  scene: SceneId
  teaser: string
  card: 'light' | 'dark'
}

export interface Doc {
  meta: Meta
  blocks: EBlock[]
}

export type Op =
  | { t: number; k: 'meta'; patch: Partial<Meta> }
  | { t: number; k: 'text'; id: string; at: number; del: number; ins: string }
  | { t: number; k: 'set'; block: EBlock }
  | { t: number; k: 'ins'; after: string | null; block: EBlock }
  | { t: number; k: 'del'; id: string }
  | { t: number; k: 'mv'; id: string; after: string | null }

export interface Replay {
  start: Doc
  ops: Op[]
}

type Distribute<T> = T extends unknown ? Omit<T, 't'> : never
export type OpInput = Distribute<Op>

/** The smallest single edit that turns `a` into `b`. */
export function diffText(a: string, b: string) {
  let start = 0
  while (start < a.length && start < b.length && a[start] === b[start]) start++
  let endA = a.length
  let endB = b.length
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--
    endB--
  }
  return { at: start, del: endA - start, ins: b.slice(start, endB) }
}

function insertAfter(blocks: EBlock[], after: string | null, block: EBlock) {
  const i = after === null ? -1 : blocks.findIndex((b) => b.id === after)
  const out = blocks.slice()
  out.splice(i + 1, 0, block)
  return out
}

export function applyOp(doc: Doc, op: OpInput): Doc {
  switch (op.k) {
    case 'meta':
      return { ...doc, meta: { ...doc.meta, ...op.patch } }
    case 'text':
      return {
        ...doc,
        blocks: doc.blocks.map((b) =>
          b.id === op.id && 'text' in b ? ({ ...b, text: b.text.slice(0, op.at) + op.ins + b.text.slice(op.at + op.del) } as EBlock) : b,
        ),
      }
    case 'set':
      return { ...doc, blocks: doc.blocks.map((b) => (b.id === op.block.id ? op.block : b)) }
    case 'ins':
      return { ...doc, blocks: insertAfter(doc.blocks, op.after, op.block) }
    case 'del':
      return { ...doc, blocks: doc.blocks.filter((b) => b.id !== op.id) }
    case 'mv': {
      const block = doc.blocks.find((b) => b.id === op.id)
      if (!block) return doc
      return { ...doc, blocks: insertAfter(doc.blocks.filter((b) => b.id !== op.id), op.after, block) }
    }
  }
}

/** Real pauses longer than this are shortened during playback. */
export const MAX_PAUSE = 1200

export function replayDuration(replay: Replay): number {
  let total = 0
  for (let i = 1; i < replay.ops.length; i++) total += Math.min(MAX_PAUSE, replay.ops[i].t - replay.ops[i - 1].t)
  return total
}

/** The document as it looked after the first `count` ops. */
export function docAt(replay: Replay, count: number): Doc {
  let doc = replay.start
  for (let i = 0; i < count && i < replay.ops.length; i++) doc = applyOp(doc, replay.ops[i])
  return doc
}
