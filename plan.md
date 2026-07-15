# PLAN — Rupia.fi: Tabungan Terdiversifikasi On-Chain di Stellar

> APAC Stellar Hackathon — Track DeFi
> Satu kalimat: "22 juta orang Indonesia sudah pegang kripto tapi nol produk tabungan sehat — Rupia.fi mengubah spekulasi jadi tabungan terdiversifikasi berbunga, setor & tarik pakai rupiah, transparan on-chain."

---

## 1. Latar Belakang Masalah (untuk pitch, berbasis data)

- Investor kripto Indonesia: **22,4 juta per Mei 2026** (OJK, via CNBC Indonesia) — ~3x investor saham (~8,5 juta, KSEI), melebihi total investor pasar modal.
- Mayoritas retail masuk on-chain lewat spekulasi single-token. Tidak ada produk diversifikasi/tabungan on-chain yang sederhana.
- Reksa dana konvensional: friksi tinggi (KYC per platform, jam operasional, settlement T+2, fee berlapis, tidak transparan).
- Depresiasi IDR/PHP/VND → kebutuhan lindung nilai dollar untuk retail, tapi akses terbatas.
- Anti-thesis yang harus dijawab di pitch: on-chain crypto index murni sudah terbukti gagal (Index Coop TVL ~$15M, token -99,6% ATH). Kegagalan mereka: basket altcoin berkorelasi, audiens degen, tanpa distribusi. Rupia.fi beda: basket multi-currency + yield, audiens retail inclusion, distribusi via anchor lokal.

---

## 2. Produk

### 2.1 Konsep
Satu token = satu basket aset. User setor IDR (atau USDC/XLM), dapat token basket yang nilainya (NAV) mengikuti underlying + yield. Redeem kapan pun, cash-out ke bank via anchor.

### 2.2 Basket (preset, TIDAK ada custom basket)

| Basket | Token | Komposisi target | Value prop |
|---|---|---|---|
| **Stabil** | `LSTB` | IDRX 40% + USDC 50% + EURC 10% | Lindung nilai rupiah, nol volatilitas kripto |
| **Tumbuh** | `LTBH` | USDC 50% (di-supply ke Blend → yield) + XLM 30% + IDRX 20% | Tabungan berbunga + eksposur growth |

Alasan preset: audiens retail pemula; banyak pilihan = friksi. Custom basket/curator = fitur Hedgera yang dibuang (roadmap saja).

### 2.3 Fitur user-facing (scope hackathon)
1. Onboarding: connect Freighter ATAU passkey wallet (smart wallet Soroban) — passkey lebih kuat untuk narasi "nenek bisa pakai".
2. Deposit: SEP-24 IDR via anchor (IDRX) ATAU transfer USDC/XLM langsung.
3. Mint: pilih basket → setor → terima token basket.
4. Dashboard: saldo, NAV per token, grafik pertumbuhan, **isi vault real-time on-chain** (selling point transparansi).
5. Redeem: burn token → terima IDR/USDC → withdraw SEP-24 ke bank.
6. Halaman "Bukti Cadangan": link Stellar Expert ke vault, breakdown underlying per token.

### 2.4 Yang di-SKIP (sebut sebagai roadmap di pitch)
- Custom basket / curator fee
- Governance token
- Multi-chain
- Auto-invest berkala (DCA) — sebut sebagai fitur v2, menarik untuk juri
- Fee management yang rumit (cukup 1 parameter fee bps di kontrak)

---

## 3. Arsitektur Teknis

```
┌─────────────────────────────────────────────────┐
│ Frontend (Next.js + stellar-sdk + Freighter API)│
│  - mint/redeem UI, dashboard NAV, proof page    │
└──────────┬──────────────────────┬───────────────┘
           │ SEP-24 (deposit/     │ Soroban RPC
           │  withdraw IDR)       ▼
    ┌──────▼──────┐   ┌─────────────────────────────┐
    │ Anchor IDRX │   │  Vault Contract (Soroban)   │
    │ (on/off-ramp│   │  per basket, 1 instance     │
    │  rupiah)    │   │  ┌───────────────────────┐  │
    └─────────────┘   │  │ mint / redeem / NAV   │  │
                      │  │ rebalance             │  │
                      │  └───┬──────┬──────┬─────┘  │
                      └──────┼──────┼──────┼────────┘
                             │      │      │
                   ┌─────────▼┐ ┌───▼────┐ ┌▼─────────┐
                   │ Soroswap │ │ Blend  │ │ Reflector│
                   │ (swap ke │ │ (yield │ │ (oracle  │
                   │ komposisi│ │  USDC) │ │  harga)  │
                   └──────────┘ └────────┘ └──────────┘
```

