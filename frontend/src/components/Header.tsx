import { useCallback, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Command, Search, Zap, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { usePolling } from "../hooks/usePolling";
import { api } from "../api/client";

type SystemHealth = "healthy" | "degraded" | "critical";

function getHealth(active: number, stale: number, dead: number): SystemHealth {
  if (dead > 0 && active === 0) return "critical";
  if (stale > 0 || dead > 0) return "degraded";
  return "healthy";
}

const HEALTH_CFG = {
  healthy:  { label: "All systems operational", color: "#10b981", icon: CheckCircle,  dot: "bg-emerald-500" },
  degraded: { label: "Degraded performance",    color: "#f97316", icon: AlertTriangle, dot: "bg-orange-500" },
  critical: { label: "System critical",          color: "#f43f5e", icon: XCircle,       dot: "bg-rose-500" },
};

const CRUMBS: Record<string, string> = {
  "/":            "Overview",
  "/deadletters": "Dead Letters",
  "/workers":     "Workers",
};

export function Header({ onCmdK }: { onCmdK: () => void }) {
  const loc = useLocation();
  const crumb = CRUMBS[loc.pathname] ?? loc.pathname.split("/").pop() ?? "…";

  const mLoader = useCallback(() => api.getMetrics(), []);
  const { data: m } = usePolling(mLoader, 6000);

  const health: SystemHealth = m
    ? getHealth(m.active_workers, m.stale_workers, m.dead_lettered)
    : "healthy";
  const hcfg = HEALTH_CFG[health];
  const HealthIcon = hcfg.icon;

  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between px-5 h-11"
      style={{ background: "rgba(5,9,18,0.85)", borderBottom: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(12px)" }}
    >
      {/* breadcrumb */}
      <div className="flex items-center gap-2 text-[12px]">
        <Zap size={11} style={{ color: "#6366f1" }} />
        <span style={{ color: "#334155" }}>ReplayForge</span>
        <span style={{ color: "#1e2d3d" }}>/</span>
        <span className="text-white font-medium">{crumb}</span>
      </div>

      {/* right side */}
      <div className="flex items-center gap-3">
        {/* system health */}
        {m && (
          <motion.div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md cursor-default"
            style={{ background: `${hcfg.color}0f`, border: `1px solid ${hcfg.color}25` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <span className={`relative flex h-1.5 w-1.5`}>
              {health === "healthy" && (
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${hcfg.dot} opacity-60`} />
              )}
              <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${hcfg.dot}`} />
            </span>
            <span className="text-[11px] font-medium" style={{ color: hcfg.color }}>{hcfg.label}</span>
          </motion.div>
        )}

        {/* quick stats */}
        {m && (
          <div className="flex items-center gap-3 text-[11px] mono" style={{ color: "#334155" }}>
            <span><span className="text-emerald-400">{m.active_workers}</span> workers</span>
            <span><span className="text-indigo-400">{m.total_events.toLocaleString()}</span> events</span>
          </div>
        )}

        {/* search button */}
        <button
          onClick={onCmdK}
          className="flex items-center gap-2 px-2.5 py-1 rounded-md text-[12px] transition-colors"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#475569" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "#94a3b8"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#475569"; }}
        >
          <Search size={11} />
          <span>Search</span>
          <div className="flex items-center gap-0.5 ml-1">
            <span className="kbd">⌘</span>
            <span className="kbd">K</span>
          </div>
        </button>
      </div>
    </header>
  );
}
