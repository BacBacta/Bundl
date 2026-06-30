'use client'

/**
 * M0 spike — proves approve → disperseToken works inside MiniPay.
 * Not part of the production UI. Accessible at /spike.
 *
 * How to use:
 *  1. Deploy contracts: npm run deploy:sepolia
 *  2. Copy addresses to .env (NEXT_PUBLIC_DISPERSE_ADDRESS, NEXT_PUBLIC_MOCK_USD_ADDRESS)
 *  3. Mint tokens to your test wallet: RECIPIENT=0x... npm run mint
 *  4. Fill in RECIPIENTS below with 2 real test addresses.
 *  5. Load this page in MiniPay via Developer Settings → Load Test Page.
 *  6. Tap "Run spike (N recipients)" — watch the log.
 *  7. Record gasUsed per N in the table at the bottom.
 */

import { useState } from 'react'
import { parseUnits } from 'viem'
import { getTokenDecimals, ensureApproval, disperseToken } from '@/lib/disperse'
import { TOKENS, isDeployed } from '@/lib/tokens'
import { getAccount, isMiniPay } from '@/lib/wallet'

// Auto-test: deployer address used as all recipients to verify the contract works
const RECIPIENTS: `0x${string}`[] = [
  '0x807f3DaDF25929ABD47bCaC0AcC120727F997fB7',
  '0x807f3DaDF25929ABD47bCaC0AcC120727F997fB7',
  '0x807f3DaDF25929ABD47bCaC0AcC120727F997fB7',
  '0x807f3DaDF25929ABD47bCaC0AcC120727F997fB7',
  '0x807f3DaDF25929ABD47bCaC0AcC120727F997fB7',
]

// Amounts in whole token units (will be converted with real decimals at runtime)
const AMOUNTS_BY_N: Record<number, number[]> = {
  2:  [1, 2],
  5:  [1, 2, 3, 4, 5],
}

type LogEntry = { ts: string; msg: string; ok: boolean }

export default function SpikePage() {
  const [log, setLog] = useState<LogEntry[]>([])
  const [busy, setBusy] = useState(false)
  const [n, setN] = useState(2)

  function addLog(msg: string, ok = true) {
    const ts = new Date().toISOString().slice(11, 19)
    setLog((prev) => [...prev, { ts, msg, ok }])
  }

  async function runSpike() {
    setBusy(true)
    setLog([])
    try {
      if (!isDeployed()) {
        addLog('Contracts not deployed. Set NEXT_PUBLIC_DISPERSE_ADDRESS in .env', false)
        return
      }

      const account = await getAccount()
      addLog(`Account: ${account ?? 'none'}`, !!account)
      addLog(`MiniPay: ${isMiniPay()}`)

      const token = TOKENS.MOCK_USD
      addLog(`Token: ${token.address}`)

      const decimals = await getTokenDecimals(token.address)
      addLog(`Decimals: ${decimals}`)

      const recipients = RECIPIENTS.slice(0, n)
      const rawAmounts = AMOUNTS_BY_N[n] ?? Array.from({ length: n }, (_, i) => i + 1)
      const amounts = rawAmounts.map((a) => parseUnits(String(a), decimals))
      const total = amounts.reduce((a, b) => a + b, 0n)
      addLog(`Recipients: ${n}, total: ${total} (raw)`)

      const t0 = Date.now()
      const approveTx = await ensureApproval(token.address, total)
      if (approveTx) {
        addLog(`approve tx: ${approveTx}`)
      } else {
        addLog('allowance ok — skipping approve (1-tap path)')
      }

      addLog('Calling disperseToken…')
      const disperseTx = await disperseToken(token.address, recipients, amounts)
      const elapsed = Date.now() - t0
      addLog(`disperseToken tx: ${disperseTx}`)
      addLog(`Done in ${elapsed}ms ✓`)
    } catch (e: unknown) {
      addLog(`Error: ${e instanceof Error ? e.message : String(e)}`, false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex flex-col min-h-screen px-4 pt-6 pb-10">
      <h1 className="text-xl font-bold mb-1">M0 spike</h1>
      <p className="text-sm text-gray-500 mb-5">approve → disperseToken — run inside MiniPay</p>

      {/* N selector */}
      <div className="flex gap-2 mb-4">
        {[2, 5].map((v) => (
          <button
            key={v}
            onClick={() => setN(v)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
              n === v
                ? 'bg-brand text-white border-brand'
                : 'border-gray-200 text-gray-600'
            }`}
          >
            {v} recipients
          </button>
        ))}
      </div>

      <button
        onClick={runSpike}
        disabled={busy}
        className="w-full py-4 rounded-xl font-semibold text-white bg-brand disabled:opacity-40 active:opacity-80 transition-opacity mb-5"
      >
        {busy ? 'Running…' : `Run spike (${n} recipients)`}
      </button>

      {/* Log */}
      {log.length > 0 && (
        <div className="bg-gray-950 rounded-xl p-3 font-mono text-xs space-y-1 mb-6">
          {log.map((entry, i) => (
            <div key={i} className={entry.ok ? 'text-green-400' : 'text-red-400'}>
              <span className="opacity-50">{entry.ts} </span>
              {entry.msg}
            </div>
          ))}
        </div>
      )}

      {/* Gas measurement table */}
      <div className="border border-gray-200 rounded-2xl p-4">
        <p className="text-sm font-semibold mb-3">Gas log (fill in after each run)</p>
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="text-xs text-gray-400 border-b border-gray-100">
              <th className="pb-2">N</th>
              <th className="pb-2">gasUsed</th>
              <th className="pb-2">Txs</th>
            </tr>
          </thead>
          <tbody className="text-gray-600">
            {[2, 5, 10, 20].map((v) => (
              <tr key={v} className="border-b border-gray-50 last:border-0">
                <td className="py-1.5">{v}</td>
                <td className="py-1.5 text-gray-400">—</td>
                <td className="py-1.5 text-gray-400">—</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-gray-400 mt-3">
          Record gasUsed from the block explorer after each run.
        </p>
      </div>
    </main>
  )
}
