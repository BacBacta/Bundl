'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Receipt, ChevronDown, ChevronUp, ChevronRight, ExternalLink, CheckCircle2, RefreshCw, Link2, Send, Download, Tag, Check,
} from 'lucide-react'
import { BottomNav } from '@/components/BottomNav'
import { Avatar } from '@/components/Avatar'
import { SkeletonRow } from '@/components/Skeleton'
import { type Bundle, type Payment, getBundles, getPayments } from '@/lib/storage'
import { fetchOnchainActivity, mergeBundles, mergePayments } from '@/lib/onchainHistory'
import { getAccount } from '@/lib/wallet'
import { DEEPLINKS } from '@/lib/tokens'
import { usd, humanDate, monthLabel } from '@/lib/format'
import { ACTIVE_CHAIN } from '@/lib/chains'
import { downloadHistoryCsv } from '@/lib/exportCsv'
import { isUnresolvedAddress, cacheName } from '@/lib/socialconnect'

const EXPLORER = ACTIVE_CHAIN.blockExplorers?.default.url ?? 'https://celo-sepolia.blockscout.com'

// A unified, sortable timeline entry — a settlement or a single payment.
type Entry = { kind: 'bundle'; data: Bundle } | { kind: 'payment'; data: Payment }

const PAGE_SIZE = 30

export default function History() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [bundles, setBundles] = useState<Bundle[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [syncing, setSyncing] = useState(false)
  const [synced, setSynced] = useState(false)
  const [visible, setVisible] = useState(PAGE_SIZE)

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
          {entries.slice(0, visible).map((e, i) => {
            const month = monthLabel(Number(e.data.id))
            const prevMonth = i > 0 ? monthLabel(Number(entries[i - 1].data.id)) : null
            const card =
              e.kind === 'bundle' ? (
                <BundleCard key={`b-${e.data.id}`} bundle={e.data} onRelabel={sync} />
              ) : (
                <PaymentCard key={`p-${e.data.id}`} payment={e.data} onRelabel={sync} />
              )
            return month && month !== prevMonth ? (
              <div key={`g-${e.kind}-${e.data.id}`} className="space-y-3">
                <p className="text-micro font-semibold uppercase tracking-wide text-content-subtle pt-2 px-1">
                  {month}
                </p>
                {card}
              </div>
            ) : (
              card
            )
          })}
          {entries.length > visible && (
            <button
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
              className="w-full py-3 rounded-card border border-line text-caption font-medium text-content-muted active:bg-surface-sunken"
            >
              Show {Math.min(PAGE_SIZE, entries.length - visible)} more
            </button>
          )}
        </div>
      )}

      <BottomNav />
    </main>
  )
}

// An address nobody ever labeled (not in the name cache, not in the local
// Recurring list) shows a raw shortened address — the "impossible to
// decipher" gap. This lets the user retroactively name it; the name is
// cached immediately so every other screen benefits too.
function LabelableName({
  address,
  fallbackName,
  onLabeled,
}: {
  address: string
  fallbackName: string
  onLabeled: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const unresolved = isUnresolvedAddress(address)

  if (!unresolved) return <>{fallbackName}</>

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1">
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Name this address"
          className="bg-surface-sunken rounded px-2 py-0.5 text-caption text-content outline-none w-28"
          onKeyDown={(e) => e.key === 'Enter' && value.trim() && (cacheName(address, value.trim()), onLabeled())}
        />
        <button
          onClick={() => value.trim() && (cacheName(address, value.trim()), onLabeled())}
          className="text-brand"
          aria-label="Save label"
        >
          <Check size={14} />
        </button>
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1">
      {fallbackName}
      <button
        onClick={(e) => {
          e.stopPropagation()
          setEditing(true)
        }}
        className="flex items-center gap-0.5 text-micro text-brand"
      >
        <Tag size={11} /> Label
      </button>
    </span>
  )
}

function toEntries(bundles: Bundle[], payments: Payment[]): Entry[] {
  const entries: Entry[] = [
    ...bundles.map((b): Entry => ({ kind: 'bundle', data: b })),
    ...payments.map((p): Entry => ({ kind: 'payment', data: p })),
  ]
  return entries.sort((a, b) => Number(b.data.id) - Number(a.data.id) || 0)
}

function BundleCard({ bundle, onRelabel }: { bundle: Bundle; onRelabel: () => void }) {
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
            <p className="text-caption text-content-subtle">
              {humanDate(bundle.date)} · {bundle.lines.length} recipient{bundle.lines.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {open ? <ChevronUp size={18} className="text-content-subtle" /> : <ChevronDown size={18} className="text-content-subtle" />}
      </button>

      {open && (
        <div className="mt-3 pt-1 border-t border-line">
          <div className="divide-y divide-line mb-2">
            {bundle.lines.map((line, i) => (
              <div key={i} className="w-full flex items-center gap-3 py-2.5">
                <Avatar seed={line.address} label={line.name} />
                <div className="min-w-0 flex-1">
                  <p className="text-body font-semibold text-content truncate">
                    <LabelableName address={line.address} fallbackName={line.name} onLabeled={onRelabel} />
                  </p>
                </div>
                <span className="text-body font-semibold text-content">${usd(line.amount)}</span>
              </div>
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

function PaymentCard({ payment, onRelabel }: { payment: Payment; onRelabel: () => void }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-surface-raised border border-line rounded-card shadow-card p-4">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex justify-between items-center text-left">
        <div className="flex items-center gap-3">
          <Avatar seed={payment.to} label={payment.toName} size={36} />
          <div>
            <p className="text-heading text-content">${usd(payment.amount)}</p>
            <p className="text-caption text-content-subtle flex items-center gap-1">
              <Send size={11} /> Sent to <LabelableName address={payment.to} fallbackName={payment.toName} onLabeled={onRelabel} /> · {humanDate(payment.date)}
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
