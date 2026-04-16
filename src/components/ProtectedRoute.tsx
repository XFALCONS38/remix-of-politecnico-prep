import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export const PaidRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, hasActiveAccess, isAdmin } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  // Admins always have access for testing
  if (!hasActiveAccess && !isAdmin) return <Navigate to="/pricing" replace />;
  return <>{children}</>;
};

export const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};
