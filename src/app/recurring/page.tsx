'use client'

import { useEffect, useState } from 'react'
import { isAddress, zeroAddress } from 'viem'
import { Plus, Trash2, Contact, Repeat, Share2, Check, Home, Users, Briefcase, RotateCw, Tag, AlertTriangle } from 'lucide-react'
import { BottomNav } from '@/components/BottomNav'
import { RecipientRow } from '@/components/RecipientRow'
import { usd } from '@/lib/format'
import { buildShareUrl } from '@/lib/shareBundle'
import {
  type Recurring,
  type Frequency,
  type Category,
  CATEGORIES,
  getRecurring,
  addRecurring,
  updateRecurring,
  deleteRecurring,
  monthlyEquivalent,
} from '@/lib/storage'
import { pickContact, cacheName } from '@/lib/socialconnect'
import { isKnownAddress, isUnusualAmount } from '@/lib/addressBook'
import { getAccount } from '@/lib/wallet'
import { checkProStatus, getCachedProStatus, FREE_TIER_MAX_RECIPIENTS } from '@/lib/pro'
import Link from 'next/link'

const EMPTY_FORM = { name: '', address: '', amount: '', frequency: 'monthly' as Frequency, category: 'other' as Category }
const FREQUENCIES: Frequency[] = ['weekly', 'biweekly', 'monthly']

const CATEGORY_ICONS: Record<Category, typeof Home> = {
  housing: Home,
  family: Users,
  business: Briefcase,
  subscriptions: RotateCw,
  other: Tag,
}

