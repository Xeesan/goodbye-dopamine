import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Web Push helpers (same as push-reminders) ──

async function generateVapidHeaders(
  endpoint: string, vapidPublicKey: string, vapidPrivateKey: string, subject: string
) {
  const privateKeyBytes = base64urlDecode(vapidPrivateKey);
  const publicKeyBytes = base64urlDecode(vapidPublicKey);
  const audience = new URL(endpoint).origin;
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 12 * 3600, sub: subject };
  const headerB64 = base64urlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;
  const key = await crypto.subtle.importKey("jwk", {
    kty: "EC", crv: "P-256",
    x: base64urlEncode(publicKeyBytes.slice(1, 33)),
    y: base64urlEncode(publicKeyBytes.slice(33, 65)),
    d: base64urlEncode(privateKeyBytes),
  }, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(unsignedToken));
  const sigBytes = new Uint8Array(signature);
  const jwt = `${unsignedToken}.${base64urlEncode(sigBytes)}`;
  return { Authorization: `vapid t=${jwt}, k=${vapidPublicKey}` };
}

async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string, vapidPublicKey: string, vapidPrivateKey: string, vapidSubject: string
) {
  const localKeyPair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const localPublicKey = await crypto.subtle.exportKey("raw", localKeyPair.publicKey);
  const localPublicKeyBytes = new Uint8Array(localPublicKey);
  const subscriberPublicKey = base64urlDecode(subscription.p256dh);
  const subscriberKey = await crypto.subtle.importKey("raw", subscriberPublicKey, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const sharedSecret = await crypto.subtle.deriveBits({ name: "ECDH", public: subscriberKey }, localKeyPair.privateKey, 256);
  const authSecret = base64urlDecode(subscription.auth);
  const ikm = new Uint8Array(sharedSecret);
  const prkKey = await crypto.subtle.importKey("raw", authSecret, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey, ikm));
  const contentEncInfo = buildInfo("aesgcm", subscriberPublicKey, localPublicKeyBytes);
  const cekHmacKey = await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const cekInfo = concatUint8(contentEncInfo, new Uint8Array([1]));
  const cekHmac = new Uint8Array(await crypto.subtle.sign("HMAC", cekHmacKey, cekInfo));
  const contentEncryptionKey = cekHmac.slice(0, 16);
  const nonceInfo = buildInfo("nonce", subscriberPublicKey, localPublicKeyBytes);
  const nonceHmacKey = await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const nonceInfoFull = concatUint8(nonceInfo, new Uint8Array([1]));
  const nonceHmac = new Uint8Array(await crypto.subtle.sign("HMAC", nonceHmacKey, nonceInfoFull));
  const nonce = nonceHmac.slice(0, 12);
  const payloadBytes = new TextEncoder().encode(payload);
  const paddedPayload = new Uint8Array(2 + payloadBytes.length);
  paddedPayload[0] = 0; paddedPayload[1] = 0;
  paddedPayload.set(payloadBytes, 2);
  const aesKey = await crypto.subtle.importKey("raw", contentEncryptionKey, { name: "AES-GCM" }, false, ["encrypt"]);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, paddedPayload);
  const encryptedBytes = new Uint8Array(encrypted);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const vapidHeaders = await generateVapidHeaders(subscription.endpoint, vapidPublicKey, vapidPrivateKey, vapidSubject);
  const body = buildAes128gcmBody(salt, localPublicKeyBytes, encryptedBytes);
  return await fetch(subscription.endpoint, {
    method: "POST",
    headers: { ...vapidHeaders, "Content-Type": "application/octet-stream", "Content-Encoding": "aes128gcm", TTL: "86400" },
    body,
  });
}

function buildAes128gcmBody(salt: Uint8Array, publicKey: Uint8Array, encrypted: Uint8Array): Uint8Array {
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  const idlen = new Uint8Array([publicKey.length]);
  return concatUint8(salt, rs, idlen, publicKey, encrypted);
}

function buildInfo(type: string, clientPublicKey: Uint8Array, serverPublicKey: Uint8Array): Uint8Array {
  const prefix = new TextEncoder().encode(`Content-Encoding: ${type}\0P-256\0`);
  const clientLen = new Uint8Array(2); clientLen[0] = 0; clientLen[1] = clientPublicKey.length;
  const serverLen = new Uint8Array(2); serverLen[0] = 0; serverLen[1] = serverPublicKey.length;
  return concatUint8(prefix, clientLen, clientPublicKey, serverLen, serverPublicKey);
}

