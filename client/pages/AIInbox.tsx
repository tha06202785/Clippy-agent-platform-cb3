import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Send,
  AlertCircle,
  Sparkles,
  Copy,
  CheckCircle2,
  Clock,
  MessageCircle,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { useConversationsList } from '@/hooks/useConversationsList';
import { useConversationWithDraft } from '@/hooks/useConversationWithDraft';

type Conversation = ReturnType<typeof useConversationsList>['conversations'][number] & { lead_id?: string };

interface Message {
  id: string;
  text: string;
  direction_in_out: 'in' | 'out';
  created_at: string;
}

export default function AIInbox() {
  const navigate = useNavigate();
  const { conversations, loading, error } = useConversationsList();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [sendingDraft, setSendingDraft] = useState(false);
  const [draftSent, setDraftSent] = useState(false);
  const [copiedDraft, setCopiedDraft] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, aiDraft, loading: draftLoading, error: draftError } =
    useConversationWithDraft(selectedConversation?.id || null, selectedConversation?.leads?.id || null);

  // Auto-select first conversation when conversations load
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversation) {
      setSelectedConversation(conversations[0]);
    }
  }, [conversations, selectedConversation]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendDraft = async () => {
    if (!selectedConversation || !aiDraft?.suggested_reply) return;

    setSendingDraft(true);
    try {
      // Insert the draft as an outgoing message
      const { error: insertError } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation.id,
          text: aiDraft.suggested_reply,
          direction_in_out: 'out',
          created_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('Error sending draft:', insertError);
        setError('Failed to send draft');
      } else {
        setDraftSent(true);
        // Show success for 2 seconds then reset
        setTimeout(() => setDraftSent(false), 2000);
      }
    } catch (err) {
      console.error('Error in handleSendDraft:', err);
      setError('An error occurred while sending');
    } finally {
      setSendingDraft(false);
    }
  };

  const handleCopyDraft = () => {
    if (aiDraft?.suggested_reply) {
      navigator.clipboard.writeText(aiDraft.suggested_reply);
      setCopiedDraft(true);
      setTimeout(() => setCopiedDraft(false), 2000);
    }
  };

  if (loading) {
    return (
      <Layout showNav={true}>
        <div className="flex items-center justify-center h-screen text-muted-foreground">
          Loading conversations...
        </div>
      </Layout>
    );
  }

  return (
    <Layout showNav={true}>
      <div className="flex h-[calc(100vh-80px)] bg-background">
        {/* Left Sidebar - Conversations List */}
        <div className="w-64 border-r border-border bg-card overflow-y-auto">
          <div className="p-4 border-b border-border sticky top-0 bg-card">
            <h2 className="font-bold text-foreground flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              Conversations
            </h2>
          </div>

          {conversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No conversations yet
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedConversation?.id === conv.id
                      ? 'bg-primary/20 border border-primary/30'
                      : 'hover:bg-background border border-transparent'
                  }`}
                >
                  <p className="font-semibold text-sm text-foreground truncate">
                    {conv.leads?.full_name || 'Unknown'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {conv.channel} • {new Date(conv.last_message_at).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Center - Message Thread */}
        <div className="flex-1 flex flex-col bg-background">
          {selectedConversation ? (
            <>
              {/* Header */}
              <div className="border-b border-border p-4 bg-card">
                <h3 className="font-bold text-foreground">
                  {selectedConversation.leads?.full_name || 'Unknown'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {selectedConversation.channel} • {new Date(selectedConversation.last_message_at).toLocaleString()}
                </p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {draftLoading ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No messages yet
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.direction_in_out === 'in' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-xs px-4 py-2 rounded-lg ${
                          msg.direction_in_out === 'in'
                            ? 'bg-muted text-foreground'
                            : 'bg-primary text-primary-foreground'
                        }`}
                      >
                        <p className="text-sm break-words">{msg.text}</p>
                        <p
                          className={`text-xs mt-1 ${
                            msg.direction_in_out === 'in'
                              ? 'text-muted-foreground'
                              : 'text-primary-foreground/70'
                          }`}
                        >
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Select a conversation to view messages
            </div>
          )}
        </div>

        {/* Right Sidebar - AI Assistant Panel */}
        <div className="w-80 border-l border-border bg-card overflow-y-auto">
          {selectedConversation ? (
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="p-4 border-b border-border sticky top-0 bg-card">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
                  AI Assistant
                </h3>
              </div>

              {/* Draft Content */}
              <div className="flex-1 p-4 flex flex-col">
                {draftLoading ? (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    Generating reply...
                  </div>
                ) : draftError ? (
                  <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-700/50 rounded-lg text-red-200 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{draftError}</span>
                  </div>
                ) : aiDraft ? (
                  <>
                    {/* Intent Badge */}
                    {aiDraft.intent && (
                      <div className="mb-4 inline-flex">
                        <span className="px-3 py-1 text-xs font-semibold bg-cyan-900/40 text-cyan-300 rounded-full">
                          {aiDraft.intent}
                        </span>
                      </div>
                    )}

                    {/* Draft Reply */}
                    <div className="bg-background border border-border rounded-lg p-4 mb-4 flex-1">
                      <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                        Suggested Reply
                      </p>
                      <p className="text-sm text-foreground leading-relaxed">
                        {aiDraft.suggested_reply}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                      {/* Send Draft Button */}
                      <button
                        onClick={handleSendDraft}
                        disabled={sendingDraft}
                        className={`w-full py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                          draftSent
                            ? 'bg-green-600/30 text-green-300 border border-green-600/50'
                            : 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white hover:from-cyan-700 hover:to-cyan-600 shadow-lg shadow-cyan-500/30'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {draftSent ? (
                          <>
                            <CheckCircle2 className="w-5 h-5" />
                            Sent!
                          </>
                        ) : sendingDraft ? (
                          <>
                            <Clock className="w-5 h-5 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-5 h-5" />
                            Send Draft
                          </>
                        )}
                      </button>

                      {/* Copy Button */}
                      <button
                        onClick={handleCopyDraft}
                        className={`w-full py-2 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                          copiedDraft
                            ? 'bg-green-600/30 text-green-300 border border-green-600/50'
                            : 'bg-background border border-border text-foreground hover:bg-muted'
                        }`}
                      >
                        <Copy className="w-4 h-4" />
                        {copiedDraft ? 'Copied!' : 'Copy Text'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    No AI reply generated yet
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground p-4 text-center">
              <p className="text-sm">Select a conversation to view AI suggestions</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
