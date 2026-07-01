import { createPublicClient, http, erc20Abi, formatUnits } from 'viem'
import { ACTIVE_CHAIN } from './chains'
import { TOKENS, DEEPLINKS } from './tokens'

export interface StablecoinBalance {
  key: string
  address: `0x${string}`
  symbol: string
  decimals: number
  balance: bigint
  humanBalance: number
}

const client = createPublicClient({ chain: ACTIVE_CHAIN, transport: http() })

/**
 * Returns all stablecoins with a non-zero balance, sorted highest-first.
 * Silently skips tokens that fail (e.g. undeployed contract).
 */
export async function getAllStablecoinBalances(
  userAddress: `0x${string}`,
): Promise<StablecoinBalance[]> {
  const entries = Object.entries(TOKENS).map(([key, token]) => ({ key, ...token }))

  const results = await Promise.allSettled(
    entries.map(async (token) => {
      const balance = await client.readContract({
        address: token.address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [userAddress],
      })
      return {
        key: token.key,
        address: token.address,
        symbol: token.symbol,
        decimals: token.decimals,
        balance,
        humanBalance: Number(formatUnits(balance, token.decimals)),
      } as StablecoinBalance
    }),
  )

  return results
    .filter(
      (r): r is PromiseFulfilledResult<StablecoinBalance> =>
        r.status === 'fulfilled' && r.value.balance > 0n,
    )
    .map((r) => r.value)
    .sort((a, b) => b.humanBalance - a.humanBalance)
}

/**
 * Convenience: returns the single stablecoin with the highest balance,
 * or null if the user holds nothing.
 */
export async function getPreferredStablecoin(
  userAddress: `0x${string}`,
): Promise<StablecoinBalance | null> {
  const all = await getAllStablecoinBalances(userAddress)
  return all[0] ?? null
}

/**
 * Redirect to MiniPay's native deposit flow when the user has no stablecoin balance.
 * Call this instead of showing a generic error.
 */
export function redirectToDeposit() {
  window.location.href = DEEPLINKS.addCash
}
