import { defineChain } from 'viem'

export const celoSepolia = defineChain({
  id: 11142220,
  name: 'Celo Sepolia',
  nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_CELO_SEPOLIA_RPC_URL || 'https://forno.celo-sepolia.celo-testnet.org',
      ],
    },
  },
  blockExplorers: {
    default: {
      name: 'Celo Explorer',
      url: 'https://celo-sepolia.blockscout.com',
    },
  },
  testnet: true,
})

export const celoMainnet = defineChain({
  id: 42220,
  name: 'Celo',
  nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://forno.celo.org'] },
  },
  blockExplorers: {
    default: { name: 'Celo Explorer', url: 'https://explorer.celo.org' },
  },
})

export const ACTIVE_CHAIN = celoSepolia
