/**
 * Contact resolution — two strategies:
 *
 * 1. minipay_requestContact (PRIMARY — use this)
 *    Native MiniPay method. Opens the user's contacts, returns { name, address }.
 *    No ODIS quota, no server-side calls, instant.
 *
 * 2. ODIS / FederatedAttestations lookup (FALLBACK — server-side only)
 *    Resolves a raw phone number to an address when outside MiniPay or when
 *    the user types a number manually.
 *    Requires ODIS quota payment and ContractKit — run in a Next.js API route.
 */

import { getWalletClient, isMiniPay } from './wallet'

export { isMiniPay as isMiniPayEnv }

export interface ContactResult {
  name: string
  address: `0x${string}`
}

/**
 * Open MiniPay's native contact picker.
 * Works only inside MiniPay. Returns null if cancelled or unavailable.
 */
export async function pickContact(): Promise<ContactResult | null> {
  const client = getWalletClient()
  if (!client) return null

  try {
    const result = await client.request({
      method: 'minipay_requestContact' as never,
      params: [] as never,
    }) as { name: string; address: string } | null

    if (!result?.address) return null

    return {
      name: result.name || shortenAddress(result.address as `0x${string}`),
      address: result.address as `0x${string}`,
    }
  } catch {
    return null
  }
}

function shortenAddress(address: `0x${string}`): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}
