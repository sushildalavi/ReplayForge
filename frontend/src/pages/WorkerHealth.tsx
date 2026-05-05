import { useCallback } from "react";
import { api } from "../api/client";
import { WorkerHealthTable } from "../components/WorkerHealthTable";
import { usePolling } from "../hooks/usePolling";

export default function WorkerHealth() {
  const loader = useCallback(() => api.listWorkers(), []);
  const { data, loading, error } = usePolling(loader, 5000);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Worker Health</h1>
      {loading && <p className="text-gray-400">Loading…</p>}
      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
      {data && <WorkerHealthTable workers={data} />}
    </div>
  );
}
