import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building, Globe, Palette, DollarSign, Users, CheckCircle, Clock, Settings } from 'lucide-react';
import { useState } from "react";

interface EnterpriseAccount {
  id: string;
  requestId: string;
  userId: string;
  companyName: string;
  customDomain: string;
  brandingConfig: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
    customCss?: string;
    companyName?: string;
  };
  pricingConfig: {
    commissionRate: number;
    payoutThreshold: number;
    customRates?: { [key: string]: number };
  };
  features: {
    whiteLabel: boolean;
    customBranding: boolean;
    apiAccess: boolean;
    customDomains: boolean;
    prioritySupport: boolean;
    dedicatedManager: boolean;
  };
  status: 'setup' | 'active' | 'suspended' | 'cancelled';
  activatedAt: string | null;
  billingCycle: string;
  contractDetails: any;
  createdAt: string;
  updatedAt: string;
}

export default function EnterpriseAccounts() {
  const [selectedAccount, setSelectedAccount] = useState<EnterpriseAccount | null>(null);

  // Fetch enterprise accounts
  const { data: accounts, isLoading } = useQuery({
    queryKey: ["/api/admin/enterprise-accounts"],
    refetchInterval: 30000,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'setup': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'setup': return <Clock className="w-4 h-4" />;
      case 'active': return <CheckCircle className="w-4 h-4" />;
      case 'suspended': return <Settings className="w-4 h-4" />;
      case 'cancelled': return <Settings className="w-4 h-4" />;
      default: return <Building className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Enterprise Accounts">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
      </DashboardLayout>
    );
  }

  const enterpriseAccounts = (accounts as EnterpriseAccount[]) || [];
  const activeAccounts = enterpriseAccounts.filter(acc => acc.status === 'active');
  const setupAccounts = enterpriseAccounts.filter(acc => acc.status === 'setup');

  return (
    <DashboardLayout title="Enterprise Accounts Management">
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Building className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{enterpriseAccounts.length}</p>
                  <p className="text-sm text-gray-600">Total Accounts</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{activeAccounts.length}</p>
                  <p className="text-sm text-gray-600">Active Accounts</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="text-2xl font-bold">{setupAccounts.length}</p>
                  <p className="text-sm text-gray-600">In Setup</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">
                    {activeAccounts.length > 0 
                      ? `${Math.round(activeAccounts.reduce((avg, acc) => avg + (acc.pricingConfig.commissionRate * 100), 0) / activeAccounts.length)}%`
                      : '0%'
                    }
                  </p>
                  <p className="text-sm text-gray-600">Avg Commission</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Accounts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {enterpriseAccounts.map((account) => (
            <Card key={account.id} className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedAccount(account)}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <Building className="w-5 h-5 text-blue-600" />
                    <span className="truncate">{account.companyName}</span>
                  </CardTitle>
                  <Badge className={getStatusColor(account.status)} variant="outline">
                    {getStatusIcon(account.status)}
                    <span className="ml-1 capitalize">{account.status}</span>
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Globe className="w-4 h-4" />
                  <span className="truncate">{account.customDomain || 'No domain set'}</span>
                </div>
                
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <DollarSign className="w-4 h-4" />
                  <span>Commission: {Math.round(account.pricingConfig.commissionRate * 100)}%</span>
                </div>
                
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Palette className="w-4 h-4" />
                  <div className="flex space-x-1">
                    {account.brandingConfig.primaryColor && (
                      <div 
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: account.brandingConfig.primaryColor }}
                      />
                    )}
                    {account.brandingConfig.secondaryColor && (
                      <div 
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: account.brandingConfig.secondaryColor }}
                      />
                    )}
                    <span>Custom Branding</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mt-3">
                  {Object.entries(account.features).filter(([_, enabled]) => enabled).map(([feature]) => (
                    <Badge key={feature} variant="secondary" className="text-xs">
                      {feature.replace(/([A-Z])/g, ' $1').trim()}
                    </Badge>
                  ))}
                </div>

                <div className="text-xs text-gray-500 border-t pt-2">
                  Created: {new Date(account.createdAt).toLocaleDateString()}
                  {account.activatedAt && (
                    <span className="block">
                      Activated: {new Date(account.activatedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Account Details Modal */}
        {selectedAccount && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <Building className="w-6 h-6 text-blue-600" />
                  <span>{selectedAccount.companyName} - Account Details</span>
                </span>
                <Button variant="outline" onClick={() => setSelectedAccount(null)}>
                  Close
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div>
                  <h4 className="font-semibold mb-3">Account Information</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Account ID:</strong> {selectedAccount.id}</p>
                    <p><strong>Status:</strong> 
                      <Badge className={`ml-2 ${getStatusColor(selectedAccount.status)}`}>
                        {selectedAccount.status}
                      </Badge>
                    </p>
                    <p><strong>Domain:</strong> {selectedAccount.customDomain}</p>
                    <p><strong>Billing:</strong> {selectedAccount.billingCycle}</p>
                  </div>
                </div>

                {/* Pricing Config */}
                <div>
                  <h4 className="font-semibold mb-3">Pricing Configuration</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Commission Rate:</strong> {Math.round(selectedAccount.pricingConfig.commissionRate * 100)}%</p>
                    <p><strong>Payout Threshold:</strong> ${selectedAccount.pricingConfig.payoutThreshold}</p>
                    {selectedAccount.pricingConfig.customRates && (
                      <div className="mt-2">
                        <p className="font-medium">Custom Rates:</p>
                        <ul className="ml-4 space-y-1">
                          {Object.entries(selectedAccount.pricingConfig.customRates).map(([type, rate]) => (
                            <li key={type}>
                              {type}: {Math.round((rate as number) * 100)}%
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Features */}
              <div>
                <h4 className="font-semibold mb-3">Enabled Features</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(selectedAccount.features).map(([feature, enabled]) => (
                    <div key={feature} className={`p-2 rounded text-sm ${enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {enabled ? '✓' : '✗'} {feature.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                  ))}
                </div>
              </div>

              {/* Branding Preview */}
              {selectedAccount.brandingConfig && (
                <div>
                  <h4 className="font-semibold mb-3">Branding Configuration</h4>
                  <div className="border rounded-lg p-4" style={{ 
                    borderColor: selectedAccount.brandingConfig.primaryColor || '#e5e7eb'
                  }}>
                    <div className="flex items-center space-x-3 mb-4">
                      {selectedAccount.brandingConfig.logo && (
                        <img 
                          src={selectedAccount.brandingConfig.logo} 
                          alt="Logo" 
                          className="w-8 h-8 object-contain" 
                        />
                      )}
                      <span 
                        style={{ color: selectedAccount.brandingConfig.primaryColor || '#000' }} 
                        className="font-bold text-lg"
                      >
                        {selectedAccount.brandingConfig.companyName || selectedAccount.companyName}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      {selectedAccount.brandingConfig.primaryColor && (
                        <div className="text-center">
                          <div 
                            className="w-12 h-12 rounded border mb-1"
                            style={{ backgroundColor: selectedAccount.brandingConfig.primaryColor }}
                          />
                          <p className="text-xs text-gray-600">Primary</p>
                        </div>
                      )}
                      {selectedAccount.brandingConfig.secondaryColor && (
                        <div className="text-center">
                          <div 
                            className="w-12 h-12 rounded border mb-1"
                            style={{ backgroundColor: selectedAccount.brandingConfig.secondaryColor }}
                          />
                          <p className="text-xs text-gray-600">Secondary</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {enterpriseAccounts.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Enterprise Accounts</h3>
              <p className="text-gray-600">Enterprise accounts will appear here once they are created from completed requests.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}