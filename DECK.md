---
marp: true
theme: default
paginate: true
---

# Rupia.fi
### Tabungan Terdiversifikasi On-Chain di Stellar

**Ubah spekulasi kripto jadi tabungan sehat berbunga — setor & tarik pakai rupiah, transparan di blockchain.**

APAC Stellar Hackathon · Track DeFi

---

## Masalah

- **22,4 juta** orang Indonesia pegang kripto (OJK, Mei 2026) — **~3×** investor saham (8,5 juta, KSEI).
- Mayoritas retail masuk lewat **spekulasi satu token**. Nol produk tabungan sehat on-chain.
- Reksa dana konvensional: KYC berlapis, jam operasional, settlement T+2, fee tersembunyi, tidak transparan.
- Rupiah terus melemah → butuh lindung nilai dollar, tapi akses retail terbatas.

> Jutaan orang loncat ke aset berisiko tanpa pernah punya produk tabungan yang benar.

---

## Kenapa "index kripto" saja gagal

Index Coop (Ethereum): TVL jatuh ke ~$15M, token flagship **−99,6%** dari puncak.

**Kenapa gagal:**
- Basket altcoin yang berkorelasi — tetap volatil.
- Audiens degen, bukan penabung.
- Tanpa jalur distribusi ke pengguna nyata.

**Kenapa Rupia.fi beda:**
- Basket **multi-currency + yield**, bukan altcoin.
- Audiens **inklusi keuangan retail**.
- Distribusi via **anchor rupiah lokal**.

---

## Produk: dua basket preset

| Basket | Token | Komposisi | Untuk siapa |
|---|---|---|---|
| **Stabil** | `LSTB` | IDRX 40% · USDC 50% · EURC 10% | Lindung nilai rupiah, nol volatilitas kripto |
| **Tumbuh** | `LTBH` | USDC 50% (→ Blend yield) · XLM 30% · IDRX 20% | Tabungan berbunga + eksposur growth |

Satu token = satu basket. NAV naik seiring underlying + yield. Redeem kapan saja.

*Preset, bukan custom — audiens pemula, banyak pilihan = friksi.*

---

## Cara kerja

```
Frontend (Next.js + Freighter)
   │ SEP-24 rupiah          │ Soroban RPC
   ▼                        ▼
Anchor IDRX  ──►  Vault Contract (Soroban/Rust)
                  mint · redeem · nav · rebalance
                    │         │         │
                Soroswap    Blend    Reflector
                (swap)     (yield)   (oracle)
```

**Kami bangun 1 kontrak vault + frontend.** Sisanya integrasi Stellar — composability: oracle **Reflector ✓ live**, anchor · AMM · lending (roadmap).

---

## Demo (live testnet)

- Kontrak vault **live di Stellar testnet**, teraudit di Stellar Expert.
- Alur nyata terverifikasi: **mint → yield naikkan NAV → redeem tangkap yield**.
- State sekarang: **NAV 1,05 · reserve 1.039,5 USDC · 990 token beredar**.
- Oracle **Reflector live**: harga XLM/USD & USDC/USD dibaca on-chain di dashboard.
- Math tertutup: yield 99 − fee 10 = penabung +89 USDC bersih.

> Bukti cadangan on-chain: setiap token di-back USDC nyata, bisa diaudit siapa pun.

---

## Kenapa Stellar

- **Anchor lokal**: IDRX & rupiah on/off-ramp lewat SEP-24 — jembatan bank ke on-chain.
- **Biaya ~$0,000001** per transaksi — layak untuk tabungan retail nominal kecil.
- **Settlement ~5 detik** — bukan T+2.
- **SEP standards + Soroban** — smart contract + interoperabilitas anchor dalam satu ekosistem.

---

## Model bisnis

- **Fee bps saat mint** — sudah jalan di kontrak (parameter `fee_bps`, kini 1%).
- Roadmap: management fee tahunan atas AUM (seperti reksa dana, tapi transparan).
- Skala revenue mengikuti TVL — selaras dengan pertumbuhan pengguna.

---

## Roadmap

- **v1 (sekarang):** vault single-asset USDC, mint/redeem/NAV, proof-of-reserve.
- **v2:** basket multi-aset penuh (Soroswap routing + Reflector oracle + Blend yield).
- **v3:** SEP-24 anchor rupiah, passkey smart wallet ("nenek bisa pakai").
- **v4:** auto-invest berkala (DCA), basket PHP & VND untuk ekspansi regional APAC.

---

## Tim & Ask

**Tim:** Musliadi — solo builder (produk, kontrak Soroban, frontend)

**Ask:**
- Grant Stellar Community Fund untuk integrasi anchor rupiah produksi.
- Koneksi ke anchor IDRX & partner regulator lokal.
- Lanjut ke mainnet dengan audit keamanan.

> Rupia.fi: reksa dana yang bisa diaudit siapa pun, kapan pun.