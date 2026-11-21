import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import type { Replay } from '../content/replay'
import { toSections, wordCount, type Post } from '../content/types'
import { musicOn, roomHasMusic, setMusicOn, startMusic } from '../music'
import Stage from '../scenes/Stage'
import GiftDrop from './GiftDrop'
import { gifts, loadGiven, saveGiven } from './gifts'
import { BlockView } from './Blocks'
import ReplayOverlay from './ReplayOverlay'
import SparkDrop from './SparkDrop'
import { useScrollScenes } from './useScrollScenes'
import './Reader.css'

const chemicalName = { dopamine: 'Dopamine', oxytocin: 'Oxytocin' } as const
const caveFolk = ['Magnificence', 'Tony', 'Toby']

/**
 * Plays the room's music while `on`. Browsers only allow sound after a click or key press, so until then
 * it is `waiting`, and `start` (called from a click) begins it.
 */
function useRoomMusic(post: Post, on: boolean, guitar: () => boolean) {
  const guitarRef = useRef(guitar)
  const startRef = useRef<() => void>(() => {})
  const [waiting, setWaiting] = useState(false)
  useEffect(() => {
    guitarRef.current = guitar
  })
  useEffect(() => {
    if (!on || !roomHasMusic(post.scene)) return
    let music: ReturnType<typeof startMusic> = null
    let allowed = false
    const begin = () => {
      allowed = true
      if (music || document.hidden) return
      music = startMusic(post.scene, () => guitarRef.current())
      setWaiting(false)
    }
    // Fade out while the tab is in the background; come back when it's visible again.
    const onVisibility = () => {
      if (document.hidden) {
        music?.stop()
        music = null
      } else if (allowed) {
        begin()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    startRef.current = begin
    const activated = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive
    if (activated) begin()
    else setWaiting(true)
    window.addEventListener('pointerdown', begin, { once: true })
    window.addEventListener('keydown', begin, { once: true })
    return () => {
      window.removeEventListener('pointerdown', begin)
      window.removeEventListener('keydown', begin)
      document.removeEventListener('visibilitychange', onVisibility)
      startRef.current = () => {}
      setWaiting(false)
      music?.stop()
    }
  }, [post.scene, on])
  return { waiting, start: () => startRef.current() }
}

interface Props {
  post: Post
  next?: Post
  replay?: Replay | null
  /** Shows this scene focus regardless of scroll (the editor's scene picker uses it). */
  focusOverride?: string | null
}

export default function ReaderView({ post, next, replay, focusOverride }: Props) {
  const fromWorld = (useLocation().state as { from?: string } | null)?.from === 'world'
  const sections = useMemo(() => toSections(post), [post])
  const { refs, state } = useScrollScenes(sections.length)
  const [commentary, setCommentary] = useState(true)
  const [focusMode, setFocusMode] = useState(false)
  const [replaying, setReplaying] = useState(false)
  const [replayFocus, setReplayFocus] = useState('default')
  const onReplayFocus = useCallback((f: string) => setReplayFocus(f), [])
  const gift = gifts[post.scene]
  const giftKey = `jt.spark.${post.slug}`
  const [given, setGiven] = useState(() => loadGiven(giftKey))
  const [giftHover, setGiftHover] = useState<string | null>(null)
  const [music, setMusic] = useState(musicOn)
  const roomMusic = useRoomMusic(post, music && !replaying, () => !!given)

  // Once the reader reaches the end, the room goes back to where the gift belongs.
  const endRef = useRef<HTMLElement>(null)
  const [atEnd, setAtEnd] = useState(false)
  useEffect(() => {
    const el = endRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setAtEnd(e.isIntersecting), { rootMargin: '0px 0px -45% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const minutes = Math.max(1, Math.round(wordCount(post) / 230))
  const current = state.index >= 0 ? sections[state.index] : sections[0]
  const progress = state.index >= 0 ? state.progress : 0
  const level = Math.round(state.overall * 100)
  const canReplay = !!replay && replay.ops.length > 0

  return (
    <div className={`reader card-${post.theme.card} chem-${post.chemical} ${replaying ? 'replaying' : ''}`} style={{ '--accent': post.theme.accent } as React.CSSProperties}>
      <Stage
        scene={post.scene}
        focus={focusOverride ?? (replaying ? replayFocus : atEnd && gift.kind === 'guitar' ? gift.endFocus : (current?.focus ?? 'default'))}
        progress={replaying ? 0.5 : progress}
        dimmed={!focusOverride && (focusMode || replaying)}
        gift={given}
        giftHover={giftHover}
      />

      <header className="topbar">
        <div className="level" role="progressbar" aria-label={`${chemicalName[post.chemical]} level`} aria-valuenow={level} aria-valuemin={0} aria-valuemax={100}>
          <div className="level-fill" style={{ width: `${level}%` }} />
        </div>
        <div className="topbar-row">
          <Link to={fromWorld ? '/world' : '/'} className="home-link">
            ← <span className="hide-sm">Jopamine Tinoxytocin</span>
          </Link>
          <span className="where">{state.index >= 0 && current ? current.label : `${chemicalName[post.chemical]} ${level}%`}</span>
          <div className="toggles">
            {canReplay && (
              <button className={`toggle ${replaying ? 'on' : ''}`} onClick={() => setReplaying(!replaying)} aria-pressed={replaying} title="Watch it being written">
                ▶<span className="hide-sm"> Replay</span>
              </button>
            )}
            {roomHasMusic(post.scene) && (
              <button
                className={`toggle ${music ? 'on' : ''} ${roomMusic.waiting ? 'waiting' : ''}`}
                // Keep this press from also counting as the page's "first click", so the button decides.
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
            <button className={`toggle ${commentary ? 'on' : ''}`} onClick={() => setCommentary(!commentary)} aria-pressed={commentary} title="Commentary">
              ✎<span className="hide-sm"> Commentary</span>
            </button>
            <button className={`toggle ${focusMode ? 'on' : ''}`} onClick={() => setFocusMode(!focusMode)} aria-pressed={focusMode} title="Focus">
              ◐<span className="hide-sm"> Focus</span>
            </button>
          </div>
        </div>
      </header>

      <main className="column">
        <section className="hero">
          <span className={`chem-badge ${post.chemical}`}>{chemicalName[post.chemical]}</span>
          <h1 className="post-title">{post.title}</h1>
          <p className="meta">
            {new Date(post.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · {minutes} min
          </p>
          <p className="scroll-hint" aria-hidden="true">
            ↓
          </p>
        </section>

        {sections.map((section, i) => (
          <section
            key={i}
            ref={(el) => {
              refs.current[i] = el
            }}
            className="scene-section"
          >
            <div className="card">
              {section.label && <span className="kicker">{section.label}</span>}
              {section.blocks.map((block, j) => (
                <BlockView key={j} block={block} commentary={commentary} />
              ))}
            </div>
          </section>
        ))}

      </main>

      {/* Full width, so a gift can be carried anywhere on the screen. */}
      <section className="ending" ref={endRef}>
        {gift.kind === 'guitar' ? (
          <GiftDrop
            line={gift.line}
            given={given}
            targets={caveFolk}
            onHover={setGiftHover}
            onGive={(name) => {
              setGiven(name)
              saveGiven(giftKey, name)
            }}
          />
        ) : (
          <SparkDrop storageKey={giftKey} line={gift.line} />
        )}
        <nav className="end-links">
          {post.bloggerUrl && (
            <a href={post.bloggerUrl} target="_blank" rel="noreferrer">
              Comment ↗
            </a>
          )}
          {next && next.slug !== post.slug && <Link to={`/post/${next.slug}`}>{next.title} →</Link>}
        </nav>
      </section>

      {replaying && replay && <ReplayOverlay replay={replay} onClose={() => setReplaying(false)} onFocus={onReplayFocus} />}
    </div>
  )
}
