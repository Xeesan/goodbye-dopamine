import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Lock, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsRecovery(true);
    }
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });
  }, []);

  const handleReset = async () => {
    if (password.length < 6) { setMessage('Password must be at least 6 characters'); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Password updated! Redirecting...');
      setTimeout(() => navigate('/'), 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{ background: 'hsl(var(--bg-primary))' }}>
      <div className="w-full max-w-[440px] animate-[slideUp_0.5s_ease]">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{
            background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(263 70% 76%))',
          }}>
            <Sparkles className="w-8 h-8 text-black" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground">Set New Password</h1>
          <p className="text-muted-foreground text-sm mt-1">Choose a strong password for your account</p>
        </div>

        <div className="glass-card-accent !p-8">
          {!isRecovery ? (
            <p className="text-center text-muted-foreground text-sm">Invalid or expired recovery link. Please request a new one.</p>
          ) : (
            <>
              <div>
                <label className="form-label">NEW PASSWORD</label>
                <div className="search-input-wrap">
                  <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
                  <input type="password" placeholder="Min 6 characters" value={password} onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleReset()} />
                </div>
              </div>
              <button className="btn-primary-auth mt-5" onClick={handleReset} disabled={loading}>
                {loading ? <span className="animate-pulse">Updating...</span> : <>Update Password <ArrowRight className="w-4 h-4" /></>}
              </button>
            </>
          )}
          {message && (
            <p className={`text-center text-sm mt-4 ${message.includes('updated') ? 'text-primary' : 'text-destructive'}`}>{message}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
