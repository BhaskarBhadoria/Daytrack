import { createContext, useContext, useEffect, useState } from "react";

const DoodleContext = createContext(null);

export function DoodleProvider({ children }) {
  const [pattern, setPatternState] = useState(() => localStorage.getItem("daytrack_doodle") || "auto");

  useEffect(() => {
    localStorage.setItem("daytrack_doodle", pattern);
  }, [pattern]);

  return (
    <DoodleContext.Provider value={{ pattern, setPattern: setPatternState }}>
      {children}
    </DoodleContext.Provider>
  );
}

export function useDoodlePreference() {
  return useContext(DoodleContext);
}
