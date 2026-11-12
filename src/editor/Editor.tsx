import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { posts as builtIn } from '../content'
import { draftToPost, loadDrafts, loadReplay, saveDraft, saveReplay, slugify, type Draft } from '../content/drafts'
import { applyOp, diffText, type EBlock, type Meta, type Op, type OpInput, type Replay } from '../content/replay'
import type { SceneId } from '../content/types'
import { rooms } from '../scenes/registry'
import BlockEditor, { Inserter, type FocusRequest } from './BlockEditor'
import { makeBlock, type BlockType } from './blocks'
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
  const move = (id: string, dir: -1 | 1) => {
    const list = docRef.current.blocks
    const i = indexOf(id)
    const j = i + dir
    if (j < 0 || j >= list.length) return
    const after = dir === -1 ? (list[j - 1]?.id ?? null) : list[j].id
    commit({ k: 'mv', id, after })
  }
  const turnInto = (b: EBlock, type: BlockType) => {
    const text = 'text' in b ? b.text : b.type === 'steps' ? b.items.join(' ') : b.type === 'cue' ? b.label : ''
    const next = { ...makeBlock(type, doc.meta.scene, text), id: b.id }
    commit({ k: 'set', block: next })
  }
  const setMeta = (patch: Partial<Meta>) => commit({ k: 'meta', patch })

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
            <select value={doc.meta.scene} onChange={(e) => setMeta({ scene: e.target.value as SceneId })} aria-label="Room">
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

          <div className="ed-blocks">
            <Inserter onPick={(t) => insertAfter(null, makeBlock(t, doc.meta.scene))} />
            {blocks.map((b) => (
              <div key={b.id} className={activeId === b.id ? 'ed-active' : ''}>
                <BlockEditor
                  block={b}
                  focuses={room.focuses}
                  focusReq={focusReq}
                  onFocus={() => setActiveId(b.id)}
                  onText={(t) => setText(b.id, t)}
                  onSet={(nb) => commit({ k: 'set', block: nb })}
                  onSplit={(pos) => {
                    const text = 'text' in b ? b.text : ''
                    setText(b.id, text.slice(0, pos))
                    insertAfter(b.id, makeBlock('p', doc.meta.scene, text.slice(pos)))
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
                  onMove={(dir) => move(b.id, dir)}
                  onDelete={() => remove(b.id, false)}
                  onTurnInto={(t) => turnInto(b, t)}
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
