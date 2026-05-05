import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { DeadLetterOut } from "../types";

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString();
}

interface Props {
  items: DeadLetterOut[];
  onReplayed: () => void;
}

export function DeadLetterTable({ items, onReplayed }: Props) {
  const [replaying, setReplaying] = useState<Set<string>>(new Set());
  const [replayed, setReplayed] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const handleReplay = async (id: string) => {
    if (replaying.has(id) || replayed.has(id)) return;
    setReplaying((p) => new Set(p).add(id));
    setError(null);
    try {
      await api.replayDeadLetter(id);
      setReplayed((p) => new Set(p).add(id));
      onReplayed();
    } catch (e) {
      setError(`replay failed: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally {
      setReplaying((p) => {
        const n = new Set(p);
        n.delete(id);
        return n;
      });
    }
  };

  if (items.length === 0) {
    return <p className="text-gray-500 py-8 text-center">No dead letters yet.</p>;
  }

  return (
    <>
      {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
              <th className="text-left py-2 pr-4">Event Type</th>
              <th className="text-left py-2 pr-4">Workflow</th>
              <th className="text-left py-2 pr-4">Service</th>
              <th className="text-left py-2 pr-4">Last Error</th>
              <th className="text-left py-2 pr-4">Created</th>
              <th className="text-left py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((dl) => (
              <tr key={dl.id} className="border-b border-gray-800 hover:bg-gray-800/40">
                <td className="py-2 pr-4 font-mono text-xs text-white">{dl.event_type}</td>
                <td className="py-2 pr-4">
                  <Link
                    to={`/workflows/${dl.workflow_id}`}
                    className="text-indigo-400 hover:underline text-xs font-mono"
                  >
                    {dl.workflow_id}
                  </Link>
                </td>
                <td className="py-2 pr-4 text-gray-400 text-xs">{dl.service_name}</td>
                <td className="py-2 pr-4 text-red-400 text-xs max-w-xs truncate">
                  {dl.last_error ?? "–"}
                </td>
                <td className="py-2 pr-4 text-gray-500 text-xs">{fmtTime(dl.created_at)}</td>
                <td className="py-2">
                  {dl.replayed_at || replayed.has(dl.id) ? (
                    <span className="text-xs text-purple-400">replayed</span>
                  ) : (
                    <button
                      onClick={() => handleReplay(dl.id)}
                      disabled={replaying.has(dl.id)}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs rounded"
                    >
                      {replaying.has(dl.id) ? "…" : "Replay"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
