// Probe Reflector testnet oracle: read XLM/USD lastprice + decimals.
// Run: node scripts/reflector-probe.mjs
import {
  Contract,
  TransactionBuilder,
  rpc,
  scValToNative,
  BASE_FEE,
  xdr,
} from "@stellar/stellar-sdk";

const RPC = "https://soroban-testnet.stellar.org";
const PASS = "Test SDF Network ; September 2015";
// Reflector external CEX/DEX feed (XLM/USD, BTC, ETH)
const ORACLE = "CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63";
const SIM_SOURCE = "GA7JQT2CYLMFQA6TQUA3SQ3QFJX7CDV24CMPPMZXOIEPDZVYBPUATJKE";

const server = new rpc.Server(RPC, { allowHttp: true });

// Asset::Other(Symbol) enum variant as ScVal
function otherAsset(sym) {
  return xdr.ScVal.scvVec([
    xdr.ScVal.scvSymbol("Other"),
    xdr.ScVal.scvSymbol(sym),
  ]);
}

async function call(method, args = []) {
  const c = new Contract(ORACLE);
  const src = await server.getAccount(SIM_SOURCE);
  const tx = new TransactionBuilder(src, { fee: BASE_FEE, networkPassphrase: PASS })
    .addOperation(c.call(method, ...args))
    .setTimeout(30)
    .build();
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) throw new Error(`${method}: ${sim.error}`);
  return sim.result?.retval ? scValToNative(sim.result.retval) : null;
}

const decimals = await call("decimals");
console.log("decimals =", decimals);
for (const sym of ["XLM", "USDC", "BTC"]) {
  try {
    const p = await call("lastprice", [otherAsset(sym)]);
    console.log(sym, "=", JSON.stringify(p, (_k, v) => (typeof v === "bigint" ? v.toString() : v)));
  } catch (e) {
    console.log(sym, "ERR", e.message);
  }
}
