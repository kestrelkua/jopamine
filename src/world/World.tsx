import { useCallback, useEffect, useRef, useState } from 'react'
import { whoosh } from '../sound'
import { Link, useNavigate } from 'react-router-dom'
import { allPosts, useDrafts } from '../content/drafts'
import type { Post } from '../content/types'
import Door from '../pages/Door'
import '../pages/Home.css'
import { createWorld, type Place } from './engine'
import { hasInside } from './inside/hasInside'
import './World.css'

const FROM = 'jt.world.from'

const places: Place[] = [
  { key: 'studio', title: 'Studio', to: '/write' },
  { key: 'library', title: 'Library', to: '/library' },
]

function rememberDoor(key: string) {
  try {
    sessionStorage.setItem(FROM, key)
  } catch {
    // Coming back just starts in the middle.
  }
}

/** Where a building's door leads: walking inside if the post has an inside, otherwise the reader. */
const placeOf = (post: Post) => (hasInside(post) ? `/inside/${post.slug}` : `/post/${post.slug}`)

function cameFrom() {
  try {
    return sessionStorage.getItem(FROM)
  } catch {
    return null
  }
}

/** Stepping through a doorway into a 3D inside: the dark of the doorway grows until it fills the screen. */
function Dive({ from, onDone }: { from: DOMRect; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => setOpen(true))
    })
    whoosh()
    const done = window.setTimeout(onDone, 750)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(done)
    }
  }, [onDone])
  const x = from.left + from.width / 2
  const y = from.top + from.height / 2
  const r = open ? '150vmax' : `${Math.max(from.width, from.height) / 2}px`
  return <div className="world-dive" style={{ clipPath: `circle(${r} at ${x}px ${y}px)` }} aria-hidden="true" />
}

export default function World() {
  const posts = allPosts(useDrafts())
  const navigate = useNavigate()
  const box = useRef<HTMLDivElement>(null)
  const [opening, setOpening] = useState<{ post: Post; from: DOMRect } | null>(null)
  const [moved, setMoved] = useState(false)
  const [broken, setBroken] = useState(false)

  // Rebuild only when the set of posts changes, not on every draft save.
  const key = posts.map((p) => `${p.slug}:${p.scene}:${p.chemical}:${p.title}`).join('|')
  const postsRef = useRef(posts)
  postsRef.current = posts

  useEffect(() => {
    const el = box.current
    if (!el) return
    try {
      const world = createWorld(el, {
        posts: postsRef.current,
        from: cameFrom(),
        onFirstMove: () => setMoved(true),
        places,
        onPlace: (place) => {
          rememberDoor(place.key)
          navigate(place.to)
        },
        onEnter: (post, from) => {
          rememberDoor(post.slug)
          if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) navigate(placeOf(post), { state: { from: 'world' } })
          else setOpening({ post, from })
        },
      })
      return world.dispose
    } catch {
      setBroken(true)
    }
  }, [key, navigate])

  const arrive = useCallback(() => opening && navigate(placeOf(opening.post), { state: { from: 'world' } }), [opening, navigate])

  return (
    <div className="world">
      <div className="world-stage" ref={box} />
      <Link className="world-home" to="/">
        <span className="j">Jopamine</span> <span className="t">Tinoxytocin</span>
      </Link>
      {broken ? (
        <p className="world-broken">
          <Link to="/">←</Link>
        </p>
      ) : (
        !moved && (
          <div className="world-keys" aria-hidden="true">
            <kbd className="up">↑</kbd>
            <kbd className="l">←</kbd>
            <kbd className="d">↓</kbd>
            <kbd className="r">→</kbd>
          </div>
        )
      )}
      {opening && (hasInside(opening.post) ? <Dive from={opening.from} onDone={arrive} /> : <Door post={opening.post} from={opening.from} onDone={arrive} />)}
    </div>
  )
}
