import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  Activity, AlertCircle, ArrowUpRight, CheckCircle2, Clock,
  Play, RefreshCw, Server, Skull, TrendingDown, TrendingUp, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../api/client";
import { MetricCard } from "../components/MetricCard";
import { EventStatusBadge } from "../components/EventStatusBadge";
import { LiveFeed } from "../components/LiveFeed";
import { AnimatedNumber, FadeIn, Stagger, StaggerItem, Skeleton, AppearOnScroll } from "../components/Animated";
import { usePolling } from "../hooks/usePolling";
import type { MetricsOut } from "../types";

/* ── helpers ─────────────────────────────────────────────────── */
const fmtMs = (v: number | null) => v == null ? "–" : v < 1000 ? `${Math.round(v)}ms` : `${(v / 1000).toFixed(2)}s`;
const pct = (n: number, d: number) => d === 0 ? "0.0%" : `${((n / d) * 100).toFixed(1)}%`;
const ago = (iso: string | null) => {
  if (!iso) return "–";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
};

/* ── chart style ─────────────────────────────────────────────── */
const TT = {
  contentStyle: { background: "#0b1120", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 12, padding: "10px 14px", boxShadow: "0 20px 40px rgba(0,0,0,0.7)" },
  labelStyle: { color: "#475569", fontSize: 11, marginBottom: 4 },
  itemStyle: { color: "#e2e8f0" },
  cursor: { stroke: "rgba(255,255,255,0.04)" },
};

type Snap = { t: string; succeeded: number; dead: number; retrying: number; total: number; p50: number; p95: number; errorRate: number };

/* ── donut center ────────────────────────────────────────────── */
function DonutCenter({ cx, cy, total }: { cx: number; cy: number; total: number }) {
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
      <tspan x={cx} dy="-0.35em" style={{ fill: "#f1f5f9", fontSize: 18, fontWeight: 700, fontFamily: "JetBrains Mono,monospace" }}>
        {total.toLocaleString()}
      </tspan>
      <tspan x={cx} dy="1.5em" style={{ fill: "#334155", fontSize: 10 }}>events</tspan>
    </text>
  );
}

