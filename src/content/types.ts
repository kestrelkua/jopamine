export type Chemical = 'dopamine' | 'oxytocin'

export type SceneId = 'blue-room' | 'cave'

/** A director's-commentary note pinned to a phrase inside a paragraph. */
export interface Note {
  anchor: string
  text: string
}

/**
 * A post is a flat list of blocks. A `cue` block is a scene block: it changes
 * the stage for everything after it, until the next cue.
 */
export type Block =
  | { type: 'cue'; focus: string; label: string }
  | { type: 'heading'; text: string }
  | { type: 'p'; text: string; notes?: Note[] }
  | { type: 'moment'; text: string }
  | { type: 'steps'; intro?: string; items: string[] }
  | { type: 'signature'; text: string }
  /** `src` is a URL, or `idb:<key>` for a photo saved in this browser (see photos.ts). */
  | { type: 'photo'; src: string; caption: string }

export interface PostTheme {
  /** 'light' = dark text on a pale card, 'dark' = pale text on a dark card */
  card: 'light' | 'dark'
  accent: string
}

export interface Post {
  slug: string
  title: string
  date: string
  chemical: Chemical
  scene: SceneId
  teaser: string
  /** Where the post lives on Blogger (comments still happen there for now). */
  bloggerUrl?: string
  theme: PostTheme
  blocks: Block[]
}

export interface Section {
  focus: string
  label: string
  blocks: Block[]
}

export function toSections(post: Post): Section[] {
  const sections: Section[] = []
  for (const block of post.blocks) {
    if (block.type === 'cue') {
      sections.push({ focus: block.focus, label: block.label, blocks: [] })
    } else {
      if (sections.length === 0) sections.push({ focus: 'default', label: '', blocks: [] })
      sections[sections.length - 1].blocks.push(block)
    }
  }
  return sections
}

export function wordCount(post: Post): number {
  let n = 0
  for (const b of post.blocks) {
    if (b.type === 'p' || b.type === 'heading' || b.type === 'moment') n += b.text.split(/\s+/).length
    if (b.type === 'steps') n += b.items.join(' ').split(/\s+/).length
  }
  return n
}

/** The scene a post opens on. */
export const firstFocus = (post: Post) => post.blocks.find((b) => b.type === 'cue')?.focus ?? 'default'
