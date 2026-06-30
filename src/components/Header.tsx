'use client'

import { BadgeCheck, Bell } from 'lucide-react'
import { Avatar } from './Avatar'
import { getCachedName, shortenAddress } from '@/lib/socialconnect'

interface Props {
  account: string | null
  inMiniPay: boolean
}

export function Header({ account, inMiniPay }: Props) {
  const handle = account ? getCachedName(account) : null

  return (
    <header className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3 min-w-0">
        {account ? (
          <>
            <Avatar seed={account} label={handle ?? account} size={38} />
            <div className="min-w-0">
              <p className="text-heading text-content flex items-center gap-1 truncate">
                {handle ?? shortenAddress(account)}
                {handle && <BadgeCheck size={15} className="text-brand-light shrink-0" />}
              </p>
              <p className="text-micro text-content-subtle">
                {handle ? shortenAddress(account) : 'Connected'}
              </p>
            </div>
          </>
        ) : (
          <div>
            <p className="text-title text-content">Bundl</p>
            {!inMiniPay && (
              <p className="text-micro text-warning">Open in MiniPay to connect</p>
            )}
          </div>
        )}
      </div>

      <button
        className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-sunken text-content-muted active:opacity-60"
        aria-label="Notifications"
      >
        <Bell size={19} />
      </button>
    </header>
  )
}
