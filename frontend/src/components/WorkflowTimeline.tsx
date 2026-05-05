import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Clock, User } from "lucide-react";
import type { WorkflowTimelineEventOut } from "../types";
import { EventStatusBadge } from "./EventStatusBadge";

const fmtMs = (ms: number | null) => ms == null ? "–" : ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("en", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });

const dot: Record<string, string> = {
  succeeded:    "#10b981",
  failed:       "#ef4444",
  retrying:     "#f97316",
  dead_lettered:"#f43f5e",
  processing:   "#eab308",
  queued:       "#6366f1",
};

export function WorkflowTimeline({ events }: { events: WorkflowTimelineEventOut[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setExpanded(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className="space-y-0">
      {events.map((ev, idx) => {
        const isLast = idx === events.length - 1;
        const isOpen = expanded.has(ev.id);
        const color = dot[ev.status] ?? "#475569";
        const totalMs = ev.attempts.reduce((s, a) => s + (a.duration_ms ?? 0), 0);

        return (
          <motion.div
            key={ev.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05, duration: 0.3 }}
            className="flex gap-5"
          >
            {/* connector */}
            <div className="flex flex-col items-center w-6 shrink-0 pt-4">
              <motion.div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ background: color, boxShadow: `0 0 0 3px ${color}25` }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: idx * 0.05 + 0.15, type: "spring", stiffness: 300 }}
              />
              {!isLast && (
                <div className="flex-1 w-px mt-1 mb-0"
                  style={{ background: `linear-gradient(180deg, ${color}40 0%, #1a2640 100%)`, minHeight: 24 }} />
              )}
            </div>

            {/* card */}
            <div className="flex-1 mb-3 card overflow-hidden"
              style={isOpen ? { boxShadow: `0 0 0 1px ${color}25`, borderColor: `${color}25` } : {}}>

              {/* header */}
              <div
                className={`flex items-center gap-3 px-4 py-3 transition-colors ${ev.attempts.length ? "cursor-pointer hover:bg-white/[0.02]" : ""}`}
                onClick={() => ev.attempts.length && toggle(ev.id)}
              >
                <div className="flex-1 flex items-center gap-2.5 min-w-0">
                  <span className="text-[13px] font-semibold text-white mono truncate">{ev.event_type}</span>
                  <EventStatusBadge status={ev.status} />
                  <span className="text-[11px] text-slate-600 hidden sm:block">{ev.service_name}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {ev.attempt_count > 1 && (
                    <span className="text-[11px] text-orange-400 font-medium">×{ev.attempt_count}</span>
                  )}
                  {totalMs > 0 && (
                    <span className="text-[11px] text-slate-600 flex items-center gap-1 mono">
                      <Clock size={10} />{fmtMs(totalMs)}
                    </span>
                  )}
                  <span className="text-[11px] text-slate-700 mono">{fmtTime(ev.created_at)}</span>
                  {ev.attempts.length > 0 && (
                    <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown size={13} className="text-slate-600" />
                    </motion.span>
                  )}
                </div>
              </div>

              {/* last error */}
              {ev.last_error && (
                <div className="px-4 py-2" style={{ background: "rgba(244,63,94,0.05)", borderTop: "1px solid rgba(244,63,94,0.12)" }}>
                  <p className="text-[11px] text-rose-400 mono leading-relaxed truncate">{ev.last_error}</p>
                </div>
              )}

              {/* expanded attempts */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    style={{ overflow: "hidden", borderTop: "1px solid #1a2640" }}
                  >
                    <div className="px-4 py-2" style={{ background: "rgba(255,255,255,0.01)" }}>
                      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Attempt History</p>
                    </div>
                    <table className="w-full">
                      <thead>
                        <tr style={{ borderBottom: "1px solid #1a2640" }}>
                          {["#", "Status", "Duration", "Worker", "Time", "Error"].map(h => (
                            <th key={h} className="th py-2">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {ev.attempts.map((a, ai) => (
                          <motion.tr key={a.id}
                            className="tr-hover"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: ai * 0.04 }}
                          >
                            <td className="td pl-4 mono text-slate-600 text-[12px]">{a.attempt_number}</td>
                            <td className="td"><EventStatusBadge status={a.status} /></td>
                            <td className="td mono text-[12px]">{fmtMs(a.duration_ms)}</td>
                            <td className="td">
                              <span className="flex items-center gap-1 text-slate-500 text-[11px]">
                                <User size={9} />{a.worker_name ?? "–"}
                              </span>
                            </td>
                            <td className="td mono text-slate-600 text-[11px]">{fmtTime(a.started_at)}</td>
                            <td className="td pr-4 max-w-xs">
                              {a.error_message
                                ? <span className="text-rose-400 text-[11px] mono truncate block">{a.error_message}</span>
                                : <span className="text-slate-700 text-[11px]">—</span>
                              }
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
