import { useState } from "react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Building2, Clock, Send, CheckCircle2, XCircle, AlertCircle, Home, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

interface EnterpriseRequest {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  website?: string;
  description: string;
  status: 'pending' | 'under_review' | 'completed' | 'rejected';
  submittedAt: string;
}

export default function EnterpriseRequestDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: user?.fullName || '',
    email: user?.email || '',
    phone: '',
    website: '',
    description: ''
  });

  // Check if user has already submitted an enterprise request
  const { data: existingRequest, isLoading } = useQuery<EnterpriseRequest>({
    queryKey: ["/api/enterprise/my-request"],
    staleTime: 30 * 1000,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch("/api/enterprise/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        throw new Error("Failed to submit request");
      }
      
      toast({
        title: "Request Submitted Successfully",
        description: "Your enterprise request has been submitted for review. You'll receive an email update within 48 hours."
      });
      
      // Refresh the page to show the new request status
      window.location.reload();
    } catch (error) {
      toast({
        title: "Submission Failed",
        description: "Failed to submit your enterprise request. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'under_review':
        return <AlertCircle className="w-5 h-5 text-blue-500" />;
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'pending':
        return "Your enterprise request is awaiting initial review. Our team will contact you within 24-48 hours.";
      case 'under_review':
        return "Your request is being reviewed by our enterprise team. A meeting may be scheduled to discuss your requirements.";
      case 'completed':
        return "Congratulations! Your enterprise account has been approved and activated. You now have access to your white-label platform.";
      case 'rejected':
        return "Your enterprise request was not approved at this time. Please contact support for more information.";
      default:
        return "Unknown status. Please contact support.";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your enterprise request status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 relative">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0.6))] opacity-30"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-400/10 to-indigo-400/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
      
      <div className="relative z-10 container mx-auto px-6 py-12">
        {/* Navigation Header */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => setLocation('/')}
            className="flex items-center space-x-2 text-slate-600 hover:text-purple-600 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>
          <button 
            onClick={() => setLocation('/')}
            className="flex items-center space-x-2 text-slate-600 hover:text-purple-600 transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Building2 className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent mb-4">
            Enterprise Platform Request
          </h1>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Request access to your own white-label affiliate marketing platform with custom branding, dedicated domain, and premium features.
          </p>
        </div>

        {existingRequest ? (
          // Show request status if already submitted
          <div className="max-w-2xl mx-auto">
            <Card className="bg-white/80 backdrop-blur-lg border border-white/20 shadow-xl">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  {getStatusIcon(existingRequest.status)}
                  <CardTitle className="text-xl">
                    Request Status: {existingRequest.status.replace('_', ' ').toUpperCase()}
                  </CardTitle>
                </div>
                <CardDescription>
                  Submitted on {new Date(existingRequest.submittedAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-slate-700">{getStatusMessage(existingRequest.status)}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="font-semibold text-slate-700">Company Name</Label>
                      <p className="text-slate-600">{existingRequest.companyName}</p>
                    </div>
                    <div>
                      <Label className="font-semibold text-slate-700">Contact Email</Label>
                      <p className="text-slate-600">{existingRequest.email}</p>
                    </div>
                    {existingRequest.website && (
                      <div>
                        <Label className="font-semibold text-slate-700">Website</Label>
                        <p className="text-slate-600">{existingRequest.website}</p>
                      </div>
                    )}
                    <div>
                      <Label className="font-semibold text-slate-700">Phone</Label>
                      <p className="text-slate-600">{existingRequest.phone}</p>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="font-semibold text-slate-700">Business Description</Label>
                    <p className="text-slate-600 mt-1">{existingRequest.description}</p>
                  </div>

                  {existingRequest.status === 'completed' && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-green-800 font-medium mb-2">🎉 Welcome to Enterprise!</p>
                      <p className="text-green-700">Your white-label platform is now active. Refresh this page to access your enterprise dashboard.</p>
                      <div className="flex space-x-3 mt-3">
                        <Button 
                          onClick={() => window.location.reload()} 
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Access Enterprise Dashboard
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setLocation('/')}
                          className="border-green-600 text-green-700 hover:bg-green-50"
                        >
                          Go to Home
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          // Show request form if no request submitted yet
          <div className="max-w-2xl mx-auto">
            <Card className="bg-white/80 backdrop-blur-lg border border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl">Enterprise Account Request</CardTitle>
                <CardDescription>
                  Fill out this form to request your own white-label affiliate marketing platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="companyName">Company Name *</Label>
                      <Input
                        id="companyName"
                        required
                        value={formData.companyName}
                        onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                        placeholder="Your Company Inc."
                      />
                    </div>
                    <div>
                      <Label htmlFor="contactName">Contact Name *</Label>
                      <Input
                        id="contactName"
                        required
                        value={formData.contactName}
                        onChange={(e) => setFormData({...formData, contactName: e.target.value})}
                        placeholder="John Doe"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        placeholder="john@company.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="website">Company Website</Label>
                    <Input
                      id="website"
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({...formData, website: e.target.value})}
                      placeholder="https://yourcompany.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Business Description *</Label>
                    <Textarea
                      id="description"
                      required
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Describe your business, target audience, and how you plan to use the affiliate marketing platform..."
                      className="h-32"
                    />
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">What You'll Get:</h4>
                    <ul className="text-blue-800 space-y-1 text-sm">
                      <li>• Custom white-label platform with your branding</li>
                      <li>• Dedicated subdomain (yourcompany.creocash.com)</li>
                      <li>• Custom commission rates (typically 15% vs standard 20%)</li>
                      <li>• Priority support and dedicated account manager</li>
                      <li>• Full API access and integration capabilities</li>
                      <li>• Scoped analytics showing only your platform data</li>
                    </ul>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 shadow-lg"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Submit Enterprise Request
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}