/**
 * Automatic daily cloud backup of all localStorage data.
 * Silently snapshots gbd_* keys to the 'backups' storage bucket once per day.
 * Keeps last 7 backups, auto-prunes older ones.
 */
import { supabase } from '@/integrations/supabase/client';

const BACKUP_INTERVAL_KEY = 'gbd_last_backup_at';
const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_BACKUPS = 7;

async function getUserId(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

function collectLocalData(): Record<string, any> {
  const data: Record<string, any> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('gbd_') && key !== 'gbd_gemini_api_key') {
        try {
          data[key] = JSON.parse(localStorage.getItem(key)!);
        } catch {
          data[key] = localStorage.getItem(key);
        }
      }
    }
  } catch (e) {
    console.error('autoBackup: failed to collect local data', e);
  }
  return data;
}

async function pruneOldBackups(userId: string) {
  try {
    const { data: files } = await supabase.storage
      .from('backups')
      .list(userId, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

    if (!files || files.length <= MAX_BACKUPS) return;

    const toDelete = files.slice(MAX_BACKUPS).map(f => `${userId}/${f.name}`);
    if (toDelete.length > 0) {
      await supabase.storage.from('backups').remove(toDelete);
    }
  } catch (e) {
    console.error('autoBackup: prune error', e);
  }
}

export async function runAutoBackup(): Promise<boolean> {
  try {
    // Check if backup is needed (once per 24h)
    const lastBackup = localStorage.getItem(BACKUP_INTERVAL_KEY);
    if (lastBackup) {
      const elapsed = Date.now() - Number(lastBackup);
      if (elapsed < BACKUP_INTERVAL_MS) return false;
    }

    const userId = await getUserId();
    if (!userId) return false;

    const data = collectLocalData();
    if (Object.keys(data).length === 0) return false;

    const json = JSON.stringify(data);
    const blob = new Blob([json], { type: 'application/json' });

    // Limit backup size to 2MB to avoid storage abuse
    if (blob.size > 2 * 1024 * 1024) {
      console.warn('autoBackup: data too large, skipping', blob.size);
      return false;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = `${userId}/backup-${timestamp}.json`;

    const { error } = await supabase.storage
      .from('backups')
      .upload(filePath, blob, { contentType: 'application/json', upsert: false });

    if (error) {
      console.error('autoBackup: upload error', error.message);
      return false;
    }

    // Mark backup time
    localStorage.setItem(BACKUP_INTERVAL_KEY, String(Date.now()));

    // Prune old backups (keep last 7)
    await pruneOldBackups(userId);

    console.log('autoBackup: completed successfully');
    return true;
  } catch (e) {
    console.error('autoBackup: unexpected error', e);
    return false;
  }
}

/**
 * Restore from the latest cloud backup.
 * Returns the parsed data object, or null on failure.
 */
export async function restoreFromLatestBackup(): Promise<Record<string, any> | null> {
  try {
    const userId = await getUserId();
    if (!userId) return null;

    const { data: files } = await supabase.storage
      .from('backups')
      .list(userId, { limit: 1, sortBy: { column: 'created_at', order: 'desc' } });

    if (!files || files.length === 0) return null;

    const { data: signedData } = await supabase.storage
      .from('backups')
      .createSignedUrl(`${userId}/${files[0].name}`, 60);

    if (!signedData?.signedUrl) return null;

    const response = await fetch(signedData.signedUrl);
    if (!response.ok) return null;

    const json = await response.json();
    return typeof json === 'object' && json !== null ? json : null;
  } catch (e) {
    console.error('restoreFromLatestBackup: error', e);
    return null;
  }
}
