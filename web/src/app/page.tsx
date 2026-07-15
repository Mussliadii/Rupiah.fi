"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@/lib/useWallet";
import {
  addUsdcTrustline,
  getNav,
  getOraclePrice,
  getShares,
  getTotalSupply,
  getTotalUnderlying,
  getUsdcBalance,
  hasUsdcTrustline,
  mint,
  redeem,
  VAULT_ID,
} from "@/lib/vault";

type Stats = {
  nav: number;
  supply: number;
  reserve: number;
  shares: number;
  usdc: number;
};

type Lang = "id" | "en";

type Dict = {
  subtitle: string;
  connect: string;
  connecting: string;
  problemBold: string;
  problemRest: string;
  navLabel: string;
  reserveLabel: string;
  supplyLabel: string;
  yourValueLabel: string;
  oracleTitle: string;
  oracleLive: string;
  oracleDesc: string;
  actionTitle: string;
  connectPrompt: string;
  trustWarn: string;
  trustBtn: string;
  processing: string;
  amount: string;
  depositBtn: string;
  withdrawBtn: string;
  balanceLine: (usdc: string, shares: string) => string;
  mintOk: (a: string) => string;
  redeemOk: (a: string) => string;
  trustOk: string;
  proofTitle: string;
  proofDesc: string;
  reserveOnchain: string;
  viewContract: string;
  footer: string;
};

const STR: Record<Lang, Dict> = {
  id: {
    subtitle: "Tabungan terdiversifikasi on-chain di Stellar",
    connect: "Hubungkan Freighter",
    connecting: "Menghubungkan…",
    problemBold: "22,4 juta orang Indonesia",
    problemRest:
      " sudah pegang kripto — hampir 3× investor saham. Tapi hampir semua hanya spekulasi satu token. Rupia.fi ubah itu jadi tabungan terdiversifikasi berbunga: setor sekali, dapat basket aset yang nilainya (NAV) tumbuh dari yield, tarik kapan saja.",
    navLabel: "NAV / token",
    reserveLabel: "Total cadangan",
    supplyLabel: "Token beredar",
    yourValueLabel: "Nilai kamu",
    oracleTitle: "Harga Oracle",
    oracleLive: "Reflector · live",
    oracleDesc:
      "Harga aset dibaca on-chain dari oracle Reflector — dasar valuasi NAV basket multi-aset.",
    actionTitle: "Setor / Tarik",
    connectPrompt: "Hubungkan wallet untuk mulai.",
    trustWarn: "Wallet belum aktifkan USDC. Wajib sekali sebelum setor.",
    trustBtn: "Aktifkan USDC",
    processing: "Memproses…",
    amount: "Jumlah",
    depositBtn: "Setor USDC",
    withdrawBtn: "Tarik",
    balanceLine: (usdc, shares) =>
      `Saldo USDC: ${usdc} · Token basket kamu: ${shares}`,
    mintOk: (a) => `Berhasil setor ${a} USDC. Kamu terima token basket.`,
    redeemOk: (a) => `Berhasil tarik ${a} token basket.`,
    trustOk: "USDC aktif. Sekarang bisa setor.",
    proofTitle: "Bukti Cadangan",
    proofDesc:
      "Setiap token basket di-back oleh USDC nyata di kontrak vault. Bisa diaudit siapa pun, kapan pun — tidak seperti reksa dana konvensional.",
    reserveOnchain: "Cadangan on-chain",
    viewContract: "Lihat kontrak di Stellar Expert →",
    footer: "APAC Stellar Hackathon · Track DeFi · Testnet MVP",
  },
  en: {
    subtitle: "Diversified on-chain savings on Stellar",
    connect: "Connect Freighter",
    connecting: "Connecting…",
    problemBold: "22.4 million Indonesians",
    problemRest:
      " already hold crypto — nearly 3× the number of stock investors. But almost all of it is single-token speculation. Rupia.fi turns that into diversified, yield-bearing savings: deposit once, get a basket of assets whose value (NAV) grows from yield, withdraw anytime.",
    navLabel: "NAV / token",
    reserveLabel: "Total reserve",
    supplyLabel: "Tokens outstanding",
    yourValueLabel: "Your value",
    oracleTitle: "Oracle Prices",
    oracleLive: "Reflector · live",
    oracleDesc:
      "Asset prices read on-chain from the Reflector oracle — the basis for valuing the multi-asset NAV basket.",
    actionTitle: "Deposit / Withdraw",
    connectPrompt: "Connect your wallet to start.",
    trustWarn:
      "Wallet hasn't activated USDC yet. Required once before depositing.",
    trustBtn: "Activate USDC",
    processing: "Processing…",
    amount: "Amount",
    depositBtn: "Deposit USDC",
    withdrawBtn: "Withdraw",
    balanceLine: (usdc, shares) =>
      `USDC balance: ${usdc} · Your basket tokens: ${shares}`,
    mintOk: (a) => `Deposited ${a} USDC. You received basket tokens.`,
    redeemOk: (a) => `Withdrew ${a} basket tokens.`,
    trustOk: "USDC activated. You can deposit now.",
    proofTitle: "Proof of Reserve",
    proofDesc:
      "Every basket token is backed by real USDC in the vault contract. Auditable by anyone, anytime — unlike a conventional mutual fund.",
    reserveOnchain: "On-chain reserve",
    viewContract: "View contract on Stellar Expert →",
    footer: "APAC Stellar Hackathon · DeFi Track · Testnet MVP",
  },
};

