import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface OnboardingData {
  // Step 1: Profile Setup
  name: string;
  email: string;
  phone: string;
  agency: string;

  // Step 2: Facebook
  facebookConnected: boolean;

  // Step 3: Email
  emailConnected: boolean;
  forwardingEmail: string;

  // Step 4: Calendar
  calendarType: 'google' | 'outlook' | 'none';
  calendarConnected: boolean;

  // Step 5: QR Code
  qrCodeGenerated: boolean;
}

const STEPS = [
  { title: 'Profile Setup', description: 'Basic information' },
  { title: 'Connect Facebook', description: 'Optional social channel' },
  { title: 'Connect Email', description: 'Unique forwarding address' },
  { title: 'Connect Calendar', description: 'Google or Outlook' },
  { title: 'QR Code Setup', description: 'Final step' },
];

export default function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    name: '',
    email: '',
    phone: '',
    agency: '',
    facebookConnected: false,
    emailConnected: false,
    forwardingEmail: '',
    calendarType: 'none',
    calendarConnected: false,
    qrCodeGenerated: false,
  });

  const handleInputChange = (field: keyof OnboardingData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    console.log('Onboarding completed:', data);
    // API call would go here
  };

  const progressPercent = ((currentStep + 1) / STEPS.length) * 100;

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <Input
                type="text"
                placeholder="John Doe"
                value={data.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <Input
                type="email"
                placeholder="john@example.com"
                value={data.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <Input
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={data.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Agency Name (Optional)
              </label>
              <Input
                type="text"
                placeholder="Your Agency"
                value={data.agency}
                onChange={(e) => handleInputChange('agency', e.target.value)}
              />
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect Facebook</h3>
              <p className="text-gray-600 mb-6">Connect your Facebook business page for automated posting and lead capture</p>
              <Button
                onClick={() => handleInputChange('facebookConnected', true)}
                disabled={data.facebookConnected}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {data.facebookConnected ? '✓ Connected' : 'Connect Facebook'}
              </Button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Forwarding Address
              </label>
              <p className="text-xs text-gray-500 mb-2">
                This unique email will forward leads and inquiries to your inbox
              </p>
              <Input
                type="email"
                placeholder="yourname+clippy@example.com"
                value={data.forwardingEmail}
                onChange={(e) => handleInputChange('forwardingEmail', e.target.value)}
                disabled
              />
              <Button
                onClick={() => {
                  handleInputChange('forwardingEmail', `agent-${Date.now()}@clippy.io`);
                  handleInputChange('emailConnected', true);
                }}
                disabled={data.emailConnected}
                className="mt-4 w-full"
              >
                {data.emailConnected ? '✓ Email Connected' : 'Generate Email Address'}
              </Button>
              {data.emailConnected && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    Email forwarding address generated: <strong>{data.forwardingEmail}</strong>
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(data.forwardingEmail)}
                    className="mt-2"
                  >
                    Copy to Clipboard
                  </Button>
                </div>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <p className="text-gray-600 mb-4">Select your calendar provider for meeting scheduling and lead follow-ups</p>
            <div className="grid grid-cols-2 gap-4">
              <Card
                className={`cursor-pointer transition-all ${
                  data.calendarType === 'google' ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => handleInputChange('calendarType', 'google')}
              >
                <CardContent className="p-4 text-center">
                  <div className="text-2xl mb-2">📅</div>
                  <p className="font-semibold text-sm">Google Calendar</p>
                </CardContent>
              </Card>
              <Card
                className={`cursor-pointer transition-all ${
                  data.calendarType === 'outlook' ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => handleInputChange('calendarType', 'outlook')}
              >
                <CardContent className="p-4 text-center">
                  <div className="text-2xl mb-2">📅</div>
                  <p className="font-semibold text-sm">Outlook Calendar</p>
                </CardContent>
              </Card>
            </div>
            {data.calendarType !== 'none' && (
              <Button
                onClick={() => handleInputChange('calendarConnected', true)}
                disabled={data.calendarConnected}
                className="w-full mt-4"
              >
                {data.calendarConnected ? '✓ Calendar Connected' : 'Connect Calendar'}
              </Button>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4 text-center">
            <div className="py-8">
              <div className="inline-flex items-center justify-center w-32 h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 mb-4">
                <span className="text-sm text-gray-500">QR Code</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Scan to Share Profile</h3>
              <p className="text-gray-600 mb-6">
                Use this QR code to share your Clippy profile with leads and clients
              </p>
              <Button
                onClick={() => {
                  handleInputChange('qrCodeGenerated', true);
                }}
                disabled={data.qrCodeGenerated}
                className="w-full mb-4"
              >
                {data.qrCodeGenerated ? '✓ QR Code Generated' : 'Generate QR Code'}
              </Button>
              {data.qrCodeGenerated && (
                <Button variant="outline" className="w-full">
                  Download QR Code
                </Button>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        return data.name && data.email && data.phone;
      case 1:
        return true;
      case 2:
        return data.emailConnected;
      case 3:
        return data.calendarConnected;
      case 4:
        return data.qrCodeGenerated;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Clippy</h1>
            <p className="text-gray-600">Complete your profile in 5 easy steps</p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              {STEPS.map((step, idx) => (
                <div key={idx} className="flex-1">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      idx < currentStep
                        ? 'bg-green-500'
                        : idx === currentStep
                        ? 'bg-blue-500'
                        : 'bg-gray-200'
                    }`}
                  />
                </div>
              ))}
            </div>
            <div className="text-sm text-gray-600">
              Step {currentStep + 1} of {STEPS.length} ({progressPercent.toFixed(0)}% complete)
            </div>
          </div>

          {/* Step Indicator */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900">{STEPS[currentStep].title}</h2>
            <p className="text-gray-600">{STEPS[currentStep].description}</p>
          </div>

          {/* Step Content */}
          <div className="mb-8">{renderStep()}</div>

          {/* Navigation Buttons */}
          <div className="flex gap-4">
            <Button
              onClick={handlePrev}
              disabled={currentStep === 0}
              variant="outline"
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            {currentStep < STEPS.length - 1 ? (
              <Button
                onClick={handleNext}
                disabled={!isStepValid()}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={!isStepValid()}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Complete Onboarding
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
