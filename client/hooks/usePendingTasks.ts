import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface PendingTask {
  id: string;
  title: string;
  description: string | null;
  due_at: string;
  type: string;
  leads?: {
    full_name: string;
    phone: string | null;
  }[] | null;
}

interface UsePendingTasksReturn {
  tasks: PendingTask[];
  loading: boolean;
  error: string | null;
  markDone: (id: string) => Promise<void>;
}

export function usePendingTasks(): UsePendingTasksReturn {
  const [tasks, setTasks] = useState<PendingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTasks() {
      try {
        setLoading(true);
        setError(null);

        // RLS policies handle data isolation at database level
        const { data, error: fetchError } = await supabase
          .from('tasks')
          .select('id, title, description, due_at, type, leads(full_name, phone)')
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
    }

    fetchTasks();
  }, []);

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
  };
}
