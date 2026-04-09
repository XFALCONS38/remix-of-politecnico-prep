import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Theme = "light" | "dark";
type Lang = "en" | "it";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  lang: Lang;
  setLang: (lang: Lang) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggleTheme: () => {},
  lang: "en",
  setLang: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, user } = useAuth();

  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || stored === "light") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem("ui_lang");
    if (stored === "en" || stored === "it") return stored;
    return "en";
  });

  // Sync lang from profile on login
  useEffect(() => {
    if (profile && (profile as any).preferred_lang) {
      const pLang = (profile as any).preferred_lang as string;
      if (pLang === "en" || pLang === "it") {
        setLangState(pLang);
        localStorage.setItem("ui_lang", pLang);
      }
    }
  }, [profile]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem("ui_lang", newLang);
    // Persist to profile if logged in
    if (user) {
      (supabase as any).from("profiles").update({ preferred_lang: newLang }).eq("id", user.id);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, lang, setLang }}>
      {children}
    </ThemeContext.Provider>
  );
};
