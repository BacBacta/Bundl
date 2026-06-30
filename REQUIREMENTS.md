# Bundl — MiniPay Requirements (agent must respect)

Synthesized from 14 official Celo/MiniPay reference docs (celopedia-skills, June 2026).
Every rule here is a hard constraint for any code generation agent.

---

## 1. Wallet connection (NEVER violate)

- Detect `window.ethereum?.isMiniPay === true` on mount.
- **Never render a Connect Wallet button** when inside MiniPay.
- Auto-connect: `walletClient.getAddresses()` — no `eth_requestAccounts`.
- Outside MiniPay (desktop/dev): show a graceful warning only.

```typescript
if (window.ethereum?.isMiniPay) {
  const [address] = await walletClient.getAddresses()
}
```

---

## 2. Transaction rules (NEVER violate)

- **Legacy transactions only.** Never set `maxFeePerGas` or `maxPriorityFeePerGas`.
- **No message signing.** Never use `personal_sign`, `signMessage`, `signTypedData`, or any permit/EIP-2612 flow.
- **feeCurrency is optional** — default to native CELO gas in dev/tests. Add as a user toggle for production.
- For stablecoin gas: use the **adapter address** for USDC/USDT, not the token address (see §5).

---

## 3. Tokens — NEVER show CELO to users

MiniPay hides CELO from users. The app must only work with stablecoins.

### Mainnet token addresses

| Token | Address | Decimals | feeCurrency address |
|-------|---------|----------|-------------------|
| USDm (cUSD) | `0x765DE816845861e75A25fCA122bb6898B8B1282a` | 18 | same as token |
| USDC | `0xcebA9300f2b948710d2653dD7B07f33A8B32118C` | 6 | `0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B` (**adapter**) |
| USDT | `0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e` | 6 | `0x0e2a3e05bc9a16f5292a6170456a710cb89c6f72` (**adapter**) |

### Celo Sepolia (testnet) token addresses

| Token | Address | Decimals |
|-------|---------|----------|
| USDm | `0xEF4d55D6dE8e8d73232827Cd1e9b2F2dBb45bC80` | 18 |
| USDC | `0x01C5C0122039549AD1493B8220cABEdD739BC44E` | 6 |
| USDT | `0xd077A400968890Eacc75cdc901F0356c943e4fDb` | 6 |
| MockUSD (this repo) | from `.env` | 18 |

### Token detection rule

Always detect the user's preferred stablecoin (highest balance) and use it:

```typescript
const preferred = await getPreferredStablecoin(address)
if (!preferred) window.location.href = 'https://link.minipay.xyz/add_cash'
```

**Never hardcode decimals.** Always call `decimals()` on the token contract, or use the table above keyed by address.

---

## 4. Network / Chain

| | Mainnet | Celo Sepolia |
|--|---------|-------------|
| Chain ID | `42220` | `11142220` |
| RPC | `https://forno.celo.org` | `https://forno.celo-sepolia.celo-testnet.org` |
| Explorer | https://celoscan.io | https://celo-sepolia.blockscout.com |
| Faucet | — | https://faucet.celo.org/celo-sepolia |

`eth_getLogs` spans > ~50,000 blocks are rejected. Paginate any event history.

---

## 5. MiniPay custom RPC methods (use these — don't build alternatives)

All called via `walletClient.request({ method: '...', params: [] })`.

| Method | Returns | Use case |
|--------|---------|----------|
| `minipay_requestContact` | `{ name: string; address: string }` | Pick a contact for recurring payments — **use this instead of building a phone form** |
| `minipay_scanQrCode` | scanned string | QR address input |
| `minipay_getExchangeRate` | rate string | FX display (e.g. USD → NGN) |

```typescript
const contact = await walletClient.request({
  method: 'minipay_requestContact' as any,
  params: [],
})
// contact.address → pre-fill address field
// contact.name   → pre-fill name field
```

---

## 6. Contact / address resolution (SocialConnect)

Use `minipay_requestContact` for the primary contact-picking flow. Fall back to manual address entry.

ODIS/FederatedAttestations lookup (for resolving by phone number independently):
- **MiniPay issuer:** `0x7888612486844Bb9BE598668081c59A9f7367FBc`
- **FederatedAttestations (mainnet):** `0x0aD5b1d0C25ecF6266Dd951403723B2687d6aff2`
- **OdisPayments (mainnet):** `0xAE6B29f31B96e61DdDc792f45fDa4e4F0356D0CB`

