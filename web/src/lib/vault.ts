import {
  Contract,
  TransactionBuilder,
  rpc,
  scValToNative,
  nativeToScVal,
  Address,
  Asset,
  Horizon,
  Networks,
  Operation,
  BASE_FEE,
  xdr,
} from "@stellar/stellar-sdk";
import freighter from "@stellar/freighter-api";

export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? "https://soroban-testnet.stellar.org";
export const HORIZON_URL =
  process.env.NEXT_PUBLIC_HORIZON_URL ?? "https://horizon-testnet.stellar.org";
export const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ?? Networks.TESTNET;
export const VAULT_ID = process.env.NEXT_PUBLIC_VAULT_ID!;
export const USDC_ID = process.env.NEXT_PUBLIC_USDC_ID!;
export const USDC_CODE = process.env.NEXT_PUBLIC_USDC_CODE ?? "USDC";
export const USDC_ISSUER =
  process.env.NEXT_PUBLIC_USDC_ISSUER ??
  "GA7JQT2CYLMFQA6TQUA3SQ3QFJX7CDV24CMPPMZXOIEPDZVYBPUATJKE";
// Reflector external CEX/DEX oracle (SEP-40), testnet.
export const REFLECTOR_ID =
  process.env.NEXT_PUBLIC_REFLECTOR_ID ??
  "CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63";
const REFLECTOR_DECIMALS = 14;

export const SCALE = 10_000_000; // 7 decimals

export const server = new rpc.Server(RPC_URL, { allowHttp: true });
export const horizon = new Horizon.Server(HORIZON_URL, { allowHttp: true });

/** Convert a 7-decimal on-chain integer to a human number. */
export function fromUnits(v: bigint | number | string): number {
  return Number(BigInt(v)) / SCALE;
}
/** Convert a human number to a 7-decimal i128 ScVal. */
export function toI128(human: number): xdr.ScVal {
  const units = BigInt(Math.round(human * SCALE));
  return nativeToScVal(units, { type: "i128" });
}

function addrScVal(addr: string): xdr.ScVal {
  return new Address(addr).toScVal();
}

/** Read-only contract call via simulation. Returns the native-decoded result. */
async function simRead(
  contractId: string,
  method: string,
  args: xdr.ScVal[] = [],
): Promise<unknown> {
  const contract = new Contract(contractId);
  // Any funded account works as the sim source; use the contract's own address
  // is not valid, so use a throwaway well-known account — the vault deployer.
  const source = await server.getAccount(SIM_SOURCE);
  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`sim ${method} failed: ${sim.error}`);
  }
  const retval = sim.result?.retval;
  return retval ? scValToNative(retval) : null;
}

// A funded testnet account used only as simulation source for reads.
const SIM_SOURCE =
  process.env.NEXT_PUBLIC_USDC_ISSUER ??
  "GA7JQT2CYLMFQA6TQUA3SQ3QFJX7CDV24CMPPMZXOIEPDZVYBPUATJKE";

export async function getNav(): Promise<number> {
  const v = await simRead(VAULT_ID, "nav");
  return fromUnits(v as bigint);
}

export async function getTotalUnderlying(): Promise<number> {
  const v = await simRead(VAULT_ID, "total_underlying");
  return fromUnits(v as bigint);
}

export async function getTotalSupply(): Promise<number> {
  const v = await simRead(VAULT_ID, "total_supply");
  return fromUnits(v as bigint);
}

export async function getShares(user: string): Promise<number> {
  const v = await simRead(VAULT_ID, "balance", [addrScVal(user)]);
  return fromUnits(v as bigint);
}

export async function getUsdcBalance(user: string): Promise<number> {
  // No trustline => SAC `balance` traps with Error(Contract, #13). That just
  // means the account holds 0 USDC, so treat any read failure as a 0 balance
  // rather than letting it break the dashboard.
  try {
    const v = await simRead(USDC_ID, "balance", [addrScVal(user)]);
    return fromUnits(v as bigint);
  } catch {
    return 0;
  }
}

/** Reflector oracle: latest price of a symbol (e.g. "XLM") in USD. Null if stale/absent. */
export async function getOraclePrice(symbol: string): Promise<number | null> {
  const asset = xdr.ScVal.scvVec([
    xdr.ScVal.scvSymbol("Other"),
    xdr.ScVal.scvSymbol(symbol),
  ]);
  const v = (await simRead(REFLECTOR_ID, "lastprice", [asset])) as
    | { price: bigint; timestamp: bigint }
    | null;
  if (!v?.price) return null;
  return Number(v.price) / 10 ** REFLECTOR_DECIMALS;
}

/** Build, sign (Freighter), submit, and poll a state-changing vault call. */
async function invokeSigned(
  method: string,
  args: xdr.ScVal[],
): Promise<void> {
  const { address } = await freighter.getAddress();
  if (!address) throw new Error("Wallet not connected");

  const contract = new Contract(VAULT_ID);
  const source = await server.getAccount(address);
  const built = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(60)
    .build();

  const prepared = await server.prepareTransaction(built);
  const signed = await freighter.signTransaction(prepared.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
    address,
  });

  const txFromXdr = TransactionBuilder.fromXDR(
    signed.signedTxXdr,
    NETWORK_PASSPHRASE,
  );
  const sent = await server.sendTransaction(txFromXdr);
  if (sent.status === "ERROR") {
    throw new Error(`submit failed: ${JSON.stringify(sent.errorResult)}`);
  }

  // Poll until the transaction lands.
  let get = await server.getTransaction(sent.hash);
  const started = Date.now();
  while (get.status === "NOT_FOUND") {
    if (Date.now() - started > 30_000) throw new Error("tx timeout");
    await new Promise((r) => setTimeout(r, 1500));
    get = await server.getTransaction(sent.hash);
  }
  if (get.status !== "SUCCESS") {
    throw new Error(`tx ${method} failed: ${get.status}`);
  }
}

/** True if the classic account already trusts the USDC asset. */
export async function hasUsdcTrustline(user: string): Promise<boolean> {
  try {
    const acct = await horizon.loadAccount(user);
    return acct.balances.some(
      (b) =>
        "asset_code" in b &&
        b.asset_code === USDC_CODE &&
        b.asset_issuer === USDC_ISSUER,
    );
  } catch {
    // Unfunded account has no trustlines.
    return false;
  }
}

async function changeUsdcTrust(user: string, limit?: string): Promise<void> {
  const source = await horizon.loadAccount(user);
  const built = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.changeTrust({ asset: new Asset(USDC_CODE, USDC_ISSUER), limit }),
    )
    .setTimeout(60)
    .build();

  const signed = await freighter.signTransaction(built.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
    address: user,
  });
  const tx = TransactionBuilder.fromXDR(signed.signedTxXdr, NETWORK_PASSPHRASE);
  await horizon.submitTransaction(tx);
}

/** Build+sign (Freighter) a classic change_trust op to activate USDC. */
export async function addUsdcTrustline(user: string): Promise<void> {
  await changeUsdcTrust(user);
}

/** Demo helper: drop the USDC trustline (limit 0) so the "Aktifkan USDC" flow
 * can be re-demoed. Fails on-chain unless the USDC balance is exactly 0. */
export async function removeUsdcTrustline(user: string): Promise<void> {
  await changeUsdcTrust(user, "0");
}

export async function mint(user: string, human: number): Promise<void> {
  await invokeSigned("mint", [addrScVal(user), toI128(human)]);
}

export async function redeem(user: string, humanShares: number): Promise<void> {
  await invokeSigned("redeem", [addrScVal(user), toI128(humanShares)]);
}
