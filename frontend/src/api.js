const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch (_) {}
    throw new Error(detail);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // dashboard
  summary: () => request("/dashboard/summary"),
  projectUtilization: () => request("/dashboard/project-utilization"),
  floorUtilization: () => request("/dashboard/floor-utilization"),

  // employees
  listEmployees: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/employees${qs ? `?${qs}` : ""}`);
  },
  getEmployee: (id) => request(`/employees/${id}`),
  createEmployee: (data) => request("/employees", { method: "POST", body: JSON.stringify(data) }),
  updateEmployee: (id, data) => request(`/employees/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deactivateEmployee: (id) => request(`/employees/${id}`, { method: "DELETE" }),

  // projects
  listProjects: () => request("/projects"),
  projectEmployees: (id, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/projects/${id}/employees${qs ? `?${qs}` : ""}`);
  },
  createProject: (data) => request("/projects", { method: "POST", body: JSON.stringify(data) }),

  // seats
  listSeats: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/seats${qs ? `?${qs}` : ""}`);
  },
  availableSeats: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/seats/available${qs ? `?${qs}` : ""}`);
  },
  allocateSeat: (data) => request("/seats/allocate", { method: "POST", body: JSON.stringify(data) }),
  releaseSeat: (data) => request("/seats/release", { method: "POST", body: JSON.stringify(data) }),

  // AI assistant
  askAssistant: (query, email) =>
    request("/ai/query", { method: "POST", body: JSON.stringify({ query, email }) }),
};