ODIS requires non-zero quota (pay via `OdisPayments.payInCUSD`). Run ODIS lookups server-side or in a backend function — not from the browser.

**UI rule:** Never show `0x…` addresses as primary identifier. Show name (from `minipay_requestContact`) or phone number.

---

## 7. Deeplinks

| Action | URL |
|--------|-----|
| Low balance / deposit | `https://link.minipay.xyz/add_cash` |
| Show tx receipt | `https://link.minipay.xyz/receipt?tx=HASH` |
| Open Mini App | `https://link.minipay.xyz/browse?url=URL` |

When the user has no stablecoin balance, redirect to `add_cash` — never show a generic error.

---

## 8. User-facing copy (STRICT — applies to all UI strings)

| ❌ Never | ✅ Always |
|---------|---------|
| Gas / Gas fee | Network fee |
| Onramp / Buy | Deposit |
| Offramp / Sell | Withdraw |
| Crypto / Token | Stablecoin or Digital dollar |
| Wallet address (as primary user ID) | Name or phone number |

---

## 9. Smart contract rules

- Non-custodial: funds flow payer → recipient directly (`transferFrom`). No holding.
- Atomic: one tx reverts all on failure.
- All contracts must be **verified on Celoscan** before submission.
- Provide sample tx hashes for every user-facing method.
- USDT safe: use low-level call or SafeERC20 (no bool return).
- Production: add OpenZeppelin ReentrancyGuard + Pausable + max-N cap + audit.

---

## 10. UI / UX requirements

- **Minimum resolution: 360 × 640** — test at this viewport before every deploy.
- Images: SVG or WebP only.
- Bundle size < 2 MB.
- Show clear transaction confirmations with stablecoin amounts.
- App name + logo must be clearly visible (not confused with MiniPay).
- Handle network errors gracefully.

### iOS limitation

`navigator.geolocation` does not work in MiniPay iOS. Do not use it.

---

## 11. Required for MiniPay listing

- [ ] In-app support link (Telegram / WhatsApp / email)
- [ ] 24h SLA for critical bugs
- [ ] Terms of Service link (in-app)
- [ ] Privacy Policy link (in-app)
- [ ] Open-source repository
- [ ] PageSpeed Insights ≥ 90 (mobile) — test at https://pagespeed.web.dev
- [ ] `/stats` page (DAU, MAU, tx volume per stablecoin, revenue, failed-tx rate)
- [ ] All contracts verified on Celoscan with sample tx hashes
- [ ] 3+ screenshots (PNG/JPG, max 500 KB each)
- [ ] Submission form: https://minipay.to/mini-apps

---

## 12. Analytics to track (required for listing)

- DAU / MAU
- D1 / D7 / D30 cohort retention
- Tx count per day/week/month (by method)
- Unique on-chain users per period
- Volume per stablecoin
- Network fees paid (sum gasUsed × gasPrice in USD)
- Protocol revenue (emit `FeeCollected` event)
- Failed-tx rate

---

## 13. Funding available

- **Celo Builder Fund (Verda Ventures):** $25K — team@verda.ventures
- **Proof of Ship:** monthly rewards, needs open-source repo — https://celo-devs.beehiiv.com/subscribe
- **Celo Grants:** https://www.celopg.eco/programs

---

## 14. What NOT to do (summary)

- No Connect Wallet button in MiniPay
- No EIP-1559 fields
- No `personal_sign` / `signTypedData` / permit
- No CELO displayed to users
- No raw `0x…` as primary user identifier
- No hardcoded token decimals across files
- No PNG/JPG for anything decorative (use SVG/WebP)
- No `navigator.geolocation` (broken on iOS MiniPay)
- No `eth_getLogs` without block range pagination
- No holding funds in any contract
- No unverified contracts on mainnet

---

*Sources: minipay-guide.md, minipay-requirements.md, minipay-scaffold-from-scratch.md,
builder-guide.md, dev-templates.md, sdk-reference.md, contracts.md, odis-socialconnect.md,
minipay-templates.md, minipay-live-apps.md, minipay-docs-map.md, live-data-sources.md,
the-grid-skill.md, docs-map.md — all from celo-org/celopedia-skills.*
