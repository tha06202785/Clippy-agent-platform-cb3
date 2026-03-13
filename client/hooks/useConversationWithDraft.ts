import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface Message {
  id: string;
  conversation_id: string;
  text: string;
  direction_in_out: 'in' | 'out';
  created_at: string;
  [key: string]: any;
}

export interface AiDraft {
  suggested_reply: string;
  intent?: string;
  [key: string]: any;
}

interface UseConversationWithDraftReturn {
  messages: Message[];
  aiDraft: AiDraft | null;
  loading: boolean;
  error: string | null;
}

export function useConversationWithDraft(
  conversationId: string | null,
  leadId: string | null
): UseConversationWithDraftReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [aiDraft, setAiDraft] = useState<AiDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!conversationId || !leadId) {
      setMessages([]);
      setAiDraft(null);
      return;
    }

    async function fetchThread() {
      try {
        setLoading(true);
        setError(null);

        // Fetch conversation messages
        const { data: msgs, error: msgsError } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (msgsError) {
          console.error('Error fetching messages:', msgsError);
          setError('Failed to fetch conversation');
        } else {
          setMessages(msgs || []);
        }

        // Fetch AI Draft Reply
        const { data: draftData, error: draftError } = await supabase
          .from('content_packs')
          .select('content_json')
          .eq('lead_id', leadId)
          .eq('pack_type', 'draft_reply')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (draftError && draftError.code !== 'PGRST116') {
          // PGRST116 is "no rows found" which is expected if no draft exists
          console.error('Error fetching draft:', draftError);
        }

        if (draftData?.content_json) {
          setAiDraft(draftData.content_json);
        } else {
          setAiDraft(null);
        }
      } catch (err) {
        console.error('Error in fetchThread:', err);
        setError('An error occurred while fetching conversation');
      } finally {
        setLoading(false);
      }
    }

    fetchThread();
  }, [conversationId, leadId]);

  return {
    messages,
    aiDraft,
    loading,
    error,
  };
}
