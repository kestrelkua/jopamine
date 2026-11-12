import { useRef, useState } from 'react'
import { strum } from '../music'
import Guitar from './Guitar'

/** The person in the room (a `data-gift-target` element) under a screen point, if any. */
function targetAt(x: number, y: number): string | null {
  for (const el of document.elementsFromPoint(x, y)) {
    const t = el.closest('[data-gift-target]')
    if (t) return t.getAttribute('data-gift-target')
  }
  return null
}

interface Props {
  line: string
  given: string | null
  targets: string[]
  onHover: (name: string | null) => void
  onGive: (name: string) => void
}

/** A guitar waiting at the end of the post: drag it onto someone in the room and they start playing. */
export default function GiftDrop({ line, given, targets, onHover, onGive }: Props) {
  const start = useRef({ x: 0, y: 0 })
  const [offset, setOffset] = useState<{ x: number; y: number } | null>(null)
  const hover = useRef<string | null>(null)
  const setHover = (name: string | null) => {
    if (hover.current === name) return
    hover.current = name
    onHover(name)
  }
  const give = (name: string) => {
    setHover(null)
    onGive(name)
    strum()
  }

  return (
    <div className={`gift ${given ? 'given' : ''}`}>
      <p className="gift-line">{given ? `${given} is playing it now` : line}</p>
      {!given && (
        <button
          className={`gift-item ${offset ? 'dragging' : ''}`}
          style={offset ? { transform: `translate(${offset.x}px, ${offset.y}px) rotate(-14deg) scale(1.15)` } : undefined}
          aria-label={`Give the guitar to someone (${targets.join(', ')})`}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            start.current = { x: e.clientX, y: e.clientY }
            setOffset({ x: 0, y: 0 })
          }}
          onPointerMove={(e) => {
            if (!offset) return
            setOffset({ x: e.clientX - start.current.x, y: e.clientY - start.current.y })
            setHover(targetAt(e.clientX, e.clientY))
          }}
          onPointerUp={(e) => {
            const name = targetAt(e.clientX, e.clientY)
            setOffset(null)
            if (name) give(name)
            else setHover(null)
          }}
          onPointerCancel={() => {
            setOffset(null)
            setHover(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              give(targets[Math.floor(Math.random() * targets.length)])
            }
          }}
        >
          <Guitar />
        </button>
      )}
    </div>
  )
}
