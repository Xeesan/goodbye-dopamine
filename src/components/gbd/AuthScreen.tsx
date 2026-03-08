import { useState } from 'react';
import { User, Lock, Mail, AtSign, Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const AuthScreen = ({ onAuthSuccess }: { onAuthSuccess: () => void }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null);

  const showToast = (msg: string, type: 'error' | 'success' = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      showToast('Please enter both email and password');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim(),
    });
    setLoading(false);
    if (error) {
      showToast(error.message);
    } else {
      onAuthSuccess();
    }
  };

  const handleSignup = async () => {
    if (!username.trim()) { showToast('Please choose a username'); return; }
    if (username.trim().length < 3) { showToast('Username must be at least 3 characters'); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) { showToast('Username can only contain letters, numbers, and underscores'); return; }
    if (!email.trim()) { showToast('Please enter your email'); return; }
    if (!password.trim() || password.length < 6) { showToast('Password must be at least 6 characters'); return; }

    setLoading(true);

    // Check if username is taken
    const { data: existing } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username.trim().toLowerCase())
      .maybeSingle();

    if (existing) {
      setLoading(false);
      showToast('Username is already taken');
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password.trim(),
      options: {
        data: {
          username: username.trim().toLowerCase(),
          full_name: fullName.trim() || username.trim(),
        },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      showToast(error.message);
    } else {
      showToast('Account created! Welcome aboard 🎉', 'success');
      onAuthSuccess();
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) { showToast('Please enter your email'); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      showToast(error.message);
    } else {
      showToast('Password reset link sent! Check your inbox.', 'success');
      setMode('login');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (mode === 'login') handleLogin();
      else if (mode === 'signup') handleSignup();
      else handleForgotPassword();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{
      background: `radial-gradient(ellipse at top left, hsl(187 82% 53% / 0.06) 0%, transparent 50%),
        radial-gradient(ellipse at bottom right, hsl(263 70% 76% / 0.06) 0%, transparent 50%),
        hsl(var(--bg-primary))`
    }}>
      <div className="w-full max-w-[440px] animate-[slideUp_0.5s_ease]" onKeyDown={handleKeyDown}>
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{
            background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(263 70% 76%))',
            boxShadow: '0 8px 32px hsl(var(--primary) / 0.3)',
          }}>
            <Sparkles className="w-8 h-8 text-black" />
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">GBD</h1>
          <p className="text-muted-foreground text-sm mt-1">Good Bye Dopamine</p>
        </div>

        <div className="glass-card-accent !p-8">
          {mode === 'login' && (
            <>
              <h2 className="text-xl font-bold text-foreground mb-1">Welcome back</h2>
              <p className="text-muted-foreground text-sm mb-6">Sign in to your account</p>

              <div className="space-y-4">
                <div>
                  <label className="form-label">EMAIL</label>
                  <div className="search-input-wrap">
                    <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                    <input type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
                  </div>
                </div>
                <div>
                  <label className="form-label">PASSWORD</label>
                  <div className="search-input-wrap">
                    <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
                    <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-2">
                <button className="text-xs text-primary hover:underline font-medium" onClick={() => setMode('forgot')}>Forgot password?</button>
              </div>

              <button className="btn-primary-auth mt-5" onClick={handleLogin} disabled={loading}>
                {loading ? <span className="animate-pulse">Signing in...</span> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
              </button>

              <p className="text-center text-muted-foreground text-sm mt-5">
                Don't have an account?{' '}
                <button className="text-primary font-semibold hover:underline" onClick={() => setMode('signup')}>Create one</button>
              </p>
            </>
          )}

          {mode === 'signup' && (
            <>
              <h2 className="text-xl font-bold text-foreground mb-1">Create your account</h2>
              <p className="text-muted-foreground text-sm mb-6">Start your productivity journey</p>

              <div className="space-y-4">
                <div>
                  <label className="form-label">USERNAME</label>
                  <div className="search-input-wrap">
                    <AtSign className="w-4 h-4 text-muted-foreground shrink-0" />
                    <input type="text" placeholder="choose_a_username" value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} autoComplete="username" />
                  </div>
                  <p className="text-[0.65rem] text-muted-foreground mt-1">Letters, numbers, and underscores only</p>
                </div>
                <div>
                  <label className="form-label">FULL NAME <span className="text-muted-foreground font-normal">(optional)</span></label>
                  <div className="search-input-wrap">
                    <User className="w-4 h-4 text-muted-foreground shrink-0" />
                    <input type="text" placeholder="Your name" value={fullName} onChange={e => setFullName(e.target.value)} autoComplete="name" />
                  </div>
                </div>
                <div>
                  <label className="form-label">EMAIL</label>
                  <div className="search-input-wrap">
                    <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                    <input type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
                  </div>
                </div>
                <div>
                  <label className="form-label">PASSWORD</label>
                  <div className="search-input-wrap">
                    <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
                    <input type={showPassword ? 'text' : 'password'} placeholder="Min 6 characters" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <button className="btn-primary-auth mt-6" onClick={handleSignup} disabled={loading}>
                {loading ? <span className="animate-pulse">Creating account...</span> : <>Create Account <ArrowRight className="w-4 h-4" /></>}
              </button>

              <p className="text-center text-muted-foreground text-sm mt-5">
                Already have an account?{' '}
                <button className="text-primary font-semibold hover:underline" onClick={() => setMode('login')}>Sign in</button>
              </p>
            </>
          )}

          {mode === 'forgot' && (
            <>
              <h2 className="text-xl font-bold text-foreground mb-1">Reset password</h2>
              <p className="text-muted-foreground text-sm mb-6">We'll send you a reset link</p>

              <div>
                <label className="form-label">EMAIL</label>
                <div className="search-input-wrap">
                  <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                  <input type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
                </div>
              </div>

              <button className="btn-primary-auth mt-6" onClick={handleForgotPassword} disabled={loading}>
                {loading ? <span className="animate-pulse">Sending...</span> : <>Send Reset Link <ArrowRight className="w-4 h-4" /></>}
              </button>

              <p className="text-center text-muted-foreground text-sm mt-5">
                Remember your password?{' '}
                <button className="text-primary font-semibold hover:underline" onClick={() => setMode('login')}>Sign in</button>
              </p>
            </>
          )}
        </div>

        <p className="text-center text-[0.65rem] text-muted-foreground mt-6 tracking-wider">BUILT WITH ❤️ FOR STUDENTS</p>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] animate-[slideUp_0.2s_ease]">
          <div className="px-5 py-3 rounded-xl text-sm font-medium text-foreground flex items-center gap-2" style={{
            background: 'hsl(var(--bg-card))',
            border: `1px solid ${toast.type === 'error' ? 'hsl(var(--destructive) / 0.5)' : 'hsl(var(--primary) / 0.5)'}`,
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          }}>
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: toast.type === 'error' ? 'hsl(var(--destructive))' : 'hsl(var(--primary))' }} />
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthScreen;
