import type { SceneId } from '../content/types'

/** The rooms a post can live in, and the scene focuses each room knows how to stage. */
export const rooms: Record<SceneId, { name: string; focuses: { id: string; name: string }[] }> = {
  'blue-room': {
    name: 'The blue room',
    focuses: [
      { id: 'photos', name: 'Baby photos' },
      { id: 'battle', name: 'Last stand' },
      { id: 'sunlight', name: 'Sunlight + cats' },
      { id: 'chair', name: 'The chair' },
      { id: 'arrival', name: 'Ding! (arrival)' },
      { id: 'window', name: 'Window opens' },
      { id: 'box', name: 'The box' },
      { id: 'default', name: 'Wide room' },
    ],
  },
  cave: {
    name: 'The cave',
    focuses: [
      { id: 'fire', name: 'Fire + figures' },
      { id: 'synchrony', name: 'Falling into rhythm' },
      { id: 'spread', name: 'Spreading rings' },
      { id: 'piano', name: 'Notes across Europe' },
      { id: 'chain', name: 'Chain of lights' },
      { id: 'steps', name: 'Three pillars' },
      { id: 'finale', name: 'Heartbeat' },
      { id: 'default', name: 'Wide cave' },
    ],
  },
  ocean: {
    name: 'Caribbean blue',
    focuses: [
      { id: 'shade', name: 'Your shade' },
      { id: 'parens', name: 'Every angle' },
      { id: 'meteor', name: 'Light years away' },
      { id: 'ribbon', name: 'No stops' },
      { id: 'angled', name: 'Angled' },
      { id: 'default', name: 'Wide sea' },
    ],
  },
}
