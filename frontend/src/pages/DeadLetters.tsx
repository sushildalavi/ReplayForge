import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, ExternalLink, RefreshCw, Skull } from "lucide-react";
import { toast } from "sonner";
import { api } from "../api/client";
import { EventStatusBadge } from "../components/EventStatusBadge";
import { FadeIn, Stagger, StaggerItem, Skeleton } from "../components/Animated";
import { usePolling } from "../hooks/usePolling";
import type { DeadLetterOut } from "../types";

const ago = (iso:string) => {
  const s = Math.floor((Date.now()-new Date(iso).getTime())/1000);
  if(s<60)   return `${s}s`;
  if(s<3600) return `${Math.floor(s/60)}m`;
  return `${Math.floor(s/3600)}h`;
};

type RS = "idle"|"replaying"|"done";

/* animation #21 — replay state machine with glow flash */
function ReplayBtn({ state, onClick }: { state:RS; onClick:()=>void }) {
  return (
    <motion.button className="btn-success" onClick={onClick} disabled={state==="replaying"}
      whileHover={{boxShadow:"0 0 16px rgba(16,185,129,.3)",scale:1.02}}
      whileTap={{scale:.94}}
      animate={state==="done" ? {
        backgroundColor:["rgba(16,185,129,.1)","rgba(16,185,129,.35)","rgba(16,185,129,.1)"],
        boxShadow:["0 0 0 rgba(16,185,129,0)","0 0 20px rgba(16,185,129,.5)","0 0 0 rgba(16,185,129,0)"],
      } : {}}
      transition={state==="done"?{duration:.6}:{}}>
      <RefreshCw size={10} className={state==="replaying"?"animate-spin":""}/>
      {state==="replaying"?"…":"Replay"}
    </motion.button>
  );
}

function Row({ dl, refresh }: { dl:DeadLetterOut; refresh:()=>void }) {
  const [state, setState] = useState<RS>("idle");
  const done = !!dl.replayed_at || state==="done";

  const replay = async () => {
    if(done||state==="replaying") return;
    setState("replaying");
    try {
      await api.replayDeadLetter(dl.id);
      setState("done");
      toast.success("Replayed",{description:`${dl.event_type} re-queued`});
      setTimeout(refresh,800);
    } catch { toast.error("Replay failed"); setState("idle"); }
  };

  return (
    /* animation #4 — row stagger fade */
    <motion.tr className="tr" layout
      initial={{opacity:0,y:6}} animate={{opacity:1,y:0}}
      transition={{duration:.24,ease:[0.21,0.47,0.32,0.98]}}>
      <td className="td pl-4">
        <span className="mono text-[12px] font-semibold text-white">{dl.event_type}</span>
      </td>
      <td className="td">
        <Link to={`/workflows/${dl.workflow_id}`}
          className="group flex items-center gap-1 mono text-[12px]"
          style={{color:"#818cf8",textDecoration:"none"}}
          onMouseEnter={e=>((e.currentTarget as HTMLElement).style.color="#a5b4fc")}
          onMouseLeave={e=>((e.currentTarget as HTMLElement).style.color="#818cf8")}>
          {dl.workflow_id.slice(-16)}
          <ExternalLink size={9} className="opacity-0 group-hover:opacity-100 transition-opacity"/>
        </Link>
      </td>
      <td className="td text-[12px]" style={{color:"#475569"}}>{dl.service_name}</td>
      <td className="td max-w-[200px]">
        <span className="mono text-[11px] truncate block" style={{color:"#fb7185"}} title={dl.last_error??""}>
          {dl.last_error??"—"}
        </span>
      </td>
      <td className="td mono text-[12px]" style={{color:"#334155"}}>{ago(dl.created_at)} ago</td>
      <td className="td">
        {done ? <EventStatusBadge status="replayed"/> : <EventStatusBadge status="dead_lettered"/>}
      </td>
      <td className="td pr-4">
        {done ? (
          <span className="mono text-[11px]" style={{color:"#334155"}}>
            {dl.replayed_at?ago(dl.replayed_at)+" ago":"just now"}
          </span>
        ) : <ReplayBtn state={state} onClick={replay}/>}
      </td>
    </motion.tr>
  );
}

export default function DeadLetters() {
  const loader = useCallback(()=>api.listDeadLetters(100),[]);
  const { data, loading, error, refresh } = usePolling(loader,5000);
  const pending  = (data??[]).filter(d=>!d.replayed_at).length;
  const replayed = (data??[]).filter(d=>!!d.replayed_at).length;

  return (
    <div className="page-wrap space-y-5">

      <FadeIn>
        <h1 className="text-white flex items-center gap-2" style={{fontSize:17,fontWeight:600,letterSpacing:"-.02em"}}>
          <Skull size={16} style={{color:"#f43f5e"}}/>Dead Letter Queue
        </h1>
        <p className="text-[12px] mt-1" style={{color:"#334155"}}>Events that exhausted all retry attempts</p>
      </FadeIn>

      {data && data.length>0 && (
        <Stagger className="grid grid-cols-3 gap-3">
          {[
            {label:"Total DLQ",     value:data.length, color:"#f1f5f9", border:"rgba(241,245,249,.08)"},
            {label:"Pending replay",value:pending,     color:"#fb7185", border:"rgba(244,63,94,.15)"},
            {label:"Replayed",      value:replayed,    color:"#c084fc", border:"rgba(168,85,247,.15)"},
          ].map(({label,value,color,border})=>(
            <StaggerItem key={label}>
              <div className="card p-4 text-center" style={{borderColor:border}}>
                <p className="mono font-bold" style={{color,fontSize:28,letterSpacing:"-.02em"}}>{value}</p>
                <p className="text-[11px] mt-1" style={{color:"#475569"}}>{label}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg text-[13px]"
          style={{color:"#fb7185",background:"rgba(244,63,94,.07)",border:"1px solid rgba(244,63,94,.18)"}}>
          <AlertCircle size={13}/>{error}
        </div>
      )}

      <FadeIn delay={.1} className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr style={{borderBottom:"1px solid rgba(255,255,255,.05)"}}>
              {["Event","Workflow","Service","Last Error","Age","Status","Action"].map(h=>(
                <th key={h} className="th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading&&!data ? [...Array(5)].map((_,i)=>(
              <tr key={i} className="tr">
                {[...Array(7)].map((_,j)=><td key={j} className="td"><Skeleton className="h-3.5 w-full"/></td>)}
              </tr>
            )) : (data??[]).length===0 ? (
              <tr><td colSpan={7} className="py-16 text-center">
                <Skull size={28} className="mx-auto mb-2" style={{color:"#1e293b"}}/>
                <p className="text-[13px]" style={{color:"#334155"}}>No dead letters yet</p>
              </td></tr>
            ) : (
              <AnimatePresence>
                {data!.map(dl=><Row key={dl.id} dl={dl} refresh={refresh}/>)}
              </AnimatePresence>
            )}
          </tbody>
        </table>
      </FadeIn>
    </div>
  );
}
