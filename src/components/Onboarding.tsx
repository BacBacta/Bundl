'use client'

import { useState } from 'react'
import { Users, CalendarHeart, Zap, ArrowRight, type LucideIcon } from 'lucide-react'

const KEY = 'bundl_onboarded'

export function hasOnboarded(): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(KEY) === '1'
}

interface Slide {
  Icon: LucideIcon
  title: string
  body: string
}

const SLIDES: Slide[] = [
  {
    Icon: Users,
    title: 'All your people, one list',
    body: 'Add the people you pay regularly — rent, family, suppliers. Bundl can even detect them from your wallet history.',
  },
  {
    Icon: CalendarHeart,
    title: 'Build the habit',
    body: 'Commit a little each day toward your monthly total. Keep your streak going. Your money stays in your wallet the whole time.',
  },
  {
    Icon: Zap,
    title: 'Settle in one tap',
    body: 'When you’re ready, pay everyone at once in a single transaction — confirmed with one tap, with a native MiniPay receipt.',
  },
]

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0)
  const slide = SLIDES[index]
  const last = index === SLIDES.length - 1

  function finish() {
    localStorage.setItem(KEY, '1')
    onDone()
  }

  function next() {
    if (last) finish()
    else setIndex((i) => i + 1)
  }

  return (
    <div className="fixed inset-0 z-[60] bg-surface flex flex-col animate-fade-in">
      {/* Skip */}
      <div className="flex justify-end px-5 pt-3" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}>
        {!last && (
          <button onClick={finish} className="text-caption text-content-subtle px-2 py-1">
            Skip
          </button>
        )}
      </div>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="relative mb-10">
          <div className="absolute inset-0 bg-brand/20 blur-2xl rounded-full scale-125" />
          <div className="relative w-28 h-28 rounded-[36px] bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center shadow-ring">
            <slide.Icon size={48} className="text-white" strokeWidth={1.8} />
          </div>
        </div>
        <h1 className="text-display text-content mb-3">{slide.title}</h1>
        <p className="text-body text-content-muted leading-relaxed max-w-[300px]">{slide.body}</p>
      </div>

      {/* Dots + CTA */}
      <div className="px-6 pb-10" style={{ paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))' }}>
        <div className="flex justify-center gap-2 mb-7">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? 'w-6 bg-brand' : 'w-1.5 bg-line'
              }`}
            />
          ))}
        </div>
        <button
          onClick={next}
          className="w-full py-4 rounded-card font-semibold text-white bg-brand shadow-ring flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
        >
          {last ? 'Get started' : 'Next'}
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  )
}
