import type { EventStatus } from "../types";

const STATUS: Record<string, { bg: string; text: string; border: string; dot: string; pulse?: true }> = {
  received:     { bg:"rgba(30,45,61,0.8)",   text:"#64748b", border:"rgba(100,116,139,0.2)", dot:"#475569" },
  queued:       { bg:"rgba(30,58,138,0.25)",  text:"#93c5fd", border:"rgba(59,130,246,0.2)", dot:"#60a5fa" },
  processing:   { bg:"rgba(120,53,15,0.3)",   text:"#fbbf24", border:"rgba(245,158,11,0.25)", dot:"#f59e0b", pulse:true },
  succeeded:    { bg:"rgba(6,78,59,0.25)",    text:"#34d399", border:"rgba(16,185,129,0.2)", dot:"#10b981" },
  failed:       { bg:"rgba(127,29,29,0.25)",  text:"#f87171", border:"rgba(239,68,68,0.2)",  dot:"#ef4444" },
  retrying:     { bg:"rgba(124,45,18,0.3)",   text:"#fb923c", border:"rgba(249,115,22,0.25)",dot:"#f97316", pulse:true },
  dead_lettered:{ bg:"rgba(136,19,55,0.3)",   text:"#fb7185", border:"rgba(244,63,94,0.25)", dot:"#f43f5e" },
  replayed:     { bg:"rgba(88,28,135,0.25)",  text:"#c084fc", border:"rgba(168,85,247,0.2)", dot:"#a855f7" },
  cancelled:    { bg:"rgba(15,23,42,0.5)",    text:"#475569", border:"rgba(71,85,105,0.2)",  dot:"#334155" },
  pending:      { bg:"rgba(30,58,138,0.2)",   text:"#93c5fd", border:"rgba(59,130,246,0.15)",dot:"#60a5fa" },
};

export function EventStatusBadge({ status }: { status: EventStatus | string }) {
  const s = STATUS[status] ?? STATUS.received;
  return (
    <span className="badge" style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>
      <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${s.pulse ? "animate-pulse" : ""}`} style={{ background: s.dot }} />
      {status.replace("_", " ")}
    </span>
  );
}
