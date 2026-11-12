import type { SceneId } from '../content/types'
import { sceneComponents } from './components'
import './scenes.css'

interface StageProps {
  scene: SceneId
  focus: string
  progress: number
  dimmed: boolean
  gift?: string | null
  giftHover?: string | null
}

/** The fixed backdrop behind a post: the inside of that post's building. */
export default function Stage({ scene, focus, progress, dimmed, gift, giftHover }: StageProps) {
  const Scene = sceneComponents[scene]
  return (
    <div className={`stage ${dimmed ? 'dimmed' : ''}`}>
      <Scene focus={focus} progress={progress} interactive gift={gift} giftHover={giftHover} />
    </div>
  )
}
