import { AnimatePresence } from "framer-motion";
import { BrowserRouter, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { AlertTriangle, BarChart2, LayoutDashboard, Server, Skull, Zap } from "lucide-react";
import { Toaster } from "sonner";
import { useEffect, useState } from "react";
import Dashboard from "./pages/Dashboard";
import WorkflowDetail from "./pages/WorkflowDetail";
import DeadLetters from "./pages/DeadLetters";
import WorkerHealth from "./pages/WorkerHealth";
import { PageTransition } from "./components/Animated";
import { Header } from "./components/Header";
import { CommandPalette } from "./components/CommandPalette";

const NAV = [
  { to: "/",            label: "Dashboard",   icon: LayoutDashboard, end: true  },
  { to: "/deadletters", label: "Dead Letters", icon: Skull                      },
  { to: "/workers",     label: "Workers",      icon: Server                     },
];

function AppInner() {
  const loc = useLocation();
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setCmdOpen(o => !o); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg)" }}>
      {/* backgrounds */}
      <div className="grid-bg" />
      <div className="orb w-[600px] h-[600px]" style={{ background: "#4338ca", top: "-250px", left: "80px" }} />
      <div className="orb w-[400px] h-[400px]" style={{ background: "#7e22ce", bottom: "-100px", right: "200px" }} />

      {/* command palette */}
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />

      {/* sidebar */}
      <aside
        className="relative z-10 w-[188px] shrink-0 min-h-screen flex flex-col"
        style={{
          background: "rgba(5,9,18,0.85)",
          borderRight: "1px solid rgba(255,255,255,0.05)",
          backdropFilter: "blur(16px)",
        }}
      >
        {/* logo */}
        <div className="px-4 pt-4 pb-3.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                boxShadow: "0 0 20px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.15)",
              }}
            >
              <Zap size={12} className="text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-[13px] leading-none tracking-tight">ReplayForge</p>
              <p className="text-[10px] mt-0.5" style={{ color: "#1e2d3d" }}>Workflow Debugger</p>
            </div>
          </div>
        </div>

        {/* live badge */}
        <div className="px-3.5 pt-3">
          <div
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-md mb-1"
            style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.12)" }}
          >
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            <span style={{ color: "#34d399", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em" }}>LIVE</span>
          </div>
        </div>

        {/* nav */}
        <nav className="flex-1 px-3 pt-3 pb-2 space-y-0.5 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          <p className="px-2 pb-2 text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: "#1a2640" }}>Platform</p>
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to} to={to} end={end}
              className={({ isActive }) => `sidebar-nav-item ${isActive ? "active" : ""}`}
            >
              <Icon size={13} strokeWidth={1.75} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* cmd shortcut hint */}
        <div className="px-3.5 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <button
            onClick={() => setCmdOpen(true)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-[11px] transition-colors"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "#334155" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
          >
            <span>Quick search</span>
            <div className="flex items-center gap-0.5">
              <span className="kbd">⌘</span><span className="kbd">K</span>
            </div>
          </button>
        </div>
      </aside>

      {/* main content */}
      <div className="relative z-10 flex-1 flex flex-col overflow-hidden min-h-screen">
        <Header onCmdK={() => setCmdOpen(true)} />
        <div className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            <Routes location={loc} key={loc.pathname}>
              <Route path="/"                   element={<PageTransition><Dashboard /></PageTransition>} />
              <Route path="/workflows/:wfId"    element={<PageTransition><WorkflowDetail /></PageTransition>} />
              <Route path="/deadletters"        element={<PageTransition><DeadLetters /></PageTransition>} />
              <Route path="/workers"            element={<PageTransition><WorkerHealth /></PageTransition>} />
            </Routes>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#0b1120",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#e2e8f0",
            fontSize: 13,
            borderRadius: 10,
            boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
          },
        }}
      />
      <AppInner />
    </BrowserRouter>
  );
}
