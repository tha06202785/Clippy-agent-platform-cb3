import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PropertyDetails {
  address: string;
  suburb: string;
  beds: number;
  baths: number;
  cars: number;
  price: string;
  features: string;
}

interface GeneratedContent {
  whatsapp: string;
  facebook: string;
  instagram: string;
  realestate: string;
  email_subject: string;
  email_body: string;
}

export function ListingContentGenerator() {
  const [loading, setLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [property, setProperty] = useState<PropertyDetails>({
    address: '',
    suburb: '',
    beds: 3,
    baths: 2,
    cars: 1,
    price: '',
    features: ''
  });
  const [generated, setGenerated] = useState<GeneratedContent | null>(null);

  const generateContent = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/listing/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(property)
      });
      
      const data = await response.json();
      setGenerated(data);
      toast.success('Content generated successfully!');
    } catch (error) {
      toast.error('Failed to generate content');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Property Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Address</Label>
              <Input 
                value={property.address}
                onChange={(e) => setProperty({...property, address: e.target.value})}
                placeholder="123 Main Street"
              />
            </div>
            <div className="space-y-2">
              <Label>Suburb</Label>
              <Input 
                value={property.suburb}
                onChange={(e) => setProperty({...property, suburb: e.target.value})}
                placeholder="Sydney"
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Beds</Label>
              <Input 
                type="number"
                value={property.beds}
                onChange={(e) => setProperty({...property, beds: parseInt(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <Label>Baths</Label>
              <Input 
                type="number"
                value={property.baths}
                onChange={(e) => setProperty({...property, baths: parseInt(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <Label>Cars</Label>
              <Input 
                type="number"
                value={property.cars}
                onChange={(e) => setProperty({...property, cars: parseInt(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <Label>Price</Label>
              <Input 
                value={property.price}
                onChange={(e) => setProperty({...property, price: e.target.value})}
                placeholder="$850,000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Key Features (one per line)</Label>
            <Textarea 
              value={property.features}
              onChange={(e) => setProperty({...property, features: e.target.value})}
              placeholder="Modern kitchen&#10;Walk to schools&#10;Large backyard"
              rows={3}
            />
          </div>

          <Button 
            onClick={generateContent}
            disabled={loading}
            className="w-full"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? 'Generating...' : 'Generate Content'}
          </Button>
        </CardContent>
      </Card>

      {generated && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Content</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="whatsapp">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
                <TabsTrigger value="facebook">Facebook</TabsTrigger>
                <TabsTrigger value="instagram">Instagram</TabsTrigger>
                <TabsTrigger value="email">Email</TabsTrigger>
              </TabsList>

              <TabsContent value="whatsapp" className="space-y-4">
                <div className="relative">
                  <Textarea 
                    value={generated.whatsapp}
                    readOnly
                    rows={8}
                    className="font-mono text-sm"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(generated.whatsapp, 'whatsapp')}
                  >
                    {copiedField === 'whatsapp' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="facebook" className="space-y-4">
                <div className="relative">
                  <Textarea 
                    value={generated.facebook}
                    readOnly
                    rows={8}
                    className="font-mono text-sm"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(generated.facebook, 'facebook')}
                  >
                    {copiedField === 'facebook' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="instagram" className="space-y-4">
                <div className="relative">
                  <Textarea 
                    value={generated.instagram}
                    readOnly
                    rows={8}
                    className="font-mono text-sm"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(generated.instagram, 'instagram')}
                  >
                    {copiedField === 'instagram' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="email" className="space-y-4">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <div className="relative">
                    <Input 
                      value={generated.email_subject}
                      readOnly
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-1 right-1"
                      onClick={() => copyToClipboard(generated.email_subject, 'email_subject')}
                    >
                      {copiedField === 'email_subject' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Body</Label>
                  <div className="relative">
                    <Textarea 
                      value={generated.email_body}
                      readOnly
                      rows={6}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(generated.email_body, 'email_body')}
                    >
                      {copiedField === 'email_body' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
