import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute, PaidRoute, AdminRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Pricing from "./pages/Pricing";
import Dashboard from "./pages/Dashboard";
import Simulation from "./pages/Simulation";
import Results from "./pages/Results";
import Admin from "./pages/Admin";
import PaymentSuccess from "./pages/PaymentSuccess";
import Briefing from "./pages/Briefing";
import SectionTransition from "./pages/SectionTransition";
import Practice from "./pages/Practice";
import Tips from "./pages/Tips";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/payment-success" element={<PaymentSuccess />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/simulation" element={<ProtectedRoute><Simulation /></ProtectedRoute>} />
              <Route path="/exam/:setId/briefing" element={<ProtectedRoute><Briefing /></ProtectedRoute>} />
              <Route path="/exam/briefing" element={<ProtectedRoute><Briefing /></ProtectedRoute>} />
              <Route path="/exam/transition" element={<ProtectedRoute><SectionTransition /></ProtectedRoute>} />
              <Route path="/practice" element={<ProtectedRoute><Practice /></ProtectedRoute>} />
              <Route path="/tips" element={<ProtectedRoute><Tips /></ProtectedRoute>} />
              <Route path="/tips/:slug" element={<ProtectedRoute><Tips /></ProtectedRoute>} />
              <Route path="/results/:attemptId" element={<ProtectedRoute><Results /></ProtectedRoute>} />
              <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
