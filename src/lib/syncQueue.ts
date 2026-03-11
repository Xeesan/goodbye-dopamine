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

export function getQueueLength(): number {
  return getQueue().length;
}

function setQueue(queue: QueueItem[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function enqueue(item: Omit<QueueItem, 'id' | 'timestamp'>) {
  let queue = getQueue();

  // Drop items older than 7 days to prevent stale data accumulation
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  queue = queue.filter(q => q.timestamp > sevenDaysAgo);

  // Cap queue at 500 items to prevent localStorage overflow
  if (queue.length >= 500) {
    console.warn('Sync queue full, dropping oldest item');
    queue.shift();
  }
  queue.push({
    ...item,
    id: Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    timestamp: Date.now(),
  });
  setQueue(queue);
}

export async function flushQueue(): Promise<number> {
  // Drop stale items before processing
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const queue = getQueue().filter(q => q.timestamp > sevenDaysAgo);
  if (queue.length === 0) { setQueue([]); return 0; }

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
