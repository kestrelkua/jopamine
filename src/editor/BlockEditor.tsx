import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { EBlock } from '../content/replay'
import type { SceneId } from '../content/types'
import SceneThumb from '../scenes/SceneThumb'
import { blockTypes, type BlockType } from './blocks'
import { useOutside } from './useOutside'

export interface FocusRequest {
  id: string
  pos: number
}

interface Props {
  block: EBlock
  scene: SceneId
  focuses: { id: string; name: string }[]
  focusReq: FocusRequest | null
  onFocus: () => void
  onText: (text: string) => void
  onSet: (block: EBlock) => void
  onSplit: (pos: number) => void
  onRemoveEmpty: () => void
  onPasteParagraphs: (pos: number, end: number, parts: string[]) => void
  onTurnInto: (type: BlockType, text?: string) => void
  onDuplicate: () => void
  onDelete: () => void
  onSceneHere: (pos: number) => void
  onMoment: (start: number, end: number) => void
  onPeek: (focus: string | null) => void
  onSelection: (sel: { start: number; end: number } | null) => void
  onDragStart: () => void
  onDragEnd: () => void
}

/** A textarea that grows with its content. */
function Grow(props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { areaRef?: React.RefObject<HTMLTextAreaElement | null> }) {
  const { areaRef, ...rest } = props
  const own = useRef<HTMLTextAreaElement>(null)
  const ref = areaRef ?? own
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  })
  return <textarea ref={ref} rows={1} {...rest} />
}

