import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Check, Circle, Facebook, Mail, Calendar, QrCode, User } from 'lucide-react';
import { toast } from 'sonner';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  required: boolean;
  icon: React.ReactNode;
  completed: boolean;
}

export function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    agency: ''
  });
  const [steps, setSteps] = useState<OnboardingStep[]>([
    {
      id: 'profile',
      title: 'Complete Your Profile',
      description: 'Add your name, photo, and agency details',
      required: true,
      icon: <User className="h-5 w-5" />,
      completed: false
    },
    {
      id: 'facebook',
      title: 'Connect Facebook',
      description: 'Import leads from Facebook automatically',
      required: false,
      icon: <Facebook className="h-5 w-5" />,
      completed: false
    },
    {
      id: 'email',
      title: 'Connect Email',
      description: 'Forward inquiry emails to Clippy',
      required: false,
      icon: <Mail className="h-5 w-5" />,
      completed: false
    },
    {
      id: 'calendar',
      title: 'Connect Calendar',
      description: 'Sync inspections and meetings',
      required: false,
      icon: <Calendar className="h-5 w-5" />,
      completed: false
    },
    {
      id: 'qr',
      title: 'Set Up QR Codes',
      description: 'Create QR codes for listings',
      required: false,
      icon: <QrCode className="h-5 w-5" />,
      completed: false
    }
  ]);

  const completedCount = steps.filter(s => s.completed).length;
  const requiredCompleted = steps.filter(s => s.required && s.completed).length;
  const requiredTotal = steps.filter(s => s.required).length;
  const progress = Math.round((completedCount / steps.length) * 100);

  const completeStep = (stepId: string) => {
    setSteps(steps.map(s => 
      s.id === stepId ? { ...s, completed: true } : s
    ));
    toast.success('Step completed!');
  };

  const saveProfile = () => {
    // Save profile to API
    completeStep('profile');
    setCurrentStep(1);
  };

  const connectFacebook = () => {
    // Open Facebook OAuth
    window.open('/auth/facebook', '_blank');
    completeStep('facebook');
  };

  const getEmailForwardingAddress = () => {
    // Generate unique email
    const uniqueEmail = `${profile.email?.split('@')[0]}-clippy@inbound.clippy.com`;
    return uniqueEmail;
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input 
                value={profile.name}
                onChange={(e) => setProfile({...profile, name: e.target.value})}
                placeholder="John Smith"
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input 
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({...profile, email: e.target.value})}
                placeholder="john@agency.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input 
                value={profile.phone}
                onChange={(e) => setProfile({...profile, phone: e.target.value})}
                placeholder="0412 345 678"
              />
            </div>
            <div className="space-y-2">
              <Label>Agency Name</Label>
              <Input 
                value={profile.agency}
                onChange={(e) => setProfile({...profile, agency: e.target.value})}
                placeholder="Premier Real Estate"
              />
            </div>
            <Button 
              onClick={saveProfile}
              disabled={!profile.name || !profile.email || !profile.phone}
              className="w-full"
            >
              Save Profile
            </Button>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connect your Facebook page to automatically import leads from Facebook Lead Ads and Messenger.
            </p>
            <Button 
              onClick={connectFacebook}
              variant="outline"
              className="w-full"
            >
              <Facebook className="mr-2 h-4 w-4" />
              Connect Facebook
            </Button>
            
            <Button 
              variant="ghost"
              onClick={() => setCurrentStep(2)}
              className="w-full"
            >
              Skip for now
            </Button>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Forward inquiry emails to this unique address and Clippy will automatically create leads.
            </p>
            
            <div className="bg-muted p-4 rounded-lg">
              <Label className="text-xs uppercase text-muted-foreground">Your Forwarding Address</Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="bg-background px-2 py-1 rounded text-sm">{getEmailForwardingAddress()}</code>
                <Button 
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(getEmailForwardingAddress());
                    toast.success('Copied!');
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>

            <div className="text-sm space-y-2">
              <p className="font-medium">Setup Instructions:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Copy the address above</li>
                <li>Go to your email settings</li>
                <li>Add forwarding rule</li>
                <li>Paste the Clippy address</li>
              </ol>
            </div>
            
            <Button 
              onClick={() => completeStep('email')}
              className="w-full"
            >
              I've Set Up Forwarding
            </Button>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connect your calendar to automatically sync inspections and block out unavailable times.
            </p>
            
            <Button 
              variant="outline"
              className="w-full"
              onClick={() => completeStep('calendar')}
            >
              Connect Google Calendar
            </Button>
            
            <Button 
              variant="outline"
              className="w-full"
              onClick={() => completeStep('calendar')}
            >
              Connect Outlook Calendar
            </Button>
            
            <Button 
              variant="ghost"
              onClick={() => setCurrentStep(4)}
              className="w-full"
            >
              Skip for now
            </Button>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Create QR codes for your listings that capture leads instantly when scanned.
            </p>
            
            <Button 
              onClick={() => {
                completeStep('qr');
                toast.success('Onboarding complete! Welcome to Clippy.');
              }}
              className="w-full"
            >
              Create My First QR Code
            </Button>
            
            <Button 
              variant="ghost"
              onClick={() => {
                completeStep('qr');
                toast.success('Onboarding complete! Welcome to Clippy.');
              }}
              className="w-full"
            >
              I'll do this later
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Welcome to Clippy! 👋</CardTitle>
              <CardDescription>
                Let's get you set up in just a few minutes
              </CardDescription>
            </div>
            <Badge variant={requiredCompleted === requiredTotal ? "default" : "secondary"}>
              {requiredCompleted}/{requiredTotal} Required
            </Badge>
          </div>
          <Progress value={progress} className="mt-4" />
          <p className="text-sm text-muted-foreground mt-2">
            {progress}% Complete
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step Navigation */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => setCurrentStep(index)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap ${
                  currentStep === index 
                    ? 'bg-primary text-primary-foreground' 
                    : step.completed 
                      ? 'bg-green-100 text-green-700'
                      : 'bg-muted'
                }`}
              >
                {step.completed ? <Check className="h-4 w-4" /> : step.icon}
                <span className="text-sm font-medium">{step.title}</span>
              </button>
            ))}
          </div>

          {/* Step Content */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                {steps[currentStep].icon}
                <div>
                  <CardTitle className="text-lg">{steps[currentStep].title}</CardTitle>
                  <CardDescription>{steps[currentStep].description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {renderStepContent()}
            </CardContent>
          </Card>

          {/* Skip Option */}
          {steps[currentStep].required && (
            <p className="text-sm text-muted-foreground text-center">
              This step is required to continue
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
