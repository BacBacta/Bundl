// Mainnet deployment — Disperse ONLY. MockUSD is a testnet-only faucet token
// (unrestricted public mint) and must never be deployed to mainnet; real
// stablecoins (USDm/USDC/USDT) are already configured in src/lib/tokens.ts
// under STABLECOINS for the mainnet chain.

import { ethers } from 'hardhat'

async function main() {
  const [deployer] = await ethers.getSigners()
  const network = await ethers.provider.getNetwork()
  console.log('Deploying from:', deployer.address)
  console.log('Chain ID:', network.chainId.toString())

  if (network.chainId !== 42220n) {
    throw new Error(`Expected Celo mainnet (42220), got chain ${network.chainId}. Aborting.`)
  }

  const balance = await ethers.provider.getBalance(deployer.address)
  console.log('Deployer CELO balance:', ethers.formatEther(balance))

  const Disperse = await ethers.getContractFactory('Disperse')
  const disperse = await Disperse.deploy()
  await disperse.waitForDeployment()
  const disperseAddress = await disperse.getAddress()
  console.log('\nDisperse deployed to Celo mainnet:', disperseAddress)

  console.log('\nAdd to .env / Vercel:')
  console.log(`NEXT_PUBLIC_DISPERSE_ADDRESS=${disperseAddress}`)
  console.log(`NEXT_PUBLIC_NETWORK=mainnet`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
