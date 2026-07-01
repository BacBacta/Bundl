// Settle a real bundle via the deployed Disperse contract, then run the app's
// actual analytics + history-reconstruction libs against it — proves /stats
// and /history's on-chain pipelines end to end on Celo Sepolia.
//
// Usage: npx hardhat run scripts/seedSettleAndStats.ts --network celoSepolia

import { ethers } from 'hardhat'

const RECIPIENTS = [
  '0x3154835dEAf9DF60A7aCaf45955236e73aD84502',
  '0x1111111111111111111111111111111111111111',
]
const AMOUNTS = ['12', '8']

async function main() {
  const [deployer] = await ethers.getSigners()
  const tokenAddr = process.env.NEXT_PUBLIC_MOCK_USD_ADDRESS
  const disperseAddr = process.env.NEXT_PUBLIC_DISPERSE_ADDRESS
  if (!tokenAddr || !disperseAddr) throw new Error('addresses missing in .env')

  const mockUSD = await ethers.getContractAt('MockUSD', tokenAddr)
  const disperse = await ethers.getContractAt('Disperse', disperseAddr)

  const amounts = AMOUNTS.map((a) => ethers.parseEther(a))
  const total = amounts.reduce((a, b) => a + b, 0n)

  console.log('Approving Disperse for', ethers.formatEther(total), 'mUSD…')
  await (await mockUSD.approve(disperseAddr, total)).wait()

  console.log(`Settling a bundle to ${RECIPIENTS.length} recipients…`)
  const tx = await disperse.disperseToken(tokenAddr, RECIPIENTS, amounts)
  const receipt = await tx.wait()
  console.log('  tx:', tx.hash, ' gasUsed:', receipt?.gasUsed?.toString())

  console.log('\nWaiting 30s for Blockscout to index…')
  await new Promise((r) => setTimeout(r, 30000))

  const { fetchContractStats } = await import('../src/lib/analytics')
  const { fetchOnchainBundles } = await import('../src/lib/onchainHistory')

  const stats = await fetchContractStats()
  console.log('\n/stats — fetchContractStats():')
  console.log(JSON.stringify(stats, null, 2))

  const bundles = await fetchOnchainBundles(deployer.address as `0x${string}`)
  console.log('\n/history — fetchOnchainBundles() for', deployer.address, ':')
  console.log(JSON.stringify(bundles, null, 2))

  console.log(`\nBlockscout tx: https://celo-sepolia.blockscout.com/tx/${tx.hash}`)
  console.log(`Blockscout contract: https://celo-sepolia.blockscout.com/address/${disperseAddr}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
