// T8 — read the user's public on-chain history and surface likely recurring
// payments. Read-only; the only network call is to a public block explorer.

import { formatUnits } from 'viem'
import { ACTIVE_CHAIN, celoMainnet } from './chains'
import { TESTNET_STABLECOINS, STABLECOINS } from './tokens'
import { resolveDisplayName } from './socialconnect'

// Blockscout REST API base per network (free, no key, good pagination).
const BLOCKSCOUT_API =
  ACTIVE_CHAIN.id === celoMainnet.id
    ? 'https://celo.blockscout.com/api'
    : 'https://celo-sepolia.blockscout.com/api'

// Lowercased set of stablecoin addresses we care about (ignore other tokens).
const STABLE_ADDRESSES = new Set(
  [
    ...Object.values(ACTIVE_CHAIN.id === celoMainnet.id ? STABLECOINS : TESTNET_STABLECOINS),
  ].map((t) => t.address.toLowerCase()),
)

interface RawTransfer {
  from: string
  to: string
  value: string
  contractAddress: string
  tokenDecimal: string
  tokenSymbol: string
  timeStamp: string
}

export interface DetectedPayment {
  address: `0x${string}`
  name: string
  suggestedAmount: number
  cadence: 'weekly' | 'biweekly' | 'monthly' | 'recurring'
  count: number
  tokenSymbol: string
  confidence: number // 0–1
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

function classifyCadence(gapDays: number): DetectedPayment['cadence'] {
  if (gapDays >= 5 && gapDays <= 9) return 'weekly'
  if (gapDays >= 12 && gapDays <= 18) return 'biweekly'
  if (gapDays >= 25 && gapDays <= 38) return 'monthly'
  return 'recurring'
}

/**
 * Fetch outgoing stablecoin transfers and detect recurring counterparties.
 * Returns suggestions sorted by confidence. Never throws — returns [] on failure.
 */
export async function detectRecurringPayments(
  userAddress: `0x${string}`,
): Promise<DetectedPayment[]> {
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

  // Outgoing stablecoin transfers only.
  const user = userAddress.toLowerCase()
  const outgoing = transfers.filter(
    (t) =>
      t.from?.toLowerCase() === user &&
      STABLE_ADDRESSES.has(t.contractAddress?.toLowerCase()),
  )

  // Group by recipient.
  const byRecipient = new Map<string, RawTransfer[]>()
  for (const t of outgoing) {
    const key = t.to.toLowerCase()
    if (!byRecipient.has(key)) byRecipient.set(key, [])
    byRecipient.get(key)!.push(t)
  }

  const suggestions: DetectedPayment[] = []

  for (const [recipient, txs] of byRecipient) {
    if (txs.length < 2) continue // one-off → not recurring

    const decimals = Number(txs[0].tokenDecimal) || 18
    const amounts = txs.map((t) => Number(formatUnits(BigInt(t.value), decimals)))
    const med = median(amounts)
    if (med <= 0) continue

    // Amount consistency: how many transfers are within ±25% of the median.
    const consistent = amounts.filter((a) => Math.abs(a - med) / med <= 0.25).length
    const amountScore = consistent / amounts.length
    if (amountScore < 0.5) continue // amounts too erratic → likely not a bill

    // Cadence: median gap between consecutive (time-sorted) transfers.
    const times = txs.map((t) => Number(t.timeStamp) * 1000).sort((a, b) => a - b)
    const gaps: number[] = []
    for (let i = 1; i < times.length; i++) {
      gaps.push((times[i] - times[i - 1]) / 86_400_000)
    }
    const medGap = gaps.length ? median(gaps) : 0
    const cadence = classifyCadence(medGap)

    // Confidence: more transfers + consistent amounts + recognised cadence.
    const countScore = Math.min(1, txs.length / 4)
    const cadenceScore = cadence === 'recurring' ? 0.5 : 1
    const confidence = +(0.4 * countScore + 0.4 * amountScore + 0.2 * cadenceScore).toFixed(2)

    suggestions.push({
      address: recipient as `0x${string}`,
      name: resolveDisplayName(recipient),
      suggestedAmount: Math.round(med * 100) / 100,
      cadence,
      count: txs.length,
      tokenSymbol: txs[0].tokenSymbol || 'USD',
      confidence,
    })
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence)
}

// Testnet has little history — seed a few realistic candidates for demo/dev.
export const MOCK_SUGGESTIONS: DetectedPayment[] = [
  { address: '0x1111111111111111111111111111111111111111', name: 'Landlord', suggestedAmount: 120, cadence: 'monthly', count: 4, tokenSymbol: 'USDC', confidence: 0.95 },
  { address: '0x2222222222222222222222222222222222222222', name: 'Mum', suggestedAmount: 50, cadence: 'weekly', count: 8, tokenSymbol: 'USDC', confidence: 0.88 },
  { address: '0x3333333333333333333333333333333333333333', name: 'Mr Okoye (school)', suggestedAmount: 35, cadence: 'monthly', count: 3, tokenSymbol: 'USDC', confidence: 0.72 },
]
