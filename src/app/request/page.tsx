'use client'

import { useEffect, useState } from 'react'
import { HandCoins, Users, Share2, Check, Sparkles } from 'lucide-react'
import { BottomNav } from '@/components/BottomNav'
import { getAccount, isMiniPay } from '@/lib/wallet'
import { getCachedName } from '@/lib/socialconnect'
import { buildRequestUrl } from '@/lib/paymentRequest'
import { usd, round2 } from '@/lib/format'

type Mode = 'request' | 'split'

export default function RequestPage() {
  const [account, setAccount] = useState<string | null>(null)
  const [inMiniPay, setInMiniPay] = useState(true)
  const [mode, setMode] = useState<Mode>('request')
  const [amount, setAmount] = useState('')
  const [people, setPeople] = useState('2')
  const [note, setNote] = useState('')
  const [shared, setShared] = useState(false)

  useEffect(() => {
    setInMiniPay(isMiniPay())
    getAccount().then(setAccount)
  }, [])

  const amt = parseFloat(amount)
  const nPeople = Math.max(2, parseInt(people) || 2)
  const perPerson = mode === 'split' && amt > 0 ? round2(amt / nPeople) : amt
  const valid = account && perPerson > 0

  async function handleShare() {
    if (!valid) return
    const url = buildRequestUrl({
      to: account as `0x${string}`,
      amount: perPerson,
      note: note.trim() || undefined,
      name: getCachedName(account!) || undefined,
    })
    const text =
      mode === 'split'
        ? `Your share is $${usd(perPerson)}${note ? ` for ${note}` : ''} — pay me on Bundl:`
        : `Please pay me $${usd(perPerson)}${note ? ` for ${note}` : ''} on Bundl:`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Bundl payment request', text, url })
      } else {
        await navigator.clipboard.writeText(url)
        setShared(true)
        setTimeout(() => setShared(false), 2000)
      }
    } catch {
      /* cancelled */
    }
  }

  return (
    <main className="flex flex-col min-h-screen pb-24 px-4 pt-6">
      <h1 className="text-title text-content mb-5">Request</h1>

      {/* Mode toggle */}
      <div className="flex gap-1 bg-surface-sunken rounded-card p-1 mb-5">
        {(['request', 'split'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[14px] text-caption font-semibold transition-colors ${
              mode === m ? 'bg-surface-raised text-brand shadow-card' : 'text-content-subtle'
            }`}
          >
            {m === 'request' ? <HandCoins size={16} /> : <Users size={16} />}
            {m === 'request' ? 'Request money' : 'Split a bill'}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <Field
          label={mode === 'split' ? 'Total amount (USD)' : 'Amount (USD)'}
          value={amount}
          onChange={setAmount}
          placeholder="0"
          inputMode="decimal"
        />

        {mode === 'split' && (
          <Field label="Split between (people)" value={people} onChange={setPeople} placeholder="2" inputMode="numeric" />
        )}

        <Field label="What for? (optional)" value={note} onChange={setNote} placeholder="e.g. Rent, gift, lunch" />
      </div>

      {/* Preview */}
      {perPerson > 0 && (
        <div className="bg-surface-raised border border-line rounded-card shadow-card p-4 mt-5">
          {mode === 'split' ? (
            <p className="text-caption text-content-muted mb-1">
              Each of {nPeople} people pays
            </p>
          ) : (
            <p className="text-caption text-content-muted mb-1">They pay you</p>
          )}
          <p className="text-hero text-content">${usd(perPerson)}</p>
          {note && <p className="text-caption text-content-subtle mt-1">for {note}</p>}
          <p className="flex items-center gap-1 text-micro text-success mt-3">
            <Sparkles size={11} /> No Bundl fee — 100% goes to you.
          </p>
        </div>
      )}

      {/* Address gate */}
      {!account && (
        <p className="text-caption text-warning bg-warning/10 rounded-card p-3 mt-5">
          {inMiniPay ? 'Connecting your wallet…' : 'Open Bundl inside MiniPay to create a request.'}
        </p>
      )}

      <button
        onClick={handleShare}
        disabled={!valid}
        className="w-full py-4 rounded-card font-semibold text-white bg-brand shadow-ring disabled:bg-surface-sunken disabled:text-content-subtle disabled:shadow-none active:scale-[0.99] transition-transform mt-5 flex items-center justify-center gap-2"
      >
        {shared ? <Check size={18} /> : <Share2 size={18} />}
        {shared ? 'Link copied' : mode === 'split' ? 'Share with the group' : 'Share request'}
      </button>

      <BottomNav />
    </main>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
}) {
  return (
    <div>
      <label className="text-caption font-medium text-content-muted mb-1 block">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="w-full bg-surface-sunken rounded-card px-4 py-3 text-body text-content outline-none focus:ring-2 focus:ring-brand/40 transition-shadow"
      />
    </div>
  )
}
