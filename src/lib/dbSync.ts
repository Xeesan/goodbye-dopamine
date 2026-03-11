/**
 * Database sync with LWW (Last-Write-Wins) conflict resolution.
 * Each record carries an `updated_at` / `updatedAt` timestamp.
 * On sync, per-record comparison keeps the newer version.
 * Deletes are soft (sets deleted_at) for recoverability.
 */
import { supabase } from '@/integrations/supabase/client';
import Storage from './storage';

/** Check if an ID is a valid DB UUID (not a local-only temp ID) */
function isDbId(id: string): boolean {
  return !!id && !String(id).includes('_');
}

let currentUserId: string | null = null;

async function getUserId(): Promise<string | null> {
  if (currentUserId) return currentUserId;
  const { data: { session } } = await supabase.auth.getSession();
  currentUserId = session?.user?.id ?? null;
  return currentUserId;
}

supabase.auth.onAuthStateChange((_event, session) => {
  currentUserId = session?.user?.id ?? null;
});

// ── LWW Helper ──

/**
 * Merge two arrays by id using Last-Write-Wins.
 * Returns { merged, toUpload (local items newer than remote), toDownload (remote items newer than local) }
 */
function lwwMerge<T extends { id: string; updatedAt?: string; updated_at?: string }>(
  localItems: T[],
  remoteItems: T[],
  getTimestamp: (item: T) => string
): { merged: T[]; toUpload: T[]; toDownload: T[] } {
  const localMap = new Map(localItems.map(i => [String(i.id), i]));
  const remoteMap = new Map(remoteItems.map(i => [String(i.id), i]));
  const merged: T[] = [];
  const toUpload: T[] = [];
  const toDownload: T[] = [];

  // Process all known IDs
  const allIds = new Set([...localMap.keys(), ...remoteMap.keys()]);
  for (const id of allIds) {
    const local = localMap.get(id);
    const remote = remoteMap.get(id);

    if (local && remote) {
      const localTs = new Date(getTimestamp(local)).getTime() || 0;
      const remoteTs = new Date(getTimestamp(remote)).getTime() || 0;
      if (localTs > remoteTs) {
        merged.push(local);
        toUpload.push(local);
      } else {
        // Remote wins (equal timestamps → prefer server authority)
        merged.push(remote);
        if (remoteTs > localTs) toDownload.push(remote);
      }
    } else if (local) {
      merged.push(local);
      toUpload.push(local);
    } else if (remote) {
      merged.push(remote);
      toDownload.push(remote);
    }
  }

  return { merged, toUpload, toDownload };
}

// ── Exams Sync ──

export async function syncExamsFromDB(): Promise<any[]> {
  const userId = await getUserId();
  if (!userId) return Storage.getExams();

  try {
    const { data, error } = await supabase
      .from('user_exams')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('date', { ascending: true });

    if (error) {
      console.error('Failed to fetch exams from DB:', error);
      return Storage.getExams();
    }

    const remoteExams = (data || []).map(e => ({
      id: e.id,
      subject: e.subject,
      date: e.date,
      time: e.time,
      grade: e.grade,
      credits: e.credits,
      teacher: e.teacher,
      room: e.room,
      type: e.type,
      updatedAt: e.updated_at,
    }));

    const localExams = Storage.getExams();

    if (remoteExams.length === 0 && localExams.length === 0) {
      Storage.setExams([]);
      return [];
    }

    // First-time migration: local only → push all
    if (remoteExams.length === 0 && localExams.length > 0) {
      // Check if ALL local exams have DB-style IDs (no underscore)
      // If so, they were deleted from DB — clear local cache
      const hasLocalOnly = localExams.some(e => String(e.id).includes('_'));
      if (!hasLocalOnly) {
        // All local exams have DB IDs but DB is empty → they were deleted
        Storage.setExams([]);
        return [];
      }
      await pushExamsToDB(localExams, userId);
      return localExams;
    }

    const remoteIdSet = new Set(remoteExams.map(e => String(e.id)));

    // LWW merge — only for exams that still exist in DB
    const localWithDbIds = localExams.filter(e => {
      const id = String(e.id);
      // Keep local DB-id exams only if they still exist remotely
      if (!id.includes('_')) return remoteIdSet.has(id);
      return false; // local-only items handled separately
    });

    const { merged, toUpload } = lwwMerge(
      localWithDbIds,
      remoteExams,
      (e) => e.updatedAt || e.updated_at || '1970-01-01'
    );

    // Also include local-only items (never pushed)
    const localOnly = localExams.filter(e => String(e.id).includes('_'));
    for (const item of localOnly) {
      await pushSingleExamToDB(item, userId);
    }

    // Push newer local items to DB
    for (const item of toUpload) {
      await updateExamInDB(item);
    }

    const finalExams = [...merged, ...localOnly];
    Storage.setExams(finalExams);
    return finalExams;
  } catch (e) {
    console.error('Exam sync error:', e);
    return Storage.getExams();
  }
}

