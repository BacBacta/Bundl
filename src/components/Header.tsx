'use client'

import { useState } from 'react'
import { BadgeCheck, Bell } from 'lucide-react'
import { Avatar } from './Avatar'
import { NotificationPanel } from './NotificationPanel'
import { getCachedName } from '@/lib/socialconnect'
import { getNotifications, markAllRead } from '@/lib/notifications'

interface Props {
  account: string | null
  inMiniPay: boolean
  unreadCount?: number
}

// MiniPay branding + identity rules:
// - Show the app name + logo prominently (distinct from MiniPay).
// - Never show a raw 0x… address as the primary identifier. We show the
//   resolved handle (phone/alias) when known, otherwise just the avatar.
export function Header({ account, inMiniPay, unreadCount = 0 }: Props) {
  const handle = account ? getCachedName(account) : null
  const [panelOpen, setPanelOpen] = useState(false)
  const [hasUnread, setHasUnread] = useState(unreadCount > 0)

  function openPanel() {
    setPanelOpen(true)
    markAllRead()
    setHasUnread(false)
  }

  return (
    <header className="flex items-center justify-between mb-5">
      {/* Brand lockup */}
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-brand-light to-brand-dark flex items-center justify-center text-white font-display font-bold text-sm shadow-ring">
          B
        </span>
        <span className="font-display text-heading font-bold text-content tracking-tight">Bundl</span>
      </div>

      {/* Identity (handle only, never raw address) + actions */}
      <div className="flex items-center gap-2.5">
        {!account && !inMiniPay && (
          <span className="text-micro text-content-subtle bg-surface-sunken rounded-pill px-2.5 py-1">
            Open in MiniPay
          </span>
        )}
        {handle && (
          <span className="flex items-center gap-1 text-caption font-medium text-content max-w-[120px] truncate">
            {handle}
            <BadgeCheck size={14} className="text-brand-light shrink-0" />
          </span>
        )}
        <button
          onClick={openPanel}
          className="relative w-9 h-9 flex items-center justify-center rounded-full bg-surface-sunken text-content-muted active:opacity-60"
          aria-label="Notifications"
        >
          <Bell size={18} />
          {(unreadCount > 0 || hasUnread) && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger" />
          )}
        </button>
        {account && <Avatar seed={account} label={handle ?? '?'} size={36} />}
      </div>

      {panelOpen && (
        <NotificationPanel notifications={getNotifications()} onClose={() => setPanelOpen(false)} />
      )}
    </header>
  )
}
