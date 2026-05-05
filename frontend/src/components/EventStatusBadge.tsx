import type { EventStatus } from "../types";

const cfg: Record<string, { cls: string; dot: string; label: string; pulse?: boolean }> = {
  received:     { cls: "bg-slate-800/80 text-slate-400 border-slate-700/50",   dot: "bg-slate-500",   label: "received" },
  queued:       { cls: "bg-blue-950/60 text-blue-400 border-blue-800/30",      dot: "bg-blue-500",    label: "queued" },
  processing:   { cls: "bg-amber-950/60 text-amber-400 border-amber-800/30",   dot: "bg-amber-400",   label: "processing", pulse: true },
  succeeded:    { cls: "bg-emerald-950/60 text-emerald-400 border-emerald-800/30", dot: "bg-emerald-500", label: "succeeded" },
  failed:       { cls: "bg-red-950/60 text-red-400 border-red-800/30",         dot: "bg-red-500",     label: "failed" },
  retrying:     { cls: "bg-orange-950/60 text-orange-400 border-orange-800/30", dot: "bg-orange-500", label: "retrying", pulse: true },
  dead_lettered:{ cls: "bg-rose-950/60 text-rose-400 border-rose-800/30",      dot: "bg-rose-500",    label: "dead" },
  replayed:     { cls: "bg-purple-950/60 text-purple-400 border-purple-800/30",dot: "bg-purple-500",  label: "replayed" },
  cancelled:    { cls: "bg-slate-900 text-slate-600 border-slate-800",         dot: "bg-slate-700",   label: "cancelled" },
  pending:      { cls: "bg-blue-950/60 text-blue-400 border-blue-800/30",      dot: "bg-blue-400",    label: "pending" },
};

export function EventStatusBadge({ status }: { status: EventStatus | string }) {
  const c = cfg[status] ?? cfg.received;
  return (
    <span className={`badge border ${c.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot} ${c.pulse ? "animate-pulse" : ""}`} />
      {c.label}
    </span>
  );
}
