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

const EXPLORER = `https://stellar.expert/explorer/testnet/contract/${VAULT_ID}`;

export default function Home() {
  const { address, connect, connecting, error: walletError } = useWallet();
  const [stats, setStats] = useState<Stats | null>(null);
  const [amount, setAmount] = useState("100");
  const [busy, setBusy] = useState<null | string>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [trusted, setTrusted] = useState<boolean | null>(null);
  const [prices, setPrices] = useState<{ xlm: number | null; usdc: number | null } | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [nav, supply, reserve] = await Promise.all([
        getNav(),
        getTotalSupply(),
        getTotalUnderlying(),
      ]);
      getOraclePrice("XLM")
        .then(async (xlm) => setPrices({ xlm, usdc: await getOraclePrice("USDC") }))
        .catch(() => setPrices(null));
      let shares = 0;
      let usdc = 0;
      if (address) {
        [shares, usdc] = await Promise.all([
          getShares(address),
          getUsdcBalance(address),
        ]);
        setTrusted(await hasUsdcTrustline(address));
      } else {
        setTrusted(null);
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
      setMsg(`Berhasil setor ${amount} USDC. Kamu terima token basket.`);
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
      setMsg(`Berhasil tarik ${amount} token basket.`);
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
      setMsg("USDC aktif. Sekarang bisa setor.");
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
            <p className="text-sm text-slate-500">
              Tabungan terdiversifikasi on-chain di Stellar
            </p>
          </div>
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
              {connecting ? "Menghubungkan…" : "Hubungkan Freighter"}
            </button>
          )}
        </header>

        {walletError && (
          <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {walletError}
          </p>
        )}

        {/* Problem framing */}
        <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <p className="text-sm leading-relaxed text-slate-600">
            <strong className="text-slate-900">
              22,4 juta orang Indonesia
            </strong>{" "}
            sudah pegang kripto — hampir 3× investor saham. Tapi hampir semua
            hanya spekulasi satu token. Rupia.fi ubah itu jadi tabungan
            terdiversifikasi berbunga: setor sekali, dapat basket aset yang
            nilainya (NAV) tumbuh dari yield, tarik kapan saja.
          </p>
        </section>

        {/* Stats */}
        <section className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat
            label="NAV / token"
            value={stats ? stats.nav.toFixed(4) : "…"}
          />
          <Stat
            label="Total cadangan"
            value={stats ? `${stats.reserve.toFixed(2)}` : "…"}
            sub="USDC"
          />
          <Stat
            label="Token beredar"
            value={stats ? stats.supply.toFixed(2) : "…"}
          />
          <Stat
            label="Nilai kamu"
            value={address ? shareValue : "—"}
            sub="USDC"
          />
        </section>

        {/* Oracle prices (Reflector, live testnet) */}
        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Harga Oracle</h2>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
              Reflector · live
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Harga aset dibaca on-chain dari oracle Reflector — dasar valuasi NAV
            basket multi-aset.
          </p>
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
          <h2 className="text-lg font-semibold">Setor / Tarik</h2>
          {!address && (
            <p className="mt-2 text-sm text-slate-500">
              Hubungkan wallet untuk mulai.
            </p>
          )}
          {address && trusted === false && (
            <div className="mt-4 flex flex-col gap-2 rounded-lg bg-amber-50 p-4 ring-1 ring-amber-200 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-amber-800">
                Wallet belum aktifkan USDC. Wajib sekali sebelum setor.
              </p>
              <button
                onClick={doTrust}
                disabled={busy !== null}
                className="shrink-0 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {busy === "trust" ? "Memproses…" : "Aktifkan USDC"}
              </button>
            </div>
          )}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1">
              <span className="text-xs text-slate-500">Jumlah</span>
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
                {busy === "mint" ? "Memproses…" : "Setor USDC"}
              </button>
              <button
                onClick={doRedeem}
                disabled={!address || busy !== null}
                className="rounded-lg border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
              >
                {busy === "redeem" ? "Memproses…" : "Tarik"}
              </button>
            </div>
          </div>
          {address && stats && (
            <p className="mt-3 text-xs text-slate-500">
              Saldo USDC: {stats.usdc.toFixed(2)} · Token basket kamu:{" "}
              {stats.shares.toFixed(2)}
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
          <h2 className="text-lg font-semibold">Bukti Cadangan</h2>
          <p className="mt-2 text-sm text-slate-300">
            Setiap token basket di-back oleh USDC nyata di kontrak vault. Bisa
            diaudit siapa pun, kapan pun — tidak seperti reksa dana
            konvensional.
          </p>
          <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-800 px-4 py-3">
            <span className="text-sm text-slate-300">Cadangan on-chain</span>
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
            Lihat kontrak di Stellar Expert →
          </a>
        </section>

        <footer className="mt-8 text-center text-xs text-slate-400">
          APAC Stellar Hackathon · Track DeFi · Testnet MVP
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
