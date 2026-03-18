import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, X, Send, Loader2, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Storage from '@/lib/storage';
import { deleteExamFromDB, deleteTransactionFromDB, deleteDebtFromDB, settleDebtInDB, deletePeriodFromDB, updateExamInDB } from '@/lib/dbSync';
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
        const hype = [
          'Say less, it\'s on the list now 🔥',
          'Bro woke up and chose productivity 💪',
          'Added! Now put the phone down and actually do it 📱❌',
          'Task locked and loaded, soldier 🫡',
          'Your future self is gonna thank you fr fr ⚡',
          'Added! One step closer to not being a procrastinator 🏃‍♂️',
        ][Math.floor(Math.random() * 6)];
        return `${hype}\n\n📋 **"${args.title}"** added${args.date ? ` for **${args.date}**` : ''}${args.priority === 'high' ? ' ⚠️ _High priority — no excuses!_' : ''}`;
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
        Storage.addExam(examData);
        const quips = [
          'Another exam? Bro your semester is NOT playing around 💀',
          'Exam added! Now close TikTok and open the textbook 📚🫠',
          'Added! May the bell curve gods be in your favor 🙏✨',
          'Exam locked in! You\'re either brave or delusional and I respect both 🫡',
          'RIP your free time, but you got this 🔥',
          'Noted! Start studying now, not the night before... we both know you will tho 💀',
        ][Math.floor(Math.random() * 6)];
        return `${quips}\n\n📝 **${args.subject}** exam on **${args.date || 'today'}**${args.time ? ` at ${formatTime12h(args.time)}` : ''}${args.room ? ` in ${args.room}` : ''}`;
      }

      if (section === 'routine') {
        if (!args.day || !args.subject || !args.startTime || !args.endTime) {
          return '😅 Bestie, I need the **day**, **subject**, **startTime**, and **endTime** to lock in your routine!';
        }
        const periodData = {
          subject: args.subject,
          startTime: args.startTime,
          endTime: args.endTime,
          room: args.room || '',
        };
        Storage.addPeriod(args.day, periodData);
        const quips = [
          'Class scheduled! Now you have no excuse to skip 😤',
          'Your routine just got buffed 💪',
          'Added! Your future organized self is proud rn 🥹',
          'Locked in! Discipline beats motivation every time 🔑',
        ][Math.floor(Math.random() * 4)];
        return `${quips}\n\n📅 **${args.subject}** on **${args.day}** (${formatTime12h(args.startTime)}–${formatTime12h(args.endTime)})${args.room ? ` 📍 ${args.room}` : ''}`;
      }

      if (section === 'transaction') {
        if (!args.description || !args.amount) {
          return '💀 Bro I need at least a **description** and **amount** — I can\'t read your mind (yet)';
        }
        const txnData = {
          description: args.description,
          amount: Math.abs(args.amount),
          type: args.transactionType || 'expense',
        };
        Storage.addTransaction(txnData);
        const type = args.transactionType || 'expense';
        const quips = type === 'income'
          ? [
              'MONEY INCOMING LET\'S GOOO 💰🎉',
              'Cha-ching! The grind is paying off 🤑',
              'Securing the bag like a sigma 💼✨',
              'Income era activated! Keep stacking 📈',
            ][Math.floor(Math.random() * 4)]
          : [
              'RIP wallet, you will be remembered 💸🪦',
              'And it\'s gone... just like your savings 🫠',
              'Your wallet is filing a restraining order 😭',
              'Expense tracked! Your bank account definitely felt that 😬',
              'Another day, another ৳ gone... the broke student life 💀',
            ][Math.floor(Math.random() * 5)];
        return `${quips}\n\n${type === 'income' ? '💚' : '🔴'} **${type === 'income' ? '+' : '-'}৳${args.amount}** — ${args.description}`;
      }

      if (section === 'note') {
        if (!args.title && !args.content) {
          return '📝 Gonna need at least a **title** or some **content** — can\'t save vibes alone bestie';
        }
        Storage.addNote({
          title: args.title || 'Untitled Note',
          content: args.content || '',
        });
        const quips = [
          'Noted before your goldfish memory kicks in! 🧠',
          'Saved! Your shower thoughts are safe with me 🚿💭',
          'Written down so you don\'t forget (again) 📌',
          'Brain dump? More like brain upgrade 🧠⬆️',
          'Note saved! Future you will be grateful, trust 📝✨',
        ][Math.floor(Math.random() * 5)];
        return `${quips}\n\n📝 **"${args.title || 'Untitled'}"** saved${args.content ? ` — _${args.content.slice(0, 60)}${args.content.length > 60 ? '…' : ''}_` : ''}`;
      }

      if (section === 'debt') {
        if (!args.person || !args.amount) {
          return '🤝 Need a **person** and **amount** — I\'m an AI, not a mind reader 🔮';
        }
        const debtType = args.debtType || 'lend';
        const debtData = {
          person: args.person,
          amount: Math.abs(args.amount),
          debtType: debtType,
          debt_type: debtType,
          description: args.description || '',
        };
        Storage.addDebt(debtData);
        const quips = debtType === 'lend'
          ? [
              'Congrats, you\'re now a walking ATM 🏦😂',
              'Generous king/queen behavior 👑 hope they actually pay back tho',
              'Your wallet: "why do you hate me" 😭',
              'Friendship tested in 3... 2... 1... 🤞💀',
              'You just unlocked the "chasing people for money" side quest 🎮',
            ][Math.floor(Math.random() * 5)]
          : [
              'The debt arc has begun 💀 no ghosting allowed',
              'Added to the "I\'ll pay you back bro I promise" list 😬🫣',
              'You owe money now bestie, your conscience won\'t let you forget 👀',
              'Noted! Your wallet is already anxiety-scrolling 📱😰',
              'Debt logged! Set a reminder before you "forget" 🧠❌',
            ][Math.floor(Math.random() * 5)];
        return `${quips}\n\n**${debtType === 'lend' ? '💸 Lent' : '🤲 Borrowed'} ৳${args.amount}** ${debtType === 'lend' ? 'to' : 'from'} **${args.person}**${args.description ? ` — _${args.description}_` : ''}`;
      }

      return '🤔 Hmm, my brain lagged — try specifying **task**, **exam**, **routine**, **transaction**, **debt**, or **note** and I\'ll sort it out!';
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
          `- **${e.subject}** · ${e.date} ${e.time ? formatTime12h(e.time) : ''}`
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
            summary += `**${day.charAt(0).toUpperCase() + day.slice(1)}**\n${periods.map((p: any) => `- ${p.subject} · ${formatTime12h(p.startTime)}–${formatTime12h(p.endTime)}`).join('\n')}\n\n`;
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

      return '🤷 404 brain not found — try asking about **tasks**, **exams**, **routine**, **transactions**, **debts**, or **notes**!';
    }

    if (toolCall.function.name === 'delete_entry') {
      const { section, identifier } = args;
      if (!identifier) return '😅 Delete what exactly? Give me a name, subject, or title — I\'m not a psychic bestie 🔮';

      const idLower = identifier.toLowerCase();

      if (section === 'task') {
        const tasks = Storage.getTasks();
        const matches = idLower === 'all' ? tasks : tasks.filter((t: any) => t.title?.toLowerCase().includes(idLower));
        if (matches.length === 0) return `🤔 Can't find any task matching **"${identifier}"** — sure it exists?`;
        matches.forEach((m: any) => Storage.deleteTask(m.id));
        const delQuip = ['Yeeted into the void! 🕳️', 'Gone, reduced to atoms ⚛️', 'Task said bye-bye 👋', 'Deleted! That task never existed 🫥'][Math.floor(Math.random() * 4)];
        return `${delQuip} Removed **${matches.length}** task${matches.length > 1 ? 's' : ''}${matches.length === 1 ? ` — "${matches[0].title}"` : ''}.`;
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
        if (matches.length === 0) return `🤔 No exam matching **"${identifier}"** found — maybe it already ran away 🏃`;
        for (const m of matches) { Storage.deleteExam(m.id); await deleteExamFromDB(m.id); }
        const examDelQuip = ['One less exam to stress about 🎉', 'Poof! Gone like your study motivation 💨', 'Exam deleted! Your stress level: 📉'][Math.floor(Math.random() * 3)];
        return `${examDelQuip} Removed **${matches.length}** exam${matches.length > 1 ? 's' : ''}${matches.length === 1 ? ` — "${matches[0].subject}" (${matches[0].date})` : ''}.`;
      }

      if (section === 'transaction') {
        const txns = Storage.getTransactions();
        const matches = idLower === 'all' ? txns : txns.filter((t: any) => t.description?.toLowerCase().includes(idLower));
        if (matches.length === 0) return `🤔 No transaction matching **"${identifier}"** — are you sure that purchase happened? 👀`;
        for (const m of matches) { Storage.deleteTransaction(m.id); await deleteTransactionFromDB(m.id); }
        return `🗑️ Erased **${matches.length}** transaction${matches.length > 1 ? 's' : ''} from existence. Your wallet has amnesia now 🧠❌`;
      }

      if (section === 'note') {
        const notes = Storage.getNotes();
        const matches = idLower === 'all' ? notes : notes.filter((n: any) => n.title?.toLowerCase().includes(idLower));
        if (matches.length === 0) return `🤔 No note matching **"${identifier}"** — did your cat walk on the keyboard? 🐱`;
        matches.forEach((m: any) => Storage.deleteNote(m.id));
        return `🗑️ **${matches.length}** note${matches.length > 1 ? 's' : ''} sent to the shadow realm 🌑 Hope you didn't need ${matches.length > 1 ? 'those' : 'that'}!`;
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
          if (totalDeleted === 0) return '🤔 Nothing to delete — your routine is already empty like a Friday lecture hall 😴';
          return `🗑️ Wiped **${totalDeleted}** class${totalDeleted > 1 ? 'es' : ''}${day ? ` from **${day}**` : ''}. Freedom tastes good doesn\'t it? 😎`;
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
        if (totalDeleted === 0) return `🤔 Can't find any class matching **"${identifier}"** — did you already skip it? 😏`;
        return `🗑️ Dropped **${totalDeleted}** class${totalDeleted > 1 ? 'es' : ''} for **${identifier}**. Your schedule just got lighter 🪶`;
      }

      if (section === 'debt') {
        const debts = Storage.getDebts();
        const matches = idLower === 'all' ? debts : debts.filter((d: any) => d.person?.toLowerCase().includes(idLower));
        if (matches.length === 0) return `🤔 No debt entry for **"${identifier}"** — are you hallucinating money? 💭💸`;
        for (const m of matches) { Storage.deleteDebt(m.id); await deleteDebtFromDB(m.id); }
        return `🗑️ Wiped **${matches.length}** debt record${matches.length > 1 ? 's' : ''}. *pretending it never happened* 🙈`;
      }

      return '🤔 Delete from where tho? Try **task**, **exam**, **routine**, **transaction**, **debt**, or **note** — I got you 🫡';
    }

    if (toolCall.function.name === 'update_entry') {
      const { section, identifier } = args;
      if (!identifier) return '😅 Update what exactly? Drop a name or title — I can\'t just vibe-check the whole database 🎯';
      const idLower = identifier.toLowerCase();

      if (section === 'task') {
        const tasks = Storage.getTasks();
        const matches = tasks.filter((t: any) => t.title?.toLowerCase().includes(idLower));
        if (matches.length === 0) return `🤔 Can't find any task matching **"${identifier}"** — did it ghosted you? 👻`;
        const newStatus = args.status || 'done';
        matches.forEach((m: any) => Storage.updateTask(m.id, { status: newStatus }));
        const statusEmoji = newStatus === 'done' ? '✅' : newStatus === 'in-progress' ? '⚡' : '📋';
        const quips = newStatus === 'done'
          ? [
              'TASK DESTROYED 🔥 You\'re actually goated',
              'Look at you being a functional human! 💪 So proud rn',
              'Another one bites the dust! DJ Khaled voice: "another one" 🏆',
              'Completed! You\'re speedrunning productivity today ⚡',
              'DONE! Your discipline is scary ngl 😤✨',
            ][Math.floor(Math.random() * 5)]
          : newStatus === 'in-progress'
          ? [
              'Let\'s get to work! Main character energy activated 🎬',
              'Grinding mode: ON. Touch grass mode: OFF 🎯',
              'On it! Your motivation arc is fire rn 💨🔥',
            ][Math.floor(Math.random() * 3)]
          : [
              'Back from the dead! Zombie task edition 🧟',
              'Reopened! The sequel nobody asked for 🔄🎬',
              'Round 2 — this time it\'s personal 👊',
            ][Math.floor(Math.random() * 3)];
        return `${quips} ${statusEmoji} **${matches.length}** task${matches.length > 1 ? 's' : ''} → **${newStatus}**${matches.length === 1 ? ` — "${matches[0].title}"` : ''}.`;
      }

      if (section === 'note') {
        const notes = Storage.getNotes();
        const matches = notes.filter((n: any) => n.title?.toLowerCase().includes(idLower));
        if (matches.length === 0) return `🤔 No note matching **"${identifier}"** — your notes are playing hide and seek 🙈`;
        const target = matches[0];
        const updates: any = {};
        if (args.title) updates.title = args.title;
        if (args.content) updates.content = args.content;
        if (Object.keys(updates).length === 0) return '😅 Nothing to change! Tell me the new **title** or **content** — I\'m not a mind reader (working on it tho 🧠)';
        Storage.updateNote(target.id, updates);
        return `✏️ Note **"${target.title}"** glow-up complete! ✨${args.title ? ` New title: **${args.title}**` : ''}${args.content ? ' Content refreshed 🔄' : ''}`;
      }

      if (section === 'exam') {
        const exams = Storage.getExams();
        const matches = exams.filter((e: any) => e.subject?.toLowerCase().includes(idLower));
        if (matches.length === 0) return `🤔 No exam matching **"${identifier}"** — maybe it was all a dream? 💭`;
        const target = matches[0];
        const updates: any = {};
        if (args.subject) updates.subject = args.subject;
        if (args.date) updates.date = args.date;
        if (args.time) updates.time = args.time;
        if (args.room) updates.room = args.room;
        if (args.teacher) updates.teacher = args.teacher;
        if (Object.keys(updates).length === 0) return '😅 What should I change tho? Drop the deets — **subject**, **date**, **time**, **room**, or **teacher** 🎯';
        Storage.updateExam({ ...target, ...updates });
        updateExamInDB({ ...target, ...updates }).catch(() => {});
        const changes = Object.entries(updates).map(([k, v]) => `**${k}**: ${v}`).join(', ');
        return `✏️ Exam **"${target.subject}"** got a glow-up! ✨ ${changes}`;
      }

      return '🤔 I can update **tasks**, **notes**, and **exams** — which one needs a glow-up? ✨';
    }

    if (toolCall.function.name === 'settle_debt') {
      const { person } = args;
      if (!person) return '😅 Settle with WHO? Drop a name bestie, I need specifics 🎯';

      const personLower = person.toLowerCase();
      const debts = Storage.getDebts();
      const matches = personLower === 'all'
        ? debts.filter((d: any) => !d.settled)
        : debts.filter((d: any) => !d.settled && d.person?.toLowerCase().includes(personLower));

      if (matches.length === 0) return `🤔 No debts found for **"${person}"** — either they\'re clear or you never tracked it 👀`;

      for (const m of matches) {
        Storage.settleDebt(m.id);
        await settleDebtInDB(m.id);
      }

      const totalAmount = matches.reduce((s: number, d: any) => s + (Number(d.amount) || 0), 0);
      const quips = [
        'DEBT FREE ERA LET\'S GOOO 🎉🎊',
        'Clean slate! You can sleep peacefully tonight ✨😴',
        'Settled! Friendship saved, dignity restored 🤝💯',
        'Money drama: RESOLVED. Now that\'s character development 📈',
        'All square! The financial anxiety can chill now 🧘‍♂️',
      ][Math.floor(Math.random() * 5)];
      return `${quips}\n\n✅ Settled **${matches.length}** debt${matches.length > 1 ? 's' : ''} with **${matches[0]?.person || person}** (total: **৳${totalAmount}**)`;
    }

    return '🤔 That one went over my head like a 8 AM lecture 😴 Try again?';
  } catch (e) {
    console.error('Tool execution error:', e);
    return '😭 Bruh something broke on my end — give it another shot, I promise I\'ll do better this time 🙏';
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
        // Only use tool results — assistantContent often duplicates what tools return
        const toolResultText = results.join('\n\n');
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
      {/* FAB Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 group"
          style={{
            width: 52, height: 52,
            background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(263 70% 60%))',
            color: 'hsl(var(--primary-foreground))',
            boxShadow: '0 8px 32px hsl(var(--primary) / 0.4), 0 2px 8px rgba(0,0,0,0.3)',
          }}
          aria-label="Open AI Assistant"
        >
          <Bot className="w-5 h-5 transition-transform duration-300 group-hover:rotate-12" />
        </button>
      )}

      {/* Backdrop — desktop only */}
      {open && (
        <div className="hidden sm:block fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}

      {/* Chat Panel — bottom-sheet on mobile, floating panel on desktop */}
      {open && (
        <div
          className="fixed left-0 right-0 bottom-0 z-[1100] flex flex-col rounded-t-3xl sm:left-auto sm:right-5 sm:bottom-5 sm:w-[400px] sm:rounded-2xl overflow-hidden"
          style={{
            maxHeight: '88dvh',
            background: 'hsl(var(--bg-card))',
            boxShadow: '0 -4px 60px rgba(0,0,0,0.5), 0 0 0 1px hsl(var(--border))',
            animation: 'slideUpSheet 0.3s cubic-bezier(0.34,1.2,0.64,1)',
          }}
        >
          {/* Desktop: accent border overlay */}
          <div className="hidden sm:block absolute inset-0 rounded-2xl pointer-events-none"
            style={{ border: '1px solid hsl(var(--border-accent))' }} />

          {/* ─── Header ─── */}
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(263 70% 60% / 0.08))',
              borderBottom: '1px solid hsl(var(--border))',
            }}
          >
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse 70% 100% at 0% 50%, hsl(var(--primary) / 0.07), transparent)' }} />

            <div className="flex items-center gap-3 relative">
              {/* AI Avatar */}
              <div className="relative shrink-0">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(263 70% 60%))' }}
                >
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                  style={{ background: 'hsl(var(--green))', borderColor: 'hsl(var(--bg-card))' }} />
              </div>
              <div>
                <div className="font-bold text-sm text-foreground leading-none mb-0.5">GBD Assistant</div>
                <div className="text-[0.6rem] font-semibold tracking-wide" style={{ color: 'hsl(var(--green))' }}>
                  ● Online · AI-powered
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 relative">
              {messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted/60 transition-colors"
                  style={{ color: 'hsl(var(--muted-foreground))' }}
                  title="Clear chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted/60 transition-colors"
                style={{ color: 'hsl(var(--muted-foreground))' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ─── Messages ─── */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 200 }}>

            {/* Empty state with suggestion chips */}
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full py-6 text-center">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(263 70% 60% / 0.1))',
                    border: '1px solid hsl(var(--border-accent))',
                  }}
                >
                  <Bot className="w-8 h-8" style={{ color: 'hsl(var(--primary))' }} />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">Hey there! 👋</p>
                <p className="text-xs text-muted-foreground mb-1">I'm your GBD Assistant.</p>
                <p className="text-[0.65rem] text-muted-foreground/60 italic mb-5">Crafted with care by Zisan</p>

                <div className="flex flex-wrap gap-2 justify-center max-w-[280px]">
                  {[
                    'Spent 200 on coffee ☕',
                    'Add Physics exam Mar 20',
                    'What tasks do I have today?',
                    'Summarize my week',
                  ].map(s => (
                    <button
                      key={s}
                      onClick={() => { setInput(s); setTimeout(() => inputRef.current?.focus(), 50); }}
                      className="text-[0.68rem] font-medium px-3 py-1.5 rounded-full transition-colors"
                      style={{
                        background: 'hsl(var(--accent-dim))',
                        color: 'hsl(var(--primary))',
                        border: '1px solid hsl(var(--border-accent))',
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message bubbles */}
            {messages.map((msg, i) => (
              <div key={i} className={`flex items-end gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {msg.role === 'assistant' && (
                  <div
                    className="w-6 h-6 rounded-lg shrink-0 flex items-center justify-center mb-0.5"
                    style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(263 70% 60%))' }}
                  >
                    <Bot className="w-3 h-3 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
                    msg.role === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm'
                  }`}
                  style={msg.role === 'user'
                    ? {
                        background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.85))',
                        color: 'hsl(var(--primary-foreground))',
                        boxShadow: '0 2px 12px hsl(var(--primary) / 0.25)',
                      }
                    : {
                        background: 'hsl(var(--bg-secondary))',
                        color: 'hsl(var(--foreground))',
                        border: '1px solid hsl(var(--border))',
                      }
                  }
                >
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

            {/* Typing indicator (animated dots) */}
            {loading && (
              <div className="flex items-end gap-2">
                <div className="w-6 h-6 rounded-lg shrink-0 flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(263 70% 60%))' }}>
                  <Bot className="w-3 h-3 text-white" />
                </div>
                <div className="rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1"
                  style={{ background: 'hsl(var(--bg-secondary))', border: '1px solid hsl(var(--border))' }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full inline-block" style={{
                      background: 'hsl(var(--primary))',
                      animation: `gbd-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ─── Input ─── */}
          <div
            className="p-3 shrink-0"
            style={{
              paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
              borderTop: '1px solid hsl(var(--border))',
              background: 'hsl(var(--bg-secondary))',
            }}
          >
            <form onSubmit={e => { e.preventDefault(); send(); }} className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={t('ai.placeholder' as TranslationKey) || 'Ask me anything...'}
                className="flex-1 text-sm rounded-xl px-4 py-2.5 outline-none"
                style={{
                  background: 'hsl(var(--bg-card))',
                  color: 'hsl(var(--foreground))',
                  border: '1px solid hsl(var(--border))',
                  transition: 'border-color 0.2s ease',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'hsl(var(--primary) / 0.5)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'hsl(var(--border))')}
                disabled={loading}
                maxLength={500}
              />
              {loading ? (
                <button
                  type="button"
                  onClick={cancelRequest}
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all active:scale-95"
                  style={{ background: 'hsl(var(--destructive))', color: 'hsl(var(--destructive-foreground))' }}
                  title="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(263 70% 60%))',
                    color: 'hsl(var(--primary-foreground))',
                    boxShadow: input.trim() ? '0 4px 12px hsl(var(--primary) / 0.35)' : 'none',
                    transition: 'opacity 0.2s, transform 0.2s, box-shadow 0.2s',
                  }}
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </form>
            <p className="text-center text-[0.58rem] text-muted-foreground/40 mt-2 tracking-wide">
              Made with ❤️ by Zisan
            </p>
          </div>
        </div>
      )}

      {/* Typing animation keyframes */}
      <style>{`
        @keyframes gbd-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.35; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </>
  );
};

export default AIChatFAB;

