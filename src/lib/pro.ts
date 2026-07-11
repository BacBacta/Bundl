// Bundl Pro — a one-time on-chain upgrade, verified via the block explorer
// (no backend, no subscription server). Non-custodial: unlocking Pro is just
// a normal stablecoin transfer to the treasury address, same trust model as
// the existing $0.15 settlement fee — the app decides what "Pro" means and
// checks a public, verifiable payment before unlocking it client-side.
//
// This is not bulletproof DRM (nothing client-side-only can be), but it's an
// honest, verifiable gate: the check reads real on-chain history, not a flag
// anyone can flip locally.

import { ACTIVE_CHAIN, celoMainnet } from './chains'
import { TESTNET_STABLECOINS, STABLECOINS, FEE_RECIPIENT } from './tokens'
import { fetchWithTimeout } from './net'

export const PRO_PRICE_USD = 5
export const FREE_TIER_MAX_RECIPIENTS = 5
export const PRO_TIER_MAX_RECIPIENTS = 150 // mirrors Disperse.MAX_RECIPIENTS

const BLOCKSCOUT_API =
  ACTIVE_CHAIN.id === celoMainnet.id
    ? 'https://celo.blockscout.com/api'
    : 'https://celo-sepolia.blockscout.com/api'

const STABLE_ADDRESSES = new Set(
  [...Object.values(ACTIVE_CHAIN.id === celoMainnet.id ? STABLECOINS : TESTNET_STABLECOINS)].map(
    (t) => t.address.toLowerCase(),
  ),
)

const CACHE_KEY = 'bundl_pro_status'

const CACHE_TTL_MS = 24 * 60 * 60 * 1000

export function getCachedProStatus(): boolean {
  if (typeof window === 'undefined') return false
  // TTL'd cache: instant UI on load, but re-verified on-chain within a day —
  // a stale flag (different wallet, cleared payment) can't stick forever.
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return false
    if (raw === '1') return true // pre-TTL format
    const { v, at } = JSON.parse(raw) as { v: boolean; at: number }
    return v && Date.now() - at < CACHE_TTL_MS
  } catch {
    return false
  }
}

function setCachedProStatus(v: boolean) {
  if (typeof window === 'undefined') return
  localStorage.setItem(CACHE_KEY, JSON.stringify({ v, at: Date.now() }))
}

/**
 * Checks whether the user has ever sent >= PRO_PRICE_USD to the treasury
 * address. Caches a positive result locally (Pro never expires once paid).
 * Never throws — returns the cached value (default false) on failure.
 */
export async function checkProStatus(userAddress: `0x${string}`): Promise<boolean> {
  if (getCachedProStatus()) return true
  if (FEE_RECIPIENT === '0x0000000000000000000000000000000000000000') return false

  try {
    const url = `${BLOCKSCOUT_API}?module=account&action=tokentx&address=${userAddress}&sort=desc`
    const res = await fetchWithTimeout(url)
    const json = await res.json()
    if (json.status !== '1' || !Array.isArray(json.result)) return false

    const user = userAddress.toLowerCase()
    const treasury = FEE_RECIPIENT.toLowerCase()
    interface Tx { from: string; to: string; value: string; tokenDecimal: string; contractAddress: string }
    const paid = (json.result as Tx[]).some((t) => {
      if (t.from?.toLowerCase() !== user || t.to?.toLowerCase() !== treasury) return false
      if (!STABLE_ADDRESSES.has(t.contractAddress?.toLowerCase())) return false
      const decimals = Number(t.tokenDecimal) || 18
      const amount = Number(t.value) / 10 ** decimals
      return amount >= PRO_PRICE_USD
    })

    if (paid) setCachedProStatus(true)
    return paid
  } catch {
    return false
  }
}

export function maxRecipientsFor(isPro: boolean): number {
  return isPro ? PRO_TIER_MAX_RECIPIENTS : FREE_TIER_MAX_RECIPIENTS
}
