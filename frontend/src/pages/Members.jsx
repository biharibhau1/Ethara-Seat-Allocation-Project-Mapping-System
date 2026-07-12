import { useEffect, useState } from "react";
import { api } from "../api";

const DEPARTMENTS = [
  { value: "", label: "All departments" },
  { value: "Research & Development", label: "Research & Development" },
  { value: "Growth", label: "Growth" },
  { value: "Technical", label: "Technical" },
  { value: "STEM", label: "STEM" },
  { value: "Non-STEM", label: "Non-STEM" },
];

const deptTone = {
  "Research & Development": "bg-occupied-bg text-occupied",
  Growth: "bg-reserved-bg text-reserved",
  Technical: "bg-brand-light text-brand",
  STEM: "bg-available-bg text-available",
  "Non-STEM": "bg-maintenance-bg text-maintenance",
};

function initials(name) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function Members() {
  const [q, setQ] = useState("");
  const [department, setDepartment] = useState("");
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const search = async () => {
    setLoading(true);
    try {
      const params = { limit: 60 };
      if (q) params.q = q;
      if (department) params.department = department;
      const data = await api.listEmployees(params);
      setMembers(data);
    } catch (e) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [department]);

  return (
    <div className="p-8 max-w-6xl">
      <header className="mb-6">
        <h1 className="font-display font-semibold text-2xl text-ink">Members</h1>
        <p className="text-muted text-sm mt-1">Browse the team directory by department.</p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
        className="mb-6 flex gap-2"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or email…"
          className="flex-1 border border-line rounded-md px-3 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
        />
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="border border-line rounded-md px-3 py-2 text-sm bg-surface"
        >
          {DEPARTMENTS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
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

      {message && <div className="text-sm text-maintenance mb-4">{message}</div>}

      {loading ? (
        <div className="text-sm text-muted">Loading…</div>
      ) : members.length === 0 ? (
        <div className="text-sm text-muted">No members found.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {members.map((m) => (
            <div key={m.id} className="bg-surface border border-line rounded-lg p-4 flex gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-light text-brand font-display font-semibold text-sm flex items-center justify-center shrink-0">
                {initials(m.name)}
              </div>
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{m.name}</div>
                <div className="text-xs text-muted truncate mb-1.5">{m.role || "—"}</div>
                <span
                  className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full ${
                    deptTone[m.department] || "bg-canvas text-muted"
                  }`}
                >
                  {m.department || "—"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}