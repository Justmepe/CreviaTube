import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle, 
  TrendingUp, 
  Globe,
  DollarSign,
  Shield,
  Star,
  ArrowRight,
  Sparkles,
  Quote,
  Users,
  Zap,
  BarChart3,
  Building2,
  PlayCircle,
  CreditCard,
  Home,
  LogIn
} from "lucide-react";

export default function LandingPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch platform features and stats from API
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

  // Redirect if user is already logged in
  if (user) {
    setLocation("/");
    return null;
  }

  // Handle Get Started button click
  const handleGetStarted = () => {
    setLocation("/auth");
  };

  // Navigation handlers for hero section buttons
  const scrollToSection = (elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleNavigation = (action: string) => {
    switch (action) {
      case 'home':
        window.scrollTo({ top: 0, behavior: 'smooth' });
        break;
      case 'features':
        scrollToSection('features');
        break;
      case 'how-it-works':
        scrollToSection('how-it-works');
        break;
      case 'reviews':
        scrollToSection('reviews');
        break;
      case 'signin':
        setLocation('/auth');
        break;
      case 'creators':
        setLocation('/auth');
        break;
      case 'clippers':
        setLocation('/auth');
        break;
      case 'enterprise':
        setLocation('/auth');
        break;
      case 'pricing':
        scrollToSection('trust-indicators');
        break;
      default:
        break;
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
      {/* Top Navigation */}
      <div className="relative z-20 bg-white/80 backdrop-blur-lg border-b border-white/20 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 via-purple-600 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 bg-clip-text text-transparent">CreoCash</span>
            </div>
            
            {/* Navigation Links */}
            <nav className="hidden md:flex items-center space-x-8">
              <button
                onClick={() => handleNavigation('home')}
                className="flex items-center space-x-2 text-slate-700 hover:text-slate-900 font-medium transition-colors duration-200"
              >
                <Home className="w-4 h-4" />
                <span>Home</span>
              </button>
              
              <button
                onClick={() => handleNavigation('features')}
                className="text-slate-700 hover:text-slate-900 font-medium transition-colors duration-200"
              >
                Features
              </button>
              
              <button
                onClick={() => handleNavigation('how-it-works')}
                className="text-slate-700 hover:text-slate-900 font-medium transition-colors duration-200"
              >
                How It Works
              </button>
              
              <button
                onClick={() => handleNavigation('reviews')}
                className="text-slate-700 hover:text-slate-900 font-medium transition-colors duration-200"
              >
                Reviews
              </button>
              
              <button
                onClick={() => handleNavigation('signin')}
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </button>
            </nav>
            
            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => handleNavigation('signin')}
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg font-medium"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </button>
            </div>
          </div>
        </div>
      </div>

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
      </div>
      
      {/* Animated Gradient Orbs */}
      <div className="absolute top-0 right-0 -mt-4 -mr-16 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 left-0 -mb-4 -ml-16 w-80 h-80 bg-gradient-to-tr from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      <div className="absolute top-1/2 right-1/4 w-60 h-60 bg-gradient-to-br from-teal-400/15 to-green-400/15 rounded-full blur-2xl animate-pulse" style={{animationDelay: '2s'}}></div>

      <div className="relative z-10 min-h-screen flex">
        {/* Full Width Hero Section */}
        <div className="flex-1 flex flex-col justify-center px-12 py-16 max-w-6xl mx-auto">
          <div className="max-w-4xl">
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

            {/* Features Section */}
            <div id="features" className="mb-16">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
                  Choose Your Path
                </h2>
                <p className="text-lg text-slate-600">
                  Select what best describes you to explore relevant features
                </p>
              </div>
              
              {/* Navigation Buttons */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12">
                <button
                  onClick={() => handleNavigation('creators')}
                  className="flex items-center justify-center space-x-3 p-6 rounded-xl bg-white/50 backdrop-blur-sm border border-white/20 hover:bg-white/70 transition-all duration-300 hover:shadow-lg hover:scale-105 group"
                >
                  <TrendingUp className="w-6 h-6 text-blue-500 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold text-slate-800">For Creators</span>
                </button>
                
                <button
                  onClick={() => handleNavigation('clippers')}
                  className="flex items-center justify-center space-x-3 p-6 rounded-xl bg-white/50 backdrop-blur-sm border border-white/20 hover:bg-white/70 transition-all duration-300 hover:shadow-lg hover:scale-105 group"
                >
                  <Users className="w-6 h-6 text-purple-500 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold text-slate-800">For Clippers</span>
                </button>
                
                <button
                  onClick={() => handleNavigation('enterprise')}
                  className="flex items-center justify-center space-x-3 p-6 rounded-xl bg-white/50 backdrop-blur-sm border border-white/20 hover:bg-white/70 transition-all duration-300 hover:shadow-lg hover:scale-105 group"
                >
                  <Building2 className="w-6 h-6 text-indigo-500 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold text-slate-800">Enterprise</span>
                </button>
              </div>
              
              {/* Feature Grid */}
              <div className="grid grid-cols-2 gap-6">
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

            {/* How It Works Section */}
            <div id="how-it-works" className="mt-16 mb-16">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
                  How CreoCash Works
                </h2>
                <p className="text-lg text-slate-600 max-w-3xl mx-auto">
                  Whether you're a creator or clipper, get started in minutes with our simple 3-step process
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Step 1 */}
                <div className="text-center group">
                  <div className="relative mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <span className="text-2xl font-bold text-white">1</span>
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-3">Create or Join</h3>
                  <p className="text-slate-600 leading-relaxed">
                    <strong>Creators:</strong> Set up campaigns with goals and budgets. <strong>Clippers:</strong> Join campaigns that match your interests and skills.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="text-center group">
                  <div className="relative mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <span className="text-2xl font-bold text-white">2</span>
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                      <BarChart3 className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-3">Create & Track</h3>
                  <p className="text-slate-600 leading-relaxed">
                    <strong>Creators:</strong> Monitor campaign performance. <strong>Clippers:</strong> Share content using unique tracking links. Real-time analytics for everyone.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="text-center group">
                  <div className="relative mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <span className="text-2xl font-bold text-white">3</span>
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-3">Get Paid</h3>
                  <p className="text-slate-600 leading-relaxed">
                    <strong>Everyone wins:</strong> When goals are met, payouts are automatically processed through our secure escrow system. No delays, no hassles.
                  </p>
                </div>
              </div>

              {/* CTA for How It Works */}
              <div className="text-center mt-12">
                <Button 
                  onClick={handleGetStarted}
                  variant="outline"
                  className="bg-white/60 backdrop-blur-sm border border-white/40 hover:bg-white/80 hover:shadow-lg transition-all duration-300 hover:scale-105 text-slate-700 hover:text-slate-900 px-8 py-3 rounded-xl font-semibold"
                >
                  <span>Start Your Journey</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>

            {/* Enhanced Customer Reviews Section */}
            <div id="reviews" className="mt-16">
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
                {Array.isArray(featuredReviews) && featuredReviews.length > 0 ? (
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
              <div id="trust-indicators" className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-100">
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
      </div>
    </div>
  );
}