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
import { getCachedName, shortenAddress } from './socialconnect'
import { round2 } from './format'
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
    const res = await fetch(url)
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
        const decimals = Number(t.tokenDecimal) || 18
        return {
          name: getCachedName(t.to) ?? shortenAddress(t.to),
          address: t.to,
          amount: round2(Number(formatUnits(BigInt(t.value), decimals))),
        }
      })
      const total = round2(lines.reduce((s, l) => s + l.amount, 0))
      bundles.push({ id: String(ms), date, total, txHash: hash, lines })
    } else {
      // Solo payment: exactly 1 transfer in its own tx (Request / Split via /pay).
      const t = txs[0]
      const decimals = Number(t.tokenDecimal) || 18
      const amount = round2(Number(formatUnits(BigInt(t.value), decimals)))
      payments.push({
        id: String(ms),
        date,
        txHash: hash,
        to: t.to,
        toName: getCachedName(t.to) ?? shortenAddress(t.to),
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
  for (const b of chain) byHash.set(b.txHash.toLowerCase(), b)
  for (const b of local) {
    if (b.txHash) byHash.set(b.txHash.toLowerCase(), b)
  }
  return [...byHash.values()].sort((a, b) => Number(b.id) - Number(a.id) || 0)
}

/** Merge on-chain payments with the local cache, de-duplicated by tx hash. */
export function mergePayments(local: Payment[], chain: Payment[]): Payment[] {
  const byHash = new Map<string, Payment>()
  for (const p of chain) byHash.set(p.txHash.toLowerCase(), p)
  for (const p of local) {
    if (p.txHash) byHash.set(p.txHash.toLowerCase(), p)
  }
  return [...byHash.values()].sort((a, b) => Number(b.id) - Number(a.id) || 0)
}