const EXPLORER = `https://stellar.expert/explorer/testnet/contract/${VAULT_ID}`;

export default function Home() {
  const { address, connect, connecting, error: walletError } = useWallet();
  const [lang, setLang] = useState<Lang>("id");
  const [stats, setStats] = useState<Stats | null>(null);
  const [amount, setAmount] = useState("100");
  const [busy, setBusy] = useState<null | string>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [trusted, setTrusted] = useState<boolean | null>(null);
  const [prices, setPrices] = useState<{ xlm: number | null; usdc: number | null } | null>(null);

  const t = STR[lang];

  const refresh = useCallback(async () => {
    // Trustline status first and on its own, so a balance/oracle hiccup can
    // never hide the "Aktifkan USDC" banner.
    if (address) {
      hasUsdcTrustline(address)
        .then(setTrusted)
        .catch(() => setTrusted(false));
    } else {
      setTrusted(null);
    }

    getOraclePrice("XLM")
      .then(async (xlm) => setPrices({ xlm, usdc: await getOraclePrice("USDC") }))
      .catch(() => setPrices(null));

    try {
      const [nav, supply, reserve] = await Promise.all([
        getNav(),
        getTotalSupply(),
        getTotalUnderlying(),
      ]);
      let shares = 0;
      let usdc = 0;
      if (address) {
        [shares, usdc] = await Promise.all([
          getShares(address),
          getUsdcBalance(address),
        ]);
      }
      setStats({ nav, supply, reserve, shares, usdc });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }, [address]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const doMint = async () => {
    if (!address) return;
    setBusy("mint");
    setMsg(null);
    setErr(null);
    try {
      await mint(address, Number(amount));
      setMsg(t.mintOk(amount));
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const doRedeem = async () => {
    if (!address) return;
    setBusy("redeem");
    setMsg(null);
    setErr(null);
    try {
      await redeem(address, Number(amount));
      setMsg(t.redeemOk(amount));
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const doTrust = async () => {
    if (!address) return;
    setBusy("trust");
    setMsg(null);
    setErr(null);
    try {
      await addUsdcTrustline(address);
      setMsg(t.trustOk);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const shareValue =
    stats && stats.nav ? (stats.shares * stats.nav).toFixed(4) : "0";

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 to-white text-slate-800">
      <div className="mx-auto max-w-3xl px-5 py-10">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-emerald-700">Rupia.fi</h1>
            <p className="text-sm text-slate-500">{t.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === "id" ? "en" : "id")}
              className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              aria-label="Toggle language"
            >
              {lang === "id" ? "EN" : "ID"}
            </button>
            {address ? (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-mono text-emerald-800">
                {address.slice(0, 4)}…{address.slice(-4)}
              </span>
            ) : (
              <button
                onClick={connect}
                disabled={connecting}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {connecting ? t.connecting : t.connect}
              </button>
            )}
          </div>
        </header>

        {walletError && (
          <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {walletError}
          </p>
        )}

        {/* Problem framing */}
        <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <p className="text-sm leading-relaxed text-slate-600">
            <strong className="text-slate-900">{t.problemBold}</strong>
            {t.problemRest}
          </p>
        </section>

        {/* Stats */}
        <section className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label={t.navLabel} value={stats ? stats.nav.toFixed(4) : "…"} />
          <Stat
            label={t.reserveLabel}
            value={stats ? `${stats.reserve.toFixed(2)}` : "…"}
            sub="USDC"
          />
          <Stat
            label={t.supplyLabel}
            value={stats ? stats.supply.toFixed(2) : "…"}
          />
          <Stat
            label={t.yourValueLabel}
            value={address ? shareValue : "—"}
            sub="USDC"
          />
        </section>

        {/* Oracle prices (Reflector, live testnet) */}
        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t.oracleTitle}</h2>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
              {t.oracleLive}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">{t.oracleDesc}</p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <Stat
              label="XLM / USD"
              value={prices ? (prices.xlm?.toFixed(4) ?? "—") : "…"}
              sub="USD"
            />
            <Stat
              label="USDC / USD"
              value={prices ? (prices.usdc?.toFixed(4) ?? "—") : "…"}
              sub="USD"
            />
          </div>
        </section>

        {/* Action panel */}
        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <h2 className="text-lg font-semibold">{t.actionTitle}</h2>
          {!address && (
            <p className="mt-2 text-sm text-slate-500">{t.connectPrompt}</p>
          )}
          {address && trusted === false && (
            <div className="mt-4 flex flex-col gap-2 rounded-lg bg-amber-50 p-4 ring-1 ring-amber-200 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-amber-800">{t.trustWarn}</p>
              <button
                onClick={doTrust}
                disabled={busy !== null}
                className="shrink-0 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {busy === "trust" ? t.processing : t.trustBtn}
              </button>
            </div>
          )}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1">
              <span className="text-xs text-slate-500">{t.amount}</span>
              <input
                type="number"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </label>
            <div className="flex gap-2">
              <button
                onClick={doMint}
                disabled={!address || trusted === false || busy !== null}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {busy === "mint" ? t.processing : t.depositBtn}
              </button>
              <button
                onClick={doRedeem}
                disabled={!address || busy !== null}
                className="rounded-lg border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
              >
                {busy === "redeem" ? t.processing : t.withdrawBtn}
              </button>
            </div>
          </div>
          {address && stats && (
            <p className="mt-3 text-xs text-slate-500">
              {t.balanceLine(stats.usdc.toFixed(2), stats.shares.toFixed(2))}
            </p>
          )}
          {msg && (
            <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
              {msg}
            </p>
          )}
          {err && (
            <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 break-words">
              {err}
            </p>
          )}
        </section>

        {/* Proof of reserve */}
        <section className="mt-6 rounded-2xl bg-slate-900 p-6 text-slate-100">
          <h2 className="text-lg font-semibold">{t.proofTitle}</h2>
          <p className="mt-2 text-sm text-slate-300">{t.proofDesc}</p>
          <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-800 px-4 py-3">
            <span className="text-sm text-slate-300">{t.reserveOnchain}</span>
            <span className="font-mono text-emerald-400">
              {stats ? stats.reserve.toFixed(4) : "…"} USDC
            </span>
          </div>
          <a
            href={EXPLORER}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-sm text-emerald-400 underline"
          >
            {t.viewContract}
          </a>
        </section>

        <footer className="mt-8 text-center text-xs text-slate-400">
          {t.footer}
        </footer>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">
        {value}
        {sub && (
          <span className="ml-1 text-xs font-normal text-slate-400">{sub}</span>
        )}
      </p>
    </div>
  );
}
