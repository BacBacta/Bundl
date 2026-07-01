import { expect } from 'chai'
import { ethers } from 'hardhat'

const E = (n: string | number) => ethers.parseEther(String(n))

describe('Disperse — audit: gas at scale + invariants', () => {
  it('measures gas at MAX_RECIPIENTS (150) and stays well under a realistic block gas limit', async () => {
    const [, payer] = await ethers.getSigners()
    const MockUSD = await ethers.getContractFactory('MockUSD')
    const token = await MockUSD.deploy()
    await token.waitForDeployment()
    const Disperse = await ethers.getContractFactory('Disperse')
    const disperse = await Disperse.deploy()
    await disperse.waitForDeployment()

    const max = Number(await disperse.MAX_RECIPIENTS())
    await token.mint(payer.address, E(max))
    await token.connect(payer).approve(await disperse.getAddress(), ethers.MaxUint256)

    // 150 distinct recipients (deterministic dummy addresses).
    const recipients = Array.from({ length: max }, (_, i) =>
      ethers.getAddress('0x' + (i + 1).toString(16).padStart(40, '0')),
    )
    const amounts = Array(max).fill(E(1))

    const tx = await disperse.connect(payer).disperseToken(await token.getAddress(), recipients, amounts)
    const receipt = await tx.wait()
    const gasUsed = receipt!.gasUsed

    console.log(`      gasUsed at N=${max}: ${gasUsed.toString()}`)
    // Celo blocks target ~30-50M gas; a single tx should stay far below that
    // so it can't ever be rejected for exceeding the block gas limit.
    expect(gasUsed).to.be.lessThan(15_000_000n)
  })

  it('invariant: the contract never retains a token balance after disperseToken', async () => {
    const [, payer, a, b] = await ethers.getSigners()
    const MockUSD = await ethers.getContractFactory('MockUSD')
    const token = await MockUSD.deploy()
    await token.waitForDeployment()
    const Disperse = await ethers.getContractFactory('Disperse')
    const disperse = await Disperse.deploy()
    await disperse.waitForDeployment()

    await token.mint(payer.address, E(100))
    await token.connect(payer).approve(await disperse.getAddress(), ethers.MaxUint256)
    await disperse.connect(payer).disperseToken(await token.getAddress(), [a.address, b.address], [E(30), E(40)])

    expect(await token.balanceOf(await disperse.getAddress())).to.equal(0)
  })

  it('reverts cleanly when token is not a contract (no silent success)', async () => {
    const [, payer, a] = await ethers.getSigners()
    const Disperse = await ethers.getContractFactory('Disperse')
    const disperse = await Disperse.deploy()
    await disperse.waitForDeployment()

    await expect(
      disperse.connect(payer).disperseToken(payer.address, [a.address], [E(1)]),
    ).to.be.reverted
  })
})
