// Reconstruct settlement history from the chain so it survives a cache clear or
// a fresh device. A Bundl settlement is one transaction that fans a stablecoin
// out to several recipients — so we fetch the user's outgoing stablecoin
// transfers and group them by transaction hash; any hash with 2+ transfers is a
// bundle. The chain is the source of truth; localStorage is just a cache.

import { formatUnits } from 'viem'
import { ACTIVE_CHAIN, celoMainnet } from './chains'
import { TESTNET_STABLECOINS, STABLECOINS } from './tokens'
import { getCachedName, shortenAddress } from './socialconnect'
import { round2 } from './format'
import type { Bundle, BundleLine } from './storage'

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

/**
 * Fetch and reconstruct the user's settled bundles from on-chain transfers.
 * Returns bundles newest-first. Never throws — returns [] on failure.
 */
export async function fetchOnchainBundles(userAddress: `0x${string}`): Promise<Bundle[]> {
  let transfers: RawTransfer[] = []
  try {
    const url = `${BLOCKSCOUT_API}?module=account&action=tokentx&address=${userAddress}&sort=desc`
    const res = await fetch(url)
    const json = await res.json()
    if (json.status !== '1' || !Array.isArray(json.result)) return []
    transfers = json.result as RawTransfer[]
  } catch {
    return []
  }

  const user = userAddress.toLowerCase()
  const outgoing = transfers.filter(
    (t) => t.from?.toLowerCase() === user && STABLE_ADDRESSES.has(t.contractAddress?.toLowerCase()),
  )

  // Group by transaction hash — one hash = one settlement.
  const byHash = new Map<string, RawTransfer[]>()
  for (const t of outgoing) {
    const arr = byHash.get(t.hash) ?? []
    arr.push(t)
    byHash.set(t.hash, arr)
  }

  const bundles: Bundle[] = []
  for (const [hash, txs] of byHash) {
    if (txs.length < 2) continue // single transfer is a normal send, not a bundle

    const lines: BundleLine[] = txs.map((t) => {
      const decimals = Number(t.tokenDecimal) || 18
      return {
        name: getCachedName(t.to) ?? shortenAddress(t.to),
        address: t.to,
        amount: round2(Number(formatUnits(BigInt(t.value), decimals))),
      }
    })
    const total = round2(lines.reduce((s, l) => s + l.amount, 0))
    const ms = Number(txs[0].timeStamp) * 1000
    const date = new Date(ms).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })

    // id is a numeric (ms) sort key shared with local bundles; txHash holds the hash.
    bundles.push({ id: String(ms), date, total, txHash: hash, lines })
  }

  return bundles
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
