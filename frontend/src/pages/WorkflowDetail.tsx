import { useCallback, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client";
import { WorkflowTimeline } from "../components/WorkflowTimeline";
import { usePolling } from "../hooks/usePolling";
import type { IncidentSummaryOut } from "../types";

export default function WorkflowDetail() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const loader = useCallback(
    () => api.getWorkflowTimeline(workflowId!),
    [workflowId]
  );
  const { data, loading, error } = usePolling(loader, 8000);

  const [summary, setSummary] = useState<IncidentSummaryOut | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [sumErr, setSumErr] = useState<string | null>(null);

  const handleSummarize = async () => {
    setSummarizing(true);
    setSumErr(null);
    try {
      const s = await api.summarizeIncident(workflowId!);
      setSummary(s);
    } catch {
      setSumErr("summarization failed");
    } finally {
      setSummarizing(false);
    }
  };

  if (loading) return <p className="text-gray-400">Loading…</p>;
  if (error) return <p className="text-red-400">{error}</p>;
  if (!data) return null;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="text-gray-500 hover:text-gray-300 text-sm">
          ← Dashboard
        </Link>
        <h1 className="text-xl font-bold text-white font-mono">{data.workflow_id}</h1>
      </div>

      <div className="flex gap-3 mb-6">
        <button
          onClick={handleSummarize}
          disabled={summarizing}
          className="px-4 py-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-sm rounded"
        >
          {summarizing ? "Summarizing…" : "AI Incident Summary"}
        </button>
      </div>

      {sumErr && <p className="text-red-400 text-sm mb-4">{sumErr}</p>}

      {summary && (
        <div className="bg-gray-800 border border-purple-700 rounded-lg p-4 mb-6">
          <p className="text-xs text-purple-400 mb-1 uppercase tracking-wide">
            Incident Summary {summary.model_name ? `— ${summary.model_name}` : "(template)"}
          </p>
          <p className="text-gray-200 text-sm">{summary.summary_text}</p>
        </div>
      )}

      <h2 className="text-lg font-semibold mb-4 text-white">Event Timeline</h2>
      <WorkflowTimeline events={data.events} />
    </div>
  );
}
