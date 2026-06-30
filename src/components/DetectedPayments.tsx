'use client'

import { useState } from 'react'
import { Sparkles, Plus, X, ShieldCheck } from 'lucide-react'
import type { DetectedPayment } from '@/lib/activity'
import { Avatar } from './Avatar'
import { usd } from '@/lib/format'
import { shortenAddress } from '@/lib/socialconnect'

interface Props {
  suggestions: DetectedPayment[]
  existingAddresses: string[] // already-added recipients, to skip
  onAdd: (s: DetectedPayment) => void
}

export function DetectedPayments({ suggestions, existingAddresses, onAdd }: Props) {
  const existing = new Set(existingAddresses.map((a) => a.toLowerCase()))
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const visible = suggestions.filter(
    (s) => !existing.has(s.address.toLowerCase()) && !dismissed.has(s.address.toLowerCase()),
  )

  if (visible.length === 0) return null

  function skip(addr: string) {
    setDismissed((prev) => new Set(prev).add(addr.toLowerCase()))
  }

  return (
    <section className="bg-surface-raised border border-line rounded-card shadow-card p-4 mb-4">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={17} className="text-brand" />
        <h2 className="text-heading text-content">Detected from your wallet</h2>
      </div>
      <p className="flex items-center gap-1.5 text-micro text-content-subtle mb-3">
        <ShieldCheck size={12} />
        Bundl reads your public on-chain history to suggest payments.
      </p>

      <div className="divide-y divide-line">
        {visible.map((s) => (
          <div key={s.address} className="flex items-center gap-3 py-2.5">
            <Avatar seed={s.address} label={s.name} />
            <div className="min-w-0 flex-1">
              <p className="text-body font-semibold text-content truncate">{s.name}</p>
              <p className="text-caption text-content-subtle truncate">
                {shortenAddress(s.address)} · {s.cadence} · {s.count}×
              </p>
            </div>
            <div className="text-right mr-1">
              <p className="text-body font-semibold text-content">${usd(s.suggestedAmount)}</p>
            </div>
            <button
              onClick={() => onAdd(s)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-brand text-white active:scale-90 transition-transform"
              aria-label={`Add ${s.name}`}
            >
              <Plus size={17} />
            </button>
            <button
              onClick={() => skip(s.address)}
              className="w-7 h-7 flex items-center justify-center rounded-full text-content-subtle active:opacity-60"
              aria-label={`Skip ${s.name}`}
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
