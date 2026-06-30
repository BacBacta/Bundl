# Bundl – review tickets (post code-review)

Hand these to the coding agent one at a time. Each has files, what to do, and a Definition of Done.
Context: see AGENT_BRIEF_EN.md and .cursorrules (MiniPay constraints are non-negotiable).

---

## T0 · Confirm the M0 spike passes (BLOCKER) – P0

**Why:** The multisend is the core technical risk. Code can't prove it works inside MiniPay.

**Do:**
- Deploy `Disperse` + `MockUSD` to Celo Sepolia (`npm run deploy:sepolia`, `npm run mint`).
- Open `/spike` inside MiniPay (Developer Settings → Use Testnet → Load test page, HTTPS).
- Run a bundle with N = 2, 5, 10, 20. Record: first bundle = 2 txs (approve + execute), later = 1; `gasUsed` per N; atomicity (simulate one failing recipient → whole tx reverts).

**Done when:** a short report (gas per N, atomicity OK, 1-tap confirmed) is committed to the repo. If blocked, document the failure and pick a fallback from the spike protocol.

---

## T1 · Honest pot framing – P1
**Files:** `src/app/page.tsx`, `src/components/ReminderBanner.tsx`, copy only.

**Status: DONE** (commit 8649f7b) — "Monthly pot" → "Savings goal", "Add to pot" → "Mark committed today", subtitle "Commitment tracker — funds stay in your wallet", on-chain balance visible.

---

## T2 · Persistence beyond localStorage – P1
**Files:** `src/lib/storage.ts`, plus a new light backend or remote store; `src/app/history/*`.

**Problem:** All state (recurring list, streak, history) lives in `localStorage` under `bundl_v1` — device-local, no backup. A cache clear / app update wipes everything, including the streak (the retention engine).

**Do:**
- Persist the recurring list and streak keyed by wallet address (light backend: e.g. a serverless KV / DB, or signed remote store). Keep localStorage as a cache.
- Reconstruct settlement history from on-chain data (you already store `txHash`); treat the chain as source of truth for History, localStorage as a convenience cache.
- Handle the "fresh device / cleared cache" path gracefully (re-hydrate from backend + chain).

**Done when:** clearing the browser cache and reloading restores the recurring list, streak, and history for the same wallet.

---

## T3 · Explicit, consistent settlement token – P2
**Files:** `src/lib/stablecoin.ts`, `src/components/SettleSheet.tsx`, `src/app/recurring/*`.

**Problem:** `getPreferredStablecoin` picks "the token I hold the most of." On mainnet that means a payment can go out in different tokens depending on balances — the recipient may expect a specific one.

**Do:** Let the user pick the settlement token (or set a default per recurring payment). Validate the chosen token's balance ≥ total before enabling settle. Keep the "highest balance" logic only as a testnet default.

**Done when:** the settlement token is explicit and consistent; the recipient always receives the intended token.

---

## T4 · Money formatting – P3
**Files:** `src/app/page.tsx`, `src/components/SettleSheet.tsx`, anywhere amounts render.

**Problem:** `${total}`, `${monthlyTarget}`, `${potBalance}`, `${r.amount}` render raw; float `reduce` can show `0.30000000004`.

**Do:** Format every displayed amount with a single money helper (`toFixed(2)` / `Intl.NumberFormat`). Round derived totals.

**Done when:** no raw float artifacts anywhere; one shared formatter is used.

---

## T5 · RPC endpoint + mainnet switch – P2
**Files:** `src/lib/chains.ts`, `.env.example`.

**Problem:** `ACTIVE_CHAIN` is hardcoded to Sepolia. Reads depend on `forno.celo-sepolia.celo-testnet.org` resolving; if it's down, `balanceOf`/`allowance`/`decimals` fail and the UI silently shows "Deposit to settle" even when the user has funds.

**Do:** Verify the Sepolia RPC actually responds (add a healthcheck or a known-good fallback RPC). Drive `ACTIVE_CHAIN` from an env var so testnet/mainnet is a config switch, not a code edit. Document required env vars in `.env.example`.

**Done when:** RPC is confirmed working (or a fallback is in place); switching network is env-driven.

---

## T6 · Production hardening of Disperse – P2 (before mainnet)
**Files:** `contracts/Disperse.sol`, tests.

**Problem:** MVP contract is intentionally minimal. The frontend grants `maxUint256` (infinite) approval.

**Do:** Add OpenZeppelin `SafeERC20` + `ReentrancyGuard` (nonReentrant on `disperseToken`) + `Pausable` (owner) + a max-recipients cap. Add tests (length mismatch, zero amount, zero address, insufficient allowance, a token that reverts mid-loop → whole-tx revert). Consider exact-amount approval instead of infinite for the production flow. Commission a quick audit before mainnet.

**Done when:** hardened contract + passing test suite; infinite-approval decision documented.

---

## T7 · Defensive UX polish – P3
**Files:** `src/components/SettleSheet.tsx`, `src/app/page.tsx`.

**Do:** Map common on-chain errors to human messages (user rejected, insufficient gas/CELO, RPC timeout) instead of raw `e.message`. Add a retry on the error step. Disable double-submits while `settling`.

**Done when:** the error step shows a friendly message + retry; no double settlement possible.

---

## Suggested order
T0 (blocker) → T1 + T2 (trust + robustness) → T5 → T3 → T7 → T4 → T6 (before mainnet).

## Status
- T0: needs physical MiniPay device — you must run this
- T1: DONE (commit 8649f7b)
- T2: IN PROGRESS
- T3: TODO
- T4: TODO
- T5: TODO
- T6: TODO
- T7: TODO

## T8 / T9 — DONE
- T8: lib/activity.ts (Blockscout tokentx fetch + recurrence detection: group by
  recipient, ≥2 transfers, ±25% amount consistency, cadence classification,
  confidence score); DetectedPayments.tsx card with consent line + one-tap add +
  skip; SocialConnect name cache resolves "Mum"/"Landlord"; mock dataset on testnet.
- T9: design tokens (light+dark via CSS vars) in tailwind.config + globals.css;
  lucide-react icons replace all emojis; Header (avatar + handle + bell), GoalRing
  (SVG circular progress), RecipientRow (deterministic avatar), Skeleton loaders;
  premium SettleSheet (animated sheet, status log, native receipt); BottomNav with
  safe-area + active states; footers removed, legal/support moved into /settings;
  full dark mode.
