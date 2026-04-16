import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Moon, Sun, LogOut, ShieldCheck, GraduationCap } from "lucide-react";

interface SiteHeaderProps {
  showAuth?: boolean;
  showDashboard?: boolean;
}

const SiteHeader = ({ showAuth = true, showDashboard = false }: SiteHeaderProps) => {
  const { user, profile, signOut, isAdmin, viewMode, setViewMode } = useAuth();
  const { theme, toggleTheme, lang, setLang } = useTheme();
  const navigate = useNavigate();

  const switchView = (mode: "admin" | "student") => {
    setViewMode(mode);
    navigate(mode === "admin" ? "/admin" : "/dashboard");
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
      <div className="container flex h-14 items-center justify-between gap-2">
        <Link to="/" className="text-xl font-bold tracking-tight text-foreground">
          TILPrep
        </Link>
        <div className="flex items-center gap-2">
          {/* Admin view toggle */}
          {user && isAdmin && (
            <div className="flex items-center rounded-md border bg-background p-0.5">
              <button
                onClick={() => switchView("admin")}
                className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                  viewMode === "admin" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
                title="Admin View"
              >
                <ShieldCheck className="h-3 w-3" /> Admin
              </button>
              <button
                onClick={() => switchView("student")}
                className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                  viewMode === "student" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
                title="Student View"
              >
                <GraduationCap className="h-3 w-3" /> Student
              </button>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLang(lang === "en" ? "it" : "en")}
            className="gap-1 text-xs"
          >
            {lang === "en" ? "🇮🇹 IT" : "🇬🇧 EN"}
          </Button>

          <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {showAuth && (
            <>
              {user ? (
                <div className="flex items-center gap-2">
                  <span className="hidden text-sm text-muted-foreground sm:inline">{profile?.email}</span>
                  {showDashboard && (
                    <Link to={isAdmin && viewMode === "admin" ? "/admin" : "/dashboard"}>
                      <Button variant="outline" size="sm">
                        {isAdmin && viewMode === "admin" ? "Admin" : "Dashboard"}
                      </Button>
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
