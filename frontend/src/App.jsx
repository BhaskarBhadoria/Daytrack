import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import { useReminders } from "./hooks/useReminders.js";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import SleepLog from "./pages/SleepLog.jsx";
import WeeklyReport from "./pages/WeeklyReport.jsx";
import MonthlyView from "./pages/MonthlyView.jsx";
import Settings from "./pages/Settings.jsx";
import Timetable from "./pages/Timetable.jsx";
import Avatar from "./components/Avatar.jsx";

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="navbar-brand">DayTrack</div>
      <div className="navbar-links">
        <Link to="/">Today</Link>
        <Link to="/timetable">Timetable</Link>
        <Link to="/sleep">Sleep</Link>
        <Link to="/report">Weekly Report</Link>
        <Link to="/monthly">Monthly</Link>
        <Link to="/settings">Settings</Link>
      </div>
      <div className="navbar-user">
        <Avatar name={user.name} size={32} />
        <span>{user.name}</span>
        <button
          onClick={() => {
            logout();
            navigate("/login");
          }}
        >
          Logout
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

export default function App() {
  return (
    <BrowserRouter>
      <ReminderRunner />
      <NavBar />
      <div className="page-container">
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
            path="/monthly"
            element={
              <PrivateRoute>
                <MonthlyView />
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
      </div>
    </BrowserRouter>
  );
}
