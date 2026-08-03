import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("daytrack_user");
    return stored ? JSON.parse(stored) : null;
  });

  function login(token, user) {
    localStorage.setItem("daytrack_token", token);
    localStorage.setItem("daytrack_user", JSON.stringify(user));
    setUser(user);
  }

  function logout() {
    localStorage.removeItem("daytrack_token");
    localStorage.removeItem("daytrack_user");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
