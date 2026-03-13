import { useState, useEffect } from 'react';
import appLogo from '@/assets/icon.png';
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
    if (data) {
      // Resolve avatar to signed URL for private bucket
      if (data.avatar_url) {
        let avatarPath = data.avatar_url;
        if (avatarPath.startsWith('http')) {
          const match = avatarPath.match(/\/avatars\/(.+)$/);
          if (match) avatarPath = match[1];
        }
        const { data: signedData } = await supabase.storage
          .from('avatars')
          .createSignedUrl(avatarPath, 3600);
        if (signedData?.signedUrl) {
          data.avatar_url = signedData.signedUrl;
        }
      }
      setProfile(data);
    }
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
          <img src={appLogo} alt="GBD Logo" className="w-12 h-12 rounded-xl mx-auto mb-3" />
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
