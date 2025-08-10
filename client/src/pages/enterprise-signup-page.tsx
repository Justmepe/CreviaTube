import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { ArrowLeft, Star, AlertCircle, Building2 } from "lucide-react";

export default function EnterpriseSignupPage() {
  const [, setLocation] = useLocation();
  const { registerMutation } = useAuth();
  
  // Get basic info from URL params or localStorage if passed from main signup
  const [basicInfo] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      fullName: urlParams.get('fullName') || '',
      email: urlParams.get('email') || '',
      username: urlParams.get('username') || '',
      phoneNumber: urlParams.get('phoneNumber') || ''
    };
  });

  const [enterpriseData, setEnterpriseData] = useState({
    goal: '',
    businessDescription: '',
    password: ''
  });

  const goalOptions = [
    { value: 'affiliate_marketing', label: 'Affiliate Marketing Platform' },
    { value: 'content_monetization', label: 'Content Creator Monetization' },
    { value: 'influencer_partnerships', label: 'Influencer Partnership Management' },
    { value: 'white_label_solution', label: 'White-Label Marketing Solution' },
    { value: 'team_collaboration', label: 'Team Collaboration & Tracking' },
    { value: 'custom_integration', label: 'Custom Business Integration' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Combine basic info with enterprise data
      const registerData = {
        ...basicInfo,
        ...enterpriseData,
        userType: 'enterprise' as const,
        role: 'creator' as const
      };

      await registerMutation.mutateAsync(registerData);
      // Registration success will be handled by the auth context
    } catch (error) {
      // Error handling is done by the mutation
      console.error('Enterprise registration failed:', error);
    }
  };

  const handleBack = () => {
    // Go back to main signup page
    setLocation('/auth');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-2xl shadow-2xl border-0 bg-white/80 backdrop-blur-lg">
        <CardHeader className="text-center pb-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="flex items-center space-x-2 text-slate-600 hover:text-purple-600 p-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Button>
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
          
          <CardTitle className="text-3xl font-bold text-slate-800 mb-2">
            Enterprise Platform Request
          </CardTitle>
          <CardDescription className="text-lg text-slate-600">
            Get your own white-label affiliate marketing platform
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Display basic info */}
            <div className="bg-slate-50 rounded-lg p-4 border">
              <h3 className="font-medium text-slate-700 mb-2">Account Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                <div><strong>Name:</strong> {basicInfo.fullName}</div>
                <div><strong>Email:</strong> {basicInfo.email}</div>
                <div><strong>Username:</strong> {basicInfo.username}</div>
                <div><strong>Phone:</strong> {basicInfo.phoneNumber}</div>
              </div>
            </div>

            {/* Goal Selection */}
            <div className="space-y-2">
              <Label htmlFor="goal" className="text-slate-700 font-medium">
                Primary Goal *
              </Label>
              <Select value={enterpriseData.goal} onValueChange={(value) => setEnterpriseData(prev => ({ ...prev, goal: value }))}>
                <SelectTrigger className="h-12 border-slate-200 focus:border-purple-500 focus:ring-purple-500/20 rounded-xl">
                  <SelectValue placeholder="Select your primary business goal" />
                </SelectTrigger>
                <SelectContent>
                  {goalOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Business Description */}
            <div className="space-y-2">
              <Label htmlFor="businessDescription" className="text-slate-700 font-medium">
                Business Description *
              </Label>
              <Textarea
                id="businessDescription"
                required
                value={enterpriseData.businessDescription}
                onChange={(e) => setEnterpriseData(prev => ({ ...prev, businessDescription: e.target.value }))}
                placeholder="Describe your business, target audience, and how you plan to use the affiliate marketing platform..."
                className="h-32 border-slate-200 focus:border-purple-500 focus:ring-purple-500/20 rounded-xl resize-none"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 font-medium">
                Password *
              </Label>
              <Input
                id="password"
                type="password"
                required
                value={enterpriseData.password}
                onChange={(e) => setEnterpriseData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Create a secure password"
                className="h-12 border-slate-200 focus:border-purple-500 focus:ring-purple-500/20 rounded-xl"
              />
            </div>

            {/* Error Display */}
            {registerMutation.error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {registerMutation.error.message}
                </AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <Button 
              type="submit" 
              disabled={registerMutation.isPending || !enterpriseData.goal || !enterpriseData.businessDescription || !enterpriseData.password}
              className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {registerMutation.isPending ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600">
            <div className="flex items-center justify-center space-x-1 mb-2">
              <Star className="w-4 h-4 text-purple-600" />
              <span className="font-medium">Enterprise Benefits</span>
            </div>
            <p>White-label platform • Custom branding • Dedicated support • Advanced analytics</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}