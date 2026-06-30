import { ethers } from 'hardhat'
import * as dotenv from 'dotenv'

dotenv.config()

// Usage: RECIPIENT=0x... AMOUNT=1000 npm run mint
async function main() {
  const recipient = process.env.RECIPIENT
  const amount = process.env.AMOUNT || '10000'
  const tokenAddress = process.env.NEXT_PUBLIC_MOCK_USD_ADDRESS

  if (!recipient) throw new Error('Set RECIPIENT=0x...')
  if (!tokenAddress) throw new Error('Set NEXT_PUBLIC_MOCK_USD_ADDRESS in .env')

  const mockUSD = await ethers.getContractAt('MockUSD', tokenAddress)
  const parsed = ethers.parseEther(amount)
  await (mockUSD as any).mint(recipient, parsed)
  console.log(`Minted ${amount} mUSD to ${recipient}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
