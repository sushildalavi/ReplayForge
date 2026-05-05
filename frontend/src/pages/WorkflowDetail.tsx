import { useCallback, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ArrowLeft, Bot, CheckCircle2, ChevronDown, Clock, RefreshCw, Skull, User, Zap } from "lucide-react";
import { toast } from "sonner";
import { api } from "../api/client";
import { EventStatusBadge } from "../components/EventStatusBadge";
import { FadeIn, Stagger, StaggerItem, Skeleton } from "../components/Animated";
import { usePolling } from "../hooks/usePolling";
import type { IncidentSummaryOut, WorkflowTimelineEventOut } from "../types";

const fmtMs = (v:number|null) => v==null?"–":v<1000?`${Math.round(v)}ms`:`${(v/1000).toFixed(2)}s`;
const fmtT  = (iso:string) => new Date(iso).toLocaleTimeString("en",{hour12:false});
const EASE  = [0.21,0.47,0.32,0.98] as const;

const DOT: Record<string,string> = {
  succeeded:"#10b981",failed:"#ef4444",retrying:"#f97316",
  dead_lettered:"#f43f5e",processing:"#eab308",queued:"#6366f1",
};

const TT = {
  contentStyle:{ background:"#0b1120", border:"1px solid rgba(255,255,255,.08)", borderRadius:8, fontSize:12, padding:"10px 14px" },
  labelStyle:{ color:"#475569", fontSize:11, marginBottom:4 },
};

