'use client'

import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { ArtPeople, ArtHabit, ArtSettle } from './OnboardingArt'

const KEY = 'bundl_onboarded'

export function hasOnboarded(): boolean {
  if (typeof window === 'undefined') return true
  // ?intro=1 forces the intro to show again (no console needed on MiniPay).
  if (new URLSearchParams(window.location.search).get('intro') === '1') return false
  return localStorage.getItem(KEY) === '1'
}

export function resetOnboarding() {
  localStorage.removeItem(KEY)
}

interface Slide {
  Art: () => JSX.Element
  eyebrow: string
  title: string
  body: string
}

const SLIDES: Slide[] = [
  {
    Art: ArtPeople,
    eyebrow: 'Step 1',
    title: 'All your people, one list',
    body: 'Add the people you pay regularly — rent, family, suppliers. Bundl can even detect them from your wallet.',
  },
  {
    Art: ArtHabit,
    eyebrow: 'Step 2',
    title: 'Build the habit',
    body: 'Commit a little each day toward your monthly total and keep your streak alive. Your money stays in your wallet.',
  },
  {
    Art: ArtSettle,
    eyebrow: 'Step 3',
    title: 'Settle in one tap',
    body: 'Pay everyone at once in a single transaction — confirmed with one tap, with a native MiniPay receipt.',
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
    <div className="fixed inset-0 z-[60] bg-surface flex flex-col animate-fade-in overflow-hidden">
      {/* ambient gradient mesh */}
      <div className="absolute -top-24 -left-16 w-72 h-72 bg-brand/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-20 w-64 h-64 bg-brand-light/20 rounded-full blur-3xl pointer-events-none" />

      {/* top bar: brand + skip */}
      <div
        className="relative flex justify-between items-center px-5 pt-3"
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}
      >
        <span className="text-heading font-bold text-content tracking-tight">Bundl</span>
        {!last && (
          <button onClick={finish} className="text-caption text-content-subtle px-2 py-1">
            Skip
          </button>
        )}
      </div>

      {/* illustration */}
      <div className="relative flex-1 flex items-center justify-center px-6">
        <div key={index} className="w-full max-w-[320px] aspect-[6/5] animate-fade-in">
          <slide.Art />
        </div>
      </div>

      {/* copy + controls */}
      <div
        className="relative px-7 pb-10"
        style={{ paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))' }}
      >
        <p key={`e${index}`} className="text-caption font-semibold text-brand mb-2 animate-fade-in">
          {slide.eyebrow}
        </p>
        <h1 key={`t${index}`} className="text-display text-content mb-3 animate-fade-in">
          {slide.title}
        </h1>
        <p key={`b${index}`} className="text-body text-content-muted leading-relaxed mb-7 animate-fade-in">
          {slide.body}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
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
            className="flex items-center gap-2 pl-6 pr-5 py-3.5 rounded-pill font-semibold text-white bg-brand shadow-ring active:scale-95 transition-transform"
          >
            {last ? 'Get started' : 'Next'}
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
