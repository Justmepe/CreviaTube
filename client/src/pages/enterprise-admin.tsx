import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  Building,
  Clock,
  Phone,
  Mail,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  MessageSquare,
  ArrowUpRight,
  Settings
} from "lucide-react";
import { useState } from "react";
import { EnterpriseSetupModal } from '@/components/enterprise-setup-modal';

interface EnterpriseRequest {
  id: string;
  userId: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  companyName: string;
  companySize: string;
  requestType: string;
  message: string;
  preferredMeetingTime: string;
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  assignedTo: string | null;
  meetingScheduled: boolean;
  meetingDate: string | null;
  meetingTime: string | null;
  meetingNotes: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export default function EnterpriseAdmin() {
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] = useState<EnterpriseRequest | null>(null);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('');
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [setupRequest, setSetupRequest] = useState<EnterpriseRequest | null>(null);
  const [showMeetingScheduler, setShowMeetingScheduler] = useState(false);
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [meetingNotes, setMeetingNotes] = useState('');
  const [meetingType, setMeetingType] = useState('zoom');
  const [meetingLink, setMeetingLink] = useState('');

  // Fetch enterprise requests
  const { data: requests, isLoading } = useQuery({
    queryKey: ["/api/admin/enterprise-requests"],
    refetchInterval: 15000,
  });