Dibangun sendiri: **1 kontrak vault (Rust/Soroban) + frontend**. Sisanya integrasi — persis poin composability yang diminta juri: anchor ✓, AMM ✓, lending ✓, oracle ✓.

### 3.1 Kontrak Vault (Soroban, Rust)

State:
- `assets: Vec<(Address, u32)>` — (token, bobot target bps)
- `basket_token: Address` — token basket (Stellar Asset Contract atau token Soroban sendiri)
- `total_supply`, `fee_bps`, `admin`, `blend_pool: Option<Address>`

Fungsi publik:

| Fungsi | Logika |
|---|---|
| `initialize(admin, assets, weights, fee_bps)` | set komposisi; validasi total bobot = 10000 bps |
| `mint(user, token_in, amount)` | terima aset → swap via Soroswap router ke komposisi target → hitung `shares = amount_value / nav()` → mint token basket ke user |
| `redeem(user, shares, token_out)` | burn shares → tarik proporsi underlying (unwind Blend jika perlu) → swap ke `token_out` → transfer ke user |
| `nav()` | Σ (saldo underlying × harga Reflector) / total_supply; saldo Blend dihitung via posisi bToken |
| `rebalance()` | permissionless; jika deviasi bobot aktual vs target > 500 bps → swap via Soroswap kembali ke target |
| `composition()` | view: isi vault untuk halaman proof-of-reserve |

Keputusan desain:
- Harga selalu dari Reflector, JANGAN dari spot AMM (manipulasi).
- Slippage guard di setiap swap (`min_out` dari harga oracle ± toleransi).
- `rebalance()` permissionless + threshold → tidak perlu keeper/cron infra.
- Fee: potong `fee_bps` saat mint saja (paling sederhana yang tetap jadi revenue model).

### 3.2 Integrasi

| Komponen | Apa yang dipakai | Fallback kalau macet |
|---|---|---|
| Anchor IDR | IDRX SEP-24 testnet | Mock anchor sendiri (SEP-24 reference server) atau demo pakai token IDR mock |
| Swap | Soroswap router (testnet) | Path payment Stellar classic, atau pool sendiri di testnet |
| Yield | Blend pool USDC testnet | Mock yield: kontrak dummy yang accrue bunga tetap — jujur bilang "mainnet pakai Blend" |
| Oracle | Reflector testnet feed | Harga hardcoded admin-settable untuk demo |

Aturan: cek ketersediaan testnet SEMUA integrasi di hari pertama fase build. Yang tidak jalan → langsung fallback, jangan buang waktu.

### 3.3 Frontend
- Next.js + TypeScript + Tailwind. `@stellar/stellar-sdk` + `@creit.tech/stellar-wallets-kit` (Freighter + passkey sekali integrasi).
- Halaman: Landing (problem + 2 basket) / Mint / Dashboard / Redeem / Proof-of-Reserve.
- Bahasa UI: Indonesia + English toggle (juri regional — nilai plus lokalisasi).
- NAV chart: simpan snapshot NAV per jam di localStorage/supabase ringan — jangan bangun indexer.

---

## 4. Rencana Kerja (fase, bukan tanggal)

### Fase 0 — Validasi teknis (1–2 hari)
- [ ] Deploy hello-world Soroban ke testnet, wallet connect jalan.
- [ ] Cek testnet: Soroswap router, Blend pool, Reflector feed, IDRX anchor. Catat mana yang perlu fallback.
- [ ] Setup repo: `contracts/` (Rust workspace) + `web/` (Next.js).

