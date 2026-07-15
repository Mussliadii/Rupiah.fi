"use client";

import { useCallback, useEffect, useState } from "react";
import freighter from "@stellar/freighter-api";

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
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
      setAddress(access.address);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setConnecting(false);
    }
  }, []);

  return { address, connect, connecting, error };
}
