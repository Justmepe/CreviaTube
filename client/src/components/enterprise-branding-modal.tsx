import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Crown, Upload, Palette, Globe, Building } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const enterpriseBrandingSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  logoUrl: z.string().url().optional().or(z.literal("")),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color").optional().or(z.literal("")),
  secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color").optional().or(z.literal("")),
  customDomain: z.string().optional().or(z.literal("")),
});

type EnterpriseBrandingForm = z.infer<typeof enterpriseBrandingSchema>;

interface EnterpriseBrandingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBranding?: {
    companyName?: string;
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    customDomain?: string;
  };
}

export function EnterpriseBrandingModal({
  open,
  onOpenChange,
  currentBranding,
}: EnterpriseBrandingModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<EnterpriseBrandingForm>({
    resolver: zodResolver(enterpriseBrandingSchema),
    defaultValues: {
      companyName: currentBranding?.companyName || "",
      logoUrl: currentBranding?.logoUrl || "",
      primaryColor: currentBranding?.primaryColor || "#7c3aed",
      secondaryColor: currentBranding?.secondaryColor || "#3b82f6",
      customDomain: currentBranding?.customDomain || "",
    },
  });

  const updateBrandingMutation = useMutation({
    mutationFn: async (data: EnterpriseBrandingForm) => {
      const response = await fetch("/api/enterprise/branding", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Failed to update branding");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Branding Updated",
        description: "Your enterprise branding has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update branding. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EnterpriseBrandingForm) => {
    updateBrandingMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Crown className="w-5 h-5 text-purple-600" />
            <span>Enterprise Branding Configuration</span>
          </DialogTitle>
          <DialogDescription>
            Customize your white-label platform with your company branding.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Company Information */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Building className="w-4 h-4 text-purple-600" />
                <h3 className="text-lg font-semibold">Company Information</h3>
              </div>
              
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Company Name" {...field} />
                    </FormControl>
                    <FormDescription>
                      This will replace "CreoCash" throughout the platform
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="logoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Logo URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://your-company.com/logo.png" {...field} />
                    </FormControl>
                    <FormDescription>
                      URL to your company logo (recommended: 200x50px PNG)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Color Customization */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Palette className="w-4 h-4 text-purple-600" />
                <h3 className="text-lg font-semibold">Color Scheme</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="primaryColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Color</FormLabel>
                      <div className="flex items-center space-x-2">
                        <FormControl>
                          <Input type="color" className="w-12 h-10 p-1" {...field} />
                        </FormControl>
                        <FormControl>
                          <Input placeholder="#7c3aed" {...field} />
                        </FormControl>
                      </div>
                      <FormDescription>Main brand color</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="secondaryColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Secondary Color</FormLabel>
                      <div className="flex items-center space-x-2">
                        <FormControl>
                          <Input type="color" className="w-12 h-10 p-1" {...field} />
                        </FormControl>
                        <FormControl>
                          <Input placeholder="#3b82f6" {...field} />
                        </FormControl>
                      </div>
                      <FormDescription>Accent color</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Domain Configuration */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-purple-600" />
                <h3 className="text-lg font-semibold">Domain Settings</h3>
              </div>

              <FormField
                control={form.control}
                name="customDomain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Domain</FormLabel>
                    <FormControl>
                      <Input placeholder="affiliate.yourcompany.com" {...field} />
                    </FormControl>
                    <FormDescription>
                      Custom domain for your white-label platform (requires DNS setup)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Preview Section */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Preview</h4>
              <div className="bg-white rounded border p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <div 
                    className="w-6 h-6 rounded" 
                    style={{ backgroundColor: form.watch("primaryColor") || "#7c3aed" }}
                  ></div>
                  <span className="font-semibold">
                    {form.watch("companyName") || "Your Company"} Affiliate Platform
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  Domain: {form.watch("customDomain") || "yourcompany.creocash.com"}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateBrandingMutation.isPending}
                className="bg-gradient-to-r from-purple-500 to-blue-600"
              >
                {updateBrandingMutation.isPending ? "Updating..." : "Update Branding"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}