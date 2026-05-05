import type { EventStatus } from "../types";

const palette: Record<string, string> = {
  received: "bg-gray-600 text-gray-100",
  queued: "bg-blue-700 text-blue-100",
  processing: "bg-yellow-600 text-yellow-100 animate-pulse",
  succeeded: "bg-green-700 text-green-100",
  failed: "bg-red-700 text-red-100",
  retrying: "bg-orange-600 text-orange-100",
  dead_lettered: "bg-red-900 text-red-200",
  replayed: "bg-purple-700 text-purple-100",
  cancelled: "bg-gray-700 text-gray-300",
};

export function EventStatusBadge({ status }: { status: EventStatus | string }) {
  const cls = palette[status] ?? "bg-gray-600 text-gray-100";
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${cls}`}>
      {status.replace("_", " ")}
    </span>
  );
}
