import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import ScanQR from "./pages/ScanQR";
import AIAgent from "./pages/AIAgent";
import Profile from "./pages/Profile";
import Claim from "./pages/Claim";
import ClaimDetail from "./pages/ClaimDetail";
import Onboarding from "./pages/Onboarding";
import MyPolicies from "./pages/MyPolicies";
import PublicClaim from "./pages/PublicClaim";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/my-policies" element={<MyPolicies />} />
          <Route path="/scan" element={<ScanQR />} />
          <Route path="/ai-agent" element={<AIAgent />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/claim" element={<Claim />} />
          <Route path="/claim/:id" element={<ClaimDetail />} />
          <Route path="/p/:token" element={<PublicClaim />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
