// Seed a real recurring on-chain pattern, then run the app's actual detection
// logic against it to prove the "read wallet activity" pipeline end to end.
//
// Usage: npx hardhat run scripts/seedActivity.ts --network celoSepolia

import { ethers } from 'hardhat'

const RECIPIENT = '0x3154835dEAf9DF60A7aCaf45955236e73aD84502' // stand-in "person"
const AMOUNT = '50'
const TIMES = 3

async function main() {
  const [deployer] = await ethers.getSigners()
  const tokenAddr = process.env.NEXT_PUBLIC_MOCK_USD_ADDRESS
  if (!tokenAddr) throw new Error('NEXT_PUBLIC_MOCK_USD_ADDRESS missing in .env')

  const mockUSD = await ethers.getContractAt('MockUSD', tokenAddr)
  const amt = ethers.parseEther(AMOUNT)

  console.log(`Seeding ${TIMES} transfers of ${AMOUNT} mUSD -> ${RECIPIENT}`)
  for (let i = 0; i < TIMES; i++) {
    const tx = await mockUSD.transfer(RECIPIENT, amt)
    await tx.wait()
    console.log(`  #${i + 1}  ${tx.hash}`)
  }

  console.log('\nWaiting 30s for Blockscout to index…')
  await new Promise((r) => setTimeout(r, 30000))

  // Run the REAL frontend detection lib against the deployer's on-chain history.
  const { detectRecurringPayments } = await import('../src/lib/activity')
  const detected = await detectRecurringPayments(deployer.address as `0x${string}`)

  console.log(`\nDetection for ${deployer.address}:`)
  console.log(JSON.stringify(detected, null, 2))
  console.log(
    `\nBlockscout: https://celo-sepolia.blockscout.com/address/${deployer.address}/token-transfers`,
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
