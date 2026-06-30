'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon, Smartphone } from 'lucide-react'
import { getTheme, setTheme, type Theme } from '@/lib/theme'

const OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Smartphone },
]

export function ThemeToggle() {
  const [theme, setLocal] = useState<Theme>('system')

  useEffect(() => {
    setLocal(getTheme())
  }, [])

  function choose(t: Theme) {
    setTheme(t)
    setLocal(t)
  }

  return (
    <div className="flex gap-1 bg-surface-sunken rounded-card p-1">
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = theme === value
        return (
          <button
            key={value}
            onClick={() => choose(value)}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-[14px] transition-all ${
              active
                ? 'bg-surface-raised text-brand shadow-card'
                : 'text-content-subtle'
            }`}
          >
            <Icon size={18} strokeWidth={active ? 2.4 : 2} />
            <span className="text-micro font-medium">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
