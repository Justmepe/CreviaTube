import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Users,
  Search,
  Filter,
  Shield,
  Star,
  DollarSign,
  TrendingUp,
  Calendar,
  MoreVertical,
  UserCheck,
  UserX,
  Eye,
  Edit
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: "creator" | "clipper" | "admin";
  userType: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  _count?: {
    campaigns?: number;
    clipperCampaigns?: number;
    trackingEvents?: number;
    payouts?: number;
  };
  stats?: {
    totalEarnings?: number;
    totalSpent?: number;
    successRate?: number;
  };
}

export default function AdminUsers() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<User> }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}`, updates);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User updated",
        description: "User status has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin": return "bg-purple-100 text-purple-800";
      case "creator": return "bg-blue-100 text-blue-800";
      case "clipper": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getUserTypeColor = (userType: string) => {
    switch (userType) {
      case "trader_creator": return "bg-blue-100 text-blue-800";
      case "influencer": return "bg-purple-100 text-purple-800";
      case "entrepreneur": return "bg-green-100 text-green-800";
      case "enterprise": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.fullName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && user.isActive) ||
      (statusFilter === "inactive" && !user.isActive);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const creators = users.filter(u => u.role === "creator");
  const clippers = users.filter(u => u.role === "clipper");
  const admins = users.filter(u => u.role === "admin");
  const activeUsers = users.filter(u => u.isActive);

  if (isLoading) {
    return (
      <DashboardLayout title="User Management">
        <div className="space-y-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="User Management">
      <div className="space-y-6">
        <div>
          <p className="text-muted-foreground">
            Manage users, view platform statistics, and moderate accounts
          </p>
        </div>

        {/* User Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
              <p className="text-xs text-muted-foreground">
                {activeUsers.length} active
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Creators</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{creators.length}</div>
              <p className="text-xs text-muted-foreground">
                Content creators
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clippers</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{clippers.length}</div>
              <p className="text-xs text-muted-foreground">
                Affiliate marketers
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Admins</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{admins.length}</div>
              <p className="text-xs text-muted-foreground">
                Platform managers
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="creator">Creators</SelectItem>
                  <SelectItem value="clipper">Clippers</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {filteredUsers.length} users found
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>
              Manage all platform users and their permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div key={user.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.fullName}`} />
                        <AvatarFallback>
                          {user.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{user.fullName}</h3>
                          <Badge className={getRoleColor(user.role)}>
                            {user.role}
                          </Badge>
                          {user.userType && (
                            <Badge variant="outline" className={getUserTypeColor(user.userType)}>
                              {user.userType.replace('_', ' ')}
                            </Badge>
                          )}
                          {!user.isActive && (
                            <Badge variant="destructive">Inactive</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          @{user.username} • {user.email}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Joined {new Date(user.createdAt).toLocaleDateString()}
                          {user.lastLoginAt && ` • Last login ${new Date(user.lastLoginAt).toLocaleDateString()}`}
                        </div>
                      </div>
                    </div>
                    
                    {/* User Stats */}
                    <div className="hidden md:flex items-center gap-6 text-sm">
                      {user.role === "creator" && (
                        <>
                          <div className="text-center">
                            <div className="font-semibold">{user._count?.campaigns || 0}</div>
                            <div className="text-muted-foreground">Campaigns</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-green-600">
                              {user.stats?.totalSpent ? formatCurrency(user.stats.totalSpent) : "$0"}
                            </div>
                            <div className="text-muted-foreground">Spent</div>
                          </div>
                        </>
                      )}
                      
                      {user.role === "clipper" && (
                        <>
                          <div className="text-center">
                            <div className="font-semibold">{user._count?.clipperCampaigns || 0}</div>
                            <div className="text-muted-foreground">Campaigns</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-green-600">
                              {user.stats?.totalEarnings ? formatCurrency(user.stats.totalEarnings) : "$0"}
                            </div>
                            <div className="text-muted-foreground">Earned</div>
                          </div>
                        </>
                      )}
                    </div>
                    
                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit User
                        </DropdownMenuItem>
                        {user.isActive ? (
                          <DropdownMenuItem
                            onClick={() => updateUserMutation.mutate({ 
                              userId: user.id, 
                              updates: { isActive: false } 
                            })}
                          >
                            <UserX className="h-4 w-4 mr-2" />
                            Deactivate
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => updateUserMutation.mutate({ 
                              userId: user.id, 
                              updates: { isActive: true } 
                            })}
                          >
                            <UserCheck className="h-4 w-4 mr-2" />
                            Activate
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  {/* Mobile Stats */}
                  <div className="md:hidden mt-3 pt-3 border-t">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {user.role === "creator" && (
                        <>
                          <div>
                            <span className="text-muted-foreground">Campaigns: </span>
                            <span className="font-semibold">{user._count?.campaigns || 0}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Spent: </span>
                            <span className="font-semibold text-green-600">
                              {user.stats?.totalSpent ? formatCurrency(user.stats.totalSpent) : "$0"}
                            </span>
                          </div>
                        </>
                      )}
                      
                      {user.role === "clipper" && (
                        <>
                          <div>
                            <span className="text-muted-foreground">Campaigns: </span>
                            <span className="font-semibold">{user._count?.clipperCampaigns || 0}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Earned: </span>
                            <span className="font-semibold text-green-600">
                              {user.stats?.totalEarnings ? formatCurrency(user.stats.totalEarnings) : "$0"}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredUsers.length === 0 && (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No users found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search terms or filters
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}