import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { allPosts, useDrafts } from '../../content/drafts'
import { toSections, wordCount, type Post } from '../../content/types'
import { musicOn, roomHasMusic, setMusicOn } from '../../music'
import { BlockView } from '../../reader/Blocks'
import { gifts, loadGiven, saveGiven } from '../../reader/gifts'
import { useRoomMusic } from '../../reader/useRoomMusic'
import '../../reader/Reader.css'
import '../World.css'
import { createBlueRoom } from './blueRoom'
import { createCaribbean } from './caribbean'
import { createCave, type Cave } from './cave'
import { hasInside, insideColor } from './hasInside'
import './Inside.css'

const chainKey = (slug: string) => `jt.inside.${slug}.chain`
const songKey = (slug: string) => `jt.inside.${slug}.song`

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
  return <Walk key={post.slug} post={post} />
}

function Walk({ post }: { post: Post }) {
  const navigate = useNavigate()
  const sections = useMemo(() => toSections(post), [post])
  const giftKey = `jt.spark.${post.slug}`
  const [stop, setStop] = useState(-1)
  const [given, setGiven] = useState(() => loadGiven(giftKey))
  const [moved, setMoved] = useState(false)
  const [music, setMusic] = useState(musicOn)
  const [leaving, setLeaving] = useState(false)
  const [warps, setWarps] = useState(0)
  const [showCard, setShowCard] = useState(true)
  const roomMusic = useRoomMusic(post, music, () => !!given)
  const box = useRef<HTMLDivElement>(null)
  const card = useRef<HTMLDivElement>(null)
  const cave = useRef<Cave | null>(null)

  // Out through the light: the screen fills with it, then the world fades in around you.
  const leave = () => {
    if (leaving) return
    setLeaving(true)
    cave.current?.rush()
    try {
      sessionStorage.setItem('jt.world.from', post.slug)
      sessionStorage.setItem('jt.world.arrive', '#fff4dc')
    } catch {
      // Coming back just starts in the middle, without the fade.
    }
    window.setTimeout(() => navigate('/'), 950)
  }
  const leaveRef = useRef(leave)
  useEffect(() => {
    leaveRef.current = leave
  })

  const focuses = sections.map((s) => s.focus).join()
  const sectionsRef = useRef(sections)
  sectionsRef.current = sections
  useEffect(() => {
    const el = box.current
    if (!el) return
    try {
      const stops = focuses.split(',')
      const common = {
        stops,
        onStop: setStop,
        onExit: () => leaveRef.current(),
        onFirstMove: () => setMoved(true),
      }
      const c =
        post.scene === 'blue-room'
          ? createBlueRoom(el, { ...common, onWarp: () => setWarps((n) => n + 1) })
          : post.scene === 'ocean'
            ? createCaribbean(el, { ...common, onWarp: () => setWarps((n) => n + 1), onCard: setShowCard }, sectionsRef.current)
            : createCave(el, {
                ...common,
                given: loadGiven(giftKey),
                chainDone: loadFlag(chainKey(post.slug)),
                onChain: () => saveFlag(chainKey(post.slug)),
                songDone: loadFlag(songKey(post.slug)),
                onSong: () => saveFlag(songKey(post.slug)),
                onGive: (name) => {
                  setGiven(name)
                  saveGiven(giftKey, name)
                },
              })
      cave.current = c
      return () => {
        cave.current = null
        c.dispose()
      }
    } catch {
      navigate(`/post/${post.slug}`, { replace: true })
    }
  }, [focuses, giftKey, post.slug, post.scene, navigate])

  // Tell the cave how much of the screen the card covers, so the walker stays in view.
  useEffect(() => {
    const el = card.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      const wide = window.innerWidth >= 820
      if (!showCard) return cave.current?.setInset(0, 0)
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
  }, [stop, showCard])

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
          <Link
            to="/"
            className="home-link"
            onClick={(e) => {
              e.preventDefault()
              leave()
            }}
          >
            ← <span className="hide-sm">Jopamine Tinoxytocin</span>
          </Link>
          <span className="where">{section?.label ?? post.title}</span>
          <div className="toggles">
            {roomHasMusic(post.scene) && (
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
            )}
            <Link className="toggle" to={`/post/${post.slug}`} title="Read it as a page">
              ¶<span className="hide-sm"> Page</span>
            </Link>
          </div>
        </div>
      </header>

      <aside
        className={`inside-card card ${showCard ? '' : 'gone'}`}
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
            {stop === sections.length - 1 && post.scene === 'cave' && <p className="inside-given">{given ? `${given} is playing it now` : gifts.cave.line}</p>}
          </>
        ) : (
          <div className="inside-hero">
            <span className={`chem-badge ${post.chemical}`}>{post.chemical === 'oxytocin' ? 'Oxytocin' : 'Dopamine'}</span>
            <h1 className="post-title">{post.title}</h1>
            <p className="meta">
              {new Date(post.date + 'T12:00:00').toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}{' '}
              · {minutes} min
            </p>
          </div>
        )}
      </aside>

      {warps > 0 && <div key={warps} className="inside-warp" aria-hidden="true" />}
      <div className="inside-arrive" style={{ background: insideColor(post) }} aria-hidden="true" />
      {leaving && (
        <div className="inside-leave" aria-hidden="true">
          <div className="inside-bloom" />
        </div>
      )}

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
