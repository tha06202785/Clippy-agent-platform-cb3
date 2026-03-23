import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Wand2, Download } from 'lucide-react';

interface PropertyDetails {
  address: string;
  bedrooms: string;
  bathrooms: string;
  price: string;
  sqft: string;
  features: string;
}

interface GeneratedContent {
  whatsapp: string;
  facebook: string;
  instagram: string;
  email: string;
  sms: string;
}

const PLATFORM_LIMITS = {
  whatsapp: 4096,
  facebook: 63206,
  instagram: 2200,
  email: 'unlimited',
  sms: 160,
};

const PLATFORM_DESCRIPTIONS = {
  whatsapp: 'WhatsApp Business Message (up to 4,096 characters)',
  facebook: 'Facebook Post (up to 63,206 characters)',
  instagram: 'Instagram Caption (up to 2,200 characters)',
  email: 'Email Body (Unlimited)',
  sms: 'SMS Message (up to 160 characters)',
};

export default function ListingContentGenerator() {
  const [propertyDetails, setPropertyDetails] = useState<PropertyDetails>({
    address: '',
    bedrooms: '',
    bathrooms: '',
    price: '',
    sqft: '',
    features: '',
  });

  const [generatedContent, setGeneratedContent] = useState<GeneratedContent>({
    whatsapp: '',
    facebook: '',
    instagram: '',
    email: '',
    sms: '',
  });

  const [activeTab, setActiveTab] = useState('whatsapp');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);

  const handlePropertyChange = (field: keyof PropertyDetails, value: string) => {
    setPropertyDetails(prev => ({ ...prev, [field]: value }));
  };

  const handleContentChange = (platform: keyof GeneratedContent, value: string) => {
    setGeneratedContent(prev => ({ ...prev, [platform]: value }));
  };

  const generateContent = async () => {
    setIsGenerating(true);
    
    // Simulate API call - in production this would call your backend
    setTimeout(() => {
      const baseContent = `
        Stunning ${propertyDetails.bedrooms}BR/${propertyDetails.bathrooms}BA property at ${propertyDetails.address}
        Price: $${propertyDetails.price} | ${propertyDetails.sqft} sqft
        Features: ${propertyDetails.features}
      `.trim();

      setGeneratedContent({
        whatsapp: `📍 ${baseContent}\n\n✨ Premium Features:\n• Modern Kitchen\n• Hardwood Floors\n• Great Location\n\nSchedule your viewing today! 🏠`,
        facebook: `🏡 NEW LISTING ALERT! 🏡\n\n${baseContent}\n\n✨ Highlights:\n• Move-in Ready\n• Updated Systems\n• Prime Location\n• Excellent Schools\n\nDon't miss this opportunity! Contact us today for a private showing.\n\n📞 Schedule your tour now! #RealEstateLoving #NewListing #HomesForSale`,
        instagram: `✨ Dream Home Alert! ✨\n${propertyDetails.address}\n💰 $${propertyDetails.price} | ${propertyDetails.bedrooms}BR ${propertyDetails.bathrooms}BA\n\n#RealEstate #Luxury #NewListing #HomeForsale #DreamHome`,
        email: `Subject: Exclusive Preview - ${propertyDetails.address}\n\nDear Valued Buyer,\n\nWe're thrilled to present this exceptional property:\n\n${baseContent}\n\nKey Features:\n• Move-in Ready\n• Updated Finishes\n• Excellent Neighborhood\n• Great Investment Opportunity\n\nSchedule your private showing today!\n\nBest regards,\nYour Real Estate Team`,
        sms: `New listing: ${propertyDetails.bedrooms}BR at ${propertyDetails.address}. $${propertyDetails.price}. View: clippy.io/listing`,
      });

      setIsGenerating(false);
    }, 1500);
  };

  const copyToClipboard = (platform: keyof GeneratedContent) => {
    navigator.clipboard.writeText(generatedContent[platform]);
    setCopiedPlatform(platform);
    setTimeout(() => setCopiedPlatform(null), 2000);
  };

  const downloadAsFile = () => {
    const content = Object.entries(generatedContent)
      .map(([platform, text]) => `=== ${platform.toUpperCase()} ===\n${text}\n`)
      .join('\n');

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
    element.setAttribute('download', 'listing-content.txt');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const isFormComplete = propertyDetails.address && propertyDetails.bedrooms && propertyDetails.bathrooms && propertyDetails.price;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Listing Content Generator</h1>
          <p className="text-gray-600 mt-2">Create AI-powered content for your property across all social platforms</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Property Details Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Property Details</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address *
                </label>
                <Input
                  type="text"
                  placeholder="123 Main St, San Francisco, CA"
                  value={propertyDetails.address}
                  onChange={(e) => handlePropertyChange('address', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bedrooms *
                  </label>
                  <Input
                    type="number"
                    placeholder="3"
                    value={propertyDetails.bedrooms}
                    onChange={(e) => handlePropertyChange('bedrooms', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bathrooms *
                  </label>
                  <Input
                    type="number"
                    placeholder="2"
                    value={propertyDetails.bathrooms}
                    onChange={(e) => handlePropertyChange('bathrooms', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                    <Input
                      type="number"
                      placeholder="450000"
                      value={propertyDetails.price}
                      onChange={(e) => handlePropertyChange('price', e.target.value)}
                      className="pl-7"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Square Feet
                  </label>
                  <Input
                    type="number"
                    placeholder="2500"
                    value={propertyDetails.sqft}
                    onChange={(e) => handlePropertyChange('sqft', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Features
                </label>
                <Textarea
                  placeholder="Hardwood floors, modern kitchen, updated bathroom, spacious backyard..."
                  value={propertyDetails.features}
                  onChange={(e) => handlePropertyChange('features', e.target.value)}
                  rows={4}
                />
              </div>

              <Button
                onClick={generateContent}
                disabled={!isFormComplete || isGenerating}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Wand2 className="w-4 h-4 mr-2" />
                {isGenerating ? 'Generating...' : 'Generate Content'}
              </Button>
            </div>
          </div>

          {/* Generated Content */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Generated Content</h2>
              {generatedContent.whatsapp && (
                <Button
                  onClick={downloadAsFile}
                  variant="outline"
                  size="sm"
                  className="mt-4"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download All
                </Button>
              )}
            </div>

            {generatedContent.whatsapp ? (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full rounded-none border-b">
                  <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
                  <TabsTrigger value="facebook">Facebook</TabsTrigger>
                  <TabsTrigger value="instagram">Instagram</TabsTrigger>
                  <TabsTrigger value="email">Email</TabsTrigger>
                  <TabsTrigger value="sms">SMS</TabsTrigger>
                </TabsList>

                {(['whatsapp', 'facebook', 'instagram', 'email', 'sms'] as const).map(platform => (
                  <TabsContent key={platform} value={platform}>
                    <div className="p-6">
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-2">
                          {PLATFORM_DESCRIPTIONS[platform]}
                        </p>
                        <p className="text-xs text-gray-500">
                          Character count: {generatedContent[platform].length}
                          {PLATFORM_LIMITS[platform] !== 'unlimited' && ` / ${PLATFORM_LIMITS[platform]}`}
                        </p>
                      </div>

                      <Textarea
                        value={generatedContent[platform]}
                        onChange={(e) => handleContentChange(platform, e.target.value)}
                        rows={8}
                        className="mb-4 font-mono text-sm"
                      />

                      <Button
                        onClick={() => copyToClipboard(platform)}
                        className="w-full"
                        variant={copiedPlatform === platform ? 'default' : 'outline'}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        {copiedPlatform === platform ? 'Copied!' : 'Copy to Clipboard'}
                      </Button>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <div className="p-12 text-center">
                <div className="text-gray-400 text-4xl mb-4">📝</div>
                <p className="text-gray-500">
                  Fill in the property details and click "Generate Content" to see previews for each platform
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
