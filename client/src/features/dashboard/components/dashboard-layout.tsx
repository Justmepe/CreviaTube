import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { EmailVerificationBanner } from "@/features/auth/components/email-verification-banner";
import {
  BarChart3,
  Users,
  TrendingUp,
  DollarSign,
  Activity,
  Activity as ActivityIcon,
  Wallet,
  LogOut,
  User,
  Settings,
  Building,
  Star,
  Folder,
  Crown,
  Users as UsersIcon,
  FileText,
  ShieldCheck,
} from "lucide-react";

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  current?: boolean;
  badge?: number;
}

interface DashboardLayoutProps {
  children: ReactNode;
  navigation?: NavigationItem[];
  title?: string;
}

export function DashboardLayout({ children, navigation: customNavigation, title }: DashboardLayoutProps) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  // Default navigation based on user type
  const getDefaultNavigation = (): NavigationItem[] => {
    if (user?.role === "admin") {
      return [
        { name: "Dashboard", href: "/", icon: BarChart3 },
        { name: "Users", href: "/admin/users", icon: Users },
        // "Campaigns" used to point at /campaigns which is the
        // creator-facing browse page; that's confusing for an admin
        // who wants the platform-wide view. Pointing at /campaigns
        // still routes through the admin-aware CampaignsRoute so the
        // admin sees all campaigns there. (A dedicated /admin/campaigns
        // page is a Slice for Phase 7-D follow-up if we want it.)
        { name: "Campaigns", href: "/campaigns", icon: TrendingUp },
        { name: "Clipper Directory", href: "/clipper-directory", icon: Star },
        { name: "Payouts", href: "/admin/payouts", icon: DollarSign },
        { name: "Revenue", href: "/admin/revenue", icon: Activity },
        { name: "Metrics", href: "/admin/metrics", icon: BarChart3 },
        // Phase 7 Slice B — refund queue from the Founding Creator
        // guarantee mechanism. Empty 99% of the time but the one
        // place an admin processes USDC refunds.
        { name: "Refunds", href: "/admin/refunds", icon: ShieldCheck },
        // Phase 7 Slice D — surface bot-monitoring and the
        // ComprehensiveAdminDashboard (Control). Both pages existed
        // but weren't linked from anywhere.
        { name: "Bot monitoring", href: "/admin/bot-monitoring", icon: ActivityIcon },
        { name: "Control", href: "/admin/control", icon: Settings },
        // Phase 4 — manual credit for goals we can't auto-verify
        // (X posts, declined-OAuth clippers, disputes). Audited via
        // metric_events.
        { name: "Manual credit", href: "/admin/credit-event", icon: FileText },
      ];
    }

    if (user?.role === "clipper") {
      return [
        { name: "Dashboard", href: "/", icon: BarChart3 },
        { name: "Marketplace", href: "/marketplace", icon: TrendingUp },
        { name: "My Campaigns", href: "/campaigns", icon: Users },
        { name: "Top Clippers", href: "/clipper-directory", icon: Star },
        // Phase 6 Slice A — /premium nav hidden until at least one
        // perk is wired. Route still serves the old page if reached
        // by URL, but nothing in the app links to it.
        { name: "Payouts", href: "/payouts", icon: Wallet },
      ];
    }

    // Creator navigation. No "Payouts" entry — creators fund campaigns,
    // they don't receive payouts. Refunds for unfilled campaigns surface
    // inside My Campaigns.
    return [
      { name: "Dashboard", href: "/", icon: BarChart3 },
      { name: "Metrics", href: "/metrics", icon: Activity },
      { name: "Campaigns", href: "/campaigns", icon: TrendingUp },
      { name: "My Campaigns", href: "/my-campaigns", icon: Folder },
      { name: "Clippers", href: "/clippers", icon: Users },
      { name: "Clipper Directory", href: "/clipper-directory", icon: Star },
      // Phase 6 Slice C — Founding Creator nav re-enabled for creators
      // now that the page advertises a real product (Featured placement
      // is live, badge is live, page copy reflects the offer). Stays
      // hidden for clippers — they'll get their own tier later in
      // Slice H.
      { name: "Founding", href: "/premium", icon: Crown },
    ];
  };

  const navigation = customNavigation || getDefaultNavigation();

  // Mark current page
  const navigationWithCurrent = navigation.map(item => ({
    ...item,
    current: location === item.href
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 shrink-0 items-center px-6 border-b">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-teal-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CT</span>
              </div>
              <span className="ml-2 text-xl font-bold text-gray-900">CreviaTube</span>
            </div>
          </div>

          {/* Navigation — overflow-y-auto so the user menu below stays
               visible regardless of nav length / viewport height */}
          <nav className="flex flex-1 flex-col px-4 py-4 overflow-y-auto min-h-0">
            <ul className="flex flex-col gap-y-1">
              {navigationWithCurrent.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.name}>
                    <Link href={item.href}>
                      <div
                        className={cn(
                          item.current
                            ? "bg-teal-50 text-teal-700 border-r-2 border-teal-500"
                            : "text-gray-700 hover:bg-gray-50 hover:text-gray-900",
                          "group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 transition-colors cursor-pointer items-center justify-between"
                        )}
                      >
                        <div className="flex items-center gap-x-3">
                          <Icon className="h-5 w-5 shrink-0" />
                          {item.name}
                        </div>
                        {item.badge && item.badge > 0 && (
                          <Badge 
                            variant={item.name === 'Enterprise' ? 'destructive' : 'secondary'}
                            className={`text-xs ${
                              item.name === 'Enterprise' ? 'animate-pulse bg-red-500 text-white' : ''
                            }`}
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User menu */}
          <div className="border-t p-4">
            <div className="flex items-center gap-x-3 pb-3">
              <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user?.fullName || user?.username}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {user?.accountType?.replace('_', ' ') || user?.role}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/settings" className="flex-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        <EmailVerificationBanner />
        <main className="py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {title && (
              <div className="mb-8">
                <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                  {title}
                </h1>
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;