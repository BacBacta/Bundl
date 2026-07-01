'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Plus, CalendarClock, ShieldCheck, Flame } from 'lucide-react'
import { BottomNav } from '@/components/BottomNav'
import { Header } from '@/components/Header'
import { RecipientRow } from '@/components/RecipientRow'
import { SettleSheet } from '@/components/SettleSheet'
import { ReminderBanner } from '@/components/ReminderBanner'
import { DetectedPayments } from '@/components/DetectedPayments'
import { hasOnboarded } from '@/lib/onboarding'
import { SkeletonRow } from '@/components/Skeleton'

// Lazy — pulls the animation lib only when the intro actually shows.
const Onboarding = dynamic(() => import('@/components/Onboarding').then((m) => m.Onboarding), {
  ssr: false,
})
import { getAccount, isMiniPay } from '@/lib/wallet'
import { usd, round2 } from '@/lib/format'
import { getAllStablecoinBalances, redirectToDeposit, type StablecoinBalance } from '@/lib/stablecoin'
import { detectRecurringPayments, MOCK_SUGGESTIONS, type DetectedPayment } from '@/lib/activity'
import { cacheName } from '@/lib/socialconnect'
import {
  type Recurring,
  type Bundle,
  getRecurring,
  addRecurring,
  getPotBalance,
  getStreak,
  addDeposit,
  depositedToday,
  addBundle,
  getSettlementTokenKey,
  setSettlementTokenKey,
  monthlyEquivalent,
} from '@/lib/storage'

