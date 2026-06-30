'use client'

interface Props {
  percent: number // 0–100
  label: string
  sublabel?: string
  size?: number
}

// Circular progress ring (SVG). Animates the stroke as percent changes.
export function GoalRing({ percent, label, sublabel, size = 128 }: Props) {
  const stroke = 10
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, percent))
  const offset = circumference - (clamped / 100) * circumference

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="white"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.32,0.72,0,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        <span className="text-2xl font-bold leading-none">{label}</span>
        {sublabel && <span className="text-micro opacity-70 mt-1">{sublabel}</span>}
      </div>
    </div>
  )
}
