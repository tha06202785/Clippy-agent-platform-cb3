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

    preview += 'This beautiful home features hardwood floors, updated kitchen, and a spacious backyard.\n';

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

    if (profile.emojiUsage > 50) {
      preview += '🏡 ';
    }

    if (profile.catchPhrases.length > 0) {
      preview += '\n\n' + profile.catchPhrases[0];
    }

    setPreviewText(preview);
  };

  const saveProfile = async () => {
    setIsSaving(true);
    
    setTimeout(() => {
      console.log('Profile saved:', profile);
      setIsSaving(false);
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
        <label className="text-sm font-semibold text-cyan-200">{label}</label>
        <span className="text-sm font-black text-cyan-300">{value}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
      />
      <p className="text-xs text-cyan-200/60">{description}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-950 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-300 via-blue-300 to-cyan-400 bg-clip-text text-transparent mb-2 drop-shadow-lg">
            Voice Profile Settings
          </h1>
          <p className="text-cyan-200/80 text-lg drop-shadow">
            Personalize your AI writing style and voice
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Settings Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Name */}
            <div className="group relative overflow-hidden rounded-2xl backdrop-blur-sm transition-all duration-300 border-2 border-cyan-400/50 group-hover:border-cyan-300 hover:shadow-3xl hover:shadow-cyan-500/50 animate-in fade-in slide-in-from-left-4 duration-500" style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 58, 138, 0.4) 100%)' }}>
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-500/30 to-blue-600/20 rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl" />
              <div className="relative p-6 z-10">
                <h3 className="text-xl font-black text-cyan-300 drop-shadow-lg mb-4">Profile Name</h3>
                <Input
                  value={profile.profileName}
                  onChange={(e) => setProfile(prev => ({ ...prev, profileName: e.target.value }))}
                  placeholder="Enter profile name"
                  className="border-2 border-cyan-400/50 bg-slate-900/50 text-cyan-200 placeholder-cyan-200/40"
                />
              </div>
            </div>

            {/* Writing Tone */}
            <div className="group relative overflow-hidden rounded-2xl backdrop-blur-sm transition-all duration-300 border-2 border-cyan-400/50 group-hover:border-cyan-300 hover:shadow-3xl hover:shadow-cyan-500/50 animate-in fade-in slide-in-from-left-4 duration-500" style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 58, 138, 0.4) 100%)' }}>
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-500/30 to-blue-600/20 rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl" />
              <div className="relative p-6 z-10">
                <h3 className="text-xl font-black text-cyan-300 drop-shadow-lg mb-4">Writing Tone</h3>
                <p className="text-sm text-cyan-200/80 mb-4 font-semibold">Select the personality for your listings</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {(Object.keys(TONE_DESCRIPTIONS) as Array<keyof typeof TONE_DESCRIPTIONS>).map(tone => (
                    <button
                      key={tone}
                      onClick={() => handleToneChange(tone)}
                      className={`p-4 rounded-lg border-2 transition-all cursor-pointer font-semibold ${
                        profile.writingTone === tone
                          ? 'border-cyan-400 bg-cyan-900/40 text-cyan-300'
                          : 'border-cyan-400/30 bg-slate-800/40 text-cyan-200/70 hover:border-cyan-400/60 hover:bg-slate-800/60'
                      }`}
                    >
                      <p className="text-sm capitalize">{tone}</p>
                      <p className="text-xs text-cyan-200/60 mt-2 line-clamp-2">{TONE_DESCRIPTIONS[tone]}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tone Customization */}
            <div className="group relative overflow-hidden rounded-2xl backdrop-blur-sm transition-all duration-300 border-2 border-cyan-400/50 group-hover:border-cyan-300 hover:shadow-3xl hover:shadow-cyan-500/50 animate-in fade-in slide-in-from-left-4 duration-500" style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 58, 138, 0.4) 100%)' }}>
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-500/30 to-blue-600/20 rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl" />
              <div className="relative p-6 z-10">
                <h3 className="text-xl font-black text-cyan-300 drop-shadow-lg mb-6">Fine-Tune Your Voice</h3>
                <p className="text-sm text-cyan-200/80 mb-6 font-semibold">Adjust sliders to customize your communication style</p>
                <div className="space-y-6">
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
                </div>
              </div>
            </div>

            {/* Catch Phrases */}
            <div className="group relative overflow-hidden rounded-2xl backdrop-blur-sm transition-all duration-300 border-2 border-cyan-400/50 group-hover:border-cyan-300 hover:shadow-3xl hover:shadow-cyan-500/50 animate-in fade-in slide-in-from-left-4 duration-500" style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 58, 138, 0.4) 100%)' }}>
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-500/30 to-blue-600/20 rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl" />
              <div className="relative p-6 z-10">
                <h3 className="text-xl font-black text-cyan-300 drop-shadow-lg mb-4">Catch Phrases</h3>
                <p className="text-sm text-cyan-200/80 mb-6 font-semibold">Add signature phrases to your messages (max 5)</p>
                <div className="space-y-4">
                  {profile.catchPhrases.map((phrase, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-slate-800/40 border border-cyan-400/30 p-3 rounded-lg"
                    >
                      <p className="text-sm text-cyan-200">"{phrase}"</p>
                      <button
                        onClick={() => removeCatchPhrase(index)}
                        className="text-red-400 hover:text-red-300 text-sm font-bold"
                      >
                        ✕
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
                        className="border-2 border-cyan-400/50 bg-slate-900/50 text-cyan-200 placeholder-cyan-200/40"
                      />
                      <Button
                        onClick={addCatchPhrase}
                        disabled={!newCatchPhrase.trim()}
                        className="bg-cyan-600/80 hover:bg-cyan-700 text-white font-semibold"
                      >
                        Add
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Save Button */}
            <Button
              onClick={saveProfile}
              disabled={isSaving}
              className="w-full bg-cyan-600/80 hover:bg-cyan-700 text-white font-black text-lg py-6"
            >
              <Save className="w-5 h-5 mr-2" />
              {isSaving ? 'Saving...' : 'Save Voice Profile'}
            </Button>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-1">
            <div className="group sticky top-8 relative overflow-hidden rounded-2xl backdrop-blur-sm transition-all duration-300 border-2 border-cyan-400/50 group-hover:border-cyan-300 hover:shadow-3xl hover:shadow-cyan-500/50 animate-in fade-in slide-in-from-right-4 duration-500" style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 58, 138, 0.4) 100%)' }}>
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-500/30 to-blue-600/20 rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl" />
              <div className="relative p-6 z-10">
                <h3 className="text-lg font-black text-cyan-300 flex items-center gap-2 drop-shadow-lg mb-4">
                  <Zap className="w-5 h-5" />
                  Preview
                </h3>
                <Button
                  onClick={generatePreview}
                  className="w-full bg-cyan-600/80 hover:bg-cyan-700 text-white font-semibold mb-4"
                >
                  Generate Preview
                </Button>

                {previewText && (
                  <div className="bg-slate-800/60 rounded-lg p-4 border border-cyan-400/20 space-y-2 mb-4">
                    <p className="text-xs font-black text-cyan-300 uppercase">Preview</p>
                    <p className="text-sm text-cyan-200 whitespace-pre-wrap leading-relaxed font-medium">
                      {previewText}
                    </p>
                    <button
                      onClick={() => navigator.clipboard.writeText(previewText)}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold mt-2"
                    >
                      Copy preview
                    </button>
                  </div>
                )}

                <div className="bg-blue-900/30 border-2 border-blue-400/50 rounded-lg p-3">
                  <p className="text-xs text-blue-300 font-semibold">
                    <strong>Tone:</strong> {profile.writingTone}
                  </p>
                  <p className="text-xs text-blue-300 mt-2 font-semibold">
                    <strong>Style:</strong> Form {profile.formality}% | Ent {profile.enthusiasm}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
