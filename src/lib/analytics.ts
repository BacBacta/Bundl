// On-chain analytics for the Disperse contract, read from the public block
// explorer (no indexer needed for MVP). Powers the /stats page with real
// numbers MiniPay reviewers look for: settlements, unique users, network fees,
// failed-tx rate, and recent activity.
//
// Security note (audit finding, fixed here): `disperseToken` accepts an
// unrestricted `token` parameter with no on-chain allowlist, and nothing stops
// a caller from self-transferring dust amounts of a freely-mintable token.
// Counting every raw transaction to the contract as a "settlement" made these
// public metrics trivially fabricable at near-zero cost. We now only count a
// settlement when its BundleSettled event's `token` argument is a KNOWN
// stablecoin — decoded straight from the event log, not trusted from the
// tx list — so a wash-trading attempt with a junk token is filtered out.

import { formatUnits } from 'viem'
import { ACTIVE_CHAIN, celoMainnet } from './chains'
import { DISPERSE_ADDRESS, TESTNET_STABLECOINS, STABLECOINS } from './tokens'

const BLOCKSCOUT_API =
  ACTIVE_CHAIN.id === celoMainnet.id
    ? 'https://celo.blockscout.com/api'
    : 'https://celo-sepolia.blockscout.com/api'

// keccak256("BundleSettled(address,address,uint256,uint256)")
const BUNDLE_SETTLED_TOPIC0 = '0x50aec51cf5711a555a004666ca126b8e2d31d0636857f08b0f12565dccdf0aed'

const STABLE_ADDRESSES = new Set(
  [...Object.values(ACTIVE_CHAIN.id === celoMainnet.id ? STABLECOINS : TESTNET_STABLECOINS)].map(
    (t) => t.address.toLowerCase(),
  ),
)

interface RawTx {
  hash: string
  from: string
  gasUsed: string
  gasPrice: string
  isError: string
  timeStamp: string
}

interface RawLog {
  transactionHash: string
  topics: string[]
  timeStamp: string
}

export interface ContractStats {
  settlements: number
  uniqueUsers: number
  networkFees: number // in native gas token (CELO), summed gasUsed × gasPrice
  failedRate: number // 0–1, over ALL calls (not just verified settlements)
  last7d: number
  last30d: number
  deployed: boolean
}

const EMPTY: Omit<ContractStats, 'deployed'> = {
  settlements: 0,
  uniqueUsers: 0,
  networkFees: 0,
  failedRate: 0,
  last7d: 0,
  last30d: 0,
}

export async function fetchContractStats(): Promise<ContractStats | null> {
  if (DISPERSE_ADDRESS === '0x0000000000000000000000000000000000000000') {
    return { ...EMPTY, deployed: false }
  }

  let txs: RawTx[] = []
  let logs: RawLog[] = []
  try {
    const [txRes, logRes] = await Promise.all([
      fetch(`${BLOCKSCOUT_API}?module=account&action=txlist&address=${DISPERSE_ADDRESS}&sort=desc`),
      fetch(
        `${BLOCKSCOUT_API}?module=logs&action=getLogs&address=${DISPERSE_ADDRESS}&topic0=${BUNDLE_SETTLED_TOPIC0}&fromBlock=0&toBlock=latest`,
      ),
    ])
    const txJson = await txRes.json()
    const logJson = await logRes.json()
    if (txJson.status === '1' && Array.isArray(txJson.result)) txs = txJson.result as RawTx[]
    if (logJson.status === '1' && Array.isArray(logJson.result)) logs = logJson.result as RawLog[]
  } catch {
    return null
  }

  if (txs.length === 0 && logs.length === 0) return { ...EMPTY, deployed: true }

  // Verify each BundleSettled log against the known-stablecoin allowlist.
  // topics: [0]=event sig, [1]=payer (indexed), [2]=token (indexed)
  const verifiedHashes = new Set<string>()
  const verifiedUsers = new Set<string>()
  for (const log of logs) {
    const tokenTopic = log.topics?.[2]
    if (!tokenTopic) continue
    const token = ('0x' + tokenTopic.slice(-40)).toLowerCase()
    if (!STABLE_ADDRESSES.has(token)) continue
    verifiedHashes.add(log.transactionHash.toLowerCase())
    const payerTopic = log.topics?.[1]
    if (payerTopic) verifiedUsers.add(('0x' + payerTopic.slice(-40)).toLowerCase())
  }

  const now = Date.now()
  const day = 86_400_000
  let failed = 0
  let feesWei = 0n
  let last7d = 0
  let last30d = 0

  for (const t of txs) {
    if (t.isError === '1') failed++ // failure rate is measured over ALL calls, not just verified ones
    if (!verifiedHashes.has(t.hash?.toLowerCase())) continue // fees/recency only count verified settlements
    try {
      feesWei += BigInt(t.gasUsed || '0') * BigInt(t.gasPrice || '0')
    } catch {
      /* skip malformed */
    }
    const age = now - Number(t.timeStamp) * 1000
    if (age <= 7 * day) last7d++
    if (age <= 30 * day) last30d++
  }

  return {
    settlements: verifiedHashes.size,
    uniqueUsers: verifiedUsers.size,
    networkFees: Number(formatUnits(feesWei, 18)),
    failedRate: txs.length ? failed / txs.length : 0,
    last7d,
    last30d,
    deployed: true,
  }
}