  // Update request mutation
  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const response = await fetch(`/api/admin/enterprise-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update request');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/enterprise-requests"] });
      toast({ title: "Request updated successfully" });
      setSelectedRequest(null);
    },
    onError: () => {
      toast({ title: "Failed to update request", variant: "destructive" });
    },
  });

  const handleUpdateRequest = () => {
    if (!selectedRequest) return;
    
    const updates: any = {
      status: status || selectedRequest.status,
      notes: notes || selectedRequest.notes,
      updatedAt: new Date().toISOString(),
    };

    updateRequestMutation.mutate({ id: selectedRequest.id, updates });
  };

  const handleScheduleMeeting = () => {
    if (!selectedRequest || !meetingDate || !meetingTime || !meetingType) {
      toast({ title: "Please fill all meeting details", variant: "destructive" });
      return;
    }

    const updates = {
      meetingScheduled: true,
      meetingDate: meetingDate,
      meetingTime: meetingTime,
      meetingNotes: meetingNotes || '',
      meetingType,
      meetingLink: meetingLink || '',
      status: 'in_progress',
      updatedAt: new Date().toISOString(),
    }

    updateRequestMutation.mutate({ id: selectedRequest.id, updates });
    setShowMeetingScheduler(false);
    setMeetingDate('');
    setMeetingTime('');
    setMeetingNotes('');
    setMeetingLink('');
    setMeetingType('zoom');
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return 'bg-red-500 text-white animate-pulse';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Enterprise Requests">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
      </DashboardLayout>
    );
  }

  const pendingRequests = (requests as EnterpriseRequest[])?.filter(req => req.status === 'pending') || [];
  const activeRequests = (requests as EnterpriseRequest[])?.filter(req => req.status === 'in_progress') || [];
  const completedRequests = (requests as EnterpriseRequest[])?.filter(req => req.status === 'completed') || [];
  const scheduledRequests = (requests as EnterpriseRequest[])?.filter(req => req.meetingScheduled && req.status !== 'completed') || [];

  return (
    <DashboardLayout title="Enterprise Requests Management">
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="text-2xl font-bold text-yellow-600">{pendingRequests.length}</p>
                  <p className="text-sm text-gray-600">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <ArrowUpRight className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold text-blue-600">{activeRequests.length}</p>
                  <p className="text-sm text-gray-600">In Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-green-600">{scheduledRequests.length}</p>
                  <p className="text-sm text-gray-600">Meetings Scheduled</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold text-purple-600">{completedRequests.length}</p>
                  <p className="text-sm text-gray-600">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Building className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold text-orange-600">{(requests as EnterpriseRequest[])?.length || 0}</p>
                  <p className="text-sm text-gray-600">Total Requests</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Requests List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Scheduled Meetings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-green-600" />
                <span>Scheduled Meetings</span>
                {scheduledRequests.length > 0 && (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    {scheduledRequests.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {scheduledRequests.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No scheduled meetings</p>
              ) : (
                scheduledRequests.map((request) => (
                  <div key={request.id} className="border-l-4 border-green-500 bg-green-50 rounded-lg p-4 hover:bg-green-100 cursor-pointer transition-all duration-200"
                       onClick={(e) => {
                         e.preventDefault();
                         e.stopPropagation();
                         setSelectedRequest(request);
                       }}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-lg text-green-800">{request.companyName}</h3>
                        <p className="text-sm text-green-700">{request.contactName}</p>
                      </div>
                      <Badge className="bg-green-600 text-white">
                        <Calendar className="w-3 h-3 mr-1" />
                        SCHEDULED
                      </Badge>
                    </div>
                    
                    {request.meetingDate && (
                      <div className="bg-white p-3 rounded border mb-3">
                        <div className="flex items-center space-x-2 text-sm font-medium text-green-800 mb-2">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(request.meetingDate).toLocaleDateString()} at {request.meetingTime}</span>
                        </div>
                        {(request as any).meetingType && (
                          <div className="flex items-center space-x-2 text-xs text-green-700 mb-1">
                            <span className="font-medium">{(request as any).meetingType.replace('_', ' ').toUpperCase()}</span>
                            {(request as any).meetingLink && (
                              <a href={(request as any).meetingLink} target="_blank" rel="noopener noreferrer" 
                                 className="text-blue-600 hover:underline truncate max-w-40 cursor-pointer">
                                {(request as any).meetingType === 'phone' ? (request as any).meetingLink : 'Join Meeting'}
                              </a>
                            )}
                          </div>
                        )}
                        {request.meetingNotes && (
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{request.meetingNotes}</p>
                        )}
                      </div>
                    )}

                    <div className="space-y-1 mb-3">
                      <div className="flex items-center space-x-2 text-sm text-green-700">
                        <Mail className="w-4 h-4" />
                        <span>{request.contactEmail}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-green-700">
                        <Phone className="w-4 h-4" />
                        <span>{request.contactPhone}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-green-700">
                        <Users className="w-4 h-4" />
                        <span>{request.companySize} employees</span>
                      </div>
                    </div>

                    <div className="mb-3">
                      <Badge variant="outline">{request.requestType.replace('_', ' ').toUpperCase()}</Badge>
                    </div>

                    <p className="text-sm text-gray-700 line-clamp-2">{request.message}</p>
                    
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </span>
                      <div className="flex items-center space-x-2">
                        {request.meetingScheduled && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            <Calendar className="w-3 h-3 mr-1" />
                            Meeting Scheduled
                          </Badge>
                        )}
                        <span className="text-xs text-gray-500">
                          Prefers {request.preferredMeetingTime}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Completed Requests - Ready for Enterprise Setup */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span>Completed Agreements</span>
                {completedRequests.length > 0 && (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    {completedRequests.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {completedRequests.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No completed agreements</p>
              ) : (
                completedRequests.map((request) => (
                  <div key={request.id} className="border-l-4 border-green-500 bg-green-50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-lg text-green-800">{request.companyName}</h3>
                        <p className="text-sm text-green-700">{request.contactName}</p>
                      </div>
                      <Badge className="bg-green-600 text-white">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        AGREEMENT COMPLETE
                      </Badge>
                    </div>
                    
                    <div className="space-y-1 mb-3">
                      <div className="flex items-center space-x-2 text-sm text-green-700">
                        <Mail className="w-4 h-4" />
                        <span>{request.contactEmail}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-green-700">
                        <Phone className="w-4 h-4" />
                        <span>{request.contactPhone}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-green-700">
                        <Users className="w-4 h-4" />
                        <span>{request.companySize} employees</span>
                      </div>
                    </div>

                    <div className="mb-3">
                      <Badge variant="outline">{request.requestType.replace('_', ' ').toUpperCase()}</Badge>
                    </div>

                    {/* Enterprise Account Setup Button */}
                    <Button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Setting up enterprise account for:', request.companyName);
                        setSetupRequest(request);
                        setShowSetupModal(true);
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                    >
                      <Building className="w-4 h-4 mr-2" />
                      Setup Enterprise Account
                    </Button>
                    
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        Completed: {new Date(request.updatedAt).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-gray-500">
                        Ready for white-label setup
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* All Requests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="w-5 h-5 text-blue-600" />
                <span>All Enterprise Requests</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {(requests as EnterpriseRequest[])?.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                       onClick={(e) => {
                         e.preventDefault(); 
                         e.stopPropagation();
                         setSelectedRequest(request);
                       }}>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium hover:text-blue-600">{request.companyName}</span>
                        <Badge className={getStatusColor(request.status)} variant="outline">
                          {request.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{request.contactName}</p>
                    </div>
                    <div className="text-right">
                      <Badge className={getUrgencyColor(request.urgency)} variant="outline">
                        {request.urgency}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Selected Request Details Modal */}
        {selectedRequest && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <Building className="w-6 h-6 text-blue-600" />
                  <span>{selectedRequest.companyName} - Request Details</span>
                </span>
                <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                  <XCircle className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Contact Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-gray-500" />
                      <span><strong>Contact:</strong> {selectedRequest.contactName}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span><strong>Email:</strong> {selectedRequest.contactEmail}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span><strong>Phone:</strong> {selectedRequest.contactPhone}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Building className="w-4 h-4 text-gray-500" />
                      <span><strong>Company Size:</strong> {selectedRequest.companySize}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Request Information</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Type:</strong> {selectedRequest.requestType.replace('_', ' ')}</p>
                    <p><strong>Status:</strong> 
                      <Badge className={`ml-2 ${getStatusColor(selectedRequest.status)}`}>
                        {selectedRequest.status}
                      </Badge>
                    </p>
                    <p><strong>Urgency:</strong> 
                      <Badge className={`ml-2 ${getUrgencyColor(selectedRequest.urgency)}`}>
                        {selectedRequest.urgency}
                      </Badge>
                    </p>
                    <p><strong>Preferred Meeting:</strong> {selectedRequest.preferredMeetingTime}</p>
                    {selectedRequest.meetingDate && (
                      <div className="bg-green-50 p-2 rounded">
                        <p><strong>Meeting Date:</strong> {new Date(selectedRequest.meetingDate).toLocaleDateString()} at {selectedRequest.meetingTime}</p>
                        {(selectedRequest as any).meetingType && (
                          <p><strong>Meeting Type:</strong> {(selectedRequest as any).meetingType.replace('_', ' ')}</p>
                        )}
                        {(selectedRequest as any).meetingLink && (
                          <p><strong>Meeting Link:</strong> <a href={(selectedRequest as any).meetingLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{(selectedRequest as any).meetingLink}</a></p>
                        )}
                      </div>
                    )}
                    <p><strong>Created:</strong> {new Date(selectedRequest.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Request Message</h4>
                <p className="bg-gray-50 p-3 rounded-lg">{selectedRequest.message}</p>
              </div>

              {selectedRequest.notes && (
                <div>
                  <h4 className="font-semibold mb-2">Admin Notes</h4>
                  <p className="bg-blue-50 p-3 rounded-lg">{selectedRequest.notes}</p>
                </div>
              )}

              {selectedRequest.meetingNotes && (
                <div>
                  <h4 className="font-semibold mb-2">Meeting Notes</h4>
                  <p className="bg-green-50 p-3 rounded-lg">{selectedRequest.meetingNotes}</p>
                </div>
              )}

              {/* Admin Actions */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Admin Actions</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Update Status</label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder={selectedRequest.status} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Add Notes</label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add internal notes..."
                      className="h-24"
                    />
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-4">
                  <Button 
                    onClick={handleUpdateRequest}
                    disabled={updateRequestMutation.isPending}
                  >
                    {updateRequestMutation.isPending ? 'Updating...' : 'Update Request'}
                  </Button>
                  
                  {(selectedRequest.status === 'pending' || selectedRequest.status === 'in_progress') && !selectedRequest.meetingScheduled && (
                    <Button 
                      onClick={() => setShowMeetingScheduler(true)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Schedule Meeting
                    </Button>
                  )}
                  
                  {selectedRequest.meetingScheduled && selectedRequest.status !== 'completed' && (
                    <Button 
                      onClick={() => {
                        const updates = {
                          status: 'completed',
                          meetingCompleted: true,
                          completedAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString(),
                        };
                        updateRequestMutation.mutate({ id: selectedRequest.id, updates });
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark Meeting Completed
                    </Button>
                  )}
                  
                  {selectedRequest.status === 'completed' && (
                    <Button 
                      onClick={() => {
                        setSetupRequest(selectedRequest);
                        setShowSetupModal(true);
                      }}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Setup Enterprise Account
                    </Button>
                  )}
                  
                  <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Meeting Scheduler Modal */}
        <Dialog open={showMeetingScheduler} onOpenChange={setShowMeetingScheduler}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span>Schedule Meeting</span>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="meetingDate">Meeting Date</Label>
                  <Input
                    id="meetingDate"
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <Label htmlFor="meetingTime">Meeting Time</Label>
                  <Input
                    id="meetingTime"
                    type="time"
                    value={meetingTime}
                    onChange={(e) => setMeetingTime(e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="meetingType">Meeting Type</Label>
                <Select value={meetingType} onValueChange={setMeetingType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select meeting type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zoom">Zoom Call</SelectItem>
                    <SelectItem value="google_meet">Google Meet</SelectItem>
                    <SelectItem value="teams">Microsoft Teams</SelectItem>
                    <SelectItem value="phone">Phone Call</SelectItem>
                    <SelectItem value="in_person">In Person</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="meetingLink">Meeting Link (optional)</Label>
                <Input
                  id="meetingLink"
                  type="url"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  placeholder="https://zoom.us/j/..."
                />
              </div>
              
              <div>
                <Label htmlFor="meetingNotes">Meeting Notes (optional)</Label>
                <Textarea
                  id="meetingNotes"
                  value={meetingNotes}
                  onChange={(e) => setMeetingNotes(e.target.value)}
                  placeholder="Add notes about the meeting agenda..."
                  className="h-20"
                />
              </div>
              
              <div className="flex space-x-2">
                <Button 
                  onClick={handleScheduleMeeting}
                  disabled={updateRequestMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {updateRequestMutation.isPending ? 'Scheduling...' : 'Schedule Meeting'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowMeetingScheduler(false);
                    setMeetingDate('');
                    setMeetingTime('');
                    setMeetingNotes('');
                    setMeetingLink('');
                    setMeetingType('zoom');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Enterprise Setup Modal */}
        {showSetupModal && setupRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="max-w-6xl w-full max-h-screen overflow-y-auto">
              <EnterpriseSetupModal 
                request={setupRequest}
                onClose={() => {
                  setShowSetupModal(false);
                  setSetupRequest(null);
                }}
              />
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}