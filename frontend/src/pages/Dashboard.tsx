import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { motion } from "framer-motion";
import {
  Activity, AlertCircle, ArrowUpRight, CheckCircle2,
  Clock, Play, RefreshCw, Server, Skull, TrendingUp, Zap,
} from "lucide-react";
import { api } from "../api/client";
import { MetricCard } from "../components/MetricCard";
import { EventStatusBadge } from "../components/EventStatusBadge";
import { AnimatedNumber, FadeIn, Stagger, StaggerItem, Skeleton } from "../components/Animated";
import { usePolling } from "../hooks/usePolling";
import type { MetricsOut, WorkflowSummaryOut } from "../types";

/* ── helpers ─────────────────────────────────────────────── */
const fmtMs = (ms: number | null) => ms == null ? "–" : ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const timeAgo = (iso: string | null) => {
  if (!iso) return "–";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
};

/* ── chart palette ───────────────────────────────────────── */
const C = {
  succeeded:    "#10b981",
  dead:         "#f43f5e",
  retrying:     "#f97316",
  queued:       "#6366f1",
  processing:   "#eab308",
  indigo:       "#818cf8",
};

const TT = {
  contentStyle: {
    background: "#0d1525", border: "1px solid #1a2640",
    borderRadius: 10, fontSize: 12, padding: "10px 14px",
    boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
  },
  labelStyle:  { color: "#64748b", marginBottom: 6, fontSize: 11 },
  itemStyle:   { color: "#e2e8f0" },
  cursor:      { stroke: "rgba(255,255,255,0.06)", strokeWidth: 1 },
};

/* ── sparkline history ───────────────────────────────────── */
type Snapshot = { t: string; succeeded: number; dead: number; retrying: number; total: number };

function buildPie(m: MetricsOut) {
  return [
    { name: "Succeeded",    value: m.succeeded,     color: C.succeeded },
    { name: "Dead-lettered",value: m.dead_lettered, color: C.dead },
    { name: "Retrying",     value: m.retrying,      color: C.retrying },
    { name: "Queued",       value: m.queued,         color: C.queued },
    { name: "Processing",   value: m.processing,     color: C.processing },
  ].filter(s => s.value > 0);
}

function buildBar(wf: WorkflowSummaryOut[]) {
  return wf.slice(0, 14).reverse().map(w => ({
    id: w.workflow_id.slice(-8),
    ok:  w.succeeded,
    dlq: w.dead_lettered,
    fly: w.in_flight,
  }));
}

/* ── custom tooltip ──────────────────────────────────────── */
function BarTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={TT.contentStyle}>
      <p className="mono text-[11px] text-slate-500 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 text-[12px] mb-1">
          <span className="w-2 h-2 rounded-sm" style={{ background: p.fill }} />
          <span className="text-slate-400">{p.name}</span>
          <span className="font-semibold text-white ml-auto pl-4">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ── donut label ─────────────────────────────────────────── */
function DonutLabel({ cx, cy, total }: { cx: number; cy: number; total: number }) {
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
      <tspan x={cx} dy="-0.3em" className="mono" style={{ fill: "#fff", fontSize: 22, fontWeight: 700 }}>
        {total.toLocaleString()}
      </tspan>
      <tspan x={cx} dy="1.4em" style={{ fill: "#475569", fontSize: 11 }}>events</tspan>
    </text>
  );
}

