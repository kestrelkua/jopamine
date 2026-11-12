import { blueRoom } from './blueRoom'
import { fortyThousand } from './fortyThousand'
import type { Post } from './types'

export const posts: Post[] = [blueRoom, fortyThousand]

export function findPost(slug: string | undefined): Post | undefined {
  return posts.find((p) => p.slug === slug)
}
