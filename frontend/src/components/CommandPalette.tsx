import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, LayoutDashboard, RefreshCw, Server, Skull, Zap } from "lucide-react";
import { api } from "../api/client";
import { toast } from "sonner";

type Item = { id:string; label:string; sub?:string; icon:React.ReactNode; action:()=>void };

/* animation #9 — command palette spring + animation #20 — item layoutId pill */
export function CommandPalette({ open, onClose }: { open:boolean; onClose:()=>void }) {
  const nav = useNavigate();
  const [q, setQ]   = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items: Item[] = [
    { id:"dash",    label:"Dashboard",       sub:"Overview and live metrics",  icon:<LayoutDashboard size={14} style={{color:"#818cf8"}} />, action:()=>{nav("/");onClose()} },
    { id:"dlq",     label:"Dead Letters",    sub:"Review and replay failures", icon:<Skull size={14} style={{color:"#f43f5e"}} />,          action:()=>{nav("/deadletters");onClose()} },
    { id:"workers", label:"Workers",         sub:"Heartbeat and fleet status", icon:<Server size={14} style={{color:"#34d399"}} />,         action:()=>{nav("/workers");onClose()} },
    { id:"gen",     label:"Generate Workload", sub:"30 synthetic checkout workflows", icon:<Zap size={14} style={{color:"#f59e0b"}} />,
      action:async()=>{ onClose(); try{ const r=await api.generateWorkload(30); toast.success("Workload generated",{description:`${r.events_sent} events queued`}) }catch{ toast.error("Generation failed") } } },
    { id:"reload",  label:"Reload page",     sub:"Hard refresh all data",      icon:<RefreshCw size={14} style={{color:"#64748b"}} />,      action:()=>window.location.reload() },
    { id:"alert",   label:"Dead Letters",    sub:"Events exhausting all retries",icon:<AlertTriangle size={14} style={{color:"#f97316"}} />,action:()=>{nav("/deadletters");onClose()} },
  ];

  const filtered = q.trim()
    ? items.filter(i => i.label.toLowerCase().includes(q.toLowerCase()) || i.sub?.toLowerCase().includes(q.toLowerCase()))
    : items;

  useEffect(()=>{ setSel(0) }, [q]);
  useEffect(()=>{
    if(!open){ setQ(""); return; }
    const t = setTimeout(()=>inputRef.current?.focus(), 60);
    return ()=>clearTimeout(t);
  }, [open]);
  useEffect(()=>{
    if(!open) return;
    const h = (e:KeyboardEvent) => {
      if(e.key==="Escape") onClose();
      if(e.key==="ArrowDown"){ e.preventDefault(); setSel(s=>Math.min(s+1,filtered.length-1)) }
      if(e.key==="ArrowUp"  ){ e.preventDefault(); setSel(s=>Math.max(s-1,0)) }
      if(e.key==="Enter"    ){ e.preventDefault(); filtered[sel]?.action() }
    };
    window.addEventListener("keydown",h);
    return ()=>window.removeEventListener("keydown",h);
  }, [open,filtered,sel,onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-50"
            style={{ background:"rgba(0,0,0,.75)", backdropFilter:"blur(8px)" }}
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            transition={{duration:.16}} onClick={onClose} />

          {/* animation #9 — spring entrance */}
          <motion.div className="fixed z-50"
            style={{ top:"18%", left:"50%", width:520, maxWidth:"calc(100vw - 32px)",
              x:"-50%", background:"rgba(8,14,28,.98)",
              border:"1px solid rgba(255,255,255,.12)", borderRadius:14,
              boxShadow:"0 0 0 1px rgba(99,102,241,.08),0 32px 64px rgba(0,0,0,.9),0 8px 24px rgba(99,102,241,.06)",
              backdropFilter:"blur(24px)", overflow:"hidden" }}
            initial={{ opacity:0, y:-14, scale:.94, filter:"blur(4px)" }}
            animate={{ opacity:1, y:0,   scale:1,   filter:"blur(0px)" }}
            exit={{    opacity:0, y:-8,  scale:.97,  filter:"blur(2px)" }}
            transition={{ duration:.2, ease:[0.21,0.47,0.32,0.98] }}>

            <div className="flex items-center gap-3 px-4 py-3.5"
              style={{ borderBottom:"1px solid rgba(255,255,255,.07)" }}>
              <Zap size={14} style={{color:"#6366f1",flexShrink:0}} />
              <input ref={inputRef} value={q} onChange={e=>setQ(e.target.value)}
                placeholder="Search pages, actions…"
                className="flex-1 bg-transparent outline-none"
                style={{ fontSize:14, color:"#e2e8f0", fontFamily:"inherit" }} />
              <kbd className="kbd">esc</kbd>
            </div>

            <LayoutGroup>
              <div className="py-1.5 overflow-y-auto" style={{ maxHeight:280, scrollbarWidth:"none" }}>
                {filtered.length === 0 ? (
                  <div className="px-4 py-10 text-center" style={{color:"#334155",fontSize:13}}>
                    No results for "{q}"
                  </div>
                ) : filtered.map((item,i)=>(
                  <motion.button key={item.id}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left relative"
                    onClick={item.action}
                    onMouseEnter={()=>setSel(i)}
                    whileTap={{scale:.98}}
                    style={{ background:"transparent", border:"none", cursor:"pointer" }}>
                    {/* animation #20 — sliding background pill */}
                    {i===sel && (
                      <motion.div layoutId="cmd-pill"
                        className="absolute inset-x-1.5 inset-y-0.5 rounded-lg"
                        style={{ background:"rgba(99,102,241,.12)" }}
                        transition={{ duration:.18, ease:[0.21,0.47,0.32,0.98] }} />
                    )}
                    <span className="relative z-10 flex shrink-0" style={{color:"#475569"}}>{item.icon}</span>
                    <div className="relative z-10 flex-1 min-w-0 text-left">
                      <p style={{fontSize:13,fontWeight:500,color:"#fff"}}>{item.label}</p>
                      {item.sub && <p style={{fontSize:11,color:"#475569",marginTop:1}}>{item.sub}</p>}
                    </div>
                    {i===sel && <kbd className="kbd relative z-10 shrink-0">↵</kbd>}
                  </motion.button>
                ))}
              </div>
            </LayoutGroup>

            <div className="px-4 py-2.5 flex items-center gap-4 text-[11px]"
              style={{ borderTop:"1px solid rgba(255,255,255,.05)", color:"#334155" }}>
              <span className="flex items-center gap-1"><kbd className="kbd">↑↓</kbd> navigate</span>
              <span className="flex items-center gap-1"><kbd className="kbd">↵</kbd> select</span>
              <span className="flex items-center gap-1"><kbd className="kbd">esc</kbd> close</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
