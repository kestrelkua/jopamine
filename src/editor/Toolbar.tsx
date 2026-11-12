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
  hasSelection: boolean
  onAdd: (type: BlockType) => void
  onNote: () => void
  onSceneHere: () => void
  onMoment: () => void
}

/** Always-visible versions of the slash menu and the selection bubble, plus the shortcut card. */
export default function Toolbar({ hasSelection, onAdd, onNote, onSceneHere, onMoment }: Props) {
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
        {blockTypes.map((t) => (
          <button key={t.type} onMouseDown={keep} onClick={() => onAdd(t.type)} title={`Add ${t.name.toLowerCase()}`}>
            <span className="ed-tb-icon">{t.icon}</span>
            <span className="ed-tb-name">{t.name}</span>
          </button>
        ))}
      </div>
      <div className="ed-tb-group">
        <button onMouseDown={keep} onClick={onNote} disabled={!hasSelection} title="Note on the selected words">
          <span className="ed-tb-icon">✎</span>
          <span className="ed-tb-name">Note</span>
        </button>
        <button onMouseDown={keep} onClick={onSceneHere} disabled={!hasSelection} title="Start a scene at the selection">
          <span className="ed-tb-icon">◆</span>
          <span className="ed-tb-name">Here</span>
        </button>
        <button onMouseDown={keep} onClick={onMoment} disabled={!hasSelection} title="Lift the selected words into a moment">
          <span className="ed-tb-icon">!</span>
          <span className="ed-tb-name">Lift</span>
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
                <span className="rec-dot" />
              </dt>
              <dd>everything you type is saved for the replay</dd>
            </dl>
          </div>
        )}
      </div>
    </div>
  )
}
