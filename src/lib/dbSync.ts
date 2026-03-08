/**
 * Database sync with LWW (Last-Write-Wins) conflict resolution.
 * Each record carries an `updated_at` / `updatedAt` timestamp.
 * On sync, per-record comparison keeps the newer version.
 * Deletes are soft (sets deleted_at) for recoverability.
 */
import { supabase } from '@/integrations/supabase/client';
import Storage from './storage';

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

    if (remoteExams.length === 0 && localExams.length === 0) return [];

    // First-time migration: local only → push all
    if (remoteExams.length === 0 && localExams.length > 0) {
      await pushExamsToDB(localExams, userId);
      return localExams;
    }

    // LWW merge
    const { merged, toUpload } = lwwMerge(
      localExams.filter(e => !String(e.id).includes('_')), // only DB-assigned IDs
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
  if (!userId || !exam.id) return;

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
  if (!userId) return;
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
      await pushRoutineToDB(localRoutine, userId);
      return localRoutine;
    }

    // Merge per-day using LWW
    const mergedRoutine: Record<string, any[]> = {
      monday: [], tuesday: [], wednesday: [], thursday: [],
      friday: [], saturday: [], sunday: [],
    };

    for (const day of Object.keys(mergedRoutine)) {
      const localPeriods = (localRoutine[day] || []).filter((p: any) => !String(p.id).includes('_'));
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
  if (!userId) return;
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

    if (remoteTxns.length === 0 && localTxns.length === 0) return [];

    if (remoteTxns.length === 0 && localTxns.length > 0) {
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

    // LWW merge
    const localWithDbIds = localTxns.filter(t => !String(t.id).includes('_'));
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
  if (!userId) return;
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

    if (remoteDebts.length === 0 && localDebts.length === 0) return [];

    if (remoteDebts.length === 0 && localDebts.length > 0) {
      for (const d of localDebts) {
        await supabase.from('user_debts').insert({
          user_id: userId,
          debt_type: d.debtType || 'lend',
          person: d.person,
          amount: d.amount,
          description: d.description || '',
          date: d.date || '',
          settled: d.settled || false,
          settled_date: d.settledDate || null,
        });
      }
      return localDebts;
    }

    // LWW merge
    const localWithDbIds = localDebts.filter(d => !String(d.id).includes('_'));
    const localOnly = localDebts.filter(d => String(d.id).includes('_'));

    const { merged, toUpload } = lwwMerge(localWithDbIds, remoteDebts, (d) => d.updatedAt || d.date || '1970-01-01');

    // Push newer local debts to DB
    for (const d of toUpload) {
      await supabase.from('user_debts').update({
        settled: d.settled,
        settled_date: d.settledDate || null,
      }).eq('id', d.id).eq('user_id', userId);
    }

    // Push local-only
    for (const d of localOnly) {
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

    const finalDebts = [...merged, ...localOnly];
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
    const { data, error } = await supabase.from('user_debts').insert({
      user_id: userId,
      debt_type: debt.debtType || 'lend',
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

export async function settleDebtInDB(id: string) {
  const userId = await getUserId();
  if (!userId) return;
  try {
    await supabase.from('user_debts').update({
      settled: true,
      settled_date: new Date().toISOString(),
    }).eq('id', id).eq('user_id', userId);
  } catch (e) {
    console.error('Settle debt DB error:', e);
  }
}

export async function deleteDebtFromDB(id: string) {
  const userId = await getUserId();
  if (!userId) return;
  try {
    await supabase.from('user_debts').update({ deleted_at: new Date().toISOString() }).eq('id', id).eq('user_id', userId);
  } catch (e) {
    console.error('Delete debt DB error:', e);
  }
}