async function pushExamsToDB(exams: any[], userId: string) {
  for (const exam of exams) {
    await pushSingleExamToDB(exam, userId);
  }
}

async function pushSingleExamToDB(exam: any, userId: string) {
  const { data } = await supabase.from('user_exams').insert({
    user_id: userId,
    subject: exam.subject,
    date: exam.date,
    time: exam.time || '09:00',
    grade: exam.grade || '',
    credits: exam.credits || 3,
    teacher: exam.teacher || '',
    room: exam.room || '',
    type: exam.type || 'exams',
    updated_at: exam.updatedAt || new Date().toISOString(),
  }).select('id').single();
  return data?.id ?? null;
}

export async function addExamToDB(exam: any): Promise<string | null> {
  const userId = await getUserId();
  if (!userId) return null;

  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase.from('user_exams').insert({
      user_id: userId,
      subject: exam.subject,
      date: exam.date,
      time: exam.time || '09:00',
      grade: exam.grade || '',
      credits: exam.credits || 3,
      teacher: exam.teacher || '',
      room: exam.room || '',
      type: exam.type || 'exams',
      updated_at: now,
    }).select('id').single();

    if (error) console.error('Failed to add exam to DB:', error);
    return data?.id ?? null;
  } catch (e) {
    console.error('Add exam DB error:', e);
    return null;
  }
}

export async function updateExamInDB(exam: any) {
  const userId = await getUserId();
  if (!userId || !exam.id || !isDbId(exam.id)) return;

  try {
    await supabase.from('user_exams').update({
      subject: exam.subject,
      date: exam.date,
      time: exam.time,
      grade: exam.grade,
      credits: exam.credits,
      teacher: exam.teacher,
      room: exam.room,
      type: exam.type,
      updated_at: exam.updatedAt || new Date().toISOString(),
    }).eq('id', exam.id).eq('user_id', userId);
  } catch (e) {
    console.error('Update exam DB error:', e);
  }
}

export async function deleteExamFromDB(id: string) {
  const userId = await getUserId();
  if (!userId || !isDbId(id)) return;
  try {
    // Soft delete
    await supabase.from('user_exams').update({ deleted_at: new Date().toISOString() }).eq('id', id).eq('user_id', userId);
  } catch (e) {
    console.error('Delete exam DB error:', e);
  }
}

export async function clearExamsInDB(type?: string) {
  const userId = await getUserId();
  if (!userId) return;
  try {
    // Soft delete all
    let query = supabase.from('user_exams').update({ deleted_at: new Date().toISOString() }).eq('user_id', userId).is('deleted_at', null);
    if (type) query = query.eq('type', type);
    await query;
  } catch (e) {
    console.error('Clear exams DB error:', e);
  }
}

// ── Routine Sync ──

export async function syncRoutineFromDB(): Promise<Record<string, any[]>> {
  const userId = await getUserId();
  if (!userId) return Storage.getRoutine();

  try {
    const { data, error } = await supabase
      .from('user_routine')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (error) {
      console.error('Failed to fetch routine from DB:', error);
      return Storage.getRoutine();
    }

    const remoteRoutine: Record<string, any[]> = {
      monday: [], tuesday: [], wednesday: [], thursday: [],
      friday: [], saturday: [], sunday: [],
    };
    for (const r of (data || [])) {
      if (remoteRoutine[r.day]) {
        remoteRoutine[r.day].push({
          id: r.id,
          subject: r.subject,
          startTime: r.start_time,
          endTime: r.end_time,
          room: r.room,
          updatedAt: r.created_at, // routine has no updated_at, use created_at
        });
      }
    }

    const localRoutine = Storage.getRoutine();
    const hasRemote = (data || []).length > 0;
    const hasLocal = Object.values(localRoutine).some(arr => arr.length > 0);

    if (!hasRemote && hasLocal) {
      // Check if all local items have DB IDs (no underscore) — means they were deleted remotely
      const hasLocalOnlyItems = Object.values(localRoutine).some(arr =>
        (arr as any[]).some(p => String(p.id).includes('_'))
      );
      if (!hasLocalOnlyItems) {
        const emptyRoutine: Record<string, any[]> = {
          monday: [], tuesday: [], wednesday: [], thursday: [],
          friday: [], saturday: [], sunday: [],
        };
        Storage.setRoutine(emptyRoutine);
        return emptyRoutine;
      }
      await pushRoutineToDB(localRoutine, userId);
      return localRoutine;
    }

    // Build remote ID set for reconciliation
    const remoteIdSet = new Set((data || []).map(r => String(r.id)));

    // Merge per-day using LWW
    const mergedRoutine: Record<string, any[]> = {
      monday: [], tuesday: [], wednesday: [], thursday: [],
      friday: [], saturday: [], sunday: [],
    };

    for (const day of Object.keys(mergedRoutine)) {
      // Only keep local DB-id items that still exist in remote
      const localPeriods = (localRoutine[day] || []).filter((p: any) => {
        const id = String(p.id);
        if (!id.includes('_')) return remoteIdSet.has(id);
        return false;
      });
      const remotePeriods = remoteRoutine[day] || [];
      const localOnly = (localRoutine[day] || []).filter((p: any) => String(p.id).includes('_'));

      const { merged } = lwwMerge(localPeriods, remotePeriods, (p) => p.updatedAt || '1970-01-01');

      // Push local-only items
      for (const p of localOnly) {
        const dbId = await addPeriodToDB(day, p);
        if (dbId) p.id = dbId;
      }

      mergedRoutine[day] = [...merged, ...localOnly].sort(
        (a: any, b: any) => (a.startTime || '').localeCompare(b.startTime || '')
      );
    }

    Storage.setRoutine(mergedRoutine);
    return mergedRoutine;
  } catch (e) {
    console.error('Routine sync error:', e);
    return Storage.getRoutine();
  }
}

