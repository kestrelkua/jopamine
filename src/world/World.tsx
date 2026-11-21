import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { allPosts, useDrafts } from '../content/drafts'
import type { Post } from '../content/types'
import Door from '../pages/Door'
import '../pages/Home.css'
import { createWorld } from './engine'
import './World.css'

const FROM = 'jt.world.from'

function cameFrom() {
  try {
    return sessionStorage.getItem(FROM)
  } catch {
    return null
  }
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
        onEnter: (post, from) => {
          try {
            sessionStorage.setItem(FROM, post.slug)
          } catch {
            // Coming back just starts in the middle.
          }
          if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) navigate(`/post/${post.slug}`, { state: { from: 'world' } })
          else setOpening({ post, from })
        },
      })
      return world.dispose
    } catch {
      setBroken(true)
    }
  }, [key, navigate])

  const arrive = useCallback(() => opening && navigate(`/post/${opening.post.slug}`, { state: { from: 'world' } }), [opening, navigate])

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
      {opening && <Door post={opening.post} from={opening.from} onDone={arrive} />}
    </div>
  )
}
