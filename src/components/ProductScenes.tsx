'use client'

// Product-led onboarding scenes: the real Bundl UI in motion, built from the
// same components, tokens and brand colour as the app. Each scene depicts the
// exact step it describes — so it is on-message, cohesive and on-brand by
// construction, and crafted with Framer Motion for a premium feel.

import { motion, useMotionValue, useTransform, animate } from 'motion/react'
import { useEffect } from 'react'
import { Plus, Flame, Check, Zap, Sparkles } from 'lucide-react'

const SPRING = { type: 'spring', stiffness: 240, damping: 20 } as const
const AV = ['#0F6E56', '#2563EB', '#DB2777', '#EA580C']

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full h-full rounded-[22px] bg-surface-raised border border-line shadow-card overflow-hidden p-4 flex flex-col">
      {children}
    </div>
  )
}

// ── Step 1 — a recurring list filling up ───────────────────────────
const PEOPLE = [
  { name: 'Rent', amt: '$400', i: 0 },
  { name: 'Mum', amt: '$50', i: 1 },
  { name: 'Supplier', amt: '$120', i: 2 },
]

export function ProductPeople() {
  return (
    <Frame>
      <div className="flex items-center justify-between mb-3">
        <span className="text-caption font-semibold text-content">Recurring</span>
        <motion.span
          className="w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Plus size={14} />
        </motion.span>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-2.5">
        {PEOPLE.map((p) => (
          <motion.div
            key={p.name}
            className="flex items-center gap-2.5 bg-surface-sunken rounded-xl px-2.5 py-2"
            initial={{ opacity: 0, x: -28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...SPRING, delay: 0.25 + p.i * 0.45 }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
              style={{ backgroundColor: AV[p.i] }}
            >
              {p.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="h-2 rounded-full bg-content/15" style={{ width: `${50 + p.i * 12}%` }} />
            </div>
            <span className="text-caption font-semibold text-content">{p.amt}</span>
          </motion.div>
        ))}
      </div>

      <motion.div
        className="flex items-center gap-1.5 text-micro text-brand mt-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.7 }}
      >
        <Sparkles size={12} /> Detected from your wallet
      </motion.div>
    </Frame>
  )
}

// ── Step 2 — the savings goal ring filling, with streak ────────────
function Counter({ to, prefix = '', duration = 1.4, delay = 0.3 }: { to: number; prefix?: string; duration?: number; delay?: number }) {
  const mv = useMotionValue(0)
  const text = useTransform(mv, (v) => `${prefix}${Math.round(v)}`)
  useEffect(() => {
    const c = animate(mv, to, { duration, delay, ease: [0.22, 1, 0.36, 1] })
    return c.stop
  }, [mv, to, duration, delay])
  return <motion.span>{text as unknown as string}</motion.span>
}

export function ProductHabit() {
  const r = 52
  const pct = 0.76
  return (
    <Frame>
      <div className="flex items-center justify-between mb-1">
        <span className="text-caption font-semibold text-content">Savings goal</span>
        <motion.span
          className="flex items-center gap-1 bg-brand/10 text-brand rounded-full px-2 py-0.5 text-micro font-semibold"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ ...SPRING, delay: 1 }}
        >
          <Flame size={11} /> <Counter to={5} delay={1.1} duration={0.8} /> days
        </motion.span>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="relative" style={{ width: 132, height: 132 }}>
          <svg width="132" height="132" className="-rotate-90">
            <circle cx="66" cy="66" r={r} fill="none" stroke="currentColor" className="text-line" strokeWidth="12" />
            <motion.circle
              cx="66" cy="66" r={r} fill="none" stroke="#0F6E56" strokeWidth="12" strokeLinecap="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: pct }}
              transition={{ duration: 1.4, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-content">
              $<Counter to={114} />
            </span>
            <span className="text-micro text-content-subtle">of $150</span>
          </div>
        </div>
      </div>

      <motion.div
        className="flex items-center justify-center gap-2 bg-brand text-white rounded-xl py-2 text-caption font-semibold mt-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0, scale: [1, 1.03, 1] }}
        transition={{ opacity: { delay: 1.4 }, y: { delay: 1.4 }, scale: { duration: 1.8, repeat: Infinity, delay: 1.6 } }}
      >
        <Plus size={14} /> Commit $5 today
      </motion.div>
    </Frame>
  )
}

// ── Step 3 — one tap fans payment out to everyone ──────────────────
const HUB = { x: 130, y: 58 }
const TARGETS = [
  { x: 46, y: 150 },
  { x: 130, y: 168 },
  { x: 214, y: 150 },
]
const LOOP = 3.4

export function ProductSettle() {
  return (
    <Frame>
      <div className="relative flex-1">
        <svg viewBox="0 0 260 196" className="absolute inset-0 w-full h-full" fill="none">
          {/* connectors */}
          {TARGETS.map((t, i) => (
            <line key={i} x1={HUB.x} y1={HUB.y} x2={t.x} y2={t.y} stroke="#1D9E75" strokeOpacity="0.25" strokeWidth="2" strokeDasharray="2 6" strokeLinecap="round" />
          ))}
          {/* coins fanning out, looping */}
          {TARGETS.map((t, i) => (
            <motion.circle
              key={`c${i}`} r="6" fill="#1D9E75"
              initial={{ cx: HUB.x, cy: HUB.y, opacity: 0 }}
              animate={{ cx: [HUB.x, t.x], cy: [HUB.y, t.y], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 1.1, repeat: Infinity, repeatDelay: LOOP - 1.1, delay: 1 + i * 0.12, times: [0, 0.2, 0.8, 1], ease: 'easeInOut' }}
            />
          ))}
          {/* recipient avatars */}
          {TARGETS.map((t, i) => (
            <g key={`t${i}`} transform={`translate(${t.x}, ${t.y})`}>
              <circle r="15" fill="white" />
              <circle r="15" stroke="#E6E9E8" strokeWidth="1" fill="none" />
              <circle r="15" fill={AV[i + 1]} fillOpacity="0.16" />
              <circle r="6" fill={AV[i + 1]} />
            </g>
          ))}
          {/* hub */}
          <g transform={`translate(${HUB.x}, ${HUB.y})`}>
            <motion.circle
              r="22" fill="#1D9E75"
              animate={{ scale: [0.9, 1.6], opacity: [0.35, 0] }}
              transition={{ duration: LOOP, repeat: Infinity, ease: 'easeOut' }}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            />
            <circle r="22" fill="#0F6E56" />
            <path d="M-7 0 h14 M1 -6 l6 6 l-6 6" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </svg>

        {/* success badge pulses in each loop */}
        <motion.div
          className="absolute top-2 right-2 flex items-center gap-1 bg-success/15 text-success rounded-full px-2 py-0.5 text-micro font-semibold"
          animate={{ opacity: [0, 0, 1, 1, 0], scale: [0.8, 0.8, 1, 1, 0.9] }}
          transition={{ duration: LOOP, repeat: Infinity, times: [0, 0.55, 0.7, 0.92, 1] }}
        >
          <Check size={11} /> Settled
        </motion.div>
      </div>

      {/* the tap button */}
      <motion.div
        className="flex items-center justify-center gap-2 bg-brand text-white rounded-xl py-2.5 text-caption font-semibold"
        animate={{ scale: [1, 0.96, 1] }}
        transition={{ duration: LOOP, repeat: Infinity, times: [0, 0.12, 0.24], ease: 'easeInOut' }}
      >
        <Zap size={14} /> Settle in one tap
      </motion.div>
    </Frame>
  )
}
