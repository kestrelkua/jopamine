import { Link } from 'react-router-dom'
import { allPosts, useDrafts } from '../content/drafts'
import { wordCount, type Chemical } from '../content/types'
import './Home.css'

const sides: { chemical: Chemical; name: string; blurb: string }[] = [
  { chemical: 'dopamine', name: 'Dopamine', blurb: 'wanting, waiting, the new thing' },
  { chemical: 'oxytocin', name: 'Oxytocin', blurb: 'connection, rhythm, together' },
]

export default function Home() {
  const posts = allPosts(useDrafts())
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
                <Link key={p.slug} to={`/post/${p.slug}`} className={`post-card scene-${p.scene}`}>
                  <span className="post-card-art" aria-hidden="true" />
                  <span className="post-card-body">
                    <span className="post-card-title">{p.title}</span>
                    <span className="post-card-teaser">{p.teaser}</span>
                    <span className="post-card-meta">
                      {new Date(p.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ·{' '}
                      {Math.max(1, Math.round(wordCount(p) / 230))} min
                    </span>
                  </span>
                </Link>
              ))}
          </section>
        ))}
      </main>

      <footer className="home-foot">
        <Link to="/write">write</Link> · <Link to="/tracker">tracker</Link>
      </footer>
    </div>
  )
}
