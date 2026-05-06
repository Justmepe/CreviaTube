import { useQuery } from "@tanstack/react-query";
import { Briefcase, ArrowLeft, MapPin, Clock, Users, Heart } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Careers() {
  const [, setLocation] = useLocation();

  const { data: careersData, isLoading } = useQuery<any>({
    queryKey: ["/api/pages/careers"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading careers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
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
            <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-blue-600 rounded-xl flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-slate-800">Join Our Team</h1>
          </div>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Help us build the future of creator economy and affiliate marketing
          </p>
        </div>

        {/* Company Culture */}
        <Card className="mb-12">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">Why Work at CreviaTube?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {careersData?.content?.benefits?.map((benefit: any, index: number) => {
                const IconComponent = index === 0 ? Heart : index === 1 ? Users : Clock;
                return (
                  <div key={index} className="text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">{benefit.title}</h3>
                    <p className="text-slate-600">{benefit.description}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Open Positions */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-800 mb-8 text-center">Open Positions</h2>
          <div className="grid grid-cols-1 gap-6">
            {careersData?.content?.openPositions?.map((position: any, index: number) => (
              <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-semibold text-slate-800">{position.title}</h3>
                        <Badge variant="secondary">{position.department}</Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-slate-600 mb-3">
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-4 h-4" />
                          <span>{position.location}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{position.type}</span>
                        </div>
                      </div>
                      <p className="text-slate-600">{position.description}</p>
                      <div className="mt-3">
                        <div className="flex flex-wrap gap-2">
                          {position.skills?.map((skill: string, skillIndex: number) => (
                            <Badge key={skillIndex} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 md:mt-0 md:ml-6">
                      <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                        Apply Now
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Application Process */}
        <Card>
          <CardHeader>
            <CardTitle>Our Hiring Process</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {careersData?.content?.hiringProcess?.map((step: any, index: number) => (
                <div key={index} className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold">
                    {index + 1}
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-600">{step.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}