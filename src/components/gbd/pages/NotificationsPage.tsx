import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Bell, Trash2, CheckCheck } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import NotificationToggle from '../NotificationToggle';

interface NotificationsPageProps {
  navigateTo: (page: string) => void;
  refreshKey: number;
}

interface Notification {
  id: string;
  title: string;
  body: string;
  tag: string;
  read: boolean;
  created_at: string;
}

const NotificationsPage = ({ navigateTo }: NotificationsPageProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setNotifications(data as Notification[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast({ title: 'All marked as read' });
  };

  const deleteNotification = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('notifications').delete().eq('user_id', user.id);
    setNotifications([]);
    toast({ title: 'All notifications cleared' });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const year = d.getFullYear();
    const hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h = hours % 12 || 12;
    return `${month}/${day}/${year} • ${h}:${minutes} ${ampm}`;
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="page-enter">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button className="icon-btn !w-9 !h-9" onClick={() => navigateTo('dashboard')}>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
            <p className="text-muted-foreground text-sm">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
        </div>
        {notifications.length > 0 && (
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-full text-[0.7rem] font-semibold tracking-wide transition-all border-none cursor-pointer"
                style={{ background: 'hsl(var(--primary) / 0.15)', color: 'hsl(var(--primary))' }}
                onClick={markAllRead}
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
            <button
              className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-full text-[0.7rem] font-semibold tracking-wide transition-all border-none cursor-pointer"
              style={{ background: 'hsl(var(--destructive) / 0.12)', color: 'hsl(var(--destructive))' }}
              onClick={clearAll}
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear all
            </button>
          </div>
        )}
      </div>

      {/* Push toggle */}
      <div className="mb-5">
        <NotificationToggle />
      </div>

      {/* Notification list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="empty-state !py-16">
          <Bell className="w-12 h-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm mb-1">No notifications yet</p>
          <p className="text-muted-foreground text-xs">Create tasks with reminders to see them here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notifications.map(n => (
            <div
              key={n.id}
              className="glass-card !p-5 group hover:!border-primary/20 transition-all relative"
              style={{
                borderLeft: `3px solid ${n.read ? 'hsl(var(--border))' : 'hsl(var(--primary))'}`,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="font-bold text-foreground text-[0.95rem]">{n.title}</h3>
                    {!n.read && (
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: 'hsl(var(--primary))' }} />
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm mb-3 leading-relaxed">{n.body}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatDate(n.created_at)}</span>
                    {n.tag && (
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[0.65rem] font-bold tracking-wider uppercase"
                        style={{ background: 'hsl(var(--accent-dim))', color: 'hsl(var(--foreground))' }}
                      >
                        {n.tag}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-destructive/10"
                  onClick={() => deleteNotification(n.id)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