function concatUint8(...arrays: Uint8Array[]): Uint8Array {
  const totalLen = arrays.reduce((acc, a) => acc + a.length, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const a of arrays) { result.set(a, offset); offset += a.length; }
  return result;
}

function base64urlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function base64urlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// ── Reminder metadata ──
const REMINDER_META: Record<string, { title: string; body: string; emoji: string; tag: string }> = {
  "20-20-20": { title: "20-20-20 Rule", body: "Look 20 feet away for 20 seconds to rest your eyes.", emoji: "👁️", tag: "20-20-20-RULE" },
  "blink": { title: "Blink Reminder", body: "Don't forget to blink! Keep your eyes hydrated.", emoji: "😑", tag: "BLINK-REMINDER" },
  "sedentary": { title: "Sedentary Alert", body: "Time to stand up and stretch!", emoji: "🧍", tag: "SEDENTARY-ALERT" },
  "water": { title: "Water Reminder", body: "Stay hydrated! Drink a glass of water now.", emoji: "💧", tag: "WATER-REMINDER" },
  "posture": { title: "Posture Check", body: "Sit up straight! Align your spine, relax your shoulders.", emoji: "🪑", tag: "POSTURE-CHECK" },
  "stretch": { title: "Stretch Break", body: "Take a quick stretch — neck rolls, wrist stretches, shoulder shrugs.", emoji: "🤸", tag: "STRETCH-BREAK" },
};

// ── Main handler ──
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const cronSecret = Deno.env.get("CRON_SECRET");
    const authHeader = req.headers.get("authorization");
    const providedToken = authHeader?.replace("Bearer ", "");

    if (!cronSecret || providedToken !== cronSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(JSON.stringify({ error: "VAPID keys not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const now = new Date();

    // Find all enabled health reminders where enough time has passed since last_sent_at
    const { data: settings, error: settingsErr } = await supabase
      .from("health_reminder_settings")
      .select("*")
      .eq("enabled", true);

    if (settingsErr) {
      console.error("Error fetching health reminder settings:", settingsErr);
      return new Response(JSON.stringify({ error: "Failed to fetch reminder settings" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!settings || settings.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;

    for (const setting of settings) {
      const meta = REMINDER_META[setting.reminder_id];
      if (!meta) continue;

      // Check if enough time has passed since last notification
      const intervalMs = setting.interval_minutes * 60 * 1000;
      if (setting.last_sent_at) {
        const lastSent = new Date(setting.last_sent_at);
        // Allow 30s tolerance for cron timing
        if (now.getTime() - lastSent.getTime() < intervalMs - 30000) {
          continue;
        }
      }

      // Get push subscriptions for this user
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", setting.user_id);

      // Log to notifications table
      await supabase.from("notifications").insert({
        user_id: setting.user_id,
        title: `${meta.emoji} ${meta.title}`,
        body: meta.body,
        tag: meta.tag,
      });

      if (subs && subs.length > 0) {
        const payload = JSON.stringify({
          title: `${meta.emoji} ${meta.title}`,
          body: meta.body,
          icon: "/icon-512.svg",
          badge: "/icon-512.svg",
          tag: `health-${setting.reminder_id}`,
          data: { url: "/" },
        });

        for (const sub of subs) {
          try {
            const res = await sendPushNotification(
              { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
              payload, vapidPublicKey, vapidPrivateKey,
              "mailto:noreply@goodbye-dopamine.lovable.app"
            );
            if (res.status === 410 || res.status === 404) {
              await supabase.from("push_subscriptions").delete().eq("id", sub.id);
            }
            await res.text();
          } catch (e) {
            console.error("Push send error:", e);
          }
        }
      }

      // Update last_sent_at
      await supabase
        .from("health_reminder_settings")
        .update({ last_sent_at: now.toISOString(), updated_at: now.toISOString() })
        .eq("id", setting.id);

      sentCount++;
    }

    return new Response(JSON.stringify({ sent: sentCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Health reminder error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