export default function RecurringPage() {
  const [items, setItems] = useState<Recurring[]>([])
  const [sheet, setSheet] = useState<'closed' | 'add' | 'edit' | 'limit'>('closed')
  const [editing, setEditing] = useState<Recurring | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<typeof EMPTY_FORM>>({})
  const [shared, setShared] = useState(false)
  const [isPro, setIsPro] = useState(getCachedProStatus())

  useEffect(() => {
    getAccount().then((addr) => {
      if (addr) checkProStatus(addr as `0x${string}`).then(setIsPro)
    })
  }, [])

  async function handleShare() {
    if (items.length === 0) return
    const url = buildShareUrl(items)
    const text = `I set up a payment bundle on Bundl — open it to pay everyone in one tap:`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Bundl payment bundle', text, url })
      } else {
        await navigator.clipboard.writeText(url)
        setShared(true)
        setTimeout(() => setShared(false), 2000)
      }
    } catch {
      /* user cancelled share — ignore */
    }
  }

  useEffect(() => {
    setItems(getRecurring())
  }, [])

  const monthlyTotal = items.reduce((s, r) => s + monthlyEquivalent(r), 0)

  const categoryBreakdown = CATEGORIES.map(({ key, label }) => ({
    key,
    label,
    total: items.filter((r) => (r.category ?? 'other') === key).reduce((s, r) => s + monthlyEquivalent(r), 0),
  })).filter((c) => c.total > 0)

  const atFreeLimit = !isPro && items.length >= FREE_TIER_MAX_RECIPIENTS

  // Draft autosave: an accidentally closed sheet or a reload must not eat a
  // half-typed name + 42-char address. Session-scoped, cleared on save.
  const DRAFT_KEY = 'bundl_recurring_draft'

  useEffect(() => {
    if (sheet !== 'add') return
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form)) } catch {}
  }, [form, sheet])

  function openAdd() {
    if (atFreeLimit) {
      setSheet('limit')
      return
    }
    let draft = EMPTY_FORM
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY)
      if (raw) draft = { ...EMPTY_FORM, ...JSON.parse(raw) }
    } catch {}
    setForm(draft)
    setErrors({})
    setEditing(null)
    setSheet('add')
  }

  function openEdit(item: Recurring) {
    setForm({
      name: item.name,
      address: item.address,
      amount: String(item.amount),
      frequency: item.frequency ?? 'monthly',
      category: item.category ?? 'other',
    })
    setErrors({})
    setEditing(item)
    setSheet('edit')
  }

  function closeSheet() {
    setSheet('closed')
    setEditing(null)
  }

  async function handlePickContact() {
    const contact = await pickContact()
    if (contact) {
      setForm((f) => ({ ...f, name: contact.name, address: contact.address }))
      setErrors((e) => ({ ...e, name: undefined, address: undefined }))
    }
  }

  function validate() {
    const e: Partial<typeof EMPTY_FORM> = {}
    if (!form.name.trim()) e.name = 'Required'
    if (!isAddress(form.address) || form.address === zeroAddress) e.address = 'Invalid address'
    const amt = parseFloat(form.amount)
    if (isNaN(amt) || amt <= 0) e.amount = 'Enter a positive amount'
    else if (amt > 100_000) e.amount = 'Amount too large — max $100,000'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSave() {
    if (!validate()) return
    const data = {
      name: form.name.trim(),
      address: form.address as `0x${string}`,
      amount: Math.round(parseFloat(form.amount) * 100) / 100,
      frequency: form.frequency,
      category: form.category,
    }
    try { sessionStorage.removeItem(DRAFT_KEY) } catch {}
    // Whether typed manually or picked from contacts, remember this name
    // against the address so on-chain history can resolve it later even if
    // this Recurring entry is edited or deleted — not just at read-time.
    cacheName(data.address, data.name)
    if (sheet === 'add') {
      setItems((prev) => [...prev, addRecurring(data)])
    } else if (editing) {
      const updated = { ...editing, ...data }
      updateRecurring(updated)
      setItems((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
    }
    closeSheet()
  }

  function handleDelete(id: string) {
    deleteRecurring(id)
    setItems((prev) => prev.filter((r) => r.id !== id))
    closeSheet()
  }

  return (
    <main className="flex flex-col min-h-screen pb-24 px-4 pt-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-title text-content">Payments</h1>
          <p className="text-micro text-content-subtle">Reminders — you approve every payment</p>
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <button
              onClick={handleShare}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-sunken text-content-muted active:scale-90 transition-transform"
              aria-label="Share bundle"
            >
              {shared ? <Check size={18} className="text-success" /> : <Share2 size={18} />}
            </button>
          )}
          <button
            onClick={openAdd}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-brand text-white shadow-ring active:scale-90 transition-transform"
            aria-label="Add payment"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
          <div className="w-14 h-14 rounded-full bg-surface-sunken flex items-center justify-center mb-4">
            <Repeat size={24} className="text-content-subtle" />
          </div>
          <p className="text-body text-content-muted mb-4">No recurring payments yet.</p>
          <button
            onClick={openAdd}
            className="px-5 py-2.5 rounded-card bg-brand text-white text-body font-medium shadow-ring"
          >
            Add first payment
          </button>
        </div>
      ) : (
        <>
          <div className="bg-surface-raised border border-line rounded-card shadow-card px-4 divide-y divide-line mb-4">
            {items.map((item) => (
              <RecipientRow
                key={item.id}
                name={item.name}
                address={item.address}
                amount={item.amount}
                cadence={item.frequency ?? 'monthly'}
                onClick={() => openEdit(item)}
              />
            ))}
          </div>

          <div className="flex justify-between items-center px-1">
            <span className="text-body text-content-muted">Monthly goal</span>
            <span className="text-title text-content">${usd(monthlyTotal)}</span>
          </div>
          <p className="text-micro text-content-subtle px-1 mt-1">
            Weekly and biweekly payments are combined into one monthly number — each is still
            paid at its full amount when settled.
          </p>

          {categoryBreakdown.length > 1 && (
            <div className="bg-surface-raised border border-line rounded-card shadow-card p-4 mt-4">
              <p className="text-micro text-content-subtle uppercase tracking-wide mb-3">By category</p>
              <div className="space-y-2.5">
                {categoryBreakdown.map((c) => {
                  const Icon = CATEGORY_ICONS[c.key]
                  const pct = Math.round((c.total / monthlyTotal) * 100)
                  return (
                    <div key={c.key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="flex items-center gap-1.5 text-caption text-content-muted">
                          <Icon size={13} /> {c.label}
                        </span>
                        <span className="text-caption font-semibold text-content">${usd(c.total)}</span>
                      </div>
                      <div className="h-1.5 bg-surface-sunken rounded-pill overflow-hidden">
                        <div className="h-full bg-brand rounded-pill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Bottom sheet — add / edit */}
      {sheet !== 'closed' && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={closeSheet} />
          <div
            className="relative bg-surface-raised rounded-t-sheet px-5 pt-3 pb-9 space-y-4 shadow-sheet animate-sheet-up"
            style={{ paddingBottom: 'calc(2.25rem + env(safe-area-inset-bottom))' }}
          >
            <div className="w-10 h-1 rounded-full bg-line mx-auto" />

            {sheet === 'limit' ? (
              <>
                <h2 className="text-title text-content">Free plan limit reached</h2>
                <p className="text-body text-content-muted">
                  The free plan supports up to {FREE_TIER_MAX_RECIPIENTS} recurring payments.
                  Upgrade to Bundl Pro (one-time ${5}) for up to {150}.
                </p>
                <Link
                  href="/settings"
                  className="block w-full py-4 rounded-card font-semibold text-white bg-brand shadow-ring text-center active:scale-[0.99] transition-transform"
                >
                  View Bundl Pro
                </Link>
                <button onClick={closeSheet} className="w-full py-3 text-caption text-content-subtle">
                  Not now
                </button>
              </>
            ) : (
            <>
            <div className="flex justify-between items-center">
              <h2 className="text-title text-content">
                {sheet === 'add' ? 'Add payment' : 'Edit payment'}
              </h2>
              {sheet === 'edit' && editing && (
                <button
                  onClick={() => handleDelete(editing.id)}
                  className="flex items-center gap-1 text-caption text-danger font-medium"
                >
                  <Trash2 size={15} /> Delete
                </button>
              )}
            </div>

            <button
              onClick={handlePickContact}
              className="w-full py-3 rounded-card border border-brand text-brand text-body font-medium flex items-center justify-center gap-2 active:bg-brand/5"
            >
              <Contact size={18} /> Pick from contacts
            </button>

            <div className="flex items-center gap-2 text-caption text-content-subtle">
              <div className="flex-1 h-px bg-line" />
              or enter manually
              <div className="flex-1 h-px bg-line" />
            </div>

            <Field label="Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="e.g. Rent, Mum, supplier" error={errors.name} />
            <div>
              <Field label="Wallet address" value={form.address} onChange={(v) => setForm((f) => ({ ...f, address: v }))} placeholder="0x…" error={errors.address} mono />
              {isAddress(form.address) && !isKnownAddress(form.address) && (
                <p className="flex items-center gap-1.5 text-caption text-warning mt-1.5">
                  <AlertTriangle size={13} className="shrink-0" /> New address — you haven&apos;t paid this before. Double-check it.
                </p>
              )}
            </div>
            <div>
              <Field label="Amount (USD)" value={form.amount} onChange={(v) => setForm((f) => ({ ...f, amount: v }))} placeholder="0" error={errors.amount} inputMode="decimal" />
              {isAddress(form.address) && parseFloat(form.amount) > 0 && isUnusualAmount(form.address, parseFloat(form.amount)).unusual && (
                <p className="flex items-center gap-1.5 text-caption text-warning mt-1.5">
                  <AlertTriangle size={13} className="shrink-0" />
                  Much higher than usual for this address (up to ${usd(isUnusualAmount(form.address, parseFloat(form.amount)).usualMax)} before).
                </p>
              )}
            </div>

            <div>
              <label className="text-caption font-medium text-content-muted mb-1 block">Frequency</label>
              <div className="flex gap-1 bg-surface-sunken rounded-card p-1">
                {FREQUENCIES.map((freq) => (
                  <button
                    key={freq}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, frequency: freq }))}
                    className={`flex-1 py-2 rounded-[14px] text-caption font-semibold capitalize transition-colors ${
                      form.frequency === freq ? 'bg-surface-raised text-brand shadow-card' : 'text-content-subtle'
                    }`}
                  >
                    {freq}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-caption font-medium text-content-muted mb-1 block">Category</label>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                {CATEGORIES.map(({ key, label }) => {
                  const Icon = CATEGORY_ICONS[key]
                  const active = form.category === key
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, category: key }))}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-pill text-caption font-semibold whitespace-nowrap border transition-colors ${
                        active ? 'bg-brand text-white border-brand' : 'border-line text-content-muted'
                      }`}
                    >
                      <Icon size={14} /> {label}
                    </button>
                  )
                })}
              </div>
            </div>

            <button
              onClick={handleSave}
              className="w-full py-4 rounded-card font-semibold text-white bg-brand shadow-ring active:scale-[0.99] transition-transform"
            >
              {sheet === 'add' ? 'Add payment' : 'Save changes'}
            </button>
            </>
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  error,
  mono,
  inputMode,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  error?: string
  mono?: boolean
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
        className={`w-full bg-surface-sunken rounded-card px-4 py-3 text-body text-content outline-none focus:ring-2 focus:ring-brand/40 transition-shadow ${
          mono ? 'font-mono text-caption' : ''
        } ${error ? 'ring-2 ring-danger/50' : ''}`}
      />
      {error && <p className="text-caption text-danger mt-1">{error}</p>}
    </div>
  )
}
