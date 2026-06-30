'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Inbox, ShieldAlert, Check, X } from 'lucide-react'
import { RecipientRow } from '@/components/RecipientRow'
import { decodeBundle, type ShareItem } from '@/lib/shareBundle'
import { getRecurring, addRecurring } from '@/lib/storage'
import { cacheName } from '@/lib/socialconnect'
import { usd, round2 } from '@/lib/format'

type State = 'loading' | 'invalid' | 'ready' | 'done'

export default function ImportPage() {
  const router = useRouter()
  const [state, setState] = useState<State>('loading')
  const [items, setItems] = useState<ShareItem[]>([])
  const [added, setAdded] = useState(0)

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('b')
    const decoded = code ? decodeBundle(code) : null
    if (!decoded) {
      setState('invalid')
      return
    }
    setItems(decoded)
    setState('ready')
  }, [])

  const total = round2(items.reduce((s, i) => s + i.amount, 0))

  function handleAdd() {
    const existing = new Set(getRecurring().map((r) => r.address.toLowerCase()))
    let count = 0
    for (const it of items) {
      if (existing.has(it.address.toLowerCase())) continue
      cacheName(it.address, it.name)
      addRecurring({ name: it.name, address: it.address, amount: it.amount, frequency: it.frequency })
      count++
    }
    setAdded(count)
    setState('done')
  }

  return (
    <main className="flex flex-col min-h-screen px-5 pt-8 pb-10" style={{ paddingTop: 'calc(2rem + env(safe-area-inset-top))' }}>
      {state === 'loading' && <div className="flex-1" />}

      {state === 'invalid' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-full bg-surface-sunken flex items-center justify-center mb-4">
            <X size={24} className="text-content-subtle" />
          </div>
          <p className="text-body text-content-muted">This shared link is invalid or expired.</p>
          <button onClick={() => router.push('/')} className="mt-5 px-5 py-2.5 rounded-card bg-brand text-white text-body font-semibold shadow-ring">
            Go to Bundl
          </button>
        </div>
      )}

      {state === 'ready' && (
        <>
          <div className="flex items-center gap-2 mb-1">
            <Inbox size={18} className="text-brand" />
            <h1 className="text-title text-content">Shared with you</h1>
          </div>
          <p className="text-caption text-content-subtle mb-5">
            Someone shared a payment bundle. Review it, then add it to your recurring list.
          </p>

          <div className="bg-surface-raised border border-line rounded-card shadow-card px-4 divide-y divide-line mb-3">
            {items.map((it, i) => (
              <RecipientRow key={i} name={it.name} address={it.address} amount={it.amount} cadence={it.frequency} />
            ))}
          </div>

          <div className="flex justify-between text-heading text-content px-1 mb-4">
            <span>Total</span>
            <span>${usd(total)}</span>
          </div>

          <div className="flex items-start gap-2 bg-warning/10 text-warning text-caption rounded-card p-3 mb-5">
            <ShieldAlert size={15} className="shrink-0 mt-0.5" />
            <span>Only add this if you trust the sender. Always check each address before paying.</span>
          </div>

          <button
            onClick={handleAdd}
            className="w-full py-4 rounded-card font-semibold text-white bg-brand shadow-ring active:scale-[0.99] transition-transform"
          >
            Add {items.length} payment{items.length !== 1 ? 's' : ''}
          </button>
          <button onClick={() => router.push('/')} className="w-full py-3 text-caption text-content-subtle mt-1">
            Not now
          </button>
        </>
      )}

      {state === 'done' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center mb-4">
            <Check size={32} className="text-success" strokeWidth={2.5} />
          </div>
          <h1 className="text-title text-content mb-1">
            {added > 0 ? `Added ${added} payment${added !== 1 ? 's' : ''}` : 'Already in your list'}
          </h1>
          <p className="text-caption text-content-subtle mb-5">
            {added > 0 ? 'They’re in your recurring list — set your goal and settle when ready.' : 'These recipients were already saved.'}
          </p>
          <button onClick={() => router.push('/')} className="px-6 py-3 rounded-card bg-brand text-white text-body font-semibold shadow-ring">
            Go to home
          </button>
        </div>
      )}
    </main>
  )
}
