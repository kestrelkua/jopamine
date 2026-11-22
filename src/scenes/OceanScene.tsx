import { cameraStyle, usePokes, type Camera, type SceneProps } from './camera'

// Caribbean Blue, drawn flat: a sea, a floating drop of ocean, and a blue that shifts with every part.
const cameras: Record<string, Camera> = {
  shade: { x: 800, y: 470, zoom: 1.1 },
  parens: { x: 640, y: 420, zoom: 1.35 },
  meteor: { x: 1060, y: 330, zoom: 1.25 },
  ribbon: { x: 800, y: 600, zoom: 1.3 },
  angled: { x: 800, y: 450, zoom: 1 },
  default: { x: 800, y: 450, zoom: 1 },
}

/** Each part of the story turns the blue a little: a different shade, a different angle. */
const shifts: Record<string, number> = { shade: 0, parens: -18, meteor: 24, ribbon: -8, angled: 40, default: 0 }

export default function OceanScene({ focus, progress, interactive }: SceneProps) {
  const cam = cameras[focus] ?? cameras.default
  const [pokes, poke] = usePokes()
  const hue = (shifts[focus] ?? 0) + (focus === 'angled' ? progress * 60 : 0)
  return (
    <svg className="scene ocean" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="oc-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7fd6ec" />
          <stop offset="1" stopColor="#fff3d6" />
        </linearGradient>
        <linearGradient id="oc-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1fb3d1" />
          <stop offset="1" stopColor="#0b5d8a" />
        </linearGradient>
        <radialGradient id="oc-drop" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#bff3ff" />
          <stop offset="0.5" stopColor="#2cc0dd" />
          <stop offset="1" stopColor="#0c6a9a" />
        </radialGradient>
      </defs>
      <g style={{ ...cameraStyle(cam), filter: `hue-rotate(${hue}deg)`, transition: `${cameraStyle(cam).transition}, filter 1.2s ease` }}>
        <rect x="-400" y="-400" width="2400" height="1100" fill="url(#oc-sky)" />
        <circle cx="1240" cy="220" r="70" fill="#fff0c2" opacity="0.9" />
        <rect x="-400" y="560" width="2400" height="800" fill="url(#oc-sea)" />
        {[600, 640, 690, 750].map((y, k) => (
          <path key={y} d={`M-400 ${y} q 100 -14 200 0 t 200 0 t 200 0 t 200 0 t 200 0 t 200 0 t 200 0 t 200 0 t 200 0 t 200 0 t 200 0 t 200 0`} fill="none" stroke="#ffffff" strokeOpacity={0.25 - k * 0.04} strokeWidth="4" className="ocean-wave" style={{ animationDelay: `${k * -0.7}s` }} />
        ))}
        {/* The sand you start on. */}
        <path d="M-400 900 C 200 760, 700 760, 1100 840 L 1100 1300 L -400 1300 Z" fill="#f1dcae" />
        {/* The floating drop of ocean, over its little dock. */}
        <g
          className={`${interactive ? 'pokeable' : ''} ${pokes.drop ? 'jump' : ''}`}
          key={pokes.drop}
          onClick={interactive ? () => poke('drop') : undefined}
        >
          <ellipse cx="820" cy="330" rx="120" ry="140" fill="url(#oc-drop)" opacity="0.92" />
          <path d="M770 300 q 20 -12 40 0" stroke="#fff" strokeWidth="5" fill="none" opacity="0.6" />
          {[0, 1, 2].map((k) => (
            <path key={k} d={`M${780 + k * 30} ${330 + k * 25} l 22 -9 l 0 18 z`} fill="#ffd06a" className="ocean-fish" style={{ animationDelay: `${k * -1.3}s` }} />
          ))}
        </g>
        <rect x="770" y="540" width="100" height="16" fill="#b88a5a" />
        <rect x="790" y="556" width="10" height="40" fill="#8a6248" />
        <rect x="840" y="556" width="10" height="40" fill="#8a6248" />
        {/* Nested parentheses. */}
        <g opacity={focus === 'parens' ? 1 : 0} className="fade" fill="none" stroke="#fff" strokeWidth="8" strokeLinecap="round">
          {[0, 1, 2, 3].map((k) => (
            <path key={k} d={`M${560 + k * 40} ${330 + k * 30} q -${60 - k * 10} ${140 - k * 30} 0 ${280 - k * 60} M${760 - k * 40} ${330 + k * 30} q ${60 - k * 10} ${140 - k * 30} 0 ${280 - k * 60}`} opacity={1 - k * 0.15} />
          ))}
        </g>
        {/* A shade of blue from outer space. */}
        <g opacity={focus === 'meteor' ? 1 : 0} className="fade">
          <line x1="1400" y1="60" x2="1150" y2="300" stroke="#9fe8ff" strokeWidth="10" strokeLinecap="round" opacity="0.6" />
          <circle cx="1140" cy="310" r="22" fill="#d6f6ff" />
        </g>
      </g>
    </svg>
  )
}
