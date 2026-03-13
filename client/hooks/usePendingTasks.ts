import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface PendingTask {
  id: string;
  org_id: string;
  lead_id: string | null;
  title: string;
  description: string | null;
  due_at: string;
  type: string;
  status: string;
  leads?: {
    full_name: string;
    phone: string | null;
  } | null;
}

interface UsePendingTasksReturn {
  tasks: PendingTask[];
  loading: boolean;
  error: string | null;
  markDone: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function usePendingTasks(): UsePendingTasksReturn {
  const [tasks, setTasks] = useState<PendingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userOrgId, setUserOrgId] = useState<string | null>(null);

  // Fetch user and org on mount
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        
        if (!session?.user?.id) {
          setError('User not authenticated');
          setLoading(false);
          return;
        }

        setUserId(session.user.id);

        // Get user's org_id
        const { data: orgData, error: orgError } = await supabase
          .from('user_org_roles')
          .select('org_id')
          .eq('user_id', session.user.id)
          .single();

        if (orgError) {
          console.warn('No org role found:', orgError.message);
          setUserOrgId('default');
        } else if (orgData) {
          setUserOrgId(orgData.org_id);
        } else {
          setUserOrgId('default');
        }
      } catch (err) {
        console.error('Error fetching user info:', err);
        setError('Failed to fetch user information');
      }
    };

    fetchUserInfo();
  }, []);

  // Fetch tasks when user info is available
  const fetchTasks = async () => {
    if (!userId || !userOrgId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select('id, title, description, due_at, type, status, org_id, lead_id, leads(full_name, phone)')
        .eq('org_id', userOrgId)
        .eq('assigned_to_user_id', userId)
        .eq('status', 'pending')
        .order('due_at', { ascending: true });

      if (fetchError) {
        console.error('Error fetching tasks:', fetchError);
        setError('Failed to fetch pending tasks');
      } else {
        setTasks(data || []);
      }
    } catch (err) {
      console.error('Error in fetchTasks:', err);
      setError('An error occurred while fetching tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId && userOrgId) {
      fetchTasks();
    }
  }, [userId, userOrgId]);

  const markDone = async (id: string) => {
    try {
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ status: 'completed' })
        .eq('id', id);

      if (updateError) {
        console.error('Error marking task as done:', updateError);
        setError('Failed to mark task as done');
      } else {
        // Remove the task from local state
        setTasks(tasks.filter(t => t.id !== id));
      }
    } catch (err) {
      console.error('Error in markDone:', err);
      setError('An error occurred while marking task as done');
    }
  };

  return {
    tasks,
    loading,
    error,
    markDone,
    refetch: fetchTasks,
  };
}
