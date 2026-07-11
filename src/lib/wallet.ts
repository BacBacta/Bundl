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
    // Race a timeout: a wedged provider (flaky MiniPay webview) must not
    // leave callers stuck on "Connecting wallet…" forever.
    const addresses = await Promise.race([
      client.getAddresses(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('wallet timeout')), 8000)),
    ])
    return addresses[0] ?? null
  } catch {
    return null
  }
}

/**
 * Reload on wallet account/chain switches — the whole UI (balances, recurring,
 * history) is derived from the active account, so a full refresh is the only
 * state that is guaranteed consistent. Returns a cleanup function.
 */
export function onWalletChanged(): () => void {
  if (typeof window === 'undefined' || !window.ethereum) return () => {}
  const eth = window.ethereum as {
    on?: (event: string, cb: () => void) => void
    removeListener?: (event: string, cb: () => void) => void
  }
  if (!eth.on) return () => {}
  const reload = () => window.location.reload()
  eth.on('accountsChanged', reload)
  eth.on('chainChanged', reload)
  return () => {
    eth.removeListener?.('accountsChanged', reload)
    eth.removeListener?.('chainChanged', reload)
  }
}

export function isMiniPay(): boolean {
  if (typeof window === 'undefined') return false
  return !!window.ethereum?.isMiniPay
}
