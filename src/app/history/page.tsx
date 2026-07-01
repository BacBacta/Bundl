'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Receipt, ChevronDown, ChevronUp, ChevronRight, ExternalLink, CheckCircle2, RefreshCw, Link2, Send, Download,
} from 'lucide-react'
import { BottomNav } from '@/components/BottomNav'
import { RecipientRow } from '@/components/RecipientRow'
import { Avatar } from '@/components/Avatar'
import { SkeletonRow } from '@/components/Skeleton'
import { type Bundle, type Payment, getBundles, getPayments } from '@/lib/storage'
import { fetchOnchainActivity, mergeBundles, mergePayments } from '@/lib/onchainHistory'
import { getAccount } from '@/lib/wallet'
import { DEEPLINKS } from '@/lib/tokens'
import { usd } from '@/lib/format'
import { ACTIVE_CHAIN } from '@/lib/chains'
import { downloadHistoryCsv } from '@/lib/exportCsv'

const EXPLORER = ACTIVE_CHAIN.blockExplorers?.default.url ?? 'https://celo-sepolia.blockscout.com'

// A unified, sortable timeline entry — a settlement or a single payment.
type Entry = { kind: 'bundle'; data: Bundle } | { kind: 'payment'; data: Payment }

export default function History() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [bundles, setBundles] = useState<Bundle[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [syncing, setSyncing] = useState(false)
  const [synced, setSynced] = useState(false)

  const sync = useCallback(async () => {
    // Local cache shows instantly; the chain is the source of truth.
    const localBundles = getBundles()
    const localPayments = getPayments()
    setBundles(localBundles)
    setPayments(localPayments)
    setEntries(toEntries(localBundles, localPayments))

    const addr = await getAccount()
    if (!addr) return
    setSyncing(true)
    try {
      const chain = await fetchOnchainActivity(addr as `0x${string}`)
      const mergedBundles = mergeBundles(localBundles, chain.bundles)
      const mergedPayments = mergePayments(localPayments, chain.payments)
      setBundles(mergedBundles)
      setPayments(mergedPayments)
      setEntries(toEntries(mergedBundles, mergedPayments))
      setSynced(true)
    } finally {
      setSyncing(false)
    }
  }, [])

  useEffect(() => {
    sync()
  }, [sync])

  return (
    <main className="flex flex-col min-h-screen pb-24 px-4 pt-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-title text-content">History</h1>
        <div className="flex items-center gap-3">
          {entries.length > 0 && (
            <button
              onClick={() => downloadHistoryCsv(bundles, payments)}
              className="flex items-center gap-1.5 text-caption text-content-subtle active:opacity-60"
            >
              <Download size={14} /> CSV
            </button>
          )}
          <button
            onClick={sync}
            disabled={syncing}
            className="flex items-center gap-1.5 text-caption text-content-subtle active:opacity-60 disabled:opacity-40"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing' : 'Refresh'}
          </button>
        </div>
      </div>

      {synced && entries.length > 0 && (
        <p className="flex items-center gap-1.5 text-micro text-content-subtle mb-3">
          <Link2 size={12} /> Synced from the blockchain — restored even after a cache clear.
        </p>
      )}

      {syncing && entries.length === 0 ? (
        <div className="space-y-3">
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : entries.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
          <div className="w-14 h-14 rounded-full bg-surface-sunken flex items-center justify-center mb-4">
            <Receipt size={24} className="text-content-subtle" />
          </div>
          <p className="text-body text-content-muted">No activity yet.</p>
          <p className="text-caption text-content-subtle mt-1">Settle a bundle or send a payment to see it here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((e) =>
            e.kind === 'bundle' ? (
              <BundleCard key={`b-${e.data.id}`} bundle={e.data} />
            ) : (
              <PaymentCard key={`p-${e.data.id}`} payment={e.data} />
            ),
          )}
        </div>
      )}

      <BottomNav />
    </main>
  )
}

function toEntries(bundles: Bundle[], payments: Payment[]): Entry[] {
  const entries: Entry[] = [
    ...bundles.map((b): Entry => ({ kind: 'bundle', data: b })),
    ...payments.map((p): Entry => ({ kind: 'payment', data: p })),
  ]
  return entries.sort((a, b) => Number(b.data.id) - Number(a.data.id) || 0)
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

function PaymentCard({ payment }: { payment: Payment }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-surface-raised border border-line rounded-card shadow-card p-4">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex justify-between items-center text-left">
        <div className="flex items-center gap-3">
          <Avatar seed={payment.to} label={payment.toName} size={36} />
          <div>
            <p className="text-heading text-content">${usd(payment.amount)}</p>
            <p className="text-caption text-content-subtle flex items-center gap-1">
              <Send size={11} /> Sent to {payment.toName} · {payment.date}
            </p>
          </div>
        </div>
        {open ? <ChevronUp size={18} className="text-content-subtle" /> : <ChevronDown size={18} className="text-content-subtle" />}
      </button>

      {open && (
        <div className="mt-3 pt-3 border-t border-line flex gap-2">
          <a
            href={DEEPLINKS.receipt(payment.txHash)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-card bg-brand/10 text-brand text-caption font-medium"
          >
            Receipt <ChevronRight size={14} />
          </a>
          <a
            href={`${EXPLORER}/tx/${payment.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-card bg-surface-sunken text-content-muted text-caption font-medium"
          >
            Explorer <ExternalLink size={13} />
          </a>
        </div>
      )}
    </div>
  )
}
