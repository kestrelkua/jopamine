import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { hasRoster, me, personById, roster, saveRoster, sectionName, type Person, type SectionId } from './roster'
import { POSTS, categoryLabel, categoryOf, evaluate, isFirstTime, suggest, tallyColumns } from './rules'
import { isTrackerState, useTrackerStore } from './store'
import './Tracker.css'

function groupsOf(section: SectionId) {
  const map = new Map<string, Person[]>()
  for (const p of roster.filter((r) => r.section === section)) {
    map.set(p.group, [...(map.get(p.group) ?? []), p])
  }
  return [...map.entries()]
}

/** Classmates' names live outside the code, so the first visit asks for the roster file. */
function LoadRoster() {
  const input = useRef<HTMLInputElement>(null)
  const [bad, setBad] = useState(false)
  const take = async (file: File | undefined) => {
    if (!file) return
    if (saveRoster(await file.text())) location.reload()
    else setBad(true)
  }
  return (
    <div className="tracker">
      <header className="tr-head">
        <Link to="/" className="tr-back">
          ← Blog
        </Link>
        <h1>Comment tracker</h1>
      </header>
      <button className="btn primary" onClick={() => input.current?.click()}>
        Load roster
      </button>
      {bad && <p className="tr-warn">That file isn’t a roster.</p>}
      <input ref={input} type="file" accept="application/json,.json" hidden onChange={(e) => void take(e.target.files?.[0])} />
    </div>
  )
}

export default function Tracker() {
  return hasRoster ? <TrackerView /> : <LoadRoster />
}

