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
import { CountUp } from '@/components/CountUp'

// Lazy — pulls the animation lib only when the intro actually shows.
const Onboarding = dynamic(() => import('@/components/Onboarding').then((m) => m.Onboarding), {
  ssr: false,
  // Full-surface placeholder: on slow connections the home screen must not
  // flash underneath before the intro takes over.
  loading: () => <div className="fixed inset-0 z-50 bg-surface" />,
})
import { getAccount, isMiniPay } from '@/lib/wallet'
import { usd, round2 } from '@/lib/format'
import { getAllStablecoinBalances, redirectToDeposit, type StablecoinBalance } from '@/lib/stablecoin'
import { detectRecurringPayments, MOCK_SUGGESTIONS, type DetectedPayment } from '@/lib/activity'
import { cacheName } from '@/lib/socialconnect'
import { fetchIncomingTransfers } from '@/lib/onchainHistory'
import {
  unreadCount as getUnreadCount,
  notifyStreakMilestone,
  notifyGoalReached,
  notifyBundleSettled,
  notifyPaymentsReceived,
  getIncomingCheckpoint,
  setIncomingCheckpoint,
} from '@/lib/notifications'
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
  const [unreadCount, setUnreadCount] = useState(0)
  const [autoPrompted, setAutoPrompted] = useState(false)

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

      // Notifications: check for incoming payments since the last visit. On
      // the very first check ever, seed the checkpoint to now instead of
      // treating the user's entire prior history as "new".
      const checkpoint = getIncomingCheckpoint()
      const checkFrom = checkpoint || Date.now()
      fetchIncomingTransfers(addr as `0x${string}`, checkFrom).then((incoming) => {
        if (checkpoint && incoming.length > 0) {
          notifyPaymentsReceived(incoming.length, incoming.reduce((s, t) => s + t.amount, 0))
        }
        setIncomingCheckpoint(Date.now())
        setUnreadCount(getUnreadCount())
      })
    })

    setUnreadCount(getUnreadCount())
  }, [])

  // Monthly savings target normalises each payment by its frequency…
  const monthlyTarget = round2(recurring.reduce((s, r) => s + round2(monthlyEquivalent(r)), 0))
  // …while a settlement pays each recipient their face amount once.
  const settleTotal = round2(recurring.reduce((s, r) => s + round2(r.amount), 0))
  const dailyAmount = monthlyTarget > 0 ? Math.max(0.01, round2(monthlyTarget / 30)) : 5
  const potPercent = monthlyTarget > 0 ? Math.min(100, Math.round((potBalance / monthlyTarget) * 100)) : 0
  const potFull = monthlyTarget > 0 && potBalance >= monthlyTarget

  useEffect(() => {
    if (streak > 0) {
      notifyStreakMilestone(streak)
      setUnreadCount(getUnreadCount())
    }
  }, [streak])

  useEffect(() => {
    notifyGoalReached(potFull)
    setUnreadCount(getUnreadCount())
    if (!potFull) setAutoPrompted(false)
  }, [potFull])

  // "Auto-settle": the moment the goal is reached AND the wallet already has
  // enough balance, proactively open the confirm sheet instead of waiting for
  // the user to notice and scroll down. This never signs anything — MiniPay
  // still requires the user's own tap to confirm the transaction; it just
  // removes the step of finding the button.
  useEffect(() => {
    if (potFull && selectedToken && selectedToken.humanBalance >= settleTotal && !settling && !autoPrompted) {
      setAutoPrompted(true)
      setSettling(true)
    }
  }, [potFull, selectedToken, settleTotal, settling, autoPrompted])

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
    notifyBundleSettled(bundle.lines.length, bundle.total)
    setUnreadCount(getUnreadCount())
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
      <Header account={account} inMiniPay={inMiniPay} unreadCount={unreadCount} />

      {/* Goal hero — the primary thing on this screen, clean fintech style */}
      <section className="mt-1 mb-7 px-1">
        <div className="flex items-center justify-between mb-2">
          <p className="flex items-center gap-1.5 text-caption text-content-muted font-medium">
            Savings goal
            {selectedToken && (
              <span className="text-micro font-semibold text-content-subtle bg-surface-sunken rounded-pill px-2 py-0.5">
                {selectedToken.symbol}
              </span>
            )}
          </p>
          {streak > 0 && (
            <span className="inline-flex items-center gap-1 bg-brand/10 text-brand rounded-pill px-2.5 py-1 text-micro font-semibold">
              <Flame size={12} /> {streak} day{streak > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-2">
          <p className="text-hero text-content"><CountUp value={potBalance} /></p>
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
