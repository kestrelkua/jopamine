import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { firstFocus, wordCount, type Post } from '../content/types'
import SceneThumb from '../scenes/SceneThumb'

/**
 * A post on the home page: it tilts toward the pointer, can be grabbed and tossed
 * (it springs back home), and a plain click opens it.
 */
export default function PostCard({ post, onOpen }: { post: Post; onOpen: (post: Post, from: DOMRect) => void }) {
  const ref = useRef<HTMLAnchorElement>(null)
  const art = useRef<HTMLSpanElement>(null)
  const m = useRef({ down: false, moved: false, sx: 0, sy: 0, x: 0, y: 0, vx: 0, vy: 0, t: 0, raf: 0 })

  const paint = (tiltX = 0, tiltY = 0) => {
    const s = m.current
    const el = ref.current
    if (!el) return
    el.style.transform = `translate(${s.x}px, ${s.y}px) rotate(${s.x * 0.04 + Math.max(-15, Math.min(15, s.vx * 0.6))}deg) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`
  }

  /** Damped spring back to where the card lives. */
  const springHome = () => {
    const s = m.current
    cancelAnimationFrame(s.raf)
    let last = performance.now()
    const step = (now: number) => {
      // Units are pixels per 60fps frame; f is how many frames passed.
      const f = Math.min(2, (now - last) / 16.7)
      last = now
      s.vx += (-0.08 * s.x - 0.22 * s.vx) * f
      s.vy += (-0.08 * s.y - 0.22 * s.vy) * f
      s.x += s.vx * f
      s.y += s.vy * f
      paint()
      if (Math.abs(s.x) + Math.abs(s.y) + Math.abs(s.vx) + Math.abs(s.vy) < 0.3) {
        s.x = s.y = s.vx = s.vy = 0
        if (ref.current) ref.current.style.transform = ''
        ref.current?.classList.remove('tossing')
        return
      }
      s.raf = requestAnimationFrame(step)
    }
    s.raf = requestAnimationFrame(step)
  }

  return (
    <Link
      ref={ref}
      to={`/post/${post.slug}`}
      className={`post-card scene-${post.scene}`}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        const s = m.current
        cancelAnimationFrame(s.raf)
        Object.assign(s, { down: true, moved: false, sx: e.clientX - s.x, sy: e.clientY - s.y, t: performance.now(), vx: 0, vy: 0 })
      }}
      onPointerMove={(e) => {
        const s = m.current
        const el = ref.current
        if (!el) return
        if (!s.down) {
          if (e.pointerType !== 'mouse' || s.x || s.y) return
          const r = el.getBoundingClientRect()
          paint(((e.clientY - r.top) / r.height - 0.5) * -10, ((e.clientX - r.left) / r.width - 0.5) * 12)
          return
        }
        const nx = e.clientX - s.sx
        const ny = e.clientY - s.sy
        if (!s.moved && Math.hypot(nx - s.x, ny - s.y) < 6) return
        if (!s.moved) {
          s.moved = true
          el.setPointerCapture(e.pointerId)
          el.classList.add('tossing')
        }
        const now = performance.now()
        const dt = Math.max(1, now - s.t) / 16
        s.vx = (nx - s.x) / dt
        s.vy = (ny - s.y) / dt
        s.t = now
        s.x = nx
        s.y = ny
        paint()
      }}
      onPointerUp={() => {
        const s = m.current
        s.down = false
        if (s.moved) springHome()
      }}
      onPointerCancel={() => {
        m.current.down = false
        springHome()
      }}
      onPointerLeave={() => {
        const s = m.current
        if (!s.down && !s.x && !s.y && ref.current) ref.current.style.transform = ''
      }}
      onClick={(e) => {
        e.preventDefault()
        if (m.current.moved) return
        onOpen(post, (art.current ?? e.currentTarget).getBoundingClientRect())
      }}
    >
      <span className="post-card-art" ref={art} aria-hidden="true">
        <SceneThumb scene={post.scene} focus={firstFocus(post)} progress={0} />
      </span>
      <span className="post-card-body">
        <span className="post-card-title">{post.title}</span>
        <span className="post-card-teaser">{post.teaser}</span>
        <span className="post-card-meta">
          {new Date(post.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {Math.max(1, Math.round(wordCount(post) / 230))} min
        </span>
      </span>
    </Link>
  )
}