async function pushRoutineToDB(routine: Record<string, any[]>, userId: string) {
  for (const [day, periods] of Object.entries(routine)) {
    for (const p of periods) {
      await supabase.from('user_routine').insert({
        user_id: userId,
        day,
        subject: p.subject,
        start_time: p.startTime,
        end_time: p.endTime,
        room: p.room || '',
      });
    }
  }
}

export async function addPeriodToDB(day: string, period: any): Promise<string | null> {
  const userId = await getUserId();
  if (!userId) return null;

  try {
    const { data, error } = await supabase.from('user_routine').insert({
      user_id: userId,
      day,
      subject: period.subject,
      start_time: period.startTime,
      end_time: period.endTime,
      room: period.room || '',
    }).select('id').single();

    if (error) console.error('Failed to add period to DB:', error);
    return data?.id ?? null;
  } catch (e) {
    console.error('Add period DB error:', e);
    return null;
  }
}

export async function deletePeriodFromDB(id: string) {
  const userId = await getUserId();
  if (!userId || !isDbId(id)) return;
  try {
    await supabase.from('user_routine').update({ deleted_at: new Date().toISOString() }).eq('id', id).eq('user_id', userId);
  } catch (e) {
    console.error('Delete period DB error:', e);
  }
}

export async function clearRoutineInDB() {
  const userId = await getUserId();
  if (!userId) return;
  try {
    await supabase.from('user_routine').update({ deleted_at: new Date().toISOString() }).eq('user_id', userId).is('deleted_at', null);
  } catch (e) {
    console.error('Clear routine DB error:', e);
  }
}

// ── Transactions Sync ──

export async function syncTransactionsFromDB(): Promise<any[]> {
  const userId = await getUserId();
  if (!userId) return Storage.getTransactions();

  try {
    const { data, error } = await supabase
      .from('user_transactions')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('date', { ascending: true });

    if (error) {
      console.error('Failed to fetch transactions from DB:', error);
      return Storage.getTransactions();
    }

    const remoteTxns = (data || []).map(t => ({
      id: t.id,
      type: t.type,
      description: t.description,
      amount: Number(t.amount),
      date: t.date,
      updatedAt: t.created_at, // transactions use created_at as timestamp
    }));

    const localTxns = Storage.getTransactions();

    if (remoteTxns.length === 0 && localTxns.length === 0) {
      Storage.setTransactions([]);
      return [];
    }

    if (remoteTxns.length === 0 && localTxns.length > 0) {
      const hasLocalOnly = localTxns.some(t => String(t.id).includes('_'));
      if (!hasLocalOnly) {
        // All local txns have DB IDs but DB is empty → deleted remotely
        Storage.setTransactions([]);
        return [];
      }
      for (const t of localTxns) {
        await supabase.from('user_transactions').insert({
          user_id: userId,
          type: t.type,
          description: t.description,
          amount: t.amount,
          date: t.date || new Date().toISOString(),
        });
      }
      return localTxns;
    }

    const remoteIdSet = new Set(remoteTxns.map(t => String(t.id)));

    // LWW merge — only keep local DB-id items that still exist in remote
    const localWithDbIds = localTxns.filter(t => {
      const id = String(t.id);
      if (!id.includes('_')) return remoteIdSet.has(id);
      return false;
    });
    const localOnly = localTxns.filter(t => String(t.id).includes('_'));

    const { merged } = lwwMerge(localWithDbIds, remoteTxns, (t) => t.updatedAt || t.date || '1970-01-01');

    // Push local-only
    for (const t of localOnly) {
      const { data: d } = await supabase.from('user_transactions').insert({
        user_id: userId,
        type: t.type,
        description: t.description,
        amount: t.amount,
        date: t.date || new Date().toISOString(),
      }).select('id').single();
      if (d?.id) t.id = d.id;
    }

    const finalTxns = [...merged, ...localOnly];
    Storage.setTransactions(finalTxns);
    return finalTxns;
  } catch (e) {
    console.error('Transaction sync error:', e);
    return Storage.getTransactions();
  }
}

