import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Moon, Sun, LogOut } from "lucide-react";

interface SiteHeaderProps {
  showAuth?: boolean;
  showDashboard?: boolean;
}

const SiteHeader = ({ showAuth = true, showDashboard = false }: SiteHeaderProps) => {
  const { user, profile, signOut } = useAuth();
  const { theme, toggleTheme, lang, setLang } = useTheme();

  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" className="text-xl font-bold tracking-tight text-foreground">
          TILPrep
        </Link>
        <div className="flex items-center gap-2">
          {/* Language toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLang(lang === "en" ? "it" : "en")}
            className="gap-1 text-xs"
          >
            {lang === "en" ? "🇮🇹 IT" : "🇬🇧 EN"}
          </Button>

          {/* Theme toggle */}
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {showAuth && (
            <>
              {user ? (
                <div className="flex items-center gap-2">
                  <span className="hidden text-sm text-muted-foreground sm:inline">{profile?.email}</span>
                  {showDashboard && (
                    <Link to="/dashboard">
                      <Button variant="outline" size="sm">Dashboard</Button>
                    </Link>
                  )}
                  <Button variant="ghost" size="sm" onClick={signOut} className="gap-1">
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">{lang === "en" ? "Sign Out" : "Esci"}</span>
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Link to="/login"><Button variant="ghost" size="sm">{lang === "en" ? "Sign In" : "Accedi"}</Button></Link>
                  <Link to="/register"><Button size="sm">{lang === "en" ? "Sign Up" : "Registrati"}</Button></Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default SiteHeader;
