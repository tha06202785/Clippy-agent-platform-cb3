import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mic, Sparkles, MessageSquare, FileText, Check } from 'lucide-react';
import { toast } from 'sonner';

export function AgentVoiceSettings() {
  const [voiceProfile, setVoiceProfile] = useState({
    tone: 'professional',
    formality: [7],
    enthusiasm: [6],
    emojiUsage: [3],
    technicalDetail: [5],
    catchPhrases: '',
    commonWords: ''
  });

  const [previewText, setPreviewText] = useState('');
  const [generating, setGenerating] = useState(false);

  const toneOptions = [
    { value: 'luxury', label: 'Luxury', description: 'Sophisticated, elegant' },
    { value: 'family', label: 'Family-Friendly', description: 'Warm, welcoming' },
    { value: 'investment', label: 'Investment-Focused', description: 'Data-driven, professional' },
    { value: 'energetic', label: 'Energetic', description: 'Exciting, punchy' },
    { value: 'professional', label: 'Professional', description: 'Corporate, formal' },
    { value: 'casual', label: 'Casual', description: 'Friendly, approachable' }
  ];

  const saveProfile = async () => {
    try {
      await fetch('/api/agent/voice-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(voiceProfile)
      });
      toast.success('Voice profile saved!');
    } catch (error) {
      toast.error('Failed to save profile');
    }
  };

  const generatePreview = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/agent/voice-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...voiceProfile,
          property: {
            address: '123 Sample Street',
            suburb: 'Sample Suburb',
            beds: 3,
            baths: 2,
            price: '$850,000'
          }
        })
      });
      
      const data = await response.json();
      setPreviewText(data.content);
    } catch (error) {
      toast.error('Failed to generate preview');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mic className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Your Voice Profile</CardTitle>
              <CardDescription>
                Personalize how Clippy writes content for you. Make it sound like YOU.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <Tabs defaultValue="personality">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="personality">Personality</TabsTrigger>
              <TabsTrigger value="phrases">Catch Phrases</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="personality" className="space-y-6">
              {/* Tone Selection */}
              <div className="space-y-3">
                <Label>Writing Tone</Label>
                <Select 
                  value={voiceProfile.tone}
                  onValueChange={(value) => setVoiceProfile({...voiceProfile, tone: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your tone" />
                  </SelectTrigger>
                  <SelectContent>
                    {toneOptions.map((tone) => (
                      <SelectItem key={tone.value} value={tone.value}>
                        <div className="flex flex-col items-start">
                          <span>{tone.label}</span>
                          <span className="text-xs text-muted-foreground">{tone.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <p className="text-sm text-muted-foreground">
                  {toneOptions.find(t => t.value === voiceProfile.tone)?.description}
                </p>
              </div>

              {/* Sliders */}
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label>Formality Level</Label>
                    <Badge variant="secondary">{voiceProfile.formality[0]}/10</Badge>
                  </div>
                  <Slider
                    value={voiceProfile.formality}
                    onValueChange={(value) => setVoiceProfile({...voiceProfile, formality: value})}
                    max={10}
                    step={1}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Casual</span>
                    <span>Formal</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label>Enthusiasm</Label>
                    <Badge variant="secondary">{voiceProfile.enthusiasm[0]}/10</Badge>
                  </div>
                  <Slider
                    value={voiceProfile.enthusiasm}
                    onValueChange={(value) => setVoiceProfile({...voiceProfile, enthusiasm: value})}
                    max={10}
                    step={1}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Reserved</span>
                    <span>Excited</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label>Emoji Usage</Label>
                    <Badge variant="secondary">{voiceProfile.emojiUsage[0]}/10</Badge>
                  </div>
                  <Slider
                    value={voiceProfile.emojiUsage}
                    onValueChange={(value) => setVoiceProfile({...voiceProfile, emojiUsage: value})}
                    max={10}
                    step={1}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>None</span>
                    <span>Lots</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label>Technical Detail</Label>
                    <Badge variant="secondary">{voiceProfile.technicalDetail[0]}/10</Badge>
                  </div>
                  <Slider
                    value={voiceProfile.technicalDetail}
                    onValueChange={(value) => setVoiceProfile({...voiceProfile, technicalDetail: value})}
                    max={10}
                    step={1}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Simple</span>
                    <span>Detailed</span>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="phrases" className="space-y-6">
              <div className="space-y-3">
                <Label>Catch Phrases (one per line)</Label>
                <Textarea
                  value={voiceProfile.catchPhrases}
                  onChange={(e) => setVoiceProfile({...voiceProfile, catchPhrases: e.target.value})}
                  placeholder="A rare opportunity&#10;Uncompromising quality&#10;Must see!"
                  rows={4}
                />
                <p className="text-sm text-muted-foreground">
                  Phrases you commonly use that make your writing unique
                </p>
              </div>

              <div className="space-y-3">
                <Label>Common Words (one per line)</Label>
                <Textarea
                  value={voiceProfile.commonWords}
                  onChange={(e) => setVoiceProfile({...voiceProfile, commonWords: e.target.value})}
                  placeholder="Stunning&#10;Beautiful&#10;Incredible"
                  rows={3}
                />
                <p className="text-sm text-muted-foreground">
                  Words you frequently use in your listings
                </p>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4">
              <Button 
                onClick={generatePreview}
                disabled={generating}
                className="w-full"
              >
                {generating ? (
                  <>
                    <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                    Generating preview...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Preview
                  </>
                )}
              </Button>

              {previewText && (
                <Card className="bg-muted">
                  <CardHeader>
                    <CardTitle className="text-sm">Generated Content Preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-white p-4 rounded-lg border">
                      <pre className="text-sm whitespace-pre-wrap">{previewText}</pre>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex gap-4 pt-4 border-t">
            <Button onClick={saveProfile} className="flex-1">
              <Check className="mr-2 h-4 w-4" />
              Save Voice Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tips Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">💡 Tips for Best Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex gap-3">
            <MessageSquare className="h-5 w-5 text-primary flex-shrink-0" />
            <div>
              <p className="font-medium">Use Your Natural Voice</p>
              <p className="text-muted-foreground">Think about how you speak to clients. Formal or casual? Enthusiastic or measured?</p>
            </div>
          </div>

          <div className="flex gap-3">
            <FileText className="h-5 w-5 text-primary flex-shrink-0" />
            <div>
              <p className="font-medium">Add Your Catch Phrases</p>
              <p className="text-muted-foreground">Phrases like "A rare opportunity" or "Must see!" make your content authentically yours.</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
            <div>
              <p className="font-medium">Preview Before Saving</p>
              <p className="text-muted-foreground">Always test your voice profile with the preview to make sure it sounds like you.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
