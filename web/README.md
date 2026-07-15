# Rupia.fi — Web App

Next.js frontend for the Rupia.fi vault. Connect Freighter, deposit USDC into a
diversified savings basket, watch NAV grow from yield, redeem anytime. Reads are
live testnet simulations (no wallet needed); mint/redeem sign via Freighter.

## Stack
- Next.js 16 (App Router) + TypeScript + Tailwind
- `@stellar/stellar-sdk` — RPC, contract calls, simulation
- `@stellar/freighter-api` — wallet connect + signing

## Run
```bash
npm install
npm run dev      # http://localhost:3000
```

Config lives in `.env.local` (testnet contract IDs already filled).

## Prereqs for mint/redeem
- Freighter extension installed, set to **Testnet**.
- Connected account needs a **USDC trustline** and some testnet USDC.
  See `../contracts/DEPLOYMENT.md` for the change-trust command and issuer.

## Verify
```bash
node scripts/smoke-read.mjs   # confirms client reads live contract state
npm run build                 # type-check + production build
```

## Layout
- `src/lib/vault.ts` — contract client (reads via sim, writes via Freighter).
- `src/lib/useWallet.ts` — Freighter connect hook.
- `src/app/page.tsx` — dashboard: problem framing, stats, mint/redeem, proof-of-reserve.

## Ceilings (ponytail debt)
- Single basket (USDC vault) — multi-asset baskets pending contract v2.
- No SEP-24 anchor deposit yet — user brings USDC directly. Anchor on/off-ramp is roadmap.
- NAV history not charted (no indexer) — shows current NAV only.
