import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { posts as builtIn } from '../content'
import { draftToPost, loadDrafts, loadReplay, newId, saveDraft, saveReplay, slugify, type Draft } from '../content/drafts'
import { savePhoto } from '../content/photos'
import { applyOp, diffText, lastStretch, type Doc, type EBlock, type Meta, type Op, type OpInput, type Replay } from '../content/replay'
import type { SceneId } from '../content/types'
import ReplayOverlay from '../reader/ReplayOverlay'
import '../reader/Reader.css'
import { sceneComponents } from '../scenes/components'
import { rooms } from '../scenes/registry'
import { ding, setSoundOn, soundOn } from '../sound'
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

/** The scene focus in effect at block `id` (the last cue above it). */
function focusAt(blocks: EBlock[], id: string | null): string {
  let focus = 'default'
  for (const b of blocks) {
    if (b.type === 'cue') focus = b.focus
    if (b.id === id) break
  }
  return focus
}

function loadGoal(id: string): number {
  try {
    return Number(localStorage.getItem(`jt.goal.${id}`)) || 800
  } catch {
    return 800
  }
}

/** What an op is "doing", so a run of typing in one place undoes as one step. */
const runKey = (op: OpInput) => (op.k === 'text' ? `t${op.id}` : op.k === 'set' ? `s${op.block.id}` : op.k === 'meta' ? `m${Object.keys(op.patch)}` : null)

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
  const [flick, setFlick] = useState({ id: '', n: 0 })
  const [goal, setGoal] = useState(() => loadGoal(initial.id))
  const [goalOpen, setGoalOpen] = useState(false)
  const [typewriter, setTypewriter] = useState(false)
  const [mini, setMini] = useState<Replay | null>(null)
  const [sound, setSound] = useState(soundOn)
  const history = useRef({ past: [] as Doc[], future: [] as Doc[], run: null as string | null, runAt: 0, grouped: false })
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

  const record = (op: OpInput) => {
    docRef.current = applyOp(docRef.current, op)
    replayRef.current.ops.push({ ...op, t: Date.now() } as Op)
    setDoc(docRef.current)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(flush, 350)
  }

  /** Saves an undo point unless this op continues the same run of typing, or is part of the same action. */
  const remember = (op: OpInput) => {
    const h = history.current
    const now = Date.now()
    const key = runKey(op)
    const continuing = key !== null && key === h.run && now - h.runAt < 1200
    h.run = key
    h.runAt = now
    h.future = []
    if (continuing || h.grouped) return
    h.past.push(docRef.current)
    if (h.past.length > 300) h.past.shift()
    h.grouped = true
    queueMicrotask(() => (h.grouped = false))
  }

  const commit = (op: OpInput) => {
    if ((op.k === 'ins' || op.k === 'set') && op.block.type === 'moment' && find(op.block.id)?.type !== 'moment') ding()
    remember(op)
    record(op)
  }

  const travel = (back: boolean) => {
    const h = history.current
    const target = (back ? h.past : h.future).pop()
    if (!target) return
    ;(back ? h.future : h.past).push(docRef.current)
    h.run = null
    const now = docRef.current.blocks
    const changed = target.blocks.find((b) => !now.includes(b)) ?? target.blocks.find((b) => b.id === activeId)
    record({ k: 'doc', doc: target })
    if (changed) setFocusReq({ id: changed.id, pos: 'text' in changed ? changed.text.length : 0 })
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
    const text = keep ?? ('text' in b ? b.text : b.type === 'steps' ? b.items.join(' ') : b.type === 'cue' ? b.label : b.type === 'photo' ? b.caption : '')
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
  /** Saves each image and adds a photo block for it after `after`. */
  const addPhotos = async (files: File[], after: string | null) => {
    for (const f of files) {
      const block = { ...makeBlock('photo', doc.meta.scene), src: await savePhoto(f) } as EBlock
      commit({ k: 'ins', after, block })
      after = block.id
    }
  }
  const noteAt = (b: EBlock, start: number, end: number) => {
    if (b.type !== 'p') return
    commit({ k: 'set', block: { ...b, notes: [...(b.notes ?? []), { anchor: b.text.slice(start, end).trim(), text: '' }] } })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        travel(!e.shiftKey)
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        travel(false)
      } else if (mod && e.shiftKey && e.key === 'Enter') {
        e.preventDefault()
        setTypewriter((t) => !t)
      } else if (e.key === 'Escape' && typewriter && !document.querySelector('.ed-slash, .ed-tray, .ed-menu')) {
        setTypewriter(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  // Typewriter mode keeps the line being written a little above the middle of the screen.
  useEffect(() => {
    if (!typewriter) return
    const el = document.activeElement
    if (!(el instanceof HTMLTextAreaElement)) return
    const r = el.getBoundingClientRect()
    const caretY = r.top + r.height * (el.value.length ? el.selectionStart / el.value.length : 0)
    const delta = caretY - window.innerHeight * 0.45
    if (Math.abs(delta) > 24) window.scrollBy({ top: delta })
  }, [doc, typewriter])

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

  const pickGoal = (n: number) => {
    setGoal(n)
    try {
      localStorage.setItem(`jt.goal.${initial.id}`, String(n))
    } catch {
      // The goal just resets next time.
    }
  }
  const ambientFocus = focusAt(blocks, activeId)
  const Ambient = sceneComponents[doc.meta.scene]
  const noFocus = useCallback(() => {}, [])

  const words = blocks.reduce((n, b) => n + ('text' in b && b.type === 'p' ? b.text.split(/\s+/).filter(Boolean).length : 0), 0)
  const room = rooms[doc.meta.scene]

  return (
    <div className={`editor view-${view} ${typewriter ? 'typewriter' : ''}`}>
      <div className="ed-ambience" aria-hidden="true">
        <Ambient focus={ambientFocus} progress={0.5} />
      </div>
      {typewriter && (
        <button className="ed-tw-exit" onClick={() => setTypewriter(false)} aria-label="Leave typewriter mode">
          ◎
        </button>
      )}
      <header className="ed-bar">
        <div className={`ed-meter chem-${doc.meta.chemical} ${words >= goal ? 'full' : ''}`} aria-hidden="true">
          <i style={{ width: `${Math.min(100, (words / goal) * 100)}%` }} />
        </div>
        <Link to="/write" className="ed-back" onClick={flush}>
          ←
        </Link>
        <span className={`ed-status ${saved ? '' : 'bad'}`} title={saved ? 'Saved in this browser · recording for replay' : 'This browser is not saving. Export a copy.'}>
          <button className="ed-mini-play" onClick={() => setMini(lastStretch(replayRef.current, 60_000))} disabled={replayRef.current.ops.length < 2} aria-label="Replay the last minute">
            <span className="rec-dot" />
            <span className="ed-mini-tri">▶</span>
          </button>
          {saved ? (
            <span className="ed-goal-wrap">
              <button className="ed-words" onClick={() => setGoalOpen(!goalOpen)} aria-expanded={goalOpen}>
                {words} <span className="ed-goal-of">/ {goal}</span>
              </button>
              {goalOpen && (
                <span className="ed-goal">
                  {[300, 500, 800, 1200, 2000].map((n) => (
                    <button key={n} className={n === goal ? 'on' : ''} onClick={() => (pickGoal(n), setGoalOpen(false))}>
                      {n}
                    </button>
                  ))}
                </span>
              )}
            </span>
          ) : (
            'Not saving'
          )}
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
            canUndo={history.current.past.length > 0}
            canRedo={history.current.future.length > 0}
            onUndo={() => travel(true)}
            onRedo={() => travel(false)}
            typewriter={typewriter}
            onTypewriter={() => setTypewriter(!typewriter)}
            sound={sound}
            onSound={() => {
              setSoundOn(!sound)
              setSound(!sound)
            }}
            hasSelection={!!selected}
            onAdd={addBlock}
            onNote={withSelection(noteAt)}
            onSceneHere={withSelection((b, start) => sceneHere(b, start))}
            onMoment={withSelection(momentAt)}
          />

          <div
            className="ed-blocks"
            onDragOver={(e) => {
              if (!dragId && e.dataTransfer.types.includes('Files')) e.preventDefault()
            }}
            onDrop={(e) => {
              const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'))
              if (dragId || !files.length) return
              e.preventDefault()
              const target = (e.target as HTMLElement).closest('[data-block]')?.getAttribute('data-block')
              void addPhotos(files, target ?? blocks[blocks.length - 1]?.id ?? null)
              setDrop(null)
            }}
          >
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
                  if (!dragId) return
                  e.preventDefault()
                  if (drop) moveNear(dragId, drop.id, drop.before)
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
                    if (text.slice(0, pos).trim()) setFlick((f) => ({ id: b.id, n: f.n + 1 }))
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
                  onPhotos={(files) => void addPhotos(files, b.id)}
                  onDragStart={() => setDragId(b.id)}
                  onDragEnd={() => {
                    setDragId(null)
                    setDrop(null)
                  }}
                />
                {flick.id === b.id && <span key={flick.n} className="ed-flick" aria-hidden="true" />}
                <Inserter onPick={(t) => insertAfter(b.id, makeBlock(t, doc.meta.scene))} />
              </div>
            ))}
          </div>
        </main>

        <aside className="ed-preview">
          <iframe ref={frame} src={`${import.meta.env.BASE_URL}preview/${initial.id}`} title="Preview" />
        </aside>
      </div>

      {mini && (
        <div className={`ed-mini reader card-${doc.meta.card} chem-${doc.meta.chemical}`}>
          <ReplayOverlay replay={mini} onClose={() => setMini(null)} onFocus={noFocus} initialSpeed={16} />
        </div>
      )}
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
