// Single source of truth for all token and contract addresses.
// Never hardcode decimals or addresses anywhere else — import from here.

import { ACTIVE_CHAIN, celoMainnet } from './chains'

const IS_MAINNET = ACTIVE_CHAIN.id === celoMainnet.id

// ─── Disperse contract (deployed by this repo) ───────────────────────────────

export const DISPERSE_ADDRESS = (
  process.env.NEXT_PUBLIC_DISPERSE_ADDRESS || '0x0000000000000000000000000000000000000000'
) as `0x${string}`

// Treasury address that receives the per-bundle service fee.
//
// Fee policy (intentional, not an oversight): the $0.15 fee applies ONLY to
// recurring bundle settlements (SettleSheet), the paid core product. Direct
// P2P payments and bill splits via /pay are, and stay, fee-free — they are
// growth/acquisition tools (Idea B — see product notes) and charging on them
// would tax the exact flows meant to bring new users into Bundl.
export const FEE_RECIPIENT = (
  process.env.NEXT_PUBLIC_FEE_RECIPIENT || '0x0000000000000000000000000000000000000000'
) as `0x${string}`

export const SERVICE_FEE_USD = 0.15

// Volume-based fee discount — rewards heavier users with a lower per-
// settlement fee. Computed client-side from the user's local bundle history
// (an approximation of lifetime volume, same trust boundary as the flat fee
// above: the app decides the fee amount before building the transaction).
const FEE_TIERS = [
  { minVolume: 2000, fee: 0.05 },
  { minVolume: 500, fee: 0.1 },
  { minVolume: 0, fee: SERVICE_FEE_USD },
] as const

export function feeForVolume(lifetimeVolumeUsd: number): number {
  return FEE_TIERS.find((t) => lifetimeVolumeUsd >= t.minVolume)?.fee ?? SERVICE_FEE_USD
}

// ─── Stablecoins ─────────────────────────────────────────────────────────────
// MiniPay supports USDm / USDC / USDT only. Never expose CELO to users.
// feeCurrency addresses for USDC/USDT are adapter contracts — NOT the token.

export const STABLECOINS = {
  // Mento Dollar (cUSD)
  USDm: {
    address: '0x765DE816845861e75A25fCA122bb6898B8B1282a' as `0x${string}`,
    feeCurrency: '0x765DE816845861e75A25fCA122bb6898B8B1282a' as `0x${string}`, // same
    decimals: 18,
    symbol: 'USDm',
    name: 'Mento Dollar',
  },
  USDC: {
    address: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C' as `0x${string}`,
    feeCurrency: '0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B' as `0x${string}`, // adapter
    decimals: 6,
    symbol: 'USDC',
    name: 'USD Coin',
  },
  USDT: {
    address: '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e' as `0x${string}`,
    feeCurrency: '0x0e2a3e05bc9a16f5292a6170456a710cb89c6f72' as `0x${string}`, // adapter
    decimals: 6,
    symbol: 'USDT',
    name: 'Tether USD',
  },
} as const

// ─── Testnet tokens (Celo Sepolia) ───────────────────────────────────────────

export const TESTNET_STABLECOINS = {
  USDm: {
    address: '0xEF4d55D6dE8e8d73232827Cd1e9b2F2dBb45bC80' as `0x${string}`,
    decimals: 18,
    symbol: 'USDm',
    name: 'Mento Dollar (Sepolia)',
  },
  USDC: {
    address: '0x01C5C0122039549AD1493B8220cABEdD739BC44E' as `0x${string}`,
    decimals: 6,
    symbol: 'USDC',
    name: 'USD Coin (Sepolia)',
  },
  USDT: {
    address: '0xd077A400968890Eacc75cdc901F0356c943e4fDb' as `0x${string}`,
    decimals: 6,
    symbol: 'USDT',
    name: 'Tether USD (Sepolia)',
  },
  // Deployed by this repo for isolated spike testing
  MOCK_USD: {
    address: (
      process.env.NEXT_PUBLIC_MOCK_USD_ADDRESS || '0x0000000000000000000000000000000000000000'
    ) as `0x${string}`,
    decimals: 18,
    symbol: 'mUSD',
    name: 'Mock USD',
  },
} as const

export type StablecoinKey = keyof typeof STABLECOINS
export type TestnetStablecoinKey = keyof typeof TESTNET_STABLECOINS

// Active tokens — switches automatically with NEXT_PUBLIC_NETWORK (see chains.ts).
export const TOKENS = IS_MAINNET ? STABLECOINS : TESTNET_STABLECOINS

// Default token for settlement (override per user preference via storage).
// Mainnet has no MockUSD equivalent — USDm is the natural default there.
export const DEFAULT_TOKEN = IS_MAINNET ? STABLECOINS.USDm : TESTNET_STABLECOINS.MOCK_USD

// ─── SocialConnect ────────────────────────────────────────────────────────────

export const SOCIALCONNECT = {
  // Trusted issuer for MiniPay phone attestations
  MINIPAY_ISSUER: '0x7888612486844Bb9BE598668081c59A9f7367FBc' as `0x${string}`,
  // Mainnet only — run ODIS lookups server-side
  FEDERATED_ATTESTATIONS: '0x0aD5b1d0C25ecF6266Dd951403723B2687d6aff2' as `0x${string}`,
  ODIS_PAYMENTS: '0xAE6B29f31B96e61DdDc792f45fDa4e4F0356D0CB' as `0x${string}`,
} as const

// ─── Deeplinks ────────────────────────────────────────────────────────────────

export const DEEPLINKS = {
  addCash: 'https://link.minipay.xyz/add_cash',
  receipt: (txHash: string) => `https://link.minipay.xyz/receipt?tx=${txHash}`,
  inviteFriends: 'https://link.minipay.xyz/invite_friends',
  qr: 'https://link.minipay.xyz/qr',
  discover: 'https://link.minipay.xyz/discover',
  // Open a URL inside MiniPay's in-app browser (so the wallet is available).
  browse: (url: string) => `https://link.minipay.xyz/browse?url=${encodeURIComponent(url)}`,
} as const

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function isDeployed(): boolean {
  return DISPERSE_ADDRESS !== '0x0000000000000000000000000000000000000000'
}
