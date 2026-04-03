import { useState, useEffect } from 'react';
import appLogo from '@/assets/icon.png';
import { supabase } from '@/integrations/supabase/client';
import AuthScreen from '@/components/gbd/AuthScreen';
import AppShell from '@/components/gbd/AppShell';
import Storage from '@/lib/storage';

const PROFILE_CACHE_KEY = 'cached_profile';

const Index = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        setTimeout(() => fetchProfile(session.user.id), 0);
      } else {
        setProfile(null);
      }
    });

    // Race getSession against a timeout so the app doesn't hang offline
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));

    Promise.race([sessionPromise, timeoutPromise])
      .then((result) => {
        if (result && 'data' in result) {
          const sess = result.data.session;
          setSession(sess);
          if (sess?.user) fetchProfile(sess.user.id);
        } else {
          // Timeout or error — try to use cached profile for offline access
          const cached = Storage.get(PROFILE_CACHE_KEY, null);
          if (cached) {
            setSession({ user: { id: cached.id, email: cached.email, user_metadata: {} } });
            setProfile(cached);
          }
        }
      })
      .catch(() => {
        // Network error — use cached profile
        const cached = Storage.get(PROFILE_CACHE_KEY, null);
        if (cached) {
          setSession({ user: { id: cached.id, email: cached.email, user_metadata: {} } });
          setProfile(cached);
        }
      })
      .finally(() => setLoading(false));

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (data) {
        // Resolve avatar to signed URL for private bucket
        if (data.avatar_url) {
          try {
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
          } catch {
            // Avatar URL resolution failed — keep raw path
          }
        }
        setProfile(data);
        // Cache profile for offline use
        Storage.set(PROFILE_CACHE_KEY, { ...data, email: (await supabase.auth.getUser()).data?.user?.email });
      }
    } catch {
      // Network error — fall back to cached profile
      const cached = Storage.get(PROFILE_CACHE_KEY, null);
      if (cached && cached.id === userId) {
        setProfile(cached);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Offline sign-out — clear local state anyway
    }
    Storage.remove(PROFILE_CACHE_KEY);
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
