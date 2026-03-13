import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, X, Send, Loader2, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Storage from '@/lib/storage';
import { deleteExamFromDB, deleteTransactionFromDB, deleteDebtFromDB, addExamToDB, addTransactionToDB, addDebtToDB, addPeriodToDB, settleDebtInDB, deletePeriodFromDB, updateExamInDB } from '@/lib/dbSync';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/hooks/useI18n';
import { toast } from '@/hooks/use-toast';
import type { TranslationKey } from '@/lib/i18n';
import { formatTime12h } from '@/lib/helpers';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ToolCall {
  function: {
    name: string;
    arguments: string;
  };
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;

function buildContext() {
  try {
    const tasks = Storage.getTasks().filter((t: any) => t.status !== 'done').slice(0, 20);
    const exams = Storage.getExams().slice(0, 15);
    const routine = Storage.getRoutine();
    const transactions = Storage.getTransactions().slice(-10);
    const notes = Storage.getNotes().slice(0, 10);
    const debts = Storage.getDebts().filter((d: any) => !d.settled);
    const routineSummary: Record<string, number> = {};
    for (const [day, periods] of Object.entries(routine)) {
      routineSummary[day] = (periods as any[]).length;
    }
    return {
      taskCount: tasks.length,
      tasks: tasks.map((t: any) => ({ id: t.id, title: t.title, date: t.date, priority: t.priority, status: t.status })),
      examCount: exams.length,
      exams: exams.map((e: any) => ({ id: e.id, subject: e.subject, date: e.date, time: e.time })),
      routineSummary,
      transactionCount: transactions.length,
      recentTransactions: transactions.map((t: any) => ({ id: t.id, description: t.description, amount: t.amount, type: t.type })),
      noteCount: notes.length,
      notes: notes.map((n: any) => ({ id: n.id, title: n.title, preview: n.content?.slice(0, 50) })),
      debtCount: debts.length,
      debts: debts.map((d: any) => ({ id: d.id, person: d.person, amount: d.amount, debtType: d.debtType || d.debt_type, description: d.description })),
    };
  } catch {
    return {};
  }
}

async function executeToolCall(toolCall: ToolCall): Promise<string> {
  try {
    const args = JSON.parse(toolCall.function.arguments);

    if (toolCall.function.name === 'add_entry') {
      const { section } = args;

      if (section === 'task') {
        Storage.addTask({
          title: args.title || 'Untitled task',
          date: args.date || '',
          time: args.time || '',
          priority: args.priority || 'medium',
          status: 'todo',
        });
        const hype = ['Locked in! 🔥', 'On it, boss! 💪', 'Added, let\'s get it! ⚡', 'Done! You\'re being productive fr 🫡'][Math.floor(Math.random() * 4)];
        return `${hype} Task **"${args.title}"** added${args.date ? ` for ${args.date}` : ''}. Now go crush it!`;
      }

      if (section === 'exam') {
        const examData = {
          subject: args.subject || 'Untitled',
          date: args.date || new Date().toISOString().split('T')[0],
          time: args.time || '09:00',
          room: args.room || '',
          teacher: args.teacher || '',
          credits: args.credits || 3,
          type: args.examType || 'exams',
          grade: '',
        };
        const localId = Storage.addExam(examData);
        addExamToDB(examData).then((dbId) => {
          if (dbId && localId) {
            const exams = Storage.getExams().map((e: any) => e.id === localId ? { ...e, id: dbId } : e);
            Storage.setExams(exams);
          }
        }).catch(() => {});
        const quips = ['Another exam? Your semester is built different 💀', 'Noted! Time to lock in and study 📚', 'Added! May the curve be in your favor 🙏', 'Exam tracked! You got this fr 🫡'][Math.floor(Math.random() * 4)];
        return `${quips} **${args.subject}** exam on **${args.date || 'today'}** — don't forget to actually study!`;
      }

      if (section === 'routine') {
        if (!args.day || !args.subject || !args.startTime || !args.endTime) {
          return '😅 I need the **day**, **subject**, **startTime**, and **endTime** to set up your routine!';
        }
        const periodData = {
          subject: args.subject,
          startTime: args.startTime,
          endTime: args.endTime,
          room: args.room || '',
        };
        const localId = Storage.addPeriod(args.day, periodData);
        addPeriodToDB(args.day, periodData).then((dbId) => {
          if (dbId && localId) {
            const routine = Storage.getRoutine();
            routine[args.day] = (routine[args.day] || []).map((p: any) => p.id === localId ? { ...p, id: dbId } : p);
            Storage.setRoutine(routine);
          }
        }).catch(() => {});
        return `📅 **${args.subject}** locked in for **${args.day}** (${formatTime12h(args.startTime)}-${formatTime12h(args.endTime)}). Consistency is key! 🔑`;
      }

      if (section === 'transaction') {
        if (!args.description || !args.amount) {
          return '😅 I need at least a **description** and **amount** for the transaction!';
        }
        const txnData = {
          description: args.description,
          amount: Math.abs(args.amount),
          type: args.transactionType || 'expense',
        };
        const localTxnId = Storage.addTransaction(txnData);
        addTransactionToDB(txnData).then((dbId) => {
          if (dbId && localTxnId) {
            const txns = Storage.getTransactions().map((t: any) => t.id === localTxnId ? { ...t, id: dbId } : t);
            Storage.setTransactions(txns);
          }
        }).catch(() => {});
        const type = args.transactionType || 'expense';
        const quips = type === 'income'
          ? ['Money coming in! 💰', 'Cha-ching! 🤑', 'Securing the bag! 💼'][Math.floor(Math.random() * 3)]
          : ['RIP wallet 💸', 'And it\'s gone... 🫠', 'Your wallet felt that 😬'][Math.floor(Math.random() * 3)];
        return `${quips} **${type === 'income' ? '+' : '-'}${args.amount}** for **${args.description}** recorded!`;
      }

      if (section === 'note') {
        if (!args.title && !args.content) {
          return '😅 I need at least a **title** or some **content** for the note!';
        }
        Storage.addNote({
          title: args.title || 'Untitled Note',
          content: args.content || '',
        });
        const quips = ['Noted! 📝', 'Written down before you forget! 🧠', 'Saved for future you! 📌'][Math.floor(Math.random() * 3)];
        return `${quips} Note **"${args.title || 'Untitled'}"** saved.`;
      }

      if (section === 'debt') {
        if (!args.person || !args.amount) {
          return '😅 I need at least a **person** name and **amount** for the lend/borrow entry!';
        }
        const debtType = args.debtType || 'lend';
        const debtData = {
          person: args.person,
          amount: Math.abs(args.amount),
          debtType: debtType,
          debt_type: debtType,
          description: args.description || '',
        };
        const localDebtId = Storage.addDebt(debtData);
        addDebtToDB({ ...debtData, debtType }).then((dbId) => {
          if (dbId && localDebtId) {
            const debts = Storage.getDebts().map((d: any) => d.id === localDebtId ? { ...d, id: dbId } : d);
            Storage.setDebts(debts);
          }
        }).catch(() => {});
        const quips = debtType === 'lend'
          ? ['You just became a bank lol 🏦', 'Generous era activated 👑', 'Hope they remember this favor fr 🤞', 'Your wallet is crying rn 😭'][Math.floor(Math.random() * 4)]
          : ['Adding this to the "pay back someday" list 😬', 'Oof, the debt arc begins 💀', 'Noted! Don\'t ghost them about this one 👀', 'You owe money now bestie, no forgetting 🫣'][Math.floor(Math.random() * 4)];
        return `${quips}\n\n**${debtType === 'lend' ? '💸 Lent' : '🤲 Borrowed'} ৳${args.amount}** ${debtType === 'lend' ? 'to' : 'from'} **${args.person}**${args.description ? ` — _${args.description}_` : ''}`;
      }

      return '🤔 Hmm, not sure where to put that. Try specifying **task**, **exam**, **routine**, **transaction**, **debt**, or **note**!';
    }

    if (toolCall.function.name === 'query_data') {
      const { section, filter } = args;
      const filterLower = (filter || '').toLowerCase();

      if (section === 'tasks' || section === 'all') {
        let tasks = Storage.getTasks();
        if (filterLower.includes('today')) {
          const today = new Date().toISOString().split('T')[0];
          tasks = tasks.filter((t: any) => t.date === today);
        }
        if (filterLower.includes('high')) {
          tasks = tasks.filter((t: any) => t.priority === 'high');
        }
        if (filterLower.includes('done')) {
          tasks = tasks.filter((t: any) => t.status === 'done');
        } else {
          tasks = tasks.filter((t: any) => t.status !== 'done');
        }
        const summary = tasks.slice(0, 10).map((t: any) =>
          `- **${t.title}**${t.date ? ` · ${t.date}` : ''} · _${t.priority || 'medium'}_ · ${t.status}`
        ).join('\n');
        if (tasks.length === 0) return '✨ Your task list is squeaky clean! Either you\'re super productive or in denial 😄';
        return `📋 **${tasks.length} task${tasks.length > 1 ? 's' : ''}** on deck:\n\n${summary}`;
      }

      if (section === 'exams' || section === 'all') {
        let exams = Storage.getExams();
        if (filterLower) {
          const now = new Date();
          if (filterLower.includes('this month')) {
            const y = now.getFullYear();
            const m = String(now.getMonth() + 1).padStart(2, '0');
            exams = exams.filter((e: any) => e.date?.startsWith(`${y}-${m}`));
          } else if (filterLower.includes('next month')) {
            const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            const y = next.getFullYear();
            const m = String(next.getMonth() + 1).padStart(2, '0');
            exams = exams.filter((e: any) => e.date?.startsWith(`${y}-${m}`));
          } else if (filterLower.includes('this week')) {
            const today = now.toISOString().split('T')[0];
            const weekEnd = new Date(now);
            weekEnd.setDate(weekEnd.getDate() + (7 - weekEnd.getDay()));
            const end = weekEnd.toISOString().split('T')[0];
            exams = exams.filter((e: any) => e.date >= today && e.date <= end);
          } else if (filterLower.includes('today')) {
            const today = now.toISOString().split('T')[0];
            exams = exams.filter((e: any) => e.date === today);
          } else if (filterLower.includes('tomorrow')) {
            const tmr = new Date(now);
            tmr.setDate(tmr.getDate() + 1);
            const tmrStr = tmr.toISOString().split('T')[0];
            exams = exams.filter((e: any) => e.date === tmrStr);
          } else if (filterLower.includes('upcoming') || filterLower.includes('future')) {
            const today = now.toISOString().split('T')[0];
            exams = exams.filter((e: any) => e.date >= today);
          } else {
            exams = exams.filter((e: any) =>
              e.subject?.toLowerCase().includes(filterLower) || e.date?.includes(filterLower)
            );
          }
        }
        const summary = exams.slice(0, 10).map((e: any) =>
          `- **${e.subject}** · ${e.date} ${e.time || ''}`
        ).join('\n');
        if (exams.length === 0) return '🎉 No exams found! Either you\'re done or haven\'t added them yet… 👀';
        return `📝 **${exams.length} exam${exams.length > 1 ? 's' : ''}** coming up:\n\n${summary}\n\nTime to hit the books! 📖`;
      }

      if (section === 'routine') {
        const routine = Storage.getRoutine();
        const dayFilter = filterLower;
        const days = dayFilter && routine[dayFilter] ? [dayFilter] : Object.keys(routine);
        let summary = '';
        for (const day of days) {
          const periods = routine[day] || [];
          if (periods.length > 0) {
            summary += `**${day.charAt(0).toUpperCase() + day.slice(1)}**\n${periods.map((p: any) => `- ${p.subject} · ${p.startTime}–${p.endTime}`).join('\n')}\n\n`;
          }
        }
        if (!summary) return '🗓️ Your routine is emptier than a lecture hall on Friday afternoon! Add some classes?';
        return `🗓️ **Your routine:**\n\n${summary}Stay consistent! 💯`;
      }

      if (section === 'transactions' || section === 'all') {
        let txns = Storage.getTransactions();
        if (filterLower.includes('income')) {
          txns = txns.filter((t: any) => t.type === 'income');
        } else if (filterLower.includes('expense')) {
          txns = txns.filter((t: any) => t.type === 'expense');
        }
        const recent = txns.slice(-10).reverse();
        const summary = recent.map((t: any) =>
          `- ${t.type === 'income' ? '💚' : '🔴'} **${t.description}** → ${t.type === 'income' ? '+' : '-'}${t.amount}`
        ).join('\n');
        if (txns.length === 0) return '💰 No transactions yet! Your wallet is a mystery to me 👀';
        const totalIncome = txns.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + Number(t.amount), 0);
        const totalExpense = txns.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + Number(t.amount), 0);
        return `💰 **${txns.length} transaction${txns.length > 1 ? 's' : ''}**\n\n> Income: **+${totalIncome}** · Expenses: **-${totalExpense}** · Net: **${totalIncome - totalExpense}**\n\n${summary}`;
      }

      if (section === 'notes' || section === 'all') {
        let notes = Storage.getNotes();
        if (filterLower) {
          notes = notes.filter((n: any) =>
            n.title?.toLowerCase().includes(filterLower) || n.content?.toLowerCase().includes(filterLower)
          );
        }
        const summary = notes.slice(0, 10).map((n: any) =>
          `- **${n.title}**${n.content ? ` — _${n.content.slice(0, 40)}${n.content.length > 40 ? '…' : ''}_` : ''}`
        ).join('\n');
        if (notes.length === 0) return '📝 No notes found! Your brain is either empty or you haven\'t written things down yet 😄';
        return `📝 **${notes.length} note${notes.length > 1 ? 's' : ''}:**\n\n${summary}`;
      }

      if (section === 'debts' || section === 'all') {
        let debts = Storage.getDebts().filter((d: any) => !d.settled);
        if (filterLower) {
          debts = debts.filter((d: any) =>
            d.person?.toLowerCase().includes(filterLower) || d.description?.toLowerCase().includes(filterLower)
          );
        }
        if (debts.length === 0) return '✨ No outstanding debts! You\'re either debt-free or haven\'t tracked any yet 🎉';

        // Group by person and calculate net
        const byPerson: Record<string, { lent: number; borrowed: number; count: number }> = {};
        for (const d of debts) {
          const name = d.person || 'Unknown';
          if (!byPerson[name]) byPerson[name] = { lent: 0, borrowed: 0, count: 0 };
          byPerson[name].count++;
          const dtype = d.debtType || d.debt_type || 'lend';
          if (dtype === 'lend') byPerson[name].lent += Number(d.amount);
          else byPerson[name].borrowed += Number(d.amount);
        }

        const summary = Object.entries(byPerson).map(([person, { lent, borrowed }]) => {
          const net = lent - borrowed;
          if (net > 0) return `- 🟢 **${person}** owes you **${net}**${lent && borrowed ? ` _(lent ${lent}, borrowed ${borrowed})_` : ''}`;
          if (net < 0) return `- 🔴 You owe **${person}** **${Math.abs(net)}**${lent && borrowed ? ` _(lent ${lent}, borrowed ${borrowed})_` : ''}`;
          return `- ⚪ **${person}** — settled up! _(lent ${lent}, borrowed ${borrowed})_`;
        }).join('\n');

        const totalLent = Object.values(byPerson).reduce((s, p) => s + p.lent, 0);
        const totalBorrowed = Object.values(byPerson).reduce((s, p) => s + p.borrowed, 0);
        const net = totalLent - totalBorrowed;
        const netLabel = net > 0 ? `You're owed **${net}** overall 💪` : net < 0 ? `You owe **${Math.abs(net)}** overall 😬` : `All square! 🤝`;

        return `🤝 **${Object.keys(byPerson).length} person${Object.keys(byPerson).length > 1 ? 's' : ''}** · ${debts.length} entries\n\n> Lent: **${totalLent}** · Borrowed: **${totalBorrowed}** · ${netLabel}\n\n${summary}`;
      }

      return '🤷 Not sure what to look up. Try asking about **tasks**, **exams**, **routine**, **transactions**, **debts**, or **notes**!';
    }

    if (toolCall.function.name === 'delete_entry') {
      const { section, identifier } = args;
      if (!identifier) return '😅 I need to know **which** entry to delete. Give me a name, subject, or title!';

      const idLower = identifier.toLowerCase();

      if (section === 'task') {
        const tasks = Storage.getTasks();
        const matches = idLower === 'all' ? tasks : tasks.filter((t: any) => t.title?.toLowerCase().includes(idLower));
        if (matches.length === 0) return `🤔 Couldn't find any task matching **"${identifier}"**.`;
        matches.forEach((m: any) => Storage.deleteTask(m.id));
        return `🗑️ Deleted **${matches.length}** task${matches.length > 1 ? 's' : ''}${matches.length === 1 ? ` — "${matches[0].title}"` : ''}.`;
      }

      if (section === 'exam') {
        const exams = Storage.getExams();
        let matches: any[];
        if (idLower === 'all') {
          matches = exams;
        } else if (idLower.includes('this month')) {
          const now = new Date();
          const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          matches = exams.filter((e: any) => e.date?.startsWith(prefix));
        } else {
          matches = exams.filter((e: any) => e.subject?.toLowerCase().includes(idLower));
        }
        if (matches.length === 0) return `🤔 Couldn't find any exam matching **"${identifier}"**.`;
        for (const m of matches) { Storage.deleteExam(m.id); await deleteExamFromDB(m.id); }
        return `🗑️ Deleted **${matches.length}** exam${matches.length > 1 ? 's' : ''}${matches.length === 1 ? ` — "${matches[0].subject}" (${matches[0].date})` : ''}.`;
      }

      if (section === 'transaction') {
        const txns = Storage.getTransactions();
        const matches = idLower === 'all' ? txns : txns.filter((t: any) => t.description?.toLowerCase().includes(idLower));
        if (matches.length === 0) return `🤔 Couldn't find any transaction matching **"${identifier}"**.`;
        for (const m of matches) { Storage.deleteTransaction(m.id); await deleteTransactionFromDB(m.id); }
        return `🗑️ Deleted **${matches.length}** transaction${matches.length > 1 ? 's' : ''}.`;
      }

      if (section === 'note') {
        const notes = Storage.getNotes();
        const matches = idLower === 'all' ? notes : notes.filter((n: any) => n.title?.toLowerCase().includes(idLower));
        if (matches.length === 0) return `🤔 Couldn't find any note matching **"${identifier}"**.`;
        matches.forEach((m: any) => Storage.deleteNote(m.id));
        return `🗑️ Deleted **${matches.length}** note${matches.length > 1 ? 's' : ''}.`;
      }

      if (section === 'routine') {
        const routine = Storage.getRoutine();
        const day = args.day?.toLowerCase();
        let totalDeleted = 0;
        if (idLower === 'all') {
          if (day && routine[day]) {
            const periods = routine[day];
            totalDeleted = periods.length;
            for (const p of periods) { deletePeriodFromDB(p.id).catch(() => {}); }
            routine[day] = [];
          } else {
            for (const d of Object.keys(routine)) {
              for (const p of routine[d]) { deletePeriodFromDB(p.id).catch(() => {}); }
              totalDeleted += routine[d].length;
              routine[d] = [];
            }
          }
          Storage.setRoutine(routine);
          if (totalDeleted === 0) return '🤔 No routine periods to delete!';
          return `🗑️ Cleared **${totalDeleted}** routine period${totalDeleted > 1 ? 's' : ''}${day ? ` from **${day}**` : ''}.`;
        }
        // Match by subject
        const daysToSearch = day ? [day] : Object.keys(routine);
        for (const d of daysToSearch) {
          const periods = routine[d] || [];
          const matches = periods.filter((p: any) => p.subject?.toLowerCase().includes(idLower));
          for (const m of matches) { deletePeriodFromDB(m.id).catch(() => {}); }
          totalDeleted += matches.length;
          routine[d] = periods.filter((p: any) => !p.subject?.toLowerCase().includes(idLower));
        }
        Storage.setRoutine(routine);
        if (totalDeleted === 0) return `🤔 Couldn't find any routine period matching **"${identifier}"**.`;
        return `🗑️ Deleted **${totalDeleted}** routine period${totalDeleted > 1 ? 's' : ''} for **${identifier}**.`;
      }

      if (section === 'debt') {
        const debts = Storage.getDebts();
        const matches = idLower === 'all' ? debts : debts.filter((d: any) => d.person?.toLowerCase().includes(idLower));
        if (matches.length === 0) return `🤔 Couldn't find any debt entry for **"${identifier}"**.`;
        for (const m of matches) { Storage.deleteDebt(m.id); await deleteDebtFromDB(m.id); }
        return `🗑️ Deleted **${matches.length}** debt entr${matches.length > 1 ? 'ies' : 'y'}.`;
      }

      return '🤔 Not sure what section to delete from. Try specifying **task**, **exam**, **routine**, **transaction**, **debt**, or **note**!';
    }

    if (toolCall.function.name === 'update_entry') {
      const { section, identifier } = args;
      if (!identifier) return '😅 I need to know **which** entry to update. Give me a name or title!';
      const idLower = identifier.toLowerCase();

      if (section === 'task') {
        const tasks = Storage.getTasks();
        const matches = tasks.filter((t: any) => t.title?.toLowerCase().includes(idLower));
        if (matches.length === 0) return `🤔 Couldn't find any task matching **"${identifier}"**.`;
        const newStatus = args.status || 'done';
        matches.forEach((m: any) => Storage.updateTask(m.id, { status: newStatus }));
        const statusEmoji = newStatus === 'done' ? '✅' : newStatus === 'in-progress' ? '⚡' : '📋';
        const quips = newStatus === 'done'
          ? ['Task crushed! 🔥', 'Look at you being productive! 💪', 'Another one bites the dust! ✨', 'W moment fr 🏆'][Math.floor(Math.random() * 4)]
          : newStatus === 'in-progress'
          ? ['Let\'s get to work! ⚡', 'Grinding mode activated 🎯', 'On it! 💨'][Math.floor(Math.random() * 3)]
          : ['Back to the drawing board 📋', 'Reopened! Round 2 🔄'][Math.floor(Math.random() * 2)];
        return `${quips} ${statusEmoji} **${matches.length}** task${matches.length > 1 ? 's' : ''} moved to **${newStatus}**${matches.length === 1 ? ` — "${matches[0].title}"` : ''}.`;
      }

      if (section === 'note') {
        const notes = Storage.getNotes();
        const matches = notes.filter((n: any) => n.title?.toLowerCase().includes(idLower));
        if (matches.length === 0) return `🤔 Couldn't find any note matching **"${identifier}"**.`;
        const target = matches[0];
        const updates: any = {};
        if (args.title) updates.title = args.title;
        if (args.content) updates.content = args.content;
        if (Object.keys(updates).length === 0) return '😅 Nothing to update! Tell me what to change — **title** or **content**?';
        Storage.updateNote(target.id, updates);
        return `✏️ Note **"${target.title}"** updated!${args.title ? ` New title: **${args.title}**` : ''}${args.content ? ' Content updated.' : ''}`;
      }

      if (section === 'exam') {
        const exams = Storage.getExams();
        const matches = exams.filter((e: any) => e.subject?.toLowerCase().includes(idLower));
        if (matches.length === 0) return `🤔 Couldn't find any exam matching **"${identifier}"**.`;
        const target = matches[0];
        const updates: any = {};
        if (args.subject) updates.subject = args.subject;
        if (args.date) updates.date = args.date;
        if (args.time) updates.time = args.time;
        if (args.room) updates.room = args.room;
        if (args.teacher) updates.teacher = args.teacher;
        if (Object.keys(updates).length === 0) return '😅 Nothing to update! Tell me what to change.';
        Storage.updateExam({ ...target, ...updates });
        updateExamInDB({ ...target, ...updates }).catch(() => {});
        const changes = Object.entries(updates).map(([k, v]) => `**${k}**: ${v}`).join(', ');
        return `✏️ Exam **"${target.subject}"** updated! ${changes}`;
      }

      return '🤔 I can update **tasks**, **notes**, and **exams**. Which one?';
    }

    if (toolCall.function.name === 'settle_debt') {
      const { person } = args;
      if (!person) return '😅 I need to know **whose** debt to settle!';

      const personLower = person.toLowerCase();
      const debts = Storage.getDebts();
      const matches = personLower === 'all'
        ? debts.filter((d: any) => !d.settled)
        : debts.filter((d: any) => !d.settled && d.person?.toLowerCase().includes(personLower));

      if (matches.length === 0) return `🤔 No unsettled debts found for **"${person}"**.`;

      for (const m of matches) {
        Storage.settleDebt(m.id);
        await settleDebtInDB(m.id);
      }

      const totalAmount = matches.reduce((s: number, d: any) => s + (Number(d.amount) || 0), 0);
      const quips = ['Debt-free era! 🎉', 'Clean slate! ✨', 'That\'s what we like to see! 🤝', 'Money matters handled! 💯'][Math.floor(Math.random() * 4)];
      return `${quips} Settled **${matches.length}** debt${matches.length > 1 ? 's' : ''} with **${matches[0]?.person || person}** (total: ৳${totalAmount}).`;
    }

    return '🤔 Hmm, that one went over my head. Try again?';
  } catch (e) {
    console.error('Tool execution error:', e);
    return '😅 Something went wrong on my end. Mind trying that again?';
  }
}

