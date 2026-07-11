import { maxUint256 } from 'viem'
import { getPublicClient, getWalletClient, getAccount } from './wallet'
import { DISPERSE_ADDRESS } from './tokens'

const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const

const ERC20_TRANSFER_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

const DISPERSE_ABI = [
  {
    name: 'disperseToken',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'recipients', type: 'address[]' },
      { name: 'amounts', type: 'uint256[]' },
    ],
    outputs: [],
  },
  {
    name: 'feeBps',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint96' }],
  },
] as const

/**
 * Protocol fee in basis points, read from the contract (the contract charges
 * it on top of the dispersed total — the app only mirrors it for display).
 * Returns 0 if the contract is unreachable so display never blocks settlement.
 */
export async function getFeeBps(): Promise<number> {
  try {
    const client = getPublicClient()
    return Number(
      await client.readContract({ address: DISPERSE_ADDRESS, abi: DISPERSE_ABI, functionName: 'feeBps' }),
    )
  } catch {
    return 0
  }
}

export async function getTokenDecimals(tokenAddress: `0x${string}`): Promise<number> {
  const client = getPublicClient()
  return Number(
    await client.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'decimals',
    }),
  )
}

/**
 * Approve DISPERSE_ADDRESS to spend up to maxUint256 of the token.
 * Skips the tx if the current allowance already covers totalAmount.
 * Uses legacy tx type — no EIP-1559 fields (MiniPay requirement).
 *
 * @param feeCurrency  Optional Celo fee-currency token address (pay gas in stablecoin).
 *                     Leave undefined to pay gas in native CELO (default / safer for tests).
 * @returns tx hash if an approve was sent, null if allowance was already sufficient.
 */
export async function ensureApproval(
  tokenAddress: `0x${string}`,
  totalAmount: bigint,
  feeCurrency?: `0x${string}`,
): Promise<`0x${string}` | null> {
  const publicClient = getPublicClient()
  const walletClient = getWalletClient()
  if (!walletClient) throw new Error('No wallet — run inside MiniPay or a compatible browser wallet')

  const account = await getAccount()
  if (!account) throw new Error('No account found')

  const allowance = await publicClient.readContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [account, DISPERSE_ADDRESS],
  })

  if (allowance >= totalAmount) return null

  const hash = await walletClient.writeContract({
    account,
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [DISPERSE_ADDRESS, maxUint256],
    type: 'legacy',
    ...(feeCurrency ? { feeCurrency } : {}),
  })

  await publicClient.waitForTransactionReceipt({ hash })
  return hash
}

/**
 * Submit disperseToken and return the tx hash WITHOUT waiting for the receipt.
 * Callers that need confirmation should follow up with waitForTx(hash) — keeping
 * the two steps separate lets a timed-out wait be retried without re-submitting
 * (and double-paying).
 */
export async function submitDisperse(
  tokenAddress: `0x${string}`,
  recipients: `0x${string}`[],
  amounts: bigint[],
  feeCurrency?: `0x${string}`,
): Promise<`0x${string}`> {
  const walletClient = getWalletClient()
  if (!walletClient) throw new Error('No wallet — run inside MiniPay or a compatible browser wallet')

  const account = await getAccount()
  if (!account) throw new Error('No account found')

  return walletClient.writeContract({
    account,
    address: DISPERSE_ADDRESS,
    abi: DISPERSE_ABI,
    functionName: 'disperseToken',
    args: [tokenAddress, recipients, amounts],
    type: 'legacy',
    ...(feeCurrency ? { feeCurrency } : {}),
  })
}

/** Wait for a submitted tx to confirm. Throws if the tx reverted. */
export async function waitForTx(hash: `0x${string}`): Promise<void> {
  const receipt = await getPublicClient().waitForTransactionReceipt({ hash })
  if (receipt.status !== 'success') throw new Error('Transaction reverted')
}

/**
 * Call disperseToken: one tx fans out to N recipients directly (non-custodial).
 * Legacy tx type — no EIP-1559 fields.
 */
export async function disperseToken(
  tokenAddress: `0x${string}`,
  recipients: `0x${string}`[],
  amounts: bigint[],
  feeCurrency?: `0x${string}`,
): Promise<`0x${string}`> {
  const hash = await submitDisperse(tokenAddress, recipients, amounts, feeCurrency)
  await waitForTx(hash)
  return hash
}

/**
 * Direct one-to-one stablecoin transfer (for paying a request/split).
 * No Disperse contract, no approval — a single ERC20 transfer. Legacy tx.
 */
export async function transferToken(
  tokenAddress: `0x${string}`,
  to: `0x${string}`,
  amount: bigint,
  feeCurrency?: `0x${string}`,
): Promise<`0x${string}`> {
  const publicClient = getPublicClient()
  const walletClient = getWalletClient()
  if (!walletClient) throw new Error('No wallet — run inside MiniPay or a compatible browser wallet')

  const account = await getAccount()
  if (!account) throw new Error('No account found')

  const hash = await walletClient.writeContract({
    account,
    address: tokenAddress,
    abi: ERC20_TRANSFER_ABI,
    functionName: 'transfer',
    args: [to, amount],
    type: 'legacy',
    ...(feeCurrency ? { feeCurrency } : {}),
  })

  await publicClient.waitForTransactionReceipt({ hash })
  return hash
}
