'use client'

import { useState } from 'react'
import { parseUnits } from 'viem'
import { Check, ChevronRight, Loader2, ExternalLink, X } from 'lucide-react'
import { getTokenDecimals, ensureApproval, disperseToken } from '@/lib/disperse'
import type { StablecoinBalance } from '@/lib/stablecoin'
import { redirectToDeposit } from '@/lib/stablecoin'
import { DEEPLINKS, FEE_RECIPIENT, SERVICE_FEE_USD } from '@/lib/tokens'
import type { Recurring, Bundle } from '@/lib/storage'
import { usd, round2 } from '@/lib/format'
import { ACTIVE_CHAIN } from '@/lib/chains'
import { RecipientRow } from './RecipientRow'

const FEE_ENABLED = FEE_RECIPIENT !== '0x0000000000000000000000000000000000000000'
const EXPLORER = ACTIVE_CHAIN.blockExplorers?.default.url ?? 'https://celo-sepolia.blockscout.com'

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

  const total = round2(recurring.reduce((s, r) => s + r.amount, 0))
  const grandTotal = round2(total + (FEE_ENABLED ? SERVICE_FEE_USD : 0))

  function addLog(msg: string) {
    setLog((prev) => [...prev, msg])
  }

  function friendlyError(e: unknown): string {
    const msg = e instanceof Error ? e.message : String(e)
    if (/user rejected|denied|cancel/i.test(msg)) return 'Transaction cancelled.'
    if (/insufficient.*fee|gas/i.test(msg)) return 'Not enough balance to cover the network fee. Add funds and try again.'
    if (/allowance|approve/i.test(msg)) return 'Approval failed. Please try again.'
    if (/timeout|network|fetch/i.test(msg)) return 'Network timeout. Check your connection and retry.'
    if (/revert/i.test(msg)) return 'Transaction reverted — a recipient address may be invalid.'
    return 'Transaction failed. Please try again.'
  }

  async function settle() {
    if (submitting) return
    if (token.humanBalance < total) {
      redirectToDeposit()
      return
    }

    setSubmitting(true)
    setStep('settling')
    try {
      const decimals = await getTokenDecimals(token.address)

      const allRecipients = [...recurring.map((r) => r.address)]
      const allAmounts = [...recurring.map((r) => parseUnits(r.amount.toString(), decimals))]

      if (FEE_ENABLED) {
        allRecipients.push(FEE_RECIPIENT)
        allAmounts.push(parseUnits(SERVICE_FEE_USD.toString(), decimals))
      }

      const totalAmount = allAmounts.reduce((a, b) => a + b, 0n)

      addLog(`Using ${token.symbol}`)
      addLog('Checking allowance')
      const approveTx = await ensureApproval(token.address, totalAmount)
      addLog(approveTx ? 'Approved' : 'Allowance ready · one-tap path')

      addLog(`Sending to ${recurring.length} recipients`)
      const hash = await disperseToken(token.address, allRecipients, allAmounts)
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
              {FEE_ENABLED && (
                <div className="flex justify-between text-caption text-content-subtle">
                  <span>Service fee</span>
                  <span>${usd(SERVICE_FEE_USD)}</span>
                </div>
              )}
              <div className="flex justify-between text-heading text-content">
                <span>Total</span>
                <span>${usd(grandTotal)} {token.symbol}</span>
              </div>
              <div className="flex justify-between text-caption">
                <span className="text-content-subtle">Your {token.symbol} balance</span>
                <span className={token.humanBalance < total ? 'text-danger font-medium' : 'text-content-muted'}>
                  ${usd(token.humanBalance)}
                </span>
              </div>
            </div>

            {token.humanBalance < total && (
              <div className="bg-warning/10 text-warning text-caption rounded-card p-3 mb-4">
                Insufficient balance — tap below to top up.
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

        {/* Done */}
        {step === 'done' && (
          <div className="text-center pt-2">
            <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="text-success" strokeWidth={2.5} />
            </div>
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
