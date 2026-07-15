#!/usr/bin/env bash
# Deploy the Rupia.fi vault to Stellar testnet.
# Prereq: stellar-cli installed, `stellar keys generate deployer --network testnet --fund` run once.
set -euo pipefail

NETWORK="${NETWORK:-testnet}"
SOURCE="${SOURCE:-deployer}"

cd "$(dirname "$0")/.."

echo "==> Building vault wasm (release)"
stellar contract build

WASM="target/wasm32v1-none/release/vault.wasm"
# older toolchains emit under wasm32-unknown-unknown
[ -f "$WASM" ] || WASM="target/wasm32-unknown-unknown/release/vault.wasm"

echo "==> Optimizing"
stellar contract optimize --wasm "$WASM" || true

echo "==> Deploying to $NETWORK as $SOURCE"
VAULT_ID=$(stellar contract deploy \
  --wasm "$WASM" \
  --source "$SOURCE" \
  --network "$NETWORK")

echo "VAULT_CONTRACT_ID=$VAULT_ID"
echo "$VAULT_ID" > .stellar-vault-id.txt
echo "==> Saved to contracts/.stellar-vault-id.txt"
echo "Next: initialize with USDC testnet SAC + fee bps. See README."
