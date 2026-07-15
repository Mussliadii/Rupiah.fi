# Rupia.fi

**Diversified on-chain savings on Stellar — turn crypto speculation into healthy, yield-bearing savings, deposit & withdraw in rupiah, transparent on the blockchain.**

> APAC Stellar Hackathon · DeFi Track · Testnet MVP

---

## Problem

22.4 million Indonesians hold crypto (OJK, May 2026) — ~3× the number of stock investors (8.5 million, KSEI) — yet almost all of it is single-token speculation. There is no simple, diversified on-chain savings product. Conventional mutual funds are full of friction (layered KYC, T+2 settlement, hidden fees, no transparency).

**Rupia.fi**: one token = one basket of assets. Deposit USDC, receive a basket token whose value (NAV) grows from yield. Redeem anytime. Every token is backed by real assets in the vault contract — auditable by anyone on Stellar Expert.

Anti-thesis (why pure crypto indexes failed, e.g. Index Coop −99.6%): a basket of correlated altcoins, a degen audience, no distribution. Rupia.fi is different: a multi-currency basket + yield, a retail-inclusion audience, distribution via local rupiah anchors.

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

## Status (live testnet)

The vault contract is live on Stellar Testnet. The flow is verified end-to-end: **mint → yield raises NAV → redeem captures yield**.

| Item | Value |
|---|---|
| Vault contract | `CDPIP5VKHN4S5X7OFWI7SKGSAJ5TYBRW367OEHUUQC37SAFZ2JNZROYY` |
| USDC (mock SAC) | `CDNUD36Y3EBDDZNBKMK6R7CHWFFTENCGFAGQLWLALUJJRMDJVHTJHS7N` |
| Demo state | NAV 1.05 · reserve 1,039.5 USDC · 990 tokens outstanding |
| Explorer | [Stellar Expert](https://stellar.expert/explorer/testnet/contract/CDPIP5VKHN4S5X7OFWI7SKGSAJ5TYBRW367OEHUUQC37SAFZ2JNZROYY) |

Deploy + account details: [`contracts/DEPLOYMENT.md`](contracts/DEPLOYMENT.md).

## Repo structure

| Folder | Contents |
|---|---|
| [`contracts/`](contracts/README.md) | Soroban vault (Rust) — `initialize`, `mint`, `redeem`, `nav`, `simulate_yield` + unit tests. |
| [`web/`](web/README.md) | Next.js frontend — connect Freighter, activate USDC, deposit/withdraw, NAV dashboard, proof-of-reserve. |
| [`plan.md`](plan.md) | Full product plan: data-backed problem, spec, work phases, demo scenario. |
| [`DECK.md`](DECK.md) | Pitch deck (10 slides, Marp). |

## Running

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

Prerequisites for mint/redeem: Freighter extension (Testnet mode), wallet with a USDC trustline (the "Activate USDC" button in the app) + testnet USDC.

## Integrations

| Component | Used | Status |
|---|---|---|
| Wallet | Freighter (`@stellar/freighter-api`) | ✓ live |
| Oracle | Reflector price feed (SEP-40) | ✓ live (XLM/USD & USDC/USD prices on dashboard) |
| Rupiah anchor | IDRX SEP-24 | roadmap |
| Swap | Soroswap router | roadmap (v2) |
| Yield | Blend USDC pool | mock (`simulate_yield`), roadmap |

## Ceilings (intentional technical debt)

- Single-asset USDC — multi-asset basket + Soroswap routing = v2.
- Mock yield (`simulate_yield`) — real Blend pending.
- No SEP-24 anchor yet — users bring USDC directly.
- Shares = internal ledger, not yet a wallet-visible SAC token.
