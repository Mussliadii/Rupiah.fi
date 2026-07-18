"use client";

// Local-only simulation of the vault for demo mode: no Freighter, no network.
// State persists in localStorage; toggling demo mode on resets it so every
// demo run starts from the same clean slate.

const KEY = "rupia:demo-state";

// Only the head/tail render in the UI (GDEM…DEMO).
export const DEMO_ADDRESS =
  "GDEMOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADEMO";

export const DEMO_PRICES = { xlm: 0.3842, usdc: 1.0001 };

type DemoState = {
  trusted: boolean;
  usdc: number;
  shares: number;
  reserve: number;
  supply: number;
};

const INITIAL: DemoState = {
  trusted: false,
  usdc: 1000,
  shares: 0,
  reserve: 25_000,
  supply: 24_750, // NAV mulai ~1.0101 — kelihatan sudah ada yield berjalan
};

function load(): DemoState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as DemoState;
  } catch {}
  return { ...INITIAL };
}

function save(s: DemoState) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function demoReset() {
  save({ ...INITIAL });
}

// Small delay so buttons feel like they're doing real work on stage.
function wait(ms = 700) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function demoStats() {
  const s = load();
  return {
    nav: s.supply > 0 ? s.reserve / s.supply : 1,
    supply: s.supply,
    reserve: s.reserve,
    shares: s.shares,
    usdc: s.usdc,
    trusted: s.trusted,
  };
}

export async function demoConnect(): Promise<string> {
  await wait(400);
  return DEMO_ADDRESS;
}

export async function demoTrust() {
  await wait();
  const s = load();
  s.trusted = true;
  save(s);
}

export async function demoUntrust() {
  await wait();
  const s = load();
  s.trusted = false;
  save(s);
}

export async function demoMint(amount: number) {
  await wait(900);
  const s = load();
  if (!(amount > 0)) throw new Error("Jumlah tidak valid / invalid amount");
  if (amount > s.usdc)
    throw new Error("Saldo USDC demo tidak cukup / insufficient demo balance");
  const shares = s.supply > 0 ? (amount * s.supply) / s.reserve : amount;
  s.usdc -= amount;
  s.reserve += amount;
  s.supply += shares;
  s.shares += shares;
  save(s);
}

export async function demoRedeem(shares: number) {
  await wait(900);
  const s = load();
  if (!(shares > 0)) throw new Error("Jumlah tidak valid / invalid amount");
  if (shares > s.shares)
    throw new Error("Token basket tidak cukup / insufficient basket tokens");
  const out = (shares * s.reserve) / s.supply;
  s.shares -= shares;
  s.supply -= shares;
  s.reserve -= out;
  s.usdc += out;
  save(s);
}

/** +1% reserve — NAV naik untuk semua holder, seperti yield Blend masuk. */
export async function demoYield() {
  await wait(500);
  const s = load();
  s.reserve *= 1.01;
  save(s);
}
