// Photos live in IndexedDB (localStorage is far too small); blocks only keep an `idb:<key>` reference.
import { useEffect, useState } from 'react'
import { newId } from './drafts'

const DB = 'jt.photos'
const STORE = 'photos'
const urls = new Map<string, string>()

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** Scales a picture down so its longer side is at most `max` pixels. */
async function shrink(file: Blob, max = 1800): Promise<Blob> {
  const img = await createImageBitmap(file)
  const k = Math.min(1, max / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * k)
  canvas.height = Math.round(img.height * k)
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', 0.85))
}

export async function savePhoto(file: Blob): Promise<string> {
  const blob = await shrink(file)
  const key = newId()
  const d = await db()
  await new Promise<void>((resolve, reject) => {
    const tx = d.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(blob, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  const src = `idb:${key}`
  urls.set(src, URL.createObjectURL(blob))
  return src
}

async function photoUrl(src: string): Promise<string | null> {
  if (!src.startsWith('idb:')) return src || null
  const known = urls.get(src)
  if (known) return known
  const d = await db()
  const blob = await new Promise<Blob | undefined>((resolve, reject) => {
    const req = d.transaction(STORE).objectStore(STORE).get(src.slice(4))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  if (!blob) return null
  const url = URL.createObjectURL(blob)
  urls.set(src, url)
  return url
}

/** A displayable URL for a photo block's `src` (null while loading or if it's missing). */
export function usePhoto(src: string): string | null {
  const [url, setUrl] = useState<string | null>(() => urls.get(src) ?? (src.startsWith('idb:') ? null : src || null))
  useEffect(() => {
    let live = true
    photoUrl(src)
      .then((u) => live && setUrl(u))
      .catch(() => live && setUrl(null))
    return () => {
      live = false
    }
  }, [src])
  return url
}

export const imageFiles = (list: FileList | null | undefined) => Array.from(list ?? []).filter((f) => f.type.startsWith('image/'))
