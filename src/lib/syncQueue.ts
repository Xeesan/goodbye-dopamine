import { supabase } from '@/integrations/supabase/client';

const QUEUE_KEY = 'gbd_sync_queue';

interface QueueItem {
  id: string;
  table: string;
  operation: 'upsert' | 'update' | 'insert';
  data: Record<string, any>;
  matchColumn?: string;
  timestamp: number;
}

function getQueue(): QueueItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setQueue(queue: QueueItem[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function enqueue(item: Omit<QueueItem, 'id' | 'timestamp'>) {
  const queue = getQueue();
  queue.push({
    ...item,
    id: Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    timestamp: Date.now(),
  });
  setQueue(queue);
}

export async function flushQueue(): Promise<number> {
  const queue = getQueue();
  if (queue.length === 0) return 0;

  let processed = 0;
  const remaining: QueueItem[] = [];

  for (const item of queue) {
    try {
      let result;
      if (item.operation === 'upsert') {
        result = await (supabase.from(item.table as any) as any).upsert(item.data, {
          onConflict: item.matchColumn || 'id',
        });
      } else if (item.operation === 'update') {
        const { id, ...rest } = item.data;
        result = await (supabase.from(item.table as any) as any)
          .update(rest)
          .eq(item.matchColumn || 'id', id);
      } else {
        result = await (supabase.from(item.table as any) as any).insert(item.data);
      }

      if (result.error) {
        remaining.push(item);
      } else {
        processed++;
      }
    } catch {
      remaining.push(item);
    }
  }

  setQueue(remaining);
  return processed;
}

export function getQueueLength(): number {
  return getQueue().length;
}
