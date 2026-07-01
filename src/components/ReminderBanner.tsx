'use client'

import { AlertTriangle, type LucideIcon } from 'lucide-react'
import { usd } from '@/lib/format'

// Contextual alert shown on Home — ONLY for the one case that isn't already
// communicated by the goal hero + commit button (progress bar, streak, and
// button label already cover "on track" / "done today" / "goal reached").
// Surfacing it again here would be redundant noise, so this renders nothing
// unless the settlement is genuinely at risk (≤3 days left, goal not met).

interface Props {
  potBalance: number
  monthlyTarget: number
  dailyAmount: number
  todayDone: boolean
  daysUntilSettlement: number
}

export function ReminderBanner({ potBalance, monthlyTarget, daysUntilSettlement }: Props) {
  if (monthlyTarget === 0) return null

  const potFull = potBalance >= monthlyTarget
  const remaining = Math.max(0, +(monthlyTarget - potBalance).toFixed(2))
  const isUrgent = daysUntilSettlement <= 3 && !potFull
  if (!isUrgent) return null

  return (
    <Banner tone="danger" Icon={AlertTriangle}>
      Settlement in {daysUntilSettlement} day{daysUntilSettlement !== 1 ? 's' : ''} — ${usd(remaining)} to go.
    </Banner>
  )
}

const TONES = {
  danger: 'bg-danger/10 text-danger',
}

function Banner({
  tone,
  Icon,
  children,
}: {
  tone: keyof typeof TONES
  Icon: LucideIcon
  children: React.ReactNode
}) {
  return (
    <div className={`flex items-center gap-2.5 rounded-card px-4 py-3 text-caption mb-4 ${TONES[tone]}`}>
      <Icon size={18} className="shrink-0" />
      <span>{children}</span>
    </div>
  )
}
