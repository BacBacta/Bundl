import { expect } from 'chai'
import { ethers } from 'hardhat'

const E = (n: string | number) => ethers.parseEther(String(n))

async function fixture() {
  const [owner, payer, a, b, c] = await ethers.getSigners()

  const MockUSD = await ethers.getContractFactory('MockUSD')
  const token = await MockUSD.deploy()
  await token.waitForDeployment()

  const Disperse = await ethers.getContractFactory('Disperse')
  const disperse = await Disperse.deploy()
  await disperse.waitForDeployment()

  // Fund the payer and approve the contract for plenty.
  await token.mint(payer.address, E(1000))
  await token.connect(payer).approve(await disperse.getAddress(), ethers.MaxUint256)

  return { owner, payer, a, b, c, token, disperse }
}

describe('Disperse (hardened)', () => {
  it('disperses to multiple recipients and emits BundleSettled', async () => {
    const { payer, a, b, token, disperse } = await fixture()
    const recipients = [a.address, b.address]
    const amounts = [E(10), E(25)]

    await expect(disperse.connect(payer).disperseToken(await token.getAddress(), recipients, amounts))
      .to.emit(disperse, 'BundleSettled')
      .withArgs(payer.address, await token.getAddress(), 2, E(35))

    expect(await token.balanceOf(a.address)).to.equal(E(10))
    expect(await token.balanceOf(b.address)).to.equal(E(25))
  })

  it('reverts on length mismatch', async () => {
    const { payer, a, token, disperse } = await fixture()
    await expect(
      disperse.connect(payer).disperseToken(await token.getAddress(), [a.address], [E(1), E(2)]),
    ).to.be.revertedWith('length mismatch')
  })

  it('reverts on empty recipients', async () => {
    const { payer, token, disperse } = await fixture()
    await expect(
      disperse.connect(payer).disperseToken(await token.getAddress(), [], []),
    ).to.be.revertedWith('no recipients')
  })

  it('reverts on zero address recipient', async () => {
    const { payer, token, disperse } = await fixture()
    await expect(
      disperse.connect(payer).disperseToken(await token.getAddress(), [ethers.ZeroAddress], [E(1)]),
    ).to.be.revertedWith('zero address')
  })

  it('reverts on zero amount', async () => {
    const { payer, a, token, disperse } = await fixture()
    await expect(
      disperse.connect(payer).disperseToken(await token.getAddress(), [a.address], [0]),
    ).to.be.revertedWith('zero amount')
  })

  it('reverts when allowance is insufficient', async () => {
    const { payer, a, token, disperse } = await fixture()
    // Re-approve a small amount.
    await token.connect(payer).approve(await disperse.getAddress(), E(5))
    await expect(
      disperse.connect(payer).disperseToken(await token.getAddress(), [a.address], [E(10)]),
    ).to.be.reverted
  })

  it('enforces the MAX_RECIPIENTS cap', async () => {
    const { payer, a, token, disperse } = await fixture()
    const max = Number(await disperse.MAX_RECIPIENTS())
    const recipients = Array(max + 1).fill(a.address)
    const amounts = Array(max + 1).fill(E(1))
    await expect(
      disperse.connect(payer).disperseToken(await token.getAddress(), recipients, amounts),
    ).to.be.revertedWith('too many recipients')
  })

  it('is atomic: a mid-loop failure rolls back earlier transfers', async () => {
    const { payer, a, b, disperse } = await fixture()
    const Rev = await ethers.getContractFactory('RevertingToken')
    const token = await Rev.deploy(2) // fail on the 2nd transferFrom
    await token.waitForDeployment()
    await token.mint(payer.address, E(100))
    await token.connect(payer).approve(await disperse.getAddress(), ethers.MaxUint256)

    await expect(
      disperse.connect(payer).disperseToken(await token.getAddress(), [a.address, b.address], [E(10), E(20)]),
    ).to.be.revertedWith('forced failure')

    // First transfer must have rolled back.
    expect(await token.balanceOf(a.address)).to.equal(0)
    expect(await token.balanceOf(b.address)).to.equal(0)
  })

  it('handles USDT-style tokens that return no bool (SafeERC20)', async () => {
    const { payer, a, b, disperse } = await fixture()
    const NRT = await ethers.getContractFactory('NoReturnToken')
    const token = await NRT.deploy()
    await token.waitForDeployment()
    await token.mint(payer.address, E(100))
    await token.connect(payer).approve(await disperse.getAddress(), ethers.MaxUint256)

    await disperse.connect(payer).disperseToken(await token.getAddress(), [a.address, b.address], [E(10), E(20)])
    expect(await token.balanceOf(a.address)).to.equal(E(10))
    expect(await token.balanceOf(b.address)).to.equal(E(20))
  })

  it('blocks reentrancy', async () => {
    const { payer, a, disperse } = await fixture()
    const RT = await ethers.getContractFactory('ReentrantToken')
    const token = await RT.deploy()
    await token.waitForDeployment()
    await token.setDisperse(await disperse.getAddress())
    await token.mint(payer.address, E(100))
    await token.connect(payer).approve(await disperse.getAddress(), ethers.MaxUint256)

    await expect(
      disperse.connect(payer).disperseToken(await token.getAddress(), [a.address], [E(10)]),
    ).to.be.reverted
  })

  describe('Pausable', () => {
    it('owner can pause and unpause; paused blocks settlement', async () => {
      const { owner, payer, a, token, disperse } = await fixture()
      await disperse.connect(owner).pause()
      await expect(
        disperse.connect(payer).disperseToken(await token.getAddress(), [a.address], [E(1)]),
      ).to.be.revertedWithCustomError(disperse, 'EnforcedPause')

      await disperse.connect(owner).unpause()
      await expect(
        disperse.connect(payer).disperseToken(await token.getAddress(), [a.address], [E(1)]),
      ).to.emit(disperse, 'BundleSettled')
    })

    it('non-owner cannot pause', async () => {
      const { payer, disperse } = await fixture()
      await expect(disperse.connect(payer).pause()).to.be.revertedWithCustomError(
        disperse,
        'OwnableUnauthorizedAccount',
      )
    })
  })
})
