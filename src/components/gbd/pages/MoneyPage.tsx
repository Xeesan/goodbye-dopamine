import { useState, useCallback, useEffect } from 'react';
import Storage from '@/lib/storage';
import { syncTransactionsFromDB, addTransactionToDB, deleteTransactionFromDB, syncDebtsFromDB, addDebtToDB, settleDebtInDB, deleteDebtFromDB } from '@/lib/dbSync';
import { formatDate } from '@/lib/helpers';
import { ArrowLeft, Search, Star, X, Check, CheckCheck, Trash2, CalendarDays, Settings2, CreditCard, CircleCheck } from 'lucide-react';
import { useDialog } from '../DialogProvider';
import { toast } from '@/hooks/use-toast';
import { useGamification } from '@/hooks/useGamification';
import { useI18n } from '@/hooks/useI18n';
import { differenceInDays, parseISO, isWithinInterval, startOfWeek, endOfWeek, format, addMonths, isBefore } from 'date-fns';

interface Installment {
  id: string;
  amount: number;
  paidDate: string;
}

interface SemesterBudget {
  totalFee: number;
  monthlyInstallment: number;
  semesterMonths: number; // e.g. 4, 6
  startDate: string;
  installments: Installment[];
  livingBudget: number;
}

interface MoneyPageProps {
  navigateTo: (page: string) => void;
  refreshKey: number;
}

