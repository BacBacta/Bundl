'use client'

import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { motion, AnimatePresence, MotionConfig, type Variants } from 'motion/react'
import { ArtPeople, ArtHabit, ArtSettle } from './OnboardingArt'
import { RiveScene } from './RiveScene'
import { markOnboarded } from '@/lib/onboarding'

interface Slide {
  Art: () => JSX.Element
  riv: string // /rive/<name>.riv — used if present, else Art fallback
  eyebrow: string
  title: string
  body: string
}

const SLIDES: Slide[] = [
  {
    Art: ArtPeople,
    riv: '/rive/people.riv',
    eyebrow: 'Step 1',
    title: 'All your people, one list',
    body: 'Add the people you pay regularly — rent, family, suppliers. Bundl can even detect them from your wallet.',
  },
  {
    Art: ArtHabit,
    riv: '/rive/habit.riv',
    eyebrow: 'Step 2',
    title: 'Build the habit',
    body: 'Commit a little each day toward your monthly total and keep your streak alive. Your money stays in your wallet.',
  },
  {
    Art: ArtSettle,
    riv: '/rive/settle.riv',
    eyebrow: 'Step 3',
    title: 'Settle in one tap',
    body: 'Pay everyone at once in a single transaction — confirmed with one tap, with a native MiniPay receipt.',
  },
]

// Text block reveals with a spring stagger.
const textContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}
const textItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 22 } },
}

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [[index, dir], setState] = useState<[number, number]>([0, 1])
  const slide = SLIDES[index]
  const last = index === SLIDES.length - 1

  function finish() {
    markOnboarded()
    onDone()
  }
  function go(to: number) {
    if (to < 0 || to >= SLIDES.length) return
    setState([to, to > index ? 1 : -1])
  }
  function next() {
    if (last) finish()
    else go(index + 1)
  }

  return (
    <MotionConfig reducedMotion="user">
    <div className="fixed inset-0 z-[60] bg-surface flex flex-col overflow-hidden">
      {/* ambient, slowly breathing gradient mesh */}
      <motion.div
        className="absolute -top-24 -left-16 w-72 h-72 bg-brand/25 rounded-full blur-3xl pointer-events-none"
        animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/3 -right-20 w-64 h-64 bg-brand-light/20 rounded-full blur-3xl pointer-events-none"
        animate={{ scale: [1.1, 1, 1.1], opacity: [0.6, 0.9, 0.6] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* top bar */}
      <div
        className="relative flex justify-between items-center px-5 pt-3"
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}
      >
        <span className="text-heading font-bold text-content tracking-tight">Bundl</span>
        {!last && (
          <button onClick={finish} className="text-caption text-content-subtle px-2 py-1 active:opacity-60">
            Skip
          </button>
        )}
      </div>

      {/* illustration — swipeable, with directional spring slide */}
      <div className="relative flex-1 flex items-center justify-center px-6">
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.div
            key={index}
            custom={dir}
            className="w-full max-w-[320px] aspect-[6/5]"
            initial={{ opacity: 0, x: dir * 80, scale: 0.92 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: dir * -80, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.5}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) next()
              else if (info.offset.x > 60) go(index - 1)
            }}
          >
            <RiveScene src={slide.riv} fallback={<slide.Art />} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* copy + controls */}
      <div
        className="relative px-7 pb-10"
        style={{ paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))' }}
      >
        <AnimatePresence mode="wait">
          <motion.div key={index} variants={textContainer} initial="hidden" animate="show" exit={{ opacity: 0 }}>
            <motion.p variants={textItem} className="text-caption font-semibold text-brand mb-2">
              {slide.eyebrow}
            </motion.p>
            <motion.h1 variants={textItem} className="text-display text-content mb-3">
              {slide.title}
            </motion.h1>
            <motion.p variants={textItem} className="text-body text-content-muted leading-relaxed">
              {slide.body}
            </motion.p>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between mt-7">
          <div className="flex gap-2">
            {SLIDES.map((_, i) => (
              <motion.button
                key={i}
                onClick={() => go(i)}
                className="h-1.5 rounded-full bg-line overflow-hidden"
                animate={{ width: i === index ? 24 : 6 }}
                transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              >
                {i === index && (
                  <motion.span
                    layoutId="dot-fill"
                    className="block h-full w-full bg-brand rounded-full"
                  />
                )}
              </motion.button>
            ))}
          </div>
          <motion.button
            onClick={next}
            whileTap={{ scale: 0.94 }}
            className="flex items-center gap-2 pl-6 pr-5 py-3.5 rounded-pill font-semibold text-white bg-brand shadow-ring"
          >
            {last ? 'Get started' : 'Next'}
            <ArrowRight size={18} />
          </motion.button>
        </div>
      </div>
    </div>
    </MotionConfig>
  )
}
