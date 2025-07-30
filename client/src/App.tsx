import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import CreatorDashboard from "@/pages/creator-dashboard";
import ClipperDashboard from "@/pages/clipper-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import MetricsDashboard from "@/pages/metrics-dashboard";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={() => <DashboardRouter />} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function DashboardRouter() {
  const { user } = useAuth();
  
  if (!user) return null;
  
  switch (user.role) {
    case "creator":
      return <CreatorDashboard />;
    case "clipper":
      return <ClipperDashboard />;
    case "admin":
      return <AdminDashboard />;
    default:
      return <CreatorDashboard />;
  }
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
