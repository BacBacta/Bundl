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
 * 3. ODIS / FederatedAttestations (FALLBACK, mainnet, server-side only)
 *    Not wired in the MVP — see SOCIALCONNECT in tokens.ts for addresses.
 */

import { getWalletClient } from './wallet'
import { isMiniPay } from './wallet'

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
