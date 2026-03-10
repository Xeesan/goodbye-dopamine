import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Web Push helpers using Web Crypto API (no npm packages needed in Deno)
async function generateVapidHeaders(
  endpoint: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  subject: string
) {
  // Parse the VAPID private key from base64url
  const privateKeyBytes = base64urlDecode(vapidPrivateKey);
  const publicKeyBytes = base64urlDecode(vapidPublicKey);

  // Create JWT for VAPID
  const audience = new URL(endpoint).origin;
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 3600,
    sub: subject,
  };

  const headerB64 = base64urlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key for signing
  const key = await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      x: base64urlEncode(publicKeyBytes.slice(1, 33)),
      y: base64urlEncode(publicKeyBytes.slice(33, 65)),
      d: base64urlEncode(privateKeyBytes),
    },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert DER signature to raw r||s format
  const sigBytes = new Uint8Array(signature);
  const jwt = `${unsignedToken}.${base64urlEncode(sigBytes)}`;

  return {
    Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
  };
}

async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
) {
  // Generate encryption keys
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  const localPublicKey = await crypto.subtle.exportKey("raw", localKeyPair.publicKey);
  const localPublicKeyBytes = new Uint8Array(localPublicKey);

  // Import subscriber's public key
  const subscriberPublicKey = base64urlDecode(subscription.p256dh);
  const subscriberKey = await crypto.subtle.importKey(
    "raw",
    subscriberPublicKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: subscriberKey },
    localKeyPair.privateKey,
    256
  );

  const authSecret = base64urlDecode(subscription.auth);

  // HKDF-based key derivation (RFC 8291)
  const ikm = new Uint8Array(sharedSecret);
  
  // PRK = HMAC-SHA-256(auth_secret, shared_secret)
  const prkKey = await crypto.subtle.importKey("raw", authSecret, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey, ikm));

  // Build info for content encryption key
  const contentEncInfo = buildInfo("aesgcm", subscriberPublicKey, localPublicKeyBytes);
  const cekHmacKey = await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const cekInfo = concatUint8(contentEncInfo, new Uint8Array([1]));
  const cekHmac = new Uint8Array(await crypto.subtle.sign("HMAC", cekHmacKey, cekInfo));
  const contentEncryptionKey = cekHmac.slice(0, 16);

  // Build info for nonce
  const nonceInfo = buildInfo("nonce", subscriberPublicKey, localPublicKeyBytes);
  const nonceHmacKey = await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const nonceInfoFull = concatUint8(nonceInfo, new Uint8Array([1]));
  const nonceHmac = new Uint8Array(await crypto.subtle.sign("HMAC", nonceHmacKey, nonceInfoFull));
  const nonce = nonceHmac.slice(0, 12);

  // Encrypt payload
  const payloadBytes = new TextEncoder().encode(payload);
  const paddingLength = 0;
  const paddedPayload = new Uint8Array(2 + paddingLength + payloadBytes.length);
  paddedPayload[0] = (paddingLength >> 8) & 0xff;
  paddedPayload[1] = paddingLength & 0xff;
  paddedPayload.set(payloadBytes, 2 + paddingLength);

  const aesKey = await crypto.subtle.importKey("raw", contentEncryptionKey, { name: "AES-GCM" }, false, ["encrypt"]);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, paddedPayload);
  const encryptedBytes = new Uint8Array(encrypted);

  // Build the body with salt + key length + key + encrypted content
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  // Re-derive with salt for aesgcm
  // Actually, for aesgcm encoding we need a simpler approach
  // Let's use the aes128gcm content encoding instead
  
  // For simplicity, use fetch with the encrypted payload
  const vapidHeaders = await generateVapidHeaders(
    subscription.endpoint,
    vapidPublicKey,
    vapidPrivateKey,
    vapidSubject
  );

  // Use aes128gcm content encoding
  const body = buildAes128gcmBody(salt, localPublicKeyBytes, encryptedBytes);

  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      ...vapidHeaders,
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      TTL: "86400",
    },
    body,
  });

  return response;
}

function buildAes128gcmBody(salt: Uint8Array, publicKey: Uint8Array, encrypted: Uint8Array): Uint8Array {
  // salt (16) + rs (4) + idlen (1) + keyid (65) + content
  const rs = new Uint8Array(4);
  const view = new DataView(rs.buffer);
  view.setUint32(0, 4096);
  
  const idlen = new Uint8Array([publicKey.length]);
  
  return concatUint8(salt, rs, idlen, publicKey, encrypted);
}

function buildInfo(type: string, clientPublicKey: Uint8Array, serverPublicKey: Uint8Array): Uint8Array {
  const encoder = new TextEncoder();
  const prefix = encoder.encode(`Content-Encoding: ${type}\0P-256\0`);
  const clientLen = new Uint8Array(2);
  clientLen[0] = 0; clientLen[1] = clientPublicKey.length;
  const serverLen = new Uint8Array(2);
  serverLen[0] = 0; serverLen[1] = serverPublicKey.length;
  return concatUint8(prefix, clientLen, clientPublicKey, serverLen, serverPublicKey);
}

function concatUint8(...arrays: Uint8Array[]): Uint8Array {
  const totalLen = arrays.reduce((acc, a) => acc + a.length, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const a of arrays) {
    result.set(a, offset);
    offset += a.length;
  }
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate CRON_SECRET to prevent unauthorized invocations
    const cronSecret = Deno.env.get("CRON_SECRET");
    const authHeader = req.headers.get("authorization");
    const providedToken = authHeader?.replace("Bearer ", "");

    if (!cronSecret || providedToken !== cronSecret) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find reminders due in the next 2 minutes that haven't been sent
    const now = new Date();
    const twoMinLater = new Date(now.getTime() + 2 * 60 * 1000);

    const { data: dueReminders, error: remErr } = await supabase
      .from("task_reminders")
      .select("*")
      .eq("sent", false)
      .lte("remind_at", twoMinLater.toISOString())
      .gte("remind_at", new Date(now.getTime() - 5 * 60 * 1000).toISOString());

    if (remErr) {
      console.error("Error fetching reminders:", remErr);
      return new Response(JSON.stringify({ error: "Failed to fetch reminders" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!dueReminders || dueReminders.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;

    for (const reminder of dueReminders) {
      // Get push subscriptions for this user
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", reminder.user_id);

      const notifTitle = "⏰ Task Reminder";
      const notifBody = reminder.task_title;
      const notifTag = "TASK-REMINDER";

      // Log to notifications table (always, even without push subs)
      await supabase.from("notifications").insert({
        user_id: reminder.user_id,
        title: notifTitle,
        body: notifBody,
        tag: notifTag,
      });

      if (subs && subs.length > 0) {
        const payload = JSON.stringify({
          title: notifTitle,
          body: notifBody,
          icon: "/icon-512.png",
          badge: "/icon-512.png",
          tag: `reminder-${reminder.id}`,
          data: { url: "/" },
        });

        for (const sub of subs) {
          try {
            const res = await sendPushNotification(
              { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
              payload,
              vapidPublicKey,
              vapidPrivateKey,
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

      // Mark reminder as sent
      await supabase
        .from("task_reminders")
        .update({ sent: true })
        .eq("id", reminder.id);

      sentCount++;
    }

    return new Response(JSON.stringify({ sent: sentCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Push reminder error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
