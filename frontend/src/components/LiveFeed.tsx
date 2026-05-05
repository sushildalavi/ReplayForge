import { useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api, type RecentEvent } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { EventStatusBadge } from "./EventStatusBadge";

function ago(iso: string | null) {
  if (!iso) return "";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

const SERVICE_ICON: Record<string, string> = {
  "checkout-service":    "🛒",
  "payment-service":     "💳",
  "inventory-service":   "📦",
  "notification-service":"✉️",
  "fulfillment-service": "🚚",
};

export function LiveFeed() {
  const loader = useCallback(() => api.recentEvents(30), []);
  const { data, loading } = usePolling(loader, 2500);
  const seen = useRef<Set<string>>(new Set());

  const items = data ?? [];

  return (
    <div className="card overflow-hidden h-full flex flex-col" style={{ maxHeight: 440 }}>
      {/* header */}
      <div className="px-4 py-3 flex items-center justify-between shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <p className="text-[12px] font-semibold text-white">Live Activity</p>
        </div>
        <span className="text-[11px]" style={{ color: "#334155" }}>{items.length} recent</span>
      </div>

      {/* feed */}
      <div className="overflow-y-auto flex-1 divide-y divide-white/[0.04]">
        {loading && !data ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="px-4 py-2.5 flex items-center gap-3">
              <div className="skeleton w-5 h-5 rounded" />
              <div className="flex-1 space-y-1.5">
                <div className="skeleton h-3 w-32" />
                <div className="skeleton h-2.5 w-48" />
              </div>
            </div>
          ))
        ) : (
          <AnimatePresence initial={false}>
            {items.map((ev, i) => {
              const isNew = !seen.current.has(ev.id);
              if (isNew) seen.current.add(ev.id);
              return (
                <motion.div
                  key={ev.id}
                  initial={isNew ? { opacity: 0, y: -8, backgroundColor: "rgba(99,102,241,0.06)" } : { opacity: 1 }}
                  animate={{ opacity: 1, y: 0, backgroundColor: "rgba(0,0,0,0)" }}
                  transition={{ duration: 0.3, delay: i === 0 && isNew ? 0 : 0 }}
                  className="px-4 py-2.5 flex items-center gap-3 hover:bg-white/[0.018] transition-colors cursor-default"
                >
                  <span className="text-base shrink-0 w-5 text-center">
                    {SERVICE_ICON[ev.service_name] ?? "⚡"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="mono text-[12px] font-medium text-white truncate">{ev.event_type}</span>
                      <EventStatusBadge status={ev.status} />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="mono text-[10px]" style={{ color: "#334155" }}>{ev.workflow_id.slice(-12)}</span>
                      {ev.attempt_count > 1 && (
                        <span className="text-[10px]" style={{ color: "#f97316" }}>×{ev.attempt_count}</span>
                      )}
                      {ev.last_error && (
                        <span className="text-[10px] truncate max-w-[120px]" style={{ color: "#f43f5e" }} title={ev.last_error}>
                          {ev.last_error.slice(0, 28)}…
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] shrink-0 mono" style={{ color: "#1e2d3d" }}>
                    {ago(ev.updated_at)}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
