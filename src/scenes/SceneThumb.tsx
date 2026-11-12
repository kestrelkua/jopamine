import type { SceneId } from '../content/types'
import { sceneComponents } from './components'
import './scenes.css'

/** A small, live snapshot of one scene, for pickers. */
export default function SceneThumb({ scene, focus, progress = 0.55 }: { scene: SceneId; focus: string; progress?: number }) {
  const Scene = sceneComponents[scene]
  return (
    <span className="scene-thumb" aria-hidden="true">
      <Scene focus={focus} progress={progress} />
    </span>
  )
}
