// Lightweight, local-only trust signals for the Recurring form:
//   - has this address ever been paid before (any bundle line, solo payment,
//     or existing recurring entry)?
//   - what amounts have historically gone to it, so a wildly different new
//     amount can be flagged as a possible typo?
// These are soft, informational warnings only — never blocking — and are
// approximated from the LOCAL cache (bundles/payments/recurring already
// synced to this device), not a live chain query, so they stay instant while
// typing in a form.

import { getBundles, getPayments, getRecurring } from './storage'

export function isKnownAddress(address: string): boolean {
  const addr = address.toLowerCase()
  if (!addr) return true // don't warn on an empty/incomplete field
  const inRecurring = getRecurring().some((r) => r.address.toLowerCase() === addr)
  const inBundles = getBundles().some((b) => b.lines.some((l) => l.address.toLowerCase() === addr))
  const inPayments = getPayments().some((p) => p.to.toLowerCase() === addr)
  return inRecurring || inBundles || inPayments
}

export function historicalAmountsFor(address: string): number[] {
  const addr = address.toLowerCase()
  const fromBundles = getBundles().flatMap((b) =>
    b.lines.filter((l) => l.address.toLowerCase() === addr).map((l) => l.amount),
  )
  const fromPayments = getPayments().filter((p) => p.to.toLowerCase() === addr).map((p) => p.amount)
  return [...fromBundles, ...fromPayments]
}

/** Flags amounts that look like a fat-finger typo vs this address's history. */
export function isUnusualAmount(address: string, amount: number): { unusual: boolean; usualMax: number } {
  const history = historicalAmountsFor(address)
  if (history.length === 0) return { unusual: false, usualMax: 0 }
  const usualMax = Math.max(...history)
  return { unusual: amount > usualMax * 3, usualMax }
}
