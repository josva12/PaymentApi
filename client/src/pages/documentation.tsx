import Navigation from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Documentation() {
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Code example has been copied to your clipboard.",
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-16">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">API Documentation</h1>
          <p className="text-xl text-slate-600">
            Complete API reference with examples and best practices
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>API Endpoints</CardTitle>
              </CardHeader>
              <CardContent>
                <nav className="space-y-2">
                  <a href="#auth" className="block px-3 py-2 text-sm text-primary bg-primary/5 rounded-lg font-medium">
                    Authentication
                  </a>
                  <a href="#payments" className="block px-3 py-2 text-sm text-slate-600 hover:text-primary hover:bg-slate-50 rounded-lg">
                    Payment Processing
                  </a>
                  <a href="#transactions" className="block px-3 py-2 text-sm text-slate-600 hover:text-primary hover:bg-slate-50 rounded-lg">
                    Transaction Status
                  </a>
                  <a href="#webhooks" className="block px-3 py-2 text-sm text-slate-600 hover:text-primary hover:bg-slate-50 rounded-lg">
                    Webhooks
                  </a>
                  <a href="#users" className="block px-3 py-2 text-sm text-slate-600 hover:text-primary hover:bg-slate-50 rounded-lg">
                    User Management
                  </a>
                  <a href="#reporting" className="block px-3 py-2 text-sm text-slate-600 hover:text-primary hover:bg-slate-50 rounded-lg">
                    Reporting
                  </a>
                </nav>
              </CardContent>
            </Card>
          </div>
          
          {/* Main Documentation Content */}
          <div className="lg:col-span-2">
            <div className="space-y-8">
              {/* Authentication Section */}
              <Card id="auth">
                <CardHeader>
                  <CardTitle className="text-2xl">Authentication</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-slate-600">
                    All API requests require authentication using your API key in the Authorization header.
                  </p>
                  
                  <div className="bg-slate-900 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium text-slate-400">REQUEST</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(`curl -X GET \\
  https://api.kenyanpay.com/v1/health \\
  -H 'Authorization: Bearer sk_test_...' \\
  -H 'Content-Type: application/json'`)}
                        className="text-slate-400 hover:text-white"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <pre className="text-sm text-slate-300 overflow-x-auto">
{`curl -X GET \\
  https://api.kenyanpay.com/v1/health \\
  -H 'Authorization: Bearer sk_test_...' \\
  -H 'Content-Type: application/json'`}
                    </pre>
                  </div>
                  
                  <div className="bg-slate-50 rounded-lg p-6">
                    <h4 className="font-semibold text-slate-900 mb-3">API Key Types</h4>
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-secondary rounded-full mt-2"></div>
                        <div>
                          <span className="font-medium text-slate-900">Test Keys:</span>
                          <span className="text-slate-600"> sk_test_... - Use for development and testing</span>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                        <div>
                          <span className="font-medium text-slate-900">Live Keys:</span>
                          <span className="text-slate-600"> sk_live_... - Use for production transactions</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Payment Processing Section */}
              <Card id="payments">
                <CardHeader>
                  <CardTitle className="text-2xl">Payment Processing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-slate-600">
                    Initiate payments across M-Pesa, Airtel Money, and bank transfers with a unified API.
                  </p>
                  
                  <div className="mb-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">POST</span>
                      <span className="font-mono text-sm text-slate-600">/api/v1/payments/initiate</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-semibold text-slate-900 mb-3">Request Body</h5>
                        <div className="bg-slate-900 rounded-lg p-4">
                          <pre className="text-sm text-slate-300 overflow-x-auto">
{`{
  "amount": 1000,
  "currency": "KES",
  "provider": "mpesa",
  "phone": "254712345678",
  "reference": "INV-001",
  "callback_url": "https://yourapp.com/callback"
}`}
                          </pre>
                        </div>
                      </div>
                      
                      <div>
                        <h5 className="font-semibold text-slate-900 mb-3">Response</h5>
                        <div className="bg-slate-900 rounded-lg p-4">
                          <pre className="text-sm text-slate-300 overflow-x-auto">
{`{
  "status": "success",
  "transaction_id": "txn_abc123",
  "payment_status": "pending",
  "checkout_request_id": "ws_CO_191220191020"
}`}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="text-amber-600 w-5 h-5 mt-1" />
                      <div>
                        <h5 className="font-semibold text-amber-900 mb-1">Idempotency</h5>
                        <p className="text-amber-800 text-sm">
                          Include an idempotency key in the request header to prevent duplicate transactions.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Transaction Status Section */}
              <Card id="transactions">
                <CardHeader>
                  <CardTitle className="text-2xl">Transaction Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-slate-600">
                    Check the status of any transaction using the transaction ID.
                  </p>
                  
                  <div className="flex items-center space-x-3 mb-4">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">GET</span>
                    <span className="font-mono text-sm text-slate-600">/api/v1/transactions/{transaction_id}</span>
                  </div>
                  
                  <div className="bg-slate-900 rounded-lg p-6">
                    <div className="text-sm text-slate-300 overflow-x-auto">
                      <div className="text-slate-400 mb-2">Response</div>
                      <pre>
{`{
  "transaction_id": "txn_abc123",
  "status": "completed",
  "amount": 1000,
  "currency": "KES",
  "provider": "mpesa",
  "mpesa_receipt_number": "NLJ7RT61SV",
  "created_at": "2024-01-15T10:30:00Z",
  "completed_at": "2024-01-15T10:30:45Z"
}`}
                      </pre>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
