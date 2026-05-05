import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { MetricCard } from "../components/MetricCard";
import { EventStatusBadge } from "../components/EventStatusBadge";
import { usePolling } from "../hooks/usePolling";

function fmtMs(ms: number | null): string {
  if (ms == null) return "–";
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
}

function fmtPct(n: number): string {
  return `${(n * 100).toFixed(0)}%`;
}

export default function Dashboard() {
  const metricsLoader = useCallback(() => api.getMetrics(), []);
  const workflowsLoader = useCallback(() => api.listWorkflows(20), []);

  const { data: metrics, error: mErr } = usePolling(metricsLoader, 5000);
  const { data: workflows, error: wErr, refresh: refreshWf } = usePolling(workflowsLoader, 5000);

  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenResult(null);
    try {
      const r = await api.generateWorkload(30);
      setGenResult(`sent ${r.events_sent} events across ${r.workflows} workflows`);
      refreshWf();
    } catch {
      setGenResult("failed to generate workload");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <div className="flex items-center gap-3">
          {genResult && <span className="text-xs text-gray-400">{genResult}</span>}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded font-medium"
          >
            {generating ? "Generating…" : "Generate Workload"}
          </button>
        </div>
      </div>

      {mErr && <p className="text-red-400 text-sm mb-4">{mErr}</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricCard title="Total Events" value={metrics?.total_events ?? "–"} color="blue" />
        <MetricCard title="Succeeded" value={metrics?.succeeded ?? "–"} color="green" />
        <MetricCard title="Dead-lettered" value={metrics?.dead_lettered ?? "–"} color="red" />
        <MetricCard title="Retrying" value={metrics?.retrying ?? "–"} color="yellow" />
        <MetricCard title="Active Workers" value={metrics?.active_workers ?? "–"} />
        <MetricCard
          title="Replay Success"
          value={metrics != null ? fmtPct(metrics.replay_success_rate) : "–"}
        />
        <MetricCard
          title="p50 Latency"
          value={fmtMs(metrics?.p50_attempt_duration_ms ?? null)}
          sub="attempt duration"
        />
        <MetricCard
          title="p95 Latency"
          value={fmtMs(metrics?.p95_attempt_duration_ms ?? null)}
          sub="attempt duration"
        />
      </div>

      <h2 className="text-lg font-semibold mb-3 text-white">Recent Workflows</h2>
      {wErr && <p className="text-red-400 text-sm mb-2">{wErr}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
              <th className="text-left py-2 pr-4">Workflow ID</th>
              <th className="text-left py-2 pr-4">Events</th>
              <th className="text-left py-2 pr-4">Succeeded</th>
              <th className="text-left py-2 pr-4">DLQ</th>
              <th className="text-left py-2 pr-4">In Flight</th>
              <th className="text-left py-2">Updated</th>
            </tr>
          </thead>
          <tbody>
            {(workflows ?? []).map((wf) => (
              <tr key={wf.workflow_id} className="border-b border-gray-800 hover:bg-gray-800/40">
                <td className="py-2 pr-4">
                  <Link
                    to={`/workflows/${wf.workflow_id}`}
                    className="text-indigo-400 hover:underline font-mono text-xs"
                  >
                    {wf.workflow_id}
                  </Link>
                </td>
                <td className="py-2 pr-4 text-gray-300">{wf.total_events}</td>
                <td className="py-2 pr-4 text-green-400">{wf.succeeded}</td>
                <td className="py-2 pr-4">
                  {wf.dead_lettered > 0 ? (
                    <span className="text-red-400">{wf.dead_lettered}</span>
                  ) : (
                    <span className="text-gray-600">0</span>
                  )}
                </td>
                <td className="py-2 pr-4 text-yellow-400">{wf.in_flight}</td>
                <td className="py-2 text-gray-500 text-xs">
                  {wf.last_updated_at ? new Date(wf.last_updated_at).toLocaleTimeString() : "–"}
                </td>
              </tr>
            ))}
            {(workflows?.length ?? 0) === 0 && !wErr && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500">
                  No workflows yet. Click "Generate Workload" to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
