import { useQuery } from "@tanstack/react-query";
import { FileText, ArrowLeft, Calendar } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function TermsOfService() {
  const [, setLocation] = useLocation();

  const { data: termsData, isLoading } = useQuery<any>({
    queryKey: ["/api/pages/terms-of-service"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading terms of service...</p>
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
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-slate-800">Terms of Service</h1>
          </div>
          <div className="flex items-center justify-center space-x-2 text-slate-600">
            <Calendar className="w-4 h-4" />
            <span>Last updated: {termsData?.lastUpdated}</span>
          </div>
        </div>

        <Card>
          <CardContent className="p-8">
            <div className="prose prose-slate max-w-none">
              <p className="text-lg text-slate-600 leading-relaxed mb-8">
                {termsData?.content?.intro}
              </p>

              {termsData?.content?.sections?.map((section: any, index: number) => (
                <div key={index} className="mb-8">
                  <h2 className="text-2xl font-bold text-slate-800 mb-4">{section.title}</h2>
                  <p className="text-slate-600 leading-relaxed">{section.content}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}