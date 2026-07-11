// Reconstruct payment history from the chain so it survives a cache clear or a
// fresh device. Bundl has two outgoing money-movement flows and both must show
// up here:
//   - Bundle settlements (Disperse.disperseToken): one tx, 2+ Transfer events.
//   - Solo payments (transferToken, used by /pay for Requests/Splits): one tx,
//     exactly 1 Transfer event.
// Both are derived from the SAME outgoing-transfer fetch, grouped by tx hash —
// no extra network call needed. The chain is the source of truth; localStorage
// is just a cache (see mergeBundles / mergePayments).

import { formatUnits } from 'viem'
import { ACTIVE_CHAIN, celoMainnet } from './chains'
import { TESTNET_STABLECOINS, STABLECOINS } from './tokens'
import { resolveDisplayName } from './socialconnect'
import { round2 } from './format'
import { fetchWithTimeout } from './net'
import type { Bundle, BundleLine, Payment } from './storage'

const BLOCKSCOUT_API =
  ACTIVE_CHAIN.id === celoMainnet.id
    ? 'https://celo.blockscout.com/api'
    : 'https://celo-sepolia.blockscout.com/api'

const STABLE_ADDRESSES = new Set(
  [...Object.values(ACTIVE_CHAIN.id === celoMainnet.id ? STABLECOINS : TESTNET_STABLECOINS)].map(
    (t) => t.address.toLowerCase(),
  ),
)

// Every transfer we keep is one of our configured stablecoins, so trust the
// local token config for decimals first — Blockscout occasionally omits or
// zeroes `tokenDecimal`, and a blind 18 fallback misreads USDC (6) by 10^12.
const DECIMALS_BY_ADDRESS = new Map(
  [...Object.values(ACTIVE_CHAIN.id === celoMainnet.id ? STABLECOINS : TESTNET_STABLECOINS)].map(
    (t) => [t.address.toLowerCase(), t.decimals],
  ),
)

function decimalsFor(t: { contractAddress: string; tokenDecimal: string }): number {
  const known = DECIMALS_BY_ADDRESS.get(t.contractAddress?.toLowerCase())
  if (known !== undefined) return known
  const reported = Number(t.tokenDecimal)
  return reported >= 1 && reported <= 18 ? reported : 18
}

interface RawTransfer {
  hash: string
  from: string
  to: string
  value: string
  contractAddress: string
  tokenDecimal: string
  timeStamp: string
}

export interface OnchainActivity {
  bundles: Bundle[]
  payments: Payment[]
}

/**
 * Fetch and reconstruct the user's outgoing activity from the chain: bundle
 * settlements and solo payments, both newest-first. Never throws — returns
 * empty arrays on failure.
 */
export async function fetchOnchainActivity(userAddress: `0x${string}`): Promise<OnchainActivity> {
  let transfers: RawTransfer[] = []
  try {
    const url = `${BLOCKSCOUT_API}?module=account&action=tokentx&address=${userAddress}&sort=desc`
    const res = await fetchWithTimeout(url)
    const json = await res.json()
    if (json.status !== '1' || !Array.isArray(json.result)) return { bundles: [], payments: [] }
    transfers = json.result as RawTransfer[]
  } catch {
    return { bundles: [], payments: [] }
  }

  const user = userAddress.toLowerCase()
  const outgoing = transfers.filter(
    (t) => t.from?.toLowerCase() === user && STABLE_ADDRESSES.has(t.contractAddress?.toLowerCase()),
  )

  // Group by transaction hash — one hash = one on-chain action.
  const byHash = new Map<string, RawTransfer[]>()
  for (const t of outgoing) {
    const arr = byHash.get(t.hash) ?? []
    arr.push(t)
    byHash.set(t.hash, arr)
  }

  const bundles: Bundle[] = []
  const payments: Payment[] = []

  for (const [hash, txs] of byHash) {
    const ms = Number(txs[0].timeStamp) * 1000
    const date = new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

    if (txs.length >= 2) {
      // Bundle settlement: 2+ transfers in one tx.
      const lines: BundleLine[] = txs.map((t) => {
        const decimals = decimalsFor(t)
        return {
          name: resolveDisplayName(t.to),
          address: t.to,
          amount: round2(Number(formatUnits(BigInt(t.value), decimals))),
        }
      })
      const total = round2(lines.reduce((s, l) => s + l.amount, 0))
      bundles.push({ id: String(ms), date, total, txHash: hash, lines })
    } else {
      // Solo payment: exactly 1 transfer in its own tx (Request / Split via /pay).
      const t = txs[0]
      const decimals = decimalsFor(t)
      const amount = round2(Number(formatUnits(BigInt(t.value), decimals)))
      payments.push({
        id: String(ms),
        date,
        txHash: hash,
        to: t.to,
        toName: resolveDisplayName(t.to),
        amount,
      })
    }
  }

  return { bundles, payments }
}

/** Merge on-chain bundles with the local cache, de-duplicated by tx hash. */
export function mergeBundles(local: Bundle[], chain: Bundle[]): Bundle[] {
  const byHash = new Map<string, Bundle>()
  // Chain first (source of truth), then let local override for richer names.
  // A local entry without a hash (e.g. saved before confirmation) can't be
  // deduped, but must still show up rather than vanish from the timeline.
  const unhashed: Bundle[] = []
  for (const b of chain) byHash.set(b.txHash.toLowerCase(), b)
  for (const b of local) {
    if (b.txHash) byHash.set(b.txHash.toLowerCase(), b)
    else unhashed.push(b)
  }
  return [...byHash.values(), ...unhashed].sort((a, b) => Number(b.id) - Number(a.id) || 0)
}

/** Merge on-chain payments with the local cache, de-duplicated by tx hash. */
export function mergePayments(local: Payment[], chain: Payment[]): Payment[] {
  const byHash = new Map<string, Payment>()
  const unhashed: Payment[] = []
  for (const p of chain) byHash.set(p.txHash.toLowerCase(), p)
  for (const p of local) {
    if (p.txHash) byHash.set(p.txHash.toLowerCase(), p)
    else unhashed.push(p)
  }
  return [...byHash.values(), ...unhashed].sort((a, b) => Number(b.id) - Number(a.id) || 0)
}

export interface IncomingTransfer {
  from: string
  amount: number
  txHash: string
  ms: number
}

/**
 * Fetch incoming stablecoin transfers to `userAddress` since `sinceMs` (used
 * to power the "payment received" notification — see lib/notifications.ts).
 * Never throws — returns [] on failure.
 */
export async function fetchIncomingTransfers(
  userAddress: `0x${string}`,
  sinceMs: number,
): Promise<IncomingTransfer[]> {
  try {
    const url = `${BLOCKSCOUT_API}?module=account&action=tokentx&address=${userAddress}&sort=desc`
    const res = await fetchWithTimeout(url)
    const json = await res.json()
    if (json.status !== '1' || !Array.isArray(json.result)) return []
    const transfers = json.result as RawTransfer[]

    const user = userAddress.toLowerCase()
    return transfers
      .filter((t) => t.to?.toLowerCase() === user && STABLE_ADDRESSES.has(t.contractAddress?.toLowerCase()))
      .map((t) => {
        const decimals = decimalsFor(t)
        return {
          from: t.from,
          amount: round2(Number(formatUnits(BigInt(t.value), decimals))),
          txHash: t.hash,
          ms: Number(t.timeStamp) * 1000,
        }
      })
      .filter((t) => t.ms > sinceMs)
  } catch {
    return []
  }
}
