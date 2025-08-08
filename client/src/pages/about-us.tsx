import { useQuery } from "@tanstack/react-query";
import { Users, ArrowLeft, Target, Globe, Zap, Shield } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AboutUs() {
  const [, setLocation] = useLocation();

  const { data: aboutData, isLoading } = useQuery<any>({
    queryKey: ["/api/pages/about-us"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading about us...</p>
        </div>
      </div>
    );
  }

  const valueIcons = { Target, Globe, Zap, Shield };

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
            <h1 className="text-4xl font-bold text-slate-800">About CreoCash</h1>
          </div>
        </div>

        {/* Mission */}
        <Card className="mb-8">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Our Mission</h2>
            <p className="text-lg text-slate-600">{aboutData?.content?.mission}</p>
          </CardContent>
        </Card>

        {/* Story */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Our Story</h2>
            <p className="text-slate-600 leading-relaxed">{aboutData?.content?.story}</p>
          </CardContent>
        </Card>

        {/* Values */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Our Values</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {aboutData?.content?.values?.map((value: any, index: number) => {
                const IconComponent = Object.values(valueIcons)[index % 4] as any;
                return (
                  <div key={index} className="p-4 border border-slate-200 rounded-lg">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                        <IconComponent className="w-4 h-4 text-white" />
                      </div>
                      <h3 className="font-semibold text-slate-800">{value.title}</h3>
                    </div>
                    <p className="text-slate-600 text-sm">{value.description}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">By the Numbers</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {aboutData?.content?.stats?.map((stat: any, index: number) => (
                <div key={index}>
                  <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm text-slate-600">{stat.label}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}