export async function addTransactionToDB(txn: any): Promise<string | null> {
  const userId = await getUserId();
  if (!userId) return null;

  try {
    const { data, error } = await supabase.from('user_transactions').insert({
      user_id: userId,
      type: txn.type,
      description: txn.description,
      amount: txn.amount,
      date: txn.date || new Date().toISOString(),
    }).select('id').single();

    if (error) console.error('Failed to add transaction to DB:', error);
    return data?.id ?? null;
  } catch (e) {
    console.error('Add transaction DB error:', e);
    return null;
  }
}

export async function deleteTransactionFromDB(id: string) {
  const userId = await getUserId();
  if (!userId || !isDbId(id)) return;
  try {
    await supabase.from('user_transactions').update({ deleted_at: new Date().toISOString() }).eq('id', id).eq('user_id', userId);
  } catch (e) {
    console.error('Delete transaction DB error:', e);
  }
}

// ── Debts Sync ──

export async function syncDebtsFromDB(): Promise<any[]> {
  const userId = await getUserId();
  if (!userId) return Storage.getDebts();

  try {
    const { data, error } = await supabase
      .from('user_debts')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch debts from DB:', error);
      return Storage.getDebts();
    }

    const remoteDebts = (data || []).map(d => ({
      id: d.id,
      debtType: d.debt_type,
      person: d.person,
      amount: Number(d.amount),
      description: d.description,
      date: d.date,
      settled: d.settled,
      settledDate: d.settled_date,
      updatedAt: d.created_at,
    }));

    const localDebts = Storage.getDebts();

    if (remoteDebts.length === 0 && localDebts.length === 0) {
      Storage.setDebts([]);
      return [];
    }

    if (remoteDebts.length === 0 && localDebts.length > 0) {
      const hasLocalOnly = localDebts.some(d => String(d.id).includes('_'));
      if (!hasLocalOnly) {
        Storage.setDebts([]);
        return [];
      }
      for (const d of localDebts) {
        const debtTypeValue = d.debtType === 'borrow' ? 'borrow' : 'lend';
        const { data: dd } = await supabase.from('user_debts').insert({
          user_id: userId,
          debt_type: debtTypeValue,
          person: d.person,
          amount: d.amount,
          description: d.description || '',
          date: d.date || '',
          settled: d.settled || false,
          settled_date: d.settledDate || null,
        }).select('id').single();
        if (dd?.id) d.id = dd.id;
      }
      Storage.setDebts(localDebts);
      return localDebts;
    }

    // Remote is the source of truth — use remote data directly.
    // Only push local settled-status changes to DB if local is newer.
    const localByIdMap = new Map(localDebts.filter(d => !String(d.id).includes('_')).map(d => [String(d.id), d]));
    for (const remote of remoteDebts) {
      const local = localByIdMap.get(String(remote.id));
      if (local && local.settled && !remote.settled) {
        // Local settled a debt that remote hasn't caught up to
        await supabase.from('user_debts').update({
          settled: true,
          settled_date: local.settledDate || new Date().toISOString(),
        }).eq('id', remote.id).eq('user_id', userId);
        remote.settled = true;
        remote.settledDate = local.settledDate || new Date().toISOString();
      }
    }

    // Use remote data as final truth, discard all local-only entries
    const finalDebts = remoteDebts;
    Storage.setDebts(finalDebts);
    return finalDebts;
  } catch (e) {
    console.error('Debts sync error:', e);
    return Storage.getDebts();
  }
}

export async function addDebtToDB(debt: any): Promise<string | null> {
  const userId = await getUserId();
  if (!userId) return null;

  try {
    const debtTypeValue = debt.debtType === 'borrow' ? 'borrow' : 'lend';
    const { data, error } = await supabase.from('user_debts').insert({
      user_id: userId,
      debt_type: debtTypeValue,
      person: debt.person,
      amount: debt.amount,
      description: debt.description || '',
      date: debt.date || '',
      settled: false,
    }).select('id').single();

    if (error) console.error('Failed to add debt to DB:', error);
    return data?.id ?? null;
  } catch (e) {
    console.error('Add debt DB error:', e);
    return null;
  }
}

