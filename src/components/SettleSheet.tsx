'use client'

import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { isAddress, parseUnits, zeroAddress } from 'viem'
import { Confetti } from './Confetti'
import { Check, ChevronRight, Loader2, ExternalLink, X, AlertTriangle } from 'lucide-react'
import { getTokenDecimals, ensureApproval, submitDisperse, waitForTx, getFeeBps } from '@/lib/disperse'
import type { StablecoinBalance } from '@/lib/stablecoin'
import { redirectToDeposit } from '@/lib/stablecoin'
import { DEEPLINKS } from '@/lib/tokens'
import type { Recurring, Bundle } from '@/lib/storage'
import { getSpendLimit } from '@/lib/storage'
import { usd, round2 } from '@/lib/format'
import { ACTIVE_CHAIN } from '@/lib/chains'
import { getAccount } from '@/lib/wallet'
import { checkProStatus, FREE_TIER_MAX_RECIPIENTS } from '@/lib/pro'
import { RecipientRow } from './RecipientRow'

const EXPLORER = ACTIVE_CHAIN.blockExplorers?.default.url ?? 'https://celo-sepolia.blockscout.com'

// A settlement whose receipt-wait timed out may still confirm on-chain. Its
// hash is kept here so Retry resumes waiting instead of paying a second time.
const PENDING_TX_KEY = 'bundl_pending_settlement'

type Step = 'confirm' | 'settling' | 'done' | 'error'

interface Props {
  recurring: Recurring[]
  token: StablecoinBalance
  onSuccess: (bundle: Bundle) => void
  onClose: () => void
}

