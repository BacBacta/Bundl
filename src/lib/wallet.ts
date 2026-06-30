import { createPublicClient, createWalletClient, custom, http } from 'viem'
import { ACTIVE_CHAIN } from './chains'

declare global {
  interface Window {
    ethereum?: {
      isMiniPay?: boolean
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      [key: string]: unknown
    }
  }
}

export function getPublicClient() {
  return createPublicClient({
    chain: ACTIVE_CHAIN,
    transport: http(),
  })
}

export function getWalletClient() {
  if (typeof window === 'undefined' || !window.ethereum) return null
  return createWalletClient({
    chain: ACTIVE_CHAIN,
    transport: custom(window.ethereum),
  })
}

export async function getAccount(): Promise<`0x${string}` | null> {
  const client = getWalletClient()
  if (!client) return null
  try {
    const addresses = await client.getAddresses()
    return addresses[0] ?? null
  } catch {
    return null
  }
}

export function isMiniPay(): boolean {
  if (typeof window === 'undefined') return false
  return !!window.ethereum?.isMiniPay
}
