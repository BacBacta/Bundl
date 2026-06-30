import { defineChain } from 'viem'

// Sepolia: two RPCs — forno is primary, drpc is fallback
const SEPOLIA_RPC =
  process.env.NEXT_PUBLIC_CELO_SEPOLIA_RPC_URL ||
  'https://forno.celo-sepolia.celo-testnet.org'

const SEPOLIA_RPC_FALLBACK = 'https://celo-sepolia.drpc.org'

export const celoSepolia = defineChain({
  id: 11142220,
  name: 'Celo Sepolia',
  nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
  rpcUrls: {
    default: { http: [SEPOLIA_RPC, SEPOLIA_RPC_FALLBACK] },
  },
  blockExplorers: {
    default: { name: 'Blockscout', url: 'https://celo-sepolia.blockscout.com' },
  },
  testnet: true,
})

export const celoMainnet = defineChain({
  id: 42220,
  name: 'Celo',
  nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_CELO_RPC_URL || 'https://forno.celo.org',
        'https://celo.drpc.org',
      ],
    },
  },
  blockExplorers: {
    default: { name: 'Celoscan', url: 'https://celoscan.io' },
  },
})

// Switch between testnet and mainnet via env var.
// Set NEXT_PUBLIC_NETWORK=mainnet in Vercel prod env.
export const ACTIVE_CHAIN =
  process.env.NEXT_PUBLIC_NETWORK === 'mainnet' ? celoMainnet : celoSepolia
