import { useLayoutEffect, useRef, useState } from 'react'
import type { EBlock } from '../content/replay'
import { blockTypes, type BlockType } from './blocks'

export interface FocusRequest {
  id: string
  pos: number
}

interface Props {
  block: EBlock
  focuses: { id: string; name: string }[]
  focusReq: FocusRequest | null
  onFocus: () => void
  onText: (text: string) => void
  onSet: (block: EBlock) => void
  onSplit: (pos: number) => void
  onRemoveEmpty: () => void
  onPasteParagraphs: (pos: number, end: number, parts: string[]) => void
  onMove: (dir: -1 | 1) => void
  onDelete: () => void
  onTurnInto: (type: BlockType) => void
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

export default function BlockEditor(props: Props) {
  const { block, focusReq } = props
  const area = useRef<HTMLTextAreaElement>(null)
  const [selection, setSelection] = useState('')

  useLayoutEffect(() => {
    if (focusReq?.id !== block.id) return
    const el = area.current ?? (document.querySelector(`[data-block="${block.id}"] input, [data-block="${block.id}"] select`) as HTMLInputElement | null)
    if (!el) return
    el.focus()
    if (el instanceof HTMLTextAreaElement) el.setSelectionRange(focusReq.pos, focusReq.pos)
  }, [focusReq, block.id])

  const textKeys = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget
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
    setSelection(el.value.slice(el.selectionStart, el.selectionEnd).trim())
  }

  let body: React.ReactNode
  switch (block.type) {
    case 'p':
      body = (
        <>
          <Grow
            areaRef={area}
            className="ed-text ed-p"
            value={block.text}
            placeholder="Write…"
            onChange={(e) => props.onText(e.target.value)}
            onKeyDown={textKeys}
            onPaste={paste}
            onSelect={trackSelection}
            onBlur={() => window.setTimeout(() => setSelection(''), 200)}
          />
          {selection && selection.length < 120 && (
            <button
              className="ed-note-add"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                props.onSet({ ...block, notes: [...(block.notes ?? []), { anchor: selection, text: '' }] })
                setSelection('')
              }}
            >
              ✎ note
            </button>
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
      body = (
        <div className="ed-cue">
          <span className="ed-cue-mark">◆</span>
          <select value={block.focus} onChange={(e) => props.onSet({ ...block, focus: e.target.value })} aria-label="Scene">
            {props.focuses.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
            {!props.focuses.some((f) => f.id === block.focus) && <option value={block.focus}>{block.focus}</option>}
          </select>
          <input className="ed-cue-label" value={block.label} placeholder="Scene name" onChange={(e) => props.onSet({ ...block, label: e.target.value })} />
        </div>
      )
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
      {body}
      <div className="ed-tools">
        <button onClick={() => props.onMove(-1)} aria-label="Move up">
          ↑
        </button>
        <button onClick={() => props.onMove(1)} aria-label="Move down">
          ↓
        </button>
        <select value={block.type} onChange={(e) => props.onTurnInto(e.target.value as BlockType)} aria-label="Block type">
          {blockTypes.map((t) => (
            <option key={t.type} value={t.type}>
              {t.icon} {t.name}
            </option>
          ))}
        </select>
        <button onClick={props.onDelete} aria-label="Delete block">
          ✕
        </button>
      </div>
    </div>
  )
}

export function Inserter({ onPick }: { onPick: (type: BlockType) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`ed-insert ${open ? 'open' : ''}`}>
      {open ? (
        <div className="ed-insert-menu" onMouseLeave={() => setOpen(false)}>
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
