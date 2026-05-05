import { BrowserRouter, Link, NavLink, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import WorkflowDetail from "./pages/WorkflowDetail";
import DeadLetters from "./pages/DeadLetters";
import WorkerHealth from "./pages/WorkerHealth";

const navClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded text-sm font-medium transition-colors ${
    isActive
      ? "bg-indigo-700 text-white"
      : "text-gray-300 hover:bg-gray-700 hover:text-white"
  }`;

function Nav() {
  return (
    <nav className="bg-gray-900 border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 flex items-center h-14 gap-2">
        <Link to="/" className="text-white font-bold text-lg mr-6">
          ⟳ ReplayForge
        </Link>
        <NavLink to="/" end className={navClass}>
          Dashboard
        </NavLink>
        <NavLink to="/deadletters" className={navClass}>
          Dead Letters
        </NavLink>
        <NavLink to="/workers" className={navClass}>
          Workers
        </NavLink>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-950 text-gray-100">
        <Nav />
        <main className="max-w-7xl mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/workflows/:workflowId" element={<WorkflowDetail />} />
            <Route path="/deadletters" element={<DeadLetters />} />
            <Route path="/workers" element={<WorkerHealth />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
