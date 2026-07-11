// Payment requests + bill splits — encode a "pay me" request into a URL-safe
// link (no backend). Opening the link lets the recipient pay the requester
// directly (one transfer). Non-custodial: the link only carries the payee's
// address, an amount, and an optional note.

import { isAddress } from 'viem'
import { toBase64Url, fromBase64Url } from './urlcode'

export interface PaymentRequest {
  to: `0x${string}` // payee (the requester)
  amount: number
  note?: string
  name?: string // payee display name
}

// Short keys keep the URL compact: t=to, m=amount, n=note, w=who(name).
type Packed = { t: string; m: number; n?: string; w?: string }

export function encodeRequest(req: PaymentRequest): string {
  const packed: Packed = {
    t: req.to,
    m: req.amount,
    ...(req.note ? { n: req.note.slice(0, 60) } : {}),
    ...(req.name ? { w: req.name.slice(0, 40) } : {}),
  }
  return toBase64Url(JSON.stringify(packed))
}

/** Decode + validate. Returns null on malformed/invalid input. */
export function decodeRequest(code: string): PaymentRequest | null {
  try {
    const p = JSON.parse(fromBase64Url(code)) as Packed
    if (typeof p.t !== 'string' || !isAddress(p.t)) return null
    const amount = Math.round(Number(p.m) * 100) / 100
    // Cap: a forged link must not render an absurd "$1e15" request.
    if (!isFinite(amount) || amount <= 0 || amount > 1_000_000) return null
    return {
      to: p.t as `0x${string}`,
      amount,
      note: typeof p.n === 'string' ? p.n.slice(0, 60) : undefined,
      name: typeof p.w === 'string' ? p.w.slice(0, 40) : undefined,
    }
  } catch {
    return null
  }
}

export function buildRequestUrl(req: PaymentRequest): string {
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://bundl-teal.vercel.app'
  return `${origin}/pay?r=${encodeRequest(req)}`
}
