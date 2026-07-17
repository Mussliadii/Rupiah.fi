# Rupia.fi

**Diversified on-chain savings on Stellar — turn crypto speculation into healthy, yield-bearing savings, deposit & withdraw in rupiah, transparent on the blockchain.**

> APAC Stellar Hackathon · DeFi Track · Testnet MVP

🌐 **Live demo: [https://rupiah-fi.vercel.app](https://rupiah-fi.vercel.app)**

---

## Problem

22.4 million Indonesians hold crypto (OJK, May 2026) — ~3× the number of stock investors (8.5 million, KSEI) — yet almost all of it is single-token speculation. There is no simple, diversified on-chain savings product. Conventional mutual funds are full of friction (layered KYC, T+2 settlement, hidden fees, no transparency).

**Rupia.fi**: one token = one basket of assets. Deposit USDC, receive a basket token whose value (NAV) grows from yield. Redeem anytime. Every token is backed by real assets in the vault contract — auditable by anyone on Stellar Expert.

Anti-thesis (why pure crypto indexes failed, e.g. Index Coop −99.6%): a basket of correlated altcoins, a degen audience, no distribution. Rupia.fi is different: a multi-currency basket + yield, a retail-inclusion audience, distribution via local rupiah anchors.

## Live demo

| | |
|---|---|
| **Web app** | [https://rupiah-fi.vercel.app](https://rupiah-fi.vercel.app) |
| **Explorer** | [Vault on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CDPIP5VKHN4S5X7OFWI7SKGSAJ5TYBRW367OEHUUQC37SAFZ2JNZROYY) |
| **Network** | Stellar Testnet |

What you can do on the live app:

- **Without a wallet** — view live vault stats read straight from the testnet contract via Soroban RPC simulation: NAV per share, total reserve, shares outstanding, proof-of-reserve, plus live XLM/USD & USDC/USD prices from the Reflector oracle (SEP-40).
- **With Freighter (Testnet mode)** — connect wallet, add the USDC trustline via the **Activate USDC** button, then deposit (mint shares) and withdraw (redeem shares) with real signed testnet transactions.
- **ID/EN language toggle** — the UI is bilingual (Bahasa Indonesia / English).

## Architecture

```
Frontend (Next.js + stellar-sdk + Freighter)
   │ SEP-24 rupiah             │ Soroban RPC
   ▼                           ▼
Anchor IDRX  ─────►  Vault Contract (Soroban / Rust)
                     mint · redeem · nav · rebalance
                       │           │           │
                   Soroswap      Blend      Reflector
                   (swap)        (yield)    (oracle)
```

Built from scratch: **1 vault contract (Rust/Soroban) + frontend**. The rest is Stellar integration — composability: anchor, AMM, lending, oracle.

### How the vault works

- `mint(user, amount)` — user deposits USDC, pays a 1% fee (`fee_bps = 100`, sent to admin — the revenue model), receives shares at the current NAV (bootstrap 1:1).
- `nav()` — NAV per share = total underlying held / total shares (scaled by 1e7; `10000000` = 1.0). Yield arriving in the vault raises every holder's value automatically.
- `simulate_yield(amount)` — demo stand-in for Blend lending interest: tops up the reserve, which raises NAV.
- `redeem(user, shares)` — burns shares, returns underlying at current NAV — yield captured on exit.

**Verified end-to-end on testnet** (7-decimal amounts):

1. Mint 1000 USDC → 10 fee to admin, 990 net → alice gets 990 shares, NAV = 1.0.
2. `simulate_yield` 99 USDC → NAV rises to 1.1.
3. Redeem 990 shares → alice receives 1089 USDC. Reserve → 0, supply → 0.
4. Net: alice +89 USDC (99 yield − 10 fee). Math closes.

## Status (live testnet)

| Item | Value |
|---|---|
| Vault contract | `CDPIP5VKHN4S5X7OFWI7SKGSAJ5TYBRW367OEHUUQC37SAFZ2JNZROYY` |
| USDC (mock SAC) | `CDNUD36Y3EBDDZNBKMK6R7CHWFFTENCGFAGQLWLALUJJRMDJVHTJHS7N` |
| USDC issuer | `GA7JQT2CYLMFQA6TQUA3SQ3QFJX7CDV24CMPPMZXOIEPDZVYBPUATJKE` |
| Demo state | NAV 1.05 · reserve 1,039.5 USDC · 990 shares outstanding |
| Explorer | [Stellar Expert](https://stellar.expert/explorer/testnet/contract/CDPIP5VKHN4S5X7OFWI7SKGSAJ5TYBRW367OEHUUQC37SAFZ2JNZROYY) |

Deploy + account details: [`contracts/DEPLOYMENT.md`](contracts/DEPLOYMENT.md).

## Repo structure

| Path | Contents |
|---|---|
| [`contracts/`](contracts/README.md) | Soroban vault (Rust) — `initialize`, `mint`, `redeem`, `nav`, `simulate_yield` + unit tests (round-trip, fee, yield-raises-NAV, edge cases). |
| [`contracts/DEPLOYMENT.md`](contracts/DEPLOYMENT.md) | Testnet deployment record: addresses, accounts, init params, verified flow. |
| [`web/`](web/README.md) | Next.js frontend — connect Freighter, activate USDC, deposit/withdraw, NAV dashboard, proof-of-reserve. |
| `web/src/lib/vault.ts` | Contract client — reads via RPC simulation, writes signed via Freighter. |
| `web/src/lib/useWallet.ts` | Freighter connect hook. |
| `web/src/app/page.tsx` | Dashboard: problem framing, stats, mint/redeem, proof-of-reserve. |
| [`DECK.md`](DECK.md) | Pitch deck (10 slides, Marp). |

## Tech stack

| Layer | Tech |
|---|---|
| Smart contract | Rust + Soroban SDK |
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind CSS |
| Chain access | `@stellar/stellar-sdk` (Soroban RPC, contract calls, simulation) |
| Wallet | `@stellar/freighter-api` |
| Oracle | Reflector price feed (SEP-40) |
| Hosting | Vercel — [rupiah-fi.vercel.app](https://rupiah-fi.vercel.app) |

## Running locally

**Contracts:**
```bash
cd contracts
cargo test              # unit tests (no network)
stellar contract build  # compile wasm
```

**Frontend:**
```bash
cd web
npm install
npm run dev             # http://localhost:3000
```

Config lives in `web/.env.local` — copy from [`web/.env.example`](web/.env.example) (testnet contract IDs already filled, safe to commit).

**Verify the frontend reads live contract state:**
```bash
cd web
node scripts/smoke-read.mjs   # prints NAV/reserve/supply from testnet
npm run build                 # type-check + production build
```

### Prerequisites for mint/redeem

1. [Freighter](https://www.freighter.app/) browser extension, switched to **Testnet**.
2. A funded testnet account (friendbot).
3. A **USDC trustline** — use the **Activate USDC** button in the app, or CLI:
   ```bash
   stellar tx new change-trust --source <acct> --network testnet \
     --line USDC:GA7JQT2CYLMFQA6TQUA3SQ3QFJX7CDV24CMPPMZXOIEPDZVYBPUATJKE
   ```
4. Some testnet USDC in the wallet.

Read-only features (NAV dashboard, proof-of-reserve, oracle prices) need no wallet at all.

## Deploying to Vercel

The Next.js app lives in the `web/` subfolder, so the Vercel project needs:

- **Settings → Build and Deployment → Root Directory** = `web`
- Framework preset: Next.js (auto-detected once root is correct)
- No env vars required — public testnet config ships in the repo.

## Integrations

| Component | Used | Status |
|---|---|---|
| Wallet | Freighter (`@stellar/freighter-api`) | ✓ live |
| Oracle | Reflector price feed (SEP-40) | ✓ live (XLM/USD & USDC/USD prices on dashboard) |
| Rupiah anchor | IDRX SEP-24 | roadmap |
| Swap | Soroswap router | roadmap (v2) |
| Yield | Blend USDC pool | mock (`simulate_yield`), roadmap |

## Roadmap

- **v2 basket** — multi-asset (USDC + XLM + tokenized instruments) priced via Reflector, rebalanced via Soroswap.
- **Real yield** — replace `simulate_yield` with the Blend USDC lending pool.
- **Rupiah on/off-ramp** — SEP-24 deposit/withdraw through a local IDRX anchor.
- **Wallet-visible shares** — back the internal share ledger with a SAC token.
- **Mainnet** — after security audit + local regulatory partnership.

## Ceilings (intentional technical debt)

- Single-asset USDC — multi-asset basket + Soroswap routing = v2.
- Mock yield (`simulate_yield`) — real Blend pending.
- No SEP-24 anchor yet — users bring USDC directly.
- Shares = internal ledger, not yet a wallet-visible SAC token.
- NAV history not charted (no indexer) — current NAV only.
