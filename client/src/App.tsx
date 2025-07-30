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
import CampaignCreation from "@/pages/campaign-creation";
import CampaignsList from "@/pages/campaigns-list";
import ClipperMarketplace from "@/pages/clipper-marketplace";
import EnhancedClipperMarketplace from "@/pages/enhanced-clipper-marketplace";
import CampaignsMarketplace from "@/pages/campaigns-marketplace";
import Payouts from "@/pages/payouts";
import AdminUsers from "@/pages/admin-users";
import CampaignFunding from "@/pages/campaign-funding";
import SocialIntegration from "@/pages/social-integration";
import BrokerIntegration from "@/pages/broker-integration";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={() => <DashboardRouter />} />
      <ProtectedRoute path="/metrics" component={MetricsDashboard} />
      <ProtectedRoute path="/campaigns" component={() => {
        const { user } = useAuth();
        return user?.role === "clipper" ? <CampaignsMarketplace /> : <CampaignsList />;
      }} />
      <ProtectedRoute path="/campaigns/new" component={CampaignCreation} />
      <ProtectedRoute path="/campaigns/:id/funding" component={CampaignFunding} />
      <ProtectedRoute path="/social-integration" component={SocialIntegration} />
      <ProtectedRoute path="/marketplace" component={EnhancedClipperMarketplace} />
      <ProtectedRoute path="/clippers" component={EnhancedClipperMarketplace} />
      <ProtectedRoute path="/channels" component={MetricsDashboard} />
      <ProtectedRoute path="/broker" component={BrokerIntegration} />
      <ProtectedRoute path="/analytics" component={MetricsDashboard} />
      <ProtectedRoute path="/creators" component={EnhancedClipperMarketplace} />
      <ProtectedRoute path="/payouts" component={Payouts} />
      <ProtectedRoute path="/admin/users" component={AdminUsers} />
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