function Handle({ props }: { props: Props }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useOutside(ref, open, () => setOpen(false))
  return (
    <div className="ed-handle-wrap" ref={ref}>
      <button
        className="ed-handle"
        draggable
        aria-label="Drag to move, click for options"
        onClick={() => setOpen(!open)}
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', props.block.id)
          e.dataTransfer.effectAllowed = 'move'
          setOpen(false)
          props.onDragStart()
        }}
        onDragEnd={props.onDragEnd}
      >
        ⋮⋮
      </button>
      {open && (
        <div className="ed-menu" role="menu">
          <div className="ed-menu-types">
            {blockTypes.map((t) => (
              <button
                key={t.type}
                className={t.type === props.block.type ? 'on' : ''}
                title={t.name}
                onClick={() => {
                  props.onTurnInto(t.type)
                  setOpen(false)
                }}
              >
                <span>{t.icon}</span>
                {t.name}
              </button>
            ))}
          </div>
          <button className="ed-menu-row" onClick={() => (props.onDuplicate(), setOpen(false))}>
            Duplicate
          </button>
          <button className="ed-menu-row danger" onClick={() => (props.onDelete(), setOpen(false))}>
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

function SceneCue({ props }: { props: Props }) {
  const block = props.block as Extract<EBlock, { type: 'cue' }>
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = () => {
    setOpen(false)
    props.onPeek(null)
  }
  useOutside(ref, open, close)

  // A freshly added scene opens straight into the picker.
  useEffect(() => {
    if (props.focusReq?.id === block.id) setOpen(true)
  }, [props.focusReq, block.id])

  const current = props.focuses.find((f) => f.id === block.focus)
  return (
    <div className="ed-cue-wrap" ref={ref}>
      <div className="ed-cue">
        <button className="ed-cue-pick" onClick={() => (open ? close() : setOpen(true))} aria-expanded={open}>
          <SceneThumb scene={props.scene} focus={block.focus} />
          <span>{current?.name ?? block.focus}</span>
          <span className="ed-caret">▾</span>
        </button>
        <input className="ed-cue-label" value={block.label} placeholder="Scene name" onChange={(e) => props.onSet({ ...block, label: e.target.value })} />
      </div>
      {open && (
        <div className="ed-tray" onMouseLeave={() => props.onPeek(null)}>
          {props.focuses.map((f) => (
            <button
              key={f.id}
              className={`ed-tray-card ${f.id === block.focus ? 'on' : ''}`}
              onMouseEnter={() => props.onPeek(f.id)}
              onFocus={() => props.onPeek(f.id)}
              onClick={() => {
                props.onSet({ ...block, focus: f.id })
                close()
              }}
            >
              <SceneThumb scene={props.scene} focus={f.id} />
              <span>{f.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function BlockEditor(props: Props) {
  const { block, focusReq } = props
  const area = useRef<HTMLTextAreaElement>(null)
  const [rawSel, setRawSel] = useState<{ start: number; end: number; text: string } | null>(null)
  // A selection only counts while the text it was made in is unchanged.
  const sel = rawSel && 'text' in block && rawSel.text === block.text ? rawSel : null
  const setSel = (next: { start: number; end: number; text: string } | null) => {
    setRawSel(next)
    props.onSelection(next && { start: next.start, end: next.end })
  }
  const [slashIndex, setSlashIndex] = useState(0)
  const [slashOff, setSlashOff] = useState(false)

  useLayoutEffect(() => {
    if (focusReq?.id !== block.id) return
    const el = area.current ?? (document.querySelector(`[data-block="${block.id}"] input`) as HTMLInputElement | null)
    if (!el) return
    el.focus()
    if (el instanceof HTMLTextAreaElement) el.setSelectionRange(focusReq.pos, focusReq.pos)
  }, [focusReq, block.id])

  // "/" at the start of an empty paragraph opens the block menu.
  const slashQuery = block.type === 'p' && /^\/[a-z]*$/i.test(block.text) && !slashOff ? block.text.slice(1).toLowerCase() : null
  const slashItems = slashQuery === null ? [] : blockTypes.filter((t) => t.type !== 'p' && t.name.toLowerCase().startsWith(slashQuery))
  const pickSlash = (type: BlockType) => {
    props.onTurnInto(type, '')
    setSlashIndex(0)
  }

  const textKeys = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget
    if (slashItems.length > 0) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const d = e.key === 'ArrowDown' ? 1 : -1
        setSlashIndex((slashIndex + d + slashItems.length) % slashItems.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        pickSlash(slashItems[Math.min(slashIndex, slashItems.length - 1)].type)
        return
      }
      if (e.key === 'Escape') {
        setSlashOff(true)
        return
      }
    }
    if (e.key === 'Enter' && !e.shiftKey && block.type === 'p') {
      e.preventDefault()
      props.onSplit(el.selectionStart)
    } else if (e.key === 'Backspace' && el.value === '') {
      e.preventDefault()
      props.onRemoveEmpty()
    }
  }

  const paste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData('text/plain')
    if (block.type !== 'p' || !/\n/.test(text.trim())) return
    e.preventDefault()
    const parts = text
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean)
    props.onPasteParagraphs(e.currentTarget.selectionStart, e.currentTarget.selectionEnd, parts)
  }

  const trackSelection = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget
    const picked = el.value.slice(el.selectionStart, el.selectionEnd)
    setSel(picked.trim() ? { start: el.selectionStart, end: el.selectionEnd, text: el.value } : null)
  }

  let body: React.ReactNode
  switch (block.type) {
    case 'p': {
      const picked = sel ? block.text.slice(sel.start, sel.end).trim() : ''
      body = (
        <>
          <Grow
            areaRef={area}
            className="ed-text ed-p"
            value={block.text}
            placeholder="Write, or type / for more"
            onChange={(e) => {
              setSlashOff(false)
              props.onText(e.target.value)
            }}
            onKeyDown={textKeys}
            onPaste={paste}
            onSelect={trackSelection}
            onBlur={() => window.setTimeout(() => setSel(null), 150)}
          />
          {slashItems.length > 0 && (
            <div className="ed-slash" role="listbox">
              {slashItems.map((t, i) => (
                <button
                  key={t.type}
                  role="option"
                  aria-selected={i === slashIndex}
                  className={i === slashIndex ? 'on' : ''}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickSlash(t.type)}
                >
                  <span>{t.icon}</span>
                  {t.name}
                </button>
              ))}
            </div>
          )}
          {sel && picked && (
            <div className="ed-bubble" onMouseDown={(e) => e.preventDefault()}>
              {picked.length < 120 && (
                <button
                  onClick={() => {
                    props.onSet({ ...block, notes: [...(block.notes ?? []), { anchor: picked, text: '' }] })
                    setSel(null)
                  }}
                >
                  ✎ Note
                </button>
              )}
              <button onClick={() => (props.onSceneHere(sel.start), setSel(null))}>◆ Scene here</button>
              {picked.length < 60 && <button onClick={() => (props.onMoment(sel.start, sel.end), setSel(null))}>! Moment</button>}
            </div>
          )}
          {block.notes?.map((n, i) => (
            <div key={i} className={`ed-note ${block.text.includes(n.anchor) ? '' : 'lost'}`}>
              <span className="ed-note-anchor">“{n.anchor}”</span>
              <input
                className="ed-note-text"
                value={n.text}
                autoFocus={!n.text}
                placeholder="Commentary…"
                onChange={(e) => props.onSet({ ...block, notes: block.notes!.map((m, j) => (j === i ? { ...m, text: e.target.value } : m)) })}
              />
              <button className="ed-x" aria-label="Remove note" onClick={() => props.onSet({ ...block, notes: block.notes!.filter((_, j) => j !== i) })}>
                ✕
              </button>
            </div>
          ))}
        </>
      )
      break
    }
    case 'heading':
    case 'moment':
    case 'signature':
      body = (
        <Grow
          areaRef={area}
          className={`ed-text ed-${block.type}`}
          value={block.text}
          placeholder={block.type === 'heading' ? 'Heading' : block.type === 'moment' ? 'Ding!' : '- Name'}
          onChange={(e) => props.onText(e.target.value.replace(/\n/g, ' '))}
          onKeyDown={textKeys}
        />
      )
      break
    case 'cue':
      body = <SceneCue props={props} />
      break
    case 'steps':
      body = (
        <div className="ed-steps">
          <input className="ed-steps-intro" value={block.intro ?? ''} placeholder="Intro line" onChange={(e) => props.onSet({ ...block, intro: e.target.value })} />
          <Grow
            areaRef={area}
            className="ed-text ed-steps-items"
            value={block.items.join('\n')}
            placeholder="One step per line"
            onChange={(e) => props.onSet({ ...block, items: e.target.value.split('\n') })}
          />
        </div>
      )
      break
  }

  return (
    <div className={`ed-block ed-block-${block.type}`} data-block={block.id} onFocus={props.onFocus}>
      <Handle props={props} />
      {body}
    </div>
  )
}

export function Inserter({ onPick }: { onPick: (type: BlockType) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useOutside(ref, open, () => setOpen(false))
  return (
    <div className={`ed-insert ${open ? 'open' : ''}`} ref={ref}>
      {open ? (
        <div className="ed-insert-menu">
          {blockTypes.map((t) => (
            <button
              key={t.type}
              onClick={() => {
                onPick(t.type)
                setOpen(false)
              }}
            >
              <span>{t.icon}</span> {t.name}
            </button>
          ))}
        </div>
      ) : (
        <button className="ed-insert-btn" onClick={() => setOpen(true)} aria-label="Insert block">
          +
        </button>
      )}
    </div>
  )
}
