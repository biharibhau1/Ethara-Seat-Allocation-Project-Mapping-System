import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api";

const statusStyles = {
  active: "bg-available-bg text-available",
  pending_allocation: "bg-reserved-bg text-reserved",
  inactive: "bg-maintenance-bg text-maintenance",
};

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "pending_allocation", label: "Pending allocation" },
  { value: "inactive", label: "Inactive" },
];

export default function Employees() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [employees, setEmployees] = useState([]);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const search = async (query, statusFilter) => {
    setLoading(true);
    try {
      const params = { limit: 25 };
      if (query) params.q = query;
      if (statusFilter) params.status = statusFilter;
      const data = await api.listEmployees(params);
      setEmployees(data);
    } catch (e) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Re-run whenever the URL's query params change (e.g. arriving from a
  // dashboard stat card link), and keep local inputs in sync.
  useEffect(() => {
    const urlQ = searchParams.get("q") || "";
    const urlStatus = searchParams.get("status") || "";
    setQ(urlQ);
    setStatus(urlStatus);
    search(urlQ, urlStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const applyFilters = (nextQ, nextStatus) => {
    const params = {};
    if (nextQ) params.q = nextQ;
    if (nextStatus) params.status = nextStatus;
    setSearchParams(params);
  };

  const handleAllocate = async (emp) => {
    setMessage(null);
    try {
      await api.allocateSeat({ employee_id: emp.id });
      setMessage(`Seat allocated for ${emp.name}.`);
      search(q, status);
      const refreshed = await api.getEmployee(emp.id);
      setSelected(refreshed);
    } catch (e) {
      setMessage(e.message);
    }
  };

  const handleRelease = async (emp) => {
    setMessage(null);
    try {
      await api.releaseSeat({ employee_id: emp.id });
      setMessage(`Seat released for ${emp.name}.`);
      search(q, status);
      const refreshed = await api.getEmployee(emp.id);
      setSelected(refreshed);
    } catch (e) {
      setMessage(e.message);
    }
  };

  return (
    <div className="p-8 max-w-5xl">
      <header className="mb-6">
        <h1 className="font-display font-semibold text-2xl text-ink">Employees</h1>
        <p className="text-muted text-sm mt-1">Search by name, email, or employee code.</p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          applyFilters(q, status);
        }}
        className="mb-5 flex gap-2"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. Cheryl, ETH00139, cheryl.avila@ethara.ai"
          className="flex-1 border border-line rounded-md px-3 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            applyFilters(q, e.target.value);
          }}
          className="border border-line rounded-md px-3 py-2 text-sm bg-surface"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="px-4 py-2 rounded-md bg-brand text-white text-sm font-medium hover:opacity-90"
        >
          Search
        </button>
      </form>

      {message && (
        <div className="mb-4 text-sm px-3 py-2 rounded-md bg-brand-light text-brand">{message}</div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-surface border border-line rounded-lg divide-y divide-line max-h-[560px] overflow-y-auto">
          {loading && <div className="px-4 py-3 text-sm text-muted">Searching…</div>}
          {!loading && employees.length === 0 && (
            <div className="px-4 py-3 text-sm text-muted">No employees found.</div>
          )}
          {employees.map((emp) => (
            <button
              key={emp.id}
              onClick={() => setSelected(emp)}
              className={`w-full text-left px-4 py-3 hover:bg-canvas transition-colors ${
                selected?.id === emp.id ? "bg-canvas" : ""
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium text-sm">{emp.name}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${statusStyles[emp.status] || ""}`}
                >
                  {emp.status.replace("_", " ")}
                </span>
              </div>
              <div className="text-xs text-muted font-mono mt-0.5">
                {emp.employee_code} · {emp.email}
              </div>
            </button>
          ))}
        </div>

        <div className="bg-surface border border-line rounded-lg p-5">
          {!selected ? (
            <div className="text-sm text-muted">Select an employee to view details.</div>
          ) : (
            <div>
              <div className="font-display font-semibold text-lg">{selected.name}</div>
              <div className="text-xs text-muted font-mono mb-4">{selected.employee_code}</div>

              <dl className="text-sm grid grid-cols-[100px_1fr] gap-y-2">
                <dt className="text-muted">Email</dt>
                <dd>{selected.email}</dd>
                <dt className="text-muted">Department</dt>
                <dd>{selected.department || "—"}</dd>
                <dt className="text-muted">Role</dt>
                <dd>{selected.role || "—"}</dd>
                <dt className="text-muted">Joined</dt>
                <dd>{selected.joining_date || "—"}</dd>
                <dt className="text-muted">Status</dt>
                <dd>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      statusStyles[selected.status] || ""
                    }`}
                  >
                    {selected.status.replace("_", " ")}
                  </span>
                </dd>
              </dl>

              <div className="mt-5 flex gap-2">
                {selected.status === "pending_allocation" ? (
                  <button
                    onClick={() => handleAllocate(selected)}
                    className="px-3 py-1.5 rounded-md bg-brand text-white text-sm font-medium hover:opacity-90"
                  >
                    Allocate seat
                  </button>
                ) : (
                  <button
                    onClick={() => handleRelease(selected)}
                    className="px-3 py-1.5 rounded-md border border-line text-sm font-medium hover:bg-canvas"
                  >
                    Release seat
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}