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
        chain.settlements === 0 ? (
          <div className="border border-line rounded-2xl p-4 mb-6 text-sm text-content-muted">
            Freshly deployed — live metrics appear after the first settlements.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Metric label="Settlements" value={chain.settlements} />
              <Metric label="Unique users" value={chain.uniqueUsers} />
              <Metric label="Settled (7d)" value={chain.last7d} />
              <Metric label="Settled (30d)" value={chain.last30d} />
              {chain.networkFees > 0 && (
                <Metric label="Network fees" value={`${chain.networkFees.toFixed(4)}`} hint="CELO" />
              )}
              <Metric label="Failed-tx rate" value={`${(chain.failedRate * 100).toFixed(1)}%`} />
              {chain.revenue > 0 && <Metric label="Service revenue" value={`$${chain.revenue.toFixed(2)}`} />}
            </div>
            {Object.keys(chain.volumeByToken).length > 0 && (
              <div className="border border-line rounded-2xl p-4 mb-6">
                <p className="text-xs font-semibold text-content-subtle mb-2 uppercase tracking-wide">
                  Volume per stablecoin
                </p>
                <div className="space-y-1.5">
                  {Object.entries(chain.volumeByToken).map(([symbol, vol]) => (
                    <div key={symbol} className="flex justify-between text-sm">
                      <span className="text-content-muted">{symbol}</span>
                      <span className="font-semibold">${vol.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )
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

      {/* Roadmap — extended analytics land with the indexer integration */}
      <div className="border border-line rounded-2xl p-4">
        <p className="text-xs font-semibold text-content-subtle mb-3 uppercase tracking-wide">
          Coming soon
        </p>
        <ul className="text-xs text-content-subtle space-y-1.5">
          {[
            'Daily & monthly active users',
            'Cohort retention (D1 / D7 / D30)',
          ].map((m) => (
            <li key={m} className="flex gap-2">
              <span className="text-content-subtle">—</span>
              {m}
            </li>
          ))}
        </ul>
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
