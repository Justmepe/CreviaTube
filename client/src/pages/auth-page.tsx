import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AlertCircle, 
  CheckCircle, 
  Users, 
  TrendingUp, 
  Globe,
  DollarSign,
  Shield,
  Zap,
  Star,
  ArrowRight,
  Play,
  Sparkles
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [registerData, setRegisterData] = useState({
    username: "",
    email: "",
    password: "",
    fullName: "",
    role: "clipper" as const,
    userType: undefined as "trader_creator" | "influencer" | "entrepreneur" | "enterprise" | undefined,
    phoneNumber: "",
  });

  // Redirect if already logged in
  if (user) {
    setLocation("/");
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginData);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate(registerData);
  };

  const features = [
    {
      icon: TrendingUp,
      title: "Global Creator Network",
      description: "Connect with 10,000+ creators worldwide across trading, social media, and business sectors"
    },
    {
      icon: DollarSign,
      title: "Automated Escrow System",
      description: "Secure payments with automatic goal completion and instant payouts via M-Pesa, PayPal & more"
    },
    {
      icon: Shield,
      title: "AI-Powered Content Protection",
      description: "Advanced bot detection and AI content filtering ensures authentic user-generated content only"
    },
    {
      icon: Globe,
      title: "Multi-Platform Integration",
      description: "Track performance across Instagram, TikTok, YouTube, Twitter, and 25+ trading brokers"
    }
  ];

  const stats = [
    { value: "$2.5M+", label: "Paid to Creators" },
    { value: "50K+", label: "Campaigns Completed" },
    { value: "180+", label: "Countries Supported" },
    { value: "99.8%", label: "Uptime Guarantee" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25 dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.5))]"></div>
      <div className="absolute top-0 right-0 -mt-4 -mr-16 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 -mb-4 -ml-16 w-80 h-80 bg-gradient-to-tr from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl"></div>

      <div className="relative z-10 min-h-screen flex">
        {/* Left Column - Hero Section */}
        <div className="hidden lg:flex lg:flex-1 flex-col justify-center px-12 py-16">
          <div className="max-w-xl">
            {/* Logo & Branding */}
            <div className="flex items-center space-x-4 mb-8">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 via-purple-600 to-teal-500 rounded-2xl flex items-center justify-center shadow-2xl">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                  <Star className="w-3 h-3 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 bg-clip-text text-transparent">
                  CreoCash
                </h1>
                <p className="text-slate-600 font-medium">Global Creator Economy Platform</p>
              </div>
            </div>

            {/* Hero Content */}
            <div className="space-y-6 mb-12">
              <h2 className="text-5xl font-bold text-slate-800 leading-tight">
                Monetize Your 
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Creative Content</span>
              </h2>
              <p className="text-xl text-slate-600 leading-relaxed">
                Join the world's most advanced affiliate marketing platform designed for creators. 
                Track performance, complete goals, and get paid automatically with our intelligent escrow system.
              </p>
            </div>

            {/* Feature Grid */}
            <div className="grid grid-cols-2 gap-6 mb-12">
              {features.map((feature, index) => (
                <div key={index} className="group">
                  <div className="flex items-start space-x-3 p-4 rounded-xl bg-white/50 backdrop-blur-sm border border-white/20 hover:bg-white/70 transition-all duration-300 hover:shadow-lg hover:scale-105">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <feature.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 mb-1">{feature.title}</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-sm text-slate-600 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Auth Forms */}
        <div className="flex-1 lg:max-w-lg flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            {/* Mobile Logo */}
            <div className="lg:hidden text-center mb-8">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">CreoCash</span>
              </div>
              <p className="text-slate-600 text-lg">Global Creator Economy Platform</p>
            </div>

            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8">
              <Tabs defaultValue="login" className="w-full">
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
                      {loginMutation.isPending ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>Signing In...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span>Sign In</span>
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register" className="mt-6">
                  <form onSubmit={handleRegister} className="space-y-6">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="fullName" className="text-slate-700 font-medium">Full Name</Label>
                          <Input
                            id="fullName"
                            type="text"
                            value={registerData.fullName}
                            onChange={(e) => setRegisterData(prev => ({ ...prev, fullName: e.target.value }))}
                            required
                            className="h-12 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl"
                            placeholder="Your full name"
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
                            className="h-12 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl"
                            placeholder="Choose username"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-slate-700 font-medium">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={registerData.email}
                          onChange={(e) => setRegisterData(prev => ({ ...prev, email: e.target.value }))}
                          required
                          className="h-12 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl"
                          placeholder="your@email.com"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phoneNumber" className="text-slate-700 font-medium">Phone Number</Label>
                        <Input
                          id="phoneNumber"
                          type="tel"
                          value={registerData.phoneNumber}
                          onChange={(e) => setRegisterData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                          className="h-12 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl"
                          placeholder="+254 712 345 678"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="userType" className="text-slate-700 font-medium">Creator Type</Label>
                        <Select 
                          value={registerData.userType} 
                          onValueChange={(value) => setRegisterData(prev => ({ ...prev, userType: value as any }))}
                        >
                          <SelectTrigger className="h-12 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl">
                            <SelectValue placeholder="Select your creator type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="trader_creator">Trading Educator</SelectItem>
                            <SelectItem value="influencer">Social Influencer</SelectItem>
                            <SelectItem value="entrepreneur">Business Entrepreneur</SelectItem>
                            <SelectItem value="enterprise">Enterprise</SelectItem>
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
                          className="h-12 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl"
                          placeholder="Create a strong password"
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
                      {registerMutation.isPending ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>Creating Account...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span>Create Account</span>
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </div>

            {/* Footer */}
            <div className="text-center mt-8 text-slate-500 text-sm">
              <p>Join 50,000+ creators earning with CreoCash</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}