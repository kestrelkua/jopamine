import { useEffect, useState } from 'react'
import { firstFocus, type Post } from '../content/types'
import { sceneComponents } from '../scenes/components'
import { whoosh } from '../sound'

/** Grows a post's card into the whole screen, then swings its doors open onto the room. */
export default function Door({ post, from, onDone }: { post: Post; from: DOMRect; onDone: () => void }) {
  const [phase, setPhase] = useState<'start' | 'grow' | 'open'>('start')
  const Scene = sceneComponents[post.scene]

  useEffect(() => {
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => setPhase('grow'))
    })
    const open = window.setTimeout(() => {
      setPhase('open')
      whoosh()
    }, 520)
    const done = window.setTimeout(onDone, 1350)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(open)
      window.clearTimeout(done)
    }
  }, [onDone])

  const box = phase === 'start' ? { left: from.left, top: from.top, width: from.width, height: from.height, borderRadius: 12 } : { left: 0, top: 0, width: '100vw', height: '100vh', borderRadius: 0 }

  return (
    <div className={`door door-${phase} chem-${post.chemical}`} style={box} aria-hidden="true">
      <div className="door-room">
        <Scene focus={firstFocus(post)} progress={0} />
      </div>
      <div className="door-leaf l">
        <span className="door-knob" />
      </div>
      <div className="door-leaf r">
        <span className="door-knob" />
      </div>
      <span className="door-title">{post.title}</span>
    </div>
  )
}
