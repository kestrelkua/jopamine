import { useEffect, useRef, useState } from 'react'

export interface ScrollState {
  /** Index of the scene section under the reading line; -1 while on the title. */
  index: number
  /** How far through that section the reader is, 0..1. */
  progress: number
  /** How far through the whole post, 0..1. */
  overall: number
}

/** Tracks which scene section is under the reading line (55% down the viewport). */
export function useScrollScenes(count: number) {
  const refs = useRef<(HTMLElement | null)[]>([])
  const [state, setState] = useState<ScrollState>({ index: -1, progress: 0, overall: 0 })

  useEffect(() => {
    let raf = 0
    const measure = () => {
      raf = 0
      const line = window.innerHeight * 0.55
      let index = -1
      let progress = 0
      refs.current.slice(0, count).forEach((el, i) => {
        if (!el) return
        const r = el.getBoundingClientRect()
        if (r.top <= line) {
          index = i
          // A hidden preview frame has zero-height sections.
          progress = r.height > 0 ? Math.min(1, Math.max(0, (line - r.top) / r.height)) : 0
        }
      })
      const max = document.documentElement.scrollHeight - window.innerHeight
      const overall = max > 0 ? Math.min(1, window.scrollY / max) : 0
      setState((s) =>
        s.index === index && Math.abs(s.progress - progress) < 0.004 && Math.abs(s.overall - overall) < 0.002
          ? s
          : { index, progress, overall },
      )
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [count])

  return { refs, state }
}
