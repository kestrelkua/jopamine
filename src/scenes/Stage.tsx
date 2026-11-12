import type { SceneId } from '../content/types'
import BlueRoomScene from './BlueRoomScene'
import CaveScene from './CaveScene'
import './scenes.css'

interface StageProps {
  scene: SceneId
  focus: string
  progress: number
  dimmed: boolean
}

/** The fixed backdrop behind a post: the inside of that post's building. */
export default function Stage({ scene, focus, progress, dimmed }: StageProps) {
  const Scene = scene === 'blue-room' ? BlueRoomScene : CaveScene
  return (
    <div className={`stage ${dimmed ? 'dimmed' : ''}`}>
      <Scene focus={focus} progress={progress} />
    </div>
  )
}
