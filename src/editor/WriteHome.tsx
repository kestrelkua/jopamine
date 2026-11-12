import { Link, useNavigate } from 'react-router-dom'
import { posts as builtIn } from '../content'
import { deleteDraft, newId, postToDoc, saveDraft, useDrafts, type Draft } from '../content/drafts'
import type { Doc } from '../content/replay'
import type { Post } from '../content/types'
import { makeBlock } from './blocks'
import './Editor.css'

function blankDoc(): Doc {
  return {
    meta: { title: '', date: new Date().toISOString().slice(0, 10), chemical: 'dopamine', scene: 'blue-room', teaser: '', card: 'light' },
    blocks: [makeBlock('cue', 'blue-room'), makeBlock('p', 'blue-room')],
  }
}

export default function WriteHome() {
  const drafts = useDrafts()
  const navigate = useNavigate()

  const create = (doc: Doc, source?: Post) => {
    const d: Draft = { id: newId(), doc, published: false, sourceSlug: source?.slug, updatedAt: Date.now() }
    saveDraft(d)
    navigate(`/write/${d.id}`)
  }

  return (
    <div className="write-home">
      <Link to="/" className="tr-back">
        ←
      </Link>
      <h1>Write</h1>
      <button className="ed-btn primary big" onClick={() => create(blankDoc())}>
        New post
      </button>

      {drafts.length > 0 && (
        <ul className="draft-list">
          {drafts.map((d) => (
            <li key={d.id}>
              <Link to={`/write/${d.id}`} className="draft-card">
                <span className="draft-title">{d.doc.meta.title || 'Untitled'}</span>
                <span className="draft-meta">
                  {d.published ? 'published · ' : ''}
                  {new Date(d.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </Link>
              <button
                className="ed-x"
                aria-label={`Delete ${d.doc.meta.title || 'Untitled'}`}
                onClick={() => confirm(`Delete “${d.doc.meta.title || 'Untitled'}” and its replay?`) && deleteDraft(d.id)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <h2>Open an older post</h2>
      <div className="copy-list">
        {builtIn.map((p) => (
          <button key={p.slug} className="ed-btn" onClick={() => create(postToDoc(p), p)}>
            {p.title}
          </button>
        ))}
      </div>
    </div>
  )
}
