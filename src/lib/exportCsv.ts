// Export the settlement/payment timeline as CSV — useful for personal
// bookkeeping or as proof of payment. Pure client-side, no backend.

import type { Bundle, Payment } from './storage'

function csvEscape(v: string | number): string {
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function buildHistoryCsv(bundles: Bundle[], payments: Payment[]): string {
  const rows: string[][] = [['Date', 'Type', 'Recipient', 'Address', 'Amount (USD)', 'Tx Hash']]

  for (const b of bundles) {
    for (const line of b.lines) {
      rows.push([b.date, 'Bundle settlement', line.name, line.address, line.amount.toFixed(2), b.txHash])
    }
  }
  for (const p of payments) {
    rows.push([p.date, 'Payment', p.toName, p.to, p.amount.toFixed(2), p.txHash])
  }

  // Newest first isn't guaranteed by insertion order here — sort by date string
  // is unreliable across locales, so callers should pass already-sorted data
  // if order matters; this just serialises rows as given.
  return rows.map((r) => r.map(csvEscape).join(',')).join('\n')
}

export function downloadHistoryCsv(bundles: Bundle[], payments: Payment[]) {
  const csv = buildHistoryCsv(bundles, payments)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `bundl-history-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
