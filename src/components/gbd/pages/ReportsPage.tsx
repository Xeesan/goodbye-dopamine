import { useEffect, useRef } from 'react';
import Storage from '@/lib/storage';
import { CheckSquare, Clock, TrendingUp, Flag, ArrowLeft } from 'lucide-react';

interface ReportsPageProps {
  navigateTo: (page: string) => void;
  refreshKey: number;
}

const ReportsPage = ({ navigateTo }: ReportsPageProps) => {
  const productivityRef = useRef<HTMLCanvasElement>(null);
  const moneyRef = useRef<HTMLCanvasElement>(null);

  const tasks = Storage.getTasks();
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const sessions = Storage.getFocusSessions();
  const totalFocusMin = sessions.reduce((a: number, s: any) => a + (s.duration || 0), 0);
  const txns = Storage.getTransactions();
  const income = txns.filter(t => t.type === 'income').reduce((a: number, t: any) => a + t.amount, 0);
  const expense = txns.filter(t => t.type === 'expense').reduce((a: number, t: any) => a + t.amount, 0);
  const balance = income - expense;

  useEffect(() => {
    // Productivity chart
    const canvas = productivityRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      const w = canvas.width, h = canvas.height, p = 40;

      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      for (let i = 0; i <= 5; i++) {
        const y = p + (h - p * 2) * (1 - i / 5);
        ctx.beginPath(); ctx.moveTo(p, y); ctx.lineTo(w - 10, y); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '11px Inter';
        ctx.textAlign = 'right';
        ctx.fillText(i.toString(), p - 8, y + 4);
      }
      ctx.setLineDash([]);

      const days: string[] = [];
      const data: number[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        days.push(d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }));
        const dayStr = d.toDateString();
        const dayScore = sessions.filter((s: any) => new Date(s.date).toDateString() === dayStr)
          .reduce((a: number, s: any) => a + (s.duration || 0), 0) / 60;
        data.push(Math.min(dayScore, 5));
      }

      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '11px Inter';
      ctx.textAlign = 'center';
      days.forEach((label, i) => {
        const x = p + (w - p * 2) * (i / (days.length - 1));
        ctx.fillText(label, x, h - 10);
      });

      if (data.some(d => d > 0)) {
        ctx.strokeStyle = '#00FF88';
        ctx.lineWidth = 2;
        ctx.beginPath();
        data.forEach((val, i) => {
          const x = p + (w - p * 2) * (i / (data.length - 1));
          const y = p + (h - p * 2) * (1 - val / 5);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();
        data.forEach((val, i) => {
          const x = p + (w - p * 2) * (i / (data.length - 1));
          const y = p + (h - p * 2) * (1 - val / 5);
          ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#00FF88'; ctx.fill();
        });
      }
    }

    // Money chart
    const mCanvas = moneyRef.current;
    if (mCanvas) {
      const ctx = mCanvas.getContext('2d');
      if (!ctx) return;
      const size = Math.min(mCanvas.parentElement!.offsetWidth, 200);
      mCanvas.width = size; mCanvas.height = size;
      const cx = size / 2, cy = size / 2, r = size / 2 - 20, ir = r * 0.65;
      const total = income + expense;
      if (total === 0) {
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.arc(cx, cy, ir, 0, Math.PI * 2, true);
        ctx.fillStyle = 'rgba(0,255,136,0.2)'; ctx.fill();
      } else {
        const ia = (income / total) * Math.PI * 2;
        ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + ia);
        ctx.arc(cx, cy, ir, -Math.PI / 2 + ia, -Math.PI / 2, true);
        ctx.closePath(); ctx.fillStyle = '#00FF88'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2 + ia, -Math.PI / 2 + Math.PI * 2);
        ctx.arc(cx, cy, ir, -Math.PI / 2 + Math.PI * 2, -Math.PI / 2 + ia, true);
        ctx.closePath(); ctx.fillStyle = '#ff4757'; ctx.fill();
      }
    }
  }, [sessions, income, expense]);

  return (
    <div className="page-enter max-w-[1200px] mx-auto">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button className="icon-btn !w-9 !h-9" onClick={() => navigateTo('dashboard')}><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reports</h1>
            <p className="text-muted-foreground text-sm">Activity Overview</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'TASKS COMPLETED', value: completedTasks, icon: CheckSquare, color: 'hsl(var(--primary))' },
          { label: 'FOCUS TIME', value: `${totalFocusMin} min`, icon: Clock, color: 'hsl(var(--info))' },
          { label: 'TOTAL INCOME', value: `৳${income}`, icon: TrendingUp, color: 'hsl(var(--primary))' },
          { label: 'TOTAL EXPENSE', value: `৳${expense}`, icon: Flag, color: 'hsl(var(--destructive))' },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="glass-card-accent flex items-center gap-3 !p-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${stat.color}15`, color: stat.color }}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[0.65rem] font-semibold tracking-widest text-muted-foreground">{stat.label}</div>
                <div className="text-lg font-bold text-foreground">{stat.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card-accent">
          <h3 className="font-semibold text-foreground mb-3">Productivity Score</h3>
          <div className="h-[250px]">
            <canvas ref={productivityRef} />
          </div>
        </div>
        <div className="glass-card-accent">
          <h3 className="font-semibold text-foreground mb-3">Money</h3>
          <div className="flex flex-col items-center">
            <div className="relative h-[200px]">
              <canvas ref={moneyRef} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[0.6rem] text-muted-foreground tracking-widest">BALANCE</span>
                <span className="text-lg font-bold text-foreground">৳{balance}</span>
              </div>
            </div>
            <div className="flex gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-primary" /> Income <span className="text-muted-foreground">৳{income}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-destructive" /> Expense <span className="text-muted-foreground">৳{expense}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
