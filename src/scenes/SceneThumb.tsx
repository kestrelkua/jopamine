import type { SceneId } from '../content/types'
import BlueRoomScene from './BlueRoomScene'
import CaveScene from './CaveScene'
import './scenes.css'

/** A small, live snapshot of one scene, for pickers. */
export default function SceneThumb({ scene, focus }: { scene: SceneId; focus: string }) {
  const Scene = scene === 'blue-room' ? BlueRoomScene : CaveScene
  return (
    <span className="scene-thumb" aria-hidden="true">
      <Scene focus={focus} progress={0.55} />
    </span>
  )
}
