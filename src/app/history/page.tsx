'use client'

import { useEffect, useState } from 'react'
import { BottomNav } from '@/components/BottomNav'
import { AppFooter } from '@/components/AppFooter'
import { type Bundle, getBundles } from '@/lib/storage'
import { DEEPLINKS } from '@/lib/tokens'

export default function History() {
  const [bundles, setBundles] = useState<Bundle[]>([])

  useEffect(() => {
    setBundles(getBundles())
  }, [])

  return (
    <main className="flex flex-col min-h-screen pb-20 px-4 pt-6">
      <h1 className="text-2xl font-bold mb-6">History</h1>

      {bundles.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 py-20">
          <p className="text-4xl mb-3">📄</p>
          <p className="text-sm">No settlements yet.</p>
          <p className="text-sm mt-1">Settle your first bundle from the home screen.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bundles.map((b) => (
            <BundleCard key={b.id} bundle={b} />
          ))}
        </div>
      )}

      <AppFooter />
      <BottomNav />
    </main>
  )
}

function BundleCard({ bundle }: { bundle: Bundle }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-gray-200 rounded-2xl p-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex justify-between items-start text-left"
      >
        <div>
          <p className="font-semibold">${bundle.total} settled</p>
          <p className="text-xs text-gray-400">{bundle.date}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-green-100 text-green-700 font-medium px-2 py-0.5 rounded-full">
            confirmed
          </span>
          <span className="text-gray-400 text-sm">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="space-y-1.5 mb-3">
            {bundle.lines.map((line, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-700">{line.name}</span>
                <span className="font-medium">${line.amount}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-1">
            <a
              href={DEEPLINKS.receipt(bundle.txHash)}
              className="text-xs text-[#0F6E56] font-medium"
            >
              View receipt ↗
            </a>
            <a
              href={`https://celo-sepolia.blockscout.com/tx/${bundle.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 font-mono"
            >
              {bundle.txHash.slice(0, 10)}…{bundle.txHash.slice(-6)} ↗
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