export function SettleSheet({ recurring, token, onSuccess, onClose }: Props) {
  const [step, setStep] = useState<Step>('confirm')
  const [log, setLog] = useState<string[]>([])
  const [txHash, setTxHash] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [feeBps, setFeeBps] = useState(0)

  useEffect(() => {
    getFeeBps().then(setFeeBps)
  }, [])

  const total = round2(recurring.reduce((s, r) => s + round2(r.amount), 0))
  const serviceFee = round2((total * feeBps) / 10_000)
  const grandTotal = round2(total + serviceFee)
  const spendLimit = getSpendLimit()
  const overLimit = spendLimit != null && grandTotal > spendLimit

  function addLog(msg: string) {
    setLog((prev) => [...prev, msg])
  }

  function friendlyError(e: unknown): string {
    const msg = e instanceof Error ? e.message : String(e)
    if (/user rejected|denied|cancel/i.test(msg)) return 'Transaction cancelled.'
    if (/transfer amount exceeds balance|insufficient token balance|exceeds balance/i.test(msg))
      return `Not enough ${token.symbol} to cover this settlement. Add funds and try again.`
    if (/insufficient funds|insufficient.*fee|out of gas|gasrequired|fee.*exceeds/i.test(msg))
      return 'Not enough balance to cover the network fee. Add funds and try again.'
    if (/allowance|erc20.*approv/i.test(msg)) return 'Approval failed. Please try again.'
    if (/enforcedpause|paused/i.test(msg)) return 'Settlements are temporarily paused for maintenance. Try again later.'
    if (/timed?.?out|network.*(error|request)|failed to fetch|connection/i.test(msg))
      return 'Network timeout — your payment may still be processing. Retry will check before paying again.'
    if (/nonce/i.test(msg)) return 'A previous transaction is still pending. Wait a moment and retry.'
    if (/revert/i.test(msg)) return 'The transaction was rejected on-chain. Nothing was sent — check the recipients and retry.'
    return 'Transaction failed. Nothing was sent. Please try again.'
  }

  function readPendingTx(): `0x${string}` | null {
    try {
      const raw = localStorage.getItem(PENDING_TX_KEY)
      if (!raw) return null
      const p = JSON.parse(raw) as { hash: `0x${string}`; at: number }
      // Stale after 30 min — a Celo tx confirms or drops long before that.
      if (Date.now() - p.at > 30 * 60_000) return null
      return p.hash
    } catch {
      return null
    }
  }

  function finishSettle(hash: `0x${string}`) {
    try { localStorage.removeItem(PENDING_TX_KEY) } catch {}
    try { navigator.vibrate?.([30, 40, 80]) } catch {}
    setTxHash(hash)
    addLog('Settled')
    const bundle: Bundle = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      total,
      txHash: hash,
      lines: recurring.map((r) => ({ name: r.name, address: r.address, amount: r.amount })),
    }
    onSuccess(bundle)
    setStep('done')
  }

  async function settle() {
    if (submitting) return
    if (token.humanBalance < grandTotal) {
      redirectToDeposit()
      return
    }

    const badRecipient = recurring.find((r) => !isAddress(r.address) || r.address === zeroAddress)
    if (badRecipient) {
      setErrorMsg(`"${badRecipient.name}" has an invalid address. Fix it in your payment list before settling.`)
      setStep('error')
      return
    }

    setSubmitting(true)
    setStep('settling')
    try {
      // Free-tier gate enforced where it matters — at payment time, against
      // the on-chain Pro payment record, not just a greyed-out Add button.
      if (recurring.length > FREE_TIER_MAX_RECIPIENTS) {
        const addr = await getAccount()
        const pro = addr ? await checkProStatus(addr) : false
        if (!pro) {
          setErrorMsg(
            `The free plan settles up to ${FREE_TIER_MAX_RECIPIENTS} recipients. Upgrade to Pro in Settings to pay everyone at once.`,
          )
          setStep('error')
          setSubmitting(false)
          return
        }
      }
      // A previous attempt may have gone through while its confirmation timed
      // out — resume waiting on it instead of paying twice.
      const pending = readPendingTx()
      if (pending) {
        addLog('Checking a previous attempt')
        try {
          await waitForTx(pending)
          finishSettle(pending)
          return
        } catch {
          try { localStorage.removeItem(PENDING_TX_KEY) } catch {}
        }
      }

      const decimals = await getTokenDecimals(token.address)
      const allRecipients = recurring.map((r) => r.address)
      const allAmounts = recurring.map((r) => parseUnits(round2(r.amount).toFixed(2), decimals))
      // The contract charges the protocol fee on top — approve for it too.
      const totalAmount = allAmounts.reduce((a, b) => a + b, 0n)
      const approvalAmount = totalAmount + (totalAmount * BigInt(feeBps)) / 10_000n

      addLog(`Using ${token.symbol}`)
      addLog('Checking allowance')
      const approveTx = await ensureApproval(token.address, approvalAmount)
      addLog(approveTx ? 'Approved' : 'Allowance ready · one-tap path')

      addLog(`Sending to ${recurring.length} recipients`)
      const hash = await submitDisperse(token.address, allRecipients, allAmounts)
      try { localStorage.setItem(PENDING_TX_KEY, JSON.stringify({ hash, at: Date.now() })) } catch {}
      await waitForTx(hash)
      finishSettle(hash)
    } catch (e) {
      setErrorMsg(friendlyError(e))
      setStep('error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={step === 'confirm' ? onClose : undefined}
      />
      <div
        className="relative bg-surface-raised rounded-t-sheet px-5 pt-3 pb-9 shadow-sheet animate-sheet-up"
        style={{ paddingBottom: 'calc(2.25rem + env(safe-area-inset-bottom))' }}
      >
        <div className="w-10 h-1 rounded-full bg-line mx-auto mb-4" />

        {/* Confirm */}
        {step === 'confirm' && (
          <>
            <h2 className="text-title text-content mb-0.5">Settle bundle</h2>
            <p className="text-caption text-content-subtle mb-4">
              One transaction pays everyone at once.
            </p>

            <div className="bg-surface-sunken rounded-card px-4 divide-y divide-line mb-3">
              {recurring.map((r) => (
                <RecipientRow key={r.id} name={r.name} address={r.address} amount={r.amount} />
              ))}
            </div>

            <div className="px-1 space-y-1.5 mb-4">
              {serviceFee > 0 && (
                <div className="flex justify-between text-caption text-content-subtle">
                  <span>Service fee ({(feeBps / 100).toFixed(1)}%)</span>
                  <span>${usd(serviceFee)}</span>
                </div>
              )}
              <div className="flex justify-between text-heading text-content">
                <span>Total</span>
                <span>${usd(grandTotal)} {token.symbol}</span>
              </div>
              <div className="flex justify-between text-caption">
                <span className="text-content-subtle">Your {token.symbol} balance</span>
                <span className={token.humanBalance < grandTotal ? 'text-danger font-medium' : 'text-content-muted'}>
                  ${usd(token.humanBalance)}
                </span>
              </div>
            </div>

            {token.humanBalance < grandTotal && (
              <div className="bg-warning/10 text-warning text-caption rounded-card p-3 mb-4">
                Insufficient balance — tap below to top up.
              </div>
            )}

            {overLimit && (
              <div className="flex items-start gap-2 bg-warning/10 text-warning text-caption rounded-card p-3 mb-4">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                <span>This settlement (${usd(grandTotal)}) is above your ${usd(spendLimit!)} spending limit.</span>
              </div>
            )}

            <button
              onClick={settle}
              disabled={submitting}
              className="w-full py-4 rounded-card font-semibold text-white bg-brand shadow-ring disabled:opacity-50 active:scale-[0.99] transition-transform"
            >
              {submitting ? 'Processing…' : `Confirm · $${usd(grandTotal)}`}
            </button>
            <button onClick={onClose} className="w-full py-3 text-caption text-content-subtle mt-1">
              Cancel
            </button>
          </>
        )}

        {/* Settling */}
        {step === 'settling' && (
          <div className="py-2">
            <div className="flex items-center gap-2 mb-5">
              <Loader2 size={20} className="text-brand animate-spin" />
              <h2 className="text-title text-content">Settling</h2>
            </div>
            <div className="space-y-3">
              {log.map((l, i) => (
                <div key={i} className="flex items-center gap-2.5 text-body">
                  <Check size={16} className="text-success shrink-0" />
                  <span className="text-content-muted">{l}</span>
                </div>
              ))}
              <div className="flex items-center gap-2.5 text-body text-content-subtle">
                <Loader2 size={16} className="animate-spin shrink-0" />
                <span>Waiting for confirmation…</span>
              </div>
            </div>
          </div>
        )}

        {/* Done — the emotional peak of the app: celebrate it */}
        {step === 'done' && (
          <div className="text-center pt-2 relative">
            <Confetti />
            <motion.div
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 380, damping: 18 }}
              className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-4"
            >
              <Check size={32} className="text-success" strokeWidth={2.5} />
            </motion.div>
            <h2 className="text-title text-content mb-1">Bundle settled</h2>
            <p className="text-caption text-content-subtle mb-5">
              ${usd(total)} sent to {recurring.length} recipient{recurring.length !== 1 ? 's' : ''}
            </p>

            <a
              href={DEEPLINKS.receipt(txHash)}
              className="flex items-center justify-center gap-2 w-full py-4 rounded-card font-semibold text-white bg-brand shadow-ring"
            >
              View receipt in MiniPay <ChevronRight size={18} />
            </a>
            <a
              href={`${EXPLORER}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 w-full py-3 text-caption text-content-subtle mt-1"
            >
              View on explorer <ExternalLink size={13} />
            </a>
            <button onClick={onClose} className="w-full py-2 text-caption text-content-subtle">
              Close
            </button>
          </div>
        )}

        {/* Error */}
        {step === 'error' && (
          <div className="pt-2">
            <div className="w-16 h-16 rounded-full bg-danger/15 flex items-center justify-center mx-auto mb-4">
              <X size={32} className="text-danger" strokeWidth={2.5} />
            </div>
            <h2 className="text-title text-content text-center mb-2">Something went wrong</h2>
            <p className="text-body text-content-muted text-center mb-6">{errorMsg}</p>
            <button
              onClick={() => { setLog([]); setStep('confirm') }}
              className="w-full py-4 rounded-card font-semibold text-white bg-brand shadow-ring active:scale-[0.99] transition-transform"
            >
              Retry
            </button>
            <button onClick={onClose} className="w-full py-3 text-caption text-content-subtle mt-1">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
