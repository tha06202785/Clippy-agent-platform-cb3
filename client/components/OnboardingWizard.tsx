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
  };

  const progressPercent = ((currentStep + 1) / STEPS.length) * 100;

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-cyan-200 mb-2">
                Full Name
              </label>
              <Input
                type="text"
                placeholder="John Doe"
                value={data.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="border-2 border-cyan-400/50 bg-slate-900/50 text-cyan-200 placeholder-cyan-200/40"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-cyan-200 mb-2">
                Email
              </label>
              <Input
                type="email"
                placeholder="john@example.com"
                value={data.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="border-2 border-cyan-400/50 bg-slate-900/50 text-cyan-200 placeholder-cyan-200/40"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-cyan-200 mb-2">
                Phone Number
              </label>
              <Input
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={data.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="border-2 border-cyan-400/50 bg-slate-900/50 text-cyan-200 placeholder-cyan-200/40"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-cyan-200 mb-2">
                Agency Name (Optional)
              </label>
              <Input
                type="text"
                placeholder="Your Agency"
                value={data.agency}
                onChange={(e) => handleInputChange('agency', e.target.value)}
                className="border-2 border-cyan-400/50 bg-slate-900/50 text-cyan-200 placeholder-cyan-200/40"
              />
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4 text-center py-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-900/40 border-2 border-blue-400/50 rounded-full mb-4">
              <span className="text-4xl">📘</span>
            </div>
            <h3 className="text-2xl font-black text-cyan-300">Connect Facebook</h3>
            <p className="text-cyan-200/80 max-w-md">Connect your Facebook business page for automated posting and lead capture</p>
            <Button
              onClick={() => handleInputChange('facebookConnected', true)}
              disabled={data.facebookConnected}
              className="w-full bg-blue-600/80 hover:bg-blue-700 text-white font-semibold mt-6"
            >
              {data.facebookConnected ? '✓ Connected' : 'Connect Facebook'}
            </Button>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-cyan-200 mb-2">
                Email Forwarding Address
              </label>
              <p className="text-xs text-cyan-200/60 mb-2 font-medium">
                This unique email will forward leads and inquiries to your inbox
              </p>
              <Input
                type="email"
                placeholder="yourname+clippy@example.com"
                value={data.forwardingEmail}
                onChange={(e) => handleInputChange('forwardingEmail', e.target.value)}
                disabled
                className="border-2 border-cyan-400/50 bg-slate-900/50 text-cyan-200/70 cursor-not-allowed"
              />
              <Button
                onClick={() => {
                  handleInputChange('forwardingEmail', `agent-${Date.now()}@clippy.io`);
                  handleInputChange('emailConnected', true);
                }}
                disabled={data.emailConnected}
                className="mt-4 w-full bg-cyan-600/80 hover:bg-cyan-700 text-white font-semibold"
              >
                {data.emailConnected ? '✓ Email Connected' : 'Generate Email Address'}
              </Button>
              {data.emailConnected && (
                <div className="mt-4 p-4 bg-green-900/30 border-2 border-green-400/50 rounded-lg">
                  <p className="text-sm text-green-300 font-semibold">
                    Email forwarding address generated
                  </p>
                  <p className="text-sm text-green-200 font-mono mt-2">{data.forwardingEmail}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(data.forwardingEmail)}
                    className="mt-3 border-2 border-green-400/50 text-green-300 hover:bg-green-400/20 font-semibold"
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
          <div className="space-y-4 text-center py-4">
            <p className="text-cyan-200/80 font-semibold mb-6">Select your calendar provider for meeting scheduling and lead follow-ups</p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleInputChange('calendarType', 'google')}
                className={`p-6 rounded-xl border-2 transition-all cursor-pointer font-semibold ${
                  data.calendarType === 'google'
                    ? 'border-cyan-400 bg-cyan-900/40 text-cyan-300'
                    : 'border-cyan-400/30 bg-slate-800/40 text-cyan-200/70 hover:border-cyan-400/60'
                }`}
              >
                <div className="text-3xl mb-2">📅</div>
                <p className="text-sm">Google Calendar</p>
              </button>
              <button
                onClick={() => handleInputChange('calendarType', 'outlook')}
                className={`p-6 rounded-xl border-2 transition-all cursor-pointer font-semibold ${
                  data.calendarType === 'outlook'
                    ? 'border-cyan-400 bg-cyan-900/40 text-cyan-300'
                    : 'border-cyan-400/30 bg-slate-800/40 text-cyan-200/70 hover:border-cyan-400/60'
                }`}
              >
                <div className="text-3xl mb-2">📅</div>
                <p className="text-sm">Outlook Calendar</p>
              </button>
            </div>
            {data.calendarType !== 'none' && (
              <Button
                onClick={() => handleInputChange('calendarConnected', true)}
                disabled={data.calendarConnected}
                className="mt-4 w-full bg-cyan-600/80 hover:bg-cyan-700 text-white font-semibold"
              >
                {data.calendarConnected ? '✓ Calendar Connected' : 'Connect Calendar'}
              </Button>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4 text-center py-8">
            <div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-cyan-900/40 to-blue-900/40 border-4 border-dashed border-cyan-400/50 rounded-lg mb-4">
              <span className="text-5xl">📱</span>
            </div>
            <h3 className="text-2xl font-black text-cyan-300">Scan to Share Profile</h3>
            <p className="text-cyan-200/80 mb-6 font-semibold">
              Use this QR code to share your Clippy profile with leads and clients
            </p>
            <Button
              onClick={() => {
                handleInputChange('qrCodeGenerated', true);
              }}
              disabled={data.qrCodeGenerated}
              className="w-full bg-cyan-600/80 hover:bg-cyan-700 text-white font-semibold mb-3"
            >
              {data.qrCodeGenerated ? '✓ QR Code Generated' : 'Generate QR Code'}
            </Button>
            {data.qrCodeGenerated && (
              <Button 
                variant="outline" 
                className="w-full border-2 border-cyan-400/50 text-cyan-300 hover:bg-cyan-400/20 font-semibold"
              >
                Download QR Code
              </Button>
            )}
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-950 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="group relative overflow-hidden rounded-2xl backdrop-blur-sm transition-all duration-300 border-2 border-cyan-400/50 hover:border-cyan-300 hover:shadow-3xl hover:shadow-cyan-500/50 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 58, 138, 0.5) 100%)' }}>
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-3xl" />
          <div className="relative p-8 z-10">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-300 via-blue-300 to-cyan-400 bg-clip-text text-transparent mb-2 drop-shadow-lg">
                Welcome to Clippy
              </h1>
              <p className="text-cyan-200/80 font-semibold">Complete your profile in 5 easy steps</p>
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex justify-between gap-1 mb-3">
                {STEPS.map((step, idx) => (
                  <div
                    key={idx}
                    className={`h-3 flex-1 rounded-full transition-all ${
                      idx < currentStep
                        ? 'bg-green-500/80 shadow-lg shadow-green-500/50'
                        : idx === currentStep
                        ? 'bg-cyan-500/80 shadow-lg shadow-cyan-500/50'
                        : 'bg-slate-700'
                    }`}
                  />
                ))}
              </div>
              <div className="text-sm text-cyan-200/80 font-semibold">
                Step {currentStep + 1} of {STEPS.length} ({progressPercent.toFixed(0)}% complete)
              </div>
            </div>

            {/* Step Indicator */}
            <div className="mb-8 bg-slate-800/40 border-2 border-cyan-400/30 rounded-xl p-4">
              <h2 className="text-xl font-black text-cyan-300">{STEPS[currentStep].title}</h2>
              <p className="text-cyan-200/70 text-sm font-semibold mt-1">{STEPS[currentStep].description}</p>
            </div>

            {/* Step Content */}
            <div className="mb-8">{renderStep()}</div>

            {/* Navigation Buttons */}
            <div className="flex gap-4">
              <Button
                onClick={handlePrev}
                disabled={currentStep === 0}
                variant="outline"
                className="flex-1 border-2 border-cyan-400/50 text-cyan-300 hover:bg-cyan-400/20 font-semibold disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              {currentStep < STEPS.length - 1 ? (
                <Button
                  onClick={handleNext}
                  disabled={!isStepValid()}
                  className="flex-1 bg-cyan-600/80 hover:bg-cyan-700 text-white font-semibold disabled:opacity-50"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleComplete}
                  disabled={!isStepValid()}
                  className="flex-1 bg-green-600/80 hover:bg-green-700 text-white font-semibold disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Complete Onboarding
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