export async function settleDebtInDB(id: string, amount?: number) {
  const userId = await getUserId();
  if (!userId || !isDbId(id)) return null;
  try {
    if (amount !== undefined) {
      // Partial settlement: get current debt, reduce amount, create settled record
      const { data: debt } = await supabase.from('user_debts').select('*').eq('id', id).eq('user_id', userId).single();
      if (!debt) return null;
      const remaining = Number(debt.amount) - amount;
      if (remaining > 0) {
        // Update original with reduced amount
        await supabase.from('user_debts').update({ amount: remaining }).eq('id', id).eq('user_id', userId);
        // Create settled record for the paid portion
        const { data: settled } = await supabase.from('user_debts').insert({
          user_id: userId,
          debt_type: debt.debt_type,
          person: debt.person,
          amount: amount,
          description: `Partial payment — ${debt.description || (debt.debt_type === 'lend' ? 'Lent' : 'Borrowed')}`,
          date: debt.date || '',
          settled: true,
          settled_date: new Date().toISOString(),
        }).select('id').single();
        return settled?.id ?? null;
      } else {
        // Full settle
        await supabase.from('user_debts').update({
          settled: true,
          settled_date: new Date().toISOString(),
        }).eq('id', id).eq('user_id', userId);
        return null;
      }
    } else {
      await supabase.from('user_debts').update({
        settled: true,
        settled_date: new Date().toISOString(),
      }).eq('id', id).eq('user_id', userId);
      return null;
    }
  } catch (e) {
    console.error('Settle debt DB error:', e);
    return null;
  }
}

export async function deleteDebtFromDB(id: string) {
  const userId = await getUserId();
  if (!userId || !isDbId(id)) return;
  try {
    await supabase.from('user_debts').update({ deleted_at: new Date().toISOString() }).eq('id', id).eq('user_id', userId);
  } catch (e) {
    console.error('Delete debt DB error:', e);
  }
}

// ── Tasks Sync ──

export async function syncTasksFromDB(): Promise<any[]> {
  const userId = await getUserId();
  if (!userId) return Storage.getTasks();

  try {
    const { data, error } = await supabase
      .from('user_tasks')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch tasks from DB:', error);
      return Storage.getTasks();
    }

    const remoteTasks = (data || []).map(t => ({
      id: t.id,
      title: t.title,
      date: t.date,
      time: t.time,
      priority: t.priority,
      reminder: t.reminder,
      status: t.status,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    }));

    const localTasks = Storage.getTasks();

    if (remoteTasks.length === 0 && localTasks.length === 0) {
      Storage.setTasks([]);
      return [];
    }

    if (remoteTasks.length === 0 && localTasks.length > 0) {
      const hasLocalOnly = localTasks.some(t => String(t.id).includes('_'));
      if (!hasLocalOnly) {
        Storage.setTasks([]);
        return [];
      }
      // Push all local tasks to DB
      for (const t of localTasks) {
        const dbId = await addTaskToDB(t);
        if (dbId) t.id = dbId;
      }
      Storage.setTasks(localTasks);
      return localTasks;
    }

    const remoteIdSet = new Set(remoteTasks.map(t => String(t.id)));

    const localWithDbIds = localTasks.filter(t => {
      const id = String(t.id);
      if (!id.includes('_')) return remoteIdSet.has(id);
      return false;
    });
    const localOnly = localTasks.filter(t => String(t.id).includes('_'));

    const { merged, toUpload } = lwwMerge(
      localWithDbIds,
      remoteTasks,
      (t) => t.updatedAt || t.updated_at || '1970-01-01'
    );

    // Push local-only items
    for (const t of localOnly) {
      const dbId = await addTaskToDB(t);
      if (dbId) t.id = dbId;
    }

    // Push newer local items to DB
    for (const item of toUpload) {
      await updateTaskInDB(item);
    }

    const finalTasks = [...merged, ...localOnly];
    Storage.setTasks(finalTasks);
    return finalTasks;
  } catch (e) {
    console.error('Task sync error:', e);
    return Storage.getTasks();
  }
}

export async function addTaskToDB(task: any): Promise<string | null> {
  const userId = await getUserId();
  if (!userId) return null;

  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase.from('user_tasks').insert({
      user_id: userId,
      title: task.title,
      date: task.date || '',
      time: task.time || '',
      priority: task.priority || 'medium',
      reminder: task.reminder || '',
      status: task.status || 'todo',
      updated_at: task.updatedAt || now,
    }).select('id').single();

    if (error) console.error('Failed to add task to DB:', error);
    return data?.id ?? null;
  } catch (e) {
    console.error('Add task DB error:', e);
    return null;
  }
}

