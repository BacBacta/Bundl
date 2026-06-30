'use client'

import { useEffect, useState } from 'react'
import { Receipt, ChevronDown, ChevronUp, ChevronRight, ExternalLink, CheckCircle2 } from 'lucide-react'
import { BottomNav } from '@/components/BottomNav'
import { RecipientRow } from '@/components/RecipientRow'
import { type Bundle, getBundles } from '@/lib/storage'
import { DEEPLINKS } from '@/lib/tokens'
import { usd } from '@/lib/format'
import { ACTIVE_CHAIN } from '@/lib/chains'

const EXPLORER = ACTIVE_CHAIN.blockExplorers?.default.url ?? 'https://celo-sepolia.blockscout.com'

export default function History() {
  const [bundles, setBundles] = useState<Bundle[]>([])

  useEffect(() => {
    setBundles(getBundles())
  }, [])

  return (
    <main className="flex flex-col min-h-screen pb-24 px-4 pt-6">
      <h1 className="text-title text-content mb-5">History</h1>

      {bundles.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
          <div className="w-14 h-14 rounded-full bg-surface-sunken flex items-center justify-center mb-4">
            <Receipt size={24} className="text-content-subtle" />
          </div>
          <p className="text-body text-content-muted">No settlements yet.</p>
          <p className="text-caption text-content-subtle mt-1">Settle your first bundle from Home.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bundles.map((b) => (
            <BundleCard key={b.id} bundle={b} />
          ))}
        </div>
      )}

      <BottomNav />
    </main>
  )
}

function BundleCard({ bundle }: { bundle: Bundle }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-surface-raised border border-line rounded-card shadow-card p-4">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex justify-between items-center text-left">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-success/15 flex items-center justify-center">
            <CheckCircle2 size={18} className="text-success" />
          </div>
          <div>
            <p className="text-heading text-content">${usd(bundle.total)}</p>
            <p className="text-caption text-content-subtle">{bundle.date} · {bundle.lines.length} recipients</p>
          </div>
        </div>
        {open ? <ChevronUp size={18} className="text-content-subtle" /> : <ChevronDown size={18} className="text-content-subtle" />}
      </button>

      {open && (
        <div className="mt-3 pt-1 border-t border-line">
          <div className="divide-y divide-line mb-2">
            {bundle.lines.map((line, i) => (
              <RecipientRow key={i} name={line.name} address={line.address} amount={line.amount} />
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <a
              href={DEEPLINKS.receipt(bundle.txHash)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-card bg-brand/10 text-brand text-caption font-medium"
            >
              Receipt <ChevronRight size={14} />
            </a>
            <a
              href={`${EXPLORER}/tx/${bundle.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-card bg-surface-sunken text-content-muted text-caption font-medium"
            >
              Explorer <ExternalLink size={13} />
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
