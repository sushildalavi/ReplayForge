import { useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { EventStatusBadge } from "./EventStatusBadge";
import { Skeleton } from "./Animated";

function ago(iso: string | null): string {
  if (!iso) return "";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 5)  return "now";
  if (s < 60) return s + "s";
  return Math.floor(s / 60) + "m";
}

const SVC: Record<string,string> = {
  "checkout-service":"🛒","payment-service":"💳",
  "inventory-service":"📦","notification-service":"✉️","fulfillment-service":"🚚",
};

/* animation #5 — live feed slide-in with indigo flash */
const entryVariants = {
  initial: { opacity: 0, y: -8, backgroundColor: "rgba(99,102,241,.1)" },
  animate: { opacity: 1, y: 0, backgroundColor: "rgba(0,0,0,0)" },
  exit:    { opacity: 0, x: 8, transition: { duration: .14 } },
};

export function LiveFeed() {
  const loader = useCallback(() => api.recentEvents(30), []);
  const { data, loading } = usePolling(loader, 2500);
  const seen = useRef(new Set<string>());
  const items = data ?? [];

  return (
    <div className="card overflow-hidden flex flex-col" style={{height:"100%", minHeight:280, maxHeight:380}}>
      {/* header — animation #12 double-ring */}
      <div className="px-4 py-2.5 flex items-center justify-between shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,.05)" }}>
        <div className="flex items-center gap-2">
          <span className="live-ring"><span className="live-dot" /></span>
          <span style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 600 }}>Live Activity</span>
        </div>
        <span className="mono" style={{ color: "#1e293b", fontSize: 10,
          background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)",
          borderRadius: 4, padding: "1px 6px" }}>{items.length}</span>
      </div>

      <div className="overflow-y-auto" style={{ flex:1, scrollbarWidth:"none", minHeight:0 }}>
        {loading && !data ? (
          <div className="p-4 space-y-3">
            {[...Array(6)].map((_,i) => (
              <div key={i} className="flex items-center gap-2.5">
                <Skeleton className="w-4 h-4 rounded" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-2.5 w-28" />
                  <Skeleton className="h-2 w-40" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12"
            style={{ color: "#1e293b", fontSize: 12 }}>
            <span style={{ fontSize: 24, marginBottom: 8 }}>⚡</span>
            Waiting for events…
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {items.map(ev => {
              const isNew = !seen.current.has(ev.id);
              if (isNew) seen.current.add(ev.id);
              return (
                <motion.div key={ev.id}
                  variants={isNew ? entryVariants : undefined}
                  initial={isNew ? "initial" : undefined}
                  animate={isNew ? "animate" : undefined}
                  exit="exit"
                  transition={{ duration: .25, ease: [0.21, 0.47, 0.32, 0.98] }}
                  className="px-3.5 py-2 flex items-start gap-2.5"
                  style={{ borderBottom: "1px solid rgba(255,255,255,.03)", cursor: "default" }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,.018)")}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                >
                  <span style={{ fontSize: 13, lineHeight: 1, marginTop: 1, flexShrink: 0 }}>
                    {SVC[ev.service_name] ?? "⚡"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="mono truncate" style={{ fontSize: 11, fontWeight: 600, color: "#e2e8f0", maxWidth: 120 }}>
                        {ev.event_type}
                      </span>
                      <EventStatusBadge status={ev.status} />
                      {ev.attempt_count > 1 && (
                        <span className="mono" style={{ fontSize: 10, color: "#f97316" }}>×{ev.attempt_count}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="mono truncate" style={{ fontSize: 10, color: "#1e293b" }}>
                        {ev.workflow_id.slice(-14)}
                      </span>
                      {ev.last_error && (
                        <span className="mono truncate" style={{ fontSize: 10, color: "#f43f5e", maxWidth: 100 }}
                          title={ev.last_error}>
                          {ev.last_error.slice(0, 26)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="mono shrink-0 mt-0.5" style={{ fontSize: 10, color: "#1e293b" }}>
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