export async function updateTaskInDB(task: any) {
  const userId = await getUserId();
  if (!userId || !task.id || !isDbId(task.id)) return;

  try {
    await supabase.from('user_tasks').update({
      title: task.title,
      date: task.date,
      time: task.time,
      priority: task.priority,
      reminder: task.reminder,
      status: task.status,
      updated_at: task.updatedAt || new Date().toISOString(),
    }).eq('id', task.id).eq('user_id', userId);
  } catch (e) {
    console.error('Update task DB error:', e);
  }
}

export async function deleteTaskFromDB(id: string) {
  const userId = await getUserId();
  if (!userId || !isDbId(id)) return;
  try {
    await supabase.from('user_tasks').update({ deleted_at: new Date().toISOString() }).eq('id', id).eq('user_id', userId);
  } catch (e) {
    console.error('Delete task DB error:', e);
  }
}

// ── Notes Sync ──

export async function syncNotesFromDB(): Promise<any[]> {
  const userId = await getUserId();
  if (!userId) return Storage.getNotes();

  try {
    const { data, error } = await supabase
      .from('user_notes')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch notes from DB:', error);
      return Storage.getNotes();
    }

    const remoteNotes = (data || []).map(n => ({
      id: n.id,
      title: n.title,
      content: n.content,
      category: n.category,
      createdAt: n.created_at,
      updatedAt: n.updated_at,
    }));

    const localNotes = Storage.getNotes();

    if (remoteNotes.length === 0 && localNotes.length === 0) {
      Storage.setNotes([]);
      return [];
    }

    if (remoteNotes.length === 0 && localNotes.length > 0) {
      const hasLocalOnly = localNotes.some(n => String(n.id).includes('_'));
      if (!hasLocalOnly) {
        Storage.setNotes([]);
        return [];
      }
      for (const n of localNotes) {
        const dbId = await addNoteToDB(n);
        if (dbId) n.id = dbId;
      }
      Storage.setNotes(localNotes);
      return localNotes;
    }

    const remoteIdSet = new Set(remoteNotes.map(n => String(n.id)));

    const localWithDbIds = localNotes.filter(n => {
      const id = String(n.id);
      if (!id.includes('_')) return remoteIdSet.has(id);
      return false;
    });
    const localOnly = localNotes.filter(n => String(n.id).includes('_'));

    const { merged, toUpload } = lwwMerge(
      localWithDbIds,
      remoteNotes,
      (n) => n.updatedAt || n.updated_at || '1970-01-01'
    );

    for (const n of localOnly) {
      const dbId = await addNoteToDB(n);
      if (dbId) n.id = dbId;
    }

    for (const item of toUpload) {
      await updateNoteInDB(item);
    }

    const finalNotes = [...merged, ...localOnly];
    Storage.setNotes(finalNotes);
    return finalNotes;
  } catch (e) {
    console.error('Notes sync error:', e);
    return Storage.getNotes();
  }
}

export async function addNoteToDB(note: any): Promise<string | null> {
  const userId = await getUserId();
  if (!userId) return null;

  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase.from('user_notes').insert({
      user_id: userId,
      title: note.title,
      content: note.content || '',
      category: note.category || 'General',
      updated_at: note.updatedAt || now,
    }).select('id').single();

    if (error) console.error('Failed to add note to DB:', error);
    return data?.id ?? null;
  } catch (e) {
    console.error('Add note DB error:', e);
    return null;
  }
}

export async function updateNoteInDB(note: any) {
  const userId = await getUserId();
  if (!userId || !note.id || !isDbId(note.id)) return;

  try {
    await supabase.from('user_notes').update({
      title: note.title,
      content: note.content,
      category: note.category,
      updated_at: note.updatedAt || new Date().toISOString(),
    }).eq('id', note.id).eq('user_id', userId);
  } catch (e) {
    console.error('Update note DB error:', e);
  }
}

export async function deleteNoteFromDB(id: string) {
  const userId = await getUserId();
  if (!userId || !isDbId(id)) return;
  try {
    await supabase.from('user_notes').update({ deleted_at: new Date().toISOString() }).eq('id', id).eq('user_id', userId);
  } catch (e) {
    console.error('Delete note DB error:', e);
  }
}

// ── Books Sync ──

