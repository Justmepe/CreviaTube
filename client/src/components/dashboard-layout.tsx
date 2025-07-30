import { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Bell, Menu, Crown } from "lucide-react";
import { Link, useLocation } from "wouter";

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  current?: boolean;
}

interface DashboardLayoutProps {
  children: ReactNode;
  navigation: NavigationItem[];
  user: any;
}

export function DashboardLayout({ children, navigation, user }: DashboardLayoutProps) {
  const { logoutMutation } = useAuth();
  const [location] = useLocation();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-sm">
                  <span className="text-white text-lg font-bold">C</span>
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">CreoCash</span>
              </div>
              <div className="hidden md:flex items-center space-x-1">
                <span className="text-sm text-gray-500">|</span>
                <span className="text-sm font-medium text-primary-600">
                  {user?.role === "creator" ? "Creator Dashboard" : 
                   user?.role === "clipper" ? "Clipper Dashboard" : "Admin Dashboard"}
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent-500 rounded-full"></span>
              </button>
              
              {/* User Menu */}
              <div className="flex items-center space-x-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{user?.fullName}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {user?.fullName?.charAt(0) || user?.username?.charAt(0)}
                </div>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-sm border-r border-gray-200 hidden lg:block">
          <div className="p-6">
            <nav className="space-y-2">
              {navigation.map((item) => {
                const IconComponent = item.icon;
                const isActive = location === item.href;
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors ${
                      isActive
                        ? "text-primary-600 bg-primary-50"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    <IconComponent className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {user?.role === "creator" && (
              <div className="mt-8 p-4 bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Crown className="w-4 h-4 text-accent-500" />
                  <span className="text-sm font-semibold text-gray-800">Upgrade to Pro</span>
                </div>
                <p className="text-xs text-gray-600 mb-3">Get advanced analytics and priority support</p>
                <Button className="w-full text-sm py-2">
                  Upgrade Now
                </Button>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>

      {/* Mobile Menu Toggle */}
      <div className="lg:hidden fixed bottom-6 right-6">
        <Button className="p-4 rounded-full shadow-lg">
          <Menu className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
