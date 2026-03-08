import { useState, useEffect } from 'react';
import { isPushSupported, isSubscribedToPush, subscribeToPush, unsubscribeFromPush, getPushPermission } from '@/lib/pushNotifications';
import { Bell, BellOff } from 'lucide-react';

const NotificationToggle = () => {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    (async () => {
      const sup = await isPushSupported();
      setSupported(sup);
      if (sup) {
        setSubscribed(await isSubscribedToPush());
        setPermission(await getPushPermission());
      }
    })();
  }, []);

  const toggle = async () => {
    setLoading(true);
    try {
      if (subscribed) {
        await unsubscribeFromPush();
        setSubscribed(false);
      } else {
        const success = await subscribeToPush();
        setSubscribed(success);
        setPermission(await getPushPermission());
      }
    } finally {
      setLoading(false);
    }
  };

  if (!supported) return null;

  return (
    <button
      onClick={toggle}
      disabled={loading || permission === 'denied'}
      className="flex items-center gap-3 w-full glass-card !p-4 hover:!border-primary/20 transition-all disabled:opacity-50"
    >
      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: subscribed ? 'hsl(var(--green) / 0.15)' : 'hsl(var(--muted))' }}>
        {subscribed ? <Bell className="w-5 h-5 text-green-500" /> : <BellOff className="w-5 h-5 text-muted-foreground" />}
      </div>
      <div className="flex-1 text-left">
        <div className="font-semibold text-foreground text-sm">
          {loading ? 'Setting up...' : subscribed ? 'Notifications On' : 'Enable Notifications'}
        </div>
        <div className="text-xs text-muted-foreground">
          {permission === 'denied'
            ? 'Blocked by browser — enable in site settings'
            : subscribed
              ? 'You'll receive task reminders even when the app is closed'
              : 'Get reminded about upcoming tasks'}
        </div>
      </div>
      <div className={`w-12 h-7 rounded-full p-1 transition-colors ${subscribed ? 'bg-green-500' : 'bg-muted'}`}>
        <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${subscribed ? 'translate-x-5' : 'translate-x-0'}`} />
      </div>
    </button>
  );
};

export default NotificationToggle;
