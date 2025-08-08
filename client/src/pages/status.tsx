import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowLeft, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Status() {
  const [, setLocation] = useLocation();

  const { data: statusData, isLoading } = useQuery<any>({
    queryKey: ["/api/pages/status"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading platform status...</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'down': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational': return <CheckCircle className="w-4 h-4" />;
      case 'degraded': return <AlertCircle className="w-4 h-4" />;
      case 'down': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

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
            <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-blue-600 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-slate-800">Platform Status</h1>
          </div>
          <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full ${getStatusColor(statusData?.currentStatus)}`}>
            {getStatusIcon(statusData?.currentStatus)}
            <span className="font-medium capitalize">{statusData?.currentStatus}</span>
          </div>
        </div>

        {/* Services Status */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Services Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {statusData?.services?.map((service: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${getStatusColor(service.status)}`}>
                      {getStatusIcon(service.status)}
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-800">{service.name}</h3>
                      <p className="text-sm text-slate-600">Uptime: {service.uptime}</p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(service.status)}`}>
                    {service.status}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Incidents */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {statusData?.recentIncidents?.map((incident: any, index: number) => (
                <div key={index} className="p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-slate-800">{incident.title}</h3>
                    <span className="text-sm text-slate-500">{incident.date}</span>
                  </div>
                  <p className="text-slate-600 text-sm">{incident.description}</p>
                  <div className={`inline-block mt-2 px-2 py-1 rounded text-xs font-medium ${getStatusColor(incident.status)}`}>
                    {incident.status}
                  </div>
                </div>
              )) || (
                <p className="text-slate-600 text-center py-8">No recent incidents to report</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}