// Verify deployed contracts on Celoscan (required for MiniPay listing)
// Usage: CELOSCAN_API_KEY=xxx npx hardhat run scripts/verify.ts --network celoSepolia
//
// Get a free Celoscan API key at: https://celoscan.io/myapikey
// (Celoscan uses the unified Etherscan V2 API)

import * as dotenv from 'dotenv'
import { run } from 'hardhat'

dotenv.config()

async function main() {
  const disperseAddress = process.env.NEXT_PUBLIC_DISPERSE_ADDRESS
  const mockUSDAddress = process.env.NEXT_PUBLIC_MOCK_USD_ADDRESS

  if (!disperseAddress || !mockUSDAddress) {
    throw new Error('Set NEXT_PUBLIC_DISPERSE_ADDRESS and NEXT_PUBLIC_MOCK_USD_ADDRESS in .env')
  }

  console.log('Verifying Disperse at', disperseAddress)
  await run('verify:verify', {
    address: disperseAddress,
    constructorArguments: [],
  })
  console.log('Disperse verified ✓')

  console.log('Verifying MockUSD at', mockUSDAddress)
  await run('verify:verify', {
    address: mockUSDAddress,
    constructorArguments: [],
  })
  console.log('MockUSD verified ✓')

  console.log('\nView on Celoscan:')
  console.log(`  https://celo-sepolia.blockscout.com/address/${disperseAddress}`)
  console.log(`  https://celo-sepolia.blockscout.com/address/${mockUSDAddress}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
