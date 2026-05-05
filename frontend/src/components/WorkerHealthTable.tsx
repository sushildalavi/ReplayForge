import type { WorkerOut } from "../types";

function ago(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

const statusColor: Record<string, string> = {
  active: "text-green-400",
  busy: "text-yellow-400",
  stale: "text-orange-400",
  stopped: "text-gray-500",
  crashed: "text-red-400",
};

export function WorkerHealthTable({ workers }: { workers: WorkerOut[] }) {
  if (workers.length === 0) {
    return <p className="text-gray-500 py-8 text-center">No workers registered.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
            <th className="text-left py-2 pr-4">Worker</th>
            <th className="text-left py-2 pr-4">Status</th>
            <th className="text-left py-2 pr-4">Last Heartbeat</th>
            <th className="text-left py-2">Current Event</th>
          </tr>
        </thead>
        <tbody>
          {workers.map((w) => (
            <tr key={w.id} className="border-b border-gray-800 hover:bg-gray-800/40">
              <td className="py-2 pr-4 font-mono text-white text-xs">{w.worker_name}</td>
              <td className="py-2 pr-4">
                <span className={`font-semibold text-xs ${statusColor[w.status] ?? "text-gray-400"}`}>
                  {w.is_stale ? "stale" : w.status}
                </span>
              </td>
              <td className="py-2 pr-4 text-gray-400 text-xs">{ago(w.last_heartbeat_at)}</td>
              <td className="py-2 text-gray-500 text-xs font-mono">
                {w.current_event_id ? w.current_event_id.slice(0, 8) + "…" : "–"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
