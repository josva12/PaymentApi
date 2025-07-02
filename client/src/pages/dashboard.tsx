import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CreditCard, TrendingUp, Percent, Clock, Smartphone, University, Eye, Copy } from "lucide-react";
import { formatCurrency, getStatusColor, getProviderIcon } from "@/lib/utils";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [showTestKey, setShowTestKey] = useState(false);
  const [showLiveKey, setShowLiveKey] = useState(false);
  const { toast } = useToast();

  const { data: stats } = useQuery({
    queryKey: ["/api/v1/analytics/stats"],
  });

  const { data: transactions } = useQuery({
    queryKey: ["/api/v1/transactions"],
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "API key has been copied to your clipboard.",
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Developer Dashboard</h1>
          <p className="text-xl text-slate-600">
            Monitor your transactions and manage your API integration
          </p>
        </div>
        
        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="bg-gradient-to-br from-primary to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                  <CreditCard className="text-white w-6 h-6" />
                </div>
                <span className="text-2xl font-bold">{stats?.totalTransactions || 0}</span>
              </div>
              <h3 className="font-semibold text-blue-100">Total Transactions</h3>
              <p className="text-sm text-blue-200">+12% from last month</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-secondary to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="text-white w-6 h-6" />
                </div>
                <span className="text-2xl font-bold">
                  {formatCurrency(stats?.totalVolume || 0)}
                </span>
              </div>
              <h3 className="font-semibold text-green-100">Volume Processed</h3>
              <p className="text-sm text-green-200">+18% from last month</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-accent to-orange-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                  <Percent className="text-white w-6 h-6" />
                </div>
                <span className="text-2xl font-bold">{stats?.successRate || 0}%</span>
              </div>
              <h3 className="font-semibold text-orange-100">Success Rate</h3>
              <p className="text-sm text-orange-200">+0.3% from last month</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-slate-600 to-slate-700 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                  <Clock className="text-white w-6 h-6" />
                </div>
                <span className="text-2xl font-bold">{stats?.avgResponseTime || 0}s</span>
              </div>
              <h3 className="font-semibold text-slate-100">Avg Response Time</h3>
              <p className="text-sm text-slate-200">-0.1s from last month</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Dashboard Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Transactions */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Transactions</CardTitle>
                  <Button variant="link" className="text-primary">
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {transactions?.transactions?.slice(0, 3).map((transaction: any) => (
                    <div key={transaction.transaction_id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center">
                          {transaction.provider === "mpesa" ? (
                            <Smartphone className="text-secondary w-5 h-5" />
                          ) : (
                            <University className="text-primary w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">
                            {transaction.provider === "mpesa" ? "M-Pesa Payment" : "Bank Transfer"}
                          </p>
                          <p className="text-sm text-slate-600">
                            {transaction.phone} • {transaction.reference}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900">
                          {formatCurrency(transaction.amount)}
                        </p>
                        <Badge className={getStatusColor(transaction.status)}>
                          {transaction.status}
                        </Badge>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-8 text-slate-500">
                      No transactions yet. Start by making your first API call.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* API Keys Management */}
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>API Keys</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Test Key</label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type={showTestKey ? "text" : "password"}
                      value="sk_test_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz"
                      className="flex-1 bg-slate-50"
                      readOnly
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowTestKey(!showTestKey)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard("sk_test_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Live Key</label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type={showLiveKey ? "text" : "password"}
                      value="sk_live_def456ghi789jkl012mno345pqr678stu901vwx234yz567abc"
                      className="flex-1 bg-slate-50"
                      readOnly
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowLiveKey(!showLiveKey)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard("sk_live_def456ghi789jkl012mno345pqr678stu901vwx234yz567abc")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <Button className="w-full">
                  Generate New Key
                </Button>
              </CardContent>
            </Card>
            
            {/* Webhook Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Webhook Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Endpoint URL</label>
                  <Input
                    type="url"
                    placeholder="https://yourapp.com/webhook"
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Events</label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-primary focus:ring-primary mr-2"
                        defaultChecked
                      />
                      <span className="text-sm text-slate-700">payment.completed</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-primary focus:ring-primary mr-2"
                        defaultChecked
                      />
                      <span className="text-sm text-slate-700">payment.failed</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-primary focus:ring-primary mr-2"
                      />
                      <span className="text-sm text-slate-700">payment.refunded</span>
                    </label>
                  </div>
                </div>
                
                <Button className="w-full bg-secondary hover:bg-green-700">
                  Save Webhook
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
