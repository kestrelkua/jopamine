import { useEffect, useRef, useState } from 'react'
import type { Post } from '../content/types'
import { roomHasMusic, startMusic } from '../music'

/**
 * Plays the room's music while `on`. Browsers only allow sound after a click or key press, so until then
 * it is `waiting`, and `start` (called from a click) begins it.
 */
export function useRoomMusic(post: Post, on: boolean, guitar: () => boolean) {
  const guitarRef = useRef(guitar)
  const startRef = useRef<() => void>(() => {})
  const [waiting, setWaiting] = useState(false)
  useEffect(() => {
    guitarRef.current = guitar
  })
  useEffect(() => {
    if (!on || !roomHasMusic(post.scene)) return
    let music: ReturnType<typeof startMusic> = null
    let allowed = false
    const begin = () => {
      allowed = true
      if (music || document.hidden) return
      music = startMusic(post.scene, () => guitarRef.current())
      setWaiting(false)
    }
    // Fade out while the tab is in the background; come back when it's visible again.
    const onVisibility = () => {
      if (document.hidden) {
        music?.stop()
        music = null
      } else if (allowed) {
        begin()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    startRef.current = begin
    const activated = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive
    if (activated) begin()
    else setWaiting(true)
    window.addEventListener('pointerdown', begin, { once: true })
    window.addEventListener('keydown', begin, { once: true })
    return () => {
      window.removeEventListener('pointerdown', begin)
      window.removeEventListener('keydown', begin)
      document.removeEventListener('visibilitychange', onVisibility)
      startRef.current = () => {}
      setWaiting(false)
      music?.stop()
    }
  }, [post.scene, on])
  return { waiting, start: () => startRef.current() }
}
