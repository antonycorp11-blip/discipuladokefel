import React, { createContext, useContext, useState, useEffect } from "react";

interface DarkModeContextType {
  isDark: boolean;
  toggleDark: () => void;
}

const DarkModeContext = createContext<DarkModeContextType>({ isDark: false, toggleDark: () => {} });

export function DarkModeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem("kefel_dark") === "true";
  });

  useEffect(() => {
    const html = document.documentElement;
    if (isDark) {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
    localStorage.setItem("kefel_dark", String(isDark));
  }, [isDark]);

  const toggleDark = () => setIsDark(prev => !prev);

  return (
    <DarkModeContext.Provider value={{ isDark, toggleDark }}>
      {children}
    </DarkModeContext.Provider>
  );
}

export function useDarkMode() {
  return useContext(DarkModeContext);
}
