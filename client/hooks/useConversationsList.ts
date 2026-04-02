import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface ConversationLead {
  id: string;
  full_name: string;
  phone: string | null;
}

export interface Conversation {
  id: string;
  channel: string;
  last_message_at: string;
  leads: ConversationLead[] | null;
}

interface UseConversationsListReturn {
  conversations: Conversation[];
  loading: boolean;
  error: string | null;
}

export function useConversationsList(): UseConversationsListReturn {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchConversations() {
      try {
        setLoading(true);
        setError(null);

        // RLS policies handle data isolation at database level
        const { data, error: fetchError } = await supabase
          .from('conversations')
          .select('id, channel, last_message_at, leads(id, full_name, phone)')
          .order('last_message_at', { ascending: false });

        if (fetchError) {
          console.error('Error fetching conversations:', fetchError);
          setError('Failed to fetch conversations');
        } else {
          setConversations(data || []);
        }
      } catch (err) {
        console.error('Error in fetchConversations:', err);
        setError('An error occurred while fetching conversations');
      } finally {
        setLoading(false);
      }
    }

    fetchConversations();
  }, []);

  return {
    conversations,
    loading,
    error,
  };
}
