import { useEffect, useRef, useState, type ReactNode } from 'react'
import { usePhoto } from '../content/photos'
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

/** Lights its words (or, for a single word, its letters) one by one as it scrolls up the screen. */
function LitText({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const units = text.trim().includes(' ') ? text.split(/(\s+)/) : Array.from(text)
  const count = units.filter((u) => u.trim()).length
  const [lit, setLit] = useState(0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setLit(count)
      return
    }
    const measure = () => {
      const el = ref.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const p = (window.innerHeight * 0.85 - r.top) / (window.innerHeight * 0.3)
      setLit(Math.max(0, Math.min(count, Math.ceil(p * count))))
    }
    measure()
    // Capture also hears scrolling inside a panel (the cave's story cards), not just the page.
    window.addEventListener('scroll', measure, { passive: true, capture: true })
    return () => window.removeEventListener('scroll', measure, { capture: true })
  }, [count])
  let n = 0
  return (
    <p className="moment lit-text" ref={ref} aria-label={text}>
      {units.map((u, i) =>
        u.trim() ? (
          <span key={i} className={`lit-unit ${n++ < lit ? 'on' : ''}`} aria-hidden="true">
            {u}
          </span>
        ) : (
          u
        ),
      )}
    </p>
  )
}

function Photo({ src, caption }: { src: string; caption: string }) {
  const url = usePhoto(src)
  if (!url) return null
  return (
    <Reveal>
      <figure className="photo">
        <img src={url} alt={caption} loading="lazy" />
        {caption && <figcaption>{caption}</figcaption>}
      </figure>
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
          <LitText text={block.text} />
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
    case 'photo':
      return <Photo src={block.src} caption={block.caption} />
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
