'use client'

// On-open reminder banner — shown at the top of Home.
// Communicates pot status and urgency without being noisy.

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
  const remaining = +(monthlyTarget - potBalance).toFixed(2)
  const daysNeeded = dailyAmount > 0 ? Math.ceil(remaining / dailyAmount) : 999
  const isUrgent = daysUntilSettlement <= 3 && !potFull
  const isAlmostFull = potBalance / monthlyTarget >= 0.8 && !potFull

  if (potFull) {
    return (
      <Banner color="green" icon="🎉">
        Your pot is full — settle today.
      </Banner>
    )
  }

  if (isUrgent) {
    return (
      <Banner color="red" icon="⚠️">
        Settlement in {daysUntilSettlement} day{daysUntilSettlement !== 1 ? 's' : ''} — you still
        need ${remaining}. Add ${dailyAmount} now.
      </Banner>
    )
  }

  if (todayDone) {
    return (
      <Banner color="gray" icon="✓">
        Added today. Come back tomorrow to keep your streak going.
      </Banner>
    )
  }

  if (isAlmostFull) {
    return (
      <Banner color="green" icon="🪴">
        Almost there — ${remaining} left. {daysNeeded <= daysUntilSettlement ? 'You\'re on track.' : 'Add more today.'}
      </Banner>
    )
  }

  return (
    <Banner color="blue" icon="💡">
      Add ${dailyAmount} today — {daysUntilSettlement} days until settlement.
    </Banner>
  )
}

const COLORS = {
  green: 'bg-green-50 text-green-800',
  red: 'bg-red-50 text-red-700',
  blue: 'bg-blue-50 text-blue-800',
  gray: 'bg-gray-50 text-gray-600',
}

function Banner({
  color,
  icon,
  children,
}: {
  color: keyof typeof COLORS
  icon: string
  children: React.ReactNode
}) {
  return (
    <div className={`flex items-start gap-2 rounded-2xl px-4 py-3 text-sm mb-4 ${COLORS[color]}`}>
      <span className="shrink-0">{icon}</span>
      <span>{children}</span>
    </div>
  )
}
