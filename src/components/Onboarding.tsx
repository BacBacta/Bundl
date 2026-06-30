'use client'

import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { motion, AnimatePresence, MotionConfig, type Variants } from 'motion/react'
import { ProductPeople, ProductHabit, ProductSettle } from './ProductScenes'
import { MeshGradient } from './MeshGradient'
import { Grain } from './Grain'
import { markOnboarded } from '@/lib/onboarding'

interface Slide {
  Scene: () => JSX.Element
  eyebrow: string
  title: string
  body: string
}

const SLIDES: Slide[] = [
  {
    Scene: ProductPeople,
    eyebrow: 'Step 1',
    title: 'All your people, one list',
    body: 'Add the people you pay regularly — rent, family, suppliers. Bundl can even detect them from your wallet.',
  },
  {
    Scene: ProductHabit,
    eyebrow: 'Step 2',
    title: 'Build the habit',
    body: 'Commit a little each day toward your monthly total and keep your streak alive. Your money stays in your wallet.',
  },
  {
    Scene: ProductSettle,
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
      {/* animated WebGL mesh-gradient background */}
      <MeshGradient className="absolute inset-0 w-full h-full" />
      {/* readability scrim — fades the gradient into the surface where copy sits */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-surface/20 to-surface pointer-events-none" />
      {/* focus vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(115% 75% at 50% 32%, transparent 55%, rgba(0,0,0,0.14) 100%)' }}
      />
      {/* film grain */}
      <Grain opacity={0.05} />

      {/* top bar — brand lockup + step counter */}
      <div
        className="relative flex justify-between items-center px-6 pt-4"
        style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-[9px] bg-gradient-to-br from-brand-light to-brand-dark flex items-center justify-center text-white font-display font-bold text-sm shadow-ring">
            B
          </span>
          <span className="font-display text-heading font-bold text-content tracking-tight">Bundl</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-display text-caption font-semibold text-content-subtle tabular-nums">
            {String(index + 1).padStart(2, '0')}
            <span className="opacity-40"> / {String(SLIDES.length).padStart(2, '0')}</span>
          </span>
          {!last && (
            <button onClick={finish} className="text-caption text-content-subtle active:opacity-60">
              Skip
            </button>
          )}
        </div>
      </div>

      {/* scene — swipeable, elevated with brand glow */}
      <div className="relative flex-1 flex items-center justify-center px-7">
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.div
            key={index}
            custom={dir}
            className="relative w-full max-w-[290px] aspect-[5/6]"
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
            {/* soft brand glow behind the floating scene */}
            <div className="absolute -inset-7 -z-10 bg-brand/20 blur-3xl rounded-[44px]" />
            <slide.Scene />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* copy + controls */}
      <div
        className="relative px-7 pb-10"
        style={{ paddingBottom: 'calc(2.75rem + env(safe-area-inset-bottom))' }}
      >
        <AnimatePresence mode="wait">
          <motion.div key={index} variants={textContainer} initial="hidden" animate="show" exit={{ opacity: 0 }}>
            <motion.span
              variants={textItem}
              className="inline-block rounded-full bg-brand/10 text-brand px-3 py-1 text-micro font-bold uppercase tracking-[0.16em] mb-4"
            >
              {slide.eyebrow}
            </motion.span>
            <motion.h1
              variants={textItem}
              className="font-display text-[2.1rem] leading-[1.05] font-bold tracking-tight text-content mb-3"
            >
              {slide.title}
            </motion.h1>
            <motion.p variants={textItem} className="text-body text-content-muted leading-relaxed max-w-[330px]">
              {slide.body}
            </motion.p>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between mt-8">
          <div className="flex gap-2 items-center">
            {SLIDES.map((_, i) => (
              <motion.button
                key={i}
                onClick={() => go(i)}
                aria-label={`Go to step ${i + 1}`}
                className="h-1.5 rounded-full bg-line overflow-hidden"
                animate={{ width: i === index ? 28 : 6 }}
                transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              >
                {i === index && (
                  <motion.span layoutId="dot-fill" className="block h-full w-full bg-brand rounded-full" />
                )}
              </motion.button>
            ))}
          </div>
          <motion.button
            onClick={next}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 pl-7 pr-6 py-4 rounded-pill font-display font-semibold text-white bg-gradient-to-r from-brand-light to-brand shadow-[0_10px_28px_-6px_rgba(15,110,86,0.55)]"
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
