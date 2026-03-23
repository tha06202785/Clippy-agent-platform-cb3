import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, Zap } from 'lucide-react';

interface VoiceProfile {
  profileName: string;
  writingTone: 'luxury' | 'family' | 'investment' | 'energetic' | 'professional';
  formality: number;
  enthusiasm: number;
  emojiUsage: number;
  technicalDetail: number;
  catchPhrases: string[];
}

const TONE_DESCRIPTIONS = {
  luxury: '🏆 Elegant, sophisticated, premium positioning',
  family: '👨‍👩‍👧‍👦 Warm, friendly, community-focused',
  investment: '💰 Business-focused, ROI-oriented, analytical',
  energetic: '⚡ Upbeat, exciting, trend-aware',
  professional: '💼 Formal, corporate, detail-oriented',
};

const TONE_COLORS = {
  luxury: 'bg-purple-50 border-purple-200',
  family: 'bg-blue-50 border-blue-200',
  investment: 'bg-green-50 border-green-200',
  energetic: 'bg-yellow-50 border-yellow-200',
  professional: 'bg-gray-50 border-gray-200',
};

export default function AgentVoiceSettings() {
  const [profile, setProfile] = useState<VoiceProfile>({
    profileName: 'My Voice Profile',
    writingTone: 'professional',
    formality: 60,
    enthusiasm: 50,
    emojiUsage: 30,
    technicalDetail: 40,
    catchPhrases: ['Let\'s find your dream home', 'Premium properties deserve premium service'],
  });

  const [newCatchPhrase, setNewCatchPhrase] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleToneChange = (tone: VoiceProfile['writingTone']) => {
    setProfile(prev => ({
      ...prev,
      writingTone: tone,
      // Auto-adjust sliders based on tone
      ...(tone === 'luxury' && { formality: 80, enthusiasm: 60, emojiUsage: 20, technicalDetail: 40 }),
      ...(tone === 'family' && { formality: 40, enthusiasm: 70, emojiUsage: 50, technicalDetail: 30 }),
      ...(tone === 'investment' && { formality: 85, enthusiasm: 40, emojiUsage: 10, technicalDetail: 80 }),
      ...(tone === 'energetic' && { formality: 30, enthusiasm: 90, emojiUsage: 70, technicalDetail: 30 }),
      ...(tone === 'professional' && { formality: 75, enthusiasm: 50, emojiUsage: 25, technicalDetail: 60 }),
    }));
  };

  const handleSliderChange = (setting: 'formality' | 'enthusiasm' | 'emojiUsage' | 'technicalDetail', value: number) => {
    setProfile(prev => ({ ...prev, [setting]: value }));
  };

  const addCatchPhrase = () => {
    if (newCatchPhrase.trim() && profile.catchPhrases.length < 5) {
      setProfile(prev => ({
        ...prev,
        catchPhrases: [...prev.catchPhrases, newCatchPhrase.trim()],
      }));
      setNewCatchPhrase('');
    }
  };

  const removeCatchPhrase = (index: number) => {
    setProfile(prev => ({
      ...prev,
      catchPhrases: prev.catchPhrases.filter((_, i) => i !== index),
    }));
  };

  const generatePreview = () => {
    let preview = 'Listing preview for 123 Oak Street, 3BR/2BA, $450,000\n\n';

    // Base content
    preview += 'This beautiful home features hardwood floors, updated kitchen, and a spacious backyard.\n';

    // Add tone-specific content
    switch (profile.writingTone) {
      case 'luxury':
        preview += 'An exquisite residence offering unparalleled elegance and sophistication. ';
        break;
      case 'family':
        preview += 'A wonderful home perfect for families looking for warmth and comfort. ';
        break;
      case 'investment':
        preview += 'Strong investment opportunity in an appreciating neighborhood with excellent potential. ';
        break;
      case 'energetic':
        preview += 'This stunning property is absolutely incredible and won\'t last long! ';
        break;
      case 'professional':
        preview += 'A well-maintained property with strong fundamentals and excellent location. ';
        break;
    }

    // Add emoji based on setting
    if (profile.emojiUsage > 50) {
      preview += '🏡 ';
    }

    // Add catch phrase
    if (profile.catchPhrases.length > 0) {
      preview += '\n\n' + profile.catchPhrases[0];
    }

    setPreviewText(preview);
  };

  const saveProfile = async () => {
    setIsSaving(true);
    
    // Simulate API call
    setTimeout(() => {
      console.log('Profile saved:', profile);
      setIsSaving(false);
      // In production, show success message
    }, 1000);
  };

  const SliderInput = ({
    label,
    value,
    onChange,
    description,
  }: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    description: string;
  }) => (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="text-sm font-semibold text-blue-600">{value}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
      />
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Voice Profile Settings</h1>
          <p className="text-gray-600 mt-2">Personalize your AI writing style and voice</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Settings Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Name */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Name</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  value={profile.profileName}
                  onChange={(e) => setProfile(prev => ({ ...prev, profileName: e.target.value }))}
                  placeholder="Enter profile name"
                />
              </CardContent>
            </Card>

            {/* Writing Tone */}
            <Card>
              <CardHeader>
                <CardTitle>Writing Tone</CardTitle>
                <CardDescription>Select the personality for your listings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {(Object.keys(TONE_DESCRIPTIONS) as Array<keyof typeof TONE_DESCRIPTIONS>).map(tone => (
                    <button
                      key={tone}
                      onClick={() => handleToneChange(tone)}
                      className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                        profile.writingTone === tone
                          ? `border-blue-500 ${TONE_COLORS[tone]}`
                          : `border-gray-200 ${TONE_COLORS[tone]} opacity-50`
                      }`}
                    >
                      <p className="font-semibold text-sm capitalize">{tone}</p>
                      <p className="text-xs text-gray-600 mt-1">{TONE_DESCRIPTIONS[tone]}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tone Customization */}
            <Card>
              <CardHeader>
                <CardTitle>Fine-Tune Your Voice</CardTitle>
                <CardDescription>Adjust sliders to customize your communication style</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <SliderInput
                  label="Formality"
                  value={profile.formality}
                  onChange={(value) => handleSliderChange('formality', value)}
                  description="0: Casual & Conversational | 100: Formal & Corporate"
                />

                <SliderInput
                  label="Enthusiasm"
                  value={profile.enthusiasm}
                  onChange={(value) => handleSliderChange('enthusiasm', value)}
                  description="0: Reserved | 100: Energetic & Excited"
                />

                <SliderInput
                  label="Emoji Usage"
                  value={profile.emojiUsage}
                  onChange={(value) => handleSliderChange('emojiUsage', value)}
                  description="0: None | 100: Abundant 😊"
                />

                <SliderInput
                  label="Technical Detail"
                  value={profile.technicalDetail}
                  onChange={(value) => handleSliderChange('technicalDetail', value)}
                  description="0: Minimal specs | 100: Detailed specifications"
                />
              </CardContent>
            </Card>

            {/* Catch Phrases */}
            <Card>
              <CardHeader>
                <CardTitle>Catch Phrases</CardTitle>
                <CardDescription>Add signature phrases to your messages (max 5)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {profile.catchPhrases.map((phrase, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
                    >
                      <p className="text-sm text-gray-700">"{phrase}"</p>
                      <button
                        onClick={() => removeCatchPhrase(index)}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  ))}

                  {profile.catchPhrases.length < 5 && (
                    <div className="flex gap-2">
                      <Input
                        value={newCatchPhrase}
                        onChange={(e) => setNewCatchPhrase(e.target.value)}
                        placeholder="Add a new catch phrase..."
                        onKeyPress={(e) => e.key === 'Enter' && addCatchPhrase()}
                      />
                      <Button
                        onClick={addCatchPhrase}
                        variant="outline"
                        disabled={!newCatchPhrase.trim()}
                      >
                        Add
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <Button
              onClick={saveProfile}
              disabled={isSaving}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Voice Profile'}
            </Button>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="w-5 h-5 text-blue-600" />
                  Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={generatePreview}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Generate Preview
                </Button>

                {previewText && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-2">
                    <p className="text-xs font-semibold text-gray-700 uppercase">Preview</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {previewText}
                    </p>
                    <button
                      onClick={() => navigator.clipboard.writeText(previewText)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Copy preview
                    </button>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    <strong>Tone:</strong> {profile.writingTone}
                  </p>
                  <p className="text-xs text-blue-800 mt-1">
                    <strong>Style Settings:</strong> Formality {profile.formality}%, Enthusiasm {profile.enthusiasm}%
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
