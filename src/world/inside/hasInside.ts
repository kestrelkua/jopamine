import type { Post } from '../../content/types'

/** Posts with a walk-through inside; the rest open in the reader. */
export const hasInside = (post: Post) => post.scene === 'cave' || post.scene === 'blue-room' || post.scene === 'ocean'

/** The color you step through on the way in: the cave's dark, the Blue Room's blue. */
export const insideColor = (post: Post) => ({ cave: '#0e0907', 'blue-room': '#7f9fd8', ocean: '#1fa3c8' })[post.scene]
