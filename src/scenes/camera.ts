import { useEffect, useState } from 'react'

export interface Camera {
  x: number
  y: number
  zoom: number
}

/** Scenes are drawn in a 1600×900 space; the camera centres (x, y) and zooms. */
export function cameraStyle({ x, y, zoom }: Camera): React.CSSProperties {
  return {
    transformOrigin: '0 0',
    transform: `translate(800px, 450px) scale(${zoom}) translate(${-x}px, ${-y}px)`,
    transition: 'transform 1.2s cubic-bezier(.6,.05,.2,1)',
  }
}

export const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

/** Maps progress in [from, to] onto 0..1. */
export const ramp = (p: number, from: number, to: number) => clamp01((p - from) / (to - from))

/** Seconds since mount, ticking every frame only while `active`. */
export function useClock(active: boolean): number {
  const [t, setT] = useState(0)
  useEffect(() => {
    if (!active) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      setT((now - start) / 1000)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active])
  return t
}

export interface SceneProps {
  focus: string
  progress: number
  /** Objects in the room react to clicks (only on the reading page). */
  interactive?: boolean
  /** Who the reader handed their gift to (e.g. the guitar in the cave). */
  gift?: string | null
  /** Who the gift is being dragged over right now. */
  giftHover?: string | null
}

/** A counter that goes up on every poke; use it as a React key to restart an animation. */
export function usePokes() {
  const [pokes, setPokes] = useState<Record<string, number>>({})
  const poke = (name: string) => setPokes((p) => ({ ...p, [name]: (p[name] ?? 0) + 1 }))
  return [pokes, poke] as const
}