/* ── timeline event — animations #3 #22 #30 ─────────── */
function TimelineEvent({ ev, idx, isLast }: { ev:WorkflowTimelineEventOut; idx:number; isLast:boolean }) {
  const [open, setOpen] = useState(false);
  const color   = DOT[ev.status] ?? "#475569";
  const totalMs = ev.attempts.reduce((s,a)=>s+(a.duration_ms??0),0);

  return (
    <motion.div className="flex gap-4"
      initial={{opacity:0,x:-14}} animate={{opacity:1,x:0}}
      transition={{delay:idx*.045,duration:.3,ease:EASE}}>

      {/* rail */}
      <div className="flex flex-col items-center w-5 shrink-0 pt-[18px]">
        {/* animation #3 — spring scale pop */}
        <motion.div className="rounded-full shrink-0"
          style={{width:10,height:10,background:color,boxShadow:`0 0 10px ${color}55`}}
          initial={{scale:0}} animate={{scale:1}}
          transition={{delay:idx*.045+.1,type:"spring",stiffness:450,damping:18}} />
        {!isLast && (
          <div className="w-px flex-1 mt-1"
            style={{background:`linear-gradient(180deg,${color}45 0%,rgba(255,255,255,.02) 100%)`,minHeight:20}} />
        )}
      </div>

      {/* card */}
      <div className="flex-1 mb-3">
        <motion.div className="card overflow-hidden"
          animate={{borderColor:open?`${color}30`:"rgba(255,255,255,.08)"}}
          transition={{duration:.15}}>

          <div className={"flex items-center gap-3 px-4 py-3 " + (ev.attempts.length?"cursor-pointer":"")}
            style={{transition:"background .1s ease"}}
            onClick={()=>ev.attempts.length&&setOpen(!open)}
            onMouseEnter={e=>{if(ev.attempts.length)(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,.018)"}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="transparent"}}>
            <div className="flex-1 flex items-center gap-2.5 min-w-0">
              <span className="mono text-[13px] font-semibold text-white truncate" style={{letterSpacing:"-.01em"}}>{ev.event_type}</span>
              <EventStatusBadge status={ev.status} />
              <span className="text-[11px] hidden sm:block" style={{color:"#334155"}}>{ev.service_name}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {ev.attempt_count>1 && <span className="text-[11px] font-semibold" style={{color:"#f97316"}}>×{ev.attempt_count}</span>}
              {totalMs>0 && <span className="mono text-[11px] flex items-center gap-1" style={{color:"#334155"}}><Clock size={9}/>{fmtMs(totalMs)}</span>}
              <span className="mono text-[11px]" style={{color:"#1e2d3d"}}>{fmtT(ev.created_at)}</span>
              {ev.attempts.length>0 && (
                <motion.span animate={{rotate:open?180:0}} transition={{duration:.18}}>
                  <ChevronDown size={12} style={{color:"#334155"}} />
                </motion.span>
              )}
            </div>
          </div>

          {ev.last_error && (
            <div className="px-4 py-2" style={{background:"rgba(244,63,94,.04)",borderTop:"1px solid rgba(244,63,94,.1)"}}>
              <p className="mono text-[11px] truncate" style={{color:"#fb7185"}}>{ev.last_error}</p>
            </div>
          )}

          {/* animation #4 — attempt rows stagger */}
          <AnimatePresence>
            {open && (
              <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}}
                exit={{height:0,opacity:0}} transition={{duration:.22,ease:"easeInOut"}}
                style={{overflow:"hidden",borderTop:"1px solid rgba(255,255,255,.05)"}}>
                <div className="px-4 py-2" style={{background:"rgba(255,255,255,.01)"}}>
                  <p className="text-[10px] font-bold uppercase tracking-[.08em]" style={{color:"#1e2d3d"}}>Attempt Log</p>
                </div>
                <table className="w-full">
                  <thead>
                    <tr style={{borderBottom:"1px solid rgba(255,255,255,.04)"}}>
                      {["#","Status","Duration","Worker","Started","Error"].map(h=><th key={h} className="th py-2">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {ev.attempts.map((a,ai)=>(
                      <motion.tr key={a.id} className="tr"
                        initial={{opacity:0}} animate={{opacity:1}}
                        transition={{delay:ai*.04}}>
                        <td className="td pl-4 mono text-[11px]" style={{color:"#475569"}}>{a.attempt_number}</td>
                        <td className="td"><EventStatusBadge status={a.status} /></td>
                        <td className="td mono text-[12px]">{fmtMs(a.duration_ms)}</td>
                        <td className="td"><span className="flex items-center gap-1 text-[11px]" style={{color:"#475569"}}><User size={9}/>{a.worker_name??"–"}</span></td>
                        <td className="td mono text-[11px]" style={{color:"#475569"}}>{fmtT(a.started_at)}</td>
                        <td className="td pr-4 max-w-[200px]">
                          {a.error_message ? <span className="mono text-[11px] truncate block" style={{color:"#fb7185"}}>{a.error_message}</span> : <span style={{color:"#1e2d3d"}}>—</span>}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default function WorkflowDetail() {
  const { wfId } = useParams<{wfId:string}>();
  const loader   = useCallback(()=>api.getWorkflowTimeline(wfId!),[wfId]);
  const { data, loading, error } = usePolling(loader,8000);
  const [summary, setSummary] = useState<IncidentSummaryOut|null>(null);
  const [summarizing, setSummarizing] = useState(false);

  const summarize = async () => {
    setSummarizing(true);
    try { setSummary(await api.summarizeIncident(wfId!)) }
    catch { toast.error("Summarization failed") }
    finally { setSummarizing(false) }
  };

  if(loading) return (
    <div className="page-wrap space-y-4">
      <Skeleton className="h-5 w-40"/><Skeleton className="h-4 w-60"/>
      <div className="grid grid-cols-4 gap-3">{[...Array(4)].map((_,i)=><Skeleton key={i} className="h-20"/>)}</div>
      <Skeleton className="h-72"/>
    </div>
  );
  if(error) return <div className="page-wrap text-rose-400 text-[13px]">{error}</div>;
  if(!data)  return null;

  const events    = data.events;
  const total     = events.length;
  const succeeded = events.filter(e=>e.status==="succeeded").length;
  const dead      = events.filter(e=>e.status==="dead_lettered").length;
  const totalAttempts = events.reduce((s,e)=>s+e.attempt_count,0);
  const totalMs   = events.flatMap(e=>e.attempts).reduce((s,a)=>s+(a.duration_ms??0),0);
  const successPct = total>0?(succeeded/total)*100:0;

  const barData = events.map(ev=>({
    step: ev.event_type.split(".").pop()??ev.event_type,
    attempts: Math.max(ev.attempt_count,1),
    status: ev.status,
  }));

  return (
    <div className="page-wrap space-y-5">

      <FadeIn>
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link to="/" className="flex items-center gap-1 text-[12px] mb-2.5 transition-colors"
              style={{color:"#334155",textDecoration:"none"}}
              onMouseEnter={e=>((e.currentTarget as HTMLElement).style.color="#94a3b8")}
              onMouseLeave={e=>((e.currentTarget as HTMLElement).style.color="#334155")}>
              <ArrowLeft size={12}/> Overview
            </Link>
            <h1 className="mono text-white" style={{fontSize:17,fontWeight:600,letterSpacing:"-.01em"}}>{data.workflow_id}</h1>
            <p className="text-[12px] mt-0.5" style={{color:"#334155"}}>{total} events · {totalAttempts} attempts</p>
          </div>
          <motion.button className="btn-ghost" onClick={summarize} disabled={summarizing}
            whileTap={{scale:.95}}>
            {summarizing ? <RefreshCw size={12} className="animate-spin"/> : <Bot size={12}/>}
            {summarizing?"Analysing…":"AI Summary"}
          </motion.button>
        </div>
      </FadeIn>

      {/* AI summary */}
      <AnimatePresence>
        {summary && (
          <motion.div className="card overflow-hidden"
            initial={{opacity:0,y:-10,scale:.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,height:0}}
            style={{border:"1px solid rgba(168,85,247,.22)",background:"rgba(168,85,247,.04)"}}>
            <div className="px-4 py-2.5 flex items-center gap-2" style={{borderBottom:"1px solid rgba(168,85,247,.1)"}}>
              <Bot size={12} style={{color:"#a855f7"}}/>
              <p className="text-[12px] font-semibold text-white">Incident Analysis</p>
              <span className="text-[11px]" style={{color:"#475569"}}>· {summary.model_name??"template"}</span>
            </div>
            <p className="px-4 py-3 text-[13px] leading-relaxed" style={{color:"#cbd5e1"}}>{summary.summary_text}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* stat cards */}
      <Stagger className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {label:"Succeeded",    value:`${succeeded}/${total}`, icon:CheckCircle2, color:"#34d399"},
          {label:"Dead-lettered",value:dead,                    icon:Skull,         color:"#fb7185"},
          {label:"Total Attempts",value:totalAttempts,          icon:Zap,           color:"#fb923c"},
          {label:"Total Duration",value:fmtMs(totalMs||null),   icon:Clock,         color:"#818cf8"},
        ].map(({label,value,icon:Icon,color})=>(
          <StaggerItem key={label}>
            <div className="card p-4 flex items-center gap-3">
              <Icon size={16} strokeWidth={1.75} style={{color,flexShrink:0}}/>
              <div>
                <p className="text-[10px] uppercase tracking-[.06em]" style={{color:"#475569"}}>{label}</p>
                <p className="mono text-[18px] font-bold" style={{color}}>{value}</p>
              </div>
            </div>
          </StaggerItem>
        ))}
      </Stagger>

      {/* charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* animation #26 — SVG arc draw */}
        <FadeIn delay={.1} className="lg:col-span-2 card overflow-hidden">
          <div className="px-5 py-3.5" style={{borderBottom:"1px solid rgba(255,255,255,.06)"}}>
            <p className="text-[13px] font-semibold text-white">Success Rate</p>
          </div>
          <div className="p-5 flex flex-col items-center gap-4">
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="10"/>
                <motion.circle cx="50" cy="50" r="38" fill="none" strokeLinecap="round"
                  stroke={successPct>80?"#10b981":successPct>50?"#f97316":"#f43f5e"}
                  strokeWidth="10"
                  strokeDasharray={`${2*Math.PI*38}`}
                  initial={{strokeDashoffset:2*Math.PI*38}}
                  animate={{strokeDashoffset:2*Math.PI*38*(1-successPct/100)}}
                  transition={{duration:1.4,ease:"easeOut",delay:.2}}
                  style={{filter:`drop-shadow(0 0 8px ${successPct>80?"#10b981":"#f97316"}60)`}}/>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.p className="mono text-[22px] font-bold text-white"
                  initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.8}}>
                  {successPct.toFixed(0)}%
                </motion.p>
                <p className="text-[10px]" style={{color:"#475569"}}>success</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full">
              {[{l:"succeeded",v:succeeded,c:"#10b981"},{l:"failed",v:dead,c:"#f43f5e"}].map(({l,v,c})=>(
                <div key={l} className="text-center py-2 rounded-lg" style={{background:"rgba(255,255,255,.02)"}}>
                  <p className="mono text-[16px] font-bold" style={{color:c}}>{v}</p>
                  <p className="text-[10px]" style={{color:"#334155"}}>{l}</p>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>

        {/* attempts per step */}
        <FadeIn delay={.15} className="lg:col-span-3 card overflow-hidden">
          <div className="px-5 py-3.5" style={{borderBottom:"1px solid rgba(255,255,255,.06)"}}>
            <p className="text-[13px] font-semibold text-white">Attempts per Step</p>
            <p className="text-[11px] mt-0.5" style={{color:"#334155"}}>Bars colored by final outcome</p>
          </div>
          <div className="px-4 py-4">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={barData} margin={{top:4,right:4,left:-30,bottom:0}} barSize={28}>
                <CartesianGrid strokeDasharray="1 4" stroke="rgba(255,255,255,.04)" vertical={false}/>
                <XAxis dataKey="step" tick={{fontSize:10,fill:"#334155",fontFamily:"JetBrains Mono"}} tickLine={false} axisLine={false}/>
                <YAxis tick={{fontSize:10,fill:"#334155"}} tickLine={false} axisLine={false} allowDecimals={false}/>
                <Tooltip {...TT}/>
                <Bar dataKey="attempts" name="Attempts" radius={[4,4,0,0]}>
                  {barData.map((e,i)=><Cell key={i} fill={DOT[e.status]??DOT.queued} style={{filter:`drop-shadow(0 0 6px ${DOT[e.status]??DOT.queued}50)`}}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </FadeIn>
      </div>

      {/* timeline */}
      <FadeIn delay={.2} className="card overflow-hidden">
        <div className="px-5 py-3.5 flex items-center justify-between" style={{borderBottom:"1px solid rgba(255,255,255,.06)"}}>
          <p className="text-[13px] font-semibold text-white">Event Timeline</p>
          <p className="text-[11px]" style={{color:"#334155"}}>Click events to expand attempt history</p>
        </div>
        <div className="p-5">
          {events.map((ev,i)=><TimelineEvent key={ev.id} ev={ev} idx={i} isLast={i===events.length-1}/>)}
        </div>
      </FadeIn>
    </div>
  );
}
