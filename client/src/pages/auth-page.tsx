import { useState } from "react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AlertCircle, 
  Sparkles,
  Star
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("login");
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [registerData, setRegisterData] = useState({
    username: "",
    email: "",
    password: "",
    fullName: "",
    role: "clipper" as "creator" | "clipper",
    accountType: undefined as "influencer" | "business" | undefined,
    phoneNumber: "",
  });

  const handleAccountTypeChange = (accountType: string) => {
    setRegisterData(prev => ({
      ...prev,
      accountType: accountType as any,
      role: accountType === "influencer" || accountType === "business" ? "creator" : "clipper"
    }));
  };

  // Redirect if user is already logged in
  if (user) {
    setLocation("/");
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      loginMutation.mutate(loginData);
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      registerMutation.mutate(registerData);
    } catch (error) {
      console.error("Registration error:", error);
    }
  };

  const handleBasicInfoChange = (field: string, value: string) => {
    setRegisterData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 via-purple-600 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="relative">
              <span className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 bg-clip-text text-transparent">CreviaTube</span>
              <div className="absolute -top-1 -right-2 w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                <Star className="w-2 h-2 text-white" />
              </div>
            </div>
          </div>
          <p className="text-slate-600 text-base mb-2">Global Creator Economy Platform</p>
          <p className="text-slate-600 text-sm">Monetize your creative content with intelligent affiliate marketing</p>
        </div>

        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1 rounded-xl">
              <TabsTrigger 
                value="login" 
                className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger 
                value="register" 
                className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium"
              >
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-6">
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-slate-700 font-medium">Username</Label>
                    <Input
                      id="username"
                      type="text"
                      value={loginData.username}
                      onChange={(e) => setLoginData(prev => ({ ...prev, username: e.target.value }))}
                      required
                      autoComplete="off"
                      className="h-12 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl"
                      placeholder="Enter your username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={loginData.password}
                      onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                      required
                      autoComplete="new-password"
                      autoSave="off"
                      data-lpignore="true"
                      className="h-12 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl"
                      placeholder="Enter your password"
                    />
                  </div>
                </div>

                {loginMutation.error && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      {loginMutation.error.message}
                    </AlertDescription>
                  </Alert>
                )}

                <Button 
                  type="submit" 
                  disabled={loginMutation.isPending}
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {loginMutation.isPending ? "Signing In..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="mt-6">
              <form onSubmit={handleRegister} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-slate-700 font-medium">Full Name</Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={registerData.fullName}
                      onChange={(e) => handleBasicInfoChange("fullName", e.target.value)}
                      required
                      className="h-12 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl"
                      placeholder="Enter your full name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-700 font-medium">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={registerData.email}
                      onChange={(e) => handleBasicInfoChange("email", e.target.value)}
                      required
                      className="h-12 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl"
                      placeholder="Enter your email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="registerUsername" className="text-slate-700 font-medium">Username</Label>
                    <Input
                      id="registerUsername"
                      type="text"
                      value={registerData.username}
                      onChange={(e) => setRegisterData(prev => ({ ...prev, username: e.target.value }))}
                      required
                      autoComplete="off"
                      className="h-12 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl"
                      placeholder="Choose a username"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber" className="text-slate-700 font-medium">Phone Number (Optional)</Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      value={registerData.phoneNumber}
                      onChange={(e) => setRegisterData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                      className="h-12 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl"
                      placeholder="Enter your phone number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accountType" className="text-slate-700 font-medium">Account Type</Label>
                    <Select value={registerData.accountType || ""} onValueChange={handleAccountTypeChange}>
                      <SelectTrigger className="h-12 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl">
                        <SelectValue placeholder="Select your account type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="influencer">Social Influencer</SelectItem>
                        <SelectItem value="business">Business / Entrepreneur</SelectItem>
                        <SelectItem value="clipper">Content Clipper</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="registerPassword" className="text-slate-700 font-medium">Password</Label>
                    <Input
                      id="registerPassword"
                      type="password"
                      value={registerData.password}
                      onChange={(e) => setRegisterData(prev => ({ ...prev, password: e.target.value }))}
                      required
                      autoComplete="new-password"
                      autoSave="off"
                      data-lpignore="true"
                      className="h-12 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl"
                      placeholder="Create a password"
                    />
                  </div>
                </div>

                {registerMutation.error && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      {registerMutation.error.message}
                    </AlertDescription>
                  </Alert>
                )}

                <Button 
                  type="submit" 
                  disabled={registerMutation.isPending}
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {registerMutation.isPending ? "Creating Account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center text-sm text-slate-600">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </div>
        </div>
      </div>
    </div>
  );
}