// Smoke test: confirm the vault client reads live testnet state.
// Run: node scripts/smoke-read.mjs
import {
  Contract,
  TransactionBuilder,
  rpc,
  scValToNative,
  BASE_FEE,
} from "@stellar/stellar-sdk";

const RPC = "https://soroban-testnet.stellar.org";
const PASS = "Test SDF Network ; September 2015";
const VAULT = "CDPIP5VKHN4S5X7OFWI7SKGSAJ5TYBRW367OEHUUQC37SAFZ2JNZROYY";
const SIM_SOURCE = "GA7JQT2CYLMFQA6TQUA3SQ3QFJX7CDV24CMPPMZXOIEPDZVYBPUATJKE";

const server = new rpc.Server(RPC, { allowHttp: true });

async function read(method) {
  const c = new Contract(VAULT);
  const src = await server.getAccount(SIM_SOURCE);
  const tx = new TransactionBuilder(src, {
    fee: BASE_FEE,
    networkPassphrase: PASS,
  })
    .addOperation(c.call(method))
    .setTimeout(30)
    .build();
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) throw new Error(sim.error);
  return scValToNative(sim.result.retval);
}

for (const m of ["nav", "total_supply", "total_underlying"]) {
  console.log(m, "=", (await read(m)).toString());
}
console.log("OK: client reads live testnet contract");
