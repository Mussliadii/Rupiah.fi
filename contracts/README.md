# Rupia.fi — Vault Contract (Soroban)

Single-asset MVP. User deposits underlying (USDC on testnet), receives basket
shares. NAV per share = total underlying held / total shares, so yield arriving
in the vault raises every holder's value automatically.

## Layout
- `vault/src/lib.rs` — contract: `initialize`, `mint`, `redeem`, `nav`, `simulate_yield`, views.
- `vault/src/test.rs` — unit tests (round-trip, fee, yield-raises-NAV, edge cases).

## Build & test
```bash
cargo test              # run unit tests (no network)
stellar contract build  # compile wasm
```

## Deploy (testnet)
```bash
# one-time
stellar keys generate deployer --network testnet --fund

# deploy
./scripts/deploy.sh
```

## Initialize
Needs a testnet USDC Stellar Asset Contract address as underlying.
```bash
stellar contract invoke --id <VAULT_ID> --source deployer --network testnet -- \
  initialize --admin <ADMIN_ADDR> --underlying <USDC_SAC_ADDR> --fee_bps 100
```

## Interact
```bash
# deposit 1000.0000000 units
stellar contract invoke --id <VAULT_ID> --source alice --network testnet -- \
  mint --user <ALICE> --amount 10000000000

# check NAV (scaled by 1e7; 10000000 == 1.0)
stellar contract invoke --id <VAULT_ID> --network testnet -- nav

# redeem
stellar contract invoke --id <VAULT_ID> --source alice --network testnet -- \
  redeem --user <ALICE> --shares <N>
```

## Design notes
- Shares are an internal ledger, not a wallet token (v2: back with a SAC).
- NAV/price uses live token balance; for multi-asset baskets, swap to Reflector
  oracle pricing (see `../plan.md` Fase 1).
- `simulate_yield` is a demo stand-in for Blend lending interest.
- `mint` charges `fee_bps` to admin — the revenue model.

## Ceilings (ponytail debt)
- Single underlying only — multi-asset + Soroswap routing is next.
- Internal share ledger — no wallet-visible basket token yet.
- Mock yield — real Blend integration pending.
