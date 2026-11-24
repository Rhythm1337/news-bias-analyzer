"use client";

import { useEffect, useState } from "react";

export type BackendStatusState = "checking" | "ready" | "waking" | "down";

const PING_TIMEOUT_FAST_MS = 3_000;
const PING_TIMEOUT_LOCAL_MS = 8_000;
const WAKE_TIMEOUT_MS = 75_000;

async function pingOnce(
  apiUrl: string,
  timeoutMs: number,
  signal: AbortSignal,
): Promise<boolean> {
  const inner = new AbortController();
  const onAbort = () => inner.abort();
  signal.addEventListener("abort", onAbort);
  const timer = setTimeout(() => inner.abort(), timeoutMs);
  try {
    const res = await fetch(`${apiUrl}/ping`, {
      signal: inner.signal,
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", onAbort);
  }
}

export function useBackendStatus(apiUrl: string) {
  const [status, setStatus] = useState<BackendStatusState>("checking");
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    (async () => {
      setStatus("checking");
      const localApi = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(?:\/|$)/i.test(
        apiUrl,
      );
      const fast = await pingOnce(
        apiUrl,
        localApi ? PING_TIMEOUT_LOCAL_MS : PING_TIMEOUT_FAST_MS,
        controller.signal,
      );
      if (!active) return;

      if (fast) {
        setStatus("ready");
        return;
      }

      setStatus("waking");
      const woke = await pingOnce(apiUrl, WAKE_TIMEOUT_MS, controller.signal);
      if (!active) return;
      setStatus(woke ? "ready" : "down");
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [apiUrl, retryNonce]);

  return {
    status,
    retry: () => setRetryNonce((n) => n + 1),
  };
}
