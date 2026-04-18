import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Check, MessageSquare, Code } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const THEMES = [
  { value: "blue", label: "Blue", color: "#2563eb" },
  { value: "green", label: "Green", color: "#16a34a" },
  { value: "purple", label: "Purple", color: "#9333ea" },
  { value: "orange", label: "Orange", color: "#ea580c" },
  { value: "dark", label: "Dark", color: "#374151" },
];

const POSITIONS = [
  { value: "bottom-right", label: "Bottom Right" },
  { value: "bottom-left", label: "Bottom Left" },
  { value: "top-right", label: "Top Right" },
  { value: "top-left", label: "Top Left" },
];

export default function WidgetEmbed() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  
  // Widget configuration
  const [config, setConfig] = useState({
    position: "bottom-right",
    theme: "blue",
    welcome: "Hi! I'm Clippy. How can I help you today?",
    title: "Clippy Assistant",
    width: "350",
    height: "500",
  });

  const apiUrl = "https://api.useclippy.com/widget/chat";
  
  const embedCode = `<!-- Clippy AI Chat Widget -->
<script src="https://www.useclippy.com/clippy-widget.js"
    data-position="${config.position}"
    data-theme="${config.theme}"
    data-welcome="${config.welcome}"
    data-title="${config.title}"
    data-width="${config.width}"
    data-height="${config.height}"
    data-api-endpoint="${apiUrl}">
</script>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Embed code copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-6">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🧷 Clippy Widget
          </h1>
          <p className="text-xl text-gray-600">
            Add AI-powered chat to any website in seconds
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Configuration Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5" />
                Configure Your Widget
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Position */}
              <div className="space-y-2">
                <Label>Position</Label>
                <Select
                  value={config.position}
                  onValueChange={(value) => setConfig({ ...config, position: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POSITIONS.map((pos) => (
                      <SelectItem key={pos.value} value={pos.value}>
                        {pos.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Theme */}
              <div className="space-y-2">
                <Label>Theme</Label>
                <Select
                  value={config.theme}
                  onValueChange={(value) => setConfig({ ...config, theme: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {THEMES.map((theme) => (
                      <SelectItem key={theme.value} value={theme.value}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: theme.color }}
                          />
                          {theme.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Welcome Message */}
              <div className="space-y-2">
                <Label>Welcome Message</Label>
                <Textarea
                  value={config.welcome}
                  onChange={(e) => setConfig({ ...config, welcome: e.target.value })}
                  rows={2}
                />
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label>Widget Title</Label>
                <Input
                  value={config.title}
                  onChange={(e) => setConfig({ ...config, title: e.target.value })}
                />
              </div>

              {/* Size */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Width (px)</Label>
                  <Input
                    type="number"
                    value={config.width}
                    onChange={(e) => setConfig({ ...config, width: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Height (px)</Label>
                  <Input
                    type="number"
                    value={config.height}
                    onChange={(e) => setConfig({ ...config, height: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Embed Code Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Your Embed Code</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap">
                  {embedCode}
                </pre>
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute top-2 right-2"
                  onClick={copyToClipboard}
                >
                  {copied ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">How to use:</h4>
                <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                  <li>Copy the code above</li>
                  <li>Paste it before the closing <code>&lt;/body&gt;</code> tag</li>
                  <li>That's it! The widget will appear on your site</li>
                </ol>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={copyToClipboard}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Embed Code
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="text-3xl mb-2">⚡</div>
              <h3 className="font-semibold mb-2">Zero Dependencies</h3>
              <p className="text-sm text-gray-600">
                Pure vanilla JavaScript. No frameworks required.
              </p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="text-3xl mb-2">🎨</div>
              <h3 className="font-semibold mb-2">Customizable</h3>
              <p className="text-sm text-gray-600">
                Match your brand with 5 themes and custom colors.
              </p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="text-3xl mb-2">🤖</div>
              <h3 className="font-semibold mb-2">AI Powered</h3>
              <p className="text-sm text-gray-600">
                Connected to GPT-3.5 for intelligent responses.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Live Demo Notice */}
        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-4">See the widget in action?</p>
          <p className="text-sm text-gray-500">
            Look for the 🧷 chat bubble in the bottom-right corner!
          </p>
        </div>
      </div>

      {/* Live Widget */}
      <script
        src="/clippy-widget.js"
        data-position="bottom-right"
        data-theme="blue"
        data-welcome="Hi! I'm Clippy. Want to add me to your website? I can help!"
        data-title="Clippy Widget Demo"
        data-api-endpoint="/api/widget/chat"
      />
    </div>
  );
}