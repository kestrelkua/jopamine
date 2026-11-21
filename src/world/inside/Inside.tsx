import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { allPosts, useDrafts } from '../../content/drafts'
import { toSections, wordCount, type Post } from '../../content/types'
import { musicOn, setMusicOn } from '../../music'
import { BlockView } from '../../reader/Blocks'
import { gifts, loadGiven, saveGiven } from '../../reader/gifts'
import { useRoomMusic } from '../../reader/useRoomMusic'
import '../../reader/Reader.css'
import '../World.css'
import { createCave, type Cave } from './cave'
import { hasInside } from './hasInside'
import './Inside.css'

const chainKey = (slug: string) => `jt.inside.${slug}.chain`

function loadFlag(key: string) {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function saveFlag(key: string) {
  try {
    localStorage.setItem(key, '1')
  } catch {
    // It just won't be remembered.
  }
}

export default function Inside() {
  const { slug = '' } = useParams()
  const post = allPosts(useDrafts()).find((p) => p.slug === slug)
  if (!post || !hasInside(post)) return <Navigate to={`/post/${slug}`} replace />
  return <CaveWalk key={post.slug} post={post} />
}

function CaveWalk({ post }: { post: Post }) {
  const navigate = useNavigate()
  const sections = useMemo(() => toSections(post), [post])
  const giftKey = `jt.spark.${post.slug}`
  const [stop, setStop] = useState(-1)
  const [given, setGiven] = useState(() => loadGiven(giftKey))
  const [moved, setMoved] = useState(false)
  const [music, setMusic] = useState(musicOn)
  const roomMusic = useRoomMusic(post, music, () => !!given)
  const box = useRef<HTMLDivElement>(null)
  const card = useRef<HTMLDivElement>(null)
  const cave = useRef<Cave | null>(null)

  const focuses = sections.map((s) => s.focus).join()
  useEffect(() => {
    const el = box.current
    if (!el) return
    try {
      const c = createCave(el, {
        stops: focuses.split(','),
        given: loadGiven(giftKey),
        chainDone: loadFlag(chainKey(post.slug)),
        onStop: setStop,
        onChain: () => saveFlag(chainKey(post.slug)),
        onGive: (name) => {
          setGiven(name)
          saveGiven(giftKey, name)
        },
        onExit: () => {
          try {
            sessionStorage.setItem('jt.world.from', post.slug)
          } catch {
            // Coming back just starts in the middle.
          }
          navigate('/')
        },
        onFirstMove: () => setMoved(true),
      })
      cave.current = c
      return () => {
        cave.current = null
        c.dispose()
      }
    } catch {
      navigate(`/post/${post.slug}`, { replace: true })
    }
  }, [focuses, giftKey, post.slug, navigate])

  // Tell the cave how much of the screen the card covers, so the walker stays in view.
  useEffect(() => {
    const el = card.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      const wide = window.innerWidth >= 820
      cave.current?.setInset(wide ? window.innerWidth - r.left : 0, wide ? 0 : window.innerHeight - r.top)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [stop])

  // Each new part of the story starts at its top.
  useEffect(() => {
    card.current?.scrollTo({ top: 0 })
    cave.current?.setReading(0)
  }, [stop])

  const section = stop >= 0 ? sections[stop] : null
  const level = Math.round(((stop + 1) / sections.length) * 100)
  const minutes = Math.max(1, Math.round(wordCount(post) / 230))

  return (
    <div className={`reader inside card-${post.theme.card} chem-${post.chemical}`} style={{ '--accent': post.theme.accent } as React.CSSProperties}>
      <div className="inside-stage" ref={box} />

      <header className="topbar">
        <div className="level" role="progressbar" aria-label="How far in" aria-valuenow={level} aria-valuemin={0} aria-valuemax={100}>
          <div className="level-fill" style={{ width: `${level}%` }} />
        </div>
        <div className="topbar-row">
          <Link to="/" className="home-link">
            ← <span className="hide-sm">Jopamine Tinoxytocin</span>
          </Link>
          <span className="where">{section?.label ?? post.title}</span>
          <div className="toggles">
            <button
              className={`toggle ${music ? 'on' : ''} ${roomMusic.waiting ? 'waiting' : ''}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => {
                if (roomMusic.waiting) return roomMusic.start()
                setMusicOn(!music)
                setMusic(!music)
              }}
              aria-pressed={music}
              title="Music"
            >
              ♪<span className="hide-sm"> Music</span>
            </button>
            <Link className="toggle" to={`/post/${post.slug}`} title="Read it as a page">
              ¶<span className="hide-sm"> Page</span>
            </Link>
          </div>
        </div>
      </header>

      <aside
        className="inside-card card"
        ref={card}
        key={stop}
        aria-live="polite"
        onScroll={(e) => {
          const el = e.currentTarget
          const room = el.scrollHeight - el.clientHeight
          cave.current?.setReading(room > 0 ? el.scrollTop / room : 0)
        }}
      >
        {section ? (
          <>
            {section.label && <span className="kicker">{section.label}</span>}
            {section.blocks.map((block, j) => (
              <BlockView key={j} block={block} commentary />
            ))}
            {stop === sections.length - 1 && <p className="inside-given">{given ? `${given} is playing it now` : gifts.cave.line}</p>}
          </>
        ) : (
          <div className="inside-hero">
            <span className={`chem-badge ${post.chemical}`}>{post.chemical === 'oxytocin' ? 'Oxytocin' : 'Dopamine'}</span>
            <h1 className="post-title">{post.title}</h1>
            <p className="meta">
              {new Date(post.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · {minutes} min
            </p>
          </div>
        )}
      </aside>

      {!moved && (
        <div className="world-keys inside-keys" aria-hidden="true">
          <kbd className="up">↑</kbd>
          <kbd className="l">←</kbd>
          <kbd className="d">↓</kbd>
          <kbd className="r">→</kbd>
        </div>
      )}
    </div>
  )
}
