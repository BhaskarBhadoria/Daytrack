import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import SleepLog from "./pages/SleepLog.jsx";
import WeeklyReport from "./pages/WeeklyReport.jsx";

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
        <Link to="/sleep">Sleep</Link>
        <Link to="/report">Weekly Report</Link>
      </div>
      <div className="navbar-user">
        <span>Hi, {user.name}</span>
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

export default function App() {
  return (
    <BrowserRouter>
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
        </Routes>
      </div>
    </BrowserRouter>
  );
}
