import { useEffect, useState } from "react";
import { api } from "../api";
import StatCard from "../components/StatCard";

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [floors, setFloors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([api.summary(), api.floorUtilization(), api.projectUtilization()])
      .then(([s, f, p]) => {
        setSummary(s);
        setFloors(f);
        setProjects(p.sort((a, b) => b.occupied_seats - a.occupied_seats));
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="p-8">
        <div className="text-maintenance text-sm">
          Couldn't reach the API ({error}). Is the backend running at{" "}
          <code className="font-mono">http://localhost:8000</code>?
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl">
      <header className="mb-8">
        <h1 className="font-display font-semibold text-2xl text-ink">Dashboard</h1>
        <p className="text-muted text-sm mt-1">Live seat and headcount overview across all floors.</p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        <StatCard label="Employees" value={summary?.total_employees} to="/employees" />
        <StatCard label="Total seats" value={summary?.total_seats} to="/seats" />
        <StatCard label="Occupied" value={summary?.occupied_seats} tone="occupied" to="/seats?status=occupied" />
        <StatCard label="Available" value={summary?.available_seats} tone="available" to="/seats?status=available" />
        <StatCard label="Reserved" value={summary?.reserved_seats} tone="reserved" to="/seats?status=reserved" />
        <StatCard label="Maintenance" value={summary?.maintenance_seats} tone="maintenance" to="/seats?status=maintenance" />
        <StatCard
          label="Pending allocation"
          value={summary?.new_joiners_pending_allocation}
          to="/employees?status=pending_allocation"
        />
      </section>

      <section className="grid md:grid-cols-2 gap-8">
        <div>
          <h2 className="font-display font-semibold text-sm uppercase tracking-wide text-muted mb-3">
            Floor occupancy
          </h2>
          <div className="bg-surface border border-line rounded-lg p-5 flex flex-col gap-4">
            {floors.map((f) => (
              <div key={f.floor}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium">Floor {f.floor}</span>
                  <span className="text-muted font-mono text-xs">
                    {f.occupied}/{f.total_seats} · {f.occupancy_pct}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-canvas overflow-hidden">
                  <div
                    className="h-full bg-occupied rounded-full"
                    style={{ width: `${f.occupancy_pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-display font-semibold text-sm uppercase tracking-wide text-muted mb-3">
            Project utilization
          </h2>
          <div className="bg-surface border border-line rounded-lg divide-y divide-line">
            {projects.map((p) => (
              <div key={p.project} className="flex justify-between items-center px-5 py-3 text-sm">
                <span className="font-medium">{p.project}</span>
                <span className="text-muted font-mono text-xs">
                  {p.occupied_seats} seated · {p.employees} employees
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}