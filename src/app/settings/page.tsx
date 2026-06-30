'use client'

import { useState, useRef } from 'react'
import { exportBackup, importBackup } from '@/lib/storage'
import { AppFooter } from '@/components/AppFooter'
import { BottomNav } from '@/components/BottomNav'

export default function SettingsPage() {
  const [importStatus, setImportStatus] = useState<'idle' | 'ok' | 'error'>('idle')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleExport() {
    const json = exportBackup()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bundl-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const ok = importBackup(ev.target?.result as string)
      setImportStatus(ok ? 'ok' : 'error')
      if (ok) setTimeout(() => window.location.reload(), 800)
    }
    reader.readAsText(file)
  }

  return (
    <main className="flex flex-col min-h-screen pb-20 px-4 pt-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* Data transparency note */}
      <div className="bg-amber-50 text-amber-700 text-sm rounded-2xl p-4 mb-6">
        <p className="font-semibold mb-1">Your data lives locally</p>
        <p className="text-xs leading-relaxed">
          Recurring payments, goal history, and streak are stored in your browser only.
          Clearing the MiniPay cache will erase them. Export a backup regularly — especially
          before updating the app.
        </p>
        <p className="text-xs mt-2 text-amber-600">
          Bundle history (tx hashes) is permanently on-chain and can always be recovered.
        </p>
      </div>

      {/* Backup */}
      <div className="border border-gray-200 rounded-2xl p-4 mb-4">
        <p className="font-semibold text-sm mb-1">Backup & restore</p>
        <p className="text-xs text-gray-400 mb-4">
          Export saves your recurring list, goal, and streak to a JSON file. Import restores it.
        </p>
        <div className="space-y-3">
          <button
            onClick={handleExport}
            className="w-full py-3 rounded-xl bg-[#0F6E56] text-white text-sm font-semibold active:opacity-80"
          >
            Export backup (.json)
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full py-3 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold active:bg-gray-50"
          >
            Import backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImport}
          />
          {importStatus === 'ok' && (
            <p className="text-xs text-green-600 text-center">Restored ✓ — reloading…</p>
          )}
          {importStatus === 'error' && (
            <p className="text-xs text-red-500 text-center">Invalid backup file</p>
          )}
        </div>
      </div>

      {/* What the goal tracker is */}
      <div className="border border-gray-200 rounded-2xl p-4 mb-4">
        <p className="font-semibold text-sm mb-1">How the savings goal works</p>
        <p className="text-xs text-gray-500 leading-relaxed">
          The goal tracker is a <strong>commitment tool</strong>, not a vault. Marking a daily
          commitment builds your streak and tracks your progress toward the monthly total.
          Your funds stay in your own wallet at all times — nothing is locked or transferred
          until you tap <em>Settle</em>.
        </p>
        <p className="text-xs text-gray-500 mt-2 leading-relaxed">
          Before settling, Bundl reads your actual wallet balance on-chain and warns you if
          it's insufficient.
        </p>
      </div>

      <AppFooter />
      <BottomNav />
    </main>
  )
}
