import { useState } from 'react';
import Storage from '@/lib/storage';
import { formatDate } from '@/lib/helpers';

interface MoneyPageProps {
  navigateTo: (page: string) => void;
  refreshKey: number;
}

const MoneyPage = ({ navigateTo }: MoneyPageProps) => {
  const [moneyTab, setMoneyTab] = useState('transactions');
  const [debtType, setDebtType] = useState('lend');
  const [showTxnModal, setShowTxnModal] = useState(false);
  const [txnType, setTxnType] = useState('income');

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

  const addTransaction = () => {
    const description = (document.getElementById('txn-desc') as HTMLInputElement)?.value.trim();
    const amount = parseFloat((document.getElementById('txn-amount') as HTMLInputElement)?.value);
    if (!description || !amount) { alert('Please fill all fields'); return; }
    Storage.addTransaction({ type: txnType, description, amount });
    Storage.addXP(5);
    setShowTxnModal(false);
    navigateTo('money');
  };

  const addDebt = () => {
    const person = (document.getElementById('debt-person') as HTMLInputElement)?.value.trim();
    const amount = parseFloat((document.getElementById('debt-amount') as HTMLInputElement)?.value);
    if (!person || !amount) { alert('Please enter person name and amount'); return; }
    const description = (document.getElementById('debt-description') as HTMLInputElement)?.value.trim();
    const date = (document.getElementById('debt-date') as HTMLInputElement)?.value;
    Storage.addDebt({ debtType, person, amount, description, date });
    Storage.addXP(5);
    navigateTo('money');
  };

  const addGoal = () => {
    const title = (document.getElementById('goal-title') as HTMLInputElement)?.value.trim();
    const targetAmount = parseFloat((document.getElementById('goal-target') as HTMLInputElement)?.value);
    if (!title || !targetAmount) { alert('Please enter a goal title and target amount'); return; }
    const initialAmount = parseFloat((document.getElementById('goal-initial') as HTMLInputElement)?.value) || 0;
    const targetDate = (document.getElementById('goal-date') as HTMLInputElement)?.value;
    Storage.addSavingsGoal({ title, targetAmount, initialAmount, targetDate });
    Storage.addXP(10);
    navigateTo('money');
  };

  return (
    <div className="page-enter max-w-[1200px] mx-auto">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Money</h1>
          <p className="text-muted-foreground text-sm">Manage transactions, debts, and savings</p>
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

      {/* Transactions Tab */}
      {moneyTab === 'transactions' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="glass-card-accent !p-4">
              <div className="flex items-center gap-2 text-[0.65rem] font-semibold tracking-widest text-muted-foreground mb-2">
                <div className="money-icon green">+</div> TOTAL INCOME
              </div>
              <div className="text-xl font-bold text-primary">৳ {income.toLocaleString()}</div>
            </div>
            <div className="glass-card-accent !p-4">
              <div className="flex items-center gap-2 text-[0.65rem] font-semibold tracking-widest text-muted-foreground mb-2">
                <div className="money-icon red">-</div> TOTAL EXPENSE
              </div>
              <div className="text-xl font-bold text-destructive">৳ {expense.toLocaleString()}</div>
            </div>
            <div className="glass-card-accent !p-4">
              <div className="flex items-center gap-2 text-[0.65rem] font-semibold tracking-widest text-muted-foreground mb-2">
                <div className="money-icon blue">$</div> BALANCE
              </div>
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
                  <span className={`font-semibold ${t.type === 'income' ? 'text-primary' : 'text-destructive'}`}>
                    {t.type === 'income' ? '+' : '-'}৳{t.amount}
                  </span>
                  <button className="text-destructive text-xs" onClick={() => { if (confirm('Delete?')) { Storage.deleteTransaction(t.id); navigateTo('money'); } }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Lend/Borrow Tab */}
      {moneyTab === 'lend' && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="glass-card-accent !p-4">
              <div className="flex items-center gap-2 text-[0.65rem] font-semibold tracking-widest text-muted-foreground mb-2"><div className="money-icon green">↑</div> TOTAL LENT</div>
              <div className="text-xl font-bold text-primary">৳ {totalLent.toLocaleString()}</div>
            </div>
            <div className="glass-card-accent !p-4">
              <div className="flex items-center gap-2 text-[0.65rem] font-semibold tracking-widest text-muted-foreground mb-2"><div className="money-icon red">↓</div> TOTAL BORROWED</div>
              <div className="text-xl font-bold text-destructive">৳ {totalBorrowed.toLocaleString()}</div>
            </div>
          </div>
          <div className="glass-card mb-6">
            <div className="grid grid-cols-2 gap-0 mb-5 rounded-[var(--radius-sm)] overflow-hidden" style={{ border: '1px solid hsl(var(--border))' }}>
              <button className={debtType === 'lend' ? 'btn-green !rounded-none !border-none' : 'btn-outline !rounded-none !border-none'} onClick={() => setDebtType('lend')}>Lend</button>
              <button className={debtType === 'borrow' ? 'btn-danger !rounded-none !border-none' : 'btn-outline !rounded-none !border-none'} onClick={() => setDebtType('borrow')}>Borrow</button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <input type="text" id="debt-person" className="input-simple" placeholder="Person Name" />
              <input type="number" id="debt-amount" className="input-simple" placeholder="Amount" min={1} />
            </div>
            <input type="text" id="debt-description" className="input-simple mb-4" placeholder="Description" />
            <input type="date" id="debt-date" className="input-simple mb-5 max-w-[50%]" defaultValue={new Date().toISOString().split('T')[0]} />
            <div className="flex gap-3 justify-end">
              <button className="btn-green" onClick={addDebt}>Save Debt</button>
            </div>
          </div>
          <div className="glass-card mb-6 min-h-[100px]">
            <h2 className="text-base font-semibold text-foreground mb-5">Active Debts</h2>
            {activeDebts.length === 0 ? <div className="empty-state border border-dashed border-border rounded-lg !p-10"><p>No active debts.</p></div> :
            activeDebts.slice().reverse().map((d: any) => (
              <div key={d.id} className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                <div className="flex items-center gap-3">
                  <div className={`money-icon ${d.debtType === 'lend' ? 'green' : 'red'}`}>{d.debtType === 'lend' ? '↑' : '↓'}</div>
                  <div>
                    <div className="font-medium text-foreground text-sm">{d.person}</div>
                    <div className="text-xs text-muted-foreground">{d.description || ''} · {formatDate(d.date)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-semibold ${d.debtType === 'lend' ? 'text-primary' : 'text-destructive'}`}>৳{d.amount}</span>
                  <span className="text-[0.6rem] uppercase text-muted-foreground tracking-wider">{d.debtType}</span>
                  <button className="btn-outline !py-1 !px-2 !text-xs !text-primary" onClick={() => { if (confirm('Settle this debt?')) { Storage.settleDebt(d.id); navigateTo('money'); } }}>Settle</button>
                </div>
              </div>
            ))}
          </div>
          {historyDebts.length > 0 && (
            <div className="glass-card min-h-[100px] opacity-80">
              <h2 className="text-base font-semibold text-foreground mb-5">Settled History</h2>
              {historyDebts.slice().reverse().map((d: any) => (
                <div key={d.id} className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  <div className="flex items-center gap-3">
                    <div className="money-icon" style={{ background: 'hsl(var(--border))', color: 'hsl(var(--text-muted))' }}>✓</div>
                    <div>
                      <div className="font-medium text-foreground text-sm">{d.person} <span className="text-[0.6rem] text-muted-foreground">(Settled)</span></div>
                      <div className="text-xs text-muted-foreground">{d.description || ''} · {formatDate(d.date)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-muted-foreground line-through">৳{d.amount}</span>
                    <button className="text-destructive text-xs" onClick={() => { if (confirm('Delete?')) { Storage.deleteDebt(d.id); navigateTo('money'); } }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Savings Goals Tab */}
      {moneyTab === 'savings' && (
        <>
          <div className="glass-card mb-6">
            <input type="text" id="goal-title" className="input-simple mb-4" placeholder="Goal Title (e.g. New Laptop)" />
            <div className="grid grid-cols-2 gap-4 mb-4">
              <input type="number" id="goal-target" className="input-simple" placeholder="Target Amount" min={1} />
              <input type="number" id="goal-initial" className="input-simple" placeholder="Initial Amount" min={0} defaultValue={0} />
            </div>
            <input type="date" id="goal-date" className="input-simple mb-5 max-w-[50%]" />
            <div className="flex gap-3 justify-end">
              <button className="btn-green" onClick={addGoal}>Create Goal</button>
            </div>
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
                      <button className="text-destructive text-xs" onClick={() => { if (confirm('Delete?')) { Storage.deleteSavingsGoal(g.id); navigateTo('money'); } }}>✕</button>
                    </div>
                  </div>
                  <div className="xp-bar !h-2">
                    <div className="xp-bar-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="text-[0.6rem] text-muted-foreground mt-1 text-right">{progress}%</div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Transaction Modal */}
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
