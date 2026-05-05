import { AnimatePresence } from "framer-motion";
import { BrowserRouter, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { Activity, AlertTriangle, LayoutDashboard, Server, Zap } from "lucide-react";
import Dashboard from "./pages/Dashboard";
import WorkflowDetail from "./pages/WorkflowDetail";
import DeadLetters from "./pages/DeadLetters";
import WorkerHealth from "./pages/WorkerHealth";
import { PageTransition } from "./components/Animated";

const navItems = [
  { to: "/",            label: "Dashboard",   icon: LayoutDashboard, end: true },
  { to: "/deadletters", label: "Dead Letters", icon: AlertTriangle },
  { to: "/workers",     label: "Workers",      icon: Server },
];

function Sidebar() {
  return (
    <aside
      className="w-52 shrink-0 min-h-screen flex flex-col"
      style={{
        background: "linear-gradient(180deg, #080e1c 0%, #060b18 100%)",
        borderRight: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {/* logo */}
      <div className="px-4 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", boxShadow: "0 0 16px rgba(99,102,241,0.4)" }}>
            <Zap size={15} className="text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">ReplayForge</p>
            <p className="text-slate-500 text-[11px]">Workflow Debugger</p>
          </div>
        </div>
      </div>

      {/* live badge */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md"
          style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.15)" }}>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-emerald-400 text-[11px] font-semibold tracking-wide">LIVE</span>
        </div>
      </div>

      {/* nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 sidebar-scroll overflow-y-auto">
        <p className="px-2 pb-2 pt-1 text-[10px] font-bold text-slate-600 uppercase tracking-[0.12em]">Navigation</p>
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                isActive
                  ? "text-white"
                  : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]"
              }`
            }
            style={({ isActive }) => isActive ? {
              background: "linear-gradient(135deg, rgba(79,70,229,0.2), rgba(124,58,237,0.12))",
              border: "1px solid rgba(99,102,241,0.2)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
            } : {}}
          >
            <Icon size={15} strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* footer */}
      <div className="px-4 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="flex items-center gap-2">
          <Activity size={12} className="text-slate-700" />
          <p className="text-slate-700 text-[11px]">Redis Streams · v0.1.0</p>
        </div>
      </div>
    </aside>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Dashboard /></PageTransition>} />
        <Route path="/workflows/:workflowId" element={<PageTransition><WorkflowDetail /></PageTransition>} />
        <Route path="/deadletters" element={<PageTransition><DeadLetters /></PageTransition>} />
        <Route path="/workers" element={<PageTransition><WorkerHealth /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen" style={{ background: "#060b18" }}>
        <Sidebar />
        <div className="flex-1 overflow-auto min-h-screen">
          <AnimatedRoutes />
        </div>
      </div>
    </BrowserRouter>
  );
}
