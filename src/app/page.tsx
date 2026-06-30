'use client'

import { useEffect, useState } from 'react'
import { BottomNav } from '@/components/BottomNav'
import { AppFooter } from '@/components/AppFooter'
import { SettleSheet } from '@/components/SettleSheet'
import { ReminderBanner } from '@/components/ReminderBanner'
import { getAccount, isMiniPay } from '@/lib/wallet'
import { getPreferredStablecoin, redirectToDeposit, type StablecoinBalance } from '@/lib/stablecoin'
import {
  type Recurring,
  type Bundle,
  getRecurring,
  getPotBalance,
  getStreak,
  addDeposit,
  depositedToday,
  addBundle,
} from '@/lib/storage'

export default function Home() {
  const [account, setAccount] = useState<string | null>(null)
  const [inMiniPay, setInMiniPay] = useState(false)
  const [recurring, setRecurring] = useState<Recurring[]>([])
  const [potBalance, setPotBalance] = useState(0)
  const [todayDone, setTodayDone] = useState(false)
  const [streak, setStreak] = useState(0)
  const [settling, setSettling] = useState(false)
  const [preferredToken, setPreferredToken] = useState<StablecoinBalance | null>(null)
  const [tokenLoading, setTokenLoading] = useState(false)

  useEffect(() => {
    setInMiniPay(isMiniPay())
    setRecurring(getRecurring())
    setPotBalance(getPotBalance())
    setTodayDone(depositedToday())
    setStreak(getStreak())

    getAccount().then((addr) => {
      setAccount(addr)
      if (addr) {
        setTokenLoading(true)
        getPreferredStablecoin(addr)
          .then(setPreferredToken)
          .finally(() => setTokenLoading(false))
      }
    })
  }, [])

  const monthlyTarget = recurring.reduce((s, r) => s + r.amount, 0)
  const dailyAmount = monthlyTarget > 0 ? Math.max(1, Math.round((monthlyTarget / 30) * 100) / 100) : 5
  const potPercent = monthlyTarget > 0 ? Math.min(100, Math.round((potBalance / monthlyTarget) * 100)) : 0
  const potFull = monthlyTarget > 0 && potBalance >= monthlyTarget
  const remaining = Math.max(0, +(monthlyTarget - potBalance).toFixed(2))

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
    <main className="flex flex-col min-h-screen pb-20 px-4 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Bundl</h1>
        {account ? (
          <span className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-1 rounded-lg">
            {account.slice(0, 6)}…{account.slice(-4)}
          </span>
        ) : (
          !inMiniPay && (
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
              Not in MiniPay
            </span>
          )
        )}
      </div>

      {/* Reminder banner */}
      <ReminderBanner
        potBalance={potBalance}
        monthlyTarget={monthlyTarget}
        dailyAmount={dailyAmount}
        todayDone={todayDone}
        daysUntilSettlement={daysUntilSettlement}
      />

      {/* Empty state */}
      {recurring.length === 0 && (
        <div className="border border-dashed border-gray-200 rounded-2xl p-5 mb-4 text-center text-gray-400">
          <p className="text-sm">No recurring payments set up yet.</p>
          <a href="/recurring" className="text-sm text-[#0F6E56] font-medium mt-1 block">
            Add your first payment →
          </a>
        </div>
      )}

      {/* Pot card */}
      <div className="bg-[#0F6E56] rounded-2xl p-5 text-white mb-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-sm opacity-75 mb-1">Monthly pot</p>
            <p className="text-4xl font-bold">
              ${potBalance}
              {monthlyTarget > 0 && (
                <span className="text-lg font-normal opacity-60"> / ${monthlyTarget}</span>
              )}
            </p>
          </div>
          <div className="text-right">
            <span className="text-3xl select-none">🪴</span>
            {streak > 0 && (
              <p className="text-xs mt-1 opacity-75">🔥 {streak} day{streak > 1 ? 's' : ''}</p>
            )}
          </div>
        </div>
        {monthlyTarget > 0 && (
          <>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden mb-1">
              <div
                className="h-full bg-white rounded-full transition-all duration-700"
                style={{ width: `${potPercent}%` }}
              />
            </div>
            <div className="flex justify-between items-center">
              <p className="text-xs opacity-60">{potPercent}% of monthly target</p>
              {preferredToken && (
                <p className="text-xs opacity-60">
                  Wallet: ${preferredToken.humanBalance.toFixed(2)} {preferredToken.symbol}
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Add to pot */}
      <button
        onClick={handleAddToPot}
        disabled={todayDone || potFull || monthlyTarget === 0}
        className="w-full py-4 rounded-xl font-semibold text-white bg-[#0F6E56] disabled:opacity-40 active:opacity-80 transition-opacity mb-3"
      >
        {todayDone
          ? 'Added today ✓'
          : potFull
          ? 'Pot is full'
          : monthlyTarget === 0
          ? 'Add recurring payments first'
          : `Add $${dailyAmount} to pot today`}
      </button>

      {/* Next settlement */}
      {recurring.length > 0 && (
        <div className="border border-gray-200 rounded-2xl p-4 mb-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Next settlement</p>

          {recurring.map((r) => (
            <div key={r.id} className="flex justify-between py-1 text-sm">
              <span className="text-gray-700">{r.name}</span>
              <span className="font-medium">${r.amount}</span>
            </div>
          ))}

          <div className="border-t border-gray-100 mt-2 pt-2 flex justify-between text-sm font-semibold mb-1">
            <span>Total</span>
            <span>${monthlyTarget}</span>
          </div>
          <p className="text-xs text-gray-400 mb-3">Due {dueDate}</p>

          {potFull ? (
            preferredToken ? (
              <button
                onClick={() => setSettling(true)}
                className="w-full py-3 rounded-xl font-semibold text-white bg-[#0F6E56] active:opacity-80"
              >
                Settle in one tap · {preferredToken.symbol}
              </button>
            ) : tokenLoading ? (
              <button disabled className="w-full py-3 rounded-xl font-semibold text-white bg-[#0F6E56] opacity-40">
                Checking balance…
              </button>
            ) : (
              <button
                onClick={redirectToDeposit}
                className="w-full py-3 rounded-xl font-semibold text-white bg-amber-500 active:opacity-80"
              >
                Deposit to settle
              </button>
            )
          ) : (
            <button
              disabled
              className="w-full py-3 rounded-xl font-semibold text-white bg-[#0F6E56] opacity-40 cursor-not-allowed"
            >
              Add ${remaining} more to unlock
            </button>
          )}
        </div>
      )}

      {settling && preferredToken && (
        <SettleSheet
          recurring={recurring}
          token={preferredToken}
          onSuccess={handleSettled}
          onClose={() => setSettling(false)}
        />
      )}

      <AppFooter />
      <BottomNav />
    </main>
  )
}
