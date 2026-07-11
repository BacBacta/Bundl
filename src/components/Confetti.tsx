'use client'

import { motion } from 'motion/react'

const COLORS = ['#1D9E75', '#2563EB', '#DB2777', '#EA580C', '#CA8A04', '#7C3AED']

// One-shot celebration burst for the settlement success moment. Pure CSS/JS —
// 18 pieces, deterministic per index (no Math.random, keeps SSR happy).
export function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: 18 }).map((_, i) => {
        const left = ((i * 137) % 100) + '%'
        const delay = (i % 6) * 0.06
        const drift = ((i * 53) % 60) - 30
        const size = 6 + (i % 3) * 3
        return (
          <motion.span
            key={i}
            initial={{ y: -20, x: 0, opacity: 1, rotate: 0 }}
            animate={{ y: 320, x: drift, opacity: 0, rotate: 260 + (i % 4) * 90 }}
            transition={{ duration: 1.4 + (i % 5) * 0.12, delay, ease: 'easeIn' }}
            className="absolute top-0 rounded-[2px]"
            style={{ left, width: size, height: size * 0.6, backgroundColor: COLORS[i % COLORS.length] }}
          />
        )
      })}
    </div>
  )
}
