# Rupia.fi

**Tabungan terdiversifikasi on-chain di Stellar — ubah spekulasi kripto jadi tabungan sehat berbunga, setor & tarik pakai rupiah, transparan di blockchain.**

> APAC Stellar Hackathon · Track DeFi · Testnet MVP

---

## Masalah

22,4 juta orang Indonesia pegang kripto (OJK, Mei 2026) — ~3× investor saham (8,5 juta, KSEI) — tapi hampir semua hanya spekulasi satu token. Tidak ada produk tabungan terdiversifikasi on-chain yang sederhana. Reksa dana konvensional penuh friksi (KYC berlapis, settlement T+2, fee tersembunyi, tidak transparan).

**Rupia.fi**: satu token = satu basket aset. Setor USDC, dapat token basket yang nilainya (NAV) tumbuh dari yield. Redeem kapan saja. Setiap token di-back aset nyata di kontrak vault — bisa diaudit siapa pun di Stellar Expert.

Anti-thesis (kenapa index kripto murni gagal, mis. Index Coop −99,6%): basket altcoin berkorelasi, audiens degen, tanpa distribusi. Rupia.fi beda: basket multi-currency + yield, audiens inklusi retail, distribusi via anchor rupiah lokal.

## Arsitektur

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

Dibangun sendiri: **1 kontrak vault (Rust/Soroban) + frontend**. Sisanya integrasi Stellar — composability: anchor, AMM, lending, oracle.

## Status (live testnet)

Kontrak vault live di Stellar Testnet. Alur terverifikasi end-to-end: **mint → yield naikkan NAV → redeem tangkap yield**.

| Item | Nilai |
|---|---|
| Vault contract | `CDPIP5VKHN4S5X7OFWI7SKGSAJ5TYBRW367OEHUUQC37SAFZ2JNZROYY` |
| USDC (mock SAC) | `CDNUD36Y3EBDDZNBKMK6R7CHWFFTENCGFAGQLWLALUJJRMDJVHTJHS7N` |
| State demo | NAV 1,05 · reserve 1.039,5 USDC · 990 token beredar |
| Explorer | [Stellar Expert](https://stellar.expert/explorer/testnet/contract/CDPIP5VKHN4S5X7OFWI7SKGSAJ5TYBRW367OEHUUQC37SAFZ2JNZROYY) |

Detail deploy + akun: [`contracts/DEPLOYMENT.md`](contracts/DEPLOYMENT.md).

## Struktur repo

| Folder | Isi |
|---|---|
| [`contracts/`](contracts/README.md) | Vault Soroban (Rust) — `initialize`, `mint`, `redeem`, `nav`, `simulate_yield` + unit test. |
| [`web/`](web/README.md) | Frontend Next.js — connect Freighter, aktifkan USDC, setor/tarik, dashboard NAV, proof-of-reserve. |
| [`plan.md`](plan.md) | Rencana produk lengkap: masalah berbasis data, spec, fase kerja, skenario demo. |
| [`DECK.md`](DECK.md) | Slide deck pitch (10 halaman, Marp). |

## Menjalankan

**Kontrak:**
```bash
cd contracts
cargo test              # unit test (tanpa jaringan)
stellar contract build  # compile wasm
```

**Frontend:**
```bash
cd web
npm install
npm run dev             # http://localhost:3000
```

Prasyarat mint/redeem: extension Freighter (mode Testnet), wallet punya trustline USDC (tombol "Aktifkan USDC" di app) + testnet USDC.

## Integrasi

| Komponen | Dipakai | Status |
|---|---|---|
| Wallet | Freighter (`@stellar/freighter-api`) | ✓ live |
| Oracle | Reflector price feed (SEP-40) | ✓ live (harga XLM/USD & USDC/USD di dashboard) |
| Anchor rupiah | IDRX SEP-24 | roadmap |
| Swap | Soroswap router | roadmap (v2) |
| Yield | Blend USDC pool | mock (`simulate_yield`), roadmap |

## Ceilings (utang teknis yang disengaja)

- Single-asset USDC — basket multi-aset + Soroswap routing = v2.
- Yield mock (`simulate_yield`) — Blend nyata pending.
- Belum ada SEP-24 anchor — user bawa USDC langsung.
- Share = ledger internal, belum token SAC wallet-visible.
