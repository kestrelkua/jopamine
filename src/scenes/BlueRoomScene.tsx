import { whoosh } from '../sound'
import { cameraStyle, ramp, usePokes, type Camera, type SceneProps } from './camera'

const cameras: Record<string, Camera> = {
  photos: { x: 1000, y: 380, zoom: 1.15 },
  battle: { x: 800, y: 450, zoom: 1 },
  sunlight: { x: 820, y: 650, zoom: 1.3 },
  chair: { x: 360, y: 600, zoom: 1.5 },
  arrival: { x: 800, y: 310, zoom: 1.7 },
  window: { x: 800, y: 310, zoom: 2.1 },
  box: { x: 800, y: 640, zoom: 1.5 },
  default: { x: 800, y: 450, zoom: 1 },
}

const frames = [
  { x: 1190, w: 70, h: 90 },
  { x: 1275, w: 90, h: 70 },
  { x: 1380, w: 60, h: 80 },
  { x: 1455, w: 75, h: 95 },
]

const places = [
  { x: 640, y: 200, label: 'D.C.' },
  { x: 930, y: 250, label: 'Mexico' },
  { x: 760, y: 330, label: '?' },
  { x: 880, y: 170, label: '?' },
  { x: 700, y: 410, label: '?' },
]

function Cat({ x, y, s = 1, flip = false }: { x: number; y: number; s?: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`} className="cat">
      {/* pear-shaped cat shadow: body, head, ears, tail */}
      <ellipse cx="0" cy="0" rx="58" ry="26" />
      <circle cx="54" cy="-14" r="20" />
      <path d="M42 -28 L46 -48 L56 -32 Z M58 -32 L68 -48 L72 -28 Z" />
      <path d="M-56 4 C -90 0, -96 -24, -78 -34" fill="none" strokeWidth="9" strokeLinecap="round" />
    </g>
  )
}

export default function BlueRoomScene({ focus, progress, interactive }: SceneProps) {
  const cam = cameras[focus] ?? cameras.default
  const [pokes, poke] = usePokes()
  /** Props for something in the room that reacts to a click with the CSS animation `anim`. */
  const poked = (name: string, anim: string, extra?: () => void) => ({
    className: `${interactive ? 'pokeable' : ''} ${pokes[name] ? anim : ''}`,
    onClick: interactive
      ? () => {
          poke(name)
          extra?.()
        }
      : undefined,
  })
  /** Clickables in a view that isn't showing stay asleep. */
  const hidden = (shown: boolean) => ({ 'data-asleep': shown ? undefined : true })
  const on = (f: string) => (focus === f ? 1 : 0)
  // Photos come down near the end of the first scene and stay down after it.
  const photosDown = focus === 'photos' ? progress : 1
  const sun = focus === 'sunlight' ? 1 : focus === 'chair' ? 0.55 : 0.28
  const sunShift = focus === 'sunlight' ? progress * 80 : 40
  const chairRound = focus === 'chair' ? 1 - progress : focus === 'photos' || focus === 'battle' || focus === 'sunlight' ? 1 : 0
  const chairRx = 16 + chairRound * 110
  const chairWord =
    focus !== 'chair' ? '' : progress < 0.3 ? 'big, round, perfect' : progress < 0.55 ? 'oblong' : 'not very round, square-shaped'
  const flash = focus === 'arrival' ? Math.max(0, 1 - progress * 5) : 0
  const dusk = focus === 'window' ? ramp(progress, 0, 0.4) : 0

  return (
    <svg className="scene blue-room" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="br-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a80c8" />
          <stop offset="1" stopColor="#2c548f" />
        </linearGradient>
        <linearGradient id="br-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a9dcff" />
          <stop offset="1" stopColor="#fff1cf" />
        </linearGradient>
        <linearGradient id="br-dusk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b1748" />
          <stop offset="1" stopColor="#f08a6a" />
        </linearGradient>
        <radialGradient id="br-spot" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff6d8" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff6d8" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="br-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#f2b134" stopOpacity="0.9" />
          <stop offset="1" stopColor="#f2b134" stopOpacity="0" />
        </radialGradient>
        <clipPath id="br-window-clip">
          <rect x="560" y="110" width="480" height="400" rx="6" />
        </clipPath>
      </defs>

      <g style={cameraStyle(cam)}>
        {/* room */}
        <rect x="-800" y="-600" width="3200" height="1240" fill="url(#br-wall)" />
        <rect x="-800" y="640" width="3200" height="700" fill="#22406f" />
        <rect x="-800" y="636" width="3200" height="10" fill="#1a3159" />

        {/* window + what's outside it */}
        <g clipPath="url(#br-window-clip)">
          <rect x="560" y="110" width="480" height="400" fill="url(#br-sky)" />
          <rect x="560" y="110" width="480" height="400" fill="url(#br-dusk)" opacity={dusk} className="fade" />
          <g opacity={1 - dusk} className="fade">
            <circle cx="940" cy="190" r="34" fill="#fff4c2" />
            <path d="M560 430 Q 700 380 820 420 T 1040 400 L1040 510 L560 510 Z" fill="#7fb77e" />
          </g>
          {/* the porch, for the arrival */}
          <g opacity={on('arrival')} className="fade">
            <rect x="560" y="400" width="480" height="110" fill="#c9a77c" />
            <rect x="640" y="372" width="70" height="52" fill="#b88a55" stroke="#7a5630" strokeWidth="3" />
            <g transform="translate(860 300)">
              <circle cx="0" cy="0" r="22" fill="#e9c39b" />
              <rect x="-30" y="22" width="60" height="80" rx="14" fill="#3a78d6" />
              <circle cx="0" cy="58" r="16" fill="#ffd84a" />
              <path d="M-7 54 h2 M5 54 h2 M-8 63 Q0 70 8 63" stroke="#222" strokeWidth="3" fill="none" strokeLinecap="round" />
            </g>
          </g>
          {/* the places a new thing can send you */}
          <g opacity={dusk} className="fade">
            {places.map((pl, i) => {
              const a = ramp(progress, 0.25 + i * 0.1, 0.4 + i * 0.1)
              return (
                <g key={i} opacity={a} className="fade">
                  <circle cx={pl.x} cy={pl.y} r={pl.label === '?' ? 3 : 5} fill="#fff7d6" />
                  <text x={pl.x + 10} y={pl.y + 5} className="place-label" opacity={pl.label === '?' ? 0.5 : 1}>
                    {pl.label}
                  </text>
                </g>
              )
            })}
          </g>
        </g>
        {interactive && <rect x="560" y="110" width="480" height="400" fill="transparent" {...poked('window', '', whoosh)} />}
        <rect x="560" y="110" width="480" height="400" rx="6" fill="none" stroke="#f4f1ea" strokeWidth="16" />
        <path d="M800 110 V510 M560 310 H1040" stroke="#f4f1ea" strokeWidth="10" />
        <g key={`gust${pokes.window ?? 0}`} className={pokes.window ? 'gust' : ''}>
          <path className="curtain curtain-l" d="M520 90 C 560 240, 520 420, 590 560 L 500 560 Z" fill="#e8eef9" opacity="0.85" />
          <path className="curtain curtain-r" d="M1080 90 C 1040 240, 1080 420, 1010 560 L 1100 560 Z" fill="#e8eef9" opacity="0.85" />
        </g>

        {/* sunlight boxes on the carpet */}
        <g opacity={sun} className="fade" style={{ transform: `translateX(${sunShift}px)`, transition: 'transform .3s linear' }}>
          <polygon points="560,660 790,660 860,860 600,860" fill="#ffe9a6" opacity="0.55" />
          <polygon points="810,660 1040,660 1130,860 880,860" fill="#ffe9a6" opacity="0.55" />
        </g>
        <g opacity={focus === 'sunlight' ? 1 : 0} className="fade cats" {...hidden(focus === 'sunlight')}>
          {[
            { x: 700, y: 770, s: 0.9 },
            { x: 980, y: 800, s: 1.05, flip: true },
            { x: 860, y: 720, s: 0.7 },
          ].map((c, i) => (
            <g key={`cat${i}-${pokes[`cat${i}`] ?? 0}`} {...poked(`cat${i}`, 'hop')}>
              <Cat {...c} />
            </g>
          ))}
        </g>

        {/* shelves + baby photos */}
        <rect x="1160" y="330" width="390" height="16" rx="4" fill="#e7d3b5" />
        <rect x="1160" y="470" width="390" height="16" rx="4" fill="#e7d3b5" />
        {frames.map((f, i) => {
          const down = ramp(photosDown, 0.62 + i * 0.07, 0.72 + i * 0.07)
          return (
            <g key={i} style={{ transformOrigin: `${f.x + f.w / 2}px 326px`, transform: `scaleY(${1 - down * 0.9})`, transition: 'transform .4s ease' }}>
              <g key={pokes[`photo${i}`] ?? 0} {...poked(`photo${i}`, 'swing')} style={{ transformOrigin: `${f.x + f.w / 2}px 326px` }}>
              {focus === 'photos' && down < 1 && (
                <rect x={f.x - 14} y={326 - f.h - 14} width={f.w + 28} height={f.h + 28} fill="url(#br-glow)" opacity={0.7} />
              )}
              <rect x={f.x} y={326 - f.h} width={f.w} height={f.h} fill="#fdf6e9" stroke="#a37b4c" strokeWidth="6" />
              <circle cx={f.x + f.w / 2} cy={326 - f.h / 2 - 6} r={Math.min(f.w, f.h) / 5} fill="#f2c9a4" />
              <ellipse cx={f.x + f.w / 2} cy={326 - f.h / 2 + 18} rx={f.w / 4} ry={f.h / 7} fill="#9cc3ea" />
              </g>
            </g>
          )
        })}

        {/* the very nice fat chair */}
        <ellipse cx="350" cy="620" rx="320" ry="260" fill="url(#br-spot)" opacity={on('chair')} className="fade" />
        <g key={`chair${pokes.chair ?? 0}`} {...poked('chair', 'rock')}>
          <rect x="190" y="430" width="320" height="260" rx={chairRx} fill="#f2a65a" style={{ transition: 'rx .35s ease' }} />
          <rect x="160" y="600" width="380" height="150" rx={Math.max(14, chairRx * 0.7)} fill="#e08d42" style={{ transition: 'rx .35s ease' }} />
          <rect x="190" y="745" width="22" height="50" fill="#7a4a22" />
          <rect x="488" y="745" width="22" height="50" fill="#7a4a22" />
        </g>
        <text x="350" y="465" textAnchor="middle" className="chair-word" opacity={chairWord ? 1 : 0}>
          {chairWord}
        </text>

        {/* the cardboard box, and the uniform that got out of it */}
        <g opacity={on('box')} className="fade" {...hidden(focus === 'box')}>
          <g transform={`translate(0 ${-ramp(progress, 0.45, 0.85) * 110})`} opacity={ramp(progress, 0.4, 0.6)}>
            <ellipse cx="800" cy="600" rx="120" ry="70" fill="url(#br-glow)" />
            <path d="M740 560 L770 540 H830 L860 560 L845 590 L830 584 V650 H770 V584 L755 590 Z" fill="#f6f2e8" stroke="#2c548f" strokeWidth="4" />
            <text x="800" y="512" textAnchor="middle" className="chair-word small">every Monday</text>
          </g>
          <path d="M680 690 L920 690 L900 820 L700 820 Z" fill="#c9965a" />
          <path d="M680 690 L640 650 L760 650 L790 690 Z M920 690 L960 650 L840 650 L810 690 Z" fill="#b88449" />
          <g key={`box${pokes.box ?? 0}`} {...poked('box', 'popup')}>
          <g className="box-cats">
            <path d="M735 690 L745 660 L758 690 Z M770 690 L780 660 L790 690 Z" fill="#1a2a48" />
            <path d="M830 690 L840 664 L850 690 Z M858 690 L868 664 L878 690 Z" fill="#1a2a48" />
          </g>
            <rect x="680" y="650" width="280" height="170" fill="transparent" />
          </g>
        </g>

        {/* math homework: the last stand */}
        <g opacity={on('battle')} className="fade">
          <rect x="-800" y="-600" width="3200" height="2000" fill="#7d1f2a" opacity="0.45" />
          <g className="math-rain" fill="#ffd9d0" opacity="0.8">
            {['∫', 'π', 'Σ', '√', 'x²', 'dy/dx', '∞', 'θ', '÷', 'f(x)'].map((s, i) => (
              <text key={i} x={140 + i * 140} y={120 + ((i * 97) % 300)} className="math-glyph" style={{ animationDelay: `${i * -0.7}s` }}>
                {s}
              </text>
            ))}
          </g>
          <text x="800" y="240" textAnchor="middle" className="battle-count">
            30 / 60
          </text>
          <text x="800" y="290" textAnchor="middle" className="battle-sub">battles left to fight</text>
        </g>

        {/* Ding! */}
        <rect x="-800" y="-600" width="3200" height="2000" fill="#fffbe8" opacity={flash} />
      </g>
    </svg>
  )
}
