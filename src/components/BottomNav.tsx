'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Home, Repeat, HandCoins, Receipt, Settings } from 'lucide-react'
import { onWalletChanged } from '@/lib/wallet'

const TABS = [
  { href: '/', label: 'Home', Icon: Home },
  { href: '/recurring', label: 'Payments', Icon: Repeat },
  { href: '/request', label: 'Request', Icon: HandCoins },
  { href: '/history', label: 'History', Icon: Receipt },
  { href: '/settings', label: 'Settings', Icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()

  // BottomNav is on every main page, so it's the one place to keep the app
  // consistent with the outside world: wallet account/chain switches and
  // writes from another tab both reload into fresh state.
  useEffect(() => {
    const offWallet = onWalletChanged()
    const onStorage = (e: StorageEvent) => {
      if (e.key?.startsWith('bundl_') && e.newValue !== e.oldValue) window.location.reload()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      offWallet()
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-mobile bg-surface-raised/95 backdrop-blur border-t border-line flex z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {TABS.map(({ href, label, Icon }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center pt-2 pb-2 gap-0.5 transition-colors ${
              active ? 'text-brand' : 'text-content-subtle'
            }`}
          >
            <span
              className={`flex items-center justify-center w-12 h-7 rounded-pill transition-colors ${
                active ? 'bg-brand/10' : ''
              }`}
            >
              <Icon size={21} strokeWidth={active ? 2.4 : 2} />
            </span>
            <span className={`text-micro ${active ? 'font-semibold' : 'font-medium'}`}>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
