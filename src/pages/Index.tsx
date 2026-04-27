import { useState, useEffect } from 'react';
import appLogo from '@/assets/icon.png';
import { supabase } from '@/integrations/supabase/client';
import AuthScreen from '@/components/gbd/AuthScreen';
import AppShell from '@/components/gbd/AppShell';
import Storage from '@/lib/storage';

const PROFILE_CACHE_KEY = 'cached_profile';

// Synchronously read Supabase's persisted session from localStorage so the app
// can render instantly on cold start without waiting for getSession() to resolve.
const readPersistedSession = (): any => {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        // supabase-js stores either the session directly or wrapped
        const sess = parsed?.currentSession || parsed?.session || parsed;
        if (sess?.user?.id) return sess;
      }
    }
  } catch {}
  return null;
};

const Index = () => {
  // Initialize from cache synchronously — no spinner needed if we already have a session
  const [session, setSession] = useState<any>(() => {
    const persisted = readPersistedSession();
    if (persisted) return persisted;
    const cached = Storage.get(PROFILE_CACHE_KEY, null);
    if (cached) return { user: { id: cached.id, email: cached.email, user_metadata: {} } };
    return null;
  });
  const [profile, setProfile] = useState<any>(() => Storage.get(PROFILE_CACHE_KEY, null));
  const [loading, setLoading] = useState(() => !readPersistedSession() && !Storage.get(PROFILE_CACHE_KEY, null));

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        setTimeout(() => fetchProfile(session.user.id), 0);
      } else {
        setProfile(null);
      }
    });

    // Background session validation — never blocks UI
    supabase.auth.getSession()
      .then(({ data }) => {
        const sess = data.session;
        if (sess) {
          setSession(sess);
          fetchProfile(sess.user.id);
        }
      })
      .catch(() => { /* offline — keep cached session */ })
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
