import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Replay } from '../content/replay'
import { toSections, wordCount, type Post } from '../content/types'
import Stage from '../scenes/Stage'
import { BlockView } from './Blocks'
import ReplayOverlay from './ReplayOverlay'
import SparkDrop from './SparkDrop'
import { useScrollScenes } from './useScrollScenes'
import './Reader.css'

const chemicalName = { dopamine: 'Dopamine', oxytocin: 'Oxytocin' } as const

interface Props {
  post: Post
  next?: Post
  replay?: Replay | null
}

export default function ReaderView({ post, next, replay }: Props) {
  const sections = useMemo(() => toSections(post), [post])
  const { refs, state } = useScrollScenes(sections.length)
  const [commentary, setCommentary] = useState(true)
  const [focusMode, setFocusMode] = useState(false)
  const [replaying, setReplaying] = useState(false)
  const [replayFocus, setReplayFocus] = useState('default')
  const onReplayFocus = useCallback((f: string) => setReplayFocus(f), [])

  const minutes = Math.max(1, Math.round(wordCount(post) / 230))
  const current = state.index >= 0 ? sections[state.index] : sections[0]
  const progress = state.index >= 0 ? state.progress : 0
  const level = Math.round(state.overall * 100)
  const canReplay = !!replay && replay.ops.length > 0

  return (
    <div className={`reader card-${post.theme.card} chem-${post.chemical} ${replaying ? 'replaying' : ''}`} style={{ '--accent': post.theme.accent } as React.CSSProperties}>
      <Stage
        scene={post.scene}
        focus={replaying ? replayFocus : (current?.focus ?? 'default')}
        progress={replaying ? 0.5 : progress}
        dimmed={focusMode || replaying}
      />

      <header className="topbar">
        <div className="level" role="progressbar" aria-label={`${chemicalName[post.chemical]} level`} aria-valuenow={level} aria-valuemin={0} aria-valuemax={100}>
          <div className="level-fill" style={{ width: `${level}%` }} />
        </div>
        <div className="topbar-row">
          <Link to="/" className="home-link">
            ← <span className="hide-sm">Jopamine Tinoxytocin</span>
          </Link>
          <span className="where">{state.index >= 0 && current ? current.label : `${chemicalName[post.chemical]} ${level}%`}</span>
          <div className="toggles">
            {canReplay && (
              <button className={`toggle ${replaying ? 'on' : ''}`} onClick={() => setReplaying(!replaying)} aria-pressed={replaying} title="Watch it being written">
                ▶<span className="hide-sm"> Replay</span>
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

        <section className="ending">
          <SparkDrop storageKey={`jt.spark.${post.slug}`} />
          <nav className="end-links">
            {post.bloggerUrl && (
              <a href={post.bloggerUrl} target="_blank" rel="noreferrer">
                Comment ↗
              </a>
            )}
            {next && next.slug !== post.slug && <Link to={`/post/${next.slug}`}>{next.title} →</Link>}
          </nav>
        </section>
      </main>

      {replaying && replay && <ReplayOverlay replay={replay} onClose={() => setReplaying(false)} onFocus={onReplayFocus} />}
    </div>
  )
}
