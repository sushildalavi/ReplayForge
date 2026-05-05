import { useCallback } from "react";
import { motion } from "framer-motion";
import { ExternalLink, RefreshCw, Skull, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { FadeIn, Stagger, StaggerItem, Skeleton } from "../components/Animated";
import { useState } from "react";
import type { DeadLetterOut } from "../types";

const ago = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
};
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

function DLQRow({ dl, onReplayed }: { dl: DeadLetterOut; onReplayed: () => void }) {
  const [state, setState] = useState<"idle" | "replaying" | "done">("idle");
  const [err, setErr] = useState(false);

  const alreadyReplayed = !!dl.replayed_at || state === "done";

  const replay = async () => {
    if (state !== "idle" || alreadyReplayed) return;
    setState("replaying");
    try { await api.replayDeadLetter(dl.id); setState("done"); onReplayed(); }
    catch { setErr(true); setState("idle"); }
  };

  return (
    <motion.tr
      className="tr-hover"
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <td className="td pl-4">
        <div className="flex items-center gap-2">
          <span className="mono text-[12px] font-semibold text-white">{dl.event_type}</span>
        </div>
      </td>
      <td className="td">
        <Link to={`/workflows/${dl.workflow_id}`}
          className="flex items-center gap-1 group mono text-[12px] text-indigo-400 hover:text-indigo-300 transition-colors">
          {dl.workflow_id.slice(0, 22)}
          <ExternalLink size={9} className="opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
      </td>
      <td className="td text-slate-500 text-[12px]">{dl.service_name}</td>
      <td className="td max-w-[240px]">
        {dl.last_error
          ? <span className="mono text-[11px] text-rose-400 truncate block" title={dl.last_error}>{dl.last_error}</span>
          : <span className="text-slate-700">—</span>
        }
      </td>
      <td className="td text-slate-500 text-[11px]" title={fmtDate(dl.created_at)}>{ago(dl.created_at)}</td>
      <td className="td">
        {alreadyReplayed
          ? <span className="badge bg-purple-950/60 text-purple-400 border border-purple-800/30">replayed</span>
          : <span className="badge bg-rose-950/60 text-rose-400 border border-rose-800/30">dead</span>
        }
      </td>
      <td className="td pr-4">
        {alreadyReplayed ? (
          <span className="text-[11px] text-slate-600">
            {dl.replayed_at ? ago(dl.replayed_at) : "just now"}
          </span>
        ) : (
          <motion.button
            className="btn-replay"
            onClick={replay}
            disabled={state === "replaying"}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            <RefreshCw size={10} className={state === "replaying" ? "animate-spin" : ""} />
            {state === "replaying" ? "Replaying…" : "Replay"}
          </motion.button>
        )}
        {err && <span className="text-rose-500 text-[10px] block mt-1">failed</span>}
      </td>
    </motion.tr>
  );
}

export default function DeadLetters() {
  const loader = useCallback(() => api.listDeadLetters(100), []);
  const { data, loading, error, refresh } = usePolling(loader, 5000);

  const pending  = (data ?? []).filter(d => !d.replayed_at).length;
  const replayed = (data ?? []).filter(d => !!d.replayed_at).length;

  return (
    <div className="px-6 pt-6 pb-10 space-y-5">

      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white flex items-center gap-2">
              <Skull size={18} className="text-rose-500" /> Dead Letter Queue
            </h1>
            <p className="text-slate-500 text-[13px] mt-0.5">Events that exhausted all retry attempts</p>
          </div>
        </div>
      </FadeIn>

      {/* stats */}
      {data && data.length > 0 && (
        <Stagger className="grid grid-cols-3 gap-3">
          {[
            { label: "Total",    value: data.length, color: "text-white" },
            { label: "Pending",  value: pending,     color: "text-rose-400" },
            { label: "Replayed", value: replayed,    color: "text-purple-400" },
          ].map(({ label, value, color }) => (
            <StaggerItem key={label}>
              <div className="card p-4 text-center">
                <p className={`text-2xl font-bold mono ${color}`}>{value}</p>
                <p className="text-[11px] text-slate-500 mt-1">{label}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg text-rose-400 text-[13px]"
          style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)" }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <FadeIn delay={0.1} className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid #1a2640", background: "rgba(255,255,255,0.01)" }}>
              {["Event Type", "Workflow", "Service", "Last Error", "Age", "Status", "Action"].map(h => (
                <th key={h} className="th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && !data ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="tr">
                  {[...Array(7)].map((_, j) => (
                    <td key={j} className="td"><Skeleton className="h-4 w-full" /></td>
                  ))}
                </tr>
              ))
            ) : data?.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Skull size={32} className="text-slate-800" />
                    <p className="text-slate-600 text-[13px]">No dead letters yet</p>
                    <p className="text-slate-700 text-[12px]">Events exhausting all retries will appear here</p>
                  </div>
                </td>
              </tr>
            ) : (
              data!.map(dl => <DLQRow key={dl.id} dl={dl} onReplayed={refresh} />)
            )}
          </tbody>
        </table>
      </FadeIn>
    </div>
  );
}
