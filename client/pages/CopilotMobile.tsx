import { useState, useEffect, useRef } from 'react';
import { Send, Mic, Loader, Keyboard } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

export default function CopilotMobile() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTextInput, setShowTextInput] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Web Speech API
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Speech Recognition not supported in this browser');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
        setError(null);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.onresult = (event: any) => {
        let transcribedText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcribedText += event.results[i][0].transcript;
        }
        if (transcribedText.trim()) {
          handleSendMessage(transcribedText);
        }
      };

      recognition.onerror = (event: any) => {
        setError(`Speech recognition error: ${event.error}`);
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.error('Failed to initialize Speech Recognition:', err);
      setError('Failed to initialize voice input');
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleMicrophone = () => {
    if (!recognitionRef.current) return;

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
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
            org_id: 'test-org',
            agent_user_id: 'test-user',
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      {/* Premium Mobile Container */}
      <div className="w-full max-w-md flex flex-col h-[90vh] bg-slate-900/80 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-700/50 overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-b from-slate-800 to-slate-900/50 p-6 border-b border-slate-700/30">
          <h1 className="text-2xl font-bold text-foreground">🤖 Clippy</h1>
          <p className="text-xs text-slate-400 mt-1">AI Real Estate Copilot</p>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 flex flex-col">
          {messages.length === 0 && !isLoading && (
            <div className="flex items-center justify-center h-full text-center mb-24">
              <div className="space-y-3">
                <p className="text-5xl">🎤</p>
                <p className="text-2xl font-bold text-foreground">
                  Hi, I'm Clippy.<br />
                  What do you need today?
                </p>
                <p className="text-sm text-slate-400 mt-4">
                  Tap and hold the microphone to speak
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
                className={`max-w-xs px-5 py-3 ${
                  msg.type === 'user'
                    ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white rounded-2xl rounded-br-none shadow-lg'
                    : 'bg-gradient-to-r from-slate-700 to-slate-800 text-slate-100 rounded-2xl rounded-bl-none shadow-lg border border-slate-600/30'
                }`}
              >
                <p className="text-sm break-words">{msg.content}</p>
                <p
                  className={`text-xs mt-2 opacity-70`}
                >
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
              <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-slate-100 px-5 py-3 rounded-2xl rounded-bl-none flex items-center gap-2 shadow-lg border border-slate-600/30">
                <Loader className="w-4 h-4 animate-spin" />
                <span className="text-sm">Clippy is thinking...</span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex justify-start">
              <div className="bg-red-900/40 text-red-200 px-5 py-3 rounded-2xl rounded-bl-none text-sm border border-red-700/30 shadow-lg">
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
                className="flex-1 px-4 py-3 rounded-full bg-slate-700/50 border border-slate-600/50 text-foreground placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors text-sm"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || isLoading}
                className="px-4 py-3 rounded-full bg-gradient-to-r from-cyan-600 to-cyan-500 text-white hover:from-cyan-700 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Control Bar - Voice First Design */}
        <div className="relative px-6 py-8 bg-gradient-to-t from-slate-900 to-slate-900/50 border-t border-slate-700/30 flex justify-center items-end gap-4">
          {/* Microphone Button - The Hero */}
          <style>{`
            @keyframes glowPulse {
              0%, 100% {
                box-shadow: 0 0 20px rgba(6, 182, 212, 0.3), 0 0 40px rgba(6, 182, 212, 0.1);
              }
              50% {
                box-shadow: 0 0 40px rgba(6, 182, 212, 0.6), 0 0 80px rgba(6, 182, 212, 0.2);
              }
            }
            .mic-recording {
              animation: glowPulse 1.5s ease-in-out infinite;
            }
          `}</style>
          
          <button
            onClick={toggleMicrophone}
            disabled={isLoading}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all font-bold text-lg shadow-2xl relative ${
              isRecording
                ? 'bg-gradient-to-br from-red-500 to-red-600 text-white mic-recording scale-110'
                : 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700 hover:scale-105 active:scale-95'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={isRecording ? 'Stop recording' : 'Start recording'}
          >
            <Mic className="w-9 h-9" />
          </button>

          {/* Keyboard Toggle Button */}
          <button
            onClick={() => setShowTextInput(!showTextInput)}
            className="p-2 rounded-full bg-slate-700/50 text-slate-400 hover:bg-slate-600 hover:text-slate-300 transition-colors"
            title={showTextInput ? 'Hide keyboard' : 'Show keyboard'}
          >
            <Keyboard className="w-5 h-5" />
          </button>
        </div>

        {/* Recording Status Indicator */}
        {isRecording && (
          <div className="px-6 pb-4 text-center">
            <p className="text-xs text-cyan-400 animate-pulse font-medium">
              🎤 Listening...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
