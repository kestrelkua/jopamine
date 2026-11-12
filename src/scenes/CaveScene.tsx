import { cameraStyle, ramp, useClock, type Camera, type SceneProps } from './camera'

const cameras: Record<string, Camera> = {
  fire: { x: 800, y: 470, zoom: 1.15 },
  synchrony: { x: 800, y: 470, zoom: 1.05 },
  spread: { x: 800, y: 470, zoom: 0.95 },
  piano: { x: 800, y: 450, zoom: 1 },
  chain: { x: 900, y: 440, zoom: 1.05 },
  steps: { x: 800, y: 480, zoom: 1 },
  finale: { x: 800, y: 460, zoom: 0.88 },
  default: { x: 800, y: 450, zoom: 1 },
}

const figures = [
  { x: 600, name: 'Magnificence', flute: true },
  { x: 800, name: 'Tony', flute: false },
  { x: 1000, name: 'Toby', flute: false },
]

const cities = {
  london: { x: 520, y: 330, label: 'London' },
  paris: { x: 580, y: 470, label: 'Paris' },
  vienna: { x: 900, y: 520, label: 'Vienna' },
  warsaw: { x: 1060, y: 360, label: 'Warsaw' },
}

const baltic = [
  { x: 1010, y: 170, label: 'Tallinn' },
  { x: 930, y: 420, label: 'Riga' },
  { x: 990, y: 690, label: 'Vilnius' },
]

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Points spaced evenly along the Tallinn → Riga → Vilnius line. */
function chainPoints(n: number) {
  const pts: { x: number; y: number }[] = []
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * 2
    const seg = Math.min(1, Math.floor(t))
    const local = t - seg
    const a = baltic[seg]
    const b = baltic[seg + 1]
    pts.push({ x: lerp(a.x, b.x, local), y: lerp(a.y, b.y, local) })
  }
  return pts
}
const chain = chainPoints(64)

function Figure({ x, name, flute, sync }: { x: number; name: string; flute: boolean; sync: boolean }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <g className={sync ? 'dancer synced' : 'dancer'} style={{ animationDelay: sync ? '0s' : `${(x % 7) * -0.13}s` }}>
        <circle cx="0" cy="255" r="16" />
        <path d="M0 271 V340 M0 340 L-22 392 M0 340 L24 390 M0 292 L-34 270 M0 292 L34 312" />
        {flute && <path d="M-34 270 L-70 248" className="flute" />}
      </g>
      <text x="0" y="432" textAnchor="middle" className="figure-name">
        {name}
      </text>
    </g>
  )
}

