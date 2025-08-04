import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Clock, 
  Phone, 
  Mail, 
  Building, 
  Users,
  CheckCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const enterpriseContactSchema = z.object({
  contactName: z.string().min(1, "Contact name is required"),
  contactEmail: z.string().email("Valid email is required"),
  contactPhone: z.string().optional(),
  companyName: z.string().min(1, "Company name is required"),
  companySize: z.enum(["1-10", "11-50", "51-200", "201-1000", "1000+"]),
  requestType: z.enum(["pricing", "demo", "technical", "custom_setup", "other"]),
  message: z.string().min(10, "Please provide more details (minimum 10 characters)"),
  preferredMeetingTime: z.enum(["morning", "afternoon", "evening", "flexible"]),
  urgency: z.enum(["low", "medium", "high", "urgent"]),
});

type EnterpriseContactForm = z.infer<typeof enterpriseContactSchema>;

interface EnterpriseContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userInfo?: {
    fullName?: string;
    email?: string;
    companyName?: string;
  };
}

export function EnterpriseContactModal({
  open,
  onOpenChange,
  userInfo,
}: EnterpriseContactModalProps) {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<EnterpriseContactForm>({
    resolver: zodResolver(enterpriseContactSchema),
    defaultValues: {
      contactName: userInfo?.fullName || "",
      contactEmail: userInfo?.email || "",
      contactPhone: "",
      companyName: userInfo?.companyName || "",
      companySize: "1-10",
      requestType: "pricing",
      message: "",
      preferredMeetingTime: "flexible",
      urgency: "medium",
    },
  });

  const submitContactMutation = useMutation({
    mutationFn: async (data: EnterpriseContactForm) => {
      const response = await fetch("/api/enterprise/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Failed to submit contact request");
      }
      return response.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "Request Submitted",
        description: "Our enterprise team will contact you within 24 hours.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EnterpriseContactForm) => {
    submitContactMutation.mutate(data);
  };

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Request Submitted!</h2>
            <p className="text-slate-600 mb-6">
              Our enterprise team has been notified and will contact you within 24 hours to discuss your requirements.
            </p>
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>What happens next:</strong><br />
                1. Enterprise team reviews your request<br />
                2. We'll schedule a personalized consultation<br />
                3. Custom pricing and setup discussion<br />
                4. Platform configuration and onboarding
              </p>
            </div>
            <Button onClick={() => {
              setSubmitted(false);
              onOpenChange(false);
            }}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Building className="w-5 h-5 text-blue-600" />
            <span>Contact Enterprise Team</span>
          </DialogTitle>
          <DialogDescription>
            Get personalized pricing, custom setup, and dedicated support for your organization.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Contact Information</span>
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input placeholder="john@company.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 (555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="companySize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Size</FormLabel>
                      <FormControl>
                        <select className="w-full p-2 border rounded-md" {...field}>
                          <option value="1-10">1-10 employees</option>
                          <option value="11-50">11-50 employees</option>
                          <option value="51-200">51-200 employees</option>
                          <option value="201-1000">201-1000 employees</option>
                          <option value="1000+">1000+ employees</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Company Inc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Request Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <Mail className="w-4 h-4 text-blue-600" />
                <span>Request Details</span>
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="requestType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Request Type</FormLabel>
                      <FormControl>
                        <select className="w-full p-2 border rounded-md" {...field}>
                          <option value="pricing">Custom Pricing</option>
                          <option value="demo">Platform Demo</option>
                          <option value="technical">Technical Discussion</option>
                          <option value="custom_setup">Custom Setup</option>
                          <option value="other">Other</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="urgency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Urgency</FormLabel>
                      <FormControl>
                        <select className="w-full p-2 border rounded-md" {...field}>
                          <option value="low">Low - No rush</option>
                          <option value="medium">Medium - This week</option>
                          <option value="high">High - Within 2 days</option>
                          <option value="urgent">Urgent - Today</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="preferredMeetingTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Meeting Time</FormLabel>
                    <FormControl>
                      <select className="w-full p-2 border rounded-md" {...field}>
                        <option value="morning">Morning (9 AM - 12 PM)</option>
                        <option value="afternoon">Afternoon (12 PM - 5 PM)</option>
                        <option value="evening">Evening (5 PM - 8 PM)</option>
                        <option value="flexible">Flexible</option>
                      </select>
                    </FormControl>
                    <FormDescription>All times in your local timezone</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Please describe your requirements, expected volume, specific features needed, or any questions you have about enterprise pricing and setup..."
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Help us prepare for our discussion by providing details about your needs
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={submitContactMutation.isPending}
                className="bg-gradient-to-r from-blue-500 to-indigo-600"
              >
                {submitContactMutation.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}