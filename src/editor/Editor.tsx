import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { posts as builtIn } from '../content'
import { draftToPost, loadDrafts, loadReplay, newId, saveDraft, saveReplay, slugify, type Draft } from '../content/drafts'
import { applyOp, diffText, type EBlock, type Meta, type Op, type OpInput, type Replay } from '../content/replay'
import type { SceneId } from '../content/types'
import { rooms } from '../scenes/registry'
import BlockEditor, { Inserter, type FocusRequest } from './BlockEditor'
import { makeBlock, type BlockType } from './blocks'
import Toolbar from './Toolbar'
import './Editor.css'

/** Which reader section (scene) each block lands in, matching toSections(). */
function sectionIndex(blocks: EBlock[]): Map<string, number> {
  const map = new Map<string, number>()
  let i = -1
  blocks.forEach((b) => {
    if (b.type === 'cue' || i < 0) i++
    map.set(b.id, i)
  })
  return map
}

export default function Editor() {
  const { id } = useParams()
  const draft = useMemo(() => loadDrafts().find((d) => d.id === id), [id])
  if (!draft) return <Navigate to="/write" replace />
  return <EditorInner key={draft.id} initial={draft} />
}

function EditorInner({ initial }: { initial: Draft }) {
  const draftRef = useRef(initial)
  const docRef = useRef(initial.doc)
  const replayRef = useRef<Replay>(loadReplay(initial.id) ?? { start: initial.doc, ops: [] })
  const [doc, setDoc] = useState(initial.doc)
  const [published, setPublished] = useState(initial.published)
  const [saved, setSaved] = useState(true)
  const [focusReq, setFocusReq] = useState<FocusRequest | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [view, setView] = useState<'write' | 'preview'>('write')
  const [dragId, setDragId] = useState<string | null>(null)
  const [drop, setDrop] = useState<{ id: string; before: boolean } | null>(null)
  const [sel, setSel] = useState<{ id: string; start: number; end: number } | null>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const timer = useRef(0)

  const flush = useCallback(() => {
    window.clearTimeout(timer.current)
    const d: Draft = { ...draftRef.current, doc: docRef.current, updatedAt: Date.now() }
    draftRef.current = d
    setSaved(saveDraft(d) && saveReplay(d.id, replayRef.current))
  }, [])

  useEffect(() => {
    window.addEventListener('beforeunload', flush)
    return () => {
      window.removeEventListener('beforeunload', flush)
      flush()
    }
  }, [flush])

  const commit = (op: OpInput) => {
    docRef.current = applyOp(docRef.current, op)
    replayRef.current.ops.push({ ...op, t: Date.now() } as Op)
    setDoc(docRef.current)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(flush, 350)
  }

  const blocks = doc.blocks
  const find = (id: string) => docRef.current.blocks.find((b) => b.id === id)
  const indexOf = (id: string) => docRef.current.blocks.findIndex((b) => b.id === id)

  const setText = (id: string, next: string) => {
    const b = find(id)
    if (!b || !('text' in b)) return
    const d = diffText(b.text, next)
    if (d.del === 0 && d.ins === '') return
    commit({ k: 'text', id, ...d })
  }
  const insertAfter = (after: string | null, block: EBlock, pos = 0) => {
    commit({ k: 'ins', after, block })
    setFocusReq({ id: block.id, pos })
  }
  const remove = (id: string, focusPrev = true) => {
    const i = indexOf(id)
    const prev = docRef.current.blocks[i - 1]
    commit({ k: 'del', id })
    if (focusPrev && prev) setFocusReq({ id: prev.id, pos: 'text' in prev ? prev.text.length : 0 })
  }
  /** Moves a block so it sits just before or after `target`. */
  const moveNear = (id: string, target: string, before: boolean) => {
    if (id === target) return
    const rest = docRef.current.blocks.filter((b) => b.id !== id)
    const t = rest.findIndex((b) => b.id === target)
    const after = before ? (rest[t - 1]?.id ?? null) : target
    commit({ k: 'mv', id, after })
  }
  const turnInto = (b: EBlock, type: BlockType, keep?: string) => {
    const text = keep ?? ('text' in b ? b.text : b.type === 'steps' ? b.items.join(' ') : b.type === 'cue' ? b.label : '')
    const next = { ...makeBlock(type, doc.meta.scene, text), id: b.id }
    commit({ k: 'set', block: next })
    setFocusReq({ id: b.id, pos: text.length })
  }
  /** Shortens paragraph `b` to `before` and returns its notes that now belong to `rest`. */
  const cutParagraph = (b: EBlock, before: string, rest: string) => {
    setText(b.id, before)
    if (b.type !== 'p' || !b.notes?.length) return undefined
    const moving = b.notes.filter((n) => !before.includes(n.anchor) && rest.includes(n.anchor))
    if (moving.length) commit({ k: 'set', block: { ...(find(b.id) as typeof b), notes: b.notes.filter((n) => !moving.includes(n)) } })
    return moving.length ? moving : undefined
  }
  const paragraph = (text: string, notes?: { anchor: string; text: string }[]): EBlock => ({ ...makeBlock('p', doc.meta.scene, text), ...(notes ? { notes } : {}) }) as EBlock

  /** Splits a paragraph so a new scene starts at `pos`. */
  const sceneHere = (b: EBlock, pos: number) => {
    if (!('text' in b)) return
    const before = b.text.slice(0, pos).trimEnd()
    const rest = b.text.slice(pos).trimStart()
    const cue = makeBlock('cue', doc.meta.scene)
    const moved = cutParagraph(b, before, rest)
    commit({ k: 'ins', after: b.id, block: cue })
    if (rest) commit({ k: 'ins', after: cue.id, block: paragraph(rest, moved) })
    if (!before) commit({ k: 'del', id: b.id })
    setFocusReq({ id: cue.id, pos: 0 })
  }
  /** Lifts the selected words out of a paragraph into their own moment. */
  const momentAt = (b: EBlock, start: number, end: number) => {
    if (!('text' in b)) return
    const before = b.text.slice(0, start).trimEnd()
    const picked = b.text.slice(start, end).trim()
    const after = b.text.slice(end).trimStart()
    const moment = makeBlock('moment', doc.meta.scene, picked)
    const moved = cutParagraph(b, before, after)
    commit({ k: 'ins', after: b.id, block: moment })
    if (after) commit({ k: 'ins', after: moment.id, block: paragraph(after, moved) })
    if (!before) commit({ k: 'del', id: b.id })
  }
  const peek = (focus: string | null) => frame.current?.contentWindow?.postMessage({ type: 'peek', focus }, location.origin)
  const setMeta = (patch: Partial<Meta>) => commit({ k: 'meta', patch })
  /** Switching rooms points every scene block at a view the new room has. */
  const setRoom = (scene: SceneId) => {
    setMeta({ scene })
    const ids = rooms[scene].focuses.map((f) => f.id)
    docRef.current.blocks.forEach((b) => {
      if (b.type === 'cue' && !ids.includes(b.focus)) commit({ k: 'set', block: { ...b, focus: ids[0] } })
    })
  }

  /** Toolbar: a fresh block after the one being written, or the empty line itself becomes it. */
  const addBlock = (type: BlockType) => {
    const all = docRef.current.blocks
    const at = (activeId && find(activeId)) || all[all.length - 1]
    if (at?.type === 'p' && /^(\/[a-z]*)?$/i.test(at.text) && type !== 'p') turnInto(at, type, '')
    else insertAfter(at?.id ?? null, makeBlock(type, doc.meta.scene))
  }
  const selected = sel && find(sel.id)
  const withSelection = (act: (b: EBlock, start: number, end: number) => void) => () => {
    if (!sel || !selected) return
    act(selected, sel.start, sel.end)
    setSel(null)
  }
  const noteAt = (b: EBlock, start: number, end: number) => {
    if (b.type !== 'p') return
    commit({ k: 'set', block: { ...b, notes: [...(b.notes ?? []), { anchor: b.text.slice(start, end).trim(), text: '' }] } })
  }

  // Keep the preview on the scene being written.
  const sections = useMemo(() => sectionIndex(blocks), [blocks])
  const activeSection = activeId ? sections.get(activeId) : undefined
  useEffect(() => {
    if (activeSection === undefined) return
    frame.current?.contentWindow?.postMessage({ type: 'goto', index: activeSection }, location.origin)
  }, [activeSection])

  const togglePublish = () => {
    const next = !published
    const taken = new Set(builtIn.map((p) => p.slug).concat(loadDrafts().filter((d) => d.id !== initial.id && d.published).map((d) => draftToPost(d).slug)))
    let slug = draftRef.current.sourceSlug ?? slugify(doc.meta.title)
    if (!draftRef.current.sourceSlug) for (let n = 2; taken.has(slug); n++) slug = `${slugify(doc.meta.title)}-${n}`
    draftRef.current = { ...draftRef.current, published: next, slug: next ? slug : draftRef.current.slug }
    setPublished(next)
    flush()
  }

  const exportFile = () => {
    flush()
    const data = { post: draftToPost(draftRef.current), replay: replayRef.current }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    a.download = `${slugify(doc.meta.title)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const words = blocks.reduce((n, b) => n + ('text' in b && b.type === 'p' ? b.text.split(/\s+/).filter(Boolean).length : 0), 0)
  const room = rooms[doc.meta.scene]

  return (
    <div className={`editor view-${view}`}>
      <header className="ed-bar">
        <Link to="/write" className="ed-back" onClick={flush}>
          ←
        </Link>
        <span className={`ed-status ${saved ? '' : 'bad'}`} title={saved ? 'Saved in this browser · recording for replay' : 'This browser is not saving. Export a copy.'}>
          <span className="rec-dot" /> {saved ? `${words} words` : 'Not saving'}
        </span>
        <div className="ed-bar-actions">
          <button className="ed-view-toggle" onClick={() => setView(view === 'write' ? 'preview' : 'write')}>
            {view === 'write' ? 'Preview' : 'Write'}
          </button>
          <button className="ed-btn" onClick={exportFile} title="Download this post and its replay">
            Export
          </button>
          <button className={`ed-btn ${published ? 'live' : 'primary'}`} onClick={togglePublish}>
            {published ? 'Published' : 'Publish'}
          </button>
        </div>
      </header>

      <div className="ed-split">
        <main className="ed-doc">
          <Grow className="ed-title" value={doc.meta.title} placeholder="Title" onChange={(v) => setMeta({ title: v })} />
          <div className="ed-meta">
            <select value={doc.meta.chemical} onChange={(e) => setMeta({ chemical: e.target.value as Meta['chemical'] })} aria-label="Chemical" className={`chem-${doc.meta.chemical}`}>
              <option value="dopamine">Dopamine</option>
              <option value="oxytocin">Oxytocin</option>
            </select>
            <select value={doc.meta.scene} onChange={(e) => setRoom(e.target.value as SceneId)} aria-label="Room">
              {(Object.keys(rooms) as SceneId[]).map((r) => (
                <option key={r} value={r}>
                  {rooms[r].name}
                </option>
              ))}
            </select>
            <select value={doc.meta.card} onChange={(e) => setMeta({ card: e.target.value as Meta['card'] })} aria-label="Text card">
              <option value="light">Light card</option>
              <option value="dark">Dark card</option>
            </select>
            <input type="date" value={doc.meta.date} onChange={(e) => setMeta({ date: e.target.value })} aria-label="Date" />
          </div>
          <input className="ed-teaser" value={doc.meta.teaser} placeholder="One line for the home page" onChange={(e) => setMeta({ teaser: e.target.value })} />

          <Toolbar
            hasSelection={!!selected}
            onAdd={addBlock}
            onNote={withSelection(noteAt)}
            onSceneHere={withSelection((b, start) => sceneHere(b, start))}
            onMoment={withSelection(momentAt)}
          />

          <div className="ed-blocks">
            <Inserter onPick={(t) => insertAfter(null, makeBlock(t, doc.meta.scene))} />
            {blocks.map((b) => (
              <div
                key={b.id}
                className={[activeId === b.id && 'ed-active', dragId === b.id && 'ed-dragging', drop?.id === b.id && (drop.before ? 'ed-drop-before' : 'ed-drop-after')].filter(Boolean).join(' ')}
                onDragOver={(e) => {
                  if (!dragId) return
                  e.preventDefault()
                  const r = e.currentTarget.getBoundingClientRect()
                  setDrop({ id: b.id, before: e.clientY < r.top + r.height / 2 })
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  if (dragId && drop) moveNear(dragId, drop.id, drop.before)
                  setDragId(null)
                  setDrop(null)
                }}
              >
                <BlockEditor
                  block={b}
                  scene={doc.meta.scene}
                  focuses={room.focuses}
                  focusReq={focusReq}
                  onFocus={() => setActiveId(b.id)}
                  onText={(t) => setText(b.id, t)}
                  onSet={(nb) => commit({ k: 'set', block: nb })}
                  onSplit={(pos) => {
                    const text = 'text' in b ? b.text : ''
                    const moved = cutParagraph(b, text.slice(0, pos), text.slice(pos))
                    insertAfter(b.id, paragraph(text.slice(pos), moved))
                  }}
                  onRemoveEmpty={() => blocks.length > 1 && remove(b.id)}
                  onPasteParagraphs={(start, end, parts) => {
                    const text = 'text' in b ? b.text : ''
                    const tail = text.slice(end)
                    setText(b.id, text.slice(0, start) + parts[0])
                    let after = b.id
                    parts.slice(1).forEach((part, i) => {
                      const last = i === parts.length - 2
                      const nb = makeBlock('p', doc.meta.scene, last ? part + tail : part)
                      commit({ k: 'ins', after, block: nb })
                      after = nb.id
                      if (last) setFocusReq({ id: nb.id, pos: part.length })
                    })
                  }}
                  onTurnInto={(t, keep) => turnInto(b, t, keep)}
                  onDuplicate={() => insertAfter(b.id, { ...structuredClone(b), id: newId() })}
                  onDelete={() => remove(b.id, false)}
                  onSceneHere={(pos) => sceneHere(b, pos)}
                  onMoment={(start, end) => momentAt(b, start, end)}
                  onPeek={peek}
                  onSelection={(r) => setSel(r && { id: b.id, ...r })}
                  onDragStart={() => setDragId(b.id)}
                  onDragEnd={() => {
                    setDragId(null)
                    setDrop(null)
                  }}
                />
                <Inserter onPick={(t) => insertAfter(b.id, makeBlock(t, doc.meta.scene))} />
              </div>
            ))}
          </div>
        </main>

        <aside className="ed-preview">
          <iframe ref={frame} src={`/preview/${initial.id}`} title="Preview" />
        </aside>
      </div>
    </div>
  )
}

function Grow({ value, onChange, className, placeholder }: { value: string; onChange: (v: string) => void; className: string; placeholder: string }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])
  return <textarea ref={ref} rows={1} className={className} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value.replace(/\n/g, ' '))} />
}
