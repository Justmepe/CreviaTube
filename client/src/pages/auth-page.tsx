import { useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
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
  Sparkles,
  Quote,
  MessageSquare
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
    role: "clipper" as "creator" | "clipper",
    userType: undefined as "trader_creator" | "influencer" | "entrepreneur" | "enterprise" | undefined,
    phoneNumber: "",
  });
  const [activeTab, setActiveTab] = useState("login");
  const authSectionRef = useRef<HTMLDivElement>(null);

  // Update role automatically based on user type selection
  const handleUserTypeChange = (userType: string) => {
    setRegisterData(prev => ({
      ...prev,
      userType: userType as any,
      // Enterprise users get creator role (they white-label the platform)
      // Creator types (influencer, trader, business) get creator role
      // Regular users without specific types are clippers
      role: userType === "enterprise" || userType === "trader_creator" || userType === "influencer" || userType === "entrepreneur" ? "creator" : "clipper"
    }));
  };

  // Handle Get Started button click
  const handleGetStarted = () => {
    setActiveTab("register");
    authSectionRef.current?.scrollIntoView({ 
      behavior: "smooth", 
      block: "center" 
    });
  };

  // Fetch platform features and stats from API (must be before any conditional returns)
  const { data: features = [] } = useQuery({
    queryKey: ["/api/platform/features"],
  });

  const { data: stats = [] } = useQuery({
    queryKey: ["/api/platform/stats"],
  });

  // Fetch featured platform reviews for landing page
  const { data: featuredReviews = [] } = useQuery({
    queryKey: ["/api/platform-reviews", { status: "published", limit: 3 }],
  });

  // Redirect if user is already logged in (after all hooks)
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

  // Icon mapping for dynamic features
  const iconMap = {
    TrendingUp,
    DollarSign,
    Shield,
    Globe,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25 dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.5))]"></div>
      
      {/* Professional Background Images */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600/5 via-purple-600/5 to-teal-500/5"></div>
        
        {/* Creator Economy Visualization */}
        <div className="absolute top-20 left-10 w-32 h-32 opacity-10">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-500"/>
            <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-500"/>
            <circle cx="50" cy="50" r="15" fill="currentColor" className="text-teal-500"/>
            <circle cx="50" cy="20" r="8" fill="currentColor" className="text-blue-400"/>
            <circle cx="80" cy="50" r="8" fill="currentColor" className="text-purple-400"/>
            <circle cx="50" cy="80" r="8" fill="currentColor" className="text-teal-400"/>
            <circle cx="20" cy="50" r="8" fill="currentColor" className="text-indigo-400"/>
          </svg>
        </div>
        
        {/* Global Network Pattern */}
        <div className="absolute top-40 right-20 w-40 h-40 opacity-8">
          <svg viewBox="0 0 120 120" className="w-full h-full">
            <defs>
              <linearGradient id="networkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{stopColor:'#3B82F6', stopOpacity:0.3}} />
                <stop offset="100%" style={{stopColor:'#8B5CF6', stopOpacity:0.1}} />
              </linearGradient>
            </defs>
            {/* Network nodes */}
            <circle cx="20" cy="20" r="3" fill="url(#networkGrad)"/>
            <circle cx="60" cy="15" r="4" fill="url(#networkGrad)"/>
            <circle cx="100" cy="30" r="3" fill="url(#networkGrad)"/>
            <circle cx="15" cy="60" r="3" fill="url(#networkGrad)"/>
            <circle cx="60" cy="60" r="5" fill="url(#networkGrad)"/>
            <circle cx="105" cy="70" r="3" fill="url(#networkGrad)"/>
            <circle cx="30" cy="100" r="4" fill="url(#networkGrad)"/>
            <circle cx="80" cy="105" r="3" fill="url(#networkGrad)"/>
            {/* Connecting lines */}
            <line x1="20" y1="20" x2="60" y2="15" stroke="url(#networkGrad)" strokeWidth="1"/>
            <line x1="60" y1="15" x2="100" y2="30" stroke="url(#networkGrad)" strokeWidth="1"/>
            <line x1="20" y1="20" x2="15" y2="60" stroke="url(#networkGrad)" strokeWidth="1"/>
            <line x1="60" y1="60" x2="60" y2="15" stroke="url(#networkGrad)" strokeWidth="1"/>
            <line x1="60" y1="60" x2="105" y2="70" stroke="url(#networkGrad)" strokeWidth="1"/>
            <line x1="15" y1="60" x2="30" y2="100" stroke="url(#networkGrad)" strokeWidth="1"/>
            <line x1="60" y1="60" x2="80" y2="105" stroke="url(#networkGrad)" strokeWidth="1"/>
            <line x1="100" y1="30" x2="105" y2="70" stroke="url(#networkGrad)" strokeWidth="1"/>
          </svg>
        </div>
        
        {/* Analytics Charts Pattern */}
        <div className="absolute bottom-20 left-16 w-36 h-24 opacity-10">
          <svg viewBox="0 0 140 80" className="w-full h-full">
            <defs>
              <linearGradient id="chartGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style={{stopColor:'#10B981', stopOpacity:0.6}} />
                <stop offset="100%" style={{stopColor:'#3B82F6', stopOpacity:0.2}} />
              </linearGradient>
            </defs>
            {/* Bar chart */}
            <rect x="10" y="50" width="8" height="25" fill="url(#chartGrad)"/>
            <rect x="25" y="35" width="8" height="40" fill="url(#chartGrad)"/>
            <rect x="40" y="20" width="8" height="55" fill="url(#chartGrad)"/>
            <rect x="55" y="30" width="8" height="45" fill="url(#chartGrad)"/>
            <rect x="70" y="15" width="8" height="60" fill="url(#chartGrad)"/>
            <rect x="85" y="25" width="8" height="50" fill="url(#chartGrad)"/>
            <rect x="100" y="10" width="8" height="65" fill="url(#chartGrad)"/>
            <rect x="115" y="20" width="8" height="55" fill="url(#chartGrad)"/>
          </svg>
        </div>
        
        {/* Money/Currency Symbols */}
        <div className="absolute bottom-32 right-24 w-28 h-28 opacity-8">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <defs>
              <linearGradient id="moneyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{stopColor:'#F59E0B', stopOpacity:0.4}} />
                <stop offset="100%" style={{stopColor:'#10B981', stopOpacity:0.2}} />
              </linearGradient>
            </defs>
            {/* Dollar symbol */}
            <text x="20" y="30" fontSize="16" fill="url(#moneyGrad)" fontWeight="bold">$</text>
            <text x="65" y="25" fontSize="12" fill="url(#moneyGrad)" fontWeight="bold">€</text>
            <text x="15" y="55" fontSize="14" fill="url(#moneyGrad)" fontWeight="bold">£</text>
            <text x="55" y="65" fontSize="18" fill="url(#moneyGrad)" fontWeight="bold">¥</text>
            <text x="75" y="80" fontSize="10" fill="url(#moneyGrad)" fontWeight="bold">₹</text>
            <text x="30" y="85" fontSize="12" fill="url(#moneyGrad)" fontWeight="bold">₦</text>
          </svg>
        </div>
        
        {/* Social Media Icons Pattern */}
        <div className="absolute top-60 left-8 w-24 h-32 opacity-8">
          <div className="flex flex-col space-y-3">
            <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-purple-500 rounded-lg opacity-30"></div>
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full opacity-30"></div>
            <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg opacity-30"></div>
            <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-teal-500 rounded-lg opacity-30"></div>
          </div>
        </div>
      </div>
      
      {/* Animated Gradient Orbs */}
      <div className="absolute top-0 right-0 -mt-4 -mr-16 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 left-0 -mb-4 -ml-16 w-80 h-80 bg-gradient-to-tr from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      <div className="absolute top-1/2 right-1/4 w-60 h-60 bg-gradient-to-br from-teal-400/15 to-green-400/15 rounded-full blur-2xl animate-pulse" style={{animationDelay: '2s'}}></div>

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
              
              {/* Call-to-Action Button */}
              <div className="flex items-center space-x-4 pt-4">
                <Button 
                  onClick={handleGetStarted}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 text-lg"
                >
                  <span>Get Started Free</span>
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <div className="text-sm text-slate-500">
                  <span className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                    No setup fees
                  </span>
                </div>
              </div>
            </div>

            {/* Feature Grid */}
            <div className="grid grid-cols-2 gap-6 mb-12">
              {Array.isArray(features) && features?.map((feature: any, index: number) => {
                const Icon = iconMap[feature.icon as keyof typeof iconMap];
                return (
                  <div key={index} className="group">
                    <div className="flex items-start space-x-3 p-4 rounded-xl bg-white/50 backdrop-blur-sm border border-white/20 hover:bg-white/70 transition-all duration-300 hover:shadow-lg hover:scale-105">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                        {Icon && <Icon className="w-5 h-5 text-white" />}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800 mb-1">{feature.title}</h3>
                        <p className="text-sm text-slate-600 leading-relaxed">{feature.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-8">
              {Array.isArray(stats) && stats?.map((stat: any, index: number) => (
                <div key={index} className="text-center">
                  <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-sm text-slate-600 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Enhanced Customer Reviews Section */}
            <div className="mt-16">
              <div className="text-center mb-10">
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <div className="flex items-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <span className="text-2xl font-bold text-slate-800">4.9/5</span>
                </div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
                  Trusted by Creators Worldwide
                </h2>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                  Join thousands of successful creators who are already earning with CreoCash. 
                  See what they have to say about their experience.
                </p>
              </div>

              {/* Reviews Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {featuredReviews.length > 0 ? (
                  featuredReviews.slice(0, 4).map((review: any) => (
                    <div key={review.id} className="group">
                      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/40 hover:bg-white/80 hover:shadow-xl transition-all duration-300 hover:scale-105 h-full">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-1">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={`w-5 h-5 ${
                                  i < Math.floor(parseFloat(review.overallRating)) 
                                    ? "fill-yellow-400 text-yellow-400" 
                                    : "fill-gray-200 text-gray-200"
                                }`} 
                              />
                            ))}
                          </div>
                          <Quote className="w-6 h-6 text-blue-400 opacity-60" />
                        </div>
                        
                        <h3 className="font-bold text-gray-900 text-lg mb-3">{review.reviewTitle}</h3>
                        <p className="text-gray-700 text-sm leading-relaxed mb-4 line-clamp-3">
                          {review.reviewText}
                        </p>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold text-sm">
                                {(review.user?.fullName || "A").charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">
                                {review.user?.fullName || "Anonymous"}
                              </p>
                              <p className="text-xs text-gray-500">
                                {review.user?.role === "creator" ? "Creator" : "Clipper"}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-blue-600 font-bold text-sm">
                              {review.user?.role === "creator" ? "✓ Verified Creator" : "✓ Verified Clipper"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  // Fallback testimonials when no reviews are available
                  [
                    {
                      id: 1,
                      rating: 5,
                      title: "Game-changing platform for creators",
                      text: "CreoCash has completely transformed how I monetize my trading content. The automated escrow system gives me peace of mind, and the analytics help me optimize my campaigns perfectly.",
                      author: "Sarah Chen",
                      role: "Trading Educator",
                      verified: true
                    },
                    {
                      id: 2,
                      rating: 5,
                      title: "Incredible earning potential",
                      text: "As a clipper, I've earned more in 3 months with CreoCash than I did in a year with other platforms. The goal-based system is transparent and the payouts are instant.",
                      author: "Marcus Johnson",
                      role: "Content Clipper",
                      verified: true
                    },
                    {
                      id: 3,
                      rating: 5,
                      title: "Professional and reliable",
                      text: "The multi-platform integration is seamless. I can track my Instagram, TikTok, and YouTube performance all in one place. The AI content protection is a huge plus.",
                      author: "Elena Rodriguez",
                      role: "Social Influencer",
                      verified: true
                    },
                    {
                      id: 4,
                      rating: 5,
                      title: "Best affiliate platform I've used",
                      text: "The enterprise features are outstanding. White-label capabilities and custom commission rates make this perfect for our business. Customer support is top-notch.",
                      author: "David Kim",
                      role: "Business Owner",
                      verified: true
                    }
                  ].map((review) => (
                    <div key={review.id} className="group">
                      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/40 hover:bg-white/80 hover:shadow-xl transition-all duration-300 hover:scale-105 h-full">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-1">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={`w-5 h-5 ${
                                  i < review.rating 
                                    ? "fill-yellow-400 text-yellow-400" 
                                    : "fill-gray-200 text-gray-200"
                                }`} 
                              />
                            ))}
                          </div>
                          <Quote className="w-6 h-6 text-blue-400 opacity-60" />
                        </div>
                        
                        <h3 className="font-bold text-gray-900 text-lg mb-3">{review.title}</h3>
                        <p className="text-gray-700 text-sm leading-relaxed mb-4">
                          {review.text}
                        </p>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold text-sm">
                                {review.author.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">{review.author}</p>
                              <p className="text-xs text-gray-500">{review.role}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-blue-600 font-bold text-sm">
                              ✓ Verified User
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Trust Indicators */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-100">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600 mb-1">50K+</div>
                    <div className="text-sm text-gray-600">Active Creators</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600 mb-1">$2M+</div>
                    <div className="text-sm text-gray-600">Paid Out</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-teal-600 mb-1">25+</div>
                    <div className="text-sm text-gray-600">Integrations</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600 mb-1">99.9%</div>
                    <div className="text-sm text-gray-600">Uptime</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Auth Forms */}
        <div ref={authSectionRef} className="flex-1 lg:max-w-lg flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            {/* Mobile Logo */}
            <div className="lg:hidden text-center mb-8">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">CreoCash</span>
              </div>
              <p className="text-slate-600 text-lg mb-4">Global Creator Economy Platform</p>
              <p className="text-slate-600 text-sm mb-6">Monetize your creative content with intelligent affiliate marketing</p>
              
              {/* Mobile Get Started Button */}
              <Button 
                onClick={handleGetStarted}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 mb-4"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
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
                            autoComplete="off"
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
                          autoComplete="off"
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
                          autoComplete="off"
                          className="h-12 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl"
                          placeholder="+254 712 345 678"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="userType" className="text-slate-700 font-medium">Account Type</Label>
                        <Select 
                          value={registerData.userType} 
                          onValueChange={handleUserTypeChange}
                        >
                          <SelectTrigger className="h-12 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl">
                            <SelectValue placeholder="Select your account type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="trader_creator">Trading Educator</SelectItem>
                            <SelectItem value="influencer">Social Influencer</SelectItem>
                            <SelectItem value="entrepreneur">Business Creator</SelectItem>
                            <SelectItem value="enterprise">Enterprise (White-Label)</SelectItem>
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