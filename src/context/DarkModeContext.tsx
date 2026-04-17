import React, { createContext, useContext, useEffect } from "react";

interface DarkModeContextType {
  isDark: boolean;
  toggleDark: () => void;
}

const DarkModeContext = createContext<DarkModeContextType>({ isDark: true, toggleDark: () => {} });

export function DarkModeProvider({ children }: { children: React.ReactNode }) {
  // Modo escuro SEMPRE ativo
  useEffect(() => {
    document.documentElement.classList.add("dark");
    localStorage.setItem("kefel_dark", "true");
  }, []);

  return (
    <DarkModeContext.Provider value={{ isDark: true, toggleDark: () => {} }}>
      {children}
    </DarkModeContext.Provider>
  );
}

export function useDarkMode() {
  return useContext(DarkModeContext);
}
