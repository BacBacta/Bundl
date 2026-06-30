import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import * as dotenv from 'dotenv'

dotenv.config()

const PRIVATE_KEY = process.env.PRIVATE_KEY
const accounts = PRIVATE_KEY ? [PRIVATE_KEY] : []

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.20',
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    celoSepolia: {
      // forno's gateway blocks some non-browser clients; use a hardhat-friendly RPC.
      url: process.env.CELO_SEPOLIA_RPC_URL || 'https://celo-sepolia.gateway.tenderly.co',
      chainId: 11142220,
      accounts,
    },
    celo: {
      url: process.env.CELO_RPC_URL || 'https://forno.celo.org',
      chainId: 42220,
      accounts,
    },
  },
  paths: {
    sources: './contracts',
    artifacts: './artifacts',
    cache: './cache',
  },
  // Sepolia verifies on Blockscout (no API key needed — the explorer the app
  // links to). Mainnet uses Celoscan (Etherscan V2, needs CELOSCAN_API_KEY).
  etherscan: {
    apiKey: {
      celoSepolia: 'blockscout', // Blockscout ignores the key
      celo: process.env.CELOSCAN_API_KEY || '',
    },
    customChains: [
      {
        network: 'celoSepolia',
        chainId: 11142220,
        urls: {
          apiURL: 'https://celo-sepolia.blockscout.com/api',
          browserURL: 'https://celo-sepolia.blockscout.com',
        },
      },
      {
        network: 'celo',
        chainId: 42220,
        urls: {
          apiURL: 'https://api.celoscan.io/api',
          browserURL: 'https://celoscan.io',
        },
      },
    ],
  },
}

export default config
