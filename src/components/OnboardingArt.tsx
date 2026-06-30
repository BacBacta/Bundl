// Bespoke illustrations for the onboarding slides.
// Hand-built SVG scenes (not stock icons) using the brand palette, with soft
// depth and gradients so each slide feels premium and distinct.

const GRAD = (
  <defs>
    <linearGradient id="bg-stage" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#1D9E75" stopOpacity="0.16" />
      <stop offset="100%" stopColor="#0F6E56" stopOpacity="0.04" />
    </linearGradient>
    <linearGradient id="g-green" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#1D9E75" />
      <stop offset="100%" stopColor="#0F6E56" />
    </linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#0F6E56" floodOpacity="0.18" />
    </filter>
  </defs>
)

const AV = ['#0F6E56', '#2563EB', '#DB2777', '#EA580C']

function Stage() {
  return <rect x="8" y="8" width="224" height="184" rx="32" fill="url(#bg-stage)" />
}

// Slide 1 — a contact list materialising into one card.
export function ArtPeople() {
  const rows = [0, 1, 2]
  return (
    <svg viewBox="0 0 240 200" className="w-full h-full" fill="none">
      {GRAD}
      <Stage />
      <g filter="url(#soft)">
        <rect x="44" y="44" width="152" height="112" rx="20" fill="white" />
      </g>
      {rows.map((i) => (
        <g key={i} transform={`translate(60, ${62 + i * 32})`}>
          <circle cx="12" cy="12" r="12" fill={AV[i]} />
          <text x="12" y="16" textAnchor="middle" fontSize="11" fontWeight="700" fill="white">
            {['M', 'R', 'S'][i]}
          </text>
          <rect x="34" y="6" width="64" height="7" rx="3.5" fill="#11181C" opacity="0.85" />
          <rect x="34" y="18" width="40" height="6" rx="3" fill="#11181C" opacity="0.3" />
          <rect x="118" y="9" width="26" height="9" rx="4.5" fill="#1D9E75" opacity="0.9" />
        </g>
      ))}
      <g transform="translate(176, 128)">
        <circle cx="0" cy="0" r="18" fill="url(#g-green)" />
        <path d="M-7 0 H7 M0 -7 V7" stroke="white" strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  )
}

// Slide 2 — a progress ring with a streak flame and day dots.
export function ArtHabit() {
  const r = 46
  const c = 2 * Math.PI * r
  const pct = 0.72
  return (
    <svg viewBox="0 0 240 200" className="w-full h-full" fill="none">
      {GRAD}
      <Stage />
      <g transform="translate(120, 92)">
        <circle r={r} fill="white" filter="url(#soft)" />
        <circle r={r} fill="none" stroke="#0F6E56" strokeOpacity="0.12" strokeWidth="10" />
        <circle
          r={r}
          fill="none"
          stroke="url(#g-green)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          transform="rotate(-90)"
        />
        {/* flame */}
        <path
          d="M0 -20 C10 -8 16 -4 16 6 a16 16 0 1 1 -32 0 c0 -8 5 -12 9 -18 c1 6 4 8 7 9 c-2 -6 -1 -12 -9 -16 z"
          fill="url(#g-green)"
          transform="translate(0,2) scale(0.9)"
        />
      </g>
      {/* day dots */}
      <g transform="translate(72, 164)">
        {[0, 1, 2, 3, 4].map((i) => (
          <circle key={i} cx={i * 24} cy="0" r="6" fill={i < 4 ? '#1D9E75' : '#0F6E56'} opacity={i < 4 ? 1 : 0.18} />
        ))}
      </g>
    </svg>
  )
}

// Slide 3 — one hub fanning out to many recipients (the disperse metaphor).
export function ArtSettle() {
  const nodes = [
    { x: 56, y: 48 },
    { x: 184, y: 48 },
    { x: 48, y: 150 },
    { x: 192, y: 150 },
  ]
  const hub = { x: 120, y: 100 }
  return (
    <svg viewBox="0 0 240 200" className="w-full h-full" fill="none">
      {GRAD}
      <Stage />
      {nodes.map((n, i) => (
        <line
          key={`l${i}`}
          x1={hub.x}
          y1={hub.y}
          x2={n.x}
          y2={n.y}
          stroke="#1D9E75"
          strokeWidth="2.5"
          strokeOpacity="0.45"
          strokeDasharray="2 6"
          strokeLinecap="round"
        />
      ))}
      {nodes.map((n, i) => (
        <g key={`n${i}`} transform={`translate(${n.x - 16}, ${n.y - 16})`}>
          <circle cx="16" cy="16" r="16" fill="white" filter="url(#soft)" />
          <circle cx="16" cy="16" r="13" fill={AV[i]} opacity="0.16" />
          <circle cx="16" cy="16" r="6" fill={AV[i]} />
        </g>
      ))}
      <g transform={`translate(${hub.x - 28}, ${hub.y - 28})`}>
        <circle cx="28" cy="28" r="28" fill="url(#g-green)" filter="url(#soft)" />
        <path
          d="M19 28 h18 M30 21 l7 7 l-7 7"
          stroke="white"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  )
}
