'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Download, Upload, Info, ShieldCheck, FileText, Lock, LifeBuoy, BarChart3, ChevronRight, Sparkles,
  UserPlus, QrCode,
} from 'lucide-react'
import { exportBackup, importBackup } from '@/lib/storage'
import { DEEPLINKS } from '@/lib/tokens'
import { BottomNav } from '@/components/BottomNav'
import { ThemeToggle } from '@/components/ThemeToggle'
import { resetOnboarding } from '@/lib/onboarding'

export default function SettingsPage() {
  const router = useRouter()
  const [importStatus, setImportStatus] = useState<'idle' | 'ok' | 'error'>('idle')
  const fileRef = useRef<HTMLInputElement>(null)

  function replayIntro() {
    resetOnboarding()
    router.push('/?intro=1')
  }

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
    <main className="flex flex-col min-h-screen pb-24 px-4 pt-6">
      <h1 className="text-title text-content mb-5">Settings</h1>

      {/* Appearance */}
      <Card title="Appearance">
        <ThemeToggle />
      </Card>

      {/* Share */}
      <div className="bg-surface-raised border border-line rounded-card shadow-card divide-y divide-line mb-4">
        <LinkRow href={DEEPLINKS.inviteFriends} external Icon={UserPlus} label="Invite friends" />
        <LinkRow href={DEEPLINKS.qr} external Icon={QrCode} label="My QR code" />
      </div>

      {/* Data transparency */}
      <div className="bg-warning/10 rounded-card p-4 mb-4">
        <p className="flex items-center gap-1.5 text-heading text-warning mb-1">
          <Info size={16} /> Your data lives locally
        </p>
        <p className="text-caption text-content-muted leading-relaxed">
          Recurring payments, goal history, and streak are stored on this device only.
          Clearing the MiniPay cache erases them — export a backup regularly.
        </p>
        <p className="text-caption text-content-subtle mt-2">
          Bundle history (tx hashes) is permanently on-chain and always recoverable.
        </p>
      </div>

      {/* Backup */}
      <Card title="Backup & restore">
        <p className="text-caption text-content-subtle mb-3">
          Export your recurring list, goal, and streak to a JSON file. Import to restore.
        </p>
        <button
          onClick={handleExport}
          className="w-full py-3 mb-2 rounded-card bg-brand text-white text-body font-semibold flex items-center justify-center gap-2 shadow-ring active:scale-[0.99] transition-transform"
        >
          <Download size={17} /> Export backup
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full py-3 rounded-card border border-line text-content text-body font-semibold flex items-center justify-center gap-2 active:bg-surface-sunken"
        >
          <Upload size={17} /> Import backup
        </button>
        <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={handleImport} />
        {importStatus === 'ok' && <p className="text-caption text-success text-center mt-2">Restored · reloading…</p>}
        {importStatus === 'error' && <p className="text-caption text-danger text-center mt-2">Invalid backup file</p>}
      </Card>

      {/* How the goal works */}
      <Card title="How the savings goal works">
        <p className="flex items-center gap-1.5 text-caption text-content-muted leading-relaxed mb-2">
          <ShieldCheck size={14} className="text-brand shrink-0 mt-0.5" />
          The goal is a commitment tracker, not a vault. Your funds stay in your own wallet at
          all times — nothing is locked or moved until you tap Settle.
        </p>
        <p className="text-caption text-content-subtle leading-relaxed">
          Before settling, Bundl reads your real wallet balance on-chain and warns you if it&apos;s
          insufficient.
        </p>
      </Card>

      {/* Links */}
      <div className="bg-surface-raised border border-line rounded-card shadow-card divide-y divide-line">
        <button onClick={replayIntro} className="w-full text-left">
          <div className="flex items-center gap-3 px-4 py-3.5 active:bg-surface-sunken">
            <Sparkles size={18} className="text-content-muted" />
            <span className="flex-1 text-body text-content">Replay intro</span>
            <ChevronRight size={17} className="text-content-subtle" />
          </div>
        </button>
        <LinkRow href="https://t.me/bundlsupport" external Icon={LifeBuoy} label="Support" />
        <LinkRow href="/stats" Icon={BarChart3} label="Stats" />
        <LinkRow href="/terms" Icon={FileText} label="Terms of service" />
        <LinkRow href="/privacy" Icon={Lock} label="Privacy policy" />
      </div>

      <BottomNav />
    </main>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface-raised border border-line rounded-card shadow-card p-4 mb-4">
      <p className="text-heading text-content mb-2">{title}</p>
      {children}
    </div>
  )
}

function LinkRow({
  href, label, Icon, external,
}: {
  href: string
  label: string
  Icon: typeof LifeBuoy
  external?: boolean
}) {
  const content = (
    <div className="flex items-center gap-3 px-4 py-3.5 active:bg-surface-sunken">
      <Icon size={18} className="text-content-muted" />
      <span className="flex-1 text-body text-content">{label}</span>
      <ChevronRight size={17} className="text-content-subtle" />
    </div>
  )
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer">{content}</a>
  ) : (
    <Link href={href}>{content}</Link>
  )
}