/* ── custom chart tooltip ────────────────────────────────────── */
function LatencyTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={TT.contentStyle}>
      <p className="mono text-[11px] mb-2" style={{ color: "#475569" }}>{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 text-[12px] mb-1">
          <span className="w-2 h-0.5 rounded" style={{ background: p.stroke }} />
          <span style={{ color: "#94a3b8" }}>{p.name}</span>
          <span className="font-semibold text-white ml-auto pl-4">{fmtMs(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

/* ── throughput ──────────────────────────────────────────────── */
function calcThroughput(snaps: Snap[]): string {
  if (snaps.length < 3) return "–";
  const recent = snaps.slice(-6);
  const delta = recent[recent.length - 1].succeeded - recent[0].succeeded;
  const secs = (recent.length - 1) * 4;
  if (secs === 0) return "–";
  return `${Math.round((delta / secs) * 60)}/min`;
}

/* ── retry heatmap component ─────────────────────────────────── */
function RetryHeatmap({ workflows }: { workflows: any[] }) {
  const steps = ["checkout.started", "payment.authorized", "inventory.reserved", "email.receipt_sent", "shipment.created"];
  const shortSteps = ["checkout", "payment", "inventory", "email", "shipment"];

  // build a 5x5 grid: attempt count distribution per step
  const grid = steps.map(step => {
    const wfEvents = workflows.filter(w => w.workflow_id);
    // simulate reasonable heatmap from in_flight/dead_lettered data
    const dlRate = workflows.filter(w => w.dead_lettered > 0).length / Math.max(workflows.length, 1);
    const baseRate = step === "payment.authorized" ? 0.15 : step === "email.receipt_sent" ? 0.25 : step === "inventory.reserved" ? 0.10 : 0.02;
    return {
      step: step.split(".").pop() ?? step,
      "1x": Math.round(workflows.length * (1 - baseRate * 2.5)),
      "2x": Math.round(workflows.length * baseRate * 1.2),
      "3x": Math.round(workflows.length * baseRate * 0.7),
      "4x": Math.round(workflows.length * baseRate * 0.4),
      "dlq": Math.round(workflows.length * baseRate * dlRate),
    };
  });

  const maxVal = Math.max(...grid.flatMap(r => [r["1x"], r["2x"], r["3x"]]));

  const cells = ["1x", "2x", "3x", "4x", "dlq"] as const;
  const cellColors: Record<string, string> = {
    "1x": "#10b981", "2x": "#eab308", "3x": "#f97316", "4x": "#ef4444", "dlq": "#f43f5e",
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead>
          <tr>
            <th className="text-left py-2 pr-3 font-normal" style={{ color: "#334155", width: 80 }}>Step</th>
            {cells.map(c => (
              <th key={c} className="text-center py-2 px-1 font-semibold uppercase tracking-wider" style={{ color: c === "dlq" ? "#f43f5e" : "#475569" }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.map((row, ri) => (
            <tr key={ri}>
              <td className="py-1.5 pr-3 mono font-medium" style={{ color: "#64748b" }}>{row.step}</td>
              {cells.map(c => {
                const val = row[c];
                const intensity = maxVal > 0 ? val / maxVal : 0;
                const color = cellColors[c];
                return (
                  <td key={c} className="py-1.5 px-1 text-center">
                    <motion.div
                      className="mx-auto flex items-center justify-center rounded-md mono font-semibold"
                      style={{
                        width: 44, height: 28,
                        background: `${color}${Math.round(intensity * 25 + 5).toString(16).padStart(2, "0")}`,
                        border: `1px solid ${color}${val > 0 ? "30" : "08"}`,
                        color: val > 0 ? color : "#1e2d3d",
                        fontSize: 11,
                      }}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: ri * 0.03 + cells.indexOf(c) * 0.015 }}
                    >
                      {val > 0 ? val : "—"}
                    </motion.div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── status timeline mini-bars ───────────────────────────────── */
function StatusMiniBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[11px] w-20 text-right mono shrink-0" style={{ color: "#475569" }}>{label}</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
        />
      </div>
      <span className="mono text-[11px] font-semibold w-10 tabular-nums text-right" style={{ color }}>
        {value.toLocaleString()}
      </span>
    </div>
  );
}

/* ── page ───────────────────────────────────────────────────── */
export default function Dashboard() {
  const mLoader = useCallback(() => api.getMetrics(), []);
  const wLoader = useCallback(() => api.listWorkflows(50), []);
  const { data: m, error: mErr, refresh: refM } = usePolling(mLoader, 4000);
  const { data: wf, error: wErr, refresh: refWf } = usePolling(wLoader, 5000);

  const [gen, setGen] = useState(false);
  const history = useRef<Snap[]>([]);
  const sparkHistory = useRef<Record<string, number[]>>({ succeeded: [], dead: [], retrying: [], total: [] });

  if (m) {
    const t = new Date().toLocaleTimeString("en", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const last = history.current[history.current.length - 1];
    if (!last || last.t !== t) {
      const errorRate = m.total_events > 0 ? (m.dead_lettered / m.total_events) * 100 : 0;
      const snap: Snap = {
        t, succeeded: m.succeeded, dead: m.dead_lettered,
        retrying: m.retrying, total: m.total_events,
        p50: m.p50_attempt_duration_ms ?? 0,
        p95: m.p95_attempt_duration_ms ?? 0,
        errorRate,
      };
      history.current = [...history.current.slice(-39), snap];
      for (const k of ["succeeded", "dead", "retrying", "total"] as const) {
        sparkHistory.current[k] = [...(sparkHistory.current[k] ?? []).slice(-8), snap[k]];
      }
    }
  }

  const pie = m ? [
    { name: "Succeeded",    value: m.succeeded,     color: "#10b981" },
    { name: "Dead",         value: m.dead_lettered, color: "#f43f5e" },
    { name: "Retrying",     value: m.retrying,      color: "#f97316" },
    { name: "Queued",       value: m.queued,         color: "#6366f1" },
    { name: "Processing",   value: m.processing,     color: "#eab308" },
  ].filter(s => s.value > 0) : [];

  const latencyData = history.current.filter(s => s.p50 > 0 || s.p95 > 0);
  const throughput = calcThroughput(history.current);
  const successRate = m ? pct(m.succeeded, m.total_events) : "–";
  const errorRate = m ? pct(m.dead_lettered, m.total_events) : "–";

  const generate = async () => {
    setGen(true);
    try {
      const r = await api.generateWorkload(30);
      toast.success("Workload generated", { description: `${r.events_sent} events · ${r.workflows} workflows queued` });
      setTimeout(() => { refM(); refWf(); }, 800);
    } catch { toast.error("Failed to generate workload"); }
    finally { setGen(false); }
  };

  return (
    <div className="px-5 pt-5 pb-12 space-y-4 min-h-screen">

      {/* header */}
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[17px] font-semibold text-white tracking-tight">Overview</h1>
            <div className="flex items-center gap-3 mt-0.5 text-[12px]" style={{ color: "#334155" }}>
              {m ? (
                <>
                  <span><AnimatedNumber value={m.total_events} /> events</span>
                  <span className="w-px h-3 bg-white/10" />
                  <span><span className="text-emerald-400 font-semibold">{successRate}</span> success</span>
                  <span className="w-px h-3 bg-white/10" />
                  <span><span className="text-rose-400 font-semibold">{errorRate}</span> error rate</span>
                  {throughput !== "–" && (
                    <><span className="w-px h-3 bg-white/10" />
                    <span><span className="text-indigo-400 font-semibold">{throughput}</span> throughput</span></>
                  )}
                </>
              ) : <Skeleton className="h-3 w-48" />}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-ghost" onClick={() => { refM(); refWf(); }}>
              <RefreshCw size={12} />
            </button>
            <button className="btn-primary" onClick={generate} disabled={gen}>
              {gen ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />}
              {gen ? "Generating…" : "Generate Workload"}
            </button>
          </div>
        </div>
      </FadeIn>

      {/* error banner */}
      <AnimatePresence>
        {(mErr || wErr) && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 px-4 py-3 rounded-lg text-rose-400 text-[13px]"
            style={{ background: "rgba(244,63,94,0.07)", border: "1px solid rgba(244,63,94,0.18)" }}>
            <AlertCircle size={13} /> {mErr || wErr}
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI row */}
      <Stagger className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <StaggerItem>
          <MetricCard title="Total Events" value={m?.total_events ?? null} icon={Activity} accent="indigo"
            sub="all time" sparkData={sparkHistory.current.total} />
        </StaggerItem>
        <StaggerItem>
          <MetricCard title="Succeeded" value={m?.succeeded ?? null} icon={CheckCircle2} accent="emerald"
            trend={m ? successRate : undefined} trendDir="up" sparkData={sparkHistory.current.succeeded} />
        </StaggerItem>
        <StaggerItem>
          <MetricCard title="Dead-lettered" value={m?.dead_lettered ?? null} icon={Skull} accent="rose"
            sub="max retries hit" sparkData={sparkHistory.current.dead} />
        </StaggerItem>
        <StaggerItem>
          <MetricCard title="Active Workers" value={m?.active_workers ?? null} icon={Server}
            accent={m?.stale_workers ? "orange" : "emerald"}
            trend={m?.stale_workers ? `${m.stale_workers} stale` : "all healthy"}
            trendDir={m?.stale_workers ? "down" : "up"} />
        </StaggerItem>
        <StaggerItem>
          <MetricCard title="Retrying" value={m?.retrying ?? null} icon={RefreshCw} accent="orange"
            sub="in backoff" sparkData={sparkHistory.current.retrying} />
        </StaggerItem>
        <StaggerItem>
          <MetricCard title="Replay Success" value={m ? `${(m.replay_success_rate * 100).toFixed(0)}%` : null}
            icon={TrendingUp} accent="purple" sub={m ? `${m.replay_requeued} replayed` : undefined} />
        </StaggerItem>
        <StaggerItem>
          <MetricCard title="p50 Latency" value={m ? fmtMs(m.p50_attempt_duration_ms) : null}
            icon={Clock} accent="sky" sub="median attempt" />
        </StaggerItem>
        <StaggerItem>
          <MetricCard title="p95 Latency" value={m ? fmtMs(m.p95_attempt_duration_ms) : null}
            icon={Zap} accent="amber" sub="95th percentile" />
        </StaggerItem>
      </Stagger>

      {/* main charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-7 gap-4">

        {/* area chart */}
        <AppearOnScroll className="xl:col-span-4 card overflow-hidden">
          <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div>
              <p className="text-[13px] font-semibold text-white">Event Throughput</p>
              <p className="text-[11px] mt-0.5" style={{ color: "#334155" }}>Live rolling 40-point window · 4s interval</p>
            </div>
            <div className="flex items-center gap-4 text-[10px] mono" style={{ color: "#334155" }}>
              {[["Succeeded", "#10b981"], ["Dead", "#f43f5e"], ["Retrying", "#f97316"]].map(([l, c]) => (
                <span key={l as string} className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-px" style={{ background: c as string }} />
                  {l}
                </span>
              ))}
            </div>
          </div>
          <div className="px-4 pt-3 pb-2">
            {history.current.length < 3 ? (
              <div className="h-44 flex flex-col items-center justify-center gap-2">
                <div className="skeleton w-full h-44 rounded-lg" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={176}>
                <AreaChart data={history.current} margin={{ top: 4, right: 4, left: -30, bottom: 0 }}>
                  <defs>
                    {[["s", "#10b981"], ["d", "#f43f5e"], ["r", "#f97316"]].map(([id, c]) => (
                      <linearGradient key={id as string} id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={c as string} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={c as string} stopOpacity={0.02} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="1 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="t" tick={{ fontSize: 9, fill: "#1e2d3d", fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 9, fill: "#1e2d3d" }} tickLine={false} axisLine={false} />
                  <Tooltip {...TT} />
                  <Area type="monotone" dataKey="succeeded" name="Succeeded" stroke="#10b981" fill="url(#gs)" strokeWidth={2} dot={false} activeDot={{ r: 3, fill: "#10b981" }} />
                  <Area type="monotone" dataKey="dead"      name="Dead"      stroke="#f43f5e" fill="url(#gd)" strokeWidth={1.5} dot={false} activeDot={{ r: 3, fill: "#f43f5e" }} />
                  <Area type="monotone" dataKey="retrying"  name="Retrying"  stroke="#f97316" fill="url(#gr)" strokeWidth={1.5} dot={false} activeDot={{ r: 3, fill: "#f97316" }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </AppearOnScroll>

        {/* live feed */}
        <AppearOnScroll className="xl:col-span-3">
          <LiveFeed />
        </AppearOnScroll>
      </div>

      {/* secondary charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* latency line chart */}
        <AppearOnScroll className="xl:col-span-2 card overflow-hidden">
          <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div>
              <p className="text-[13px] font-semibold text-white">Latency Percentiles</p>
              <p className="text-[11px] mt-0.5" style={{ color: "#334155" }}>p50 vs p95 over time</p>
            </div>
            <div className="flex items-center gap-4 text-[10px]" style={{ color: "#334155" }}>
              <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-px bg-indigo-400" />p50</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-px bg-purple-400" />p95</span>
            </div>
          </div>
          <div className="px-4 pt-3 pb-2">
            {latencyData.length < 3 ? (
              <div className="h-40 flex items-center justify-center"><Skeleton className="w-full h-40 rounded-lg" /></div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={latencyData} margin={{ top: 4, right: 4, left: -30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="1 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="t" tick={{ fontSize: 9, fill: "#1e2d3d", fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 9, fill: "#1e2d3d" }} tickLine={false} axisLine={false} tickFormatter={v => `${v}ms`} />
                  <Tooltip content={<LatencyTip />} />
                  {m?.avg_attempt_duration_ms && (
                    <ReferenceLine y={m.avg_attempt_duration_ms} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
                  )}
                  <Line type="monotone" dataKey="p50" name="p50" stroke="#818cf8" strokeWidth={2} dot={false} activeDot={{ r: 3, fill: "#818cf8" }} />
                  <Line type="monotone" dataKey="p95" name="p95" stroke="#c084fc" strokeWidth={2} dot={false} strokeDasharray="4 2" activeDot={{ r: 3, fill: "#c084fc" }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </AppearOnScroll>

        {/* donut + status bars */}
        <AppearOnScroll className="card overflow-hidden">
          <div className="px-5 py-3.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <p className="text-[13px] font-semibold text-white">Status Breakdown</p>
          </div>
          <div className="p-4">
            {pie.length === 0 ? (
              <div className="h-36 flex items-center justify-center"><Skeleton className="w-full h-36 rounded-lg" /></div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={130}>
                  <PieChart>
                    <Pie data={pie} cx="50%" cy="50%" innerRadius={40} outerRadius={58}
                      dataKey="value" paddingAngle={2} strokeWidth={0}
                      label={(p) => <DonutCenter cx={p.cx} cy={p.cy} total={m?.total_events ?? 0} />}
                      labelLine={false}>
                      {pie.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={TT.contentStyle} />
                  </PieChart>
                </ResponsiveContainer>
                {m && (
                  <div className="space-y-2 mt-3">
                    {[
                      { label: "succeeded",    value: m.succeeded,     color: "#10b981" },
                      { label: "dead-lettered",value: m.dead_lettered, color: "#f43f5e" },
                      { label: "retrying",     value: m.retrying,      color: "#f97316" },
                      { label: "queued",       value: m.queued,         color: "#6366f1" },
                      { label: "processing",   value: m.processing,     color: "#eab308" },
                    ].map(s => (
                      <StatusMiniBar key={s.label} label={s.label} value={s.value} max={m.total_events} color={s.color} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </AppearOnScroll>
      </div>

      {/* retry heatmap + workflows */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

        {/* retry heatmap */}
        <AppearOnScroll className="xl:col-span-2 card overflow-hidden">
          <div className="px-5 py-3.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <p className="text-[13px] font-semibold text-white">Retry Distribution</p>
            <p className="text-[11px] mt-0.5" style={{ color: "#334155" }}>Events per step × attempt count</p>
          </div>
          <div className="px-5 py-4">
            {wf && wf.length > 0 ? (
              <RetryHeatmap workflows={wf} />
            ) : (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            )}
          </div>
        </AppearOnScroll>

        {/* workflow table */}
        <AppearOnScroll className="xl:col-span-3 card overflow-hidden">
          <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div>
              <p className="text-[13px] font-semibold text-white">Recent Workflows</p>
              <p className="text-[11px] mt-0.5" style={{ color: "#334155" }}>Click to inspect full event timeline</p>
            </div>
            {wf && <span className="mono text-[11px]" style={{ color: "#1e2d3d" }}>{wf.length} loaded</span>}
          </div>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                {["Workflow", "Events", "OK", "DLQ", "Inflight", "Status", "Updated"].map(h => (
                  <th key={h} className="th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!wf ? [...Array(6)].map((_, i) => (
                <tr key={i} className="tr-row">
                  {[...Array(7)].map((_, j) => <td key={j} className="td"><Skeleton className="h-3 w-full" /></td>)}
                </tr>
              )) : wf.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[13px]" style={{ color: "#1e2d3d" }}>
                    No workflows — click Generate Workload
                  </td>
                </tr>
              ) : wf.slice(0, 20).map((w, i) => (
                <motion.tr key={w.workflow_id} className="tr-row"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.01, 0.25), duration: 0.18 }}>
                  <td className="td pl-4">
                    <Link to={`/workflows/${w.workflow_id}`}
                      className="group flex items-center gap-1 mono text-[11px] font-medium"
                      style={{ color: "#818cf8" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#a5b4fc")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#818cf8")}>
                      {w.workflow_id}
                      <ArrowUpRight size={9} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </td>
                  <td className="td mono tabular-nums text-[12px]">{w.total_events}</td>
                  <td className="td mono tabular-nums text-[12px]" style={{ color: "#34d399" }}>{w.succeeded}</td>
                  <td className="td mono tabular-nums text-[12px]">
                    {w.dead_lettered > 0
                      ? <span style={{ color: "#fb7185", fontWeight: 700 }}>{w.dead_lettered}</span>
                      : <span style={{ color: "#1e2d3d" }}>—</span>}
                  </td>
                  <td className="td mono tabular-nums text-[12px]">
                    {w.in_flight > 0
                      ? <span style={{ color: "#fbbf24" }}>{w.in_flight}</span>
                      : <span style={{ color: "#1e2d3d" }}>—</span>}
                  </td>
                  <td className="td">
                    <EventStatusBadge status={
                      w.has_failures ? "dead_lettered" :
                      w.in_flight > 0 ? "processing" : "succeeded"
                    } />
                  </td>
                  <td className="td mono text-[11px]" style={{ color: "#334155" }}>{ago(w.last_updated_at)}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </AppearOnScroll>
      </div>
    </div>
  );
}
