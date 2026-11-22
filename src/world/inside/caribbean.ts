// Caribbean Blue, walked through: five realities of the same sea, all coloured by the shade you choose
// (and by the shades you didn't, drifting around you). The last way on leads back out to the world.
import type { Section } from '../../content/types'
import { shadeColor } from '../shade'
import { angledEnd } from './ocean/angled'
import { everyAngle } from './ocean/angles'
import { beach } from './ocean/beach'
import { makeSea, oceanPortal } from './ocean/common'
import { lightYears } from './ocean/meteor'
import { noStops } from './ocean/ribbon'
import { createRealms, type RoomOptions } from './realms'

export function createCaribbean(container: HTMLElement, opts: RoomOptions, sections: Section[]) {
  const sea = makeSea(sections)
  // Local testing only: jumping past the beach (?reality=2) starts with a shade already chosen.
  if (import.meta.env.DEV && Number(new URLSearchParams(location.search).get('reality')) > 0) {
    sea.picked = 0.53
    sea.shade.uSat.value = 1
  }
  return createRealms(container, opts, {
    build: (focus, i) => {
      if (focus === 'parens') return everyAngle(sea)
      if (focus === 'meteor') return lightYears(sea)
      if (focus === 'ribbon') return noStops(sea, sections[i])
      if (focus === 'angled') return angledEnd(sea)
      return beach(sea)
    },
    home: null,
    portal: () => oceanPortal(sea),
    // Your scarf takes on whatever shade is acting on you right now.
    scarf: () => (sea.picked === null ? '#9aa4aa' : shadeColor(sea.shade, { light: 0.55, chroma: 0.8 })),
  })
}
