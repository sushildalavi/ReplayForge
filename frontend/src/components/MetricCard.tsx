import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useRef, useCallback, useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import { AnimatedNumber, Skeleton } from "./Animated";

/* ── inline sparkline — animation #23 ─────────────── */
function Spark({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return <div style={{ width: 56, height: 24 }} />;
  const max = Math.max(...data, 1);
  const W = 56, H = 24, PAD = 2;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - PAD - (v / max) * (H - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p}`).join(" ");
  const totalLen = data.length * 9;
  return (
    <svg width={W} height={H} style={{ overflow: "visible", flexShrink: 0 }}>
      <defs>
        <linearGradient id={`spf-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity={.22} />
          <stop offset="100%" stopColor={color} stopOpacity={.01} />
        </linearGradient>
      </defs>
      <polygon points={`0,${H} ${pts.join(" ")} ${W},${H}`} fill={`url(#spf-${color.replace("#","")})`} />
      <motion.path
        d={d} fill="none" stroke={color} strokeWidth={1.5}
        strokeLinecap="round" strokeLinejoin="round"
        initial={{ strokeDasharray: totalLen, strokeDashoffset: totalLen }}
        animate={{ strokeDashoffset: 0 }}
        transition={{ duration: .9, ease: [0.21, 0.47, 0.32, 0.98], delay: .1 }}
      />
    </svg>
  );
}

/* ── accent config ─────────────────────────────────── */
const A: Record<string,{ color: string; dim: string }> = {
  indigo:  { color: "#818cf8", dim: "rgba(99,102,241,.1)"   },
  emerald: { color: "#34d399", dim: "rgba(16,185,129,.1)"   },
  rose:    { color: "#fb7185", dim: "rgba(244,63,94,.1)"    },
  orange:  { color: "#fb923c", dim: "rgba(249,115,22,.1)"   },
  amber:   { color: "#fbbf24", dim: "rgba(245,158,11,.1)"   },
  purple:  { color: "#c084fc", dim: "rgba(168,85,247,.1)"   },
  sky:     { color: "#38bdf8", dim: "rgba(14,165,233,.1)"   },
  default: { color: "#64748b", dim: "rgba(100,116,139,.06)" },
};

interface Props {
  label: string;
  value: number | string | null;
  sub?: string;
  icon?: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  accent?: keyof typeof A;
  sparkData?: number[];
  featured?: boolean;
}

export function MetricCard({ label, value, sub, icon: Icon, trend, trendUp, accent = "default", sparkData, featured = false }: Props) {
  const { color, dim } = A[accent] ?? A.default;
  const isLoading = value === null;
  const cardRef = useRef<HTMLDivElement>(null);

  /* spotlight — animation #16 */
  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mouse-x", ((e.clientX - r.left) / r.width * 100) + "%");
    el.style.setProperty("--mouse-y", ((e.clientY - r.top) / r.height * 100) + "%");
  }, []);

  return (
    <motion.div
      ref={cardRef}
      className={"spotlight " + (featured ? "card-glow" : "card") + " relative overflow-hidden flex flex-col gap-2.5 p-4"}
      onMouseMove={onMove}
      /* animation #8 — hover lift */
      whileHover={{ y: -3, borderColor: featured ? undefined : "rgba(255,255,255,.14)", transition: { duration: .16 } }}
      style={{ cursor: "default" }}
    >
      {/* top accent line */}
      <div className="absolute inset-x-0 top-0 h-px pointer-events-none"
        style={{ background: `linear-gradient(90deg,transparent,${color}80,transparent)` }} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {Icon && (
            <div className="w-5 h-5 rounded flex items-center justify-center shrink-0"
              style={{ background: dim }}>
              <Icon size={11} style={{ color }} strokeWidth={2} />
            </div>
          )}
          <span style={{ color: "#475569", fontSize: 10.5, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase" }}>
            {label}
          </span>
        </div>
        {trend && (
          <span style={{ color: trendUp ? "#34d399" : "#fb7185", fontSize: 11, fontWeight: 600, fontFamily: "JetBrains Mono,monospace" }}>
            {trendUp ? "↑" : "↓"} {trend}
          </span>
        )}
      </div>

      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="mono font-bold tabular-nums"
            style={{ color: featured ? color : "#fff", fontSize: featured ? 30 : 24, lineHeight: 1, letterSpacing: "-.02em" }}>
            {isLoading ? <Skeleton className="w-16 h-6" /> :
              typeof value === "number" ? <AnimatedNumber value={value} /> : value}
          </div>
          {sub && <div style={{ color: "#334155", fontSize: 10.5, marginTop: 4 }}>{sub}</div>}
        </div>
        {sparkData && <Spark data={sparkData} color={color} />}
      </div>
    </motion.div>
  );
}
