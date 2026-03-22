import { useState, useRef, useEffect } from 'react';
import { Send, Loader, Keyboard, X } from 'lucide-react';
import { VoiceCopilotInput } from '@/components/VoiceCopilotInput';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

// Text-to-Speech Utility Function - OpenAI TTS via Supabase Edge Function
const speakText = async (text: string) => {
  try {
    const response = await fetch('https://mqydieqeybgxtjqogrwh.supabase.co/functions/v1/tts-openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        voice: 'alloy' // You can change this to 'nova', 'onyx', 'fable', 'shimmer', or 'echo'
      })
    });

    if (!response.ok) throw new Error('Failed to fetch audio');

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    const audio = new Audio(audioUrl);

    // Auto-play the audio
    await audio.play();

    // Clean up memory after it finishes playing
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
    };

  } catch (error) {
    console.error('TTS Error:', error);
  }
};

export default function CopilotMobile() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTextInput, setShowTextInput] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle transcription complete from VoiceCopilotInput
  const handleTranscriptionComplete = (
    transcribedText: string,
    copilotResponse?: string
  ) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: transcribedText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    // Add AI response if available from copilot-assistant
    if (copilotResponse) {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: copilotResponse,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Speak the AI response out loud
      speakText(copilotResponse);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const messageText = textToSend || inputText.trim();
    if (!messageText) return;

    // Add user message to chat
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setShowTextInput(false);
    setIsLoading(true);
    setError(null);

    try {
      // Send to copilot-assistant Edge Function
      const response = await fetch(
        'https://mqydieqeybgxtjqogrwh.supabase.co/functions/v1/copilot-assistant',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            org_id: 'test_org',
            agent_user_id: 'test_user',
            message: messageText,
            conversation_history: messages.map((m) => ({
              role: m.type === 'user' ? 'user' : 'assistant',
              content: m.content,
            })),
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      const aiResponse = data.content || data.message || 'No response received';

      // Add AI message to chat
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponse,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Speak the AI response out loud
      speakText(aiResponse);
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      <style>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-in {
          animation: slideInUp 0.3s ease-out;
        }
      `}</style>

      {/* Global Wrapper - Fixed to bottom-right */}
      <div className="fixed bottom-0 right-0 z-50 p-4">
        
        {/* Floating Action Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-2xl font-bold text-xl mb-4 ${
            isOpen
              ? 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              : 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700 hover:scale-110 active:scale-95'
          }`}
          title={isOpen ? 'Close Clippy' : 'Open Clippy'}
        >
          <span className="text-2xl">🎤</span>
        </button>

        {/* Chat Popup Window - Conditionally Rendered */}
        {isOpen && (
          <div className="absolute bottom-20 right-0 w-96 h-[600px] bg-slate-900/95 rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-700/50 backdrop-blur-md animate-slide-in">
            
            {/* Chat Header */}
            <div className="bg-gradient-to-b from-slate-800 to-slate-900/50 p-4 border-b border-slate-700/30 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-foreground">🤖 Clippy Copilot</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-full hover:bg-slate-700/50 text-slate-400 hover:text-slate-300 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Body - Scrollable Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col">
              {messages.length === 0 && !isLoading && (
                <div className="flex items-center justify-center h-full text-center">
                  <div className="space-y-3">
                    <p className="text-4xl">🎤</p>
                    <p className="text-lg font-bold text-foreground">
                      Hi, I'm Clippy.<br />
                      What do you need today?
                    </p>
                    <p className="text-xs text-slate-400 mt-3">
                      Press and hold the microphone to speak
                    </p>
                  </div>
                </div>
              )}

              {/* Messages */}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-4 py-3 ${
                      msg.type === 'user'
                        ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white rounded-2xl rounded-br-none shadow-lg'
                        : 'bg-gradient-to-r from-slate-700 to-slate-800 text-slate-100 rounded-2xl rounded-bl-none shadow-lg border border-slate-600/30'
                    }`}
                  >
                    <p className="text-sm break-words">{msg.content}</p>
                    <p className="text-xs mt-1 opacity-70">
                      {msg.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}

              {/* Loading State */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-slate-100 px-4 py-3 rounded-2xl rounded-bl-none flex items-center gap-2 shadow-lg border border-slate-600/30">
                    <Loader className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Clippy is thinking...</span>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="flex justify-start">
                  <div className="bg-red-900/40 text-red-200 px-4 py-3 rounded-2xl rounded-bl-none text-sm border border-red-700/30 shadow-lg">
                    ⚠️ {error}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Text Input (Hidden by Default) */}
            {showTextInput && (
              <div className="px-4 py-3 border-t border-slate-700/30 bg-slate-800/50">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    autoFocus
                    className="flex-1 px-4 py-2 rounded-full bg-slate-700/50 border border-slate-600/50 text-foreground placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors text-sm"
                  />
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={!inputText.trim() || isLoading}
                    className="px-4 py-2 rounded-full bg-gradient-to-r from-cyan-600 to-cyan-500 text-white hover:from-cyan-700 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Voice Input Control Bar */}
            <div className="px-4 py-6 bg-gradient-to-t from-slate-900 to-slate-900/50 border-t border-slate-700/30 flex flex-col items-center gap-4">
              
              {/* Voice Input Component */}
              <VoiceCopilotInput
                onTranscriptionComplete={handleTranscriptionComplete}
                orgId="test_org"
                agentUserId="test_user"
              />

              {/* Keyboard Toggle */}
              <button
                onClick={() => setShowTextInput(!showTextInput)}
                className="p-2 rounded-full bg-slate-700/50 text-slate-400 hover:bg-slate-600 hover:text-slate-300 transition-colors"
                title={showTextInput ? 'Hide keyboard' : 'Show keyboard'}
              >
                <Keyboard className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
