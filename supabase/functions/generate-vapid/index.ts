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

  try {
    // Generate VAPID key pair using Web Crypto
    const keyPair = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"]
    );

    const publicKeyRaw = new Uint8Array(
      await crypto.subtle.exportKey("raw", keyPair.publicKey)
    );
    const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

    const publicKeyB64 = base64urlEncode(publicKeyRaw);
    const privateKeyB64 = privateKeyJwk.d!; // Already base64url

    return new Response(
      JSON.stringify({
        publicKey: publicKeyB64,
        privateKey: privateKeyB64,
        instructions: "Save these as VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY secrets, then set VITE_VAPID_PUBLIC_KEY in your app.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function base64urlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
