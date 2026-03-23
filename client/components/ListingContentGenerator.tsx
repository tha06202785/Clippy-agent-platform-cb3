import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Wand2, Download, ArrowLeft } from 'lucide-react';

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

const PLATFORM_DESCRIPTIONS = {
  whatsapp: 'WhatsApp Business Message (up to 4,096 characters)',
  facebook: 'Facebook Post (up to 63,206 characters)',
  instagram: 'Instagram Caption (up to 2,200 characters)',
  email: 'Email Body (Unlimited)',
  sms: 'SMS Message (up to 160 characters)',
};

export default function ListingContentGenerator() {
  const navigate = useNavigate();
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
    
    setTimeout(() => {
      const baseContent = `Stunning ${propertyDetails.bedrooms}BR/${propertyDetails.bathrooms}BA property at ${propertyDetails.address} | Price: $${propertyDetails.price} | ${propertyDetails.sqft} sqft | Features: ${propertyDetails.features}`;

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
    <div className="flex min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-950">
      {/* Left Sidebar */}
      <div className="w-20 border-r-2 border-cyan-400/30 bg-slate-900/40 backdrop-blur-sm p-4 flex flex-col">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center justify-center w-12 h-12 rounded-lg border-2 border-cyan-400/50 bg-slate-800/50 hover:bg-cyan-600/40 hover:border-cyan-400 text-cyan-300 transition-all hover:shadow-lg hover:shadow-cyan-500/30 group mb-8"
          title="Go Back to Dashboard"
        >
          <ArrowLeft className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-300 via-blue-300 to-cyan-400 bg-clip-text text-transparent mb-2 drop-shadow-lg">
            Listing Content Generator
          </h1>
          <p className="text-cyan-200/80 text-lg drop-shadow">
            Create AI-powered content for your property across all social platforms
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Property Details Form */}
          <div className="group relative overflow-hidden rounded-2xl backdrop-blur-sm transition-all duration-300 border-2 border-cyan-400/50 group-hover:border-cyan-300 hover:shadow-3xl hover:shadow-cyan-500/50 animate-in fade-in slide-in-from-left-4 duration-500" style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 58, 138, 0.4) 100%)' }}>
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-500/30 to-blue-600/20 rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl" />
            <div className="relative p-6 z-10">
              <h2 className="text-2xl font-black text-cyan-300 drop-shadow-lg mb-6">Property Details</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-cyan-200 mb-2">
                    Address *
                  </label>
                  <Input
                    type="text"
                    placeholder="123 Main St, San Francisco, CA"
                    value={propertyDetails.address}
                    onChange={(e) => handlePropertyChange('address', e.target.value)}
                    className="border-2 border-cyan-400/50 bg-slate-900/50 text-cyan-200 placeholder-cyan-200/40"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-cyan-200 mb-2">
                      Bedrooms *
                    </label>
                    <Input
                      type="number"
                      placeholder="3"
                      value={propertyDetails.bedrooms}
                      onChange={(e) => handlePropertyChange('bedrooms', e.target.value)}
                      className="border-2 border-cyan-400/50 bg-slate-900/50 text-cyan-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-cyan-200 mb-2">
                      Bathrooms *
                    </label>
                    <Input
                      type="number"
                      placeholder="2"
                      value={propertyDetails.bathrooms}
                      onChange={(e) => handlePropertyChange('bathrooms', e.target.value)}
                      className="border-2 border-cyan-400/50 bg-slate-900/50 text-cyan-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-cyan-200 mb-2">
                      Price *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-cyan-400 font-bold">$</span>
                      <Input
                        type="number"
                        placeholder="450000"
                        value={propertyDetails.price}
                        onChange={(e) => handlePropertyChange('price', e.target.value)}
                        className="pl-7 border-2 border-cyan-400/50 bg-slate-900/50 text-cyan-200"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-cyan-200 mb-2">
                      Square Feet
                    </label>
                    <Input
                      type="number"
                      placeholder="2500"
                      value={propertyDetails.sqft}
                      onChange={(e) => handlePropertyChange('sqft', e.target.value)}
                      className="border-2 border-cyan-400/50 bg-slate-900/50 text-cyan-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-cyan-200 mb-2">
                    Features
                  </label>
                  <Textarea
                    placeholder="Hardwood floors, modern kitchen, updated bathroom, spacious backyard..."
                    value={propertyDetails.features}
                    onChange={(e) => handlePropertyChange('features', e.target.value)}
                    rows={4}
                    className="border-2 border-cyan-400/50 bg-slate-900/50 text-cyan-200 placeholder-cyan-200/40 resize-none"
                  />
                </div>

                <Button
                  onClick={generateContent}
                  disabled={!isFormComplete || isGenerating}
                  className="w-full bg-cyan-600/80 hover:bg-cyan-700 text-white font-black text-lg py-6"
                >
                  <Wand2 className="w-5 h-5 mr-2" />
                  {isGenerating ? 'Generating...' : 'Generate Content'}
                </Button>
              </div>
            </div>
          </div>

          {/* Generated Content */}
          <div className="group relative overflow-hidden rounded-2xl backdrop-blur-sm transition-all duration-300 border-2 border-cyan-400/50 group-hover:border-cyan-300 hover:shadow-3xl hover:shadow-cyan-500/50 animate-in fade-in slide-in-from-right-4 duration-500" style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 58, 138, 0.4) 100%)' }}>
            <div className="absolute top-0 left-0 w-40 h-40 bg-gradient-to-br from-cyan-500/30 to-blue-600/20 rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl" />
            <div className="relative z-10">
              <div className="p-6 border-b-2 border-cyan-400/30">
                <h2 className="text-2xl font-black text-cyan-300 drop-shadow-lg">Generated Content</h2>
                {generatedContent.whatsapp && (
                  <Button
                    onClick={downloadAsFile}
                    className="mt-4 bg-cyan-600/80 hover:bg-cyan-700 text-white font-semibold"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download All
                  </Button>
                )}
              </div>

              {generatedContent.whatsapp ? (
                <div className="p-6">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="w-full rounded-lg bg-slate-800/50 border-2 border-cyan-400/30 p-1">
                      {['whatsapp', 'facebook', 'instagram', 'email', 'sms'].map((tab) => (
                        <TabsTrigger
                          key={tab}
                          value={tab}
                          className="data-[state=active]:bg-cyan-600/80 data-[state=active]:text-white text-cyan-200/80 capitalize font-semibold"
                        >
                          {tab}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {(['whatsapp', 'facebook', 'instagram', 'email', 'sms'] as const).map(platform => (
                      <TabsContent key={platform} value={platform} className="mt-4">
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm text-cyan-200/80 mb-2 font-semibold">
                              {PLATFORM_DESCRIPTIONS[platform]}
                            </p>
                            <p className="text-xs text-cyan-200/60 font-mono">
                              Character count: {generatedContent[platform].length}
                            </p>
                          </div>

                          <Textarea
                            value={generatedContent[platform]}
                            onChange={(e) => handleContentChange(platform, e.target.value)}
                            rows={8}
                            className="font-mono text-sm border-2 border-cyan-400/50 bg-slate-900/50 text-cyan-200 resize-none"
                          />

                          <Button
                            onClick={() => copyToClipboard(platform)}
                            className={`w-full font-semibold ${
                              copiedPlatform === platform
                                ? 'bg-green-600/80 hover:bg-green-700'
                                : 'bg-cyan-600/80 hover:bg-cyan-700'
                            } text-white`}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            {copiedPlatform === platform ? 'Copied!' : 'Copy to Clipboard'}
                          </Button>
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <div className="text-cyan-400/40 text-5xl mb-4">📝</div>
                  <p className="text-cyan-200/60 font-semibold">
                    Fill in the property details and click "Generate Content" to see previews for each platform
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
