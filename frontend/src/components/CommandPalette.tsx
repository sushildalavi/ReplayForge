import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, LayoutDashboard, RefreshCw, Server, Skull, Zap } from "lucide-react";
import { api } from "../api/client";
import { toast } from "sonner";

type Item = { id: string; label: string; sub?: string; icon: React.ReactNode; action: () => void };

const STATIC: Item[] = [
  { id:"dash",    label:"Dashboard",    sub:"Overview and metrics",     icon:<LayoutDashboard size={14}/>, action:()=>{} },
  { id:"dlq",     label:"Dead Letters", sub:"Review failed events",     icon:<Skull size={14}/>, action:()=>{} },
  { id:"workers", label:"Workers",      sub:"Heartbeat monitor",        icon:<Server size={14}/>, action:()=>{} },
];

interface Props { open: boolean; onClose: () => void; }

export function CommandPalette({ open, onClose }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [generating, setGenerating] = useState(false);

  const items: Item[] = [
    { id:"dash",    label:"Dashboard",             sub:"Overview and live metrics",   icon:<LayoutDashboard size={14} style={{ color:"#818cf8" }}/>, action: () => { navigate("/"); onClose(); } },
    { id:"dlq",     label:"Dead Letter Queue",     sub:"Review and replay failures",  icon:<Skull size={14} style={{ color:"#f43f5e" }}/>, action: () => { navigate("/deadletters"); onClose(); } },
    { id:"workers", label:"Worker Health",         sub:"Heartbeat status",            icon:<Server size={14} style={{ color:"#34d399" }}/>, action: () => { navigate("/workers"); onClose(); } },
    { id:"gen",     label:"Generate Workload",     sub:"30 synthetic checkout flows", icon:<Zap size={14} style={{ color:"#f59e0b" }}/>,
      action: async () => {
        onClose();
        setGenerating(true);
        try {
          const r = await api.generateWorkload(30);
          toast.success("Workload generated", { description: `${r.events_sent} events queued` });
        } catch { toast.error("Generation failed"); }
        finally { setGenerating(false); }
      }
    },
    { id:"alerts",  label:"Dead Letters",          sub:"Events exhausting all retries", icon:<AlertTriangle size={14} style={{ color:"#f97316" }}/>, action: () => { navigate("/deadletters"); onClose(); } },
    { id:"replay",  label:"Refresh",               sub:"Reload all data",             icon:<RefreshCw size={14} style={{ color:"#64748b" }}/>, action: () => { window.location.reload(); } },
  ];

  const filtered = query.trim()
    ? items.filter(i => i.label.toLowerCase().includes(query.toLowerCase()) || i.sub?.toLowerCase().includes(query.toLowerCase()))
    : items;

  useEffect(() => { setSelected(0); }, [query]);

  useEffect(() => {
    if (!open) { setQuery(""); return; }
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s+1, filtered.length-1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setSelected(s => Math.max(s-1, 0)); }
      if (e.key === "Enter") { e.preventDefault(); filtered[selected]?.action(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, filtered, selected]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* backdrop */}
          <motion.div
            className="fixed inset-0 z-50"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />
          {/* palette */}
          <motion.div
            className="fixed z-50 w-[520px] overflow-hidden"
            style={{
              top: "18%", left: "50%", transform: "translateX(-50%)",
              background: "#0b1120",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 14,
              boxShadow: "0 40px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(99,102,241,0.1)",
            }}
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.21,0.47,0.32,0.98] }}
          >
            {/* search input */}
            <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <Zap size={14} style={{ color: "#6366f1", flexShrink: 0 }} />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search pages, actions…"
                className="flex-1 bg-transparent outline-none text-[14px] text-white placeholder:text-slate-600"
              />
              <div className="flex items-center gap-1">
                <span className="kbd">esc</span>
              </div>
            </div>

            {/* results */}
            <div className="py-1.5 max-h-72 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-4 py-8 text-center text-[13px]" style={{ color: "#334155" }}>No results</div>
              ) : (
                filtered.map((item, i) => (
                  <motion.button
                    key={item.id}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                    style={{ background: i === selected ? "rgba(99,102,241,0.1)" : "transparent" }}
                    onClick={item.action}
                    onMouseEnter={() => setSelected(i)}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span style={{ color: "#475569", flexShrink: 0 }}>{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-white">{item.label}</p>
                      {item.sub && <p className="text-[11px] mt-0.5" style={{ color: "#475569" }}>{item.sub}</p>}
                    </div>
                    {i === selected && (
                      <span className="kbd shrink-0">↵</span>
                    )}
                  </motion.button>
                ))
              )}
            </div>

            {/* footer */}
            <div className="px-4 py-2.5 flex items-center gap-4 text-[11px]" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", color: "#334155" }}>
              <span className="flex items-center gap-1"><span className="kbd">↑↓</span> navigate</span>
              <span className="flex items-center gap-1"><span className="kbd">↵</span> select</span>
              <span className="flex items-center gap-1"><span className="kbd">esc</span> close</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
