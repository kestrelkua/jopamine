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

/** The color to fade in from, if the reader just walked out of somewhere (read once). */
function arrivingFrom() {
  try {
    const c = sessionStorage.getItem('jt.world.arrive')
    sessionStorage.removeItem('jt.world.arrive')
    return c
  } catch {
    return null
  }
}

function cameFrom() {
  try {
    return sessionStorage.getItem(FROM)
  } catch {
    return null
  }
}

/** Stepping through a doorway into a 3D inside: once the camera has swooped to face the door, its dark grows
 *  from the middle of the screen until it fills it. */
function Dive({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    whoosh()
    const grow = window.setTimeout(() => setOpen(true), 380)
    const done = window.setTimeout(onDone, 1050)
    return () => {
      window.clearTimeout(grow)
      window.clearTimeout(done)
    }
  }, [onDone])
  return <div className="world-dive" style={{ clipPath: `circle(${open ? '150vmax' : '0px'} at 50% 62%)` }} aria-hidden="true" />
}

export default function World() {
  const posts = allPosts(useDrafts())
  const navigate = useNavigate()
  const box = useRef<HTMLDivElement>(null)
  const [opening, setOpening] = useState<{ post: Post; from: DOMRect } | null>(null)
  const [moved, setMoved] = useState(false)
  const [broken, setBroken] = useState(false)
  const [fadeFrom] = useState(arrivingFrom)
  const fadeRef = useRef(fadeFrom)

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
        arrived: !!fadeRef.current,
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
      {fadeFrom && <div className="world-arrive" style={{ '--glow': fadeFrom } as React.CSSProperties} aria-hidden="true" />}
      {opening && (hasInside(opening.post) ? <Dive onDone={arrive} /> : <Door post={opening.post} from={opening.from} onDone={arrive} />)}
    </div>
  )
}
