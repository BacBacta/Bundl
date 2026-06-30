import { ethers } from 'hardhat'

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log('Deploying from:', deployer.address)

  const MockUSD = await ethers.getContractFactory('MockUSD')
  const mockUSD = await MockUSD.deploy()
  await mockUSD.waitForDeployment()
  const mockUSDAddress = await mockUSD.getAddress()
  console.log('MockUSD deployed:', mockUSDAddress)

  const Disperse = await ethers.getContractFactory('Disperse')
  const disperse = await Disperse.deploy()
  await disperse.waitForDeployment()
  const disperseAddress = await disperse.getAddress()
  console.log('Disperse deployed:', disperseAddress)

  const mintAmount = ethers.parseEther('100000')
  await (mockUSD as any).mint(deployer.address, mintAmount)
  console.log(`Minted ${ethers.formatEther(mintAmount)} mUSD to ${deployer.address}`)

  console.log('\nAdd to .env:')
  console.log(`NEXT_PUBLIC_DISPERSE_ADDRESS=${disperseAddress}`)
  console.log(`NEXT_PUBLIC_MOCK_USD_ADDRESS=${mockUSDAddress}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
