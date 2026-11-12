import { newId } from '../content/drafts'
import type { EBlock } from '../content/replay'
import type { Block, SceneId } from '../content/types'
import { rooms } from '../scenes/registry'

export type BlockType = Block['type']

export const blockTypes: { type: BlockType; icon: string; name: string }[] = [
  { type: 'p', icon: '¶', name: 'Text' },
  { type: 'cue', icon: '◆', name: 'Scene' },
  { type: 'heading', icon: 'H', name: 'Heading' },
  { type: 'moment', icon: '!', name: 'Moment' },
  { type: 'steps', icon: '1.', name: 'Steps' },
  { type: 'photo', icon: '▣', name: 'Photo' },
  { type: 'signature', icon: '—', name: 'Signature' },
]

export function makeBlock(type: BlockType, scene: SceneId, text = ''): EBlock {
  const id = newId()
  switch (type) {
    case 'cue':
      return { id, type, focus: rooms[scene].focuses[0].id, label: '' }
    case 'steps':
      return { id, type, items: [text] }
    case 'photo':
      return { id, type, src: '', caption: text }
    case 'signature':
      return { id, type, text: text || '- Jakub Tinoco Lewandowski' }
    default:
      return { id, type, text }
  }
}