function TrackerView() {
  const store = useTrackerStore()
  const { entries, currentPost: post, due } = store.state
  const { checks, forPost, complete } = evaluate(post, entries)
  const suggestions = suggest(post, entries).slice(0, 6)
  const logged = new Set(forPost.map((e) => e.personId))
  const [showTally, setShowTally] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const total = checks.find((c) => c.key === 'total')!

  const otherSection: SectionId = me.section === '4th' ? '1st' : '4th'

  const chip = (p: Person) => {
    const done = logged.has(p.id)
    const fresh = categoryOf(p) !== 'group' && isFirstTime(p.id, post, entries)
    const before = entries.some((e) => e.personId === p.id && e.post < post)
    return (
      <button
        key={p.id}
        className={`chip ${done ? 'done' : ''} ${before ? 'before' : ''}`}
        onClick={() => store.toggle(p.id)}
        aria-pressed={done}
        title={done ? 'Logged for this post. Click to remove.' : 'Log a comment for this post'}
      >
        <span className="chip-mark">{done ? '✓' : fresh ? '★' : '+'}</span>
        {p.name}
      </button>
    )
  }

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(store.state, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `comment-tracker-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importBackup = async (file: File) => {
    try {
      const data = JSON.parse(await file.text())
      if (isTrackerState(data)) store.replace(data)
      else alert('That file isn’t a tracker backup.')
    } catch {
      alert('Couldn’t read that file.')
    }
  }

  return (
    <div className="tracker">
      <header className="tr-head">
        <Link to="/" className="tr-back">
          ← Blog
        </Link>
        <h1>Comment tracker</h1>
        <p className="tr-sub">
          Group {me.group} · {sectionName[me.section]}
        </p>
        {store.saveFailed && <p className="tr-warn">This browser isn’t saving. Export a backup before closing the tab.</p>}
      </header>

      <nav className="post-tabs" aria-label="Blog post">
        {POSTS.map((n) => {
          const ok = evaluate(n, entries).complete
          return (
            <button key={n} className={`post-tab ${n === post ? 'current' : ''}`} onClick={() => store.setPost(n)} aria-current={n === post}>
              Post #{n} {ok && <span className="tab-ok">✓</span>}
            </button>
          )
        })}
      </nav>

      <div className="tr-grid">
        <section className="panel status">
          <div className="status-top">
            <div className={`ring ${complete ? 'complete' : ''}`} style={{ '--p': Math.min(1, total.have / total.need) } as React.CSSProperties}>
              <span>
                {total.have}
                <small>/{total.need}</small>
              </span>
            </div>
            <div>
              <h2>{complete ? `Post #${post} is done` : `Post #${post}`}</h2>
              <label className="due">
                Comments due{' '}
                <input type="date" value={due[post] ?? ''} onChange={(e) => store.setDue(post, e.target.value)} />
              </label>
            </div>
          </div>
          <ul className="checks">
            {checks.map((c) => (
              <li key={c.key} className={c.ok ? 'ok' : ''}>
                <span className="check-mark">{c.ok ? '✓' : '○'}</span>
                <span className="check-label">{c.label}</span>
                <span className="check-count">
                  {Math.min(c.have, c.need)}/{c.need}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel next">
          <h2>Who next</h2>
          {suggestions.length === 0 ? (
            <p className="muted">All set ✓</p>
          ) : (
            <ul className="suggestions">
              {suggestions.map(({ person, reasons }) => (
                <li key={person.id}>
                  <button className="sugg" onClick={() => store.toggle(person.id)}>
                    <span className="sugg-name">{person.name}</span>
                    <span className="sugg-why">{reasons.join(' + ')}</span>
                    <span className="sugg-add">Log</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="panel">
        <h2>Logged for post #{post}</h2>
        {forPost.length === 0 ? (
          <p className="muted">—</p>
        ) : (
          <ul className="log">
            {forPost.map((e) => {
              const p = personById.get(e.personId)!
              const c = categoryOf(p)
              const fresh = c !== 'group' && isFirstTime(p.id, post, entries)
              return (
                <li key={e.id}>
                  <div className="log-who">
                    <strong>{p.name}</strong>
                    <span className={`tag ${c}`}>{categoryLabel[c]}</span>
                    {fresh && <span className="tag first">★ first time</span>}
                  </div>
                  <input
                    className="log-link"
                    type="url"
                    placeholder="Link to the comment (optional)"
                    value={e.link ?? ''}
                    onChange={(ev) => store.updateEntry(e.id, { link: ev.target.value })}
                  />
                  <input className="log-date" type="date" value={e.date} onChange={(ev) => store.updateEntry(e.id, { date: ev.target.value })} />
                  <button className="log-remove" onClick={() => store.toggle(p.id)} aria-label={`Remove ${p.name}`}>
                    ✕
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="panel">
        <h2>Everyone</h2>
        {[me.section, otherSection].map((section) => (
          <div key={section} className="roster-section">
            <h3>{sectionName[section]}</h3>
            <div className="groups">
              {groupsOf(section).map(([group, people]) => (
                <div key={group} className={`group ${section === me.section && group === me.group ? 'mine' : ''}`}>
                  <span className="group-name">
                    {group}
                    {section === me.section && group === me.group && ' · your group'}
                  </span>
                  <div className="chips">{people.filter((p) => p.id !== me.id).map(chip)}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="panel tools">
        <button className="btn primary" onClick={() => setShowTally(true)}>
          Tally sheet
        </button>
        <button className="btn" onClick={exportBackup}>
          Export
        </button>
        <button className="btn" onClick={() => fileRef.current?.click()}>
          Import
        </button>
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importBackup(e.target.files[0])} />
        <button
          className="btn danger"
          onClick={() => {
            if (confirm('Start a new cycle? This clears every logged comment. Export a backup first if you want to keep them.')) store.reset()
          }}
        >
          New cycle
        </button>
      </section>

      {showTally && (
        <div className="tally-overlay" role="dialog" aria-modal="true" aria-label="Tally sheet">
          <div className="tally-actions">
            <button className="btn primary" onClick={() => window.print()}>
              Print / save as PDF
            </button>
            <button className="btn" onClick={() => setShowTally(false)}>
              Close
            </button>
          </div>
          <article className="tally-sheet">
            <header>
              <h1>NFW blogs––tally of your comments</h1>
              <p>Your name: Jakub Tinoco Lewandowski</p>
            </header>
            {POSTS.map((n) => {
              const cols = tallyColumns(n, entries)
              const rows = Math.max(3, cols.group.length, cols.firstPlusOne.length)
              return (
                <table key={n}>
                  <caption>Post #{n}</caption>
                  <thead>
                    <tr>
                      <th>within your group</th>
                      <th>outside group/in section</th>
                      <th>other section</th>
                      <th>1st time comment plus one more</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: rows }, (_, r) => (
                      <tr key={r}>
                        <td>{cols.group[r] ?? ''}</td>
                        <td>{r === 0 ? cols.section : ''}</td>
                        <td>{r === 0 ? cols.other : ''}</td>
                        <td>{cols.firstPlusOne[r] ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            })}
            <p className="tally-foot">★ = first comment on this writer’s blog this cycle</p>
          </article>
        </div>
      )}
    </div>
  )
}
