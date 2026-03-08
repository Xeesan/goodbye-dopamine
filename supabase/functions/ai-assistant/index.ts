import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_BODY_BYTES = 50_000; // ~50KB max payload
const MAX_MSG_LENGTH = 5000;
const MAX_MESSAGES = 20;
const PROVIDER_TIMEOUT_MS = 30_000;

const SYSTEM_PROMPT = `You are GBD Assistant — a witty, Gen-Z-friendly student productivity buddy inside the "Good Bye Dopamine" app.

Your vibe: Think of yourself as that one organized friend who roasts you lovingly while actually helping you get your life together. You're encouraging but real — no toxic positivity.

You can do FOUR things via tool calls:

1. **add_entry** — Create a task, exam, routine entry, money transaction, or note.
2. **query_data** — Read existing tasks, exams, routine, transactions, or notes to answer user questions.
3. **delete_entry** — Delete a specific task, exam, transaction, note, or debt entry by matching a name/subject/title.
4. **settle_debt** — Mark a lend/borrow debt as settled (paid back) by person name. Use this when the user says "settle", "paid back", "returned", etc.

PERSONALITY RULES:
- Be concise but add personality. One-liners > paragraphs.
- Use casual language, light humor, and relatable student references.
- Celebrate wins: "Look at you being productive! 🔥"
- Gentle roasts when appropriate: "Another exam? Your semester is built different 💀"
- Use emoji naturally but don't overdo it (1-2 per message max).
- When adding stuff successfully, hype them up briefly.
- When querying empty data, be encouraging not boring: "Your schedule is cleaner than my code — nothing here yet!"

TOOL RULES:
- Always use tool calls to add or query data. Never just say "I added it" without calling the tool.
- For tasks: title is required; date, time, priority (low/medium/high) are optional.
- For exams: subject and date are required; time, room, teacher, credits, type are optional.
- For routine: day (monday-sunday), subject, startTime (HH:MM), endTime (HH:MM) are required; room is optional.
- For transactions: description and amount are required; type (income/expense) defaults to expense.
- For lend/borrow (debt): person and amount are required; debtType (lend/borrow) is required. Use "lend" when user gave money to someone, "borrow" when user took money from someone.
- For notes: title and content are required.
- When querying, specify the section and any filters.
- For deleting: use ONE delete_entry call. Use identifier "all" to delete all entries, "this month" for date-based filtering on exams, or a specific name/subject to match. Do NOT call delete_entry multiple times — the client handles bulk deletion.
- Respond in the same language the user writes in.
- If unsure what section to use, ask in a fun way.
- Today's date is: ${new Date().toISOString().split('T')[0]}`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "add_entry",
      description: "Add a new task, exam, routine period, money transaction, lend/borrow entry, or note.",
      parameters: {
        type: "object",
        properties: {
          section: {
            type: "string",
            enum: ["task", "exam", "routine", "transaction", "debt", "note"],
            description: "Which section to add to. Use 'debt' for lend/borrow entries.",
          },
          title: { type: "string", description: "Title (for tasks/notes)" },
          subject: { type: "string", description: "Subject name (for exams/routine)" },
          date: { type: "string", description: "Date in YYYY-MM-DD format" },
          time: { type: "string", description: "Time in HH:MM format" },
          priority: { type: "string", enum: ["low", "medium", "high"], description: "Task priority" },
          day: { type: "string", enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] },
          startTime: { type: "string", description: "Start time HH:MM (routine)" },
          endTime: { type: "string", description: "End time HH:MM (routine)" },
          room: { type: "string", description: "Room/location" },
          teacher: { type: "string", description: "Teacher name (exams)" },
          credits: { type: "number", description: "Credits (exams)" },
          examType: { type: "string", description: "Exam type e.g. midterm, final" },
          amount: { type: "number", description: "Amount for transaction or debt" },
          description: { type: "string", description: "Description for transaction or debt" },
          transactionType: { type: "string", enum: ["income", "expense"], description: "Transaction type" },
          content: { type: "string", description: "Content/body text for notes (supports markdown)" },
          person: { type: "string", description: "Person name for lend/borrow" },
          debtType: { type: "string", enum: ["lend", "borrow"], description: "Whether user lent or borrowed money" },
        },
        required: ["section"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_data",
      description: "Query existing tasks, exams, routine, transactions, debts (lend/borrow), or notes.",
      parameters: {
        type: "object",
        properties: {
          section: {
            type: "string",
            enum: ["tasks", "exams", "routine", "transactions", "debts", "notes", "all"],
            description: "Which section to query. Use 'debts' for lend/borrow entries.",
          },
          filter: { type: "string", description: "Optional filter like 'today', 'this week', 'high priority', person name, subject name, etc." },
        },
        required: ["section"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_entry",
      description: "Delete a specific task, exam, transaction, note, or debt entry. Use the identifier to match by title, subject, description, or person name.",
      parameters: {
        type: "object",
        properties: {
          section: {
            type: "string",
            enum: ["task", "exam", "transaction", "note", "debt"],
            description: "Which section to delete from.",
          },
          identifier: {
            type: "string",
            description: "The name/title/subject/person to match against for deletion. Use the exact or partial name from user context.",
          },
        },
        required: ["section", "identifier"],
        additionalProperties: false,
      },
    },
  },
];

