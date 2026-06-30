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
