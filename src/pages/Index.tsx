import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AuthScreen from '@/components/gbd/AuthScreen';
import AppShell from '@/components/gbd/AppShell';

const Index = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        // Defer profile fetch to avoid deadlock
        setTimeout(() => fetchProfile(session.user.id), 0);
      } else {
        setProfile(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) setProfile(data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'hsl(var(--bg-primary))' }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{
            background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(263 70% 76%))',
          }}>
            <span className="text-black font-extrabold text-lg">G</span>
          </div>
          <p className="text-muted-foreground text-sm animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <AuthScreen onAuthSuccess={() => {}} />;
  }

  const user = {
    id: session.user.id,
    email: session.user.email,
    username: profile?.username || session.user.user_metadata?.username || 'user',
    name: profile?.full_name || session.user.user_metadata?.full_name || '',
    ...profile,
  };

  return <AppShell user={user} onLogout={handleLogout} />;
};

export default Index;