/** Safe JSON error response */
function errorResponse(message: string, status: number, extra?: Record<string, string>) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    // ── Payload size guard ──
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_BODY_BYTES) {
      return errorResponse("Request too large", 413);
    }

    // ── Auth check ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse("Unauthorized", 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse("Unauthorized", 401);
    }

    // ── Parse body with size limit ──
    const rawBody = await req.text();
    if (rawBody.length > MAX_BODY_BYTES) {
      return errorResponse("Request too large", 413);
    }

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return errorResponse("Invalid JSON", 400);
    }

    const { messages, context, geminiApiKey } = body;
    const useCustomGemini = typeof geminiApiKey === "string" && geminiApiKey.length > 0;

    if (!useCustomGemini && !LOVABLE_API_KEY && !OPENROUTER_API_KEY) {
      return errorResponse("AI service not configured. Please try again later.", 503);
    }

    // ── Validate messages ──
    if (!Array.isArray(messages) || messages.length === 0) {
      return errorResponse("Messages array is required", 400);
    }

    for (const msg of messages) {
      if (!msg || typeof msg.role !== "string" || typeof msg.content !== "string") {
        return errorResponse("Invalid message format", 400);
      }
      if (!["user", "assistant", "system"].includes(msg.role)) {
        return errorResponse("Invalid message role", 400);
      }
      if (msg.content.length > MAX_MSG_LENGTH) {
        return errorResponse(`Message too long (max ${MAX_MSG_LENGTH} chars)`, 400);
      }
    }

    const trimmedMessages = messages.slice(-MAX_MESSAGES);

    // ── Build system prompt ──
    let systemContent = SYSTEM_PROMPT;
    if (context && typeof context === "object") {
      systemContent += `\n\nUser's current data summary:\n${JSON.stringify(context).slice(0, 2000)}`;
    }

    const basePayload = {
      messages: [
        { role: "system", content: systemContent },
        ...trimmedMessages.map((m: any) => ({ role: m.role, content: m.content })),
      ],
      tools: TOOLS,
      stream: true,
    };

    // ── Provider call helper with timeout ──
    async function callProvider(provider: "custom" | "lovable" | "openrouter"): Promise<Response> {
      let apiUrl: string;
      let authToken: string;
      let model: string;
      const extraHeaders: Record<string, string> = {};

      if (provider === "custom") {
        apiUrl = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
        authToken = geminiApiKey;
        model = "gemini-2.5-flash";
      } else if (provider === "lovable") {
        apiUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
        authToken = LOVABLE_API_KEY!;
        model = "google/gemini-3-flash-preview";
      } else {
        apiUrl = "https://openrouter.ai/api/v1/chat/completions";
        authToken = OPENROUTER_API_KEY!;
        model = "google/gemini-2.5-flash";
        extraHeaders["HTTP-Referer"] = "https://goodbye-dopamine.lovable.app";
        extraHeaders["X-Title"] = "GoodBye Dopamine";
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

      try {
        return await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`,
            ...extraHeaders,
          },
          body: JSON.stringify({ ...basePayload, model }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }
    }

    // ── Try providers with fallback chain ──
    let response: Response;
    let usedProvider: string;

    if (useCustomGemini) {
      usedProvider = "custom";
      response = await callProvider("custom");
    } else if (LOVABLE_API_KEY) {
      usedProvider = "lovable";
      try {
        response = await callProvider("lovable");
      } catch (e) {
        // Network/timeout error on primary — try fallback
        console.error("Lovable AI call failed:", e);
        if (OPENROUTER_API_KEY) {
          usedProvider = "openrouter";
          response = await callProvider("openrouter");
        } else {
          return errorResponse("AI service temporarily unavailable. Please try again.", 503);
        }
      }
      // Fallback on rate limit OR server errors
      if ((response!.status === 429 || response!.status >= 500) && OPENROUTER_API_KEY) {
        console.log(`Lovable AI returned ${response!.status}, falling back to OpenRouter`);
        usedProvider = "openrouter";
        response = await callProvider("openrouter");
      }
    } else if (OPENROUTER_API_KEY) {
      usedProvider = "openrouter";
      response = await callProvider("openrouter");
    } else {
      return errorResponse("AI service not configured", 503);
    }

    // ── Handle upstream errors ──
    if (!response!.ok) {
      const status = response!.status;
      // Consume body to avoid leaking connections
      const responseBody = await response!.text().catch(() => "");
      console.error(`AI provider (${usedProvider}) error: ${status}`, responseBody.slice(0, 500));

      if (status === 429) {
        return errorResponse("All AI providers are busy right now. Please wait a moment and try again.", 429, { "Retry-After": "15" });
      }
      if (status === 402) {
        return errorResponse("AI usage limit reached. Please try again later.", 402);
      }
      if (status === 401 || status === 403) {
        return errorResponse("AI authentication error. Please check your configuration.", 500);
      }
      return errorResponse("AI service temporarily unavailable. Please try again.", 503);
    }

    // ── Stream response back to client ──
    return new Response(response!.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (e) {
    console.error("ai-assistant error:", e);
    // Never leak internal error details to client
    return errorResponse("Something went wrong. Please try again.", 500);
  }
});
