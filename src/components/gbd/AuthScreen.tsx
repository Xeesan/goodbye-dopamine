import { useState } from 'react';
import { User, Lock, QrCode, Bell } from 'lucide-react';

interface AuthScreenProps {
  onLogin: (uid: string, password: string) => void;
  onSignup: (name: string, password: string) => void;
}

const AuthScreen = ({ onLogin, onSignup }: AuthScreenProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{
      background: `radial-gradient(ellipse at top left, hsl(187 82% 53% / 0.04) 0%, transparent 50%),
        radial-gradient(ellipse at bottom right, hsl(263 70% 76% / 0.04) 0%, transparent 50%),
        hsl(var(--bg-primary))`
    }}>
      <div className="glass-card-accent w-full max-w-[440px] p-10 animate-[slideUp_0.5s_ease]">
        <div className="w-16 h-16 rounded-[var(--radius)] flex items-center justify-center mx-auto mb-6" style={{ background: 'hsl(var(--accent-dim))' }}>
          <User className="w-10 h-10" style={{ stroke: 'hsl(var(--primary))' }} />
        </div>

        {isLogin ? (
          <div>
            <h1 className="text-center text-[1.75rem] font-bold mb-2 text-foreground">Welcome to GBD</h1>
            <p className="text-center text-muted-foreground text-sm mb-8">Enter your Unique ID to continue</p>
            <div className="search-input-wrap mb-4">
              <User className="w-5 h-5 text-muted-foreground" />
              <input type="text" placeholder="Unique ID" value={loginId} onChange={e => setLoginId(e.target.value)} autoComplete="off" />
            </div>
            <div className="search-input-wrap mb-6">
              <Lock className="w-5 h-5 text-muted-foreground" />
              <input type="password" placeholder="Password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
            </div>
            <button className="btn-primary-auth" onClick={() => onLogin(loginId.trim(), loginPassword.trim())}>Sign In <span>→</span></button>
            <div className="flex items-center gap-4 my-5">
              <div className="flex-1 h-px" style={{ background: 'hsl(var(--border))' }} />
              <span className="text-xs text-muted-foreground">OR</span>
              <div className="flex-1 h-px" style={{ background: 'hsl(var(--border))' }} />
            </div>
            <button className="btn-outline w-full flex items-center justify-center gap-2" onClick={() => showToast('QR Login feature coming soon!')}>
              <QrCode className="w-5 h-5 text-primary" /> QR Login
            </button>
            <p className="text-center text-muted-foreground text-sm mt-5">
              Don't have an account?{' '}
              <button className="text-primary font-medium hover:underline" onClick={() => setIsLogin(false)}>Sign Up</button>
            </p>
          </div>
        ) : (
          <div>
            <h1 className="text-center text-[1.75rem] font-bold mb-2 text-foreground">Create Account</h1>
            <p className="text-center text-muted-foreground text-sm mb-8">Enter your details to start</p>
            <div className="search-input-wrap mb-4">
              <User className="w-5 h-5 text-muted-foreground" />
              <input type="text" placeholder="Full Name" value={signupName} onChange={e => setSignupName(e.target.value)} />
            </div>
            <div className="search-input-wrap mb-6">
              <Lock className="w-5 h-5 text-muted-foreground" />
              <input type="password" placeholder="Password" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} />
            </div>
            <button className="btn-primary-auth" onClick={() => onSignup(signupName.trim(), signupPassword.trim())}>Sign Up <span>→</span></button>
            <p className="text-center text-muted-foreground text-sm mt-5">
              Already have an account?{' '}
              <button className="text-primary font-medium hover:underline" onClick={() => setIsLogin(true)}>Sign In</button>
            </p>
          </div>
        )}

        <div className="mt-6 pt-5" style={{ borderTop: '1px solid hsl(var(--border))' }}>
          <button className="btn-outline w-full flex items-center justify-center gap-2 text-xs tracking-wider" onClick={() => {
            if ('Notification' in window) Notification.requestPermission();
            showToast('Notifications enabled!');
          }}>
            <Bell className="w-4 h-4 text-primary" /> ENABLE NOTIFICATIONS
          </button>
          <p className="text-center text-[0.65rem] text-muted-foreground mt-2 tracking-wider">RECOMMENDED FOR ROUTINE & EXAM ALERTS</p>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] animate-[slideUp_0.2s_ease]">
          <div className="px-5 py-3 rounded-xl text-sm font-medium text-foreground" style={{ background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border))', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
            {toast}
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthScreen;
