import { useState } from "react";
import type { WorkflowTimelineEventOut } from "../types";
import { EventStatusBadge } from "./EventStatusBadge";

function fmtMs(ms: number | null): string {
  if (ms == null) return "–";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString();
}

export function WorkflowTimeline({ events }: { events: WorkflowTimelineEventOut[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <ol className="relative border-l border-gray-700 space-y-6 ml-4">
      {events.map((ev) => {
        const totalMs = ev.attempts.reduce((s, a) => s + (a.duration_ms ?? 0), 0);
        const isExpanded = expanded.has(ev.id);
        return (
          <li key={ev.id} className="ml-6">
            <span className="absolute -left-2.5 mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-700 ring-2 ring-gray-900">
              <span className="text-xs">
                {ev.status === "succeeded" ? "✓" : ev.status === "dead_lettered" ? "✗" : "…"}
              </span>
            </span>

            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono font-semibold text-white">{ev.event_type}</span>
                <EventStatusBadge status={ev.status} />
                <span className="text-xs text-gray-500">{ev.service_name}</span>
                {ev.attempt_count > 1 && (
                  <span className="text-xs text-orange-400">{ev.attempt_count} attempts</span>
                )}
                <span className="text-xs text-gray-600 ml-auto">{fmtMs(totalMs || null)}</span>
              </div>

              {ev.last_error && (
                <p className="mt-2 text-xs text-red-400 font-mono truncate">{ev.last_error}</p>
              )}

              {ev.attempts.length > 0 && (
                <button
                  onClick={() => toggle(ev.id)}
                  className="mt-2 text-xs text-indigo-400 hover:underline"
                >
                  {isExpanded ? "▲ hide" : `▼ ${ev.attempts.length} attempt(s)`}
                </button>
              )}

              {isExpanded && (
                <table className="mt-2 w-full text-xs text-gray-400">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-1">#</th>
                      <th className="text-left py-1">status</th>
                      <th className="text-left py-1">duration</th>
                      <th className="text-left py-1">worker</th>
                      <th className="text-left py-1">error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ev.attempts.map((a) => (
                      <tr key={a.id} className="border-b border-gray-700/50">
                        <td className="py-1">{a.attempt_number}</td>
                        <td className="py-1">
                          <EventStatusBadge status={a.status} />
                        </td>
                        <td className="py-1">{fmtMs(a.duration_ms)}</td>
                        <td className="py-1">{a.worker_name ?? "–"}</td>
                        <td className="py-1 text-red-400 truncate max-w-xs">{a.error_message ?? "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
