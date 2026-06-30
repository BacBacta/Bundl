// Shareable bundles — encode a list of recipients into a compact, URL-safe
// string so a bundle can be shared as a link (no backend). Opening the link
// pre-fills the recipient list for the recipient. Non-custodial: it only carries
// names/addresses/amounts the sharer already knows — never keys or funds.

import { isAddress } from 'viem'
import type { Frequency, Recurring } from './storage'

export interface ShareItem {
  name: string
  address: `0x${string}`
  amount: number
  frequency: Frequency
}

const FREQS: Frequency[] = ['weekly', 'biweekly', 'monthly']

// Short keys keep the URL compact: n=name, a=address, m=amount, f=frequency.
type Packed = { n: string; a: string; m: number; f: 0 | 1 | 2 }

function toBase64Url(s: string): string {
  const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(s)))
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function encodeBundle(items: ShareItem[]): string {
  const packed: Packed[] = items.map((i) => ({
    n: i.name.slice(0, 40),
    a: i.address,
    m: i.amount,
    f: FREQS.indexOf(i.frequency) as 0 | 1 | 2,
  }))
  return toBase64Url(JSON.stringify(packed))
}

/** Decode + validate. Returns null on any malformed/invalid input. */
export function decodeBundle(code: string): ShareItem[] | null {
  try {
    const packed = JSON.parse(fromBase64Url(code)) as Packed[]
    if (!Array.isArray(packed) || packed.length === 0 || packed.length > 50) return null

    const items: ShareItem[] = []
    for (const p of packed) {
      if (typeof p.a !== 'string' || !isAddress(p.a)) return null
      const amount = Number(p.m)
      if (!isFinite(amount) || amount <= 0) return null
      const frequency = FREQS[p.f] ?? 'monthly'
      const name = typeof p.n === 'string' && p.n.trim() ? p.n.slice(0, 40) : 'Recipient'
      items.push({ name, address: p.a as `0x${string}`, amount, frequency })
    }
    return items
  } catch {
    return null
  }
}

/** Build the shareable link that opens Bundl's import screen. */
export function buildShareUrl(items: Recurring[]): string {
  const shareItems: ShareItem[] = items.map((r) => ({
    name: r.name,
    address: r.address,
    amount: r.amount,
    frequency: r.frequency ?? 'monthly',
  }))
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://bundl-teal.vercel.app'
  return `${origin}/import?b=${encodeBundle(shareItems)}`
}
