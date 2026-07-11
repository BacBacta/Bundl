'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { parseUnits } from 'viem'
import {
  Download, Upload, Info, ShieldCheck, FileText, Lock, LifeBuoy, BarChart3, ChevronRight, Sparkles,
  UserPlus, QrCode, Bell, BellOff, Crown, Loader2, Link2,
} from 'lucide-react'
import { isAddress } from 'viem'
import { exportBackup, importBackup, getSpendLimit, setSpendLimit, getRecurring, saveRecurring } from '@/lib/storage'
import { fetchOnchainActivity } from '@/lib/onchainHistory'
import { DEEPLINKS, FEE_RECIPIENT } from '@/lib/tokens'
import { BottomNav } from '@/components/BottomNav'
import { ThemeToggle } from '@/components/ThemeToggle'
import { resetOnboarding } from '@/lib/onboarding'
import { requestNotificationPermission } from '@/lib/notifications'
import { getAccount } from '@/lib/wallet'
import { getPreferredStablecoin } from '@/lib/stablecoin'
import { getTokenDecimals, transferToken } from '@/lib/disperse'
import { checkProStatus, getCachedProStatus, PRO_PRICE_USD, FREE_TIER_MAX_RECIPIENTS, PRO_TIER_MAX_RECIPIENTS } from '@/lib/pro'

const PRO_ENABLED = FEE_RECIPIENT !== '0x0000000000000000000000000000000000000000'

