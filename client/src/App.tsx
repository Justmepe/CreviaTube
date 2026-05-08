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
import CampaignerDashboard from "@/features/dashboard/components/campaigner-dashboard";
import { resolvePersona } from "@/features/personas/resolver";
import AdminMetricsPage from "@/pages/admin-metrics";
import MetricsDashboard from "@/pages/metrics-dashboard";
import CampaignCreation from "@/pages/campaign-creation";
import ClipperMarketplace from "@/pages/clipper-marketplace";
import EnhancedClipperMarketplace from "@/pages/enhanced-clipper-marketplace";
import CampaignsMarketplace from "@/pages/campaigns-marketplace";
import Payouts from "@/features/payments/components/payouts";
import AdminUsers from "@/features/admin/components/admin-users";
import CampaignFunding from "@/pages/campaign-funding";
import SocialIntegration from "@/pages/social-integration";
import ProfileSettings from "@/features/profile/components/profile-settings";
import ComprehensiveAdminDashboard from "@/features/admin/components/admin-dashboard";
import AdminRevenue from "@/features/admin/components/admin-revenue";
import AdminPayouts from "@/features/admin/components/admin-payouts";
import BotMonitoring from "@/pages/bot-monitoring";
import ClipperApplication from "@/pages/clipper-application";
import CreatorApplicationReview from "@/pages/creator-application-review";
import RealRevenueAnalytics from "@/pages/real-revenue-analytics";
import EnhancedCampaignCreation from "@/pages/enhanced-campaign-creation";
import CampaignsEnhanced from "@/pages/campaigns-enhanced";
import ClipperDirectoryPage from "@/pages/clipper-directory";
import ClipperProfilePage from "@/pages/clipper-profile";
import VerifyEmailPage from "@/pages/verify-email";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import MyCampaignsPage from "@/pages/my-campaigns";
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
import PremiumPage from "@/pages/premium";

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
      <Route path="/auth" component={AuthPage} />
      <Route path="/verify-email" component={VerifyEmailPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/landing" component={LandingPage} />
      <ProtectedRoute path="/dashboard" component={DashboardRouter} />
      <ProtectedRoute path="/metrics" component={MetricsDashboard} />
      <ProtectedRoute path="/campaigns" component={CampaignsRoute} />
      <ProtectedRoute path="/campaigns/create" component={CampaignCreation} />
      <ProtectedRoute path="/campaigns/create-enhanced" component={EnhancedCampaignCreation} />
      <ProtectedRoute path="/campaigns/new" component={CampaignCreation} />
      <ProtectedRoute path="/campaigns/:id/funding" component={CampaignFunding} />
      <ProtectedRoute path="/campaigns/:id/apply" component={ClipperApplication} />
      <ProtectedRoute path="/creator/applications" component={CreatorApplicationReview} />
      <ProtectedRoute path="/social-integration" component={SocialIntegration} />
      <ProtectedRoute path="/marketplace" component={EnhancedClipperMarketplace} />
      <ProtectedRoute path="/clippers" component={EnhancedClipperMarketplace} />
      <ProtectedRoute path="/channels" component={MetricsDashboard} />
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
      <ProtectedRoute path="/admin/metrics" component={AdminMetricsPage} />
      <ProtectedRoute path="/admin/analytics" component={RealRevenueAnalytics} />
      <ProtectedRoute path="/clipper-directory" component={ClipperDirectoryPage} />
      <ProtectedRoute path="/clippers/:id" component={ClipperProfilePage} />
      <ProtectedRoute path="/my-campaigns" component={MyCampaignsPage} />
      <ProtectedRoute path="/premium" component={PremiumPage} />
      <ProtectedRoute path="/reviews" component={PlatformReviews} />
      <ProtectedRoute path="/platform-reviews" component={PlatformReviews} />
      <ProtectedRoute path="/admin" component={RealRevenueAnalytics} />
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

function DashboardRouter(): JSX.Element {
  const { user } = useAuth();
  if (!user) return <LandingPage />;

  // Single source of truth: resolvePersona reads (role, accountType,
  // campaignerStage) and tells us which dashboard to show. The three
  // campaigner personas share one component (CampaignerDashboard) which
  // tailors stat labels, copy, and pill colour internally based on
  // resolvePersona — same skeleton, persona-specific framing.
  const persona = resolvePersona(user as any);

  if (persona === "admin") return <ComprehensiveAdminDashboard />;
  if (persona === "clipper") return <ClipperDashboard />;
  return <CampaignerDashboard />; // brand / influencer / founder
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
