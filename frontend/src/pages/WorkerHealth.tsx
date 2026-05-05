import React, { useCallback } from "react";
import { motion } from "framer-motion";
import { Clock, Server, Zap } from "lucide-react";
import { api } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { FadeIn, Stagger, StaggerItem, Skeleton } from "../components/Animated";
import type { WorkerOut } from "../types";

const ago = (iso:string) => {
  const s=Math.floor((Date.now()-new Date(iso).getTime())/1000);
  if(s<10) return "just now"; if(s<60) return `${s}s ago`; return `${Math.floor(s/60)}m ago`;
};
const hbAge = (iso:string) => Math.floor((Date.now()-new Date(iso).getTime())/1000);

const ST: Record<string,{label:string;color:string;bg:string;border:string}> = {
  active:  {label:"active",  color:"#34d399",bg:"rgba(16,185,129,.09)", border:"rgba(16,185,129,.2)"},
  busy:    {label:"busy",    color:"#fbbf24",bg:"rgba(245,158,11,.09)", border:"rgba(245,158,11,.2)"},
  stale:   {label:"stale",   color:"#fb923c",bg:"rgba(249,115,22,.09)", border:"rgba(249,115,22,.2)"},
  stopped: {label:"stopped", color:"#475569",bg:"rgba(71,85,105,.09)",  border:"rgba(71,85,105,.2)"},
  crashed: {label:"crashed", color:"#f87171",bg:"rgba(239,68,68,.09)",  border:"rgba(239,68,68,.2)"},
};

