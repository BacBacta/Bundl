'use client'

import { PartyPopper, AlertTriangle, Check, Sprout, Lightbulb, type LucideIcon } from 'lucide-react'
import { usd } from '@/lib/format'

// On-open reminder banner — shown at the top of Home.
// Communicates goal status and urgency without being noisy.

interface Props {
  potBalance: number
  monthlyTarget: number
  dailyAmount: number
  todayDone: boolean
  daysUntilSettlement: number
}

export function ReminderBanner({
  potBalance,
  monthlyTarget,
  dailyAmount,
  todayDone,
  daysUntilSettlement,
}: Props) {
  if (monthlyTarget === 0) return null

  const potFull = potBalance >= monthlyTarget
  const remaining = Math.max(0, +(monthlyTarget - potBalance).toFixed(2))
  const daysNeeded = dailyAmount > 0 ? Math.ceil(remaining / dailyAmount) : 999
  const isUrgent = daysUntilSettlement <= 3 && !potFull
  const isAlmostFull = potBalance / monthlyTarget >= 0.8 && !potFull

  if (potFull) {
    return <Banner tone="success" Icon={PartyPopper}>Your goal is reached — settle today.</Banner>
  }
  if (isUrgent) {
    return (
      <Banner tone="danger" Icon={AlertTriangle}>
        Settlement in {daysUntilSettlement} day{daysUntilSettlement !== 1 ? 's' : ''} — ${usd(remaining)} to go.
      </Banner>
    )
  }
  if (todayDone) {
    return <Banner tone="neutral" Icon={Check}>Committed today. Come back tomorrow to keep your streak.</Banner>
  }
  if (isAlmostFull) {
    return (
      <Banner tone="success" Icon={Sprout}>
        Almost there — ${usd(remaining)} left.{' '}
        {daysNeeded <= daysUntilSettlement ? "You're on track." : 'Commit more today.'}
      </Banner>
    )
  }
  return (
    <Banner tone="brand" Icon={Lightbulb}>
      Commit ${usd(dailyAmount)} today — {daysUntilSettlement} days until settlement.
    </Banner>
  )
}

const TONES = {
  success: 'bg-success/10 text-success',
  danger: 'bg-danger/10 text-danger',
  brand: 'bg-brand/10 text-brand',
  neutral: 'bg-surface-sunken text-content-muted',
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
