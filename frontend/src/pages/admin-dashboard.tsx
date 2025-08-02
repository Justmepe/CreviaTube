import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Users, TrendingUp, DollarSign, AlertTriangle, Shield, BarChart3 } from "lucide-react";

export default function AdminDashboard() {
  const { user } = useAuth();

  const navigation = [
    { name: "Overview", href: "/", icon: BarChart3, current: true },
    { name: "Users", href: "/users", icon: Users },
    { name: "Campaigns", href: "/campaigns", icon: TrendingUp },
    { name: "Payouts", href: "/payouts", icon: DollarSign },
    { name: "Security", href: "/security", icon: Shield },
  ];

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Platform overview and management</p>
        </div>

        {/* Admin Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">1,247</p>
                  <p className="text-sm text-success-600">+15% this month</p>
                </div>
                <div className="p-3 bg-primary-50 rounded-lg">
                  <Users className="w-6 h-6 text-primary-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Campaigns</p>
                  <p className="text-2xl font-bold text-gray-900">89</p>
                  <p className="text-sm text-primary-600">+8 new today</p>
                </div>
                <div className="p-3 bg-success-50 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-success-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Platform Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">KES 45K</p>
                  <p className="text-sm text-accent-600">20% commission</p>
                </div>
                <div className="p-3 bg-accent-50 rounded-lg">
                  <DollarSign className="w-6 h-6 text-accent-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Reviews</p>
                  <p className="text-2xl font-bold text-gray-900">12</p>
                  <p className="text-sm text-red-600">Needs attention</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Content Placeholder */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent User Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-2" />
                <p>User activity tracking</p>
                <p className="text-sm">Monitor platform usage and engagement</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Health</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Shield className="w-12 h-12 mx-auto mb-2" />
                <p>System monitoring</p>
                <p className="text-sm">Platform performance and security metrics</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
