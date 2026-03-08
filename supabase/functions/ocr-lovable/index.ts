import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Authenticate user
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { base64, systemPrompt } = body;

    if (!base64 || typeof base64 !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing image data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (base64.length > 10 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: "Image too large (max 10MB)" }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!systemPrompt || typeof systemPrompt !== "string" || systemPrompt.length > 2000) {
      return new Response(
        JSON.stringify({ error: "Invalid prompt" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract all data from this image:" },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${base64}` },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("Lovable AI error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: `AI error (${response.status})` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || "[]";

    const cleaned = result
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return new Response(
        JSON.stringify({ error: "AI returned invalid JSON. Please try again." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!Array.isArray(parsed)) {
      parsed = [parsed];
    }

    return new Response(JSON.stringify({ items: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("OCR Lovable error:", err);
    return new Response(
      JSON.stringify({ error: "Server error processing request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
