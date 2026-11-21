import type { Post } from '../../content/types'

/** Posts with a walk-through inside; the rest open in the reader. */
export const hasInside = (post: Post) => post.scene === 'cave'
