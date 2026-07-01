'use client'

import { useEffect, useState } from 'react'
import { getBundles, getStreak } from '@/lib/storage'
import { fetchContractStats, type ContractStats } from '@/lib/analytics'
import { DISPERSE_ADDRESS, TESTNET_STABLECOINS } from '@/lib/tokens'
import { ACTIVE_CHAIN, celoMainnet } from '@/lib/chains'

const IS_MAINNET = ACTIVE_CHAIN.id === celoMainnet.id

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
  const [chain, setChain] = useState<ContractStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const bundles = getBundles()
    const streak = getStreak()
    const totalVolume = bundles.reduce((s, b) => s + b.total, 0)
    setStats({
      totalBundles: bundles.length,
      totalVolume,
      totalRecipientPayments: bundles.reduce((s, b) => s + b.lines.length, 0),
      streak,
      tokenBreakdown: { mUSD: totalVolume },
    })

    fetchContractStats()
      .then(setChain)
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="flex flex-col min-h-screen px-4 pt-6 pb-10 max-w-[390px] mx-auto">
      <h1 className="text-2xl font-bold mb-1">Stats</h1>
      <p className="text-sm text-content-subtle mb-6">Public — no wallet required</p>

      {/* On-chain metrics — live from the block explorer */}
      <p className="text-xs font-semibold text-content-subtle mb-2 uppercase tracking-wide">On-chain (live)</p>
      {loading ? (
        <div className="grid grid-cols-2 gap-3 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-2xl" />
          ))}
        </div>
      ) : chain && chain.deployed ? (
        <>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Metric label="Settlements" value={chain.settlements} />
            <Metric label="Unique users" value={chain.uniqueUsers} />
            <Metric label="Settled (7d)" value={chain.last7d} />
            <Metric label="Settled (30d)" value={chain.last30d} />
            <Metric label="Network fees" value={`${chain.networkFees.toFixed(4)}`} hint="native" />
            <Metric label="Failed-tx rate" value={`${(chain.failedRate * 100).toFixed(1)}%`} />
          </div>
          <p className="text-xs text-content-subtle mb-6">
            Live from Blockscout. Volume per stablecoin + USD-converted fees need an indexer
            (Goldsky / Dune) — see below.
          </p>
        </>
      ) : (
        <div className="bg-warning/10 text-warning text-xs rounded-xl p-3 mb-6">
          Contract not deployed on this network yet — on-chain metrics will populate after the
          first settlements.
        </div>
      )}

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
        <p className="text-xs font-semibold text-content-subtle mb-3 uppercase tracking-wide">
          Contracts ({IS_MAINNET ? 'Celo Mainnet' : 'Celo Sepolia'})
        </p>
        <div className="space-y-2">
          <ContractRow label="Disperse" address={DISPERSE_ADDRESS} />
          {!IS_MAINNET && <ContractRow label="MockUSD" address={TESTNET_STABLECOINS.MOCK_USD.address} />}
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

function Metric({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="border border-line rounded-2xl px-3 py-2.5">
      <p className="text-xl font-bold text-content tabular-nums">{value}</p>
      <p className="text-xs text-content-subtle">
        {label}
        {hint && <span className="opacity-60"> · {hint}</span>}
      </p>
    </div>
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
  const explorer = ACTIVE_CHAIN.blockExplorers?.default.url ?? 'https://celo-sepolia.blockscout.com'
  return (
    <div>
      <p className="text-xs text-content-subtle">{label}</p>
      <a
        href={`${explorer}/address/${address}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-brand font-mono"
      >
        {address.slice(0, 10)}…{address.slice(-6)} ↗
      </a>
    </div>
  )
}