function WorkerCard({ w, i }: { w:WorkerOut; i:number }) {
  const eff   = w.is_stale?"stale":w.status;
  const cfg   = ST[eff]??ST.stopped;
  const age   = hbAge(w.last_heartbeat_at);
  const live  = !w.is_stale&&w.status==="active";

  return (
    <motion.div className="card overflow-hidden"
      initial={{opacity:0,y:14}} animate={{opacity:1,y:0}}
      transition={{delay:i*.07,duration:.3,ease:[0.21,0.47,0.32,0.98]}}
      whileHover={{y:-3,borderColor:cfg.border}}>
      {/* top accent */}
      <div className="h-px w-full" style={{background:`linear-gradient(90deg,transparent,${cfg.color}70,transparent)`}}/>
      <div className="p-4">
        {/* header */}
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2.5">
            {/* animation #12 — live ring for active */}
            {live ? (
              <span className="live-ring"><span className="live-dot" style={{background:cfg.color}}/></span>
            ) : (
              <span className="rounded-full" style={{width:7,height:7,background:cfg.color,display:"inline-block"}}/>
            )}
            <span className="mono font-semibold text-white" style={{fontSize:13,letterSpacing:"-.01em"}}>
              {w.worker_name}
            </span>
          </div>
          <span className="badge" style={{background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.border}`}}>
            {cfg.label}
          </span>
        </div>

        {/* animation #24 — heartbeat bar oscillation */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase tracking-[.06em]" style={{color:"#334155"}}>Heartbeat</span>
            <span className="mono text-[11px]" style={{color:age>30?"#fb923c":"#475569"}}>{ago(w.last_heartbeat_at)}</span>
          </div>
          <div className="rounded-full overflow-hidden" style={{height:4,background:"rgba(255,255,255,.04)"}}>
            <motion.div className="h-full rounded-full"
              animate={live
                ? {scaleX:[1,.2,1],opacity:[1,.5,1]}
                : {scaleX:Math.max(.04,1-age/60)}}
              transition={live
                ? {duration:1.8,repeat:Infinity,ease:"easeInOut"}
                : {duration:.6}}
              style={{
                transformOrigin:"left",
                background:`linear-gradient(90deg,${cfg.color},${cfg.color}80)`,
              } as React.CSSProperties}/>
          </div>
        </div>

        {/* stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="card-inset px-3 py-2">
            <p className="text-[10px]" style={{color:"#334155"}}>Status</p>
            <p className="mono text-[12px] font-semibold" style={{color:cfg.color}}>{eff}</p>
          </div>
          <div className="card-inset px-3 py-2">
            <p className="text-[10px]" style={{color:"#334155"}}>Processing</p>
            <p className="mono text-[12px] font-semibold" style={{color:"#e2e8f0"}}>
              {w.current_event_id?`${w.current_event_id.slice(0,10)}…`:"—"}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function WorkerHealth() {
  const loader = useCallback(()=>api.listWorkers(),[]);
  const { data, loading } = usePolling(loader,4000);

  const active  = (data??[]).filter(w=>!w.is_stale&&w.status==="active").length;
  const stale   = (data??[]).filter(w=>w.is_stale).length;
  const crashed = (data??[]).filter(w=>w.status==="crashed").length;
  const total   = (data??[]).length;
  const healthPct = total>0?Math.round((active/total)*100):0;
  const arcColor  = healthPct>80?"#10b981":healthPct>50?"#f97316":"#f43f5e";
  const circ      = 2*Math.PI*22;

  return (
    <div className="page-wrap space-y-5">

      <FadeIn>
        <h1 className="text-white flex items-center gap-2" style={{fontSize:17,fontWeight:600,letterSpacing:"-.02em"}}>
          <Server size={16} style={{color:"#818cf8"}}/>Workers
        </h1>
        <p className="text-[12px] mt-1" style={{color:"#334155"}}>Heartbeat monitor · stale after 30s</p>
      </FadeIn>

      {data&&data.length>0 && (
        <Stagger className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* animation #25 — fleet health arc */}
          <StaggerItem>
            <div className="card p-4 flex items-center gap-4">
              <div className="relative w-14 h-14 shrink-0">
                <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
                  <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="7"/>
                  <motion.circle cx="28" cy="28" r="22" fill="none" strokeLinecap="round"
                    stroke={arcColor} strokeWidth="7"
                    strokeDasharray={circ}
                    initial={{strokeDashoffset:circ}}
                    animate={{strokeDashoffset:circ*(1-healthPct/100)}}
                    transition={{duration:1.2,ease:"easeOut"}}
                    style={{filter:`drop-shadow(0 0 4px ${arcColor}60)`}}/>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="mono text-[12px] font-bold text-white">{healthPct}%</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[.06em]" style={{color:"#475569"}}>Fleet Health</p>
                <p className="mono text-[18px] font-bold text-white">{active}<span className="text-[13px]" style={{color:"#334155"}}>/{total}</span></p>
              </div>
            </div>
          </StaggerItem>
          {[
            {label:"Active",  value:active,  color:"#34d399", icon:Zap},
            {label:"Stale",   value:stale,   color:stale>0?"#fb923c":"#1e293b", icon:Clock},
            {label:"Crashed", value:crashed, color:crashed>0?"#f87171":"#1e293b", icon:Server},
          ].map(({label,value,color,icon:Icon})=>(
            <StaggerItem key={label}>
              <div className="card p-4 flex items-center gap-3">
                <Icon size={15} style={{color,flexShrink:0}} strokeWidth={1.75}/>
                <div>
                  <p className="text-[10px] uppercase tracking-[.06em]" style={{color:"#475569"}}>{label}</p>
                  <p className="mono text-[22px] font-bold" style={{color}}>{value}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      {loading&&!data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(3)].map((_,i)=><Skeleton key={i} className="h-40"/>)}
        </div>
      ) : (data??[]).length===0 ? (
        <FadeIn className="card p-16 text-center">
          <Server size={32} className="mx-auto mb-2" style={{color:"#1e293b"}}/>
          <p className="text-[13px]" style={{color:"#334155"}}>No workers registered</p>
        </FadeIn>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data!.map((w,i)=><WorkerCard key={w.id} w={w} i={i}/>)}
        </div>
      )}
    </div>
  );
}
