/**
 * Database sync for exams, routine, transactions, and debts data.
 * Reads/writes to Supabase with localStorage as a fast cache.
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

// Listen for auth changes to reset cached user id
supabase.auth.onAuthStateChange((_event, session) => {
  currentUserId = session?.user?.id ?? null;
});

// ── Exams Sync ──

export async function syncExamsFromDB(): Promise<any[]> {
  const userId = await getUserId();
  if (!userId) return Storage.getExams();

  try {
    const { data, error } = await supabase
      .from('user_exams')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true });

    if (error) {
      console.error('Failed to fetch exams from DB:', error);
      return Storage.getExams();
    }

    if (data && data.length > 0) {
      // Map DB format to app format
      const exams = data.map(e => ({
        id: e.id,
        subject: e.subject,
        date: e.date,
        time: e.time,
        grade: e.grade,
        credits: e.credits,
        teacher: e.teacher,
        room: e.room,
        type: e.type,
      }));
      Storage.setExams(exams);
      return exams;
    }

    // If DB is empty but local has data, push local to DB (first-time migration)
    const localExams = Storage.getExams();
    if (localExams.length > 0) {
      await pushExamsToDB(localExams, userId);
    }
    return localExams;
  } catch (e) {
    console.error('Exam sync error:', e);
    return Storage.getExams();
  }
}

async function pushExamsToDB(exams: any[], userId: string) {
  for (const exam of exams) {
    await supabase.from('user_exams').upsert({
      id: exam.id?.includes('_') ? undefined : exam.id, // skip local IDs
      user_id: userId,
      subject: exam.subject,
      date: exam.date,
      time: exam.time || '09:00',
      grade: exam.grade || '',
      credits: exam.credits || 3,
      teacher: exam.teacher || '',
      room: exam.room || '',
      type: exam.type || 'exams',
    });
  }
}

export async function addExamToDB(exam: any): Promise<string | null> {
  const userId = await getUserId();
  if (!userId) return null;

  try {
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
      updated_at: new Date().toISOString(),
    }).eq('id', exam.id).eq('user_id', userId);
  } catch (e) {
    console.error('Update exam DB error:', e);
  }
}

export async function deleteExamFromDB(id: string) {
  const userId = await getUserId();
  if (!userId) return;

  try {
    await supabase.from('user_exams').delete().eq('id', id).eq('user_id', userId);
  } catch (e) {
    console.error('Delete exam DB error:', e);
  }
}

export async function clearExamsInDB(type?: string) {
  const userId = await getUserId();
  if (!userId) return;

  try {
    let query = supabase.from('user_exams').delete().eq('user_id', userId);
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
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to fetch routine from DB:', error);
      return Storage.getRoutine();
    }

    if (data && data.length > 0) {
      const routine: Record<string, any[]> = {
        monday: [], tuesday: [], wednesday: [], thursday: [],
        friday: [], saturday: [], sunday: [],
      };
      for (const r of data) {
        if (routine[r.day]) {
          routine[r.day].push({
            id: r.id,
            subject: r.subject,
            startTime: r.start_time,
            endTime: r.end_time,
            room: r.room,
          });
        }
      }
      // Sort each day by start time
      for (const day of Object.keys(routine)) {
        routine[day].sort((a: any, b: any) => (a.startTime || '').localeCompare(b.startTime || ''));
      }
      Storage.setRoutine(routine);
      return routine;
    }

    // If DB empty but local has data, push to DB
    const localRoutine = Storage.getRoutine();
    const hasPeriods = Object.values(localRoutine).some(arr => arr.length > 0);
    if (hasPeriods) {
      await pushRoutineToDB(localRoutine, userId);
    }
    return localRoutine;
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
    await supabase.from('user_routine').delete().eq('id', id).eq('user_id', userId);
  } catch (e) {
    console.error('Delete period DB error:', e);
  }
}

export async function clearRoutineInDB() {
  const userId = await getUserId();
  if (!userId) return;

  try {
    await supabase.from('user_routine').delete().eq('user_id', userId);
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
      .order('date', { ascending: true });

    if (error) {
      console.error('Failed to fetch transactions from DB:', error);
      return Storage.getTransactions();
    }

    if (data && data.length > 0) {
      const txns = data.map(t => ({
        id: t.id,
        type: t.type,
        description: t.description,
        amount: Number(t.amount),
        date: t.date,
      }));
      Storage.setTransactions(txns);
      return txns;
    }

    const localTxns = Storage.getTransactions();
    if (localTxns.length > 0) {
      for (const t of localTxns) {
        await supabase.from('user_transactions').insert({
          user_id: userId,
          type: t.type,
          description: t.description,
          amount: t.amount,
          date: t.date || new Date().toISOString(),
        });
      }
    }
    return localTxns;
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
    await supabase.from('user_transactions').delete().eq('id', id).eq('user_id', userId);
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
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch debts from DB:', error);
      return Storage.getDebts();
    }

    if (data && data.length > 0) {
      const debts = data.map(d => ({
        id: d.id,
        debtType: d.debt_type,
        person: d.person,
        amount: Number(d.amount),
        description: d.description,
        date: d.date,
        settled: d.settled,
        settledDate: d.settled_date,
      }));
      Storage.setDebts(debts);
      return debts;
    }

    const localDebts = Storage.getDebts();
    if (localDebts.length > 0) {
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
    }
    return localDebts;
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
    await supabase.from('user_debts').delete().eq('id', id).eq('user_id', userId);
  } catch (e) {
    console.error('Delete debt DB error:', e);
  }
}
