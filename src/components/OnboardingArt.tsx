// Bespoke, animated illustrations for the onboarding slides.
// Hand-built SVG scenes using the brand palette with sequenced entrances and
// ambient motion (ring draw, value flow, flame flicker, hub ripple).
// Animations are defined in globals.css and replay each time a slide mounts.

const DEFS = (
  <defs>
    <linearGradient id="bg-stage" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#1D9E75" stopOpacity="0.18" />
      <stop offset="100%" stopColor="#0F6E56" stopOpacity="0.03" />
    </linearGradient>
    <linearGradient id="g-green" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#23B083" />
      <stop offset="100%" stopColor="#0F6E56" />
    </linearGradient>
    <linearGradient id="g-card" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#FFFFFF" />
      <stop offset="100%" stopColor="#F3F7F5" />
    </linearGradient>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#0F6E56" floodOpacity="0.16" />
    </filter>
  </defs>
)

const AV = ['#0F6E56', '#2563EB', '#DB2777', '#EA580C']

function Stage() {
  return <rect x="6" y="6" width="228" height="188" rx="34" fill="url(#bg-stage)" />
}

// Slide 1 — a contact list assembling, row by row.
export function ArtPeople() {
  return (
    <svg viewBox="0 0 240 200" className="w-full h-full" fill="none">
      {DEFS}
      <Stage />
      <g className="art-pop art-el" filter="url(#soft)">
        <rect x="42" y="40" width="156" height="120" rx="22" fill="url(#g-card)" />
      </g>
      {[0, 1, 2].map((i) => (
        <g
          key={i}
          className="art-rise art-el"
          style={{ animationDelay: `${250 + i * 160}ms` }}
          transform={`translate(58, ${56 + i * 34})`}
        >
          <circle cx="13" cy="13" r="13" fill={AV[i]} />
          <text x="13" y="17.5" textAnchor="middle" fontSize="12" fontWeight="700" fill="white">
            {['M', 'R', 'S'][i]}
          </text>
          <rect x="36" y="6" width="66" height="8" rx="4" fill="#11181C" opacity="0.82" />
          <rect x="36" y="19" width="42" height="6" rx="3" fill="#11181C" opacity="0.26" />
          <rect x="122" y="9" width="28" height="10" rx="5" fill="#1D9E75" opacity="0.9" />
        </g>
      ))}
      <g className="art-float art-el" style={{ animationDelay: '300ms' }}>
        <g className="art-pop art-el" style={{ animationDelay: '820ms' }}>
          <circle cx="184" cy="150" r="19" fill="url(#g-green)" filter="url(#soft)" />
          <path d="M177 150 H191 M184 143 V157" stroke="white" strokeWidth="3.2" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  )
}

// Slide 2 — a goal ring drawing in, with a flickering streak flame.
export function ArtHabit() {
  const r = 48
  const c = 2 * Math.PI * r
  const pct = 0.72
  return (
    <svg viewBox="0 0 240 200" className="w-full h-full" fill="none">
      {DEFS}
      <Stage />
      <g transform="translate(120, 88)">
        <circle className="art-pop art-el" r={r + 8} fill="url(#g-card)" filter="url(#soft)" />
        <circle r={r} fill="none" stroke="#0F6E56" strokeOpacity="0.12" strokeWidth="11" />
        <circle
          className="art-ring art-el"
          r={r}
          fill="none"
          stroke="url(#g-green)"
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={c}
          transform="rotate(-90)"
          style={{ ['--c' as string]: c, ['--target' as string]: c * (1 - pct), animationDelay: '350ms' }}
        />
        <g className="art-flicker art-el">
          <path
            d="M0 -22 C11 -9 18 -4 18 7 a18 18 0 1 1 -36 0 c0 -9 6 -13 10 -20 c1 7 4 9 8 10 c-2 -7 -1 -13 -10 -17 z"
            fill="url(#g-green)"
            transform="scale(0.92)"
          />
          <path d="M0 4 c5 3 7 7 5 12 a8 8 0 0 1 -10 -2 c0 -5 3 -7 5 -10 z" fill="#FFFFFF" opacity="0.45" />
        </g>
      </g>
      {[0, 1, 2, 3, 4].map((i) => (
        <circle
          key={i}
          className="art-pop art-el"
          style={{ animationDelay: `${700 + i * 110}ms` }}
          cx={72 + i * 24}
          cy="166"
          r="6.5"
          fill={i < 4 ? '#1D9E75' : '#0F6E56'}
          opacity={i < 4 ? 1 : 0.2}
        />
      ))}
    </svg>
  )
}

// Slide 3 — one hub dispersing value to several recipients.
export function ArtSettle() {
  const nodes = [
    { x: 54, y: 50 },
    { x: 186, y: 50 },
    { x: 46, y: 152 },
    { x: 194, y: 152 },
  ]
  const hub = { x: 120, y: 100 }
  return (
    <svg viewBox="0 0 240 200" className="w-full h-full" fill="none">
      {DEFS}
      <Stage />
      {nodes.map((n, i) => (
        <line
          key={`l${i}`}
          className="art-flow"
          x1={hub.x}
          y1={hub.y}
          x2={n.x}
          y2={n.y}
          stroke="url(#g-green)"
          strokeWidth="3"
          strokeOpacity="0.5"
          strokeDasharray="3 9"
          strokeLinecap="round"
          style={{ animationDelay: `${i * 200}ms` }}
        />
      ))}
      {nodes.map((n, i) => (
        <g key={`n${i}`} transform={`translate(${n.x}, ${n.y})`}>
          <g className="art-float art-el" style={{ animationDelay: `${i * 300}ms` }}>
            <g className="art-pop art-el" style={{ animationDelay: `${500 + i * 140}ms` }}>
              <circle r="17" fill="url(#g-card)" filter="url(#soft)" />
              <circle r="13" fill={AV[i]} opacity="0.16" />
              <circle r="6.5" fill={AV[i]} />
            </g>
          </g>
        </g>
      ))}
      {/* hub with ripple */}
      <g transform={`translate(${hub.x}, ${hub.y})`}>
        <circle className="art-ripple art-el" r="28" fill="#1D9E75" />
        <g className="art-pop art-el">
          <circle r="29" fill="url(#g-green)" filter="url(#soft)" />
          <path
            d="M-9 0 h18 M2 -7 l7 7 l-7 7"
            stroke="white"
            strokeWidth="3.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </g>
    </svg>
  )
}
