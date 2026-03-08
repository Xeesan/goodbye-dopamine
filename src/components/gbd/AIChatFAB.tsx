import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, X, Send, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Storage from '@/lib/storage';
import { useI18n } from '@/hooks/useI18n';
import { toast } from '@/hooks/use-toast';
import type { TranslationKey } from '@/lib/i18n';

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
    const routineSummary: Record<string, number> = {};
    for (const [day, periods] of Object.entries(routine)) {
      routineSummary[day] = (periods as any[]).length;
    }
    return {
      taskCount: tasks.length,
      tasks: tasks.map((t: any) => ({ title: t.title, date: t.date, priority: t.priority, status: t.status })),
      examCount: exams.length,
      exams: exams.map((e: any) => ({ subject: e.subject, date: e.date, time: e.time })),
      routineSummary,
    };
  } catch {
    return {};
  }
}

function executeToolCall(toolCall: ToolCall): string {
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
        return `✅ Task "${args.title}" added${args.date ? ` for ${args.date}` : ''}.`;
      }

      if (section === 'exam') {
        Storage.addExam({
          subject: args.subject || 'Untitled',
          date: args.date || new Date().toISOString().split('T')[0],
          time: args.time || '09:00',
          room: args.room || '',
          teacher: args.teacher || '',
          credits: args.credits || 3,
          type: args.examType || 'exams',
          grade: '',
        });
        return `✅ Exam "${args.subject}" added for ${args.date || 'today'}.`;
      }

      if (section === 'routine') {
        if (!args.day || !args.subject || !args.startTime || !args.endTime) {
          return '❌ Routine needs day, subject, startTime, and endTime.';
        }
        Storage.addPeriod(args.day, {
          subject: args.subject,
          startTime: args.startTime,
          endTime: args.endTime,
          room: args.room || '',
        });
        return `✅ Added ${args.subject} on ${args.day} (${args.startTime}-${args.endTime}).`;
      }

      return '❌ Unknown section.';
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
          `• ${t.title}${t.date ? ` (${t.date})` : ''} [${t.priority || 'medium'}] — ${t.status}`
        ).join('\n');
        return `📋 **Tasks** (${tasks.length} total):\n${summary || 'No tasks found.'}`;
      }

      if (section === 'exams' || section === 'all') {
        let exams = Storage.getExams();
        if (filterLower) {
          exams = exams.filter((e: any) =>
            e.subject?.toLowerCase().includes(filterLower) || e.date?.includes(filterLower)
          );
        }
        const summary = exams.slice(0, 10).map((e: any) =>
          `• ${e.subject} — ${e.date} ${e.time || ''}`
        ).join('\n');
        return `📝 **Exams** (${exams.length} total):\n${summary || 'No exams found.'}`;
      }

      if (section === 'routine') {
        const routine = Storage.getRoutine();
        const dayFilter = filterLower;
        const days = dayFilter && routine[dayFilter] ? [dayFilter] : Object.keys(routine);
        let summary = '';
        for (const day of days) {
          const periods = routine[day] || [];
          if (periods.length > 0) {
            summary += `**${day}**: ${periods.map((p: any) => `${p.subject} (${p.startTime}-${p.endTime})`).join(', ')}\n`;
          }
        }
        return `🗓️ **Routine**:\n${summary || 'No routine set.'}`;
      }

      return '❌ Unknown section to query.';
    }

    return '❌ Unknown tool.';
  } catch (e) {
    console.error('Tool execution error:', e);
    return '❌ Failed to process command.';
  }
}

interface AIChatFABProps {
  onDataChanged?: () => void;
}

const AIChatFAB = ({ onDataChanged }: AIChatFABProps) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: 'user', content: text };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput('');
    setLoading(true);

    try {
      const customKey = localStorage.getItem('gbd_gemini_api_key') || '';
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages.map(m => ({ role: m.role, content: m.content })),
          context: buildContext(),
          ...(customKey ? { geminiApiKey: customKey } : {}),
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        toast({ title: 'AI Error', description: err.error || `Error ${resp.status}`, variant: 'destructive' });
        setLoading(false);
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

      while (true) {
        const { done, value } = await reader.read();
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
          const result = executeToolCall(tc);
          results.push(result);
        }
        const toolResultText = (assistantContent ? assistantContent + '\n\n' : '') + results.join('\n');
        updateAssistant(toolResultText);

        // Notify parent that data changed
        if (results.some(r => r.startsWith('✅')) && onDataChanged) {
          onDataChanged();
        }
      } else if (!assistantContent) {
        updateAssistant("I couldn't process that. Try something like: *Add a task to study Math tomorrow*");
      }
    } catch (e) {
      console.error('AI chat error:', e);
      toast({ title: 'Connection Error', description: 'Could not reach AI assistant.', variant: 'destructive' });
    }

    setLoading(false);
  }, [input, messages, loading, onDataChanged]);

  return (
    <>
      {/* FAB */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(263 70% 66%))',
            color: 'hsl(var(--primary-foreground))',
          }}
          aria-label="Open AI Assistant"
        >
          <Bot className="w-6 h-6" />
        </button>
      )}

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[340px] sm:w-[380px] max-h-[70vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
          style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(263 70% 66%))', color: 'hsl(var(--primary-foreground))' }}>
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <span className="font-bold text-sm">GBD Assistant</span>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 rounded-full hover:bg-white/20 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px] max-h-[50vh]">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <Bot className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground font-medium">Hi! I'm your GBD Assistant 👋</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Try: "Add exam Physics on March 20"</p>
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
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:m-0 [&>ol]:m-0">
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

          {/* Input */}
          <div className="p-3 shrink-0" style={{ borderTop: '1px solid hsl(var(--border))' }}>
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
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
                style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatFAB;
