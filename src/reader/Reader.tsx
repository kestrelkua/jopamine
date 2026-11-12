import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { allPosts, draftForSlug, draftToPost, loadReplay, useDrafts, type Draft } from '../content/drafts'
import ReaderView from './ReaderView'

export default function Reader() {
  const { slug } = useParams()
  const drafts = useDrafts()
  const posts = allPosts(drafts)
  const post = posts.find((p) => p.slug === slug)
  const draft = draftForSlug(drafts, slug)

  if (!post) {
    return (
      <div className="reader-missing">
        <p>Nothing here.</p>
        <Link to="/">←</Link>
      </div>
    )
  }

  const next = posts[(posts.indexOf(post) + 1) % posts.length]
  return <ReaderView key={post.slug} post={post} next={next} replay={draft ? loadReplay(draft.id) : null} />
}

/** The editor's live preview: renders a draft and follows the editor's cursor between scenes. */
export function Preview() {
  const { id } = useParams()
  const drafts = useDrafts()
  const draft = drafts.find((d) => d.id === id)
  const [target, setTarget] = useState<number | null>(null)
  const shown = useRef<number | null>(null)

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin === location.origin && e.data?.type === 'goto') setTarget(e.data.index)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  // Scroll once per new target; a brand-new scene may only exist after the next save arrives.
  useEffect(() => {
    if (target === null || shown.current === target) return
    const el = document.querySelectorAll('.scene-section')[target] as HTMLElement | undefined
    if (!el) return
    el.scrollIntoView({ block: 'start' })
    shown.current = target
  }, [target, draft])

  if (!draft) return <div className="reader-missing">…</div>
  return <ReaderView post={toPreviewPost(draft)} replay={null} />
}

const toPreviewPost = (d: Draft) => ({ ...draftToPost(d), slug: `preview-${d.id}` })
