import { useEffect, useRef, useMemo } from 'react';
import Storage from '@/lib/storage';
import { CheckSquare, Clock, TrendingUp, Flag, ArrowLeft, HandCoins, Users } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';

interface ReportsPageProps {
  navigateTo: (page: string) => void;
  refreshKey: number;
}

const ReportsPage = ({ navigateTo, refreshKey }: ReportsPageProps) => {
  const productivityRef = useRef<HTMLCanvasElement>(null);
  const moneyRef = useRef<HTMLCanvasElement>(null);
  const { t } = useI18n();

  const tasks = Storage.getTasks();
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const sessions = Storage.getFocusSessions();
  const totalFocusMin = sessions.reduce((a: number, s: any) => a + (s.duration || 0), 0);
  const txns = Storage.getTransactions();
  const income = txns.filter(t => t.type === 'income').reduce((a: number, t: any) => a + t.amount, 0);
  const expense = txns.filter(t => t.type === 'expense').reduce((a: number, t: any) => a + t.amount, 0);
  const balance = income - expense;

  // ── Lend/Borrow Report Data ──
  const debtReport = useMemo(() => {
    const debts = Storage.getDebts();
    const active = debts.filter((d: any) => !d.settled);
    const settled = debts.filter((d: any) => d.settled);

    let totalLent = 0;
    let totalBorrowed = 0;
    const byPerson: Record<string, { lent: number; borrowed: number; entries: number }> = {};

    for (const d of active) {
      const name = d.person || 'Unknown';
      const amount = Number(d.amount) || 0;
      const dtype = d.debtType || d.debt_type || 'lend';
      if (!byPerson[name]) byPerson[name] = { lent: 0, borrowed: 0, entries: 0 };
      byPerson[name].entries++;
      if (dtype === 'lend') {
        byPerson[name].lent += amount;
        totalLent += amount;
      } else {
        byPerson[name].borrowed += amount;
        totalBorrowed += amount;
      }
    }

    const net = totalLent - totalBorrowed;

    // Sort people by total amount outstanding (descending)
    const people = Object.entries(byPerson)
      .map(([person, data]) => ({
        person,
        ...data,
        net: data.lent - data.borrowed,
      }))
      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));

    const maxAmount = Math.max(...people.map(p => Math.max(p.lent, p.borrowed)), 1);

    return { totalLent, totalBorrowed, net, people, maxAmount, activeCount: active.length, settledCount: settled.length };
  }, [refreshKey]);

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
    <div className="page-enter">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button className="icon-btn !w-9 !h-9" onClick={() => navigateTo('dashboard')}><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('reports.title')}</h1>
            <p className="text-muted-foreground text-sm">{t('reports.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: t('reports.tasks_completed'), value: completedTasks, icon: CheckSquare, color: 'hsl(var(--primary))' },
          { label: t('reports.focus_time'), value: `${totalFocusMin} ${t('reports.min')}`, icon: Clock, color: 'hsl(var(--info))' },
          { label: t('reports.total_income'), value: `৳${income}`, icon: TrendingUp, color: 'hsl(var(--primary))' },
          { label: t('reports.total_expense'), value: `৳${expense}`, icon: Flag, color: 'hsl(var(--destructive))' },
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
          <h3 className="font-semibold text-foreground mb-3">{t('reports.productivity')}</h3>
          <div className="h-[250px]">
            <canvas ref={productivityRef} />
          </div>
        </div>
        <div className="glass-card-accent">
          <h3 className="font-semibold text-foreground mb-3">{t('reports.money_chart')}</h3>
          <div className="flex flex-col items-center">
            <div className="relative h-[200px]">
              <canvas ref={moneyRef} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[0.6rem] text-muted-foreground tracking-widest">{t('reports.balance')}</span>
                <span className="text-lg font-bold text-foreground">৳{balance}</span>
              </div>
            </div>
            <div className="flex gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-primary" /> {t('money.income')} <span className="text-muted-foreground">৳{income}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-destructive" /> {t('money.expense')} <span className="text-muted-foreground">৳{expense}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Lend / Borrow Report ── */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-4">
          <HandCoins className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Lend & Borrow Report</h3>
          {debtReport.activeCount > 0 && (
            <span className="text-[0.6rem] font-bold tracking-wider px-2 py-0.5 rounded-full" style={{ background: 'hsl(var(--warning) / 0.15)', color: 'hsl(var(--warning))' }}>
              {debtReport.activeCount} active
            </span>
          )}
          {debtReport.settledCount > 0 && (
            <span className="text-[0.6rem] font-bold tracking-wider px-2 py-0.5 rounded-full" style={{ background: 'hsl(var(--green) / 0.15)', color: 'hsl(var(--green))' }}>
              {debtReport.settledCount} settled
            </span>
          )}
        </div>

        {/* Debt stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <div className="glass-card-accent flex items-center gap-3 !p-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'hsl(var(--green) / 0.12)', color: 'hsl(var(--green))' }}>
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[0.65rem] font-semibold tracking-widest text-muted-foreground">TOTAL LENT</div>
              <div className="text-lg font-bold" style={{ color: 'hsl(var(--green))' }}>৳{debtReport.totalLent}</div>
            </div>
          </div>
          <div className="glass-card-accent flex items-center gap-3 !p-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'hsl(var(--destructive) / 0.12)', color: 'hsl(var(--destructive))' }}>
              <Flag className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[0.65rem] font-semibold tracking-widest text-muted-foreground">TOTAL BORROWED</div>
              <div className="text-lg font-bold" style={{ color: 'hsl(var(--destructive))' }}>৳{debtReport.totalBorrowed}</div>
            </div>
          </div>
          <div className="glass-card-accent flex items-center gap-3 !p-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `hsl(var(--${debtReport.net >= 0 ? 'primary' : 'warning'}) / 0.12)`, color: `hsl(var(--${debtReport.net >= 0 ? 'primary' : 'warning'}))` }}>
              <HandCoins className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[0.65rem] font-semibold tracking-widest text-muted-foreground">NET POSITION</div>
              <div className="text-lg font-bold" style={{ color: `hsl(var(--${debtReport.net >= 0 ? 'primary' : 'warning'}))` }}>
                {debtReport.net >= 0 ? '+' : ''}৳{debtReport.net}
              </div>
              <div className="text-[0.6rem] text-muted-foreground">
                {debtReport.net > 0 ? 'People owe you' : debtReport.net < 0 ? 'You owe people' : 'All square'}
              </div>
            </div>
          </div>
        </div>

        {/* Per-person breakdown */}
        {debtReport.people.length === 0 ? (
          <div className="glass-card !p-8 text-center">
            <div className="w-14 h-14 rounded-[1.25rem] flex items-center justify-center bg-gradient-to-br from-muted/50 to-muted/20 border border-white/5 shadow-inner mb-4 mx-auto">
              <Users className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">No outstanding debts — you're debt-free! 🎉</p>
          </div>
        ) : (
          <div className="glass-card-accent">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[0.7rem] font-semibold tracking-widest text-muted-foreground uppercase flex items-center gap-2">
                <Users className="w-4 h-4" /> Per-Person Breakdown
              </div>
              <div className="flex gap-4 text-[0.65rem] text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: 'hsl(var(--green))' }} /> Lent</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: 'hsl(var(--destructive))' }} /> Borrowed</span>
              </div>
            </div>
            <div className="space-y-4">
              {debtReport.people.map(p => (
                <div key={p.person}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[0.65rem] font-bold shrink-0"
                        style={{
                          background: `hsl(var(--${p.net > 0 ? 'green' : p.net < 0 ? 'destructive' : 'muted-foreground'}) / 0.15)`,
                          color: `hsl(var(--${p.net > 0 ? 'green' : p.net < 0 ? 'destructive' : 'muted-foreground'}))`,
                        }}>
                        {p.person.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-foreground text-sm truncate">{p.person}</span>
                      <span className="text-[0.6rem] text-muted-foreground shrink-0">({p.entries})</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold" style={{ color: `hsl(var(--${p.net > 0 ? 'green' : p.net < 0 ? 'destructive' : 'muted-foreground'}))` }}>
                        {p.net > 0 ? '+' : ''}৳{p.net}
                      </span>
                      <div className="text-[0.6rem] text-muted-foreground">
                        {p.net > 0 ? 'owes you' : p.net < 0 ? 'you owe' : 'settled'}
                      </div>
                    </div>
                  </div>
                  {/* Bar chart */}
                  <div className="flex gap-1.5 items-center">
                    {p.lent > 0 && (
                      <div className="h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max((p.lent / debtReport.maxAmount) * 100, 4)}%`,
                          background: 'hsl(var(--green))',
                          opacity: 0.8,
                        }}
                        title={`Lent: ৳${p.lent}`}
                      />
                    )}
                    {p.borrowed > 0 && (
                      <div className="h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max((p.borrowed / debtReport.maxAmount) * 100, 4)}%`,
                          background: 'hsl(var(--destructive))',
                          opacity: 0.8,
                        }}
                        title={`Borrowed: ৳${p.borrowed}`}
                      />
                    )}
                    <span className="text-[0.55rem] text-muted-foreground shrink-0 ml-1">
                      {p.lent > 0 && `↑৳${p.lent}`}{p.lent > 0 && p.borrowed > 0 && ' · '}{p.borrowed > 0 && `↓৳${p.borrowed}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;

