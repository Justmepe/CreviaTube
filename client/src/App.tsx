import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/features/auth/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import LandingPage from "@/pages/landing-page";

import ClipperDashboard from "@/features/dashboard/components/clipper-dashboard";
import AdminDashboard from "@/features/admin/components/admin-dashboard";
import MetricsDashboard from "@/pages/metrics-dashboard";
import CampaignCreation from "@/pages/campaign-creation";
import CampaignsList from "@/pages/campaigns-list";
import ClipperMarketplace from "@/pages/clipper-marketplace";
import EnhancedClipperMarketplace from "@/pages/enhanced-clipper-marketplace";
import CampaignsMarketplace from "@/pages/campaigns-marketplace";
import Payouts from "@/features/payments/components/payouts";
import AdminUsers from "@/features/admin/components/admin-users";
import CampaignFunding from "@/pages/campaign-funding";
import SocialIntegration from "@/pages/social-integration";
import BrokerIntegration from "@/pages/broker-integration";
import ProfileSettings from "@/features/profile/components/profile-settings";
import ComprehensiveAdminDashboard from "@/features/admin/components/admin-dashboard";
import AdminRevenue from "@/features/admin/components/admin-revenue";
import AdminPayouts from "@/features/admin/components/admin-payouts";
import BotMonitoring from "@/pages/bot-monitoring";
import ClipperApplication from "@/pages/clipper-application";
import CreatorApplicationReview from "@/pages/creator-application-review";
import AdminAnalytics from "@/features/admin/components/admin-analytics";
import RealRevenueAnalytics from "@/pages/real-revenue-analytics";
import EnhancedCampaignCreation from "@/pages/enhanced-campaign-creation";
import CampaignsEnhanced from "@/pages/campaigns-enhanced";
import PersonalizedBrokerLinks from "@/pages/personalized-broker-links";
import EnterpriseAdmin from "@/pages/enterprise-admin";
import EnterpriseAccounts from "@/pages/enterprise-accounts";
import EnterprisePortal from "@/pages/enterprise-portal";
import EnterpriseDashboard from "@/features/dashboard/components/enterprise-dashboard";
import EnterpriseRequestDashboard from "@/features/dashboard/components/enterprise-request-dashboard";
import TraderCreatorDashboard from "@/features/dashboard/components/trader-creator-dashboard";
import InfluencerDashboard from "@/features/dashboard/components/influencer-dashboard";
import EntrepreneurDashboard from "@/features/dashboard/components/entrepreneur-dashboard";
import ClipperDirectoryPage from "@/pages/clipper-directory";
import MyCampaignsPage from "@/pages/my-campaigns";
import ColdOutreachCampaign from "@/pages/cold-outreach-campaign";
import PlatformReviews from "@/pages/platform-reviews";
import AboutUs from "@/pages/about-us";
import Status from "@/pages/status";
import TermsOfService from "@/pages/terms-of-service";
import PrivacyPolicy from "@/pages/privacy-policy";
import HelpCenter from "@/pages/help-center";
import Contact from "@/pages/contact";
import Careers from "@/pages/careers";
import CommunityGuidelines from "@/pages/community-guidelines";
import Events from "@/pages/events";

function HomeRoute() {
  const { user } = useAuth();
  return user ? <DashboardRouter /> : <LandingPage />;
}

function CampaignsRoute() {
  const { user } = useAuth();
  return user?.role === "clipper" ? <CampaignsMarketplace /> : <CampaignsEnhanced />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRoute} />
      <Route path="/landing" component={LandingPage} />
      <ProtectedRoute path="/metrics" component={MetricsDashboard} />
      <ProtectedRoute path="/campaigns" component={CampaignsRoute} />
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
      <ProtectedRoute path="/enterprise" component={EnterprisePortal} />
      <ProtectedRoute path="/enterprise-admin" component={EnterpriseAdmin} />
      <ProtectedRoute path="/enterprise-accounts" component={EnterpriseAccounts} />
      <ProtectedRoute path="/enterprise-portal" component={EnterprisePortal} />
      <ProtectedRoute path="/clipper-directory" component={ClipperDirectoryPage} />
      <ProtectedRoute path="/my-campaigns" component={MyCampaignsPage} />
      <ProtectedRoute path="/reviews" component={PlatformReviews} />
      <ProtectedRoute path="/platform-reviews" component={PlatformReviews} />
      <ProtectedRoute path="/admin" component={RealRevenueAnalytics} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/about-us" component={AboutUs} />
      <Route path="/status" component={Status} />
      <Route path="/terms-of-service" component={TermsOfService} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/help-center" component={HelpCenter} />
      <Route path="/contact" component={Contact} />
      <Route path="/careers" component={Careers} />
      <Route path="/community-guidelines" component={CommunityGuidelines} />
      <Route path="/events" component={Events} />
      <Route component={NotFound} />
    </Switch>
  );
}

function DashboardRouter() {
  const { user } = useAuth();
  
  if (!user) return null;
  
  // Route users to appropriate dashboards based on their type and status
  
  // Admin users always get admin dashboard
  if (user.role === "admin") {
    return <ComprehensiveAdminDashboard />;
  }
  
  // Enterprise users need special handling based on approval status
  if (user.userType === "enterprise") {
    // Check if they have an approved enterprise account, otherwise show request form
    return <EnterpriseRequestDashboard />;
  }
  
  // Route based on specific user types only
  if (user.userType === "trader_creator") {
    return <TraderCreatorDashboard />;
  }
  
  if (user.userType === "influencer") {
    return <InfluencerDashboard />;
  }
  
  if (user.userType === "entrepreneur") {
    return <EntrepreneurDashboard />;
  }
  
  // Only clippers get clipper dashboard
  if (user.role === "clipper") {
    return <ClipperDashboard />;
  }
  
  // Users without specific type should be redirected to select their type
  return <ClipperDashboard />;
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
