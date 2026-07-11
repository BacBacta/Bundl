// Phone number -> wallet address resolution via SocialConnect (ODIS +
// FederatedAttestations). Runs server-side because ODIS lookups consume
// quota paid by a funded account and must never expose that key to the
// client.
//
// Flow: blind the phone number -> ask ODIS to sign the blinded value
// (consumes quota) -> unblind to get a pepper -> hash into an obfuscated
// identifier -> look up that identifier in FederatedAttestations (mainnet
// only — SocialConnect attestations are not deployed on Sepolia) for the
// MiniPay-issued attestation.
//
// Requires ODIS_PRIVATE_KEY: a funded Celo account (small cUSD/CELO balance,
// used only to pay ODIS quota) — never reuse the contract-deploy PRIVATE_KEY.
//
// Known caveat: the SDK's testnet ODIS context is keyed to the legacy
// "Alfajores" network (chain 44787), not Celo Sepolia (chain 11142220).
// These are different chains post-migration — verify carefully in whichever
// environment ODIS_PRIVATE_KEY's account actually has quota on. If Alfajores
// lookups don't resolve, mainnet (with small quota top-ups) is the reliable
// path since that's what MiniPay itself uses in production.

import { NextResponse } from 'next/server'
import { privateKeyToAccount } from 'viem/accounts'
import { createPublicClient, http } from 'viem'
import { OdisUtils } from '@celo/identity'
import { celoMainnet } from '@/lib/chains'
import { SOCIALCONNECT } from '@/lib/tokens'

export const runtime = 'nodejs'

const { getServiceContext, AuthenticationMethod, OdisContextName, OdisAPI } = OdisUtils.Query
const { getObfuscatedIdentifier, IdentifierPrefix } = OdisUtils.Identifier

// Minimal ABI — just the one read we need, inlined to avoid depending on
// @celo/abis' package export map (which blocks direct subpath imports).
const FEDERATED_ATTESTATIONS_ABI = [
  {
    name: 'lookupAttestations',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'identifier', type: 'bytes32' },
      { name: 'trustedIssuers', type: 'address[]' },
    ],
    outputs: [
      { name: 'countsPerIssuer', type: 'uint256[]' },
      { name: 'accounts', type: 'address[]' },
      { name: 'signers', type: 'address[]' },
      { name: 'issuedOns', type: 'uint64[]' },
      { name: 'publishedOns', type: 'uint64[]' },
    ],
  },
] as const

interface Body {
  phone: string // E.164, e.g. +14155552671
}

// ─── Rate limiting ────────────────────────────────────────────────────────────
// Every lookup burns paid ODIS quota, so throttle hard. In-memory buckets are
// per-instance (fine on a single Fly machine / low-traffic Vercel function);
// swap for a shared store (KV/Redis) before scaling out.

const RL_WINDOW_MS = 60_000
const RL_MAX_PER_IP = 10 // lookups per IP per minute
const RL_MAX_PER_PHONE = 3 // lookups per phone per minute (any IP)
const buckets = new Map<string, { count: number; resetAt: number }>()

function rateLimited(key: string, max: number): boolean {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + RL_WINDOW_MS })
    return false
  }
  b.count += 1
  return b.count > max
}

// Drop expired buckets so the map cannot grow unbounded.
setInterval(() => {
  const now = Date.now()
  buckets.forEach((b, k) => now >= b.resetAt && buckets.delete(k))
}, RL_WINDOW_MS).unref?.()

export async function POST(req: Request) {
  const ip = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim()
  if (rateLimited(`ip:${ip}`, RL_MAX_PER_IP)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429, headers: { 'retry-after': '60' } })
  }

  let phone: string
  try {
    phone = ((await req.json()) as Body).phone
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }
  if (!phone || !/^\+[1-9]\d{6,14}$/.test(phone)) {
    return NextResponse.json({ error: 'invalid_phone' }, { status: 400 })
  }

  if (rateLimited(`phone:${phone}`, RL_MAX_PER_PHONE)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429, headers: { 'retry-after': '60' } })
  }

  const odisKey = process.env.ODIS_PRIVATE_KEY
  if (!odisKey) {
    return NextResponse.json(
      { error: 'not_configured', message: 'ODIS_PRIVATE_KEY is not set.' },
      { status: 501 },
    )
  }

  try {
    // Always mainnet: the SDK's "Alfajores" testnet ODIS combiner
    // (odis-combiner-alfajores.alfajores.celo-testnet.org) no longer resolves
    // post Celo's Sepolia migration, and SocialConnect has no Sepolia
    // deployment to fall back to. This is independent of NEXT_PUBLIC_NETWORK
    // — ODIS_PRIVATE_KEY's account must hold real mainnet CELO/cUSD quota.
    const context = getServiceContext(OdisContextName.MAINNET, OdisAPI.PNP)

    const key = (odisKey.startsWith('0x') ? odisKey : `0x${odisKey}`) as `0x${string}`
    const account = privateKeyToAccount(key)

    const { obfuscatedIdentifier } = await getObfuscatedIdentifier(
      phone,
      IdentifierPrefix.PHONE_NUMBER,
      account.address,
      { authenticationMethod: AuthenticationMethod.ENCRYPTION_KEY, rawKey: odisKey },
      context,
    )

    // SocialConnect attestations live on Celo mainnet regardless of which
    // network the rest of the app is pointed at.
    const client = createPublicClient({ chain: celoMainnet, transport: http() })
    const [, accounts] = await client.readContract({
      address: SOCIALCONNECT.FEDERATED_ATTESTATIONS,
      abi: FEDERATED_ATTESTATIONS_ABI,
      functionName: 'lookupAttestations',
      args: [obfuscatedIdentifier as `0x${string}`, [SOCIALCONNECT.MINIPAY_ISSUER]],
    })

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    return NextResponse.json({ address: accounts[0] })
  } catch (e) {
    // Log the detail server-side only — SDK errors can leak infra internals.
    console.error('resolve-phone lookup failed:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'lookup_failed' }, { status: 502 })
  }
}
