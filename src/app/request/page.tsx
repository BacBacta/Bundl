'use client'

import { useEffect, useState } from 'react'
import { HandCoins, Users, Share2, Check, Sparkles, MessageCircle, X, CheckCircle2 } from 'lucide-react'
import { BottomNav } from '@/components/BottomNav'
import { Avatar } from '@/components/Avatar'
import { getAccount, isMiniPay } from '@/lib/wallet'
import { getCachedName, resolveDisplayName } from '@/lib/socialconnect'
import { buildRequestUrl } from '@/lib/paymentRequest'
import { usd, round2 } from '@/lib/format'
import { type Collect, getCollects, addCollect, deleteCollect } from '@/lib/storage'
import { fetchIncomingTransfers, type IncomingTransfer } from '@/lib/onchainHistory'

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

  // Caps mirror decodeRequest's validation so a link we create always decodes.
  const amt = Math.min(parseFloat(amount) || 0, 1_000_000)
  const nPeople = Math.min(Math.max(2, parseInt(people) || 2), 150)
  const perPerson = mode === 'split' && amt > 0 ? round2(amt / nPeople) : round2(amt)
  const valid = account && perPerson > 0

  // Tracked collections — matched against incoming on-chain transfers.
  const [collects, setCollects] = useState<Collect[]>([])
  const [incoming, setIncoming] = useState<IncomingTransfer[]>([])

  useEffect(() => {
    setCollects(getCollects())
  }, [])

  useEffect(() => {
    if (!account || collects.length === 0) return
    const oldest = Math.min(...collects.map((c) => c.createdAt))
    fetchIncomingTransfers(account as `0x${string}`, oldest).then(setIncoming)
  }, [account, collects])

  function startTracking() {
    const entry = addCollect({ note: note.trim() || (mode === 'split' ? 'Bill split' : 'Request'), perPerson, people: mode === 'split' ? nPeople : 1 })
    setCollects((prev) => [entry, ...prev])
  }

  function shareText(url: string) {
    return (
      (mode === 'split'
        ? `Your share is $${usd(perPerson)}${note ? ` for ${note}` : ''} — pay me on Bundl:`
        : `Please pay me $${usd(perPerson)}${note ? ` for ${note}` : ''} on Bundl:`) + ` ${url}`
    )
  }

  function requestUrl() {
    return buildRequestUrl({
      to: account as `0x${string}`,
      amount: perPerson,
      note: note.trim() || undefined,
      name: getCachedName(account!) || undefined,
    })
  }

  async function handleShare() {
    if (!valid) return
    const url = requestUrl()
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Bundl payment request', text: shareText(''), url })
      } else {
        await navigator.clipboard.writeText(url)
        setShared(true)
        setTimeout(() => setShared(false), 2000)
      }
      startTracking()
    } catch {
      /* cancelled — don't track a request that was never sent */
    }
  }

  // WhatsApp is where the group already is — one tap, no share-sheet detour.
  function handleWhatsApp() {
    if (!valid) return
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText(requestUrl()))}`, '_blank')
    startTracking()
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

      {/* Address gate — neutral info, not an alarm: the form itself stays usable */}
      {!account && (
        <p className="text-caption text-content-muted bg-surface-sunken rounded-card p-3 mt-5">
          {inMiniPay ? 'Connecting your wallet…' : 'Open Bundl inside MiniPay to share this request.'}
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
      <button
        onClick={handleWhatsApp}
        disabled={!valid}
        className="w-full py-3.5 rounded-card font-semibold border border-line text-content disabled:opacity-40 active:bg-surface-sunken mt-2 flex items-center justify-center gap-2"
      >
        <MessageCircle size={17} /> Share on WhatsApp
      </button>

      {/* Who paid — contributions matched from incoming on-chain transfers */}
      {collects.length > 0 && (
        <section className="mt-8">
          <p className="text-micro font-semibold uppercase tracking-wide text-content-subtle mb-3 px-1">
            Tracking
          </p>
          <div className="space-y-3">
            {collects.map((c) => (
              <CollectCard
                key={c.id}
                collect={c}
                incoming={incoming}
                onDismiss={() => {
                  deleteCollect(c.id)
                  setCollects((prev) => prev.filter((x) => x.id !== c.id))
                }}
              />
            ))}
          </div>
        </section>
      )}

      <BottomNav />
    </main>
  )
}

function CollectCard({
  collect,
  incoming,
  onDismiss,
}: {
  collect: Collect
  incoming: IncomingTransfer[]
  onDismiss: () => void
}) {
  // A transfer counts as a contribution if it arrived after the ask and
  // matches the per-person amount (±1% for rounding), newest first, capped
  // at the expected head-count so an unrelated same-amount payment later
  // doesn't over-fill the bar.
  const paid = incoming
    .filter((t) => t.ms >= collect.createdAt && Math.abs(t.amount - collect.perPerson) <= collect.perPerson * 0.01)
    .slice(0, collect.people)
  const done = paid.length >= collect.people

  return (
    <div className="bg-surface-raised border border-line rounded-card shadow-card p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-body font-semibold text-content">{collect.note}</p>
          <p className="text-caption text-content-subtle">
            ${usd(collect.perPerson)} × {collect.people} {collect.people > 1 ? 'people' : 'person'}
          </p>
        </div>
        <button onClick={onDismiss} aria-label="Dismiss" className="text-content-subtle p-1 active:opacity-60">
          <X size={16} />
        </button>
      </div>

      <div className="h-1.5 bg-surface-sunken rounded-pill overflow-hidden mb-2">
        <div
          className="h-full bg-success rounded-pill transition-all duration-500"
          style={{ width: `${Math.min(100, (paid.length / collect.people) * 100)}%` }}
        />
      </div>
      <p className={`flex items-center gap-1.5 text-caption ${done ? 'text-success' : 'text-content-muted'}`}>
        {done && <CheckCircle2 size={14} />}
        {paid.length} of {collect.people} paid{done ? ' — all set!' : ''}
      </p>

      {paid.length > 0 && (
        <div className="flex items-center gap-1.5 mt-2.5">
          {paid.slice(0, 8).map((t, i) => (
            <Avatar key={`${t.txHash}-${i}`} seed={t.from} label={resolveDisplayName(t.from)} size={26} />
          ))}
        </div>
      )}
    </div>
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
  const id = `field-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`
  return (
    <div>
      <label htmlFor={id} className="text-caption font-medium text-content-muted mb-1 block">{label}</label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="w-full bg-surface-sunken rounded-card px-4 py-3 text-body text-content outline-none focus:ring-2 focus:ring-brand/40 transition-shadow"
      />
    </div>
  )
}