interface AIChatFABProps {
  onDataChanged?: () => void;
  currentPage?: string;
}

const AI_RATE_LIMIT = 15; // max messages per minute
const AI_RATE_WINDOW = 60_000; // 1 minute in ms

const AIChatFAB = ({ onDataChanged, currentPage }: AIChatFABProps) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sendTimestamps = useRef<number[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const cancelRequest = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-close chatbox when navigating to a different section
  useEffect(() => {
    if (open) setOpen(false);
  }, [currentPage]);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    // Client-side rate limiting
    const now = Date.now();
    sendTimestamps.current = sendTimestamps.current.filter(ts => now - ts < AI_RATE_WINDOW);
    if (sendTimestamps.current.length >= AI_RATE_LIMIT) {
      toast({ title: 'Slow down! ⏳', description: 'Too many messages. Wait a moment before sending again.', variant: 'destructive' });
      return;
    }
    sendTimestamps.current.push(now);

    const userMsg: Message = { role: 'user', content: text };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput('');
    setLoading(true);

    try {
      const customKey = sessionStorage.getItem('gbd_gemini_api_key') || '';
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      // Add timeout to prevent infinite loading
      const controller = new AbortController();
      abortRef.current = controller;
      const timeout = setTimeout(() => controller.abort(), 45000); // 45s timeout
      
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messages: allMessages.map(m => ({ role: m.role, content: m.content })),
          context: buildContext(),
          ...(customKey ? { geminiApiKey: customKey } : {}),
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeout);

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        const errMsg = err.error || `Error ${resp.status}`;
        if (resp.status === 429) {
          toast({ title: 'Too many requests ⏳', description: 'AI is busy. Wait a few seconds and try again.', variant: 'destructive' });
        } else if (resp.status === 402) {
          toast({ title: 'Usage limit reached', description: 'AI credits exhausted. Try again later.', variant: 'destructive' });
        } else if (resp.status === 503) {
          toast({ title: 'AI unavailable', description: 'Service is temporarily down. Try again shortly.', variant: 'destructive' });
        } else {
          toast({ title: 'AI Error', description: errMsg, variant: 'destructive' });
        }
        setLoading(false);
        abortRef.current = null;
        return;
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantContent = '';
      let pendingToolCalls: ToolCall[] = [];
      let toolCallBuffer: Record<number, { name: string; args: string }> = {};

      const updateAssistant = (content: string) => {
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content } : m);
          }
          return [...prev, { role: 'assistant', content }];
        });
      };

      // Read stream with a per-chunk timeout to prevent infinite hanging
      const readWithTimeout = async () => {
        return Promise.race([
          reader.read(),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Stream timeout')), 30000)),
        ]);
      };

      while (true) {
        const { done, value } = await readWithTimeout();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta;
            if (!delta) continue;

            // Handle text content
            if (delta.content) {
              assistantContent += delta.content;
              updateAssistant(assistantContent);
            }

            // Handle tool calls
            if (delta.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0;
                if (!toolCallBuffer[idx]) {
                  toolCallBuffer[idx] = { name: '', args: '' };
                }
                if (tc.function?.name) {
                  toolCallBuffer[idx].name = tc.function.name;
                }
                if (tc.function?.arguments) {
                  toolCallBuffer[idx].args += tc.function.arguments;
                }
              }
            }

            // Check finish reason
            const finishReason = parsed.choices?.[0]?.finish_reason;
            if (finishReason === 'tool_calls') {
              for (const [, tc] of Object.entries(toolCallBuffer)) {
                pendingToolCalls.push({
                  function: { name: tc.name, arguments: tc.args },
                });
              }
            }
          } catch {
            // partial JSON, skip
          }
        }
      }

      // Execute tool calls if any
      if (pendingToolCalls.length > 0) {
        const results: string[] = [];
        for (const tc of pendingToolCalls) {
          const result = await executeToolCall(tc);
          results.push(result);
        }
        const toolResultText = (assistantContent ? assistantContent + '\n\n' : '') + results.join('\n\n');
        updateAssistant(toolResultText);

        // Notify parent that data changed — always trigger after any tool execution
        if (onDataChanged) {
          setTimeout(() => onDataChanged(), 800);
        }
      } else if (!assistantContent) {
        updateAssistant("I couldn't process that. Try something like: *Add a task to study Math tomorrow*");
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        // User cancelled or timeout — don't show error toast
        console.log('AI request aborted');
      } else {
        console.error('AI chat error:', e);
        toast({ title: 'Connection Error', description: 'Could not reach AI assistant. Check your connection and try again.', variant: 'destructive' });
      }
    }

    abortRef.current = null;
    setLoading(false);
  }, [input, messages, loading, onDataChanged]);

  return (
    <>
      {/* FAB */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(263 70% 66%))',
            color: 'hsl(var(--primary-foreground))',
          }}
          aria-label="Open AI Assistant"
        >
          <Bot className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      )}

      {/* Backdrop — only on desktop (mobile chat is fullscreen) */}
      {open && (
        <div className="hidden sm:block fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}

      {/* Chat Panel — fullscreen on mobile, floating panel on sm+ */}
      {open && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-5 sm:right-5 sm:w-[380px] sm:max-h-[70vh] flex flex-col sm:rounded-2xl shadow-2xl overflow-hidden"
          style={{ background: 'hsl(var(--background))', border: 'none', zIndex: 1100 }}>
          {/* Outer border only on desktop */}
          <div className="hidden sm:block absolute inset-0 rounded-2xl pointer-events-none" style={{ border: '1px solid hsl(var(--border))' }} />
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 sm:py-3 shrink-0"
            style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(263 70% 66%))', color: 'hsl(var(--primary-foreground))' }}>
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <span className="font-bold text-sm">GBD Assistant</span>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button onClick={() => setMessages([])} className="p-1.5 rounded-full hover:bg-white/20 transition-colors" title="Clear chat">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-full hover:bg-white/20 transition-colors">
                <X className="w-5 h-5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 sm:min-h-[200px] sm:max-h-[50vh]">
            {messages.length === 0 && (
              <div className="text-center py-8 sm:py-8">
                <Bot className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground font-medium">Hey there! I'm your GBD Assistant 👋</p>
                <p className="text-xs text-muted-foreground/70 mt-1 italic">Crafted with care by Zisan to keep you on track</p>
                <p className="text-xs text-muted-foreground/60 mt-3">Try something like:</p>
                <p className="text-xs text-muted-foreground/70">"Spent 200 on coffee ☕"</p>
                <p className="text-xs text-muted-foreground/70">"Add exam Physics on March 20"</p>
                <p className="text-xs text-muted-foreground/70">"What tasks do I have today?"</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'rounded-br-md'
                    : 'rounded-bl-md'
                }`}
                  style={msg.role === 'user'
                    ? { background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }
                    : { background: 'hsl(var(--muted))' }
                  }>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>p+p]:mt-1.5 [&>ul]:my-1 [&>ul]:pl-4 [&>ol]:my-1 [&>ol]:pl-4 [&_li]:my-0.5 [&_blockquote]:my-1.5 [&_blockquote]:px-2.5 [&_blockquote]:py-1 [&_blockquote]:rounded-lg [&_blockquote]:text-xs [&_blockquote]:not-italic [&_blockquote]:border-primary/30 [&_blockquote]:bg-primary/5">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <span>{msg.content}</span>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md px-3 py-2" style={{ background: 'hsl(var(--muted))' }}>
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          {/* Input — safe area padding on mobile for bottom notch */}
          <div className="p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-3 shrink-0" style={{ borderTop: '1px solid hsl(var(--border))' }}>
            <form onSubmit={e => { e.preventDefault(); send(); }} className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={t('ai.placeholder' as TranslationKey) || 'Type a command...'}
                className="flex-1 text-sm rounded-xl px-3 py-2.5 outline-none transition-colors"
                style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))' }}
                disabled={loading}
                maxLength={500}
              />
              {loading ? (
                <button
                  type="button"
                  onClick={cancelRequest}
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all"
                  style={{ background: 'hsl(var(--destructive))', color: 'hsl(var(--destructive-foreground))' }}
                  title="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
                  style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatFAB;
