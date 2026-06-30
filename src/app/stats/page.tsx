'use client'

import { useEffect, useState } from 'react'
import { getBundles, getRecurring, getStreak } from '@/lib/storage'
import { DISPERSE_ADDRESS, TOKENS } from '@/lib/tokens'

// Public stats page — no wallet required (MiniPay listing requirement)

interface Stats {
  totalBundles: number
  totalVolume: number
  totalRecipientPayments: number
  streak: number
  tokenBreakdown: Record<string, number>
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    const bundles = getBundles()
    const recurring = getRecurring()
    const streak = getStreak()

    const totalVolume = bundles.reduce((s, b) => s + b.total, 0)
    const totalRecipientPayments = bundles.reduce((s, b) => s + b.lines.length, 0)

    setStats({
      totalBundles: bundles.length,
      totalVolume,
      totalRecipientPayments,
      streak,
      tokenBreakdown: { mUSD: totalVolume }, // expand with multi-token in M5
    })
  }, [])

  return (
    <main className="flex flex-col min-h-screen px-4 pt-6 pb-10 max-w-[390px] mx-auto">
      <h1 className="text-2xl font-bold mb-1">Stats</h1>
      <p className="text-sm text-content-subtle mb-6">Public — no wallet required</p>

      {/* On-chain metrics note */}
      <div className="bg-warning/10 text-warning text-xs rounded-xl p-3 mb-6">
        On-chain metrics (tx count, volume per stablecoin, network fees, failed-tx rate) require
        an indexer. Track live at{' '}
        <a
          href={`https://celo-sepolia.blockscout.com/address/${DISPERSE_ADDRESS}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Blockscout ↗
        </a>
      </div>

      {/* Local stats */}
      {stats && (
        <div className="space-y-3 mb-8">
          <StatCard label="Bundles settled" value={stats.totalBundles} />
          <StatCard label="Total volume" value={`$${stats.totalVolume.toFixed(2)}`} />
          <StatCard label="Recipient payments" value={stats.totalRecipientPayments} />
          <StatCard label="Current streak" value={`${stats.streak} day${stats.streak !== 1 ? 's' : ''}`} />
        </div>
      )}

      {/* Contract reference */}
      <div className="border border-line rounded-2xl p-4 mb-4">
        <p className="text-xs font-semibold text-content-subtle mb-3 uppercase tracking-wide">Contracts (Celo Sepolia)</p>
        <div className="space-y-2">
          <ContractRow label="Disperse" address={DISPERSE_ADDRESS} />
          <ContractRow label="MockUSD" address={TOKENS.MOCK_USD.address} />
        </div>
      </div>

      {/* Required metrics legend */}
      <div className="border border-line rounded-2xl p-4">
        <p className="text-xs font-semibold text-content-subtle mb-3 uppercase tracking-wide">
          Required for MiniPay listing
        </p>
        <ul className="text-xs text-content-subtle space-y-1.5">
          {[
            'DAU / MAU',
            'D1 / D7 / D30 retention',
            'Tx count by method (day / week / month)',
            'Unique on-chain users',
            'Volume per stablecoin (USDm / USDC / USDT)',
            'Network fees paid (sum gasUsed × gasPrice)',
            'Service revenue (FeeCollected events)',
            'Failed-tx rate',
          ].map((m) => (
            <li key={m} className="flex gap-2">
              <span className="text-content-subtle">—</span>
              {m}
            </li>
          ))}
        </ul>
        <p className="text-xs text-content-subtle mt-3">
          Integrate Goldsky / Dune / The Graph for production indexing.
        </p>
      </div>
    </main>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-center border border-line rounded-2xl px-4 py-3">
      <span className="text-sm text-content-muted">{label}</span>
      <span className="text-lg font-bold">{value}</span>
    </div>
  )
}

function ContractRow({ label, address }: { label: string; address: string }) {
  return (
    <div>
      <p className="text-xs text-content-subtle">{label}</p>
      <a
        href={`https://celo-sepolia.blockscout.com/address/${address}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-brand font-mono"
      >
        {address.slice(0, 10)}…{address.slice(-6)} ↗
      </a>
    </div>
  )
}
