import { useCallback, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { ArrowLeft, Bot, CheckCircle2, Clock, RefreshCw, Skull, Zap } from "lucide-react";
import { api } from "../api/client";
import { WorkflowTimeline } from "../components/WorkflowTimeline";
import { FadeIn, Stagger, StaggerItem, Skeleton } from "../components/Animated";
import { usePolling } from "../hooks/usePolling";
import type { IncidentSummaryOut } from "../types";

const fmtMs = (ms: number | null) => ms == null ? "–" : ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;

const STATUS_COLOR: Record<string, string> = {
  succeeded: "#10b981", dead_lettered: "#f43f5e", retrying: "#f97316",
  processing: "#eab308", queued: "#6366f1", failed: "#ef4444",
};

const TT = {
  contentStyle: { background: "#0d1525", border: "1px solid #1a2640", borderRadius: 10, fontSize: 12, padding: "10px 14px" },
  labelStyle: { color: "#64748b", marginBottom: 4 },
  itemStyle: { color: "#e2e8f0" },
};

export default function WorkflowDetail() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const loader = useCallback(() => api.getWorkflowTimeline(workflowId!), [workflowId]);
  const { data, loading, error } = usePolling(loader, 8000);

  const [summary, setSummary] = useState<IncidentSummaryOut | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [sumErr, setSumErr] = useState<string | null>(null);

  const handleSummarize = async () => {
    setSummarizing(true); setSumErr(null);
    try { setSummary(await api.summarizeIncident(workflowId!)); }
    catch { setSumErr("Summarization failed"); }
    finally { setSummarizing(false); }
  };

  if (loading) return (
    <div className="px-6 pt-6 space-y-5">
      <Skeleton className="h-6 w-48" />
      <div className="grid grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      <Skeleton className="h-64" />
    </div>
  );
  if (error) return (
    <div className="px-6 pt-6">
      <p className="text-rose-400 text-sm">{error}</p>
    </div>
  );
  if (!data) return null;

  const events = data.events;
  const total = events.length;
  const succeeded = events.filter(e => e.status === "succeeded").length;
  const dead = events.filter(e => e.status === "dead_lettered").length;
  const totalAttempts = events.reduce((s, e) => s + e.attempt_count, 0);
  const allDurations = events.flatMap(e => e.attempts).map(a => a.duration_ms ?? 0);
  const totalMs = allDurations.reduce((s, d) => s + d, 0);

  const barData = events.map(ev => ({
    step: ev.event_type.split(".")[1] ?? ev.event_type,
    attempts: Math.max(ev.attempt_count, 1),
    status: ev.status,
  }));

  const successPct = total > 0 ? (succeeded / total) * 100 : 0;

  return (
    <div className="px-6 pt-6 pb-10 space-y-5">

      {/* header */}
      <FadeIn>
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link to="/" className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-[12px] mb-2.5 transition-colors w-fit">
              <ArrowLeft size={12} /> Overview
            </Link>
            <h1 className="text-lg font-semibold text-white mono">{data.workflow_id}</h1>
            <p className="text-slate-500 text-[12px] mt-1">{total} events · {totalAttempts} total attempts</p>
          </div>
          <button className="btn-secondary" onClick={handleSummarize} disabled={summarizing}>
            {summarizing ? <RefreshCw size={13} className="animate-spin" /> : <Bot size={13} />}
            {summarizing ? "Analysing…" : "AI Summary"}
          </button>
        </div>
      </FadeIn>

      {/* AI summary */}
      {(summary || sumErr) && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="card overflow-hidden"
          style={summary ? { border: "1px solid rgba(168,85,247,0.25)", background: "rgba(168,85,247,0.04)" } : {}}
        >
          <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(168,85,247,0.12)" }}>
            <Bot size={13} className="text-purple-400" />
            <p className="text-[12px] font-semibold text-white">Incident Analysis</p>
            {summary && <span className="text-[11px] text-slate-600 ml-1">· {summary.model_name ?? "template"}</span>}
          </div>
          <div className="px-5 py-4">
            <p className={`text-[13px] leading-relaxed ${sumErr ? "text-rose-400" : "text-slate-300"}`}>
              {sumErr ?? summary?.summary_text}
            </p>
          </div>
        </motion.div>
      )}

      {/* stat row */}
      <Stagger className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Succeeded", value: `${succeeded}/${total}`, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Dead-lettered", value: dead, icon: Skull, color: "text-rose-400" },
          { label: "Total Attempts", value: totalAttempts, icon: Zap, color: "text-orange-400" },
          { label: "Total Duration", value: fmtMs(totalMs || null), icon: Clock, color: "text-indigo-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <StaggerItem key={label}>
            <div className="card p-4 flex items-center gap-3">
              <div className={`${color} shrink-0 opacity-80`}><Icon size={18} strokeWidth={1.75} /></div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
                <p className={`text-xl font-bold mono ${color}`}>{value}</p>
              </div>
            </div>
          </StaggerItem>
        ))}
      </Stagger>

      {/* charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* success arc */}
        <FadeIn delay={0.1} className="lg:col-span-2 card p-0 overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: "1px solid #1a2640" }}>
            <p className="text-[13px] font-semibold text-white">Success Rate</p>
          </div>
          <div className="p-6 flex flex-col items-center justify-center gap-4">
            {/* circular progress via SVG */}
            <div className="relative w-36 h-36">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="38" fill="none" stroke="#1a2640" strokeWidth="10" />
                <motion.circle
                  cx="50" cy="50" r="38" fill="none"
                  stroke={successPct > 80 ? "#10b981" : successPct > 50 ? "#f97316" : "#f43f5e"}
                  strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 38}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 38 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 38 * (1 - successPct / 100) }}
                  transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                  style={{ filter: `drop-shadow(0 0 6px ${successPct > 80 ? "#10b981" : "#f97316"}40)` }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.p className="text-2xl font-bold text-white mono"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                  {successPct.toFixed(0)}%
                </motion.p>
                <p className="text-[10px] text-slate-500">success</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full">
              {[
                { label: "succeeded", val: succeeded, color: "#10b981" },
                { label: "failed",    val: dead,      color: "#f43f5e" },
              ].map(({ label, val, color }) => (
                <div key={label} className="text-center p-2 rounded-lg" style={{ background: "#0d1525" }}>
                  <p className="text-lg font-bold mono" style={{ color }}>{val}</p>
                  <p className="text-[10px] text-slate-600">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>

        {/* attempts per step */}
        <FadeIn delay={0.15} className="lg:col-span-3 card p-0 overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: "1px solid #1a2640" }}>
            <p className="text-[13px] font-semibold text-white">Attempts per Step</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Higher bars = more retries needed</p>
          </div>
          <div className="px-4 py-4">
            <ResponsiveContainer width="100%" height={168}>
              <BarChart data={barData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }} barSize={32}>
                <CartesianGrid strokeDasharray="2 4" stroke="#1a2640" vertical={false} />
                <XAxis dataKey="step" tick={{ fontSize: 10, fill: "#334155" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#334155" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip {...TT} />
                <Bar dataKey="attempts" name="Attempts" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLOR[entry.status] ?? "#6366f1"}
                      style={{ filter: `drop-shadow(0 0 4px ${STATUS_COLOR[entry.status] ?? "#6366f1"}40)` }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </FadeIn>
      </div>

      {/* timeline */}
      <FadeIn delay={0.2} className="card p-0 overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #1a2640" }}>
          <p className="text-[13px] font-semibold text-white">Event Timeline</p>
          <p className="text-[11px] text-slate-500">Click events to expand attempt history</p>
        </div>
        <div className="p-5">
          <WorkflowTimeline events={events} />
        </div>
      </FadeIn>
    </div>
  );
}
