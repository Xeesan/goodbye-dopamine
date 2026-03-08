import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are GBD Assistant — a witty, Gen-Z-friendly student productivity buddy inside the "Good Bye Dopamine" app.

Your vibe: Think of yourself as that one organized friend who roasts you lovingly while actually helping you get your life together. You're encouraging but real — no toxic positivity.

You can do TWO things via tool calls:

1. **add_entry** — Create a task, exam, or routine entry.
2. **query_data** — Read existing tasks, exams, or routine to answer user questions.

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
- When querying, specify the section (tasks/exams/routine) and any filters.
- Respond in the same language the user writes in.
- If unsure what section to use, ask in a fun way.
- Today's date is: ${new Date().toISOString().split('T')[0]}`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "add_entry",
      description: "Add a new task, exam, or routine period to the user's data.",
      parameters: {
        type: "object",
        properties: {
          section: {
            type: "string",
            enum: ["task", "exam", "routine"],
            description: "Which section to add to",
          },
          title: { type: "string", description: "Task title (for tasks)" },
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
      description: "Query existing tasks, exams, or routine to answer user questions.",
      parameters: {
        type: "object",
        properties: {
          section: {
            type: "string",
            enum: ["tasks", "exams", "routine", "all"],
            description: "Which section to query",
          },
          filter: { type: "string", description: "Optional filter like 'today', 'this week', 'high priority', subject name" },
        },
        required: ["section"],
        additionalProperties: false,
      },
    },
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const { messages, context, geminiApiKey } = await req.json();

    // Determine which API to use
    const useCustomGemini = !!geminiApiKey;
    
    if (!useCustomGemini && !LOVABLE_API_KEY) {
      throw new Error("No AI API key configured");
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Limit message history to last 20 messages
    const trimmedMessages = messages.slice(-20);

    // Inject context about existing data if provided
    let systemContent = SYSTEM_PROMPT;
    if (context) {
      systemContent += `\n\nUser's current data summary:\n${JSON.stringify(context).slice(0, 2000)}`;
    }

    const apiUrl = useCustomGemini
      ? `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`
      : "https://ai.gateway.lovable.dev/v1/chat/completions";

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (useCustomGemini) {
      headers["Authorization"] = `Bearer ${geminiApiKey}`;
    } else {
      headers["Authorization"] = `Bearer ${LOVABLE_API_KEY}`;
    }

    const model = useCustomGemini ? "gemini-2.5-flash" : "google/gemini-3-flash-preview";

    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemContent },
          ...trimmedMessages,
        ],
        tools: TOOLS,
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
