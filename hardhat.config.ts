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
      url: process.env.CELO_SEPOLIA_RPC_URL || 'https://forno.celo-sepolia.celo-testnet.org',
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
  // Celoscan uses the unified Etherscan V2 API
  etherscan: {
    apiKey: {
      celoSepolia: process.env.CELOSCAN_API_KEY || '',
      celo: process.env.CELOSCAN_API_KEY || '',
    },
    customChains: [
      {
        network: 'celoSepolia',
        chainId: 11142220,
        urls: {
          apiURL: 'https://api-sepolia.celoscan.io/api',
          browserURL: 'https://sepolia.celoscan.io',
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