export default function Home() {
  const [account, setAccount] = useState<string | null>(null)
  const [inMiniPay, setInMiniPay] = useState(false)
  const [recurring, setRecurring] = useState<Recurring[]>([])
  const [potBalance, setPotBalance] = useState(0)
  const [todayDone, setTodayDone] = useState(false)
  const [streak, setStreak] = useState(0)
  const [settling, setSettling] = useState(false)
  const [allTokens, setAllTokens] = useState<StablecoinBalance[]>([])
  const [selectedToken, setSelectedToken] = useState<StablecoinBalance | null>(null)
  const [tokenLoading, setTokenLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<DetectedPayment[]>([])
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    setShowOnboarding(!hasOnboarded())
    setInMiniPay(isMiniPay())
    setRecurring(getRecurring())
    setPotBalance(getPotBalance())
    setTodayDone(depositedToday())
    setStreak(getStreak())

    getAccount().then((addr) => {
      setAccount(addr)
      if (!addr) return

      setTokenLoading(true)
      getAllStablecoinBalances(addr as `0x${string}`)
        .then((balances) => {
          setAllTokens(balances)
          const savedKey = getSettlementTokenKey()
          setSelectedToken(balances.find((t) => t.key === savedKey) ?? balances[0] ?? null)
        })
        .finally(() => setTokenLoading(false))

      // T8 — detect recurring payments from real on-chain history only.
      // Demo data is opt-in via ?demo=1 so users never see phantom entries.
      const demo = new URLSearchParams(window.location.search).get('demo') === '1'
      detectRecurringPayments(addr as `0x${string}`).then((found) => {
        setSuggestions(found.length > 0 ? found : demo ? MOCK_SUGGESTIONS : [])
      })
    })
  }, [])

  // Monthly savings target normalises each payment by its frequency…
  const monthlyTarget = round2(recurring.reduce((s, r) => s + monthlyEquivalent(r), 0))
  // …while a settlement pays each recipient their face amount once.
  const settleTotal = round2(recurring.reduce((s, r) => s + r.amount, 0))
  const dailyAmount = monthlyTarget > 0 ? Math.max(0.01, round2(monthlyTarget / 30)) : 5
  const potPercent = monthlyTarget > 0 ? Math.min(100, Math.round((potBalance / monthlyTarget) * 100)) : 0
  const potFull = monthlyTarget > 0 && potBalance >= monthlyTarget

  function handleAddToPot() {
    const { balance, streak: newStreak } = addDeposit(dailyAmount)
    setPotBalance(balance)
    setStreak(newStreak)
    setTodayDone(true)
  }

  function handleSettled(bundle: Bundle) {
    addBundle(bundle)
    setPotBalance(0)
    setSettling(false)
  }

  function handleAddDetected(s: DetectedPayment) {
    cacheName(s.address, s.name)
    const frequency = s.cadence === 'weekly' || s.cadence === 'biweekly' ? s.cadence : 'monthly'
    const item = addRecurring({ name: s.name, address: s.address, amount: s.suggestedAmount, frequency })
    setRecurring((prev) => [...prev, item])
  }

  const { dueDate, daysUntilSettlement } = (() => {
    const now = new Date()
    const due = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const days = Math.max(0, Math.ceil((due.getTime() - now.getTime()) / 86_400_000))
    return {
      dueDate: due.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      daysUntilSettlement: days,
    }
  })()

  return (
    <main className="flex flex-col min-h-screen pb-24 px-4 pt-4">
      <Header account={account} inMiniPay={inMiniPay} />

      {/* Goal hero — the primary thing on this screen, clean fintech style */}
      <section className="mt-1 mb-7 px-1">
        <div className="flex items-center justify-between mb-2">
          <p className="text-caption text-content-muted font-medium">Savings goal</p>
          {streak > 0 && (
            <span className="inline-flex items-center gap-1 bg-brand/10 text-brand rounded-pill px-2.5 py-1 text-micro font-semibold">
              <Flame size={12} /> {streak} day{streak > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-2">
          <p className="text-hero text-content">${usd(potBalance)}</p>
          {monthlyTarget > 0 && (
            <p className="text-heading text-content-subtle font-normal">/ ${usd(monthlyTarget)}</p>
          )}
        </div>

        {monthlyTarget > 0 && (
          <>
            <div className="h-2 bg-surface-sunken rounded-pill overflow-hidden mt-5">
              <div
                className="h-full bg-brand rounded-pill transition-all duration-700"
                style={{ width: `${potPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2.5">
              <span className="flex items-center gap-1 text-micro text-content-subtle">
                <ShieldCheck size={11} /> Funds stay in your wallet
              </span>
              <span className="flex items-center gap-1 text-micro text-content-subtle">
                <CalendarClock size={11} /> {daysUntilSettlement}d left
              </span>
            </div>
          </>
        )}
      </section>

      {/* Urgency alert — only shown when settlement is genuinely at risk */}
      <ReminderBanner
        potBalance={potBalance}
        monthlyTarget={monthlyTarget}
        dailyAmount={dailyAmount}
        todayDone={todayDone}
        daysUntilSettlement={daysUntilSettlement}
      />

      {/* Empty state */}
      {recurring.length === 0 && (
        <a
          href="/recurring"
          className="flex items-center justify-center gap-2 border border-dashed border-line rounded-card p-5 mb-5 text-brand font-medium active:opacity-70"
        >
          <Plus size={18} /> Add your first recurring payment
        </a>
      )}

      {/* Commit button — primary action, right under the goal */}
      {monthlyTarget > 0 && (
        <button
          onClick={handleAddToPot}
          disabled={todayDone || potFull}
          className="w-full py-4 rounded-card font-semibold text-white bg-brand shadow-ring disabled:bg-surface-sunken disabled:text-content-subtle disabled:shadow-none active:scale-[0.99] transition-transform mb-5"
        >
          {todayDone
            ? 'Committed today · come back tomorrow'
            : potFull
            ? 'Goal reached — settle below'
            : `Commit $${usd(dailyAmount)} today`}
        </button>
      )}

      {/* Next settlement */}
      {recurring.length > 0 && (
        <div className="bg-surface-raised border border-line rounded-card shadow-card p-4 mb-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-micro text-content-subtle uppercase tracking-wide">Next settlement</p>
            <p className="text-micro text-content-subtle">Due {dueDate}</p>
          </div>

          <div className="divide-y divide-line mb-3">
            {recurring.map((r) => (
              <RecipientRow key={r.id} name={r.name} address={r.address} amount={r.amount} cadence={r.frequency ?? 'monthly'} />
            ))}
          </div>

          <div className="flex justify-between text-heading text-content border-t border-line pt-3 mb-3">
            <span>You&apos;ll settle</span>
            <span>${usd(settleTotal)}</span>
          </div>
          {Math.abs(settleTotal - monthlyTarget) > 0.01 && (
            <p className="text-micro text-content-subtle -mt-2 mb-3">
              Your ${usd(monthlyTarget)} goal spreads weekly/biweekly payments into one monthly
              number — settling still pays each person their full amount.
            </p>
          )}

          {/* Token picker */}
          {!tokenLoading && allTokens.length > 1 && (
            <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
              {allTokens.map((t) => (
                <button
                  key={t.key}
                  onClick={() => {
                    setSelectedToken(t)
                    setSettlementTokenKey(t.key)
                  }}
                  className={`px-3 py-1.5 rounded-pill text-caption font-semibold border whitespace-nowrap transition-colors ${
                    selectedToken?.key === t.key
                      ? 'bg-brand text-white border-brand'
                      : 'border-line text-content-muted'
                  }`}
                >
                  {t.symbol} ${usd(t.humanBalance)}
                </button>
              ))}
            </div>
          )}

          {tokenLoading ? (
            <div className="py-1"><SkeletonRow /></div>
          ) : selectedToken && selectedToken.humanBalance >= settleTotal ? (
            <button
              onClick={() => setSettling(true)}
              className="w-full py-3.5 rounded-card font-semibold text-white bg-brand shadow-ring active:scale-[0.99] transition-transform"
            >
              Settle in one tap · {selectedToken.symbol}
            </button>
          ) : selectedToken && selectedToken.humanBalance > 0 ? (
            <div>
              <div className="bg-warning/10 text-warning text-caption rounded-card p-3 mb-2">
                Wallet: ${usd(selectedToken.humanBalance)} {selectedToken.symbol} — need ${usd(settleTotal)}.
              </div>
              <button
                onClick={redirectToDeposit}
                className="w-full py-3.5 rounded-card font-semibold text-white bg-warning active:scale-[0.99] transition-transform"
              >
                Add funds to settle
              </button>
            </div>
          ) : (
            <button
              onClick={redirectToDeposit}
              className="w-full py-3.5 rounded-card font-semibold text-white bg-warning active:scale-[0.99] transition-transform"
            >
              Deposit {selectedToken ? selectedToken.symbol : 'stablecoins'} to settle
            </button>
          )}
        </div>
      )}

      {/* Detected payments — secondary discovery, below the core goal/settle flow */}
      <DetectedPayments
        suggestions={suggestions}
        existingAddresses={recurring.map((r) => r.address)}
        onAdd={handleAddDetected}
      />

      {settling && selectedToken && (
        <SettleSheet
          recurring={recurring}
          token={selectedToken}
          onSuccess={handleSettled}
          onClose={() => setSettling(false)}
        />
      )}

      <BottomNav />

      {showOnboarding && <Onboarding onDone={() => setShowOnboarding(false)} />}
    </main>
  )
}
