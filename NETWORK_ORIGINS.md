# Network origins manifest — Bundl

> Required by MiniPay submission ("Network Transparency"): a full manifest of
> every URL, subdomain, and origin the app calls. Generated from the source; keep
> in sync when adding any external call.

Bundl is a static Next.js app (no app backend, no custodial server). The only
runtime network calls are **public Celo RPC reads** and **public block-explorer
REST reads**. All transactions are signed and broadcast by MiniPay itself.

## 1. Runtime origins — called by the app at runtime

| Origin | Type | Purpose | When | Network |
|--------|------|---------|------|---------|
| `forno.celo-sepolia.celo-testnet.org` | JSON-RPC | Read balances, allowance, token decimals (viem) | Home, Settle | Testnet (primary) |
| `celo-sepolia.drpc.org` | JSON-RPC | RPC fallback | if primary fails | Testnet (fallback) |
| `forno.celo.org` | JSON-RPC | Same reads | Home, Settle | Mainnet (primary) |
| `celo.drpc.org` | JSON-RPC | RPC fallback | if primary fails | Mainnet (fallback) |
| `celo-sepolia.blockscout.com` | REST (`/api`) | `tokentx` (detect recurring, rebuild history) + `txlist` (stats) | Home, History, Stats | Testnet |
| `celo.blockscout.com` | REST (`/api`) | Same | Home, History, Stats | Mainnet |
| _self_ (Vercel: `*.vercel.app` / custom domain) | HTTPS | App HTML/JS/CSS + self-hosted Sora font | Always | — |

Notes:
- The **active network** is selected by `NEXT_PUBLIC_NETWORK` (`mainnet` → Celo
  42220 origins; otherwise Celo Sepolia 11142220 origins). Only one network's
  origins are live at a time.
- RPC endpoints are overridable via `NEXT_PUBLIC_CELO_SEPOLIA_RPC_URL` /
  `NEXT_PUBLIC_CELO_RPC_URL`; the values above are the built-in defaults/fallbacks.
- The **Sora font is self-hosted**: `next/font/google` downloads it at build time
  and serves it from the app origin — there is **no runtime call to
  `fonts.gstatic.com` / `fonts.googleapis.com`**.
- No analytics, ads, trackers, or third-party scripts are loaded.

## 2. User-initiated navigations — opened by the wallet/OS, not XHR

These are links the user taps; they are not background requests made by the app.

| Origin | Purpose |
|--------|---------|
| `link.minipay.xyz` | MiniPay deeplinks: `add_cash`, `receipt`, `invite_friends`, `qr`, `discover` |
| `celo-sepolia.blockscout.com` / `celo.blockscout.com` | "View on explorer" tx/address links |
| `t.me` | In-app support link (Telegram) |

## 3. Build / deploy tooling only — NOT shipped to the client

| Origin | Purpose |
|--------|---------|
| `fonts.googleapis.com` / `fonts.gstatic.com` | Font fetch at **build time** (then self-hosted) |
| `registry.npmjs.org` | npm dependency install |
| `api-sepolia.celoscan.io` / `api.celoscan.io` | Hardhat contract verification (`npm run verify:sepolia`) |

## 4. On-chain contracts (read/written via the RPC origins above)

| Contract | Address (env) | Methods used |
|----------|---------------|--------------|
| Disperse | `NEXT_PUBLIC_DISPERSE_ADDRESS` | `disperseToken`, `MAX_RECIPIENTS` (read) |
| Stablecoins (USDm/USDC/USDT) | per `src/lib/tokens.ts` | `balanceOf`, `allowance`, `approve`, `decimals` |

---

_Last generated: 2026-06-30. Update this file whenever a new `fetch`, RPC, or
external link is added._
