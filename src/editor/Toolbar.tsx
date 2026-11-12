import { useRef, useState } from 'react'
import { useOutside } from './useOutside'
import { blockTypes, type BlockType } from './blocks'

const TIPS_KEY = 'jt.editor.tips'

function tipsSeen() {
  try {
    return localStorage.getItem(TIPS_KEY) === '1'
  } catch {
    return true
  }
}

interface Props {
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  typewriter: boolean
  onTypewriter: () => void
  sound: boolean
  onSound: () => void
  hasSelection: boolean
  onAdd: (type: BlockType) => void
  onNote: () => void
  onSceneHere: () => void
  onMoment: () => void
}

/** Always-visible versions of the slash menu and the selection bubble, plus the shortcut card. */
export default function Toolbar({ canUndo, canRedo, onUndo, onRedo, typewriter, onTypewriter, sound, onSound, hasSelection, onAdd, onNote, onSceneHere, onMoment }: Props) {
  const [open, setOpen] = useState(false)
  const [seen, setSeen] = useState(tipsSeen)
  const ref = useRef<HTMLDivElement>(null)
  useOutside(ref, open, () => setOpen(false))

  const toggleTips = () => {
    setOpen(!open)
    if (seen) return
    setSeen(true)
    try {
      localStorage.setItem(TIPS_KEY, '1')
    } catch {
      // Not saving is fine; the dot just comes back next time.
    }
  }

  // Buttons keep the text cursor (and any selection) where it is.
  const keep = (e: React.MouseEvent) => e.preventDefault()

  return (
    <div className="ed-toolbar" role="toolbar" aria-label="Formatting">
      <div className="ed-tb-group">
        <button onMouseDown={keep} onClick={onUndo} disabled={!canUndo} aria-label="Undo" data-tip="Undo (⌘Z)">
          <span className="ed-tb-icon">↶</span>
        </button>
        <button onMouseDown={keep} onClick={onRedo} disabled={!canRedo} aria-label="Redo" data-tip="Redo (⇧⌘Z)">
          <span className="ed-tb-icon">↷</span>
        </button>
      </div>
      <div className="ed-tb-group">
        {blockTypes.map((t) => (
          <button key={t.type} onMouseDown={keep} onClick={() => onAdd(t.type)} data-tip={t.name}>
            <span className="ed-tb-icon">{t.icon}</span>
            <span className="ed-tb-name">{t.name}</span>
          </button>
        ))}
      </div>
      <div className="ed-tb-group">
        <button onMouseDown={keep} onClick={onNote} disabled={!hasSelection} data-tip="Note on the selected words">
          <span className="ed-tb-icon">✎</span>
          <span className="ed-tb-name">Note</span>
        </button>
        <button onMouseDown={keep} onClick={onSceneHere} disabled={!hasSelection} data-tip="Start a scene at the selection">
          <span className="ed-tb-icon">◆</span>
          <span className="ed-tb-name">Here</span>
        </button>
        <button onMouseDown={keep} onClick={onMoment} disabled={!hasSelection} data-tip="Lift the selected words into a moment">
          <span className="ed-tb-icon">!</span>
          <span className="ed-tb-name">Lift</span>
        </button>
      </div>
      <div className="ed-tb-end">
        <button onMouseDown={keep} className={typewriter ? 'on' : ''} onClick={onTypewriter} aria-pressed={typewriter} aria-label="Typewriter mode" data-tip="Typewriter mode (⇧⌘Enter)">
          <span className="ed-tb-icon">◎</span>
        </button>
        <button onMouseDown={keep} className={sound ? '' : 'off'} onClick={onSound} aria-pressed={sound} aria-label="Sound" data-tip="Sound">
          <span className="ed-tb-icon">♪</span>
        </button>
      </div>
      <div className="ed-tips-wrap" ref={ref}>
        <button className={`ed-tips-btn ${seen ? '' : 'new'}`} onClick={toggleTips} aria-expanded={open} aria-label="Shortcuts">
          i
        </button>
        {open && (
          <div className="ed-tips" role="dialog" aria-label="Shortcuts">
            <dl>
              <dt>
                <kbd>/</kbd>
              </dt>
              <dd>on an empty line, pick a block</dd>
              <dt>Select</dt>
              <dd>words for a note, a scene, or a moment</dd>
              <dt>
                <span className="ed-tips-glyph">⋮⋮</span>
              </dt>
              <dd>drag to move, click to change or delete</dd>
              <dt>
                <span className="ed-tips-glyph">+</span>
              </dt>
              <dd>add a block between two others</dd>
              <dt>
                <kbd>Enter</kbd>
              </dt>
              <dd>new paragraph</dd>
              <dt>
                <kbd>⇧</kbd> <kbd>Enter</kbd>
              </dt>
              <dd>line break</dd>
              <dt>
                <kbd>⌘</kbd> <kbd>Z</kbd>
              </dt>
              <dd>undo, anywhere (add ⇧ to redo)</dd>
              <dt>
                <kbd>⇧</kbd> <kbd>⌘</kbd> <kbd>Enter</kbd>
              </dt>
              <dd>typewriter mode, Esc to leave</dd>
              <dt>Drop</dt>
              <dd>a picture anywhere to add a photo</dd>
              <dt>
                <span className="rec-dot" />
              </dt>
              <dd>everything you type is saved for the replay. Click it to watch your last minute</dd>
              <dt>
                <span className="ed-tips-glyph">300 / 800</span>
              </dt>
              <dd>click to change your word goal</dd>
            </dl>
          </div>
        )}
      </div>
    </div>
  )
}
