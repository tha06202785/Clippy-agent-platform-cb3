import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Zap, MessageSquare, BarChart3, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  const features = [
    {
      icon: <Zap className="w-8 h-8 text-blue-600" />,
      title: 'AI-Powered Content',
      description: 'Generate listing descriptions, social posts, and lead responses with AI in seconds',
    },
    {
      icon: <MessageSquare className="w-8 h-8 text-purple-600" />,
      title: 'Automated Responses',
      description: 'Instant replies to inquiries across Facebook, Email, SMS, and WhatsApp',
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-green-600" />,
      title: 'Lead Capture',
      description: 'Automatically capture and organize leads from multiple channels',
    },
    {
      icon: <Calendar className="w-8 h-8 text-orange-600" />,
      title: 'Smart Scheduling',
      description: 'Schedule posts, showings, and follow-ups with intelligent timing',
    },
  ];

  const pricingPlans = [
    {
      name: 'Starter',
      price: '$99',
      period: '/month',
      description: 'Perfect for solo agents',
      features: [
        'AI content generation',
        'Up to 100 leads/month',
        'Facebook integration',
        'Email forwarding',
        'Basic automation',
        'Email support',
      ],
      cta: 'Start Free Trial',
      popular: false,
    },
    {
      name: 'Professional',
      price: '$299',
      period: '/month',
      description: 'For growing teams',
      features: [
        'Everything in Starter',
        'Unlimited leads',
        'Multi-channel automation',
        'Team collaboration',
        'Advanced analytics',
        'Calendar integration',
        'Priority support',
        'Custom voice profiles',
      ],
      cta: 'Start Free Trial',
      popular: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '/month',
      description: 'For large organizations',
      features: [
        'Everything in Pro',
        'Dedicated account manager',
        'Custom integrations',
        'White-label options',
        'API access',
        'SLA guarantee',
        '24/7 phone support',
      ],
      cta: 'Contact Sales',
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="text-2xl font-bold text-blue-600">
              Clippy
            </Link>
            <div className="hidden md:flex gap-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900">
                Features
              </a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900">
                Pricing
              </a>
              <a href="#faq" className="text-gray-600 hover:text-gray-900">
                FAQ
              </a>
            </div>
            <div className="flex gap-3">
              <Link to="/login">
                <Button variant="outline">Sign In</Button>
              </Link>
              <Link to="/signup">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900">
              Your AI-Powered Real Estate
              <span className="text-blue-600"> Copilot</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Automate listing descriptions, social media posts, lead responses, and follow-ups. Get more leads in less time with Clippy.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                Start Free Trial
              </Button>
            </Link>
            <Button size="lg" variant="outline">
              Watch Demo
            </Button>
          </div>

          {/* Trust Badges */}
          <div className="pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-4">Trusted by 1,000+ real estate professionals</p>
            <div className="flex justify-center gap-8 flex-wrap">
              <span className="text-gray-400">⭐⭐⭐⭐⭐ 4.9/5 on Trustpilot</span>
              <span className="text-gray-400">🏆 #1 AI Tool for Realtors</span>
            </div>
          </div>
        </div>

        {/* Hero Image */}
        <div className="mt-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg p-8 h-96 flex items-center justify-center border border-blue-200">
          <div className="text-center">
            <p className="text-gray-600">Dashboard Preview Coming Soon</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Powerful Features</h2>
            <p className="text-xl text-gray-600">Everything you need to scale your real estate business</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, idx) => (
              <Card key={idx} className="border-0 shadow-sm">
                <CardContent className="pt-6 space-y-4">
                  <div className="inline-block p-3 bg-blue-50 rounded-lg">
                    {feature.icon}
                  </div>
                  <h3 className="font-semibold text-lg text-gray-900">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Feature Details */}
          <div className="grid md:grid-cols-2 gap-12 mt-20">
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-gray-900">AI Content Generation</h3>
              <ul className="space-y-3">
                {[
                  'Generate unique listing descriptions in seconds',
                  'Create platform-specific social media posts',
                  'Personalized tone and voice profiles',
                  'Multi-language support',
                  'SEO optimized content',
                ].map((item, idx) => (
                  <li key={idx} className="flex gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg h-80 flex items-center justify-center border border-blue-200">
              <p className="text-gray-600">Feature Illustration</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-12 mt-20">
            <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg h-80 flex items-center justify-center border border-purple-200">
              <p className="text-gray-600">Feature Illustration</p>
            </div>

            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-gray-900">Lead Management & Automation</h3>
              <ul className="space-y-3">
                {[
                  'Capture leads from multiple channels',
                  'Automatic lead qualification',
                  'Scheduled follow-ups and reminders',
                  'Integration with CRM systems',
                  'Real-time notifications',
                ].map((item, idx) => (
                  <li key={idx} className="flex gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-gray-600">Choose the plan that's right for you</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, idx) => (
              <Card
                key={idx}
                className={`${
                  plan.popular ? 'ring-2 ring-blue-600 md:scale-105' : ''
                }`}
              >
                <CardHeader>
                  {plan.popular && (
                    <div className="mb-4">
                      <span className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-gray-600">{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Button
                    className={`w-full ${
                      plan.popular
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                    }`}
                  >
                    {plan.cta}
                  </Button>

                  <ul className="space-y-3">
                    {plan.features.map((feature, fidx) => (
                      <li key={fidx} className="flex gap-3">
                        <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <span className="text-gray-700 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-600 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to transform your business?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join 1,000+ real estate agents using Clippy to automate their workflow and capture more leads.
          </p>
          <Link to="/signup">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50">
              Start Your Free Trial Today
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <p className="text-white font-semibold mb-4">Clippy</p>
              <p className="text-sm">AI-powered real estate copilot</p>
            </div>
            <div>
              <p className="text-white font-semibold mb-4">Product</p>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Features</a></li>
                <li><a href="#" className="hover:text-white">Pricing</a></li>
                <li><a href="#" className="hover:text-white">Security</a></li>
              </ul>
            </div>
            <div>
              <p className="text-white font-semibold mb-4">Company</p>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
              </ul>
            </div>
            <div>
              <p className="text-white font-semibold mb-4">Legal</p>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Privacy</a></li>
                <li><a href="#" className="hover:text-white">Terms</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; 2024 Clippy. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