export default function SettingsPage() {
  const router = useRouter()
  const [importStatus, setImportStatus] = useState<'idle' | 'ok' | 'error'>('idle')
  const fileRef = useRef<HTMLInputElement>(null)
  const [notifStatus, setNotifStatus] = useState<'unknown' | 'granted' | 'denied'>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unknown'
    return Notification.permission === 'granted' ? 'granted' : Notification.permission === 'denied' ? 'denied' : 'unknown'
  })
  const [limitInput, setLimitInput] = useState(() => {
    const l = typeof window !== 'undefined' ? getSpendLimit() : null
    return l ? String(l) : ''
  })

  async function enableNotifications() {
    const granted = await requestNotificationPermission()
    setNotifStatus(granted ? 'granted' : 'denied')
  }

  function saveLimit(v: string) {
    setLimitInput(v)
    const n = parseFloat(v)
    setSpendLimit(isFinite(n) && n > 0 ? n : null)
  }

  const [isPro, setIsPro] = useState(getCachedProStatus())
  const [account, setAccount] = useState<string | null>(null)
  const [upgrading, setUpgrading] = useState(false)
  const [upgradeError, setUpgradeError] = useState('')

  useEffect(() => {
    getAccount().then((addr) => {
      setAccount(addr)
      if (addr) checkProStatus(addr as `0x${string}`).then(setIsPro)
    })
  }, [])

  async function upgradeToPro() {
    if (!account) return
    setUpgrading(true)
    setUpgradeError('')
    try {
      const token = await getPreferredStablecoin(account as `0x${string}`)
      if (!token || token.humanBalance < PRO_PRICE_USD) {
        setUpgradeError(`You need at least $${PRO_PRICE_USD} in a supported stablecoin to upgrade.`)
        return
      }
      const decimals = await getTokenDecimals(token.address)
      await transferToken(token.address, FEE_RECIPIENT, parseUnits(PRO_PRICE_USD.toString(), decimals))
      const confirmed = await checkProStatus(account as `0x${string}`)
      setIsPro(confirmed)
      if (!confirmed) setUpgradeError('Payment sent — it can take a moment to confirm. Refresh in a bit.')
    } catch (e) {
      setUpgradeError(e instanceof Error && /reject|denied|cancel/i.test(e.message) ? 'Cancelled.' : 'Upgrade failed. Please try again.')
    } finally {
      setUpgrading(false)
    }
  }

  function replayIntro() {
    resetOnboarding()
    router.push('/?intro=1')
  }

  const [restoring, setRestoring] = useState(false)
  const [restoreMsg, setRestoreMsg] = useState('')

  // Cache-clear recovery without a backup file: the last settled bundle on
  // the blockchain IS the user's recurring list — rebuild it from there.
  async function restoreFromChain() {
    if (!account) return
    setRestoring(true)
    setRestoreMsg('')
    try {
      const { bundles } = await fetchOnchainActivity(account as `0x${string}`)
      const latest = bundles[0]
      if (!latest || latest.lines.length === 0) {
        setRestoreMsg('No settled bundles found on-chain for this wallet.')
        return
      }
      const existing = new Set(getRecurring().map((r) => r.address.toLowerCase()))
      const restored = latest.lines
        .filter((l) => isAddress(l.address) && !existing.has(l.address.toLowerCase()))
        .map((l, i) => ({
          id: `${Date.now() + i}`,
          name: l.name,
          address: l.address as `0x${string}`,
          amount: l.amount,
          frequency: 'monthly' as const,
        }))
      if (restored.length === 0) {
        setRestoreMsg('Your list already matches your last settlement.')
        return
      }
      saveRecurring([...getRecurring(), ...restored])
      setRestoreMsg(`Restored ${restored.length} recurring payment${restored.length > 1 ? 's' : ''} · reloading…`)
      setTimeout(() => window.location.reload(), 900)
    } catch {
      setRestoreMsg('Could not reach the blockchain. Try again in a moment.')
    } finally {
      setRestoring(false)
    }
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

      {/* Notifications */}
      <Card title="Notifications">
        <p className="text-caption text-content-subtle mb-3">
          Streaks, goals and incoming payments — in the bell, and on your device if you allow it.
        </p>
        {notifStatus === 'granted' ? (
          <p className="flex items-center gap-1.5 text-caption text-success">
            <Bell size={14} /> Device alerts enabled
          </p>
        ) : notifStatus === 'denied' ? (
          <p className="flex items-center gap-1.5 text-caption text-content-subtle">
            <BellOff size={14} /> Blocked — enable in your browser/MiniPay settings
          </p>
        ) : (
          <button
            onClick={enableNotifications}
            className="w-full py-3 rounded-card bg-brand text-white text-body font-semibold flex items-center justify-center gap-2 shadow-ring active:scale-[0.99] transition-transform"
          >
            <Bell size={17} /> Enable device alerts
          </button>
        )}
      </Card>

      {/* Spending limit */}
      <Card title="Spending limit">
        <p className="text-caption text-content-subtle mb-3">
          A personal warning before settling above this amount — nothing is blocked on-chain.
        </p>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-body text-content-subtle">$</span>
          <input
            value={limitInput}
            onChange={(e) => saveLimit(e.target.value)}
            placeholder="No limit set"
            inputMode="decimal"
            className="w-full bg-surface-sunken rounded-card pl-7 pr-4 py-3 text-body text-content outline-none focus:ring-2 focus:ring-brand/40 transition-shadow"
          />
        </div>
      </Card>

      {/* Bundl Pro */}
      {PRO_ENABLED && (
        <Card title="Bundl Pro">
          {isPro ? (
            <p className="flex items-center gap-1.5 text-caption text-success">
              <Crown size={14} /> Pro unlocked — up to {PRO_TIER_MAX_RECIPIENTS} recurring payments.
            </p>
          ) : (
            <>
              <p className="text-caption text-content-subtle mb-3">
                Free plan: up to {FREE_TIER_MAX_RECIPIENTS} recurring payments. Upgrade once for
                ${PRO_PRICE_USD} to unlock up to {PRO_TIER_MAX_RECIPIENTS} — verified on-chain, no subscription.
              </p>
              <button
                onClick={upgradeToPro}
                disabled={upgrading || !account}
                className="w-full py-3 rounded-card bg-brand text-white text-body font-semibold flex items-center justify-center gap-2 shadow-ring disabled:opacity-60 active:scale-[0.99] transition-transform"
              >
                {upgrading ? <Loader2 size={16} className="animate-spin" /> : <Crown size={16} />}
                {upgrading ? 'Confirming…' : `Upgrade — $${PRO_PRICE_USD} one-time`}
              </button>
              {upgradeError && <p className="text-caption text-warning mt-2">{upgradeError}</p>}
            </>
          )}
        </Card>
      )}

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
          Export everything to a file, or rebuild your list from your last on-chain settlement.
        </p>
        <button
          onClick={handleExport}
          className="w-full py-3 mb-2 rounded-card bg-brand text-white text-body font-semibold flex items-center justify-center gap-2 shadow-ring active:scale-[0.99] transition-transform"
        >
          <Download size={17} /> Export backup
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full py-3 mb-2 rounded-card border border-line text-content text-body font-semibold flex items-center justify-center gap-2 active:bg-surface-sunken"
        >
          <Upload size={17} /> Import backup
        </button>
        <button
          onClick={restoreFromChain}
          disabled={restoring || !account}
          className="w-full py-3 rounded-card border border-line text-content text-body font-semibold flex items-center justify-center gap-2 active:bg-surface-sunken disabled:opacity-50"
        >
          {restoring ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
          {restoring ? 'Reading the blockchain…' : 'Restore from blockchain'}
        </button>
        <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={handleImport} />
        {importStatus === 'ok' && <p className="text-caption text-success text-center mt-2">Restored · reloading…</p>}
        {importStatus === 'error' && <p className="text-caption text-danger text-center mt-2">Invalid backup file</p>}
        {restoreMsg && <p className="text-caption text-content-muted text-center mt-2">{restoreMsg}</p>}
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
