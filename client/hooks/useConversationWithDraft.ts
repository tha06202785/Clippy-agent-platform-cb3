import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface Message {
  id: string;
  conversation_id: string;
  text: string;
  direction_in_out: 'in' | 'out';
  created_at: string;
  org_id?: string;
  [key: string]: any;
}

export interface AiDraft {
  id?: string;
  suggested_reply: string;
  intent?: string;
  [key: string]: any;
}

interface UseConversationWithDraftReturn {
  messages: Message[];
  aiDraft: AiDraft | null;
  loading: boolean;
  error: string | null;
  sending: boolean;
  sendDraft: (customText?: string | null) => Promise<void>;
}

export function useConversationWithDraft(
  conversationId: string | null,
  leadId: string | null
): UseConversationWithDraftReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [aiDraft, setAiDraft] = useState<AiDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);

  // Fetch org_id on mount
  useEffect(() => {
    const fetchOrgId = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user?.id) return;

        const { data: orgData } = await supabase
          .from('user_org_roles')
          .select('org_id')
          .eq('user_id', session.user.id)
          .single();

        if (orgData) {
          setOrgId(orgData.org_id);
        }
      } catch (err) {
        console.error('Error fetching org_id:', err);
      }
    };

    fetchOrgId();
  }, []);

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
          .select('*')
          .eq('lead_id', leadId)
          .eq('pack_type', 'draft_reply')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (draftError && draftError.code !== 'PGRST116') {
          // PGRST116 is "no rows found" which is expected if no draft exists
          console.error('Error fetching draft:', draftError);
        }

        if (draftData) {
          // Extract content_json if it's a string, otherwise use as-is
          const draftContent =
            typeof draftData.content_json === 'string'
              ? JSON.parse(draftData.content_json)
              : draftData.content_json;
          setAiDraft({ ...draftContent, id: draftData.id });
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

  const sendDraft = async (customText: string | null = null) => {
    // Fix React synthetic event bug - ensure customText is evaluated immediately
    const textOverride = typeof customText === 'string' ? customText : null;
    const textToSend = textOverride || (aiDraft ? aiDraft.suggested_reply : null);

    if (!textToSend || !conversationId || !orgId) {
      console.error('Missing required data to send draft');
      return;
    }

    setSending(true);
    try {
      // Insert the draft as an outgoing message
      const { data: newMsg, error: insertError } = await supabase
        .from('messages')
        .insert({
          org_id: orgId,
          conversation_id: conversationId,
          direction_in_out: 'out',
          text: textToSend,
          raw_json: { source: 'builder_io_draft_approval' },
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error sending draft:', insertError);
        setError('Failed to send draft');
      } else if (newMsg) {
        // Add new message to messages list
        setMessages([...messages, newMsg]);

        // Delete the content_pack if it has an id
        if (aiDraft?.id) {
          await supabase.from('content_packs').delete().eq('id', aiDraft.id);
          setAiDraft(null);
        }
      }
    } catch (err) {
      console.error('Error in sendDraft:', err);
      setError('An error occurred while sending');
    } finally {
      setSending(false);
    }
  };

  return {
    messages,
    aiDraft,
    loading,
    error,
    sending,
    sendDraft,
  };
}
