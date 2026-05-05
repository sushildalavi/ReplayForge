import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { AnimatedNumber, Skeleton } from "./Animated";

interface MetricCardProps {
  title: string;
  value: number | string | null;
  sub?: string;
  icon?: LucideIcon;
  trendLabel?: string;
  trendDir?: "up" | "down" | "neutral";
  accent?: "indigo" | "emerald" | "rose" | "orange" | "yellow" | "purple" | "gray";
  animate?: boolean;
}

const glowMap: Record<string, string> = {
  indigo:  "card-glow-indigo",
  emerald: "card-glow-emerald",
  rose:    "card-glow-rose",
  orange:  "card-glow-orange",
  yellow:  "card-glow-yellow",
  purple:  "card-glow-purple",
  gray:    "",
};
const iconMap: Record<string, string> = {
  indigo:  "bg-indigo-500/10 text-indigo-400",
  emerald: "bg-emerald-500/10 text-emerald-400",
  rose:    "bg-rose-500/10 text-rose-400",
  orange:  "bg-orange-500/10 text-orange-400",
  yellow:  "bg-yellow-500/10 text-yellow-400",
  purple:  "bg-purple-500/10 text-purple-400",
  gray:    "bg-slate-800 text-slate-400",
};
const borderMap: Record<string, string> = {
  indigo:  "border-indigo-500/20",
  emerald: "border-emerald-500/20",
  rose:    "border-rose-500/20",
  orange:  "border-orange-500/20",
  yellow:  "border-yellow-500/20",
  purple:  "border-purple-500/20",
  gray:    "border-slate-800",
};
const trendMap = {
  up:      "text-emerald-400",
  down:    "text-rose-400",
  neutral: "text-slate-500",
};

export function MetricCard({
  title, value, sub, icon: Icon, trendLabel, trendDir = "neutral", accent = "gray", animate = true,
}: MetricCardProps) {
  const isLoading = value === null;
  const isNumeric = typeof value === "number";

  return (
    <motion.div
      className={`card ${borderMap[accent]} ${glowMap[accent]} p-5 relative overflow-hidden cursor-default`}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
    >
      {/* subtle gradient overlay */}
      {accent !== "gray" && (
        <div className={`absolute inset-0 opacity-[0.03] pointer-events-none`}
          style={{
            background: `radial-gradient(ellipse at top right, ${
              accent === "indigo" ? "#6366f1" :
              accent === "emerald" ? "#10b981" :
              accent === "rose" ? "#f43f5e" :
              accent === "orange" ? "#f97316" :
              accent === "yellow" ? "#eab308" :
              "#a855f7"
            } 0%, transparent 70%)`
          }}
        />
      )}

      <div className="relative flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2.5">{title}</p>

          <div className="text-[28px] font-bold text-white leading-none tabular-nums mono">
            {isLoading ? (
              <Skeleton className="w-20 h-8" />
            ) : animate && isNumeric ? (
              <AnimatedNumber value={value as number} />
            ) : (
              value
            )}
          </div>

          <div className="mt-2.5 flex items-center gap-2">
            {trendLabel && (
              <span className={`text-xs font-semibold ${trendMap[trendDir]}`}>{trendLabel}</span>
            )}
            {sub && <span className="text-xs text-slate-600">{sub}</span>}
          </div>
        </div>

        {Icon && (
          <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${iconMap[accent]}`}>
            <Icon size={16} strokeWidth={2} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
