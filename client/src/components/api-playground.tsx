import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Copy, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ApiPlayground() {
  const [method, setMethod] = useState("POST");
  const [endpoint, setEndpoint] = useState("/api/v1/payments/initiate");
  const [requestBody, setRequestBody] = useState(`{
  "amount": 1000,
  "currency": "KES",
  "provider": "mpesa",
  "phone": "254712345678",
  "reference": "TEST-001",
  "callback_url": "https://webhook.site/unique-url"
}`);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSendRequest = async () => {
    setLoading(true);
    try {
      // Simulate API request
      setTimeout(() => {
        const mockResponse = {
          status: "success",
          transaction_id: "txn_abc123",
          payment_status: "pending",
          checkout_request_id: "ws_CO_191220191020",
          message: "STK push sent successfully",
          created_at: new Date().toISOString()
        };
        setResponse(mockResponse);
        setLoading(false);
        toast({
          title: "Request Successful",
          description: "STK push has been sent to the customer's phone.",
        });
      }, 1000);
    } catch (error) {
      setLoading(false);
      toast({
        title: "Request Failed",
        description: "An error occurred while processing the request.",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Content has been copied to your clipboard.",
    });
  };

  return (
    <section className="py-20 bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">API Playground</h2>
          <p className="text-xl text-slate-300">
            Test our API endpoints directly from your browser
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Request Panel */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Make a Request</CardTitle>
                <Button 
                  onClick={handleSendRequest} 
                  disabled={loading}
                  className="bg-primary hover:bg-blue-700"
                >
                  {loading ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Request
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-2">
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                  </SelectContent>
                </Select>
                <Input 
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  className="col-span-3 bg-slate-700 border-slate-600 text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Headers</label>
                <div className="bg-slate-700 rounded-lg p-4 font-mono text-sm">
                  <div className="space-y-1">
                    <div>Authorization: Bearer sk_test_...</div>
                    <div>Content-Type: application/json</div>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Request Body</label>
                <Textarea 
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  className="h-48 bg-slate-700 border-slate-600 font-mono text-sm resize-none text-white"
                />
              </div>
            </CardContent>
          </Card>
          
          {/* Response Panel */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Response</CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge className="bg-secondary text-secondary-foreground">200 OK</Badge>
                  <span className="text-sm text-slate-400">234ms</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Response Headers</label>
                <div className="bg-slate-700 rounded-lg p-4 font-mono text-sm">
                  <div className="space-y-1 text-slate-300">
                    <div>content-type: application/json</div>
                    <div>x-request-id: req_abc123</div>
                    <div>x-rate-limit-remaining: 99</div>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-300">Response Body</label>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => copyToClipboard(JSON.stringify(response, null, 2))}
                    className="text-slate-400 hover:text-white"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <div className="bg-slate-700 rounded-lg p-4 text-sm overflow-x-auto">
                  <pre className="text-slate-300">
                    {response ? JSON.stringify(response, null, 2) : "No response yet..."}
                  </pre>
                </div>
              </div>
              
              {response && (
                <div className="p-4 bg-green-900/20 border border-green-700 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="text-secondary w-5 h-5 mt-1" />
                    <div>
                      <h5 className="font-semibold text-secondary mb-1">Request Successful</h5>
                      <p className="text-sm text-slate-300">
                        STK push has been sent to the customer's phone. Check transaction status using the transaction_id.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
