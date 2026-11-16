import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

/** Ported from the Baseplate template's ThemeContext (same storage key). */

interface ThemeValue {
  isDark: boolean;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeValue>({ isDark: false, toggle: () => {} });

function readStoredDarkMode(): boolean {
  try {
    return JSON.parse(localStorage.getItem('darkMode') || 'false') === true;
  } catch {
    return false;
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(readStoredDarkMode);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    try {
      localStorage.setItem('darkMode', JSON.stringify(isDark));
    } catch {
      /* dark mode simply won't persist */
    }
  }, [isDark]);

  return <ThemeContext.Provider value={{ isDark, toggle: () => setIsDark((v) => !v) }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
