# Bundl

**Pay everyone at once.** Bundl is a MiniPay mini app on Celo that turns a list of
recurring payments — rent, family, staff, subscriptions — into **one atomic
transaction**, with a savings goal that helps users set the money aside day by day.

- Non-custodial: funds go payer → recipient directly, the contract never holds them.
- Stablecoins only (USDm / USDC / USDT) — CELO is never shown to users.
- Built for MiniPay: implicit wallet, legacy transactions, no message signing.

## Quick start

```bash
npm install
cp .env.example .env   # fill in your values
npm run dev            # http://localhost:3000
```

Useful scripts:

| Command | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js app |
| `npm run lint` / `typecheck` | ESLint / `tsc --noEmit` |
| `npm run compile` / `test` | Hardhat compile / contract tests |
| `npm run deploy:sepolia` | Deploy MockUSD + Disperse to Celo Sepolia (chain-guarded) |
| `npx hardhat run scripts/deployMainnet.ts --network celo` | Deploy Disperse to mainnet (chain-guarded, optional `FEE_TREASURY`/`FEE_BPS`) |

CI (GitHub Actions) runs lint, typecheck, contract tests and the production build
on every push and PR.

## Architecture

```text
contracts/Disperse.sol   Atomic multisend: SafeERC20, ReentrancyGuard, Pausable,
                         MAX_RECIPIENTS=150, protocol fee (feeBps ≤ 1%, owner-set,
                         emits FeeCollected), never holds funds.
src/app/                 Next.js 14 App Router, mobile-first (360×640 minimum).
src/lib/                 Wallet (viem), tokens, storage (chain-keyed localStorage
                         with quota handling + daily backup), on-chain history,
                         SocialConnect/ODIS phone resolution (server-side).
src/app/api/resolve-phone  ODIS lookup endpoint — rate-limited (per IP + per phone).
```

**Networks** — `NEXT_PUBLIC_NETWORK=mainnet|testnet` switches between Celo mainnet
(42220) and Celo Sepolia (11142220). Token/contract addresses live in
[src/lib/tokens.ts](src/lib/tokens.ts) only.

**Contract (mainnet)** — Disperse at
[`0xEe33743c0344E58420E4b6BBBaB2c10e9410f6D5`](https://celoscan.io/address/0xEe33743c0344E58420E4b6BBBaB2c10e9410f6D5)
(pre-FeeCollected version; redeployment of the fee-enabled contract is pending —
update this address and the sample tx hashes below when it lands).

Sample transactions (for MiniPay review): _to be added after the fee-enabled
contract deployment._

## Security

- Never commit `.env` — it is gitignored; secrets belong in the Vercel/Fly vault.
- `PRIVATE_KEY` (deployer) and `ODIS_PRIVATE_KEY` (quota account) must be two
  separate, single-purpose accounts holding minimal funds.
- Known audit noise: `@celo/identity` transitively pins a legacy web3 1.x stack
  (`request`, `eth-lib`) with unpatched advisories. That code only runs
  server-side inside the dormant, rate-limited `/api/resolve-phone` route —
  it never ships to the client. Dropping ODIS entirely removes the tree.

### Key-rotation runbook (assume compromise if a key was ever exposed)

1. Generate fresh keys: `node -e "const {generatePrivateKey, privateKeyToAccount} = require('viem/accounts'); const k = generatePrivateKey(); console.log(k, privateKeyToAccount(k).address)"` — once for the deployer, once for ODIS.
2. Fund the new deployer with ~0.5 CELO; move any remaining funds off the old one.
3. Redeploy: `npx hardhat run scripts/deployMainnet.ts --network celo`
   (set `FEE_TREASURY`/`FEE_BPS` to configure the protocol fee at deploy time).
4. Verify on Celoscan, send one sample settlement, record its tx hash here.
5. Pay ODIS quota from the new ODIS account (`OdisPayments.payInCUSD`), set the
   new `ODIS_PRIVATE_KEY` in the deployment platform's secret store.
6. Regenerate the Celoscan API key at celoscan.io → API dashboard.
7. Update `NEXT_PUBLIC_DISPERSE_ADDRESS` everywhere (Vercel/Fly env + this README),
   redeploy the app, then pause the old contract (`pause()`) so no one keeps using it.

## MiniPay compliance

See [REQUIREMENTS.md](REQUIREMENTS.md) for the full rule set this codebase follows
(implicit wallet, legacy tx only, no signing, stablecoin-only UI, deeplinks,
`/stats` public page). Support: [Telegram](https://t.me/bundlsupport) · 24h SLA for
critical bugs.

## Deployment

Production runs on **Vercel** (`vercel.json`) — the single deployment target.
(The former Fly.io/Docker config was removed to avoid config drift.)
