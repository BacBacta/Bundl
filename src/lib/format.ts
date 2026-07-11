// All monetary display goes through here — prevents raw float artifacts.
export function usd(amount: number): string {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

// Round to 2 decimal places to avoid float accumulation errors.
export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// Any stored date (ISO timestamp or already-human string) → "8 Jul 2026".
// Raw ISO strings must never reach the UI.
export function humanDate(input: string): string {
  const d = new Date(input)
  if (isNaN(d.getTime())) return input
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Month bucket for history grouping → "July 2026". Accepts an epoch-ms id.
export function monthLabel(epochMs: number): string {
  const d = new Date(epochMs)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}
