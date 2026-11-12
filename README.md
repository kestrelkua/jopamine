# Jopamine Tinoxytocin

Jakub's nonfiction blog, where every post is a room you step inside, plus a private comment tracker for NFW.

Live: https://kestrelkua.github.io/jopamine/ (every push to `main` redeploys through GitHub Actions).

## Run it

```bash
npm install
npm run dev -- --port 5188
```

Then open http://localhost:5188.

- `/`: home, the "quick way in" (dopamine side and oxytocin side)
- `/post/the-blue-room`, `/post/40000-years-ago`: the reading pages
- `/write`: the editor (drafts, live preview, writing replay)
- `/tracker`: the comment tracker (private, saved in this browser; use Export backup)

## How a post works

Posts live in `src/content/`. A post is a list of blocks. A `cue` block is a **scene block**: it changes the
stage behind the text for everything after it, until the next cue.

```ts
{ type: 'cue', focus: 'sunlight', label: 'Boxes of light' },
{ type: 'p', text: '…', notes: [{ anchor: 'a phrase', text: 'director’s commentary' }] },
```

Each post's `scene` picks its room (`src/scenes/BlueRoomScene.tsx`, `src/scenes/CaveScene.tsx`). A room reads
`focus` (which cue is active) and `progress` (0–1 through that section) to move its camera and animate.

## Things worth knowing

- Photos are stored in this browser's IndexedDB (`src/content/photos.ts`); a photo block only holds `idb:<key>`.
  They move online with the backend stage.
- Scenes take `interactive` (on in the reader): anything with the `pokeable` class reacts to clicks; everything
  else in a room ignores the pointer. Sounds are synthesized in `src/sound.ts`.
- Each room's end-of-post gift is set in `src/reader/gifts.ts` (the cave hands over a guitar; the Blue Room
  leaves a spark). Room music lives in `src/music.ts` and only starts after the reader's first click or key press.
- Editor undo (⌘Z / ⇧⌘Z) works across blocks and is recorded in the replay as a `doc` op.

## The tracker's roster stays private

Classmates' names are never committed. They live in `private/roster.json` (git-ignored). The first time you
open `/tracker` in a browser, press **Load roster** and pick that file; it's saved in that browser only.

## Tracker rules

Encoded in `src/tracker/rules.ts` from the NFW handout; roster in `src/tracker/roster.ts`.

## Roadmap (v1)

1. ~~Comment tracker~~
2. ~~Reading page: scene blocks, chemical progress bar, commentary, focus mode~~ (passage comments need the backend)
3. ~~Editor: write with scene blocks, record the writing replay~~
4. The 3D world: hub, building interiors, sparks and blooms
5. Online: Supabase for posts/comments/sparks, login for publishing, deploy
