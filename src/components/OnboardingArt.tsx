'use client'

// Bespoke, orchestrated illustrations for onboarding.
// Spring-based entrances + ambient motion via Framer Motion, plus a signature
// moment per scene: rows assembling, a ring drawing with a counting value, and
// real tokens flowing from a hub out to each recipient.

import { motion, useMotionValue, useTransform, animate, type Variants } from 'motion/react'
import { useEffect, useState } from 'react'

const SPRING = { type: 'spring', stiffness: 220, damping: 18 } as const

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
    <radialGradient id="g-coin" cx="0.35" cy="0.3" r="0.8">
      <stop offset="0%" stopColor="#5BD6AC" />
      <stop offset="100%" stopColor="#0F6E56" />
    </radialGradient>
    <filter id="soft" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#0F6E56" floodOpacity="0.16" />
    </filter>
    <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="4" result="b" />
      <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
  </defs>
)

const AV = ['#0F6E56', '#2563EB', '#DB2777', '#EA580C']

function Stage() {
  return (
    <motion.rect
      x="6" y="6" width="228" height="188" rx="34" fill="url(#bg-stage)"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    />
  )
}

// ── Slide 1 — contact list assembling ──────────────────────────────
export function ArtPeople() {
  const container: Variants = {
    hidden: {},
    show: { transition: { delayChildren: 0.2, staggerChildren: 0.14 } },
  }
  const row: Variants = {
    hidden: { opacity: 0, x: -24 },
    show: { opacity: 1, x: 0, transition: SPRING },
  }
  return (
    <svg viewBox="0 0 240 200" className="w-full h-full" fill="none">
      {DEFS}
      <Stage />
      <motion.rect
        x="42" y="40" width="156" height="120" rx="22" fill="url(#g-card)" filter="url(#soft)"
        initial={{ opacity: 0, scale: 0.8, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={SPRING}
      />
      <motion.g variants={container} initial="hidden" animate="show">
        {[0, 1, 2].map((i) => (
          <motion.g key={i} variants={row} transform={`translate(58, ${56 + i * 34})`}>
            <circle cx="13" cy="13" r="13" fill={AV[i]} />
            <text x="13" y="17.5" textAnchor="middle" fontSize="12" fontWeight="700" fill="white">
              {['M', 'R', 'S'][i]}
            </text>
            <rect x="36" y="6" width="66" height="8" rx="4" fill="#11181C" opacity="0.82" />
            <rect x="36" y="19" width="42" height="6" rx="3" fill="#11181C" opacity="0.26" />
            <motion.rect
              x="122" y="9" width="28" height="10" rx="5" fill="#1D9E75"
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ ...SPRING, delay: 0.5 + i * 0.14 }}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            />
          </motion.g>
        ))}
      </motion.g>
      <motion.g
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1, y: [0, -5, 0] }}
        transition={{
          scale: { ...SPRING, delay: 0.95 }, opacity: { delay: 0.95 },
          y: { duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1.2 },
        }}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      >
        <circle cx="184" cy="150" r="19" fill="url(#g-green)" filter="url(#soft)" />
        <path d="M177 150 H191 M184 143 V157" stroke="white" strokeWidth="3.2" strokeLinecap="round" />
      </motion.g>
    </svg>
  )
}

// ── Slide 2 — goal ring drawing with a counting value ──────────────
function CountUp({ to, suffix = '%' }: { to: number; suffix?: string }) {
  const mv = useMotionValue(0)
  const rounded = useTransform(mv, (v) => `${Math.round(v)}${suffix}`)
  useEffect(() => {
    const controls = animate(mv, to, { duration: 1.2, delay: 0.35, ease: [0.22, 1, 0.36, 1] })
    return controls.stop
  }, [mv, to])
  return (
    <motion.text textAnchor="middle" y="6" fontSize="26" fontWeight="700" fill="#0F6E56">
      {rounded as unknown as string}
    </motion.text>
  )
}

