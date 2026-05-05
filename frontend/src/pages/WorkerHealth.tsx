import React, { useCallback } from "react";
import { motion } from "framer-motion";
import { Activity, AlertTriangle, Clock, Power, Server } from "lucide-react";
import { api } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { FadeIn, Stagger, StaggerItem, Skeleton } from "../components/Animated";
import type { WorkerOut } from "../types";

const ago = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
};

const heartbeatAge = (iso: string) =>
  Math.floor((Date.now() - new Date(iso).getTime()) / 1000);

function WorkerRow({ w, delay }: { w: WorkerOut; delay: number }) {
  const effectiveStatus = w.is_stale ? "stale" : w.status;
  const age = heartbeatAge(w.last_heartbeat_at);
  const isHealthy = !w.is_stale && w.status === "active";

  const statusCfg: Record<string, { icon: React.ReactNode; cls: string; badge: string }> = {
    active:  { icon: <Activity size={11} className="text-emerald-400 animate-pulse" />, cls: "text-emerald-400", badge: "bg-emerald-950/60 text-emerald-400 border-emerald-800/30" },
    busy:    { icon: <Activity size={11} className="text-amber-400 animate-pulse" />,   cls: "text-amber-400",   badge: "bg-amber-950/60 text-amber-400 border-amber-800/30" },
    stale:   { icon: <AlertTriangle size={11} className="text-orange-400" />,           cls: "text-orange-400",  badge: "bg-orange-950/60 text-orange-400 border-orange-800/30" },
    stopped: { icon: <Power size={11} className="text-slate-500" />,                   cls: "text-slate-500",   badge: "bg-slate-900 text-slate-500 border-slate-700" },
    crashed: { icon: <AlertTriangle size={11} className="text-rose-400" />,             cls: "text-rose-400",    badge: "bg-rose-950/60 text-rose-400 border-rose-800/30" },
  };
  const cfg = statusCfg[effectiveStatus] ?? statusCfg.stopped;

  return (
    <motion.tr
      className="tr-hover"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
    >
      <td className="td pl-4">
        <div className="flex items-center gap-2.5">
          {/* animated heartbeat indicator */}
          <div className="relative w-3 h-3 shrink-0">
            {isHealthy && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-30" />
            )}
            <span className={`relative inline-flex rounded-full w-3 h-3 ${
              isHealthy ? "bg-emerald-500" :
              effectiveStatus === "crashed" ? "bg-rose-500" :
              effectiveStatus === "stale" ? "bg-orange-500" : "bg-slate-600"
            }`} />
          </div>
          <span className="mono text-[13px] font-medium text-white">{w.worker_name}</span>
        </div>
      </td>
      <td className="td">
        <span className={`badge border text-[11px] ${cfg.badge}`}>
          {cfg.icon}&nbsp;{effectiveStatus}
        </span>
      </td>
      <td className="td">
        <div className="flex items-center gap-1.5">
          <Clock size={10} className={age > 30 ? "text-orange-500" : "text-slate-600"} />
          <span className={`text-[12px] mono ${age > 30 ? "text-orange-400" : "text-slate-400"}`}>
            {ago(w.last_heartbeat_at)}
          </span>
          {age > 30 && (
            <span className="text-[10px] text-orange-600 ml-1">({age}s)</span>
          )}
        </div>
      </td>
      <td className="td">
        {w.current_event_id
          ? <span className="mono text-[11px] text-indigo-400">{w.current_event_id.slice(0, 14)}…</span>
          : <span className="text-slate-700 text-[12px]">idle</span>
        }
      </td>
      <td className="td pr-4">
        {/* heartbeat bar */}
        <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: "#1a2640" }}>
          <motion.div
            className="h-full rounded-full"
            animate={isHealthy ? { scaleX: [1, 0.3, 1] } : { scaleX: 0.15 }}
            transition={isHealthy ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" as const } : {}}
            style={{ transformOrigin: "left", background: isHealthy ? "#10b981" : effectiveStatus === "crashed" ? "#f43f5e" : "#f97316" } as React.CSSProperties}
          />
        </div>
      </td>
    </motion.tr>
  );
}

export default function WorkerHealth() {
  const loader = useCallback(() => api.listWorkers(), []);
  const { data, loading, error } = usePolling(loader, 5000);

  const active  = (data ?? []).filter(w => !w.is_stale && w.status === "active").length;
  const crashed = (data ?? []).filter(w => w.status === "crashed").length;
  const stale   = (data ?? []).filter(w => w.is_stale).length;
  const total   = (data ?? []).length;
  const healthPct = total > 0 ? Math.round((active / total) * 100) : 0;

  return (
    <div className="px-6 pt-6 pb-10 space-y-5">

      <FadeIn>
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            <Server size={18} className="text-indigo-400" /> Workers
          </h1>
          <p className="text-slate-500 text-[13px] mt-0.5">Heartbeat monitor · stale threshold 30s</p>
        </div>
      </FadeIn>

      {/* fleet health */}
      {data && data.length > 0 && (
        <Stagger className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StaggerItem>
            <div className="card p-4 flex items-center gap-3">
              {/* arc */}
              <div className="relative w-12 h-12 shrink-0">
                <svg viewBox="0 0 40 40" className="w-full h-full -rotate-90">
                  <circle cx="20" cy="20" r="16" fill="none" stroke="#1a2640" strokeWidth="5" />
                  <motion.circle cx="20" cy="20" r="16" fill="none"
                    stroke={healthPct > 80 ? "#10b981" : healthPct > 50 ? "#f97316" : "#f43f5e"}
                    strokeWidth="5" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 16}`}
                    initial={{ strokeDashoffset: 2 * Math.PI * 16 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 16 * (1 - healthPct / 100) }}
                    transition={{ duration: 1, ease: "easeOut" as const }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white">{healthPct}%</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Fleet Health</p>
                <p className="text-[15px] font-bold text-white">{active}/{total}</p>
              </div>
            </div>
          </StaggerItem>
          {[
            { label: "Active",   value: active,   color: "text-emerald-400" },
            { label: "Stale",    value: stale,    color: stale > 0 ? "text-orange-400" : "text-slate-700" },
            { label: "Crashed",  value: crashed,  color: crashed > 0 ? "text-rose-400" : "text-slate-700" },
          ].map(({ label, value, color }) => (
            <StaggerItem key={label}>
              <div className="card p-4 flex items-center gap-3">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
                  <p className={`text-2xl font-bold mono ${color}`}>{value}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg text-rose-400 text-[13px]"
          style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)" }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      <FadeIn delay={0.1} className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid #1a2640", background: "rgba(255,255,255,0.01)" }}>
              {["Worker", "Status", "Last Heartbeat", "Current Event", "Activity"].map(h => (
                <th key={h} className="th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && !data ? (
              [...Array(3)].map((_, i) => (
                <tr key={i} className="tr">
                  {[...Array(5)].map((_, j) => <td key={j} className="td"><Skeleton className="h-4 w-full" /></td>)}
                </tr>
              ))
            ) : data?.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Server size={32} className="text-slate-800" />
                    <p className="text-slate-600 text-[13px]">No workers registered</p>
                    <p className="text-slate-700 text-[12px]">Start the worker service to see activity</p>
                  </div>
                </td>
              </tr>
            ) : (
              data!.map((w, i) => <WorkerRow key={w.id} w={w} delay={i * 0.05} />)
            )}
          </tbody>
        </table>
      </FadeIn>
    </div>
  );
}
