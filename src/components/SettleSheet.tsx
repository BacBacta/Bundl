'use client'

import { useState } from 'react'
import { parseUnits } from 'viem'
import { getTokenDecimals, ensureApproval, disperseToken } from '@/lib/disperse'
import type { StablecoinBalance } from '@/lib/stablecoin'
import { redirectToDeposit } from '@/lib/stablecoin'
import { DEEPLINKS, FEE_RECIPIENT, SERVICE_FEE_USD } from '@/lib/tokens'
import type { Recurring, Bundle } from '@/lib/storage'

const FEE_ENABLED =
  FEE_RECIPIENT !== '0x0000000000000000000000000000000000000000'

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

  const total = recurring.reduce((s, r) => s + r.amount, 0)

  function addLog(msg: string) {
    setLog((prev) => [...prev, msg])
  }

  async function settle() {
    // Guard: redirect to deposit if balance is insufficient
    if (token.humanBalance < total) {
      redirectToDeposit()
      return
    }

    setStep('settling')
    try {
      const decimals = await getTokenDecimals(token.address)

      const allRecipients = [...recurring.map((r) => r.address)]
      const allAmounts = [...recurring.map((r) => parseUnits(r.amount.toString(), decimals))]

      // Append service fee as extra recipient (non-custodial — goes direct to treasury)
      if (FEE_ENABLED) {
        allRecipients.push(FEE_RECIPIENT)
        allAmounts.push(parseUnits(SERVICE_FEE_USD.toString(), decimals))
      }

      const totalAmount = allAmounts.reduce((a, b) => a + b, 0n)

      addLog(`Token: ${token.symbol}`)
      addLog('Checking allowance…')
      const approveTx = await ensureApproval(token.address, totalAmount)
      if (approveTx) {
        addLog('Approved ✓')
      } else {
        addLog('Allowance ok, 1-tap path ✓')
      }

      addLog(`Sending to ${recurring.length} recipients…`)
      const hash = await disperseToken(token.address, allRecipients, allAmounts)
      setTxHash(hash)
      addLog('Settled ✓')

      const bundle: Bundle = {
        id: Date.now().toString(),
        date: new Date().toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        total,
        txHash: hash,
        lines: recurring.map((r) => ({
          name: r.name,
          address: r.address,
          amount: r.amount,
        })),
      }

      onSuccess(bundle)
      setStep('done')
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e))
      setStep('error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={step === 'confirm' ? onClose : undefined} />
      <div className="relative bg-white rounded-t-3xl px-5 pt-5 pb-10">

        {/* Confirm */}
        {step === 'confirm' && (
          <>
            <h2 className="text-lg font-bold mb-1">Settle bundle</h2>
            <p className="text-sm text-gray-400 mb-4">
              One transaction will fan out to all recipients.
            </p>

            <div className="space-y-2 mb-4">
              {recurring.map((r) => (
                <div key={r.id} className="flex justify-between text-sm">
                  <span className="text-gray-700">{r.name}</span>
                  <span className="font-medium">${r.amount}</span>
                </div>
              ))}
            </div>

            {FEE_ENABLED && (
              <div className="flex justify-between text-xs text-gray-400 border-t border-gray-100 pt-3 mb-1">
                <span>Service fee</span>
                <span>${SERVICE_FEE_USD.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-sm pt-1 mb-2">
              <span>Total</span>
              <span>${(total + (FEE_ENABLED ? SERVICE_FEE_USD : 0)).toFixed(2)} {token.symbol}</span>
            </div>

            <div className="flex justify-between text-xs text-gray-400 mb-4">
              <span>Your {token.symbol} balance</span>
              <span className={token.humanBalance < total ? 'text-red-500' : 'text-gray-400'}>
                ${token.humanBalance.toFixed(2)}
              </span>
            </div>

            {token.humanBalance < total && (
              <div className="bg-amber-50 text-amber-700 text-xs rounded-xl p-3 mb-4">
                Insufficient balance. Tap below to deposit more.
              </div>
            )}

            <button
              onClick={settle}
              className="w-full py-4 rounded-xl font-semibold text-white bg-[#0F6E56] active:opacity-80"
            >
              Confirm — settle ${total}
            </button>
            <button
              onClick={onClose}
              className="w-full py-3 text-sm text-gray-400 mt-2"
            >
              Cancel
            </button>
          </>
        )}

        {/* Settling */}
        {step === 'settling' && (
          <>
            <h2 className="text-lg font-bold mb-4">Settling…</h2>
            <div className="bg-gray-950 rounded-xl p-3 font-mono text-xs text-green-400 space-y-1 min-h-[80px]">
              {log.map((l, i) => <div key={i}>{l}</div>)}
              <span className="animate-pulse">▋</span>
            </div>
          </>
        )}

        {/* Done */}
        {step === 'done' && (
          <>
            <div className="text-center py-4">
              <div className="text-5xl mb-3">✅</div>
              <h2 className="text-xl font-bold mb-1">Bundle settled</h2>
              <p className="text-sm text-gray-400 mb-4">
                ${total} sent to {recurring.length} recipients
              </p>
              <a
                href={`https://celo-sepolia.blockscout.com/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-400 font-mono"
              >
                {txHash.slice(0, 10)}…{txHash.slice(-6)} ↗
              </a>
            </div>

            {/* Native MiniPay receipt — primary CTA */}
            <a
              href={DEEPLINKS.receipt(txHash)}
              className="block w-full py-4 rounded-xl font-semibold text-white bg-[#0F6E56] text-center mt-4"
            >
              View receipt in MiniPay
            </a>
            <button
              onClick={onClose}
              className="w-full py-3 text-sm text-gray-400"
            >
              Close
            </button>
          </>
        )}

        {/* Error */}
        {step === 'error' && (
          <>
            <h2 className="text-lg font-bold mb-3">Something went wrong</h2>
            <p className="text-xs text-red-500 bg-red-50 rounded-xl p-3 font-mono mb-5 break-all">
              {errorMsg}
            </p>
            <button
              onClick={onClose}
              className="w-full py-4 rounded-xl font-semibold border border-gray-200 text-gray-700"
            >
              Close
            </button>
          </>
        )}
      </div>
    </div>
  )
}
