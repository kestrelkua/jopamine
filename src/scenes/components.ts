import type { SceneId } from '../content/types'
import BlueRoomScene from './BlueRoomScene'
import CaveScene from './CaveScene'

export const sceneComponents: Record<SceneId, typeof BlueRoomScene> = {
  'blue-room': BlueRoomScene,
  cave: CaveScene,
}
