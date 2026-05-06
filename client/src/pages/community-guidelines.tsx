import { useQuery } from "@tanstack/react-query";
import { Users, ArrowLeft, Shield, AlertTriangle, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CommunityGuidelines() {
  const [, setLocation] = useLocation();

  const { data: guidelinesData, isLoading } = useQuery<any>({
    queryKey: ["/api/pages/community-guidelines"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading community guidelines...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Button>
        </div>

        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-slate-800">Community Guidelines</h1>
          </div>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Building a respectful and inclusive community for all creators and clippers
          </p>
        </div>

        {/* Community Values */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>Our Values</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {guidelinesData?.content?.values?.map((value: any, index: number) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h3 className="font-semibold text-slate-800 mb-1">{value.title}</h3>
                    <p className="text-slate-600">{value.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Guidelines Sections */}
        {guidelinesData?.content?.sections?.map((section: any, index: number) => (
          <Card key={index} className="mb-8">
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {section.rules?.map((rule: any, ruleIndex: number) => (
                  <div key={ruleIndex} className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-800 mb-1">{rule.title}</h4>
                      <p className="text-slate-600 text-sm">{rule.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Prohibited Content */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              <span>Prohibited Content</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {guidelinesData?.content?.prohibited?.map((item: string, index: number) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                  <p className="text-slate-600">{item}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Enforcement */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>Enforcement</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-4">{guidelinesData?.content?.enforcement?.intro}</p>
            <div className="space-y-3">
              {guidelinesData?.content?.enforcement?.actions?.map((action: any, index: number) => (
                <div key={index} className="p-3 border border-slate-200 rounded-lg">
                  <h4 className="font-medium text-slate-800 mb-1">{action.violation}</h4>
                  <p className="text-sm text-slate-600">{action.consequence}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Reporting */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Report Violations:</strong> If you encounter content that violates these guidelines, 
            please report it to our moderation team at{" "}
            <a href="mailto:moderation@creviatube.com" className="text-blue-600 hover:underline">
              moderation@creviatube.com
            </a>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}