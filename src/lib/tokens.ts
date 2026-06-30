// Single source of truth for all token and contract addresses.
// Never hardcode decimals or addresses anywhere else — import from here.

// ─── Disperse contract (deployed by this repo) ───────────────────────────────

export const DISPERSE_ADDRESS = (
  process.env.NEXT_PUBLIC_DISPERSE_ADDRESS || '0x0000000000000000000000000000000000000000'
) as `0x${string}`

// Treasury address that receives the per-bundle service fee
export const FEE_RECIPIENT = (
  process.env.NEXT_PUBLIC_FEE_RECIPIENT || '0x0000000000000000000000000000000000000000'
) as `0x${string}`

export const SERVICE_FEE_USD = 0.15

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

// Active tokens — swap to STABLECOINS for mainnet
export const TOKENS = TESTNET_STABLECOINS

// Default token for settlement (override per user preference via storage)
export const DEFAULT_TOKEN = TESTNET_STABLECOINS.MOCK_USD

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
} as const

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function isDeployed(): boolean {
  return DISPERSE_ADDRESS !== '0x0000000000000000000000000000000000000000'
}
