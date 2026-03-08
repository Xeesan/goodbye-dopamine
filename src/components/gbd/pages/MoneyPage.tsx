import { useState, useCallback, useEffect } from 'react';
import Storage from '@/lib/storage';
import { syncTransactionsFromDB, addTransactionToDB, deleteTransactionFromDB, syncDebtsFromDB, addDebtToDB, settleDebtInDB, deleteDebtFromDB } from '@/lib/dbSync';
import { formatDate } from '@/lib/helpers';
import { ArrowLeft } from 'lucide-react';
import { useDialog } from '../DialogProvider';
import { toast } from '@/hooks/use-toast';
import { useGamification } from '@/hooks/useGamification';

interface MoneyPageProps {
  navigateTo: (page: string) => void;
  refreshKey: number;
}

const MoneyPage = ({ navigateTo }: MoneyPageProps) => {
  const [moneyTab, setMoneyTab] = useState('transactions');
  const [debtType, setDebtType] = useState('lend');
  const [showTxnModal, setShowTxnModal] = useState(false);
  const [txnType, setTxnType] = useState('income');
  const [refreshCounter, setRefreshCounter] = useState(0);
  const { showDialog } = useDialog();
  const { addXP } = useGamification();
  const refresh = useCallback(() => setRefreshCounter(c => c + 1), []);

  // Hydrate from DB on mount
  useEffect(() => {
    Promise.all([syncTransactionsFromDB(), syncDebtsFromDB()]).then(() => refresh());
  }, []);

  const txns = Storage.getTransactions();
  const debts = Storage.getDebts();
  const goals = Storage.getSavingsGoals();
  const income = txns.filter(t => t.type === 'income').reduce((a: number, t: any) => a + t.amount, 0);
  const expense = txns.filter(t => t.type === 'expense').reduce((a: number, t: any) => a + t.amount, 0);
  const balance = income - expense;
  const activeDebts = debts.filter((d: any) => !d.settled);
  const historyDebts = debts.filter((d: any) => d.settled);
  const totalLent = activeDebts.filter((d: any) => d.debtType === 'lend').reduce((a: number, d: any) => a + d.amount, 0);
  const totalBorrowed = activeDebts.filter((d: any) => d.debtType === 'borrow').reduce((a: number, d: any) => a + d.amount, 0);

  const addTransaction = async () => {
    const description = (document.getElementById('txn-desc') as HTMLInputElement)?.value.trim();
    const amount = parseFloat((document.getElementById('txn-amount') as HTMLInputElement)?.value);
    if (!description || !amount) {
      await showDialog({ title: 'Missing Info', message: 'Please fill in all fields.', type: 'alert' });
      return;
    }
    Storage.addTransaction({ type: txnType, description, amount });
    addTransactionToDB({ type: txnType, description, amount }).then(dbId => {
      if (dbId) {
        const current = Storage.getTransactions();
        const last = current[current.length - 1];
        if (last) { last.id = dbId; Storage.setTransactions(current); }
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
    if (!person || !amount) {
      await showDialog({ title: 'Missing Info', message: 'Please enter a person name and amount.', type: 'alert' });
      return;
    }
    const description = (document.getElementById('debt-description') as HTMLInputElement)?.value.trim();
    const date = (document.getElementById('debt-date') as HTMLInputElement)?.value;
    Storage.addDebt({ debtType, person, amount, description, date });
    addDebtToDB({ debtType, person, amount, description, date }).then(dbId => {
      if (dbId) {
        const current = Storage.getDebts();
        const last = current[current.length - 1];
        if (last) { last.id = dbId; Storage.setDebts(current); }
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
    if (!title || !targetAmount) {
      await showDialog({ title: 'Missing Info', message: 'Please enter a goal title and target amount.', type: 'alert' });
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

  const settleDebt = async (id: string) => {
    const debt = debts.find((d: any) => d.id === id);
    const confirmed = await showDialog({ title: 'Settle Debt', message: 'Mark this debt as settled?', type: 'confirm', confirmText: 'Settle' });
    if (confirmed) {
      Storage.settleDebt(id);
      settleDebtInDB(id);
      refresh();
      toast({ title: 'Debt settled ✓', description: `${debt?.person} — ৳${debt?.amount}` });
    }
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
            <h1 className="text-2xl font-bold text-foreground">Money</h1>
            <p className="text-muted-foreground text-sm">Manage transactions, debts, and savings</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-green" onClick={() => {
            if (moneyTab === 'transactions') setShowTxnModal(true);
            else if (moneyTab === 'lend') document.getElementById('debt-person')?.focus();
            else document.getElementById('goal-title')?.focus();
          }}>
            + {moneyTab === 'transactions' ? 'Add Transaction' : moneyTab === 'lend' ? 'Add Debt' : 'Add Goal'}
          </button>
        </div>
      </div>

      <div className="tab-group mb-6 inline-flex">
        {[
          { id: 'transactions', label: 'TRANSACTIONS' },
          { id: 'lend', label: 'LEND/BORROW' },
          { id: 'savings', label: 'SAVINGS GOALS' },
        ].map(t => (
          <button key={t.id} className={`tab-item ${moneyTab === t.id ? 'active' : ''}`} onClick={() => setMoneyTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {moneyTab === 'transactions' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="glass-card-accent !p-4">
              <div className="flex items-center gap-2 text-[0.65rem] font-semibold tracking-widest text-muted-foreground mb-2"><div className="money-icon green">+</div> TOTAL INCOME</div>
              <div className="text-xl font-bold text-primary">৳ {income.toLocaleString()}</div>
            </div>
            <div className="glass-card-accent !p-4">
              <div className="flex items-center gap-2 text-[0.65rem] font-semibold tracking-widest text-muted-foreground mb-2"><div className="money-icon red">-</div> TOTAL EXPENSE</div>
              <div className="text-xl font-bold text-destructive">৳ {expense.toLocaleString()}</div>
            </div>
            <div className="glass-card-accent !p-4">
              <div className="flex items-center gap-2 text-[0.65rem] font-semibold tracking-widest text-muted-foreground mb-2"><div className="money-icon blue">$</div> BALANCE</div>
              <div className="text-xl font-bold text-foreground">৳ {balance.toLocaleString()}</div>
            </div>
          </div>
          <div className="glass-card min-h-[200px]">
            <h2 className="text-base font-semibold text-foreground mb-5">Recent Transactions</h2>
            {txns.length === 0 ? (
              <div className="empty-state border border-dashed border-border rounded-lg !p-10"><p>No transactions yet.</p></div>
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
        const people = Object.entries(personMap).map(([name, data]) => ({
          name, ...data, net: data.lent - data.borrowed
        }));
        const netTotal = totalLent - totalBorrowed;

        return (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="glass-card-accent !p-4">
              <div className="flex items-center gap-2 text-[0.6rem] font-semibold tracking-widest text-muted-foreground mb-1.5">↑ LENT</div>
              <div className="text-lg font-bold text-primary">৳{totalLent.toLocaleString()}</div>
            </div>
            <div className="glass-card-accent !p-4">
              <div className="flex items-center gap-2 text-[0.6rem] font-semibold tracking-widest text-muted-foreground mb-1.5">↓ BORROWED</div>
              <div className="text-lg font-bold text-destructive">৳{totalBorrowed.toLocaleString()}</div>
            </div>
            <div className="glass-card-accent !p-4">
              <div className="flex items-center gap-2 text-[0.6rem] font-semibold tracking-widest text-muted-foreground mb-1.5">⊘ NET</div>
              <div className={`text-lg font-bold ${netTotal > 0 ? 'text-primary' : netTotal < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {netTotal > 0 ? '+' : netTotal < 0 ? '-' : ''}৳{Math.abs(netTotal).toLocaleString()}
              </div>
              <div className="text-[0.6rem] text-muted-foreground mt-0.5">
                {netTotal > 0 ? 'You are owed' : netTotal < 0 ? 'You owe' : 'All even'}
              </div>
            </div>
          </div>

          {/* People Summary */}
          {people.length > 0 && (
            <div className="glass-card mb-6">
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">👥 People Summary</h2>
              <div className="space-y-2">
                {people.sort((a, b) => Math.abs(b.net) - Math.abs(a.net)).map(p => (
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
                        <div className="font-medium text-foreground text-sm">{p.name}</div>
                        <div className="text-[0.65rem] text-muted-foreground flex gap-2">
                          {p.lent > 0 && <span className="text-primary">Lent ৳{p.lent.toLocaleString()}</span>}
                          {p.borrowed > 0 && <span className="text-destructive">Borrowed ৳{p.borrowed.toLocaleString()}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold text-sm ${p.net > 0 ? 'text-primary' : p.net < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {p.net > 0 ? `+৳${p.net.toLocaleString()}` : p.net < 0 ? `-৳${Math.abs(p.net).toLocaleString()}` : '৳0'}
                      </div>
                      <div className="text-[0.6rem] text-muted-foreground">
                        {p.net > 0 ? 'They owe you' : p.net < 0 ? 'You owe them' : 'Even ✓'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add new debt form */}
          <div className="glass-card mb-6">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">📝 New Entry</h2>
            <div className="grid grid-cols-2 gap-0 mb-5 rounded-xl overflow-hidden" style={{ border: '2px solid hsl(var(--border))' }}>
              <button
                className={`py-3 text-sm font-semibold transition-all ${debtType === 'lend' ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground hover:text-foreground'}`}
                onClick={() => setDebtType('lend')}>
                ↑ I Lent Money
              </button>
              <button
                className={`py-3 text-sm font-semibold transition-all ${debtType === 'borrow' ? 'bg-destructive text-destructive-foreground' : 'bg-transparent text-muted-foreground hover:text-foreground'}`}
                onClick={() => setDebtType('borrow')}>
                ↓ I Borrowed Money
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">PERSON</label>
                  <input type="text" id="debt-person" className="input-simple" placeholder="Who?" />
                </div>
                <div>
                  <label className="form-label">AMOUNT (৳)</label>
                  <input type="number" id="debt-amount" className="input-simple" placeholder="0" min={1} />
                </div>
              </div>
              <div>
                <label className="form-label">REASON (OPTIONAL)</label>
                <input type="text" id="debt-description" className="input-simple" placeholder="What for?" />
              </div>
              <div>
                <label className="form-label">DATE</label>
                <input type="date" id="debt-date" className="input-simple max-w-[50%]" defaultValue={new Date().toISOString().split('T')[0]} />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-5">
              <button className={`${debtType === 'lend' ? 'btn-green' : 'btn-danger'} !min-w-[120px]`} onClick={addDebt}>
                {debtType === 'lend' ? '↑ Save Lend' : '↓ Save Borrow'}
              </button>
            </div>
          </div>

          {/* Active Debts grouped by person */}
          <div className="glass-card mb-6 min-h-[100px]">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">📋 Active Debts</h2>
            {people.length === 0 ? (
              <div className="empty-state border border-dashed border-border rounded-xl !p-10 text-center">
                <div className="text-3xl mb-2">🤝</div>
                <p className="text-muted-foreground text-sm">No active debts — all clear!</p>
              </div>
            ) : people.map(p => (
              <div key={p.name} className="mb-5 last:mb-0">
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[0.6rem] font-bold"
                      style={{
                        background: p.net > 0 ? 'hsl(var(--primary) / 0.15)' : 'hsl(var(--destructive) / 0.15)',
                        color: p.net > 0 ? 'hsl(var(--primary))' : 'hsl(var(--destructive))'
                      }}>
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-semibold text-foreground">{p.name}</span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.net > 0 ? 'text-primary' : 'text-destructive'}`}
                    style={{ background: p.net > 0 ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--destructive) / 0.1)' }}>
                    Net: {p.net > 0 ? '+' : '-'}৳{Math.abs(p.net).toLocaleString()}
                  </span>
                </div>
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid hsl(var(--border))' }}>
                  {p.debts.slice().reverse().map((d: any, i: number) => (
                    <div key={d.id} className="flex items-center justify-between py-3 px-3"
                      style={{ borderBottom: i < p.debts.length - 1 ? '1px solid hsl(var(--border))' : 'none', background: 'hsl(var(--muted) / 0.15)' }}>
                      <div className="flex items-center gap-3">
                        <span className={`text-base ${d.debtType === 'lend' ? '' : ''}`}>{d.debtType === 'lend' ? '🔼' : '🔽'}</span>
                        <div>
                          <div className="text-sm text-foreground font-medium">{d.description || d.debtType === 'lend' ? d.description || 'Lent' : d.description || 'Borrowed'}</div>
                          <div className="text-[0.65rem] text-muted-foreground">{formatDate(d.date)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm ${d.debtType === 'lend' ? 'text-primary' : 'text-destructive'}`}>৳{d.amount.toLocaleString()}</span>
                        <button className="btn-outline !py-1 !px-2.5 !text-xs !font-semibold !text-primary !rounded-lg" onClick={() => settleDebt(d.id)}>✓ Settle</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Settled History */}
          {historyDebts.length > 0 && (
            <div className="glass-card min-h-[100px]" style={{ opacity: 0.75 }}>
              <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">✅ Settled History</h2>
              {historyDebts.slice().reverse().map((d: any) => (
                <div key={d.id} className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  <div className="flex items-center gap-3">
                    <span className="text-base">☑️</span>
                    <div>
                      <div className="font-medium text-foreground text-sm">{d.person} <span className="text-[0.6rem] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full ml-1">Settled</span></div>
                      <div className="text-[0.65rem] text-muted-foreground">{d.description || ''} · {formatDate(d.date)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-muted-foreground line-through text-sm">৳{d.amount.toLocaleString()}</span>
                    <button className="text-destructive text-xs opacity-60 hover:opacity-100 transition-opacity" onClick={() => deleteDebt(d.id)}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
        );
      })()}

      {moneyTab === 'savings' && (
        <>
          <div className="glass-card mb-6">
            <input type="text" id="goal-title" className="input-simple mb-4" placeholder="Goal Title (e.g. New Laptop)" />
            <div className="grid grid-cols-2 gap-4 mb-4">
              <input type="number" id="goal-target" className="input-simple" placeholder="Target Amount" min={1} />
              <input type="number" id="goal-initial" className="input-simple" placeholder="Initial Amount" min={0} defaultValue={0} />
            </div>
            <input type="date" id="goal-date" className="input-simple mb-5 max-w-[50%]" />
            <div className="flex gap-3 justify-end"><button className="btn-green" onClick={addGoal}>Create Goal</button></div>
          </div>
          <div className="glass-card min-h-[100px]">
            {goals.length === 0 ? <div className="empty-state border border-dashed border-border rounded-lg !p-10"><p className="italic text-muted-foreground">No savings goals yet</p></div> :
            goals.map((g: any) => {
              const progress = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0;
              return (
                <div key={g.id} className="py-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <div className="font-semibold text-foreground">{g.title}</div>
                      {g.targetDate && <div className="text-xs text-muted-foreground">Target: {formatDate(g.targetDate)}</div>}
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
            <h2 className="text-lg font-bold text-foreground mb-4">Add Transaction</h2>
            <label className="form-label">TYPE</label>
            <div className="grid grid-cols-2 gap-0 mb-4 rounded-[var(--radius-sm)] overflow-hidden" style={{ border: '1px solid hsl(var(--border))' }}>
              <button className={txnType === 'income' ? 'btn-green !rounded-none !border-none' : 'btn-outline !rounded-none !border-none'} onClick={() => setTxnType('income')}>Income</button>
              <button className={txnType === 'expense' ? 'btn-danger !rounded-none !border-none' : 'btn-outline !rounded-none !border-none'} onClick={() => setTxnType('expense')}>Expense</button>
            </div>
            <label className="form-label">DESCRIPTION</label>
            <input type="text" id="txn-desc" className="input-simple mb-4" placeholder="e.g. Lunch, Salary" />
            <label className="form-label">AMOUNT (৳)</label>
            <input type="number" id="txn-amount" className="input-simple mb-5" placeholder="0" min={1} />
            <div className="flex gap-3">
              <button className="btn-outline flex-1" onClick={() => setShowTxnModal(false)}>Cancel</button>
              <button className="btn-green flex-1" onClick={addTransaction}>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MoneyPage;
