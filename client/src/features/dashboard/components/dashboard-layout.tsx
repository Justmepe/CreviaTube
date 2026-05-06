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
  Wallet,
  LogOut,
  User,
  Settings,
  Building,
  Star,
  Folder,
  Crown,
  Users as UsersIcon
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
        { name: "Campaigns", href: "/campaigns", icon: TrendingUp },
        { name: "Clipper Directory", href: "/clipper-directory", icon: Star },
        { name: "Payouts", href: "/admin/payouts", icon: DollarSign },
        { name: "Revenue", href: "/admin/revenue", icon: Activity },
      ];
    }

    if (user?.role === "clipper") {
      return [
        { name: "Dashboard", href: "/", icon: BarChart3 },
        { name: "Marketplace", href: "/marketplace", icon: TrendingUp },
        { name: "My Campaigns", href: "/campaigns", icon: Users },
        { name: "Top Clippers", href: "/clipper-directory", icon: Star },
        { name: "Premium", href: "/premium", icon: Crown },
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
      { name: "Premium", href: "/premium", icon: Crown },
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
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex-1"
                onClick={() => window.location.href = '/settings'}
              >
                <Settings className="h-4 w-4" />
              </Button>
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