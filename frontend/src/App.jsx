import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Seats from "./pages/Seats";
import Assistant from "./pages/Assistant";

function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar />
      <main className="flex-1">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/dashboard"
          element={
            <AppLayout>
              <Dashboard />
            </AppLayout>
          }
        />
        <Route
          path="/employees"
          element={
            <AppLayout>
              <Employees />
            </AppLayout>
          }
        />
        <Route
          path="/seats"
          element={
            <AppLayout>
              <Seats />
            </AppLayout>
          }
        />
        <Route
          path="/assistant"
          element={
            <AppLayout>
              <Assistant />
            </AppLayout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
