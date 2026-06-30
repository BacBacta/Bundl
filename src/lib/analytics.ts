// On-chain analytics for the Disperse contract, read from the public block
// explorer (no indexer needed for MVP). Powers the /stats page with real
// numbers MiniPay reviewers look for: settlements, unique users, network fees,
// failed-tx rate, and recent activity.

import { formatUnits } from 'viem'
import { ACTIVE_CHAIN, celoMainnet } from './chains'
import { DISPERSE_ADDRESS } from './tokens'

const BLOCKSCOUT_API =
  ACTIVE_CHAIN.id === celoMainnet.id
    ? 'https://celo.blockscout.com/api'
    : 'https://celo-sepolia.blockscout.com/api'

interface RawTx {
  from: string
  gasUsed: string
  gasPrice: string
  isError: string
  timeStamp: string
}

export interface ContractStats {
  settlements: number
  uniqueUsers: number
  networkFees: number // in native gas token (CELO), summed gasUsed × gasPrice
  failedRate: number // 0–1
  last7d: number
  last30d: number
  deployed: boolean
}

export async function fetchContractStats(): Promise<ContractStats | null> {
  if (DISPERSE_ADDRESS === '0x0000000000000000000000000000000000000000') {
    return { settlements: 0, uniqueUsers: 0, networkFees: 0, failedRate: 0, last7d: 0, last30d: 0, deployed: false }
  }

  let txs: RawTx[] = []
  try {
    const url = `${BLOCKSCOUT_API}?module=account&action=txlist&address=${DISPERSE_ADDRESS}&sort=desc`
    const res = await fetch(url)
    const json = await res.json()
    if (json.status !== '1' || !Array.isArray(json.result)) {
      return { settlements: 0, uniqueUsers: 0, networkFees: 0, failedRate: 0, last7d: 0, last30d: 0, deployed: true }
    }
    txs = json.result as RawTx[]
  } catch {
    return null
  }

  const now = Date.now()
  const day = 86_400_000
  const users = new Set<string>()
  let failed = 0
  let feesWei = 0n
  let last7d = 0
  let last30d = 0

  for (const t of txs) {
    users.add(t.from?.toLowerCase())
    if (t.isError === '1') failed++
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
    settlements: txs.length,
    uniqueUsers: users.size,
    networkFees: Number(formatUnits(feesWei, 18)),
    failedRate: txs.length ? failed / txs.length : 0,
    last7d,
    last30d,
    deployed: true,
  }
}
