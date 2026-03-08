import { useState } from 'react';
import { getHealthReminders, saveHealthReminders, type HealthReminder } from '@/hooks/useHealthReminders';
import { Bell, BellOff, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { requestPushPermission, isPushSupported } from '@/lib/pushNotifications';

interface HealthRemindersCardProps {
  onRestartReminders: () => void;
}

const HealthRemindersCard = ({ onRestartReminders }: HealthRemindersCardProps) => {
  const [reminders, setReminders] = useState<HealthReminder[]>(getHealthReminders);

  const toggleReminder = async (id: string) => {
    const updated = reminders.map(r =>
      r.id === id ? { ...r, enabled: !r.enabled } : r
    );

    // If enabling, ensure notification permission
    const target = updated.find(r => r.id === id);
    if (target?.enabled) {
      if (await isPushSupported()) {
        const perm = await requestPushPermission();
        if (perm === 'denied') {
          toast({
            title: 'Notifications blocked',
            description: 'Enable notifications in your browser settings.',
            variant: 'destructive',
          });
          return;
        }
      }
    }

    setReminders(updated);
    saveHealthReminders(updated);
    onRestartReminders();

    toast({
      title: target?.enabled ? `${target.emoji} ${target.title} enabled` : `${target?.title} disabled`,
      description: target?.enabled ? `Every ${target.intervalMinutes} minutes` : 'Reminder turned off',
    });
  };

  const enableAll = async () => {
    if (await isPushSupported()) {
      const perm = await requestPushPermission();
      if (perm === 'denied') {
        toast({ title: 'Notifications blocked', description: 'Enable in browser settings.', variant: 'destructive' });
        return;
      }
    }
    const updated = reminders.map(r => ({ ...r, enabled: true }));
    setReminders(updated);
    saveHealthReminders(updated);
    onRestartReminders();
    toast({ title: 'All health reminders enabled', description: 'Stay healthy!' });
  };

  const disableAll = () => {
    const updated = reminders.map(r => ({ ...r, enabled: false }));
    setReminders(updated);
    saveHealthReminders(updated);
    onRestartReminders();
    toast({ title: 'All reminders disabled' });
  };

  const activeCount = reminders.filter(r => r.enabled).length;

  return (
    <div className="glass-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" /> Health Reminders
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[0.65rem] font-bold tracking-wider text-muted-foreground">
            {activeCount}/{reminders.length} ACTIVE
          </span>
          {activeCount < reminders.length ? (
            <button
              className="text-[0.65rem] font-bold tracking-wider px-2 py-0.5 rounded-full transition-colors"
              style={{ background: 'hsl(var(--primary) / 0.15)', color: 'hsl(var(--primary))' }}
              onClick={enableAll}
            >
              ALL ON
            </button>
          ) : (
            <button
              className="text-[0.65rem] font-bold tracking-wider px-2 py-0.5 rounded-full transition-colors"
              style={{ background: 'hsl(var(--destructive) / 0.12)', color: 'hsl(var(--destructive))' }}
              onClick={disableAll}
            >
              ALL OFF
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-4">
        Science-backed reminders to maintain your health while studying. Notifications fire at set intervals when the app is open.
      </p>

      <div className="flex flex-col gap-2">
        {reminders.map(r => (
          <button
            key={r.id}
            onClick={() => toggleReminder(r.id)}
            className="flex items-center gap-3 p-3 rounded-[var(--radius-sm)] transition-all text-left w-full group hover:scale-[1.01]"
            style={{
              background: r.enabled ? 'hsl(var(--accent-dim))' : 'transparent',
              border: `1px solid ${r.enabled ? 'hsl(var(--primary) / 0.2)' : 'hsl(var(--border))'}`,
            }}
          >
            <span className="text-xl shrink-0">{r.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground text-sm">{r.title}</span>
                {r.enabled && (
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: 'hsl(var(--primary))' }} />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{r.body}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="flex items-center gap-1 text-[0.65rem] font-bold text-muted-foreground">
                <Clock className="w-3 h-3" /> {r.intervalMinutes}m
              </span>
              <div className={`w-10 h-6 rounded-full p-0.5 transition-colors ${r.enabled ? 'bg-primary' : 'bg-muted'}`}>
                <div className={`w-5 h-5 rounded-full shadow transition-transform ${r.enabled ? 'translate-x-4 bg-primary-foreground' : 'translate-x-0 bg-foreground/50'}`} />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default HealthRemindersCard;
