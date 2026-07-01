'use client'

import { Flame, PartyPopper, ArrowDownCircle, CheckCircle2, X, BellOff } from 'lucide-react'
import type { AppNotification } from '@/lib/notifications'

const ICONS: Record<AppNotification['type'], typeof Flame> = {
  streak: Flame,
  goal: PartyPopper,
  received: ArrowDownCircle,
  sent: CheckCircle2,
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  return `${Math.floor(hr / 24)}d ago`
}

export function NotificationPanel({
  notifications,
  onClose,
}: {
  notifications: AppNotification[]
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onClose} />
      <div
        className="relative bg-surface-raised rounded-t-sheet px-5 pt-3 pb-6 shadow-sheet animate-sheet-up max-h-[70vh] flex flex-col"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >
        <div className="w-10 h-1 rounded-full bg-line mx-auto mb-4 shrink-0" />
        <div className="flex items-center justify-between mb-3 shrink-0">
          <h2 className="text-heading text-content">Notifications</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-sunken text-content-muted">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto -mx-1 px-1">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center text-center py-10">
              <div className="w-12 h-12 rounded-full bg-surface-sunken flex items-center justify-center mb-3">
                <BellOff size={20} className="text-content-subtle" />
              </div>
              <p className="text-caption text-content-subtle">Nothing yet — activity will show up here.</p>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {notifications.map((n) => {
                const Icon = ICONS[n.type]
                return (
                  <div key={n.id} className="flex items-start gap-3 py-3">
                    <div className="w-9 h-9 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
                      <Icon size={16} className="text-brand" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-body font-semibold text-content">{n.title}</p>
                      <p className="text-caption text-content-muted">{n.body}</p>
                      <p className="text-micro text-content-subtle mt-0.5">{timeAgo(n.date)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
