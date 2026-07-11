'use client'

import { useEffect, useRef } from 'react'
import { animate, useMotionValue } from 'motion/react'
import { usd } from '@/lib/format'

// Animated money display — counts from the previous value to the new one so
// balances feel alive instead of snapping. Falls back to a static render
// until the first client effect runs (SSR-safe).
export function CountUp({ value, prefix = '$' }: { value: number; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const mv = useMotionValue(0)

  useEffect(() => {
    const controls = animate(mv, value, {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = prefix + usd(v)
      },
    })
    return () => controls.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, prefix])

  return <span ref={ref}>{prefix + usd(value)}</span>
}
