import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Building, Settings, Palette, DollarSign, Shield, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface EnterpriseSetupModalProps {
  request: any;
  onClose: () => void;
}

export function EnterpriseSetupModal({ request, onClose }: EnterpriseSetupModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Basic setup state
  const [customDomain, setCustomDomain] = useState('');
  const [billingCycle, setBillingCycle] = useState('monthly');
  
  // Branding state
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [secondaryColor, setSecondaryColor] = useState('#64748b');
  const [companyName, setCompanyName] = useState(request.companyName);
  const [logoUrl, setLogoUrl] = useState('');
  const [customCss, setCustomCss] = useState('');
  
  // Pricing state
  const [commissionRate, setCommissionRate] = useState(15);
  const [payoutThreshold, setPayoutThreshold] = useState(50);
  const [customRates, setCustomRates] = useState({
    trader: 10,
    influencer: 15,
    entrepreneur: 12,
    enterprise: 8
  });
  
  // Features state
  const [features, setFeatures] = useState({
    whiteLabel: true,
    customBranding: true,
    apiAccess: true,
    customDomains: true,
    prioritySupport: true,
    dedicatedManager: true
  });
  
  // Contract details
  const [contractNotes, setContractNotes] = useState('');

  const createAccountMutation = useMutation({
    mutationFn: async (accountData: any) => {
      const response = await fetch('/api/admin/enterprise-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountData),
      });
      if (!response.ok) throw new Error('Failed to create enterprise account');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/enterprise-requests"] });
      toast({ title: "Enterprise account created successfully!" });
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to create enterprise account", variant: "destructive" });
    },
  });

  const handleCreateAccount = () => {
    const accountData = {
      requestId: request.id,
      userId: request.userId,
      companyName: companyName,
      customDomain: customDomain || `${companyName.toLowerCase().replace(/\s+/g, '-')}.creocash.com`,
      brandingConfig: {
        logo: logoUrl,
        primaryColor,
        secondaryColor,
        customCss,
        companyName
      },
      pricingConfig: {
        commissionRate: commissionRate / 100,
        payoutThreshold,
        customRates: {
          trader: customRates.trader / 100,
          influencer: customRates.influencer / 100,
          entrepreneur: customRates.entrepreneur / 100,
          enterprise: customRates.enterprise / 100
        }
      },
      features,
      billingCycle,
      contractDetails: {
        notes: contractNotes,
        setupDate: new Date().toISOString(),
        contactEmail: request.contactEmail,
        contactPhone: request.contactPhone
      }
    };

    createAccountMutation.mutate(accountData);
  };

  return (
    <Card className="max-w-6xl mx-auto">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Building className="w-6 h-6 text-blue-600" />
            <span>Setup Enterprise Account: {request.companyName}</span>
          </div>
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <h3 className="text-lg font-semibold text-green-800 mb-2">Enterprise White-Label Setup</h3>
            <p className="text-sm text-green-700">
              This will create a complete white-label affiliate marketing platform for <strong>{request.companyName}</strong> 
              with custom branding, domain, and negotiated commission rates separate from standard CreoCash users.
            </p>
          </div>
          
          <h3 className="text-lg font-semibold mb-2">Contact Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <p><strong>Contact:</strong> {request.contactName}</p>
            <p><strong>Email:</strong> {request.contactEmail}</p>
            <p><strong>Phone:</strong> {request.contactPhone}</p>
            <p><strong>Company Size:</strong> {request.companySize}</p>
          </div>
        </div>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Setup</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="customDomain">Custom Domain</Label>
                <Input
                  id="customDomain"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  placeholder={`${companyName.toLowerCase().replace(/\s+/g, '-')}.creocash.com`}
                />
              </div>
              
              <div>
                <Label htmlFor="billingCycle">Billing Cycle</Label>
                <Select value={billingCycle} onValueChange={setBillingCycle}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="contractNotes">Contract Notes</Label>
              <Textarea
                id="contractNotes"
                value={contractNotes}
                onChange={(e) => setContractNotes(e.target.value)}
                placeholder="Add any specific contract terms, agreements, or notes..."
                rows={4}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="branding" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="logoUrl">Company Logo URL</Label>
                  <Input
                    id="logoUrl"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://company.com/logo.png"
                  />
                </div>
                
                <div>
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-16 h-10"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      placeholder="#2563eb"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="secondaryColor">Secondary Color</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-16 h-10"
                    />
                    <Input
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      placeholder="#64748b"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="customCss">Custom CSS</Label>
                  <Textarea
                    id="customCss"
                    value={customCss}
                    onChange={(e) => setCustomCss(e.target.value)}
                    placeholder="/* Custom CSS overrides */\n.header { background: #custom; }"
                    rows={6}
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold">Brand Preview</h4>
                <div className="border rounded-lg p-4" style={{ borderColor: primaryColor }}>
                  <div className="flex items-center space-x-3 mb-4">
                    {logoUrl && (
                      <img src={logoUrl} alt="Logo" className="w-8 h-8 object-contain" />
                    )}
                    <span style={{ color: primaryColor }} className="font-bold text-lg">
                      {companyName}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div 
                      className="w-full h-8 rounded"
                      style={{ backgroundColor: primaryColor + '20', border: `1px solid ${primaryColor}` }}
                    />
                    <div 
                      className="w-3/4 h-6 rounded"
                      style={{ backgroundColor: secondaryColor + '20', border: `1px solid ${secondaryColor}` }}
                    />
                    <div 
                      className="w-1/2 h-4 rounded"
                      style={{ backgroundColor: primaryColor + '10' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="pricing" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="commissionRate">Enterprise Commission Rate (%)</Label>
                  <Input
                    id="commissionRate"
                    type="number"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(Number(e.target.value))}
                    min={0}
                    max={30}
                  />
                  <p className="text-xs text-gray-600 mt-1">Standard users: 20% | Enterprise: Custom negotiated rates</p>
                </div>
                
                <div>
                  <Label htmlFor="payoutThreshold">Minimum Payout Threshold ($)</Label>
                  <Input
                    id="payoutThreshold"
                    type="number"
                    value={payoutThreshold}
                    onChange={(e) => setPayoutThreshold(Number(e.target.value))}
                    min={10}
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold">Enterprise Custom Rates by Creator Type (%)</h4>
                <div className="bg-blue-50 p-3 rounded-lg mb-3">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> These custom rates apply only to this enterprise account. 
                    Standard CreoCash users continue paying the standard 20% platform fee.
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Trading Educators</Label>
                      <p className="text-xs text-gray-500">Standard: 20%</p>
                    </div>
                    <Input
                      type="number"
                      value={customRates.trader}
                      onChange={(e) => setCustomRates({...customRates, trader: Number(e.target.value)})}
                      className="w-20"
                      min={0}
                      max={30}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Social Influencers</Label>
                      <p className="text-xs text-gray-500">Standard: 20%</p>
                    </div>
                    <Input
                      type="number"
                      value={customRates.influencer}
                      onChange={(e) => setCustomRates({...customRates, influencer: Number(e.target.value)})}
                      className="w-20"
                      min={0}
                      max={30}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Business Entrepreneurs</Label>
                      <p className="text-xs text-gray-500">Standard: 20%</p>
                    </div>
                    <Input
                      type="number"
                      value={customRates.entrepreneur}
                      onChange={(e) => setCustomRates({...customRates, entrepreneur: Number(e.target.value)})}
                      className="w-20"
                      min={0}
                      max={30}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enterprise Sub-Partners</Label>
                      <p className="text-xs text-gray-500">Standard: 20%</p>
                    </div>
                    <Input
                      type="number"
                      value={customRates.enterprise}
                      onChange={(e) => setCustomRates({...customRates, enterprise: Number(e.target.value)})}
                      className="w-20"
                      min={0}
                      max={30}
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="features" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(features).map(([feature, enabled]) => (
                <div key={feature} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium capitalize">
                      {feature.replace(/([A-Z])/g, ' $1').trim()}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {getFeatureDescription(feature)}
                    </p>
                  </div>
                  <Button
                    variant={enabled ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFeatures({...features, [feature]: !enabled})}
                  >
                    {enabled ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
        
        <Separator className="my-6" />
        
        <div className="flex justify-end space-x-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateAccount}
            disabled={createAccountMutation.isPending || !companyName}
            className="bg-green-600 hover:bg-green-700"
          >
            {createAccountMutation.isPending ? 'Creating Account...' : 'Create Enterprise Account'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function getFeatureDescription(feature: string): string {
  const descriptions: Record<string, string> = {
    whiteLabel: 'Complete white-label solution with your branding',
    customBranding: 'Custom logos, colors, and styling',
    apiAccess: 'Full API access for integrations',
    customDomains: 'Custom domain hosting capability',
    prioritySupport: '24/7 priority customer support',
    dedicatedManager: 'Dedicated account manager'
  };
  return descriptions[feature] || '';
}