### Fase 1 — Kontrak inti (3–5 hari)
- [ ] Vault: initialize, mint, redeem, nav — dulu TANPA swap (terima komposisi exact, single asset USDC saja).
- [ ] Unit test Rust: mint→nav→redeem round-trip, fee, edge case (supply 0, redeem > saldo).
- [ ] Integrasi Reflector untuk nav().
- [ ] Integrasi Soroswap di mint/redeem (single asset in → multi asset vault).
- [ ] Integrasi Blend untuk porsi USDC basket Tumbuh.
- [ ] `rebalance()` + threshold.

### Fase 2 — Frontend (3–4 hari, bisa paralel dengan Fase 1 akhir)
- [ ] Wallet connect + mint flow + redeem flow.
- [ ] Dashboard NAV + proof-of-reserve page.
- [ ] SEP-24 deposit/withdraw flow (atau mock).
- [ ] Polish UI dua bahasa.

### Fase 3 — Deliverables lomba (2–3 hari)
- [ ] Deploy final testnet, seed data supaya demo hidup (NAV sudah bergerak, yield sudah accrue).
- [ ] Video pitch ≤3 menit: problem (data 22,4 juta) → demo mint→yield→redeem → arsitektur composability → revenue → roadmap.
- [ ] README: problem, arsitektur (diagram di atas), cara run, alamat kontrak testnet, daftar integrasi.
- [ ] Slide deck 8–10 halaman (struktur di §6).
- [ ] Latihan pitch 5 menit untuk Demo Day.

---

## 5. Skenario Demo (5 menit)

1. **(30 dtk)** Problem: "22,4 juta orang Indonesia pegang kripto, 8,5 juta pegang saham. Jutaan orang loncat ke spekulasi tanpa pernah punya produk tabungan sehat."
2. **(1 mnt)** Buka app, connect passkey, deposit "rupiah" via anchor flow → saldo IDR on-chain.
3. **(1,5 mnt)** Mint basket Tumbuh → tunjukkan swap otomatis ke USDC/XLM/IDRX + USDC masuk Blend → dashboard: NAV, komposisi, yield accruing.
4. **(1 mnt)** Proof-of-reserve: buka Stellar Expert, tunjukkan underlying nyata di vault. "Reksa dana yang bisa diaudit siapa pun, kapan pun."
5. **(30 dtk)** Redeem sebagian → IDR → withdraw ke bank (anchor flow).
6. **(30 dtk)** Composability (4 protokol), revenue (fee bps), roadmap (DCA, PHP/VND basket, mainnet).

---

## 6. Struktur Slide Deck

1. Judul + satu kalimat.
2. Problem: data OJK/KSEI, gap produk tabungan on-chain.
3. Kenapa index kripto murni gagal (Index Coop) → kenapa desain kami beda. *(Slide ini senjata: menunjukkan riset pasar, mengantisipasi pertanyaan juri.)*
4. Produk: 2 basket, screenshot dashboard.
5. Cara kerja: diagram arsitektur + 4 integrasi Stellar.
6. Kenapa Stellar: anchor lokal IDR, biaya ~$0.000001, settlement 5 detik, SEP standards.
7. Revenue model: fee bps mint + management fee (roadmap).
8. Traksi/validasi + roadmap (DCA, basket PHP/VND untuk ekspansi regional).
9. Tim.
10. Ask/closing.

---

## 7. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Soroswap/Blend/Reflector testnet mati atau berubah | Fallback per §3.2, cek hari pertama |
| Anchor IDRX tidak bisa diintegrasi | Mock SEP-24 server, jujur di README |
| Kontrak terlalu ambisius | Urutan build §Fase 1: mint/redeem single-asset dulu = MVP yang sudah bisa didemo |
| Juri tanya "kenapa bukan pegang USDC saja" | Jawaban: yield Blend + eksposur lokal + satu klik vs kelola 3 posisi manual |
| Juri tanya keamanan | Slippage guard + oracle Reflector (bukan spot) + preset basket (tidak ada aset sampah) |

---

## 8. Definisi Selesai

- [ ] Kontrak vault live di testnet, alamat di README.
- [ ] Mint → NAV naik dari yield → redeem, jalan end-to-end di app.
- [ ] Minimal 3 dari 4 integrasi nyata (anchor boleh mock).
- [ ] Video pitch + deck + README lengkap.
- [ ] Semua klaim di pitch bisa didemokan atau ada sumber datanya.
