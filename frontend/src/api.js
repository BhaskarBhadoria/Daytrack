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
  getStreak: () => request(`/reports/streak`),
  getMonthly: (month) => request(`/reports/monthly?month=${month}`),
  getCategories: (start, end) => request(`/reports/categories?start=${start}&end=${end}`),

  getSettings: () => request(`/settings`),
  updateSettings: (body) => request(`/settings`, { method: "PUT", body: JSON.stringify(body) }),

  getTimetable: () => request(`/timetable`),
  createTimetableSlot: (body) => request(`/timetable`, { method: "POST", body: JSON.stringify(body) }),
  updateTimetableSlot: (id, body) =>
    request(`/timetable/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteTimetableSlot: (id) => request(`/timetable/${id}`, { method: "DELETE" }),

  getSyllabusProgress: () => request(`/syllabus/progress`),
  updateSyllabusProgress: (item_key, completed) =>
    request(`/syllabus/progress`, { method: "POST", body: JSON.stringify({ item_key, completed }) }),

  getGoogleStatus: () => request(`/google/status`),
  getGoogleAuthUrl: () => request(`/google/auth-url`),
  disconnectGoogle: () => request(`/google/disconnect`, { method: "POST" }),
  syncTimetableToGoogle: () => request(`/google/sync-timetable`, { method: "POST" }),
  syncGoalsToGoogle: (date) =>
    request(`/google/sync-goals`, { method: "POST", body: JSON.stringify({ date }) }),

  getSubjects: () => request(`/attendance/subjects`),
  createSubject: (name) => request(`/attendance/subjects`, { method: "POST", body: JSON.stringify({ name }) }),
  deleteSubject: (id) => request(`/attendance/subjects/${id}`, { method: "DELETE" }),
  getAttendanceRecords: (date) => request(`/attendance/records?date=${date}`),
  saveAttendanceRecord: (subject_id, date, status) =>
    request(`/attendance/records`, { method: "POST", body: JSON.stringify({ subject_id, date, status }) }),
  getAttendanceSummary: () => request(`/attendance/summary`),

  getSchedule: () => request(`/attendance/schedule`),
  addScheduleEntry: (subject_id, day_of_week, start_time, end_time) =>
    request(`/attendance/schedule`, {
      method: "POST",
      body: JSON.stringify({ subject_id, day_of_week, start_time, end_time }),
    }),
  deleteScheduleEntry: (id) => request(`/attendance/schedule/${id}`, { method: "DELETE" }),

  getFiles: () => request(`/files`),
  uploadFile: (filename, mime_type, data_base64) =>
    request(`/files`, { method: "POST", body: JSON.stringify({ filename, mime_type, data_base64 }) }),
  deleteFile: (id) => request(`/files/${id}`, { method: "DELETE" }),

  getCustomSyllabus: () => request(`/syllabus/custom`),
  addCustomSubject: (subject_key, name) =>
    request(`/syllabus/custom/subjects`, { method: "POST", body: JSON.stringify({ subject_key, name }) }),
  deleteCustomSubject: (subject_key) =>
    request(`/syllabus/custom/subjects/${encodeURIComponent(subject_key)}`, { method: "DELETE" }),
  addCustomTopic: (subject_key, title) =>
    request(`/syllabus/custom/topics`, { method: "POST", body: JSON.stringify({ subject_key, title }) }),
  deleteCustomTopic: (id) => request(`/syllabus/custom/topics/${id}`, { method: "DELETE" }),
};

export async function downloadExport() {
  const token = getToken();
  const res = await fetch(`${API_URL}/export`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Export failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `daytrack-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function downloadFile(id, filename) {
  const token = getToken();
  const res = await fetch(`${API_URL}/files/${id}/download`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export { getToken };