/* ── component ───────────────────────────────────────────── */
export default function Dashboard() {
  const metricsLoader = useCallback(() => api.getMetrics(), []);
  const workflowsLoader = useCallback(() => api.listWorkflows(30), []);

  const { data: m, error: mErr, refresh: refM } = usePolling(metricsLoader, 5000);
  const { data: wf, error: wErr, refresh: refWf } = usePolling(workflowsLoader, 5000);

  const [generating, setGenerating] = useState(false);
  const [genMsg, setGenMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const history = useRef<Snapshot[]>([]);
  if (m) {
    const t = new Date().toLocaleTimeString("en", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const last = history.current[history.current.length - 1];
    if (!last || last.t !== t) {
      history.current = [...history.current.slice(-24), {
        t, succeeded: m.succeeded, dead: m.dead_lettered, retrying: m.retrying, total: m.total_events,
      }];
    }
  }

  const pie = m ? buildPie(m) : [];
  const bar = wf ? buildBar(wf) : [];
  const successRate = m && m.total_events > 0 ? (m.succeeded / m.total_events) * 100 : 0;

  const generate = async () => {
    setGenerating(true); setGenMsg(null);
    try {
      const r = await api.generateWorkload(30);
      setGenMsg({ text: `✓ ${r.events_sent} events · ${r.workflows} workflows queued`, ok: true });
      setTimeout(() => { refM(); refWf(); }, 800);
    } catch { setGenMsg({ text: "Failed to reach API", ok: false }); }
    finally { setGenerating(false); }
  };

  return (
    <div className="px-6 pt-6 pb-10 space-y-5">

      {/* ── header ────────────────────────────────────────── */}
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">Overview</h1>
            <p className="text-slate-500 text-[13px] mt-0.5">Auto-refreshing every 5s</p>
          </div>
          <div className="flex items-center gap-3">
            {genMsg && (
              <motion.span
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`text-[12px] px-3 py-1.5 rounded-lg border ${
                  genMsg.ok
                    ? "text-emerald-400 bg-emerald-950/40 border-emerald-800/30"
                    : "text-rose-400 bg-rose-950/40 border-rose-800/30"
                }`}
              >
                {genMsg.text}
              </motion.span>
            )}
            <button className="btn-primary" onClick={generate} disabled={generating}>
              {generating ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />}
              {generating ? "Generating…" : "Generate Workload"}
            </button>
          </div>
        </div>
      </FadeIn>

      {(mErr || wErr) && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-center gap-2 px-4 py-3 rounded-lg text-rose-400 text-[13px]"
          style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)" }}>
          <AlertCircle size={14} /> {mErr || wErr}
        </motion.div>
      )}

      {/* ── KPIs ──────────────────────────────────────────── */}
      <Stagger className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StaggerItem>
          <MetricCard title="Total Events"   value={m?.total_events ?? null}   icon={Activity}     accent="indigo"  sub="all time" />
        </StaggerItem>
        <StaggerItem>
          <MetricCard title="Succeeded"       value={m?.succeeded ?? null}      icon={CheckCircle2} accent="emerald"
            trendLabel={m ? pct(m.succeeded / (m.total_events || 1)) : undefined} trendDir="up" sub="success rate" />
        </StaggerItem>
        <StaggerItem>
          <MetricCard title="Dead-lettered"   value={m?.dead_lettered ?? null}  icon={Skull}        accent="rose"   sub="max retries hit" />
        </StaggerItem>
        <StaggerItem>
          <MetricCard title="Active Workers"  value={m?.active_workers ?? null} icon={Server}
            accent={m?.stale_workers ? "orange" : "emerald"}
            trendLabel={m?.stale_workers ? `${m.stale_workers} stale` : "all healthy"}
            trendDir={m?.stale_workers ? "down" : "up"} />
        </StaggerItem>
        <StaggerItem>
          <MetricCard title="Retrying"        value={m?.retrying ?? null}       icon={RefreshCw}    accent="orange" sub="in backoff" />
        </StaggerItem>
        <StaggerItem>
          <MetricCard title="Replay Success"  value={m ? pct(m.replay_success_rate) : null} animate={false} icon={TrendingUp} accent="purple"
            sub={`${m?.replay_requeued ?? 0} total replayed`} />
        </StaggerItem>
        <StaggerItem>
          <MetricCard title="p50 Latency"     value={m ? fmtMs(m.p50_attempt_duration_ms) : null} animate={false} icon={Clock}   accent="indigo"  sub="median attempt" />
        </StaggerItem>
        <StaggerItem>
          <MetricCard title="p95 Latency"     value={m ? fmtMs(m.p95_attempt_duration_ms) : null} animate={false} icon={Zap}     accent="yellow"  sub="95th percentile" />
        </StaggerItem>
      </Stagger>

      {/* ── charts row ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">

        {/* area sparkline */}
        <FadeIn delay={0.1} className="lg:col-span-4 card p-0 overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between"
            style={{ borderBottom: "1px solid #1a2640" }}>
            <div>
              <p className="text-[13px] font-semibold text-white">Event Volume</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Live rolling window</p>
            </div>
            {m && (
              <div className="text-right">
                <p className="text-[11px] text-slate-500">success rate</p>
                <p className="text-[15px] font-bold text-emerald-400 mono">{successRate.toFixed(1)}%</p>
              </div>
            )}
          </div>
          <div className="px-4 pt-4 pb-2">
            {history.current.length < 2 ? (
              <div className="h-48 flex items-center justify-center">
                <div className="text-center">
                  <div className="skeleton w-full h-48 rounded-lg" style={{ width: "100%", height: 192 }} />
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={192}>
                <AreaChart data={history.current} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"  stopColor={C.succeeded} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={C.succeeded} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gD" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"  stopColor={C.dead} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={C.dead} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"  stopColor={C.retrying} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={C.retrying} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke="#1a2640" vertical={false} />
                  <XAxis dataKey="t" tick={{ fontSize: 10, fill: "#334155" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: "#334155" }} tickLine={false} axisLine={false} />
                  <Tooltip {...TT} />
                  <Area type="monotone" dataKey="succeeded" name="Succeeded" stroke={C.succeeded} fill="url(#gS)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="dead"      name="Dead-lettered" stroke={C.dead}  fill="url(#gD)" strokeWidth={1.5} dot={false} />
                  <Area type="monotone" dataKey="retrying"  name="Retrying" stroke={C.retrying}   fill="url(#gR)" strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </FadeIn>

        {/* donut */}
        <FadeIn delay={0.15} className="lg:col-span-3 card p-0 overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: "1px solid #1a2640" }}>
            <p className="text-[13px] font-semibold text-white">Status Distribution</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Current breakdown</p>
          </div>
          <div className="px-4 py-4">
            {pie.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center gap-3">
                {m === null ? (
                  <><Skeleton className="w-32 h-32 rounded-full" /><Skeleton className="w-24 h-3 mt-2" /></>
                ) : (
                  <p className="text-slate-600 text-sm">No data yet</p>
                )}
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={pie} cx="50%" cy="50%" innerRadius={50} outerRadius={72}
                      dataKey="value" paddingAngle={2} strokeWidth={0}
                      label={({ cx, cy }) => <DonutLabel cx={cx} cy={cy} total={m?.total_events ?? 0} />}
                      labelLine={false}
                    >
                      {pie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={TT.contentStyle} labelStyle={TT.labelStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {pie.map(s => (
                    <div key={s.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                        <span className="text-[12px] text-slate-400">{s.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: "#1a2640" }}>
                          <motion.div className="h-full rounded-full"
                            style={{ background: s.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.round((s.value / (m?.total_events || 1)) * 100)}%` }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                          />
                        </div>
                        <span className="text-[12px] font-semibold text-white tabular-nums mono w-12 text-right">
                          {s.value.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </FadeIn>
      </div>

      {/* ── stacked bar ───────────────────────────────────── */}
      {bar.length > 0 && (
        <FadeIn delay={0.2} className="card p-0 overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #1a2640" }}>
            <div>
              <p className="text-[13px] font-semibold text-white">Workflow Outcomes</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Recent {bar.length} workflows — stacked by result</p>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-slate-500">
              {[["Succeeded", C.succeeded], ["Dead-lettered", C.dead], ["In Flight", C.queued]].map(([l, c]) => (
                <div key={l as string} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm" style={{ background: c as string }} />
                  {l}
                </div>
              ))}
            </div>
          </div>
          <div className="px-5 py-4">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={bar} margin={{ top: 0, right: 0, left: -28, bottom: 0 }} barSize={18} barGap={2}>
                <CartesianGrid strokeDasharray="2 4" stroke="#1a2640" vertical={false} />
                <XAxis dataKey="id" tick={{ fontSize: 10, fill: "#334155", fontFamily: "monospace" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#334155" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<BarTip />} />
                <Bar dataKey="ok"  name="Succeeded"    stackId="a" fill={C.succeeded} radius={[0,0,0,0]} />
                <Bar dataKey="dlq" name="Dead-lettered" stackId="a" fill={C.dead}     radius={[0,0,0,0]} />
                <Bar dataKey="fly" name="In Flight"     stackId="a" fill={C.queued}   radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </FadeIn>
      )}

      {/* ── workflows table ───────────────────────────────── */}
      <FadeIn delay={0.25} className="card overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #1a2640" }}>
          <div>
            <p className="text-[13px] font-semibold text-white">Recent Workflows</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Click any row to inspect the full timeline</p>
          </div>
          {wf && <span className="text-[12px] text-slate-600">{wf.length} loaded</span>}
        </div>

        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid #1a2640", background: "rgba(255,255,255,0.01)" }}>
              {["Workflow ID", "Events", "Succeeded", "Dead-lettered", "In Flight", "Status", "Updated"].map(h => (
                <th key={h} className="th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!wf ? (
              [...Array(6)].map((_, i) => (
                <tr key={i} className="tr">
                  {[...Array(7)].map((_, j) => (
                    <td key={j} className="td"><Skeleton className="h-4 w-full" /></td>
                  ))}
                </tr>
              ))
            ) : wf.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-slate-600 text-[13px]">
                  No workflows yet — click <strong className="text-slate-400">Generate Workload</strong> to start.
                </td>
              </tr>
            ) : (
              wf.map((w, i) => (
                <motion.tr key={w.workflow_id}
                  className="tr-hover"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.015, duration: 0.25 }}
                >
                  <td className="td pl-4">
                    <Link to={`/workflows/${w.workflow_id}`}
                      className="flex items-center gap-1.5 group text-[12px] font-medium mono text-indigo-400 hover:text-indigo-300 transition-colors">
                      {w.workflow_id}
                      <ArrowUpRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </td>
                  <td className="td tabular-nums mono text-[12px]">{w.total_events}</td>
                  <td className="td tabular-nums mono text-[12px] text-emerald-400">{w.succeeded}</td>
                  <td className="td tabular-nums mono text-[12px]">
                    {w.dead_lettered > 0
                      ? <span className="text-rose-400 font-semibold">{w.dead_lettered}</span>
                      : <span className="text-slate-700">—</span>
                    }
                  </td>
                  <td className="td tabular-nums mono text-[12px]">
                    {w.in_flight > 0
                      ? <span className="text-amber-400">{w.in_flight}</span>
                      : <span className="text-slate-700">—</span>
                    }
                  </td>
                  <td className="td">
                    <EventStatusBadge status={
                      w.has_failures ? "dead_lettered" :
                      w.in_flight > 0 ? "processing" : "succeeded"
                    } />
                  </td>
                  <td className="td text-slate-600 text-[11px]">{timeAgo(w.last_updated_at)}</td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </FadeIn>
    </div>
  );
}
