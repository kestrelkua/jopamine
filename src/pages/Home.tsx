import { useCallback, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { allPosts, useDrafts } from '../content/drafts'
import type { Chemical, Post } from '../content/types'
import Door from './Door'
import PostCard from './PostCard'
import './Home.css'

const sides: { chemical: Chemical; name: string; blurb: string }[] = [
  { chemical: 'dopamine', name: 'Dopamine', blurb: 'wanting, waiting, the new thing' },
  { chemical: 'oxytocin', name: 'Oxytocin', blurb: 'connection, rhythm, together' },
]

export default function Home() {
  const posts = allPosts(useDrafts())
  const navigate = useNavigate()
  const [opening, setOpening] = useState<{ post: Post; from: DOMRect } | null>(null)
  const open = (post: Post, from: DOMRect) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) navigate(`/post/${post.slug}`)
    else setOpening({ post, from })
  }
  const arrive = useCallback(() => opening && navigate(`/post/${opening.post.slug}`), [opening, navigate])
  return (
    <div className="home">
      <header className="home-hero">
        <h1 className="home-title">
          <span className="j">Jopamine</span> <span className="t">Tinoxytocin</span>
        </h1>
        <p className="home-tag">Nonfiction by Jakub Tinoco Lewandowski</p>
      </header>

      <main className="sides">
        {sides.map((side) => (
          <section key={side.chemical} className={`side ${side.chemical}`}>
            <h2 className="side-name">{side.name}</h2>
            <p className="side-blurb">{side.blurb}</p>
            {posts
              .filter((p) => p.chemical === side.chemical)
              .map((p) => (
                <PostCard key={p.slug} post={p} onOpen={open} />
              ))}
          </section>
        ))}
      </main>

      {opening && <Door post={opening.post} from={opening.from} onDone={arrive} />}

      <footer className="home-foot">
        <Link to="/write">write</Link>
      </footer>
    </div>
  )
}