export default function CaveScene({ focus, progress }: SceneProps) {
  const cam = cameras[focus] ?? cameras.default
  const t = useClock(focus === 'synchrony' || focus === 'finale')
  const on = (...fs: string[]) => (fs.includes(focus) ? 1 : 0)
  const caveDim = focus === 'piano' || focus === 'chain' ? 0.12 : focus === 'steps' ? 0.3 : 1
  // Dots start out of step and fall into one shared rhythm as you read.
  const sync = focus === 'finale' ? 1 : focus === 'synchrony' ? ramp(progress, 0.1, 0.8) : 0

  return (
    <svg className="scene cave" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id="cv-bg" cx="0.5" cy="0.85" r="0.9">
          <stop offset="0" stopColor="#5a2f1a" />
          <stop offset="0.5" stopColor="#24130c" />
          <stop offset="1" stopColor="#0b0605" />
        </radialGradient>
        <radialGradient id="cv-fire" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffb347" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ff6a2b" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="cv-pink" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ef6f9a" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ef6f9a" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g style={cameraStyle(cam)}>
        <rect x="-900" y="-700" width="3400" height="2300" fill="url(#cv-bg)" />

        <g opacity={caveDim} className="fade">
          {/* cave mouth */}
          <path d="M-900 -700 H2500 V1600 H-900 Z M140 900 C 160 380, 420 110, 800 100 C 1180 110, 1440 380, 1460 900 Z" fill="#120a07" fillRule="evenodd" />
          <path d="M140 900 C 160 380, 420 110, 800 100 C 1180 110, 1440 380, 1460 900" fill="none" stroke="#3a2216" strokeWidth="18" />
          {/* painted figures */}
          <g className="ochre">
            {figures.map((f) => (
              <Figure key={f.name} {...f} sync={focus === 'finale' || (focus === 'synchrony' && sync > 0.9)} />
            ))}
          </g>
          {/* fire */}
          <ellipse cx="800" cy="760" rx="420" ry="260" fill="url(#cv-fire)" className="fire-glow" />
          <g className="flames">
            <path d="M800 600 C 760 680, 740 720, 770 790 L830 790 C 860 720, 840 680, 800 600 Z" fill="#ff8a2b" />
            <path d="M770 650 C 740 710, 735 750, 760 790 L800 790 C 790 740, 790 700, 770 650 Z" fill="#ffb347" />
            <path d="M835 660 C 860 710, 860 750, 840 790 L805 790 C 815 740, 815 700, 835 660 Z" fill="#ffd27a" />
          </g>
          <path d="M720 800 L880 780 M730 780 L870 805" stroke="#4a2a18" strokeWidth="16" strokeLinecap="round" />
        </g>

        {/* musicking: dots that fall into step */}
        <g opacity={on('synchrony', 'finale')} className="fade">
          {Array.from({ length: 14 }, (_, i) => {
            const angle = Math.PI * (0.12 + (0.76 * i) / 13)
            const cx = 800 - Math.cos(angle) * 470
            const cy = 610 - Math.sin(angle) * 120
            const phase = (i * 2.399) % (Math.PI * 2)
            const bob = Math.sin(t * 3 + phase * (1 - sync)) * 22
            return <circle key={i} cx={cx} cy={cy + bob} r={11} fill={sync > 0.9 ? '#ef6f9a' : '#f6c9a8'} className="fill-fade" />
          })}
        </g>

        {/* identity without the nation: home spreading outward */}
        <g opacity={on('spread', 'finale')} className="fade">
          {[0, 1, 2, 3].map((i) => (
            <circle key={i} cx="800" cy="700" r="80" className="ring" style={{ animationDelay: `${i * 1.1}s` }} />
          ))}
          {Array.from({ length: 30 }, (_, i) => {
            const a = i * 2.399
            const r = 180 + ((i * 53) % 520)
            const shown = focus === 'finale' ? 1 : ramp(progress, i / 34, i / 34 + 0.08)
            return <circle key={i} cx={800 + Math.cos(a) * r} cy={560 + Math.sin(a) * r * 0.5} r={4} fill="#ffd9b0" opacity={shown} />
          })}
        </g>

        {/* an international piano */}
        <g opacity={on('piano')} className="fade">
          {Object.values(cities).map((c) => (
            <g key={c.label}>
              <circle cx={c.x} cy={c.y} r={c.label === 'Warsaw' ? 12 : 8} fill={c.label === 'Warsaw' ? '#ef6f9a' : '#ffe1c4'} />
              <text x={c.x + 18} y={c.y + 6} className="map-label">
                {c.label}
              </text>
            </g>
          ))}
          {[cities.paris, cities.london, cities.vienna].map((c, i) => {
            const k = ramp(progress, 0.1 + i * 0.15, 0.45 + i * 0.15)
            return (
              <g key={c.label}>
                <path d={`M${cities.warsaw.x} ${cities.warsaw.y} Q ${(cities.warsaw.x + c.x) / 2} ${Math.min(c.y, cities.warsaw.y) - 120} ${c.x} ${c.y}`} className="route" opacity={k > 0 ? 0.5 : 0} />
                <text x={lerp(cities.warsaw.x, c.x, k)} y={lerp(cities.warsaw.y, c.y, k) - Math.sin(k * Math.PI) * 90} className="note" opacity={k > 0 && k < 1 ? 1 : 0}>
                  ♪
                </text>
              </g>
            )
          })}
          <text x="800" y="160" textAnchor="middle" className="scene-caption">
            the mazurka travels
          </text>
          <g transform="translate(260 760)">
            {Array.from({ length: 22 }, (_, i) => (
              <rect key={i} x={i * 49} y="0" width="47" height="150" rx="4" fill="#f7efe4" />
            ))}
            {/* black keys sit between C-D, D-E, F-G, G-A, A-B */}
            {Array.from({ length: 21 }, (_, i) =>
              [0, 1, 3, 4, 5].includes(i % 7) ? (
                <rect key={i} x={i * 49 + 33} y="0" width="30" height="92" rx="3" fill="#1d1210" />
              ) : null,
            )}
          </g>
        </g>

        {/* the Baltic Way */}
        <g opacity={on('chain')} className="fade">
          {chain.map((pt, i) => {
            const lit = ramp(progress * 1.25, i / chain.length, i / chain.length + 0.02)
            return <circle key={i} cx={pt.x} cy={pt.y} r={5} fill="#ffd38a" opacity={0.15 + lit * 0.85} />
          })}
          {baltic.map((c) => (
            <g key={c.label}>
              <circle cx={c.x} cy={c.y} r="14" fill="#ef6f9a" />
              <text x={c.x - 26} y={c.y + 10} textAnchor="end" className="map-label big">
                {c.label}
              </text>
            </g>
          ))}
          <text x="560" y="300" className="scene-caption left">≈ 2,000,000 people</text>
          <text x="560" y="345" className="scene-caption left small">hand in hand, about 675 km</text>
          <text x="560" y="382" className="scene-caption left small">23 August 1989</text>
        </g>

        {/* three steps */}
        <g opacity={on('steps')} className="fade">
          {['Preservation', 'Identity', 'Mobilization'].map((label, i) => {
            const k = ramp(progress, 0.15 + i * 0.22, 0.3 + i * 0.22)
            const h = 60 + k * 170
            return (
              <g key={label}>
                <ellipse cx={520 + i * 280} cy={760 - h} rx="110" ry="60" fill="url(#cv-pink)" opacity={k} />
                <rect x={470 + i * 280} y={760 - h} width="100" height={h} rx="10" fill={k > 0.99 ? '#ef6f9a' : '#6b3a2a'} className="fill-fade" />
                <text x={520 + i * 280} y={800} textAnchor="middle" className="map-label center">
                  {i + 1}. {label}
                </text>
              </g>
            )
          })}
        </g>

        {/* finale: one shared heartbeat */}
        <ellipse cx="800" cy="520" rx="700" ry="420" fill="url(#cv-pink)" opacity={on('finale') * 0.35} className="fade heartbeat" />
      </g>
    </svg>
  )
}
