import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import {
  CalendarCheck2,
  Clock4,
  Moon,
  BarChart3,
  CalendarDays,
  BookOpenCheck,
  ClipboardCheck,
  FileText,
  Settings as SettingsIcon,
  LogOut,
  Sun,
  MoonStar,
} from "lucide-react";
import { useAuth } from "./context/AuthContext.jsx";
import { useTheme } from "./context/ThemeContext.jsx";
import { useReminders } from "./hooks/useReminders.js";
import { getDailyDoodleDataUri } from "./utils/dailyDoodle.js";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import SleepLog from "./pages/SleepLog.jsx";
import WeeklyReport from "./pages/WeeklyReport.jsx";
import MonthlyView from "./pages/MonthlyView.jsx";
import Settings from "./pages/Settings.jsx";
import Timetable from "./pages/Timetable.jsx";
import Syllabus from "./pages/Syllabus.jsx";
import Attendance from "./pages/Attendance.jsx";
import Files from "./pages/Files.jsx";
import Avatar from "./components/Avatar.jsx";

const NAV_ITEMS = [
  { to: "/", label: "Today", icon: CalendarCheck2 },
  { to: "/timetable", label: "Timetable", icon: Clock4 },
  { to: "/attendance", label: "Attendance", icon: ClipboardCheck },
  { to: "/sleep", label: "Sleep", icon: Moon },
  { to: "/report", label: "Weekly", icon: BarChart3 },
  { to: "/monthly", label: "Monthly", icon: CalendarDays },
  { to: "/syllabus", label: "Syllabus", icon: BookOpenCheck },
  { to: "/files", label: "Files", icon: FileText },
];

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function Sidebar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  if (!user) return null;

  return (
    <nav className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-brand-mark">◆</span>
        <span className="sidebar-brand-text">DayTrack</span>
      </div>

      <div className="sidebar-links">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to;
          return (
            <Link key={to} to={to} className={`sidebar-link ${active ? "active" : ""}`}>
              <Icon size={18} strokeWidth={2} />
              <span>{label}</span>
            </Link>
          );
        })}
        <Link
          to="/settings"
          className={`sidebar-link ${location.pathname === "/settings" ? "active" : ""}`}
        >
          <SettingsIcon size={18} strokeWidth={2} />
          <span>Settings</span>
        </Link>
        <button className="sidebar-link theme-toggle" onClick={toggleTheme} type="button">
          {theme === "dark" ? <Sun size={18} strokeWidth={2} /> : <MoonStar size={18} strokeWidth={2} />}
          <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
        </button>
      </div>

      <div className="sidebar-footer">
        <Avatar name={user.name} size={34} />
        <span className="sidebar-user-name">{user.name}</span>
        <button
          className="sidebar-logout"
          title="Log out"
          onClick={() => {
            logout();
            navigate("/login");
          }}
        >
          <LogOut size={17} strokeWidth={2} />
        </button>
      </div>
    </nav>
  );
}

function ReminderRunner() {
  const { user } = useAuth();
  useReminders(!!user);
  return null;
}

function AppShell() {
  const { user } = useAuth();
  const { theme } = useTheme();

  useEffect(() => {
    if (!user) {
      document.body.style.backgroundImage = "";
      return;
    }
    const doodleColor = theme === "dark" ? "#4a5a50" : "#bcdbc9";
    document.body.style.backgroundImage = getDailyDoodleDataUri(doodleColor);
    document.body.style.backgroundRepeat = "repeat";
    document.body.style.backgroundSize = "700px 700px";
    document.body.style.backgroundAttachment = "fixed";
  }, [user, theme]);
  const doodleColor = theme === "dark" ? "#39453d" : "#d3e6dc";
  const doodleStyle = user
    ? {
        backgroundImage: getDailyDoodleDataUri(doodleColor),
        backgroundRepeat: "repeat",
        backgroundSize: "480px 480px",
      }
    : undefined;


  return (
    <div className={user ? "app-shell with-sidebar" : "app-shell"} style={doodleStyle}>
      <Sidebar />
      <main className="page-container">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/sleep"
            element={
              <PrivateRoute>
                <SleepLog />
              </PrivateRoute>
            }
          />
          <Route
            path="/report"
            element={
              <PrivateRoute>
                <WeeklyReport />
              </PrivateRoute>
            }
          />
          <Route
            path="/timetable"
            element={
              <PrivateRoute>
                <Timetable />
              </PrivateRoute>
            }
          />
          <Route
            path="/attendance"
            element={
              <PrivateRoute>
                <Attendance />
              </PrivateRoute>
            }
          />
          <Route
            path="/monthly"
            element={
              <PrivateRoute>
                <MonthlyView />
              </PrivateRoute>
            }
          />
          <Route
            path="/syllabus"
            element={
              <PrivateRoute>
                <Syllabus />
              </PrivateRoute>
            }
          />
          <Route
            path="/files"
            element={
              <PrivateRoute>
                <Files />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <PrivateRoute>
                <Settings />
              </PrivateRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ReminderRunner />
      <AppShell />
    </BrowserRouter>
  );
}
