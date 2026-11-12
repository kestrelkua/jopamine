/** A small acoustic guitar, drawn upright. */
export default function Guitar() {
  return (
    <svg viewBox="0 0 40 100" width="40" height="100" aria-hidden="true">
      <rect x="17" y="2" width="6" height="12" rx="2" fill="#5a3216" />
      <rect x="18" y="12" width="4" height="42" fill="#7a4a22" />
      <path d="M20 46 c-11 0 -15 8 -12 15 c2 4 -4 7 -4 16 c0 12 8 19 16 19 c8 0 16 -7 16 -19 c0 -9 -6 -12 -4 -16 c3 -7 -1 -15 -12 -15 z" fill="#d98a3d" />
      <circle cx="20" cy="66" r="5" fill="#3a2010" />
      <rect x="14" y="80" width="12" height="3" rx="1" fill="#3a2010" />
      <path d="M19 14 V81 M21 14 V81" stroke="#f3e2c4" strokeWidth="0.6" />
    </svg>
  )
}
