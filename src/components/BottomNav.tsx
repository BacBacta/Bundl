'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Repeat, HandCoins, Receipt, Settings } from 'lucide-react'

const TABS = [
  { href: '/', label: 'Home', Icon: Home },
  { href: '/recurring', label: 'Recurring', Icon: Repeat },
  { href: '/request', label: 'Request', Icon: HandCoins },
  { href: '/history', label: 'History', Icon: Receipt },
  { href: '/settings', label: 'Settings', Icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()

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
            className={`flex-1 flex flex-col items-center pt-2.5 pb-2 gap-1 transition-colors ${
              active ? 'text-brand' : 'text-content-subtle'
            }`}
          >
            <Icon size={23} strokeWidth={active ? 2.4 : 2} />
            <span className="text-micro font-medium">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
