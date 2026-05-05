import { useCallback } from "react";
import { api } from "../api/client";
import { DeadLetterTable } from "../components/DeadLetterTable";
import { usePolling } from "../hooks/usePolling";

export default function DeadLetters() {
  const loader = useCallback(() => api.listDeadLetters(100), []);
  const { data, loading, error, refresh } = usePolling(loader, 5000);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Dead Letter Queue</h1>
      {loading && <p className="text-gray-400">Loading…</p>}
      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
      {data && <DeadLetterTable items={data} onReplayed={refresh} />}
    </div>
  );
}
