'use client'

import { useEffect, useState } from 'react'
import { isAddress } from 'viem'
import { BottomNav } from '@/components/BottomNav'
import { AppFooter } from '@/components/AppFooter'
import {
  type Recurring,
  getRecurring,
  addRecurring,
  updateRecurring,
  deleteRecurring,
} from '@/lib/storage'
import { pickContact, isMiniPayEnv } from '@/lib/socialconnect'

const EMPTY_FORM = { name: '', address: '', amount: '' }

export default function RecurringPage() {
  const [items, setItems] = useState<Recurring[]>([])
  const [sheet, setSheet] = useState<'closed' | 'add' | 'edit'>('closed')
  const [editing, setEditing] = useState<Recurring | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<typeof EMPTY_FORM>>({})

  useEffect(() => {
    setItems(getRecurring())
  }, [])

  const monthlyTotal = items.reduce((s, r) => s + r.amount, 0)

  function openAdd() {
    setForm(EMPTY_FORM)
    setErrors({})
    setEditing(null)
    setSheet('add')
  }

  function openEdit(item: Recurring) {
    setForm({ name: item.name, address: item.address, amount: String(item.amount) })
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
    }
    if (sheet === 'add') {
      const newItem = addRecurring(data)
      setItems((prev) => [...prev, newItem])
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
    <main className="flex flex-col min-h-screen pb-20 px-4 pt-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Recurring</h1>
        <button
          onClick={openAdd}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-[#0F6E56] text-white text-xl"
        >
          +
        </button>
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 py-20">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-sm mb-4">No recurring payments yet.</p>
          <button
            onClick={openAdd}
            className="px-5 py-2.5 rounded-xl bg-[#0F6E56] text-white text-sm font-medium"
          >
            Add first payment
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-6">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => openEdit(item)}
                className="w-full flex items-center justify-between border border-gray-200 rounded-2xl p-4 text-left active:bg-gray-50"
              >
                <div>
                  <p className="font-semibold text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">
                    {item.address.slice(0, 8)}…{item.address.slice(-6)}
                  </p>
                  <p className="text-xs text-gray-400">Monthly</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">${item.amount}</p>
                  <p className="text-xs text-gray-400">per month</p>
                </div>
              </button>
            ))}
          </div>

          <div className="flex justify-between items-center border-t border-gray-100 pt-4">
            <span className="text-sm text-gray-500">Monthly total</span>
            <span className="text-lg font-bold">${monthlyTotal}</span>
          </div>
        </>
      )}

      {/* Bottom sheet — add / edit */}
      {sheet !== 'closed' && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={closeSheet} />
          <div className="relative bg-white rounded-t-3xl px-5 pt-5 pb-10 space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-bold">
                {sheet === 'add' ? 'Add payment' : 'Edit payment'}
              </h2>
              {sheet === 'edit' && editing && (
                <button
                  onClick={() => handleDelete(editing.id)}
                  className="text-sm text-red-500 font-medium"
                >
                  Delete
                </button>
              )}
            </div>

            {/* Contact picker — MiniPay native, fills name + address in one tap */}
            <button
              onClick={handlePickContact}
              className="w-full py-3 rounded-xl border border-[#0F6E56] text-[#0F6E56] text-sm font-medium flex items-center justify-center gap-2"
            >
              <span>👤</span> Pick from contacts
            </button>

            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="flex-1 h-px bg-gray-100" />
              or enter manually
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            <Field
              label="Name"
              value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholder="e.g. Rent, Mum, Supplier"
              error={errors.name}
            />
            <Field
              label="Wallet address"
              value={form.address}
              onChange={(v) => setForm((f) => ({ ...f, address: v }))}
              placeholder="0x…"
              error={errors.address}
              mono
            />
            <Field
              label="Amount (USD)"
              value={form.amount}
              onChange={(v) => setForm((f) => ({ ...f, amount: v }))}
              placeholder="0"
              error={errors.amount}
              inputMode="decimal"
            />

            <button
              onClick={handleSave}
              className="w-full py-4 rounded-xl font-semibold text-white bg-[#0F6E56] mt-2"
            >
              {sheet === 'add' ? 'Add payment' : 'Save changes'}
            </button>
          </div>
        </div>
      )}

      <AppFooter />
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
      <label className="text-xs font-medium text-gray-500 mb-1 block">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className={`w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0F6E56] transition-colors ${
          mono ? 'font-mono' : ''
        } ${error ? 'border-red-400' : 'border-gray-200'}`}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
