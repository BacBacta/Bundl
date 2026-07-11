// Client-side helper for phone -> address resolution (see
// src/app/api/resolve-phone/route.ts for the server-side ODIS scaffold and
// what's still needed to make it live). Always fails safe: returns null if
// the API isn't configured, times out, or errors — callers should treat this
// purely as an optional shortcut on top of manual address entry and the
// MiniPay contact picker, never as the only way in.

import { isAddress } from 'viem'
import { fetchWithTimeout } from './net'

export interface PhoneResolveResult {
  address: `0x${string}`
}

export async function resolvePhoneNumber(e164Phone: string): Promise<PhoneResolveResult | null> {
  try {
    const res = await fetchWithTimeout(
      '/api/resolve-phone',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone: e164Phone }),
      },
      10000, // ODIS blinding + attestation lookup is slower than a plain read
    )
    if (!res.ok) return null
    const json = await res.json()
    if (typeof json.address !== 'string' || !isAddress(json.address)) return null
    return { address: json.address }
  } catch {
    return null
  }
}
