import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Eye,
  Mouse,
  TrendingUp,
  Filter,
  Search,
  Bot,
  User,
  Clock,
  MapPin
} from "lucide-react";
import { getQueryFn } from "@/lib/queryClient";
import { DashboardLayout } from "@/components/dashboard-layout";

interface BotDetectionEvent {
  id: string;
  clipperId: string;
  campaignId: string;
  eventType: string;
  botScore: number;
  flaggedAsBot: boolean;
  deviceFingerprint: string;
  userAgent: string;
  ipAddress: string;
  createdAt: string;
  clipperUsername?: string;
  campaignName?: string;
}

interface BotStats {
  totalEvents: number;
  botEvents: number;
  suspiciousEvents: number;
  blockedEvents: number;
  botRate: number;
  topBotIPs: Array<{ ip: string; count: number }>;
  botEventsByHour: Array<{ hour: number; count: number }>;
}

export default function BotMonitoring() {
  const [filter, setFilter] = useState<'all' | 'bots' | 'suspicious' | 'clean'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: botStats, isLoading: statsLoading } = useQuery<BotStats>({
    queryKey: ["/api/admin/bot-stats"],
    queryFn: getQueryFn({ on401: "throw" }),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: botEvents, isLoading: eventsLoading } = useQuery<BotDetectionEvent[]>({
    queryKey: ["/api/admin/bot-events", filter, searchTerm],
    queryFn: getQueryFn({ on401: "throw" }),
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const getBotScoreColor = (score: number) => {
    if (score >= 0.7) return "bg-red-500";
    if (score >= 0.4) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getBotScoreLabel = (score: number) => {
    if (score >= 0.7) return "High Risk";
    if (score >= 0.4) return "Suspicious";
    return "Clean";
  };

  const formatDeviceFingerprint = (fingerprintStr: string) => {
    try {
      const fingerprint = JSON.parse(fingerprintStr || '{}');
      return {
        browser: fingerprint.userAgent?.split(' ')[0] || 'Unknown',
        platform: fingerprint.platform || 'Unknown',
        timezone: fingerprint.timezone || 'Unknown',
        language: fingerprint.language?.split(',')[0] || 'Unknown',
      };
    } catch {
      return { browser: 'Unknown', platform: 'Unknown', timezone: 'Unknown', language: 'Unknown' };
    }
  };

  const filteredEvents = botEvents?.filter(event => {
    const matchesFilter = 
      filter === 'all' ||
      (filter === 'bots' && event.flaggedAsBot) ||
      (filter === 'suspicious' && event.botScore >= 0.4 && !event.flaggedAsBot) ||
      (filter === 'clean' && event.botScore < 0.4);

    const matchesSearch = !searchTerm || 
      event.clipperUsername?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.campaignName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.ipAddress.includes(searchTerm) ||
      event.eventType.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  }) || [];

  if (statsLoading || eventsLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Bot Detection Monitoring</h1>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-16 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Bot Detection Monitoring</h1>
        </div>
        <Badge variant="secondary" className="text-sm">
          Real-time Protection Active
        </Badge>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Events</p>
                <p className="text-2xl font-bold">{botStats?.totalEvents?.toLocaleString() || 0}</p>
              </div>
              <Eye className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Bot Events</p>
                <p className="text-2xl font-bold text-red-600">{botStats?.botEvents || 0}</p>
                <p className="text-xs text-muted-foreground">
                  {botStats?.botRate ? `${(botStats.botRate * 100).toFixed(1)}%` : '0%'} bot rate
                </p>
              </div>
              <Bot className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Suspicious</p>
                <p className="text-2xl font-bold text-yellow-600">{botStats?.suspiciousEvents || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Blocked</p>
                <p className="text-2xl font-bold text-orange-600">{botStats?.blockedEvents || 0}</p>
              </div>
              <XCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Bot IPs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5" />
            <span>Top Bot IP Addresses</span>
          </CardTitle>
          <CardDescription>IPs with highest bot activity in the last 24 hours</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {botStats?.topBotIPs?.map((ipData, index) => (
              <div key={ipData.ip} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div className="flex items-center space-x-3">
                  <Badge variant="outline" className="w-8 justify-center">
                    {index + 1}
                  </Badge>
                  <code className="text-sm font-mono">{ipData.ip}</code>
                </div>
                <Badge variant="destructive">{ipData.count} events</Badge>
              </div>
            )) || (
              <p className="text-sm text-muted-foreground text-center py-4">No bot IPs detected</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Event Monitoring</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex space-x-2">
              {(['all', 'bots', 'suspicious', 'clean'] as const).map((filterType) => (
                <Button
                  key={filterType}
                  variant={filter === filterType ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(filterType)}
                  className="capitalize"
                >
                  {filterType === 'all' && <Eye className="h-4 w-4 mr-1" />}
                  {filterType === 'bots' && <Bot className="h-4 w-4 mr-1" />}
                  {filterType === 'suspicious' && <AlertTriangle className="h-4 w-4 mr-1" />}
                  {filterType === 'clean' && <CheckCircle className="h-4 w-4 mr-1" />}
                  {filterType}
                </Button>
              ))}
            </div>
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Events List */}
          <div className="space-y-2">
            {filteredEvents.length > 0 ? (
              filteredEvents.map((event) => {
                const device = formatDeviceFingerprint(event.deviceFingerprint);
                return (
                  <div
                    key={event.id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Badge 
                          className={`${getBotScoreColor(event.botScore)} text-white`}
                        >
                          {getBotScoreLabel(event.botScore)}
                        </Badge>
                        <span className="font-medium">{event.eventType.toUpperCase()}</span>
                        {event.flaggedAsBot && (
                          <Badge variant="destructive">BLOCKED</Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {new Date(event.createdAt).toLocaleString()}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Clipper</p>
                        <p className="font-medium">{event.clipperUsername || 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Campaign</p>
                        <p className="font-medium">{event.campaignName || 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Bot Score</p>
                        <p className="font-bold">{(event.botScore * 100).toFixed(1)}%</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs text-muted-foreground bg-muted/30 p-3 rounded">
                      <div>
                        <p className="font-medium">IP Address</p>
                        <code>{event.ipAddress}</code>
                      </div>
                      <div>
                        <p className="font-medium">Browser</p>
                        <p>{device.browser}</p>
                      </div>
                      <div>
                        <p className="font-medium">Platform</p>
                        <p>{device.platform}</p>
                      </div>
                      <div>
                        <p className="font-medium">Timezone</p>
                        <p>{device.timezone}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No events match your current filters</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
    </DashboardLayout>
  );
}