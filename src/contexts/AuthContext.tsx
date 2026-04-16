import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type ViewMode = "admin" | "student";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  hasActiveAccess: boolean;
  isAdmin: boolean;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  profile: { id: string; email: string | null; display_name: string | null; access_expiry: string | null; preferred_lang: string | null } | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  hasActiveAccess: false,
  isAdmin: false,
  viewMode: "student",
  setViewMode: () => {},
  profile: null,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const VIEW_MODE_KEY = "tilprep:viewMode";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "student";
    return (localStorage.getItem(VIEW_MODE_KEY) as ViewMode) || "student";
  });

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
  };

  const fetchProfile = async (userId: string) => {
    const { data } = await (supabase as any)
      .from("profiles")
      .select("id, email, display_name, access_expiry, preferred_lang")
      .eq("id", userId)
      .maybeSingle();
    setProfile(data);
  };

  const checkAdmin = async (userId: string) => {
    const { data } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    const adminFlag = !!data;
    setIsAdmin(adminFlag);
    // If admin and no view explicitly chosen yet, default to admin view
    if (adminFlag && !localStorage.getItem(VIEW_MODE_KEY)) {
      setViewMode("admin");
    }
    if (!adminFlag) {
      setViewModeState("student");
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user.id);
          checkAdmin(session.user.id);
        }, 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setViewModeState("student");
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        checkAdmin(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasActiveAccess = !!profile?.access_expiry && new Date(profile.access_expiry) > new Date();

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
    localStorage.removeItem(VIEW_MODE_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, hasActiveAccess, isAdmin, viewMode, setViewMode, profile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
