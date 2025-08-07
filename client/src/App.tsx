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
import ProfileSettings from "@/pages/profile-settings";
import ComprehensiveAdminDashboard from "@/pages/comprehensive-admin-dashboard";
import AdminRevenue from "@/pages/admin-revenue";
import AdminPayouts from "@/pages/admin-payouts";
import BotMonitoring from "@/pages/bot-monitoring";
import ClipperApplication from "@/pages/clipper-application";
import CreatorApplicationReview from "@/pages/creator-application-review";
import AdminAnalytics from "@/pages/admin-analytics";
import RealRevenueAnalytics from "@/pages/real-revenue-analytics";
import EnhancedCampaignCreation from "@/pages/enhanced-campaign-creation";
import CampaignsEnhanced from "@/pages/campaigns-enhanced";
import PersonalizedBrokerLinks from "@/pages/personalized-broker-links";
import EnterpriseAdmin from "@/pages/enterprise-admin";
import EnterpriseAccounts from "@/pages/enterprise-accounts";
import EnterprisePortal from "@/pages/enterprise-portal";
import EnterpriseDashboard from "@/pages/enterprise-dashboard";
import ClipperDirectoryPage from "@/pages/clipper-directory";
import MyCampaignsPage from "@/pages/my-campaigns";
import ColdOutreachCampaign from "@/pages/cold-outreach-campaign";
import PlatformReviews from "@/pages/platform-reviews";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={() => <DashboardRouter />} />
      <ProtectedRoute path="/metrics" component={MetricsDashboard} />
      <ProtectedRoute path="/campaigns" component={() => {
        const { user } = useAuth();
        return user?.role === "clipper" ? <CampaignsMarketplace /> : <CampaignsEnhanced />;
      }} />
      <ProtectedRoute path="/campaigns/create" component={CampaignCreation} />
      <ProtectedRoute path="/campaigns/create-enhanced" component={EnhancedCampaignCreation} />
      <ProtectedRoute path="/campaigns/new" component={CampaignCreation} />
      <ProtectedRoute path="/cold-outreach-campaign" component={ColdOutreachCampaign} />
      <ProtectedRoute path="/campaigns/:id/funding" component={CampaignFunding} />
      <ProtectedRoute path="/campaigns/:id/apply" component={ClipperApplication} />
      <ProtectedRoute path="/creator/applications" component={CreatorApplicationReview} />
      <ProtectedRoute path="/social-integration" component={SocialIntegration} />
      <ProtectedRoute path="/marketplace" component={EnhancedClipperMarketplace} />
      <ProtectedRoute path="/clippers" component={EnhancedClipperMarketplace} />
      <ProtectedRoute path="/channels" component={MetricsDashboard} />
      <ProtectedRoute path="/broker" component={PersonalizedBrokerLinks} />
      <ProtectedRoute path="/broker-links" component={PersonalizedBrokerLinks} />
      <ProtectedRoute path="/analytics" component={MetricsDashboard} />
      <ProtectedRoute path="/creators" component={EnhancedClipperMarketplace} />
      <ProtectedRoute path="/payouts" component={Payouts} />
      <ProtectedRoute path="/settings" component={ProfileSettings} />
      <ProtectedRoute path="/admin/control" component={ComprehensiveAdminDashboard} />
      <ProtectedRoute path="/admin/revenue" component={AdminRevenue} />
      <ProtectedRoute path="/admin/payouts" component={AdminPayouts} />
      <ProtectedRoute path="/admin/bot-monitoring" component={BotMonitoring} />
      <ProtectedRoute path="/admin/users" component={AdminUsers} />
      <ProtectedRoute path="/admin/real-analytics" component={RealRevenueAnalytics} />
      <ProtectedRoute path="/admin/analytics" component={RealRevenueAnalytics} />
      <ProtectedRoute path="/enterprise" component={EnterpriseAdmin} />
      <ProtectedRoute path="/enterprise-accounts" component={EnterpriseAccounts} />
      <ProtectedRoute path="/enterprise-portal" component={EnterprisePortal} />
      <ProtectedRoute path="/clipper-directory" component={ClipperDirectoryPage} />
      <ProtectedRoute path="/my-campaigns" component={MyCampaignsPage} />
      <ProtectedRoute path="/reviews" component={PlatformReviews} />
      <ProtectedRoute path="/platform-reviews" component={PlatformReviews} />
      <ProtectedRoute path="/admin" component={RealRevenueAnalytics} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function DashboardRouter() {
  const { user } = useAuth();
  
  if (!user) return null;
  
  // Enterprise users get the enterprise dashboard regardless of their role
  if (user.userType === "enterprise") {
    return <EnterpriseDashboard />;
  }
  
  switch (user.role) {
    case "creator":
      return <CreatorDashboard />;
    case "clipper":
      return <ClipperDashboard />;
    case "admin":
      return <ComprehensiveAdminDashboard />;
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
