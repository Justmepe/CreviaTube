import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Zap, 
  CheckCircle2, 
  Clock, 
  DollarSign,
  Shield,
  Target,
  ArrowRight,
  Activity
} from "lucide-react";

export function AutomaticPayoutExplanation() {
  return (
    <div className="space-y-6">
      <Alert className="border-green-200 bg-green-50">
        <Zap className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <strong>Automatic Payout System:</strong> Clippers receive payments automatically when campaign objectives are verified by the system. No manual approval required.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* How It Works */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              How Automatic Payouts Work
            </CardTitle>
            <CardDescription>
              Fully automated verification and payment process
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                  1
                </div>
                <div>
                  <h4 className="font-semibold">Campaign Objectives Set</h4>
                  <p className="text-sm text-gray-600">Creator defines specific targets (clicks, signups, conversions)</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                  2
                </div>
                <div>
                  <h4 className="font-semibold">System Verification</h4>
                  <p className="text-sm text-gray-600">Platform tracks and verifies all metrics automatically via APIs</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                  3
                </div>
                <div>
                  <h4 className="font-semibold">Objective Achievement</h4>
                  <p className="text-sm text-gray-600">When targets are met, system triggers automatic payment process</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-semibold text-sm">
                  ✓
                </div>
                <div>
                  <h4 className="font-semibold">Instant Payment</h4>
                  <p className="text-sm text-gray-600">Funds transfer from escrow to clipper within 24 hours</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Verification Types */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              Verification Methods
            </CardTitle>
            <CardDescription>
              Multiple verification systems ensure accuracy
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Target className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Click Tracking</span>
                </div>
                <Badge variant="secondary">Real-time</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="font-medium">Signup Verification</span>
                </div>
                <Badge variant="secondary">API verified</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-4 w-4 text-purple-600" />
                  <span className="font-medium">Conversion Tracking</span>
                </div>
                <Badge variant="secondary">Blockchain verified</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Activity className="h-4 w-4 text-orange-600" />
                  <span className="font-medium">Engagement Metrics</span>
                </div>
                <Badge variant="secondary">Social API</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Automatic Payment Timeline</CardTitle>
          <CardDescription>From objective completion to payment delivery</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="font-semibold text-sm">Objective Met</h4>
              <p className="text-xs text-gray-600">System verifies completion</p>
            </div>
            
            <ArrowRight className="h-4 w-4 text-gray-400" />
            
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-sm">Processing</h4>
              <p className="text-xs text-gray-600">0-24 hours verification</p>
            </div>
            
            <ArrowRight className="h-4 w-4 text-gray-400" />
            
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
              <h4 className="font-semibold text-sm">Payment Sent</h4>
              <p className="text-xs text-gray-600">Automatic transfer</p>
            </div>
            
            <ArrowRight className="h-4 w-4 text-gray-400" />
            
            <div className="text-center">
              <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Zap className="h-6 w-6 text-teal-600" />
              </div>
              <h4 className="font-semibold text-sm">Completed</h4>
              <p className="text-xs text-gray-600">Clipper receives funds</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Benefits */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-r from-green-50 to-green-100">
          <CardContent className="pt-6">
            <div className="text-center">
              <Zap className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <h4 className="font-semibold text-green-900">Instant Payments</h4>
              <p className="text-sm text-green-700">No waiting for manual approval</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100">
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <h4 className="font-semibold text-blue-900">Fraud Prevention</h4>
              <p className="text-sm text-blue-700">Multi-layer verification system</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-purple-50 to-purple-100">
          <CardContent className="pt-6">
            <div className="text-center">
              <Target className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <h4 className="font-semibold text-purple-900">100% Transparent</h4>
              <p className="text-sm text-purple-700">All metrics publicly verifiable</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}