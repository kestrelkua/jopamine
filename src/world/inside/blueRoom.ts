// The Blue Room: one room, many realities. Each part of the story takes you to a different version of the
// same room (shrunk onto the desk, floating on boxes of light, lost on the giant chair, down an endless
// hallway, adrift in a dusk sky, inside the box). Step into the glowing window to go on; the room folds
// up and unfolds as the next reality. At the end you come back to the real room and walk out the door.
import { insideBox } from './blue/box'
import { giantChair } from './blue/chair'
import { deskBattle } from './blue/desk'
import { endlessHallway } from './blue/hallway'
import { portalWindow, type Reality } from './blue/kit'
import { boxesOfLight } from './blue/light'
import { realRoom } from './blue/room'
import { duskSky } from './blue/sky'
import { createRealms, type RoomOptions } from './realms'

const realities: Record<string, () => Reality> = {
  photos: realRoom,
  battle: deskBattle,
  sunlight: boxesOfLight,
  chair: giantChair,
  arrival: endlessHallway,
  window: duskSky,
  box: insideBox,
}

export type { RoomOptions }

export const createBlueRoom = (container: HTMLElement, opts: RoomOptions) =>
  createRealms(container, opts, { build: (focus) => (realities[focus] ?? realRoom)(), home: 'photos', portal: portalWindow })
