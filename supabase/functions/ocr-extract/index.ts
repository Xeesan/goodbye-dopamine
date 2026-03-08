import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { imageBase64, mode } = await req.json();
    if (!imageBase64) throw new Error("No image provided");

    let systemPrompt: string;
    if (mode === "routine") {
      systemPrompt = `You are an OCR assistant that extracts class routine/timetable data from images.
Extract ALL class periods visible in the image. For each period return:
- day: the day of the week (lowercase: monday, tuesday, etc.)
- subject: the subject/course name
- startTime: start time in HH:MM 24h format
- endTime: end time in HH:MM 24h format  
- room: room number/name if visible (empty string if not)

Return ONLY a valid JSON array of objects. No markdown, no explanation.
Example: [{"day":"monday","subject":"Mathematics","startTime":"09:00","endTime":"10:00","room":"Room 301"}]
If you cannot read anything, return an empty array: []`;
    } else {
      systemPrompt = `You are an OCR assistant that extracts exam/assignment schedule data from images.
Extract ALL exams or assignments visible in the image. For each item return:
- subject: the subject/course name
- date: the date in YYYY-MM-DD format
- time: the time in HH:MM 24h format (use "09:00" if not visible)
- room: room number/name if visible (empty string if not)
- teacher: teacher name if visible (empty string if not)
- credits: credit hours as a number if visible (3 if not)
- grade: target grade if visible (empty string if not)

Return ONLY a valid JSON array of objects. No markdown, no explanation.
Example: [{"subject":"Mathematics","date":"2026-04-15","time":"09:00","room":"Room 301","teacher":"Dr. Smith","credits":3,"grade":"A+"}]
If you cannot read anything, return an empty array: []`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract all data from this image:" },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";

    // Parse the JSON from the AI response, handling potential markdown code blocks
    let parsed;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", content);
      parsed = [];
    }

    return new Response(JSON.stringify({ items: Array.isArray(parsed) ? parsed : [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("OCR error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
