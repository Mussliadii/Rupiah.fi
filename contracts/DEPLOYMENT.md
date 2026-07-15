# Testnet Deployment — Rupia.fi Vault (MVP single-asset)

Network: **Stellar Testnet** (`Test SDF Network ; September 2015`)
Verified end-to-end: mint → yield raises NAV → redeem captures yield.
Seeded live for demo: NAV **1.05**, supply **990** tokens, reserve **1039.5 USDC** (alice holds 990 shares).

## Contract addresses
| Item | Address |
|---|---|
| Vault contract | `CDPIP5VKHN4S5X7OFWI7SKGSAJ5TYBRW367OEHUUQC37SAFZ2JNZROYY` |
| USDC (mock SAC) | `CDNUD36Y3EBDDZNBKMK6R7CHWFFTENCGFAGQLWLALUJJRMDJVHTJHS7N` |
| Wasm hash | `2f739596df4947342561da5f3e71fa8e2fe47592bf28fe5abf3efc1b2f6db9e6` |

## Accounts (testnet identities, in ~/.config/stellar/identity)
| Alias | Public key | Role |
|---|---|---|
| deployer | `GDQSD63BWYSU6KDHCJ56SQXTNFC3QAVHUCFQRM7O7AHPZ3JLSJCGBOVD` | admin, fee recipient |
| usdcissuer | `GA7JQT2CYLMFQA6TQUA3SQ3QFJX7CDV24CMPPMZXOIEPDZVYBPUATJKE` | USDC issuer, yield sponsor |
| alice | `GBYYZJARMLCPPRBUK2QMBXBPAJNPFMOD25LB7ZETTNZTPNHOYZSOWZDL` | demo user |

## Init params
`initialize(admin=deployer, underlying=USDC_SAC, fee_bps=100)` — 1% mint fee.

## Verified flow (7-decimal amounts)
1. Mint 1000 USDC → 10 fee to admin, 990 net, alice got 990 shares (bootstrap 1:1). NAV=1.0.
2. simulate_yield 99 USDC → NAV rose to 1.1.
3. Redeem 990 shares → alice received 1089 USDC. Vault reserve→0, supply→0.
4. Net: alice +89 USDC (99 yield − 10 fee). Math closes.

## Gotcha (classic-account trustlines)
SAC transfers to a **classic account** (admin fee, user redeem) need a USDC
trustline on that account first:
```
stellar tx new change-trust --source <acct> --network testnet --line USDC:<ISSUER>
```
The vault *contract* holds SAC balances without a trustline. Frontend must
ensure the connected wallet has the trustline before mint/redeem.

## Explorer
https://stellar.expert/explorer/testnet/contract/CDPIP5VKHN4S5X7OFWI7SKGSAJ5TYBRW367OEHUUQC37SAFZ2JNZROYY
