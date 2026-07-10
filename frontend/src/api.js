const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const TOKEN_KEY = "ethara_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch (_) {}
    if (res.status === 401) setToken(null); // stale/expired token
    throw new Error(detail);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // auth
  login: async (username, password) => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ username, password }).toString(),
    });
    if (!res.ok) {
      let detail = "Login failed";
      try {
        detail = (await res.json()).detail || detail;
      } catch (_) {}
      throw new Error(detail);
    }
    return res.json(); // { access_token, role, username, employee_id }
  },
  me: () => request("/auth/me"),

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