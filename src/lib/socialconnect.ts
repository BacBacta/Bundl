/**
 * Contact + handle resolution.
 *
 * 1. minipay_requestContact (PRIMARY)
 *    Native MiniPay method. Opens contacts, returns { name, address }.
 *    No ODIS quota, no server calls, instant. We cache the name so detected
 *    payments and history can render "Mum" instead of 0x….
 *
 * 2. Name cache (localStorage `bundl_names`)
 *    address → display name, populated by the contact picker and by any
 *    server-side SocialConnect reverse lookup we add later.
 *
 * 3. Local Recurring list (fallback)
 *    If an address was never cached (e.g. added manually, before this
 *    fallback existed, or on a device where the name cache was cleared but
 *    the Recurring list survived), the user's own saved recurring payments
 *    are a second on-device source of truth for "what did I call this
 *    address" — checked before giving up and showing a raw address.
 *
 * 4. ODIS / FederatedAttestations (FALLBACK, mainnet, server-side only)
 *    Not wired in the MVP — see SOCIALCONNECT in tokens.ts for addresses.
 *
 * None of this survives a cache clear AND lost Recurring list AND no manual
 * label — on-chain history is always resilient (amounts, tx hashes, dates
 * come from the chain), but a NAME for an address nobody ever labeled is,
 * by definition, unknowable. `resolveDisplayName` below is the single
 * function everywhere in the app should call instead of ad-hoc
 * `getCachedName(...) ?? shortenAddress(...)`, so all these sources are
 * always checked consistently.
 */

import { getWalletClient } from './wallet'
import { isMiniPay } from './wallet'
import { getRecurring } from './storage'

export { isMiniPay as isMiniPayEnv }

export interface ContactResult {
  name: string
  address: `0x${string}`
}

const NAME_KEY = 'bundl_names'

function loadNames(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(NAME_KEY) || '{}')
  } catch {
    return {}
  }
}

export function cacheName(address: string, name: string) {
  if (typeof window === 'undefined' || !name) return
  const names = loadNames()
  names[address.toLowerCase()] = name
  localStorage.setItem(NAME_KEY, JSON.stringify(names))
}

export function getCachedName(address: string): string | null {
  return loadNames()[address.toLowerCase()] ?? null
}

/** Cached name if known, else a shortened address. Never throws. */
export function resolveName(address: string): string {
  return getCachedName(address) ?? shortenAddress(address)
}

/**
 * The canonical resolver — checks the name cache, then the local Recurring
 * list, then falls back to a shortened address. Use this (not
 * `getCachedName(...) ?? shortenAddress(...)`) anywhere an address needs a
 * human label, so a recurring payment's saved name is never "forgotten"
 * just because it was typed manually instead of picked from contacts.
 */
export function resolveDisplayName(address: string): string {
  const cached = getCachedName(address)
  if (cached) return cached

  const addr = address.toLowerCase()
  const recurring = getRecurring().find((r) => r.address.toLowerCase() === addr)
  if (recurring) {
    cacheName(address, recurring.name) // backfill so future lookups are instant
    return recurring.name
  }

  return shortenAddress(address)
}

/** True if `address` has no known name anywhere (cache, Recurring list). */
export function isUnresolvedAddress(address: string): boolean {
  if (getCachedName(address)) return false
  const addr = address.toLowerCase()
  return !getRecurring().some((r) => r.address.toLowerCase() === addr)
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

/**
 * Open MiniPay's native contact picker.
 * Works only inside MiniPay. Returns null if cancelled or unavailable.
 * Caches the resolved name for later display.
 */
export async function pickContact(): Promise<ContactResult | null> {
  const client = getWalletClient()
  if (!client) return null

  try {
    const result = (await client.request({
      method: 'minipay_requestContact' as never,
      params: [] as never,
    })) as { name: string; address: string } | null

    if (!result?.address) return null

    const name = result.name || shortenAddress(result.address)
    cacheName(result.address, name)

    return { name, address: result.address as `0x${string}` }
  } catch {
    return null
  }
}