export function ArtHabit() {
  const r = 48
  const pct = 0.72
  return (
    <svg viewBox="0 0 240 200" className="w-full h-full" fill="none">
      {DEFS}
      <Stage />
      <g transform="translate(120, 86)">
        <motion.circle
          r={r + 9} fill="url(#g-card)" filter="url(#soft)"
          initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={SPRING}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        />
        <circle r={r} fill="none" stroke="#0F6E56" strokeOpacity="0.12" strokeWidth="11" />
        <motion.circle
          r={r} fill="none" stroke="url(#g-green)" strokeWidth="11" strokeLinecap="round"
          transform="rotate(-90)"
          initial={{ pathLength: 0 }} animate={{ pathLength: pct }}
          transition={{ duration: 1.2, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
        />
        <CountUp to={pct * 100} />
      </g>
      {/* flame badge */}
      <motion.g
        transform="translate(120, 86)"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ ...SPRING, delay: 1.1 }}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      >
        <motion.g
          transform="translate(34, 34)"
          animate={{ scale: [1, 1.12, 1], rotate: [0, -3, 2, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        >
          <circle r="15" fill="white" />
          <path d="M0 -9 C5 -3 8 -1 8 4 a8 8 0 1 1 -16 0 c0 -4 3 -6 4.5 -9 c0.5 3 2 4 3.5 4.5 c-1 -3 -0.5 -6 -4 -7.5 z"
            fill="url(#g-green)" filter="url(#glow)" />
        </motion.g>
      </motion.g>
      {/* streak dots */}
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.circle
          key={i} cx={72 + i * 24} cy="168" r="6.5"
          fill={i < 4 ? '#1D9E75' : '#0F6E56'}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: i < 4 ? 1 : 0.2 }}
          transition={{ ...SPRING, delay: 0.8 + i * 0.1 }}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        />
      ))}
    </svg>
  )
}

// ── Slide 3 — value dispersing from a hub to recipients ────────────
export function ArtSettle() {
  const hub = { x: 120, y: 100 }
  const nodes = [
    { x: 54, y: 50 }, { x: 186, y: 50 }, { x: 46, y: 152 }, { x: 194, y: 152 },
  ]
  return (
    <svg viewBox="0 0 240 200" className="w-full h-full" fill="none">
      {DEFS}
      <Stage />

      {/* connector lines drawing out */}
      {nodes.map((n, i) => (
        <motion.line
          key={`l${i}`} x1={hub.x} y1={hub.y} x2={n.x} y2={n.y}
          stroke="#1D9E75" strokeOpacity="0.35" strokeWidth="2.5" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 0.5 + i * 0.1, ease: 'easeOut' }}
        />
      ))}

      {/* travelling tokens (the money flowing out) */}
      {nodes.map((n, i) => (
        <motion.circle
          key={`c${i}`} r="5" fill="url(#g-coin)" filter="url(#glow)"
          initial={{ cx: hub.x, cy: hub.y, opacity: 0 }}
          animate={{ cx: [hub.x, n.x], cy: [hub.y, n.y], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 1 + i * 0.25, ease: 'easeInOut', times: [0, 0.15, 0.85, 1] }}
        />
      ))}

      {/* recipient nodes */}
      {nodes.map((n, i) => (
        <motion.g
          key={`n${i}`}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1, y: [0, -4, 0] }}
          transition={{
            scale: { ...SPRING, delay: 0.55 + i * 0.12 }, opacity: { delay: 0.55 + i * 0.12 },
            y: { duration: 3 + i * 0.3, repeat: Infinity, ease: 'easeInOut', delay: 1 },
          }}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          transform={`translate(${n.x}, ${n.y})`}
        >
          <circle r="17" fill="url(#g-card)" filter="url(#soft)" />
          <circle r="13" fill={AV[i]} opacity="0.16" />
          <circle r="6.5" fill={AV[i]} />
        </motion.g>
      ))}

      {/* hub with breathing ripple */}
      <g transform={`translate(${hub.x}, ${hub.y})`}>
        <motion.circle
          r="29" fill="#1D9E75"
          animate={{ scale: [0.8, 1.7], opacity: [0.4, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        />
        <motion.g
          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...SPRING, delay: 0.25 }}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        >
          <circle r="29" fill="url(#g-green)" filter="url(#soft)" />
          <path d="M-9 0 h18 M2 -7 l7 7 l-7 7" stroke="white" strokeWidth="3.6"
            strokeLinecap="round" strokeLinejoin="round" />
        </motion.g>
      </g>
    </svg>
  )
}
