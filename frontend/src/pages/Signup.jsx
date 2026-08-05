import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useDailyPhoto } from "../hooks/useDailyPhoto.js";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const photo = useDailyPhoto();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.signup({ name, email, password });
      login(data.token, data.user);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="auth-page"
      style={photo ? { backgroundImage: `url(${photo.url})` } : undefined}
    >
      <div className="auth-form">
        <h1>Create your DayTrack account</h1>
        <form onSubmit={handleSubmit}>
          <label>Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Sign up"}
          </button>
        </form>
        <p>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
      {photo && <span className="auth-photo-credit">{photo.title} — NASA APOD</span>}
    </div>
  );
}