export async function syncBooksFromDB(): Promise<any[]> {
  const userId = await getUserId();
  if (!userId) return Storage.getBooks();

  try {
    const { data, error } = await supabase
      .from('user_books')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch books from DB:', error);
      return Storage.getBooks();
    }

    const remoteBooks = (data || []).map(b => ({
      id: b.id,
      title: b.title,
      author: b.author || '',
      genre: b.genre || 'Fiction',
      status: b.status || 'reading',
      pages: b.pages || 0,
      currentPage: b.current_page || 0,
      rating: b.rating || 0,
      notes: b.notes_text || '',
      addedAt: b.created_at,
      updatedAt: b.updated_at,
    }));

    const localBooks = Storage.getBooks();

    if (remoteBooks.length === 0 && localBooks.length === 0) {
      Storage.setBooks([]);
      return [];
    }

    if (remoteBooks.length === 0 && localBooks.length > 0) {
      const hasLocalOnly = localBooks.some((b: any) => String(b.id).includes('_'));
      if (!hasLocalOnly) {
        Storage.setBooks([]);
        return [];
      }
      for (const b of localBooks) {
        const dbId = await addBookToDB(b);
        if (dbId) b.id = dbId;
      }
      Storage.setBooks(localBooks);
      return localBooks;
    }

    const remoteIdSet = new Set(remoteBooks.map(b => String(b.id)));
    const localWithDbIds = localBooks.filter((b: any) => {
      const id = String(b.id);
      if (!id.includes('_')) return remoteIdSet.has(id);
      return false;
    });
    const localOnly = localBooks.filter((b: any) => String(b.id).includes('_'));

    const { merged, toUpload } = lwwMerge(
      localWithDbIds,
      remoteBooks,
      (b) => b.updatedAt || b.updated_at || '1970-01-01'
    );

    for (const b of localOnly) {
      const dbId = await addBookToDB(b);
      if (dbId) b.id = dbId;
    }

    for (const item of toUpload) {
      await updateBookInDB(item);
    }

    const finalBooks = [...merged, ...localOnly];
    Storage.setBooks(finalBooks);
    return finalBooks;
  } catch (e) {
    console.error('Books sync error:', e);
    return Storage.getBooks();
  }
}

export async function addBookToDB(book: any): Promise<string | null> {
  const userId = await getUserId();
  if (!userId) return null;

  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase.from('user_books').insert({
      user_id: userId,
      title: book.title,
      author: book.author || '',
      genre: book.genre || 'Fiction',
      status: book.status || 'reading',
      pages: book.pages || 0,
      current_page: book.currentPage || 0,
      rating: book.rating || 0,
      notes_text: book.notes || '',
      updated_at: book.updatedAt || now,
    }).select('id').single();

    if (error) console.error('Failed to add book to DB:', error);
    return data?.id ?? null;
  } catch (e) {
    console.error('Add book DB error:', e);
    return null;
  }
}

export async function updateBookInDB(book: any) {
  const userId = await getUserId();
  if (!userId || !book.id || !isDbId(book.id)) return;

  try {
    await supabase.from('user_books').update({
      title: book.title,
      author: book.author || '',
      genre: book.genre || 'Fiction',
      status: book.status || 'reading',
      pages: book.pages || 0,
      current_page: book.currentPage || 0,
      rating: book.rating || 0,
      notes_text: book.notes || '',
      updated_at: book.updatedAt || new Date().toISOString(),
    }).eq('id', book.id).eq('user_id', userId);
  } catch (e) {
    console.error('Update book DB error:', e);
  }
}

export async function deleteBookFromDB(id: string) {
  const userId = await getUserId();
  if (!userId || !isDbId(id)) return;
  try {
    await supabase.from('user_books').update({ deleted_at: new Date().toISOString() }).eq('id', id).eq('user_id', userId);
  } catch (e) {
    console.error('Delete book DB error:', e);
  }
}

// ── Semesters Sync ──

