import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Skeleton, AnimatedNumber } from "./Animated";

interface Props {
  title: string;
  value: number | string | null;
  sub?: string;
  icon?: LucideIcon;
  trend?: string;
  trendDir?: "up" | "down" | "flat";
  accent?: "indigo" | "emerald" | "rose" | "orange" | "amber" | "purple" | "sky";
  sparkData?: number[];
}

const accentCfg: Record<string, { border: string; iconBg: string; iconText: string; glow: string; sparkStroke: string }> = {
  indigo:  { border: "rgba(99,102,241,0.18)",  iconBg: "rgba(99,102,241,0.1)",  iconText: "#818cf8", glow: "rgba(99,102,241,0.08)",  sparkStroke: "#6366f1" },
  emerald: { border: "rgba(16,185,129,0.18)",  iconBg: "rgba(16,185,129,0.1)",  iconText: "#34d399", glow: "rgba(16,185,129,0.08)",  sparkStroke: "#10b981" },
  rose:    { border: "rgba(244,63,94,0.18)",   iconBg: "rgba(244,63,94,0.1)",   iconText: "#fb7185", glow: "rgba(244,63,94,0.08)",   sparkStroke: "#f43f5e" },
  orange:  { border: "rgba(249,115,22,0.18)",  iconBg: "rgba(249,115,22,0.1)",  iconText: "#fb923c", glow: "rgba(249,115,22,0.08)",  sparkStroke: "#f97316" },
  amber:   { border: "rgba(245,158,11,0.18)",  iconBg: "rgba(245,158,11,0.1)",  iconText: "#fbbf24", glow: "rgba(245,158,11,0.08)",  sparkStroke: "#f59e0b" },
  purple:  { border: "rgba(168,85,247,0.18)",  iconBg: "rgba(168,85,247,0.1)",  iconText: "#c084fc", glow: "rgba(168,85,247,0.08)",  sparkStroke: "#a855f7" },
  sky:     { border: "rgba(14,165,233,0.18)",  iconBg: "rgba(14,165,233,0.1)",  iconText: "#38bdf8", glow: "rgba(14,165,233,0.08)",  sparkStroke: "#0ea5e9" },
};

const trendCfg = {
  up:   "text-emerald-400",
  down: "text-rose-400",
  flat: "text-slate-500",
};

function MiniSparkline({ data, stroke }: { data: number[]; stroke: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const w = 64, h = 28;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (v / max) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  const fillPts = `0,${h} ${pts} ${w},${h}`;
  return (
    <svg width={w} height={h} className="overflow-visible">
      <defs>
        <linearGradient id={`sg-${stroke.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.3} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <polygon points={fillPts} fill={`url(#sg-${stroke.replace("#","")})`} />
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MetricCard({ title, value, sub, icon: Icon, trend, trendDir = "flat", accent = "indigo", sparkData }: Props) {
  const cfg = accentCfg[accent];
  const isLoading = value === null;

  return (
    <motion.div
      className="card relative overflow-hidden cursor-default"
      style={{ borderColor: cfg.border, boxShadow: `0 0 24px ${cfg.glow}` }}
      whileHover={{ y: -2, boxShadow: `0 8px 32px ${cfg.glow}, 0 0 0 1px ${cfg.border}` }}
      transition={{ duration: 0.15 }}
    >
      {/* top gradient sheen */}
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${cfg.iconText}30, transparent)` }} />

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <p className="text-[11px] font-semibold tracking-[0.06em] uppercase" style={{ color: "#475569" }}>{title}</p>
          {Icon && (
            <div className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center" style={{ background: cfg.iconBg }}>
              <Icon size={14} style={{ color: cfg.iconText }} strokeWidth={2} />
            </div>
          )}
        </div>

        <div className="flex items-end justify-between gap-2">
          <div>
            <div className="text-[26px] font-bold text-white leading-none mono tabular-nums">
              {isLoading ? <Skeleton className="w-16 h-7" /> :
               typeof value === "number" ? <AnimatedNumber value={value} /> : value}
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              {trend && <span className={`text-[11px] font-semibold ${trendCfg[trendDir]}`}>{trend}</span>}
              {sub && <span className="text-[11px]" style={{ color: "#334155" }}>{sub}</span>}
            </div>
          </div>
          {sparkData && <MiniSparkline data={sparkData} stroke={cfg.sparkStroke} />}
        </div>
      </div>
    </motion.div>
  );
}
