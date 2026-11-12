import { useRef, useState } from 'react'

interface Point {
  x: number
  y: number
}

function load(key: string): Point | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function save(key: string, p: Point) {
  try {
    localStorage.setItem(key, JSON.stringify(p))
  } catch {
    /* the spark just won't persist */
  }
}

/** A small spark at the end of a post. Drag it anywhere to leave it there. */
export default function SparkDrop({ storageKey, line }: { storageKey: string; line: string }) {
  const area = useRef<HTMLDivElement>(null)
  const [placed, setPlaced] = useState<Point | null>(() => load(storageKey))
  const [drag, setDrag] = useState<Point | null>(null)
  const [landed, setLanded] = useState(false)

  const toArea = (e: React.PointerEvent): Point | null => {
    const r = area.current?.getBoundingClientRect()
    if (!r) return null
    return {
      x: Math.min(0.97, Math.max(0.03, (e.clientX - r.left) / r.width)),
      y: Math.min(0.95, Math.max(0.05, (e.clientY - r.top) / r.height)),
    }
  }

  const drop = (p: Point) => {
    setPlaced(p)
    save(storageKey, p)
    setLanded(true)
    window.setTimeout(() => setLanded(false), 900)
  }

  const pos = drag ?? placed ?? { x: 0.5, y: 0.3 }

  return (
    <div ref={area} className="spark-area">
      <p className={`gift-line ${placed ? 'gone' : ''}`}>{line}</p>
      <button
        className={`spark ${placed ? 'placed' : 'waiting'} ${drag ? 'dragging' : ''} ${landed ? 'landed' : ''}`}
        style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }}
        aria-label={placed ? 'Your spark. Drag to move it.' : 'Leave a spark'}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          setDrag(toArea(e))
        }}
        onPointerMove={(e) => drag && setDrag(toArea(e))}
        onPointerUp={(e) => {
          const p = toArea(e)
          setDrag(null)
          if (p) drop(p)
        }}
        onPointerCancel={() => setDrag(null)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            drop({ x: 0.3 + Math.random() * 0.4, y: 0.25 + Math.random() * 0.3 })
          }
        }}
      />
    </div>
  )
}
