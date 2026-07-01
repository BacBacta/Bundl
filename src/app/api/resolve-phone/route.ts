// Phone number -> wallet address resolution via SocialConnect (ODIS +
// FederatedAttestations). Runs server-side because ODIS lookups require
// paying quota from a funded account and should never expose a private key
// to the client.
//
// STATUS: scaffolded, not wired to a live account. Two things are required
// before this returns real results:
//   1. ODIS_PRIVATE_KEY — a funded Celo account (small cUSD/CELO balance) used
//      only to pay ODIS quota. Never reuse the contract-deploy PRIVATE_KEY.
//   2. A BLS blinding client for the ODIS blinding step (the `@celo/identity`
//      SDK's getPhoneNumberIdentifier expects a `blsBlindingClient` — e.g.
//      `@celo/phone-number-privacy-common`'s WASM blinding client). This is a
//      real, non-trivial dependency we deliberately did not add speculatively
//      — see https://docs.celo.org/developer/contractkit/odis for the current
//      recommended client.
// Until both are configured, this route fails safe: it returns 501 with a
// clear reason instead of a broken or fake result. The client hook
// (src/lib/phoneResolve.ts) treats any non-OK response as "not available" and
// falls back to manual address entry / the MiniPay contact picker — no user
// ever sees an error, they just don't get this optional shortcut yet.

import { NextResponse } from 'next/server'
import { SOCIALCONNECT } from '@/lib/tokens'

export const runtime = 'nodejs'

interface Body {
  phone: string // E.164, e.g. +14155552671
}

export async function POST(req: Request) {
  const { phone } = (await req.json()) as Body
  if (!phone || !/^\+[1-9]\d{6,14}$/.test(phone)) {
    return NextResponse.json({ error: 'invalid_phone' }, { status: 400 })
  }

  const odisKey = process.env.ODIS_PRIVATE_KEY
  if (!odisKey) {
    return NextResponse.json(
      {
        error: 'not_configured',
        message: 'Phone lookup requires a funded ODIS_PRIVATE_KEY and a BLS blinding client — not set up yet.',
      },
      { status: 501 },
    )
  }

  try {
    // Real flow (once configured):
    //   1. const authSigner = { authenticationMethod: WALLETKEY, contractKit }
    //   2. const context = getServiceContext(network) // ODIS combiner URLs
    //   3. const { plaintextIdentifier } = await getPhoneNumberIdentifier(
    //        phone, account, authSigner, context, undefined, undefined,
    //        blsBlindingClient, // <- the missing WASM dependency
    //      )
    //   4. const attestations = await federatedAttestations.lookupAttestations(
    //        plaintextIdentifier, [SOCIALCONNECT.MINIPAY_ISSUER],
    //      )
    //   5. Return the first verified address, if any.
    //
    // Left unimplemented until the two prerequisites above are in place —
    // see the module comment. Referencing SOCIALCONNECT here so the intended
    // trusted issuer is documented at the call site.
    void SOCIALCONNECT.MINIPAY_ISSUER
    return NextResponse.json({ error: 'not_configured' }, { status: 501 })
  } catch {
    return NextResponse.json({ error: 'lookup_failed' }, { status: 502 })
  }
}