const MoneyPage = ({ navigateTo, refreshKey }: MoneyPageProps) => {
  const [moneyTab, setMoneyTab] = useState('transactions');
  const [debtType, setDebtType] = useState('lend');
  const [showTxnModal, setShowTxnModal] = useState(false);
  const [txnType, setTxnType] = useState('income');
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [showSettleModal, setShowSettleModal] = useState<any>(null); // debt object or null
  const [debtSearch, setDebtSearch] = useState('');
  const [favoriteContacts, setFavoriteContacts] = useState<string[]>(() => Storage.get('favoriteContacts', []));
  const [semesterBudget, setSemesterBudgetState] = useState<SemesterBudget | null>(() => Storage.getSemesterBudget());
  const [showBudgetSetup, setShowBudgetSetup] = useState(false);
  const { showDialog } = useDialog();
  const { addXP } = useGamification();
  const { t } = useI18n();
  const refresh = useCallback(() => setRefreshCounter(c => c + 1), []);

  const saveFavorites = (contacts: string[]) => {
    setFavoriteContacts(contacts);
    Storage.set('favoriteContacts', contacts);
  };
  const toggleFavorite = (name: string) => {
    if (favoriteContacts.includes(name)) saveFavorites(favoriteContacts.filter(c => c !== name));
    else saveFavorites([...favoriteContacts, name]);
  };
  const selectContact = (name: string) => {
    const el = document.getElementById('debt-person') as HTMLInputElement;
    if (el) { el.value = name; el.focus(); }
  };

  // Hydrate from DB on mount and when refreshKey changes (e.g. after AI adds entries)
  useEffect(() => {
    Promise.all([syncTransactionsFromDB(), syncDebtsFromDB()]).then(() => refresh());
  }, [refreshKey]);

  const txns = Storage.getTransactions();
  const debts = Storage.getDebts();
  const goals = Storage.getSavingsGoals();
  const income = txns.filter(t => t.type === 'income').reduce((a: number, t: any) => a + t.amount, 0);
  const expense = txns.filter(t => t.type === 'expense').reduce((a: number, t: any) => a + t.amount, 0);
  const balance = income - expense;
  const activeDebts = debts.filter((d: any) => !d.settled);
  const historyDebts = debts.filter((d: any) => d.settled);
  const totalLent = activeDebts.filter((d: any) => d.debtType === 'lend').reduce((a: number, d: any) => a + (Number(d.amount) || 0), 0);
  const totalBorrowed = activeDebts.filter((d: any) => d.debtType !== 'lend').reduce((a: number, d: any) => a + (Number(d.amount) || 0), 0);

  const addTransaction = async () => {
    const description = (document.getElementById('txn-desc') as HTMLInputElement)?.value.trim();
    const amount = parseFloat((document.getElementById('txn-amount') as HTMLInputElement)?.value);
    if (!description || !amount || isNaN(amount) || amount <= 0 || amount > 10000000) {
      await showDialog({ title: 'Missing Info', message: 'Please enter a valid description and amount (1 — 10,000,000).', type: 'alert' });
      return;
    }
    const tempId = Storage.addTransaction({ type: txnType, description, amount });
    addTransactionToDB({ type: txnType, description, amount }).then(dbId => {
      if (dbId && tempId) {
        const current = Storage.getTransactions();
        const target = current.find((t: any) => t.id === tempId);
        if (target) { target.id = dbId; Storage.setTransactions(current); }
      }
    });
    addXP(5);
    setShowTxnModal(false);
    refresh();
    toast({ title: 'Transaction added', description: `${txnType === 'income' ? '+' : '-'}৳${amount} — ${description}` });
  };

  const addDebt = async () => {
    const person = (document.getElementById('debt-person') as HTMLInputElement)?.value.trim();
    const amount = parseFloat((document.getElementById('debt-amount') as HTMLInputElement)?.value);
    if (!person || !amount || isNaN(amount) || amount <= 0 || amount > 10000000) {
      await showDialog({ title: 'Missing Info', message: 'Please enter a valid person name and amount (1 — 10,000,000).', type: 'alert' });
      return;
    }
    const description = (document.getElementById('debt-description') as HTMLInputElement)?.value.trim();
    const date = (document.getElementById('debt-date') as HTMLInputElement)?.value;
    const tempId = Storage.addDebt({ debtType, person, amount, description, date });
    addDebtToDB({ debtType, person, amount, description, date }).then(dbId => {
      if (dbId && tempId) {
        const current = Storage.getDebts();
        const target = current.find((d: any) => d.id === tempId);
        if (target) { target.id = dbId; Storage.setDebts(current); }
      }
    });
    addXP(5);
    (document.getElementById('debt-person') as HTMLInputElement).value = '';
    (document.getElementById('debt-amount') as HTMLInputElement).value = '';
    (document.getElementById('debt-description') as HTMLInputElement).value = '';
    (document.getElementById('debt-date') as HTMLInputElement).value = new Date().toISOString().split('T')[0];
    refresh();
    toast({ title: 'Debt added', description: `${debtType === 'lend' ? 'Lent to' : 'Borrowed from'} ${person} — ৳${amount}` });
  };

  const addGoal = async () => {
    const title = (document.getElementById('goal-title') as HTMLInputElement)?.value.trim();
    const targetAmount = parseFloat((document.getElementById('goal-target') as HTMLInputElement)?.value);
    if (!title || !targetAmount || isNaN(targetAmount) || targetAmount <= 0 || targetAmount > 10000000) {
      await showDialog({ title: 'Missing Info', message: 'Please enter a valid goal title and target amount.', type: 'alert' });
      return;
    }
    const initialAmount = parseFloat((document.getElementById('goal-initial') as HTMLInputElement)?.value) || 0;
    const targetDate = (document.getElementById('goal-date') as HTMLInputElement)?.value;
    Storage.addSavingsGoal({ title, targetAmount, initialAmount, targetDate });
    addXP(10);
    (document.getElementById('goal-title') as HTMLInputElement).value = '';
    (document.getElementById('goal-target') as HTMLInputElement).value = '';
    refresh();
    toast({ title: 'Savings goal created', description: `${title} — ৳${targetAmount}` });
  };

  const deleteTxn = async (id: string) => {
    const txn = txns.find((t: any) => t.id === id);
    const confirmed = await showDialog({ title: 'Delete Transaction', message: 'Are you sure you want to delete this transaction?', type: 'confirm', confirmText: 'Delete' });
    if (confirmed) {
      Storage.deleteTransaction(id);
      deleteTransactionFromDB(id);
      refresh();
      toast({ title: 'Transaction deleted', description: txn?.description || '' });
    }
  };

  const settleDebt = async (debt: any) => {
    // Open the partial settlement modal
    setShowSettleModal(debt);
  };

  const confirmSettle = async (settleAmount: number) => {
    const debt = showSettleModal;
    if (!debt) return;
    const isPartial = settleAmount < debt.amount;

    Storage.settleDebt(debt.id, settleAmount);
    await settleDebtInDB(debt.id, settleAmount);
    // Re-sync to get correct IDs
    await syncDebtsFromDB();
    setShowSettleModal(null);
    refresh();
    toast({
      title: isPartial ? `Partial settlement ✓` : 'Debt settled ✓',
      description: `${debt.person} — ৳${settleAmount.toLocaleString()}${isPartial ? ` (৳${(debt.amount - settleAmount).toLocaleString()} remaining)` : ''}`,
    });
  };

  const deleteDebt = async (id: string) => {
    const debt = debts.find((d: any) => d.id === id);
    const confirmed = await showDialog({ title: 'Delete Debt', message: 'Are you sure you want to delete this debt record?', type: 'confirm', confirmText: 'Delete' });
    if (confirmed) {
      Storage.deleteDebt(id);
      deleteDebtFromDB(id);
      refresh();
      toast({ title: 'Debt deleted', description: debt?.person || '' });
    }
  };

  const settleAllForPerson = async (personName: string, personDebts: any[]) => {
    const confirmed = await showDialog({
      title: 'Settle All Debts',
      message: `Mark all ${personDebts.length} debt(s) with ${personName} as settled?`,
      type: 'confirm',
      confirmText: 'Settle All'
    });
    if (confirmed) {
      for (const d of personDebts) {
        Storage.settleDebt(d.id);
        await settleDebtInDB(d.id);
      }
      await syncDebtsFromDB();
      refresh();
      toast({ title: `All debts with ${personName} settled ✓`, description: `${personDebts.length} entries cleared` });
    }
  };

  const deleteGoal = async (id: string) => {
    const goal = goals.find((g: any) => g.id === id);
    const confirmed = await showDialog({ title: 'Delete Goal', message: 'Are you sure you want to delete this savings goal?', type: 'confirm', confirmText: 'Delete' });
    if (confirmed) {
      Storage.deleteSavingsGoal(id);
      refresh();
      toast({ title: 'Goal deleted', description: goal?.title || '' });
    }
  };

  return (
    <div className="page-enter">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button className="icon-btn !w-9 !h-9" onClick={() => navigateTo('dashboard')}><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('money.title')}</h1>
            <p className="text-muted-foreground text-sm">{t('money.subtitle')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-green" onClick={() => {
            if (moneyTab === 'transactions') setShowTxnModal(true);
            else if (moneyTab === 'lend') document.getElementById('debt-person')?.focus();
            else document.getElementById('goal-title')?.focus();
          }}>
            + {moneyTab === 'transactions' ? t('money.add_transaction') : moneyTab === 'lend' ? t('money.add_debt') : t('money.add_goal')}
          </button>
        </div>
      </div>

      <div className="tab-group mb-6 inline-flex">
        {[
          { id: 'transactions', label: t('money.transactions') },
          { id: 'lend', label: t('money.lend_borrow') },
          { id: 'savings', label: t('money.savings') },
        ].map(tab => (
          <button key={tab.id} className={`tab-item ${moneyTab === tab.id ? 'active' : ''}`} onClick={() => setMoneyTab(tab.id)}>{tab.label}</button>
        ))}
      </div>

      {moneyTab === 'transactions' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="glass-card-accent !p-4">
              <div className="flex items-center gap-2 text-[0.65rem] font-semibold tracking-widest text-muted-foreground mb-2"><div className="money-icon green">+</div> {t('money.total_income')}</div>
              <div className="text-xl font-bold text-primary">৳ {income.toLocaleString()}</div>
            </div>
            <div className="glass-card-accent !p-4">
              <div className="flex items-center gap-2 text-[0.65rem] font-semibold tracking-widest text-muted-foreground mb-2"><div className="money-icon red">-</div> {t('money.total_expense')}</div>
              <div className="text-xl font-bold text-destructive">৳ {expense.toLocaleString()}</div>
            </div>
            <div className="glass-card-accent !p-4">
              <div className="flex items-center gap-2 text-[0.65rem] font-semibold tracking-widest text-muted-foreground mb-2"><div className="money-icon blue">$</div> {t('money.balance')}</div>
              <div className="text-xl font-bold text-foreground">৳ {balance.toLocaleString()}</div>
            </div>
          </div>

          {/* Semester Fee & Budget Widget */}
          {(() => {
            if (!semesterBudget || !semesterBudget.startDate || !semesterBudget.totalFee) {
              return (
                <div className="glass-card mb-6 !p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'hsl(var(--primary) / 0.12)' }}>
                        <CreditCard className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">Semester Fee Tracker</h3>
                        <p className="text-xs text-muted-foreground">Track tuition fees, installments & spending</p>
                      </div>
                    </div>
                    <button className="btn-green !text-xs !px-4 !py-2" onClick={() => setShowBudgetSetup(true)}>Set Up</button>
                  </div>
                </div>
              );
            }

            let start: Date;
            try {
              start = parseISO(semesterBudget.startDate);
              if (isNaN(start.getTime())) throw new Error('Invalid date');
            } catch {
              // Corrupted data — reset
              Storage.setSemesterBudget(null);
              setSemesterBudgetState(null);
              return null;
            }

            const now = new Date();
            const semMonths = Math.max(1, Math.min(24, semesterBudget.semesterMonths || 6));
            const end = addMonths(start, semMonths);
            const remainingDays = Math.max(0, differenceInDays(end, now));
            const isActive = now >= start && now <= end;
            const elapsedMonths = Math.max(0, Math.min(semMonths, Math.floor(differenceInDays(now, start) / 30)));
            const remainingMonths = Math.max(0, semMonths - elapsedMonths);

            // Fee tracking — guard against corrupt installment data
            const installments: Installment[] = Array.isArray(semesterBudget.installments)
              ? semesterBudget.installments.filter(inst => inst && typeof inst.amount === 'number' && inst.amount > 0 && inst.id && inst.paidDate)
              : [];
            const totalPaid = installments.reduce((sum, inst) => sum + inst.amount, 0);
            const totalFee = Math.max(0, semesterBudget.totalFee);
            const feeRemaining = Math.max(0, totalFee - totalPaid);
            const feeProgress = totalFee > 0 ? Math.min(100, Math.round((totalPaid / totalFee) * 100)) : 0;

            // Next installment due calculation
            const monthlyInstallment = Math.max(0, semesterBudget.monthlyInstallment || 0);
            const installmentsDueCount = monthlyInstallment > 0 ? Math.ceil(totalFee / monthlyInstallment) : 0;
            const installmentsPaidCount = installments.length;
            const nextInstallmentNumber = installmentsPaidCount + 1;
            const nextDueDate = installmentsDueCount > 0 && nextInstallmentNumber <= installmentsDueCount
              ? addMonths(start, installmentsPaidCount)
              : null;
            const isOverdue = nextDueDate ? isBefore(nextDueDate, now) : false;

            // Weekly spending from living budget
            const weekStart = startOfWeek(now, { weekStartsOn: 6 });
            const weekEnd = endOfWeek(now, { weekStartsOn: 6 });
            const thisWeekExpenses = txns
              .filter((tx: any) => {
                if (tx.type !== 'expense' || typeof tx.amount !== 'number') return false;
                try {
                  const d = new Date(tx.date);
                  return !isNaN(d.getTime()) && isWithinInterval(d, { start: weekStart, end: weekEnd });
                } catch { return false; }
              })
              .reduce((sum: number, tx: any) => sum + tx.amount, 0);

            const livingBudget = Math.max(0, semesterBudget.livingBudget || 0);
            const weeklyAllowance = livingBudget > 0 ? Math.round((livingBudget * 12) / 52) : 0;
            const safeToSpend = Math.max(0, weeklyAllowance - thisWeekExpenses);
            const weekProgress = weeklyAllowance > 0 ? Math.min(100, Math.round((thisWeekExpenses / weeklyAllowance) * 100)) : 0;
            const isOverBudget = thisWeekExpenses > weeklyAllowance && weeklyAllowance > 0;
            const semesterEndStr = format(end, 'dd MMM yyyy');

            return (
              <div className="glass-card mb-6 !p-5">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2.5">
                    <CreditCard className="w-4.5 h-4.5 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Semester Fee Tracker</h3>
                  </div>
                  <button
                    onClick={() => setShowBudgetSetup(true)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <Settings2 className="w-3.5 h-3.5" /> Edit
                  </button>
                </div>

                {/* Fee Overview Cards */}
                <div className="grid grid-cols-3 gap-2.5 mb-5">
                  <div className="rounded-xl p-3 text-center" style={{ background: 'hsl(var(--primary) / 0.08)' }}>
                    <div className="text-[0.6rem] font-semibold text-muted-foreground tracking-wider mb-1">TOTAL FEE</div>
                    <div className="text-base font-bold text-foreground">৳{totalFee.toLocaleString()}</div>
                  </div>
                  <div className="rounded-xl p-3 text-center" style={{ background: 'hsl(142 71% 45% / 0.08)' }}>
                    <div className="text-[0.6rem] font-semibold text-muted-foreground tracking-wider mb-1">PAID</div>
                    <div className="text-base font-bold text-primary">৳{totalPaid.toLocaleString()}</div>
                  </div>
                  <div className="rounded-xl p-3 text-center" style={{ background: feeRemaining > 0 ? 'hsl(var(--destructive) / 0.08)' : 'hsl(142 71% 45% / 0.08)' }}>
                    <div className="text-[0.6rem] font-semibold text-muted-foreground tracking-wider mb-1">DUE</div>
                    <div className={`text-base font-bold ${feeRemaining > 0 ? 'text-destructive' : 'text-primary'}`}>৳{feeRemaining.toLocaleString()}</div>
                  </div>
                </div>

                {/* Fee Progress Bar */}
                <div className="mb-5">
                  <div className="flex justify-between text-[0.65rem] text-muted-foreground mb-1.5">
                    <span>Fee Payment Progress</span>
                    <span>{feeProgress}%</span>
                  </div>
                  <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'hsl(var(--border))' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${feeProgress}%`,
                        background: feeProgress >= 100 ? 'hsl(142 71% 45%)' : 'hsl(var(--primary))',
                      }}
                    />
                  </div>
                </div>

                {/* Next Installment Due */}
                {monthlyInstallment > 0 && feeRemaining > 0 && (
                  <div className={`rounded-xl p-4 mb-5 flex items-center justify-between`}
                    style={{ background: isOverdue ? 'hsl(var(--destructive) / 0.08)' : 'hsl(var(--accent))' }}>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-0.5">
                        {isOverdue ? '⚠️ Overdue — Installment #' : '📅 Next — Installment #'}{nextInstallmentNumber}
                      </div>
                      <div className={`text-xl font-bold ${isOverdue ? 'text-destructive' : 'text-foreground'}`}>
                        ৳{Math.min(monthlyInstallment, feeRemaining).toLocaleString()}
                      </div>
                      {nextDueDate && (
                        <div className="text-[0.65rem] text-muted-foreground mt-0.5">
                          Due: {format(nextDueDate, 'dd MMM yyyy')}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={async () => {
                        const amt = Math.min(monthlyInstallment, feeRemaining);
                        const confirmed = await showDialog({
                          title: 'Confirm Payment',
                          message: `Record installment #${nextInstallmentNumber} of ৳${amt.toLocaleString()} as paid?`,
                          type: 'confirm',
                          confirmText: 'Yes, Paid'
                        });
                        if (!confirmed) return;
                        const newInst: Installment = {
                          id: Date.now() + '_' + Math.random().toString(36).slice(2, 8),
                          amount: amt,
                          paidDate: new Date().toISOString(),
                        };
                        const updated = {
                          ...semesterBudget,
                          installments: [...installments, newInst],
                        };
                        Storage.setSemesterBudget(updated);
                        setSemesterBudgetState(updated as any);
                        refresh();
                        toast({ title: 'Installment recorded ✓', description: `৳${amt.toLocaleString()} — Installment #${nextInstallmentNumber}` });
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105 active:scale-95"
                      style={{ background: 'hsl(142 71% 45% / 0.15)', color: 'hsl(142 71% 45%)' }}>
                      <CircleCheck className="w-4 h-4" /> Mark Paid
                    </button>
                  </div>
                )}

                {feeRemaining === 0 && totalFee > 0 && (
                  <div className="rounded-xl p-4 mb-5 text-center" style={{ background: 'hsl(142 71% 45% / 0.1)' }}>
                    <div className="text-lg mb-1">🎉</div>
                    <div className="text-sm font-semibold text-primary">All fees paid!</div>
                  </div>
                )}

                {/* Paid Installments History */}
                {installments.length > 0 && (
                  <div className="mb-5">
                    <div className="text-xs font-semibold text-muted-foreground mb-2">Payment History</div>
                    <div className="space-y-1.5">
                      {installments.slice().reverse().map((inst, i) => (
                        <div key={inst.id} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: 'hsl(var(--muted) / 0.3)' }}>
                          <div className="flex items-center gap-2">
                            <CircleCheck className="w-3.5 h-3.5 text-primary" />
                            <span className="text-xs text-foreground">Installment #{installments.length - i}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold text-primary">৳{inst.amount.toLocaleString()}</span>
                            <span className="text-[0.6rem] text-muted-foreground">{format(parseISO(inst.paidDate), 'dd MMM')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Weekly Spending Guide */}
                {livingBudget > 0 && (
                  <div className="rounded-xl p-4" style={{ background: isOverBudget ? 'hsl(var(--destructive) / 0.08)' : 'hsl(var(--primary) / 0.06)' }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-muted-foreground">💰 Safe to spend this week</span>
                      <span className="text-[0.65rem] text-muted-foreground">{remainingMonths}mo left</span>
                    </div>
                    <div className={`text-2xl font-bold mb-3 ${isOverBudget ? 'text-destructive' : 'text-primary'}`}>
                      ৳{safeToSpend.toLocaleString()}
                    </div>
                    <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'hsl(var(--border))' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${weekProgress}%`,
                          background: isOverBudget
                            ? 'hsl(var(--destructive))'
                            : weekProgress > 75
                              ? 'hsl(38 92% 50%)'
                              : 'hsl(var(--primary))',
                        }}
                      />
                    </div>
                    <div className="flex justify-between mt-1.5 text-[0.6rem] text-muted-foreground">
                      <span>৳{thisWeekExpenses.toLocaleString()} spent</span>
                      <span>৳{weeklyAllowance.toLocaleString()} / week</span>
                    </div>
                  </div>
                )}

                {!isActive && (
                  <div className="mt-3 text-[0.65rem] text-muted-foreground flex items-center gap-1.5">
                    <CalendarDays className="w-3 h-3" />
                    {now < start ? `Semester starts ${format(start, 'dd MMM yyyy')}` : `Semester ended ${semesterEndStr}`}
                  </div>
                )}
              </div>
            );
          })()}

          <div className="glass-card min-h-[200px]">
            <h2 className="text-base font-semibold text-foreground mb-5">{t('money.recent_txns')}</h2>
            {txns.length === 0 ? (
              <div className="empty-state border border-dashed border-border rounded-lg !p-10"><p>{t('money.no_txns')}</p></div>
            ) : txns.slice().reverse().map((t: any) => (
              <div key={t.id} className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                <div className="flex items-center gap-3">
                  <div className={`money-icon ${t.type === 'income' ? 'green' : 'red'}`}>{t.type === 'income' ? '↑' : '↓'}</div>
                  <div>
                    <div className="font-medium text-foreground text-sm">{t.description}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(t.date)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-semibold ${t.type === 'income' ? 'text-primary' : 'text-destructive'}`}>{t.type === 'income' ? '+' : '-'}৳{t.amount}</span>
                  <button className="text-destructive text-xs" onClick={() => deleteTxn(t.id)}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {moneyTab === 'lend' && (() => {
        // Compute per-person net balances
        const personMap: Record<string, { lent: number; borrowed: number; debts: any[] }> = {};
        activeDebts.forEach((d: any) => {
          if (!personMap[d.person]) personMap[d.person] = { lent: 0, borrowed: 0, debts: [] };
          if (d.debtType === 'lend') personMap[d.person].lent += d.amount;
          else personMap[d.person].borrowed += d.amount;
          personMap[d.person].debts.push(d);
        });
        const allPeople = Object.entries(personMap).map(([name, data]) => ({
          name, ...data, net: data.lent - data.borrowed
        }));
        const netTotal = totalLent - totalBorrowed;
        const searchLower = debtSearch.toLowerCase().trim();
        const people = searchLower ? allPeople.filter(p => p.name.toLowerCase().includes(searchLower)) : allPeople;

        // Build unique contact names from all debts (active + history)
        const allContactNames = Array.from(new Set(debts.map((d: any) => d.person).filter(Boolean)));

        return (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="glass-card-accent !p-4">
              <div className="flex items-center gap-2 text-[0.6rem] font-semibold tracking-widest text-muted-foreground mb-1.5">↑ {t('money.lent')}</div>
              <div className="text-lg font-bold text-primary">৳{totalLent.toLocaleString()}</div>
            </div>
            <div className="glass-card-accent !p-4">
              <div className="flex items-center gap-2 text-[0.6rem] font-semibold tracking-widest text-muted-foreground mb-1.5">↓ {t('money.borrowed')}</div>
              <div className="text-lg font-bold text-destructive">৳{totalBorrowed.toLocaleString()}</div>
            </div>
            <div className="glass-card-accent !p-4">
              <div className="flex items-center gap-2 text-[0.6rem] font-semibold tracking-widest text-muted-foreground mb-1.5">⊘ {t('money.net')}</div>
              <div className={`text-lg font-bold ${netTotal > 0 ? 'text-primary' : netTotal < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {netTotal > 0 ? '+' : netTotal < 0 ? '-' : ''}৳{Math.abs(netTotal).toLocaleString()}
              </div>
              <div className="text-[0.6rem] text-muted-foreground mt-0.5">
                {netTotal > 0 ? t('money.you_are_owed') : netTotal < 0 ? t('money.you_owe') : t('money.all_even')}
              </div>
            </div>
          </div>

          {/* People Summary */}
          {allPeople.length > 0 && (
            <div className="glass-card mb-6">
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">👥 {t('money.people_summary')}</h2>
              <div className="space-y-2">
                {allPeople.sort((a, b) => Math.abs(b.net) - Math.abs(a.net)).map(p => (
                  <div key={p.name} className="flex items-center justify-between py-2.5 px-3 rounded-xl transition-colors" style={{ background: 'hsl(var(--muted) / 0.35)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                        style={{
                          background: p.net > 0 ? 'hsl(var(--primary) / 0.15)' : p.net < 0 ? 'hsl(var(--destructive) / 0.15)' : 'hsl(var(--border))',
                          color: p.net > 0 ? 'hsl(var(--primary))' : p.net < 0 ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))'
                        }}>
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-foreground text-sm flex items-center gap-1.5">
                          {p.name}
                          <button onClick={() => toggleFavorite(p.name)} className="opacity-60 hover:opacity-100 transition-opacity" title={favoriteContacts.includes(p.name) ? 'Remove from favorites' : 'Add to favorites'}>
                            <Star className={`w-3.5 h-3.5 ${favoriteContacts.includes(p.name) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                          </button>
                        </div>
                        <div className="text-[0.65rem] text-muted-foreground flex gap-2">
                          {p.lent > 0 && <span className="text-primary">{t('money.lent_label')} ৳{p.lent.toLocaleString()}</span>}
                          {p.borrowed > 0 && <span className="text-destructive">{t('money.borrowed_label')} ৳{p.borrowed.toLocaleString()}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold text-sm ${p.net > 0 ? 'text-primary' : p.net < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {p.net > 0 ? `+৳${p.net.toLocaleString()}` : p.net < 0 ? `-৳${Math.abs(p.net).toLocaleString()}` : '৳0'}
                      </div>
                      <div className="text-[0.6rem] text-muted-foreground">
                        {p.net > 0 ? t('money.they_owe_you') : p.net < 0 ? t('money.you_owe_them') : t('money.even')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add new debt form */}
          <div className="glass-card mb-6">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">📝 {t('money.new_entry')}</h2>
            <div className="grid grid-cols-2 gap-0 mb-5 rounded-xl overflow-hidden" style={{ border: '2px solid hsl(var(--border))' }}>
              <button
                className={`py-3 text-sm font-semibold transition-all ${debtType === 'lend' ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground hover:text-foreground'}`}
                onClick={() => setDebtType('lend')}>
                {t('money.i_lent')}
              </button>
              <button
                className={`py-3 text-sm font-semibold transition-all ${debtType === 'borrow' ? 'bg-destructive text-destructive-foreground' : 'bg-transparent text-muted-foreground hover:text-foreground'}`}
                onClick={() => setDebtType('borrow')}>
                {t('money.i_borrowed')}
              </button>
            </div>

            {/* Favorite contacts quick-select */}
            {favoriteContacts.length > 0 && (
              <div className="mb-4">
                <label className="form-label flex items-center gap-1.5">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> {t('money.quick_select')}
                </label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {favoriteContacts.map(name => (
                    <button
                      key={name}
                      onClick={() => selectContact(name)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-105"
                      style={{ background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))' }}>
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[0.55rem] font-bold" style={{ background: 'hsl(var(--primary) / 0.2)' }}>
                        {name.charAt(0).toUpperCase()}
                      </span>
                      {name}
                      <button
                        onClick={e => { e.stopPropagation(); toggleFavorite(name); }}
                        className="ml-0.5 opacity-50 hover:opacity-100">
                        <X className="w-3 h-3" />
                      </button>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Also show non-favorited past contacts as subtle chips */}
            {allContactNames.filter(n => !favoriteContacts.includes(n)).length > 0 && (
              <div className="mb-4">
                <label className="form-label">{t('money.recent_contacts')}</label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {allContactNames.filter(n => !favoriteContacts.includes(n)).map(name => (
                    <button
                      key={name}
                      onClick={() => selectContact(name)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.65rem] font-medium transition-all hover:scale-105 bg-muted text-muted-foreground hover:text-foreground">
                      {name}
                      <button
                        onClick={e => { e.stopPropagation(); toggleFavorite(name); }}
                        className="ml-0.5 opacity-40 hover:opacity-100" title="Add to favorites">
                        <Star className="w-2.5 h-2.5" />
                      </button>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">{t('money.person')}</label>
                  <input type="text" id="debt-person" className="input-simple" placeholder={t('money.who')} />
                </div>
                <div>
                  <label className="form-label">{t('money.amount')} (৳)</label>
                  <input type="number" id="debt-amount" className="input-simple" placeholder="0" min={1} />
                </div>
              </div>
              <div>
                <label className="form-label">{t('money.reason')}</label>
                <input type="text" id="debt-description" className="input-simple" placeholder={t('money.what_for')} />
              </div>
              <div>
                <label className="form-label">{t('money.date')}</label>
                <input type="date" id="debt-date" className="input-simple max-w-[50%]" defaultValue={new Date().toISOString().split('T')[0]} />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-5">
              <button className={`${debtType === 'lend' ? 'btn-green' : 'btn-danger'} !min-w-[120px]`} onClick={addDebt}>
                {debtType === 'lend' ? t('money.save_lend') : t('money.save_borrow')}
              </button>
            </div>
          </div>

          {/* Active Debts grouped by person */}
          <div className="glass-card mb-6 min-h-[100px]">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">📋 {t('money.active_debts')}</h2>
              {allPeople.length > 0 && (
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder={t('money.search_person')}
                    value={debtSearch}
                    onChange={e => setDebtSearch(e.target.value)}
                    className="input-simple !py-1.5 !pl-8 !pr-3 !text-xs !w-[160px]"
                  />
                  {debtSearch && (
                    <button onClick={() => setDebtSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
            {people.length === 0 ? (
              <div className="empty-state border border-dashed border-border rounded-xl !p-10 text-center">
                <div className="text-3xl mb-2">{debtSearch ? '🔍' : '🤝'}</div>
                <p className="text-muted-foreground text-sm">{debtSearch ? `${t('money.no_match')} "${debtSearch}"` : t('money.no_debts')}</p>
              </div>
            ) : people.map(p => (
              <div key={p.name} className="mb-5 last:mb-0">
                <div className="flex items-center justify-between mb-2.5 px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[0.65rem] font-bold shrink-0"
                      style={{
                        background: p.net > 0 ? 'hsl(var(--primary) / 0.15)' : 'hsl(var(--destructive) / 0.15)',
                        color: p.net > 0 ? 'hsl(var(--primary))' : 'hsl(var(--destructive))'
                      }}>
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold text-foreground">{p.name}</span>
                    <span className={`text-[0.65rem] font-bold px-2.5 py-1 rounded-full ${p.net > 0 ? 'text-primary' : 'text-destructive'}`}
                      style={{ background: p.net > 0 ? 'hsl(var(--primary) / 0.12)' : 'hsl(var(--destructive) / 0.12)' }}>
                      {p.net > 0 ? '+' : '-'}৳{Math.abs(p.net).toLocaleString()}
                    </span>
                  </div>
                  {p.debts.length > 1 && (
                    <button
                      onClick={() => settleAllForPerson(p.name, p.debts)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.7rem] font-semibold transition-all hover:scale-105 active:scale-95"
                      style={{ background: 'hsl(142 71% 45% / 0.15)', color: 'hsl(142 71% 45%)' }}>
                      <CheckCheck className="w-3.5 h-3.5" />
                      {t('money.settle_all')}
                    </button>
                  )}
                </div>
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid hsl(var(--border))' }}>
                  {p.debts.slice().reverse().map((d: any, i: number) => (
                    <div key={d.id} className="flex items-center justify-between py-3.5 px-3.5"
                      style={{ borderBottom: i < p.debts.length - 1 ? '1px solid hsl(var(--border))' : 'none', background: 'hsl(var(--muted) / 0.12)' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                          style={{
                            background: d.debtType === 'lend' ? 'hsl(var(--primary) / 0.15)' : 'hsl(var(--destructive) / 0.15)',
                          }}>
                          {d.debtType === 'lend' ? '🔼' : '🔽'}
                        </div>
                        <div>
                          <div className="text-sm text-foreground font-medium">{d.description || (d.debtType === 'lend' ? t('money.lent_label') : t('money.borrowed_label'))}</div>
                          <div className="text-[0.65rem] text-muted-foreground">{formatDate(d.date)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className={`font-bold text-sm ${d.debtType === 'lend' ? 'text-primary' : 'text-destructive'}`}>৳{d.amount.toLocaleString()}</span>
                        <button
                          onClick={() => settleDebt(d)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[0.7rem] font-semibold transition-all hover:scale-105 active:scale-95"
                          style={{ background: 'hsl(142 71% 45% / 0.15)', color: 'hsl(142 71% 45%)' }}>
                          <Check className="w-3.5 h-3.5" />
                          {t('money.settle')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Settled History — grouped by person, newest first */}
          {historyDebts.length > 0 && (() => {
            // Group settled debts by person
            const settledByPerson: Record<string, any[]> = {};
            historyDebts.forEach((d: any) => {
              if (!settledByPerson[d.person]) settledByPerson[d.person] = [];
              settledByPerson[d.person].push(d);
            });
            // Sort each person's entries newest first (by settledDate or date)
            Object.values(settledByPerson).forEach(arr => arr.sort((a: any, b: any) => {
              const ta = new Date(a.settledDate || a.date || 0).getTime();
              const tb = new Date(b.settledDate || b.date || 0).getTime();
              return tb - ta;
            }));
            const sortedPeople = Object.entries(settledByPerson).sort((a, b) => {
              const latestA = new Date(a[1][0]?.settledDate || a[1][0]?.date || 0).getTime();
              const latestB = new Date(b[1][0]?.settledDate || b[1][0]?.date || 0).getTime();
              return latestB - latestA;
            });

            return (
              <div className="glass-card min-h-[100px]">
                <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">✅ {t('money.settled_history')}</h2>
                {sortedPeople.map(([personName, entries]) => {
                  const totalSettled = entries.reduce((s: number, d: any) => s + (Number(d.amount) || 0), 0);
                  const isPartial = entries.some((d: any) => d.description?.includes('Partial'));
                  return (
                    <div key={personName} className="mb-4 last:mb-0">
                      <div className="flex items-center justify-between mb-2 px-1">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[0.55rem] font-bold shrink-0 bg-muted text-muted-foreground">
                            {personName.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-foreground">{personName}</span>
                          {isPartial && (
                            <span className="text-[0.6rem] px-2 py-0.5 rounded-full font-medium" style={{ background: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' }}>
                              Partial
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground">৳{totalSettled.toLocaleString()} total</span>
                      </div>
                      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid hsl(var(--border))' }}>
                        {entries.map((d: any, i: number) => (
                          <div key={d.id} className="flex items-center justify-between py-3 px-3.5"
                            style={{ borderBottom: i < entries.length - 1 ? '1px solid hsl(var(--border))' : 'none', background: 'hsl(var(--muted) / 0.08)' }}>
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0" style={{ background: 'hsl(var(--muted) / 0.4)' }}>
                                {d.description?.includes('Partial') ? '◐' : '☑️'}
                              </div>
                              <div>
                                <div className="text-sm text-foreground font-medium flex items-center gap-1.5">
                                  <span className="line-through opacity-70">৳{d.amount.toLocaleString()}</span>
                                  <span className="text-[0.6rem] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                                    {d.description?.includes('Partial') ? 'Partial' : t('money.settled')}
                                  </span>
                                </div>
                                <div className="text-[0.65rem] text-muted-foreground">
                                  {d.debtType === 'lend' ? '↑ Lent' : '↓ Borrowed'} · {d.description?.replace('Partial payment — ', '') || ''} · {formatDate(d.settledDate || d.date)}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => deleteDebt(d.id)}
                              className="flex items-center gap-1 px-2 py-1.5 rounded-full text-[0.65rem] font-semibold transition-all hover:scale-105 active:scale-95"
                              style={{ background: 'hsl(var(--destructive) / 0.12)', color: 'hsl(var(--destructive))' }}>
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </>
        );
      })()}

      {moneyTab === 'savings' && (
        <>
          <div className="glass-card mb-6">
            <input type="text" id="goal-title" className="input-simple mb-4" placeholder={t('money.goal_title')} />
            <div className="grid grid-cols-2 gap-4 mb-4">
              <input type="number" id="goal-target" className="input-simple" placeholder={t('money.target_amount')} min={1} />
              <input type="number" id="goal-initial" className="input-simple" placeholder={t('money.initial_amount')} min={0} defaultValue={0} />
            </div>
            <input type="date" id="goal-date" className="input-simple mb-5 max-w-[50%]" />
            <div className="flex gap-3 justify-end"><button className="btn-green" onClick={addGoal}>{t('money.create_goal')}</button></div>
          </div>
          <div className="glass-card min-h-[100px]">
            {goals.length === 0 ? <div className="empty-state border border-dashed border-border rounded-lg !p-10"><p className="italic text-muted-foreground">{t('money.no_goals')}</p></div> :
            goals.map((g: any) => {
              const progress = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0;
              return (
                <div key={g.id} className="py-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <div className="font-semibold text-foreground">{g.title}</div>
                      {g.targetDate && <div className="text-xs text-muted-foreground">{t('money.target')}: {formatDate(g.targetDate)}</div>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-primary">৳{g.currentAmount} / ৳{g.targetAmount}</span>
                      <button className="text-destructive text-xs" onClick={() => deleteGoal(g.id)}>✕</button>
                    </div>
                  </div>
                  <div className="xp-bar !h-2"><div className="xp-bar-fill" style={{ width: `${progress}%` }} /></div>
                  <div className="text-[0.6rem] text-muted-foreground mt-1 text-right">{progress}%</div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {showTxnModal && (
        <div className="modal-overlay" onClick={() => setShowTxnModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground mb-4">{t('money.add_transaction')}</h2>
            <label className="form-label">{t('money.type')}</label>
            <div className="grid grid-cols-2 gap-0 mb-4 rounded-[var(--radius-sm)] overflow-hidden" style={{ border: '1px solid hsl(var(--border))' }}>
              <button className={txnType === 'income' ? 'btn-green !rounded-none !border-none' : 'btn-outline !rounded-none !border-none'} onClick={() => setTxnType('income')}>{t('money.income')}</button>
              <button className={txnType === 'expense' ? 'btn-danger !rounded-none !border-none' : 'btn-outline !rounded-none !border-none'} onClick={() => setTxnType('expense')}>{t('money.expense')}</button>
            </div>
            <label className="form-label">{t('money.description')}</label>
            <input type="text" id="txn-desc" className="input-simple mb-4" placeholder="e.g. Lunch, Salary" />
            <label className="form-label">{t('money.amount')} (৳)</label>
            <input type="number" id="txn-amount" className="input-simple mb-5" placeholder="0" min={1} />
            <div className="flex gap-3">
              <button className="btn-outline flex-1" onClick={() => setShowTxnModal(false)}>{t('common.cancel')}</button>
              <button className="btn-green flex-1" onClick={addTransaction}>{t('common.add')}</button>
            </div>
          </div>
        </div>
      )}

      {showBudgetSetup && (
        <div className="modal-overlay" onClick={() => setShowBudgetSetup(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground mb-1">Semester Fee Setup</h2>
            <p className="text-xs text-muted-foreground mb-5">Enter your tuition fee details and monthly living budget.</p>
            
            <label className="form-label">Total Semester Fee (৳)</label>
            <input type="number" id="budget-total-fee" className="input-simple mb-4" placeholder="e.g. 120000" min={1} defaultValue={semesterBudget?.totalFee || ''} />
            
            <label className="form-label">Monthly Installment (৳)</label>
            <input type="number" id="budget-installment" className="input-simple mb-4" placeholder="e.g. 20000" min={0} defaultValue={semesterBudget?.monthlyInstallment || ''} />
            
            <label className="form-label">Monthly Living/Spending Budget (৳)</label>
            <input type="number" id="budget-living" className="input-simple mb-4" placeholder="e.g. 8000" min={0} defaultValue={semesterBudget?.livingBudget || ''} />
            
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <label className="form-label">Semester Duration (months)</label>
                <input type="number" id="budget-months" className="input-simple" placeholder="e.g. 6" min={1} max={24} defaultValue={semesterBudget?.semesterMonths || ''} />
              </div>
              <div>
                <label className="form-label">Start Date</label>
                <input type="date" id="budget-start" className="input-simple" defaultValue={semesterBudget?.startDate || ''} />
              </div>
            </div>
            <div className="flex gap-3">
              {semesterBudget && (
                <button className="btn-outline flex-1 !text-destructive" onClick={() => {
                  Storage.setSemesterBudget(null);
                  setSemesterBudgetState(null);
                  setShowBudgetSetup(false);
                  toast({ title: 'Fee tracker removed' });
                }}>Remove</button>
              )}
              <button className="btn-outline flex-1" onClick={() => setShowBudgetSetup(false)}>{t('common.cancel')}</button>
              <button className="btn-green flex-1" onClick={() => {
                const totalFee = parseFloat((document.getElementById('budget-total-fee') as HTMLInputElement)?.value);
                const monthlyInstallment = parseFloat((document.getElementById('budget-installment') as HTMLInputElement)?.value) || 0;
                const livingBudget = parseFloat((document.getElementById('budget-living') as HTMLInputElement)?.value) || 0;
                const semesterMonths = parseInt((document.getElementById('budget-months') as HTMLInputElement)?.value) || 0;
                const startDate = (document.getElementById('budget-start') as HTMLInputElement)?.value;
                if (!totalFee || isNaN(totalFee) || totalFee <= 0 || totalFee > 10000000) {
                  toast({ title: 'Invalid fee', description: 'Total fee must be between ৳1 and ৳10,000,000.', variant: 'destructive' });
                  return;
                }
                if (!semesterMonths || semesterMonths < 1 || semesterMonths > 24) {
                  toast({ title: 'Invalid duration', description: 'Semester must be 1–24 months.', variant: 'destructive' });
                  return;
                }
                if (!startDate) {
                  toast({ title: 'Missing start date', description: 'Please select a start date.', variant: 'destructive' });
                  return;
                }
                // Validate start date is parseable
                const parsedStart = new Date(startDate);
                if (isNaN(parsedStart.getTime())) {
                  toast({ title: 'Invalid date', description: 'Start date is not valid.', variant: 'destructive' });
                  return;
                }
                if (monthlyInstallment < 0 || monthlyInstallment > totalFee) {
                  toast({ title: 'Invalid installment', description: 'Monthly installment cannot exceed total fee.', variant: 'destructive' });
                  return;
                }
                if (livingBudget < 0 || livingBudget > 10000000) {
                  toast({ title: 'Invalid budget', description: 'Living budget must be reasonable.', variant: 'destructive' });
                  return;
                }
                const budget: SemesterBudget = {
                  totalFee,
                  monthlyInstallment,
                  livingBudget,
                  semesterMonths,
                  startDate,
                  installments: semesterBudget?.installments || [],
                };
                Storage.setSemesterBudget(budget);
                setSemesterBudgetState(budget);
                setShowBudgetSetup(false);
                toast({ title: 'Fee tracker saved ✓', description: `৳${totalFee.toLocaleString()} over ${semesterMonths} months` });
              }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MoneyPage;
