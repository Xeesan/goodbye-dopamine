import { supabase } from '@/integrations/supabase/client';

const VAPID_PUBLIC_KEY = 'BEvv_DQlgESnuny_tpxsI3Q49DztH_DwMFvmUYh1xZEBp0bPJBLjfpxXB5WsNUr5KZKtEfjSj6BX-hWFbovsTnI';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (c) => c.charCodeAt(0));
}

export async function isPushSupported(): Promise<boolean> {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function getPushPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  return await Notification.requestPermission();
}

export async function subscribeToPush(): Promise<boolean> {
  try {
    if (!(await isPushSupported())) return false;

    const permission = await requestPushPermission();
    if (permission !== 'granted') return false;

    const registration = await navigator.serviceWorker.ready;
    
    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      const appServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey.buffer as ArrayBuffer,
      });
    }

    const subJson = subscription.toJSON();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Save to database
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: user.id,
        endpoint: subJson.endpoint!,
        p256dh: subJson.keys!.p256dh!,
        auth: subJson.keys!.auth!,
      },
      { onConflict: 'user_id,endpoint' }
    );

    if (error) {
      console.error('Failed to save push subscription:', error);
      return false;
    }

    return true;
  } catch (e) {
    console.error('Push subscription error:', e);
    return false;
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', endpoint);
      }
    }
  } catch (e) {
    console.error('Push unsubscribe error:', e);
  }
}

export async function isSubscribedToPush(): Promise<boolean> {
  try {
    if (!(await isPushSupported())) return false;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}
