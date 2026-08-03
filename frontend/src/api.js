const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

function getToken() {
  return localStorage.getItem("daytrack_token");
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Something went wrong");
  }
  return data;
}

export const api = {
  signup: (body) => request("/auth/signup", { method: "POST", body: JSON.stringify(body) }),
  login: (body) => request("/auth/login", { method: "POST", body: JSON.stringify(body) }),

  getGoals: (date) => request(`/goals?date=${date}`),
  createGoal: (body) => request("/goals", { method: "POST", body: JSON.stringify(body) }),
  updateGoal: (id, body) => request(`/goals/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteGoal: (id) => request(`/goals/${id}`, { method: "DELETE" }),

  getSleep: (start, end) => request(`/sleep?start=${start}&end=${end}`),
  logSleep: (body) => request("/sleep", { method: "POST", body: JSON.stringify(body) }),

  getWeeklyReport: (start) => request(`/reports/weekly?start=${start}`),
};

export { getToken };
