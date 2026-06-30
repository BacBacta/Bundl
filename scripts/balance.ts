import { ethers } from 'hardhat'

async function main() {
  const [d] = await ethers.getSigners()
  const bal = await ethers.provider.getBalance(d.address)
  console.log('deployer:', d.address)
  console.log('balance :', ethers.formatEther(bal), 'CELO')
  if (bal === 0n) console.log('NO_GAS')
}

main().catch((e) => { console.error(e); process.exit(1) })
