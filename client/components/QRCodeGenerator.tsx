import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { QrCode, Download, Link as LinkIcon, Copy } from 'lucide-react';

interface QRCodeGeneratorProps {
  listingId: string;
  listingAddress: string;
  orgId: string;
  agentId: string;
}

export function QRCodeGenerator({ 
  listingId, 
  listingAddress,
  orgId,
  agentId 
}: QRCodeGeneratorProps) {
  const [qrData, setQrData] = useState<{
    short_code: string;
    short_url: string;
    qr_code: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generateQR = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/qr/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listingId,
          org_id: orgId,
          agent_id: agentId
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setQrData(data);
        toast.success('QR Code generated!');
      } else {
        toast.error('Failed to generate QR code');
      }
    } catch (error) {
      toast.error('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const copyLink = () => {
    if (qrData?.short_url) {
      navigator.clipboard.writeText(qrData.short_url);
      toast.success('Link copied to clipboard!');
    }
  };

  const downloadQR = () => {
    if (qrData?.qr_code) {
      const link = document.createElement('a');
      link.href = qrData.qr_code;
      link.download = `qr-${qrData.short_code}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('QR code downloaded!');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          QR Code Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!qrData ? (
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              Generate a QR code and short link for this property.<br/>
              Perfect for print materials, signs, and in-person handoffs.
            </p>
            
            <div className="bg-muted p-4 rounded-lg text-left text-sm">
              <p className="font-semibold mb-2">When someone scans the QR code:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Opens property page on their phone</li>
                <li>• Can enter their details</li>
                <li>• Lead automatically created in Clippy</li>
                <li>• You get notified instantly</li>
              </ul>
            </div>
            
            <Button 
              onClick={generateQR} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Generating...' : 'Generate QR Code'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* QR Code Display */}
            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <img 
                  src={qrData.qr_code} 
                  alt="Property QR Code"
                  className="w-48 h-48"
                />
              </div>
            </div>
            
            {/* Short Link */}
            <div className="space-y-2">
              <Label>Short Link</Label>
              <div className="flex gap-2">
                <Input 
                  value={qrData.short_url} 
                  readOnly 
                  className="flex-1"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={copyLink}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={downloadQR}
              >
                <Download className="h-4 w-4 mr-2" />
                Download QR
              </Button>
              
              <Button 
                variant="outline"
                className="flex-1"
                onClick={() => setQrData(null)}
              >
                Generate New
              </Button>
            </div>
            
            {/* Usage Tips */}
            <div className="bg-blue-50 p-4 rounded-lg text-sm">
              <p className="font-semibold text-blue-900 mb-2">💡 How to use:</p>
              <ul className="text-blue-700 space-y-1">
                <li>• Print QR on flyers, brochures, signboards</li>
                <li>• Share short link via SMS/WhatsApp</li>
                <li>• Put on "For Sale" signs</li>
                <li>• Use at open homes for instant capture</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
