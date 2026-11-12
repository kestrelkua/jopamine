import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Block, Note } from '../content/types'

/** Fades its children in the first time they scroll into view. */
function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} className={`reveal ${shown ? 'in' : ''} ${className}`}>
      {children}
    </div>
  )
}

function Paragraph({ text, notes = [], commentary }: { text: string; notes?: Note[]; commentary: boolean }) {
  const [open, setOpen] = useState<number | null>(null)
  const active = commentary ? notes.filter((n) => text.includes(n.anchor)) : []

  // Split the text around each anchor phrase so anchors can be buttons.
  const parts: ReactNode[] = []
  let rest = text
  active
    .map((n) => ({ n, at: text.indexOf(n.anchor) }))
    .sort((a, b) => a.at - b.at)
    .forEach(({ n }) => {
      const i = rest.indexOf(n.anchor)
      if (i < 0) return
      const idx = notes.indexOf(n)
      parts.push(rest.slice(0, i))
      parts.push(
        <button
          key={idx}
          className={`anchor ${open === idx ? 'open' : ''}`}
          aria-expanded={open === idx}
          onClick={() => setOpen(open === idx ? null : idx)}
        >
          {n.anchor}
        </button>,
      )
      rest = rest.slice(i + n.anchor.length)
    })
  parts.push(rest)

  return (
    <Reveal>
      <p className="para">{parts}</p>
      {open !== null && commentary && (
        <aside className="note-card">
          <span className="note-kicker">Director’s commentary</span>
          {notes[open].text}
        </aside>
      )}
    </Reveal>
  )
}

export function BlockView({ block, commentary }: { block: Block; commentary: boolean }) {
  switch (block.type) {
    case 'heading':
      return (
        <Reveal>
          <h2 className="post-h2">{block.text}</h2>
        </Reveal>
      )
    case 'p':
      return <Paragraph text={block.text} notes={block.notes} commentary={commentary} />
    case 'moment':
      return (
        <Reveal className="moment-wrap">
          <p className="moment">{block.text}</p>
        </Reveal>
      )
    case 'steps':
      return (
        <Reveal>
          {block.intro && <p className="para">{block.intro}</p>}
          <ol className="steps">
            {block.items.map((item) => {
              const [head, ...tail] = item.split(':')
              return (
                <li key={item}>
                  <strong>{head}</strong>
                  {tail.length > 0 && `:${tail.join(':')}`}
                </li>
              )
            })}
          </ol>
        </Reveal>
      )
    case 'signature':
      return (
        <Reveal>
          <p className="signature">{block.text}</p>
        </Reveal>
      )
    default:
      return null
  }
}
