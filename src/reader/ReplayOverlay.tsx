import { useEffect, useMemo, useRef, useState } from 'react'
import { usePhoto } from '../content/photos'
import { applyOp, docAt, MAX_PAUSE, type Doc, type Replay } from '../content/replay'

const speeds = [1, 4, 16]

/** Plays a post being written. Reports the latest scene cue so the room can follow along. */
export default function ReplayOverlay({
  replay,
  onClose,
  onFocus,
  initialSpeed = 4,
}: {
  replay: Replay
  onClose: () => void
  onFocus: (focus: string) => void
  initialSpeed?: number
}) {
  // Playback time (ms) at which each op happens, with long pauses shortened.
  const times = useMemo(() => {
    const out: number[] = []
    let acc = 0
    replay.ops.forEach((op, i) => {
      if (i > 0) acc += Math.min(MAX_PAUSE, op.t - replay.ops[i - 1].t)
      out.push(acc)
    })
    return out
  }, [replay])
  const total = times[times.length - 1] ?? 0

  const [clock, setClock] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState(initialSpeed)
  const cache = useRef<{ count: number; doc: Doc }>({ count: 0, doc: replay.start })
  const caretRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = now - last
      last = now
      setClock((c) => {
        const next = c + dt * speed
        if (next >= total) {
          setPlaying(false)
          return total
        }
        return next
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, speed, total])

  // How many ops have happened by `clock`, then the doc at that point (stepping forward when possible).
  let count = 0
  while (count < times.length && times[count] <= clock) count++
  const c = cache.current
  if (count < c.count) {
    c.doc = docAt(replay, count)
  } else {
    for (let i = c.count; i < count; i++) c.doc = applyOp(c.doc, replay.ops[i])
  }
  c.count = count
  const doc = c.doc

  const lastOp = count > 0 ? replay.ops[count - 1] : null
  const activeId = lastOp && 'id' in lastOp ? lastOp.id : lastOp && 'block' in lastOp ? lastOp.block.id : null
  const cues = doc.blocks.filter((b) => b.type === 'cue')
  const focus = cues.length ? (cues[cues.length - 1] as { focus: string }).focus : 'default'

  useEffect(() => onFocus(focus), [focus, onFocus])
  useEffect(() => {
    caretRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [activeId])

  return (
    <div className="replay" role="dialog" aria-label="Writing replay">
      <div className="replay-page">
        <h1 className="replay-title">{doc.meta.title || ' '}</h1>
        {doc.blocks.map((b) => {
          const active = b.id === activeId
          const caret = active ? <span className="caret" /> : null
          const wrap = (node: React.ReactNode) => (
            <div key={b.id} ref={active ? caretRef : undefined} className={`replay-block ${active ? 'active' : ''}`}>
              {node}
            </div>
          )
          switch (b.type) {
            case 'cue':
              return wrap(<p className="replay-cue">◆ {b.label}</p>)
            case 'heading':
              return wrap(<h2 className="post-h2">{b.text}{caret}</h2>)
            case 'moment':
              return wrap(<p className="moment">{b.text}{caret}</p>)
            case 'p':
              return wrap(<p className="para">{b.text}{caret}</p>)
            case 'signature':
              return wrap(<p className="signature">{b.text}{caret}</p>)
            case 'photo':
              return wrap(<ReplayPhoto src={b.src} caption={b.caption} />)
            case 'steps':
              return wrap(
                <ol className="steps">
                  {b.items.map((it, i) => (
                    <li key={i}>{it}</li>
                  ))}
                </ol>,
              )
          }
        })}
      </div>

      <div className="replay-bar">
        <button className="rp-btn" onClick={() => (clock >= total ? (setClock(0), setPlaying(true)) : setPlaying(!playing))} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? '❚❚' : '▶'}
        </button>
        <input
          className="rp-scrub"
          type="range"
          min={0}
          max={total}
          value={clock}
          onChange={(e) => setClock(Number(e.target.value))}
          aria-label="Position in the replay"
        />
        {speeds.map((s) => (
          <button key={s} className={`rp-speed ${s === speed ? 'on' : ''}`} onClick={() => setSpeed(s)}>
            {s}×
          </button>
        ))}
        <button className="rp-btn" onClick={onClose} aria-label="Close replay">
          ✕
        </button>
      </div>
    </div>
  )
}

function ReplayPhoto({ src, caption }: { src: string; caption: string }) {
  const url = usePhoto(src)
  return <figure className="photo">{url ? <img src={url} alt={caption} /> : <div className="photo-missing" />}</figure>
}
