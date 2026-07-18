"use client";

import { useCallback, useEffect, useState } from "react";
import freighter from "@stellar/freighter-api";

// Freighter has no dapp-side revoke; "disconnect" means clearing our state and
// remembering the choice so we don't silently re-adopt the address on reload.
const DISCONNECT_FLAG = "rupia:wallet-disconnected";

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISCONNECT_FLAG)) return;
    freighter
      .getAddress()
      .then((r) => {
        if (r.address) setAddress(r.address);
      })
      .catch(() => {});
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const conn = await freighter.isConnected();
      if (!conn.isConnected) {
        throw new Error("Freighter tidak terpasang. Install dari freighter.app");
      }
      const access = await freighter.requestAccess();
      if (access.error) throw new Error(access.error);
      localStorage.removeItem(DISCONNECT_FLAG);
      setAddress(access.address);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    localStorage.setItem(DISCONNECT_FLAG, "1");
    setAddress(null);
    setError(null);
  }, []);

  return { address, connect, disconnect, connecting, error };
}
