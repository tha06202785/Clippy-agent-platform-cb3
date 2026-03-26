import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Facebook, Check, AlertCircle, Link as LinkIcon } from 'lucide-react';

export function FacebookIntegration() {
  const [isConnected, setIsConnected] = useState(false);
  const [pageId, setPageId] = useState('');
  const [pageName, setPageName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async () => {
    setIsLoading(true);
    
    // Simulate Facebook OAuth flow
    // In production, this would open Facebook OAuth popup
    
    setTimeout(() => {
      setIsConnected(true);
      setPageName('Demo Real Estate Page');
      setPageId('123456789');
      setIsLoading(false);
      toast.success('Facebook Page connected successfully!');
    }, 2000);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setPageId('');
    setPageName('');
    toast.success('Disconnected from Facebook');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Facebook className="h-5 w-5 text-blue-600" />
          Facebook Integration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-900">Connect Facebook Page</h4>
              <p className="text-sm text-blue-700 mt-1">
                Automatically capture leads from comments and messages on your Facebook page.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>What happens when connected:</Label>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Comments on posts become leads automatically</li>
                <li>• Direct messages are captured in your inbox</li>
                <li>• AI replies are sent to Facebook automatically</li>
                <li>• All conversations sync to Clippy dashboard</li>
              </ul>
            </div>
            
            <Button 
              onClick={handleConnect} 
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? 'Connecting...' : 'Connect Facebook Page'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <Facebook className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-green-900">{pageName}</h4>
                  <p className="text-sm text-green-700">Connected and active</p>
                </div>
              </div>
              <Check className="h-5 w-5 text-green-600" />
            </div>
            
            <div className="space-y-2">
              <Label>Page ID</Label>
              <Input value={pageId} readOnly />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">0</div>
                  <div className="text-sm text-muted-foreground">Leads Today</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">0</div>
                  <div className="text-sm text-muted-foreground">Messages</div>
                </CardContent>
              </Card>
            </div>
            
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-900">Webhook URL</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Add this URL to your Facebook app settings:
                  </p>
                  <code className="block mt-2 p-2 bg-yellow-100 rounded text-xs break-all">
                    https://useclippy.com/api/webhooks/facebook
                  </code>
                </div>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              onClick={handleDisconnect}
              className="w-full"
            >
              Disconnect Facebook
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
