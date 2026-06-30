'use client'

import { useEffect, useState } from 'react'
import { isAddress } from 'viem'
import { Plus, Trash2, Contact, Repeat } from 'lucide-react'
import { BottomNav } from '@/components/BottomNav'
import { RecipientRow } from '@/components/RecipientRow'
import { usd } from '@/lib/format'
import {
  type Recurring,
  type Frequency,
  getRecurring,
  addRecurring,
  updateRecurring,
  deleteRecurring,
  monthlyEquivalent,
} from '@/lib/storage'
import { pickContact } from '@/lib/socialconnect'

const EMPTY_FORM = { name: '', address: '', amount: '', frequency: 'monthly' as Frequency }
const FREQUENCIES: Frequency[] = ['weekly', 'biweekly', 'monthly']

export default function RecurringPage() {
  const [items, setItems] = useState<Recurring[]>([])
  const [sheet, setSheet] = useState<'closed' | 'add' | 'edit'>('closed')
  const [editing, setEditing] = useState<Recurring | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<typeof EMPTY_FORM>>({})

  useEffect(() => {
    setItems(getRecurring())
  }, [])

  const monthlyTotal = items.reduce((s, r) => s + monthlyEquivalent(r), 0)

  function openAdd() {
    setForm(EMPTY_FORM)
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
    if (!isAddress(form.address)) e.address = 'Invalid address'
    const amt = parseFloat(form.amount)
    if (isNaN(amt) || amt <= 0) e.amount = 'Enter a positive amount'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSave() {
    if (!validate()) return
    const data = {
      name: form.name.trim(),
      address: form.address as `0x${string}`,
      amount: parseFloat(form.amount),
      frequency: form.frequency,
    }
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
        <h1 className="text-title text-content">Recurring</h1>
        <button
          onClick={openAdd}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-brand text-white shadow-ring active:scale-90 transition-transform"
          aria-label="Add payment"
        >
          <Plus size={20} />
        </button>
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
            <span className="text-body text-content-muted">Monthly total</span>
            <span className="text-title text-content">${usd(monthlyTotal)}</span>
          </div>
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
            <Field label="Wallet address" value={form.address} onChange={(v) => setForm((f) => ({ ...f, address: v }))} placeholder="0x…" error={errors.address} mono />
            <Field label="Amount (USD)" value={form.amount} onChange={(v) => setForm((f) => ({ ...f, amount: v }))} placeholder="0" error={errors.amount} inputMode="decimal" />

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

            <button
              onClick={handleSave}
              className="w-full py-4 rounded-card font-semibold text-white bg-brand shadow-ring active:scale-[0.99] transition-transform"
            >
              {sheet === 'add' ? 'Add payment' : 'Save changes'}
            </button>
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