export async function syncSemestersFromDB(): Promise<any[]> {
  const userId = await getUserId();
  if (!userId) return Storage.getSemesters();

  try {
    const { data, error } = await supabase
      .from('user_semesters')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch semesters from DB:', error);
      return Storage.getSemesters();
    }

    const remoteSemesters = (data || []).map(s => ({
      id: s.id,
      name: s.name,
      courses: Array.isArray(s.courses) ? s.courses : [],
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    }));

    const localSemesters = Storage.getSemesters();

    if (remoteSemesters.length === 0 && localSemesters.length === 0) {
      Storage.setSemesters([]);
      return [];
    }

    if (remoteSemesters.length === 0 && localSemesters.length > 0) {
      const hasLocalOnly = localSemesters.some((s: any) => String(s.id).includes('_'));
      if (!hasLocalOnly) {
        Storage.setSemesters([]);
        return [];
      }
      for (const s of localSemesters) {
        const dbId = await addSemesterToDB(s);
        if (dbId) s.id = dbId;
      }
      Storage.setSemesters(localSemesters);
      return localSemesters;
    }

    const remoteIdSet = new Set(remoteSemesters.map(s => String(s.id)));
    const localWithDbIds = localSemesters.filter((s: any) => {
      const id = String(s.id);
      if (!id.includes('_')) return remoteIdSet.has(id);
      return false;
    });
    const localOnly = localSemesters.filter((s: any) => String(s.id).includes('_'));

    const { merged, toUpload } = lwwMerge(
      localWithDbIds,
      remoteSemesters,
      (s) => s.updatedAt || s.updated_at || '1970-01-01'
    );

    for (const s of localOnly) {
      const dbId = await addSemesterToDB(s);
      if (dbId) s.id = dbId;
    }

    for (const item of toUpload) {
      await updateSemesterInDB(item);
    }

    const finalSemesters = [...merged, ...localOnly];
    Storage.setSemesters(finalSemesters);
    return finalSemesters;
  } catch (e) {
    console.error('Semesters sync error:', e);
    return Storage.getSemesters();
  }
}

export async function addSemesterToDB(semester: any): Promise<string | null> {
  const userId = await getUserId();
  if (!userId) return null;

  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase.from('user_semesters').insert({
      user_id: userId,
      name: semester.name,
      courses: semester.courses || [],
      updated_at: semester.updatedAt || now,
    }).select('id').single();

    if (error) console.error('Failed to add semester to DB:', error);
    return data?.id ?? null;
  } catch (e) {
    console.error('Add semester DB error:', e);
    return null;
  }
}

export async function updateSemesterInDB(semester: any) {
  const userId = await getUserId();
  if (!userId || !semester.id || !isDbId(semester.id)) return;

  try {
    await supabase.from('user_semesters').update({
      name: semester.name,
      courses: semester.courses || [],
      updated_at: semester.updatedAt || new Date().toISOString(),
    }).eq('id', semester.id).eq('user_id', userId);
  } catch (e) {
    console.error('Update semester DB error:', e);
  }
}

export async function deleteSemesterFromDB(id: string) {
  const userId = await getUserId();
  if (!userId || !isDbId(id)) return;
  try {
    await supabase.from('user_semesters').update({ deleted_at: new Date().toISOString() }).eq('id', id).eq('user_id', userId);
  } catch (e) {
    console.error('Delete semester DB error:', e);
  }
}

// ── Focus Sessions Sync ──

export async function syncFocusSessionsFromDB(): Promise<any[]> {
  const userId = await getUserId();
  if (!userId) return Storage.getFocusSessions();

  try {
    const { data, error } = await supabase
      .from('user_focus_sessions')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch focus sessions from DB:', error);
      return Storage.getFocusSessions();
    }

    const remoteSessions = (data || []).map(s => ({
      id: s.id,
      date: s.date,
      duration: s.duration,
      createdAt: s.created_at,
    }));

    const localSessions = Storage.getFocusSessions();

    if (remoteSessions.length === 0 && localSessions.length === 0) {
      Storage.setFocusSessions([]);
      return [];
    }

    if (remoteSessions.length === 0 && localSessions.length > 0) {
      const hasLocalOnly = localSessions.some((s: any) => String(s.id).includes('_'));
      if (!hasLocalOnly) {
        Storage.setFocusSessions([]);
        return [];
      }
      for (const s of localSessions) {
        const dbId = await addFocusSessionToDB(s);
        if (dbId) s.id = dbId;
      }
      Storage.setFocusSessions(localSessions);
      return localSessions;
    }

    // For sessions, we do a simple union — no LWW needed since sessions are append-only
    const remoteIdSet = new Set(remoteSessions.map(s => String(s.id)));
    const localOnly = localSessions.filter((s: any) => String(s.id).includes('_'));

    // Upload local-only sessions to DB
    for (const s of localOnly) {
      const dbId = await addFocusSessionToDB(s);
      if (dbId) s.id = dbId;
    }

    const finalSessions = [...remoteSessions, ...localOnly];
    Storage.setFocusSessions(finalSessions);
    return finalSessions;
  } catch (e) {
    console.error('Focus sessions sync error:', e);
    return Storage.getFocusSessions();
  }
}

export async function addFocusSessionToDB(session: any): Promise<string | null> {
  const userId = await getUserId();
  if (!userId) return null;

  try {
    const { data, error } = await supabase.from('user_focus_sessions').insert({
      user_id: userId,
      date: session.date,
      duration: session.duration,
    }).select('id').single();

    if (error) console.error('Failed to add focus session to DB:', error);
    return data?.id ?? null;
  } catch (e) {
    console.error('Add focus session DB error:', e);
    return null;
  }
}
