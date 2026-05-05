import { useCallback, useEffect, useRef, useState } from "react";

export function usePolling<T>(
  fn: () => Promise<T>,
  intervalMs = 5000
): { data: T | null; loading: boolean; error: string | null; refresh: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const backoff = useRef(intervalMs);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = useCallback(async () => {
    try {
      const result = await fn();
      setData(result);
      setError(null);
      backoff.current = intervalMs;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "request failed";
      setError(msg);
      backoff.current = Math.min(backoff.current * 1.5, 30_000);
    } finally {
      setLoading(false);
    }
  }, [fn, intervalMs]);

  useEffect(() => {
    let mounted = true;

    const tick = async () => {
      if (!mounted) return;
      await run();
      if (mounted) timer.current = setTimeout(tick, backoff.current);
    };

    tick();
    return () => {
      mounted = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [run]);

  return { data, loading, error, refresh: run };
}
