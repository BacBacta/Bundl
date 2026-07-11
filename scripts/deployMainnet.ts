// Mainnet deployment — Disperse ONLY. MockUSD is a testnet-only faucet token
// (unrestricted public mint) and must never be deployed to mainnet; real
// stablecoins (USDm/USDC/USDT) are already configured in src/lib/tokens.ts
// under STABLECOINS for the mainnet chain.
//
// Optional fee setup (reads from env, skipped when unset):
//   FEE_TREASURY=0x…   — receiver of the protocol fee
//   FEE_BPS=50         — fee in basis points (max 100 = 1%)

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
  if (balance < ethers.parseEther('0.1')) {
    throw new Error('Deployer holds < 0.1 CELO — not enough for deployment gas. Fund it first.')
  }

  const Disperse = await ethers.getContractFactory('Disperse')
  const disperse = await Disperse.deploy()
  await disperse.waitForDeployment()
  const disperseAddress = await disperse.getAddress()
  if (!disperseAddress || disperseAddress === ethers.ZeroAddress) {
    throw new Error('Deployment returned no address — aborting.')
  }
  console.log('\nDisperse deployed to Celo mainnet:', disperseAddress)

  const treasury = process.env.FEE_TREASURY
  const feeBps = Number(process.env.FEE_BPS ?? 0)
  if (treasury && feeBps > 0) {
    if (feeBps > 100) throw new Error('FEE_BPS exceeds the 1% contract cap (100).')
    const tx = await disperse.setFee(treasury, feeBps)
    await tx.wait()
    console.log(`Fee configured: ${feeBps} bps → ${treasury} (tx ${tx.hash})`)
  } else {
    console.log('Fee left at 0 — configure later with setFee(treasury, bps).')
  }

  console.log('\nAdd to .env / Vercel:')
  console.log(`NEXT_PUBLIC_DISPERSE_ADDRESS=${disperseAddress}`)
  console.log(`NEXT_PUBLIC_NETWORK=mainnet`)
  console.log('\nNext steps:')
  console.log(`1. Verify: npx hardhat verify --network celo ${disperseAddress}`)
  console.log('2. Send one sample settlement and record its tx hash for the MiniPay submission.')
  console.log('3. Update NEXT_PUBLIC_DISPERSE_ADDRESS in Vercel/Fly env and redeploy the app.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
