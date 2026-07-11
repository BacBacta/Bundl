'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { parseUnits } from 'viem'
import { Check, X, Loader2, ChevronRight, ExternalLink, Smartphone, Repeat } from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import { decodeRequest, type PaymentRequest } from '@/lib/paymentRequest'
import { getTokenDecimals, transferToken } from '@/lib/disperse'
import { getPreferredStablecoin, redirectToDeposit, type StablecoinBalance } from '@/lib/stablecoin'
import { getAccount } from '@/lib/wallet'
import { getCachedName, resolveDisplayName } from '@/lib/socialconnect'
import { DEEPLINKS } from '@/lib/tokens'
import { ACTIVE_CHAIN } from '@/lib/chains'
import { usd } from '@/lib/format'
import { addPayment, addRecurring, getRecurring } from '@/lib/storage'
import { notifyPaymentSent } from '@/lib/notifications'

const EXPLORER = ACTIVE_CHAIN.blockExplorers?.default.url ?? 'https://celo-sepolia.blockscout.com'
type State = 'loading' | 'invalid' | 'ready' | 'paying' | 'done' | 'error'

export default function PayPage() {
  const router = useRouter()
  const [state, setState] = useState<State>('loading')
  const [req, setReq] = useState<PaymentRequest | null>(null)
  const [token, setToken] = useState<StablecoinBalance | null>(null)
  const [account, setAccount] = useState<string | null>(null)
  const [checked, setChecked] = useState(false) // finished probing wallet + balance
  const [payUrl, setPayUrl] = useState('')
  const [txHash, setTxHash] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [alreadyRecurring, setAlreadyRecurring] = useState(false)
  const [savedRecurring, setSavedRecurring] = useState(false)

  useEffect(() => {
    setPayUrl(window.location.href)
    const code = new URLSearchParams(window.location.search).get('r')
    const decoded = code ? decodeRequest(code) : null
    if (!decoded) {
      setState('invalid')
      return
    }
    setReq(decoded)
    setState('ready')
    getAccount()
      .then(async (addr) => {
        setAccount(addr)
        if (addr) setToken(await getPreferredStablecoin(addr as `0x${string}`))
      })
      // A wallet/RPC hiccup must not leave the button on "Connecting…" forever;
      // checked flips regardless and the no-token path redirects to deposit.
      .catch(() => {})
      .finally(() => setChecked(true))
  }, [])

  // Prefer what we already know locally (contact cache, Recurring list) over
  // the name embedded in the link itself, which the requester chose and
  // could be stale or wrong; only fall back to a raw address as a last resort.
  const payeeName = req ? getCachedName(req.to) || req.name || resolveDisplayName(req.to) : ''
  const enough = token && req ? token.humanBalance >= req.amount : false

  function friendlyError(e: unknown): string {
    const msg = e instanceof Error ? e.message : String(e)
    if (/user rejected|denied|cancel/i.test(msg)) return 'Payment cancelled.'
    if (/transfer amount exceeds balance|exceeds balance/i.test(msg)) return 'Not enough balance for this payment. Add funds and try again.'
    if (/insufficient funds|insufficient.*fee|out of gas|fee.*exceeds/i.test(msg)) return 'Not enough balance to cover the network fee. Add funds and try again.'
    if (/timed?.?out|network.*(error|request)|failed to fetch|connection/i.test(msg)) return 'Network timeout. Check your connection and retry.'
    return 'Payment failed. Nothing was sent. Please try again.'
  }

  async function pay() {
    if (!req) return
    if (!token || !enough) {
      redirectToDeposit()
      return
    }
    setState('paying')
    try {
      const decimals = await getTokenDecimals(token.address)
      const hash = await transferToken(token.address, req.to, parseUnits(req.amount.toString(), decimals))
      setTxHash(hash)
      addPayment({
        id: Date.now().toString(),
        date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        txHash: hash,
        to: req.to,
        toName: payeeName,
        amount: req.amount,
      })
      setAlreadyRecurring(
        getRecurring().some((r) => r.address.toLowerCase() === req.to.toLowerCase()),
      )
      notifyPaymentSent(payeeName, req.amount)
      setState('done')
    } catch (e) {
      setErrorMsg(friendlyError(e))
      setState('error')
    }
  }

  // Bridge: paying someone repeatedly via a request is a strong signal they
  // should just be a recurring payment instead of a one-off link each time.
  function saveAsRecurring() {
    if (!req) return
    addRecurring({ name: payeeName, address: req.to, amount: req.amount, frequency: 'monthly' })
    setSavedRecurring(true)
  }

  return (
    <main className="flex flex-col min-h-screen px-5 pt-10 pb-10" style={{ paddingTop: 'calc(2.5rem + env(safe-area-inset-top))' }}>
      {state === 'invalid' && (
        <Center icon={<X size={24} className="text-content-subtle" />}>
          <p className="text-body text-content-muted">This payment link is invalid or expired.</p>
          <GoHome router={router} />
        </Center>
      )}

      {(state === 'ready' || state === 'paying') && req && (
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <Avatar seed={req.to} label={payeeName} size={72} />
            <p className="text-caption text-content-subtle mt-4 mb-1">Payment request from</p>
            <p className="text-heading text-content mb-6">{payeeName}</p>
            <p className="text-hero text-content">${usd(req.amount)}</p>
            {req.note && <p className="text-body text-content-muted mt-2">for {req.note}</p>}

            {token && (
              <p className="text-caption text-content-subtle mt-6">
                Paying with {token.symbol} · balance ${usd(token.humanBalance)}
              </p>
            )}
            {checked && !account && (
              <p className="text-caption text-content-subtle mt-6 max-w-[280px]">
                Open this request inside MiniPay to pay in one tap.
              </p>
            )}
          </div>

          {/* No wallet (opened in a normal browser) → open in MiniPay */}
          {checked && !account ? (
            <a
              href={DEEPLINKS.browse(payUrl)}
              className="w-full py-4 rounded-card font-semibold text-white bg-brand shadow-ring active:scale-[0.99] transition-transform flex items-center justify-center gap-2"
            >
              <Smartphone size={18} /> Open in MiniPay to pay
            </a>
          ) : (
            <button
              onClick={pay}
              disabled={state === 'paying' || !checked}
              className="w-full py-4 rounded-card font-semibold text-white bg-brand shadow-ring disabled:opacity-60 active:scale-[0.99] transition-transform flex items-center justify-center gap-2"
            >
              {state === 'paying' ? (
                <><Loader2 size={18} className="animate-spin" /> Paying…</>
              ) : !checked ? (
                'Connecting wallet…'
              ) : enough ? (
                `Pay $${usd(req.amount)}`
              ) : (
                'Add funds to pay'
              )}
            </button>
          )}
          <button onClick={() => router.push('/')} className="w-full py-3 text-caption text-content-subtle mt-1">
            Not now
          </button>
        </div>
      )}

      {state === 'done' && req && (
        <Center icon={<Check size={32} className="text-success" strokeWidth={2.5} />} big>
          <h1 className="text-title text-content mb-1">Paid ${usd(req.amount)}</h1>
          <p className="text-caption text-content-subtle mb-5">Sent to {payeeName}</p>

          {!alreadyRecurring && !savedRecurring && (
            <button
              onClick={saveAsRecurring}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-card font-semibold text-brand border border-brand mb-2 active:bg-brand/5"
            >
              <Repeat size={16} /> Save {payeeName} as a recurring payment
            </button>
          )}
          {savedRecurring && (
            <p className="flex items-center justify-center gap-1.5 text-caption text-success mb-3">
              <Check size={14} /> Added to your recurring list
            </p>
          )}

          <a href={DEEPLINKS.receipt(txHash)} className="flex items-center justify-center gap-2 w-full py-4 rounded-card font-semibold text-white bg-brand shadow-ring">
            View receipt in MiniPay <ChevronRight size={18} />
          </a>
          <a href={`${EXPLORER}/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 w-full py-3 text-caption text-content-subtle mt-1">
            View on explorer <ExternalLink size={13} />
          </a>
        </Center>
      )}

      {state === 'error' && (
        <Center icon={<X size={32} className="text-danger" strokeWidth={2.5} />} big>
          <h1 className="text-title text-content mb-2">Something went wrong</h1>
          <p className="text-body text-content-muted mb-6">{errorMsg}</p>
          <button onClick={() => setState('ready')} className="w-full py-4 rounded-card font-semibold text-white bg-brand shadow-ring">
            Retry
          </button>
          <GoHome router={router} />
        </Center>
      )}
    </main>
  )
}

function Center({ icon, children, big }: { icon: React.ReactNode; children: React.ReactNode; big?: boolean }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center">
      <div className={`${big ? 'w-16 h-16' : 'w-14 h-14'} rounded-full bg-surface-sunken flex items-center justify-center mb-4`}>
        {icon}
      </div>
      {children}
    </div>
  )
}

function GoHome({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <button onClick={() => router.push('/')} className="mt-5 px-5 py-2.5 rounded-card bg-brand text-white text-body font-semibold shadow-ring">
      Go to Bundl
    </button>
  )
}
