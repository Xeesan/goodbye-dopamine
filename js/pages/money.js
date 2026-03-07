// ============================
// Money Page
// ============================
let moneyTab = 'transactions';
let debtType = 'lend';

function renderMoney(container) {
  const txns = Storage.getTransactions();
  const debts = Storage.getDebts();
  const goals = Storage.getSavingsGoals();
  const income = txns.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0);
  const expense = txns.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
  const balance = income - expense;
  const activeDebts = debts.filter(d => !d.settled);
  const totalLent = activeDebts.filter(d => d.debtType === 'lend').reduce((a, d) => a + d.amount, 0);
  const totalBorrowed = activeDebts.filter(d => d.debtType === 'borrow').reduce((a, d) => a + d.amount, 0);

  // Dynamic add button based on tab
  const addBtnLabel = moneyTab === 'transactions' ? '+ Add Transaction' :
    moneyTab === 'lend' ? '+ Add Debt' : '+ Add Goal';
  const addBtnAction = moneyTab === 'transactions' ? 'showAddTransactionModal()' :
    moneyTab === 'lend' ? 'toggleDebtForm()' : 'toggleGoalForm()';

  container.innerHTML = `
    <div class="page-enter">
      <div class="page-header">
        <div>
          <h1>Money</h1>
          <p class="page-desc">Manage transactions, debts, and savings</p>
        </div>
        <div class="page-header-actions">
          <button class="btn-outline" onclick="alert('Budget feature coming soon!')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            SET BUDGET
          </button>
          <button class="btn-green" onclick="${addBtnAction}">${addBtnLabel}</button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tab-group" style="margin-bottom:24px;display:inline-flex">
        <button class="tab-item ${moneyTab === 'transactions' ? 'active' : ''}" onclick="switchMoneyTab('transactions')">TRANSACTIONS</button>
        <button class="tab-item ${moneyTab === 'lend' ? 'active' : ''}" onclick="switchMoneyTab('lend')">LEND/BORROW</button>
        <button class="tab-item ${moneyTab === 'savings' ? 'active' : ''}" onclick="switchMoneyTab('savings')">SAVINGS GOALS</button>
      </div>

      <!-- Tab Content -->
      ${moneyTab === 'transactions' ? renderTransactionsTab(txns, income, expense, balance) : ''}
      ${moneyTab === 'lend' ? renderLendBorrowTab(debts, totalLent, totalBorrowed) : ''}
      ${moneyTab === 'savings' ? renderSavingsGoalsTab(goals) : ''}

      <!-- AI Advisor -->
      <div class="ai-advisor ai-advisor-amber" style="margin-top:24px">
        <div class="advisor-left">
          <div class="advisor-icon" style="background:rgba(212,160,23,0.2)">🤖</div>
          <div>
            <div class="advisor-title">AI MONEY ADVISOR</div>
            <div class="advisor-desc">GET PERSONALIZED INSIGHTS & RECOMMENDATIONS</div>
          </div>
        </div>
        <button class="ask-btn">ASK AI ✨</button>
      </div>
    </div>
  `;
}

// ========== TRANSACTIONS TAB ==========
function renderTransactionsTab(txns, income, expense, balance) {
  return `
    <!-- Summary Cards -->
    <div class="money-summary">
      <div class="glass-card-accent money-card">
        <div class="money-label">
          <div class="money-icon green">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
          </div>
          TOTAL INCOME
        </div>
        <div class="money-value" style="color:var(--accent)">৳ ${income.toLocaleString()}</div>
      </div>
      <div class="glass-card-accent money-card">
        <div class="money-label">
          <div class="money-icon red">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>
          </div>
          TOTAL EXPENSE
        </div>
        <div class="money-value" style="color:var(--danger)">৳ ${expense.toLocaleString()}</div>
      </div>
      <div class="glass-card-accent money-card">
        <div class="money-label">
          <div class="money-icon blue">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          BALANCE
        </div>
        <div class="money-value">৳ ${balance.toLocaleString()}</div>
      </div>
    </div>

    <!-- Transactions List -->
    <div class="glass-card" style="min-height:200px;padding:24px">
      <h2 style="font-size:1.1rem;margin-bottom:20px">Recent Transactions</h2>
      ${txns.length === 0 ? `
        <div class="empty-state" style="border:1px dashed var(--border);border-radius:var(--radius);padding:40px">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="0.5" style="opacity:0.3"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          <p>No transactions yet.</p>
        </div>
      ` : txns.slice().reverse().map(t => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border)">
          <div style="display:flex;align-items:center;gap:12px">
            <div class="money-icon ${t.type === 'income' ? 'green' : 'red'}">
              ${t.type === 'income' ? '↑' : '↓'}
            </div>
            <div>
              <div style="font-weight:500">${t.description}</div>
              <div style="font-size:0.75rem;color:var(--text-muted)">${formatDate(t.date)}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:12px">
            <span style="font-weight:600;color:${t.type === 'income' ? 'var(--accent)' : 'var(--danger)'}">
              ${t.type === 'income' ? '+' : '-'}৳${t.amount}
            </span>
            <button class="icon-btn" style="color:var(--danger);width:28px;height:28px" onclick="deleteTransactionItem('${t.id}')">✕</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ========== LEND/BORROW TAB ==========
function renderLendBorrowTab(debts, totalLent, totalBorrowed) {
  const activeDebts = debts.filter(d => !d.settled);
  const historyDebts = debts.filter(d => d.settled);

  return `
    <!-- Summary Cards -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
      <div class="glass-card-accent money-card">
        <div class="money-label">
          <div class="money-icon green">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
          </div>
          TOTAL LENT
        </div>
        <div class="money-value" style="color:var(--accent)">৳ ${totalLent.toLocaleString()}</div>
      </div>
      <div class="glass-card-accent money-card">
        <div class="money-label">
          <div class="money-icon red">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
          </div>
          TOTAL BORROWED
        </div>
        <div class="money-value" style="color:var(--danger)">৳ ${totalBorrowed.toLocaleString()}</div>
      </div>
    </div>

    <!-- Add Debt Form (inline like original) -->
    <div class="glass-card" style="padding:24px;margin-bottom:24px" id="debt-form-card">
      <!-- Lend/Borrow Toggle -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;margin-bottom:20px;border-radius:var(--radius-sm);overflow:hidden;border:1px solid var(--border)">
        <button id="debt-lend-btn" class="${debtType === 'lend' ? 'btn-green' : 'btn-outline'}" 
                style="border-radius:0;border:none;padding:12px" onclick="setDebtType('lend')">Lend</button>
        <button id="debt-borrow-btn" class="${debtType === 'borrow' ? 'btn-green' : 'btn-outline'}" 
                style="border-radius:0;border:none;padding:12px;${debtType === 'borrow' ? 'background:var(--danger);color:#fff' : ''}" onclick="setDebtType('borrow')">Borrow</button>
      </div>

      <!-- Form Fields -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <input type="text" id="debt-person" class="input-simple" placeholder="Person Name">
        <input type="number" id="debt-amount" class="input-simple" placeholder="Amount" min="1">
      </div>
      <input type="text" id="debt-description" class="input-simple" placeholder="Description" style="margin-bottom:16px">
      <input type="date" id="debt-date" class="input-simple" value="${new Date().toISOString().split('T')[0]}" style="margin-bottom:20px;max-width:50%">

      <div style="display:flex;gap:12px;justify-content:flex-end">
        <button class="btn-outline" onclick="clearDebtForm()">Cancel</button>
        <button class="btn-green" onclick="addDebtSubmit()">Save Debt</button>
      </div>
    </div>

    <!-- Active Debt List -->
    <div class="glass-card" style="min-height:100px;padding:24px;margin-bottom:24px">
      <h2 style="font-size:1.1rem;margin-bottom:20px">Active Debts</h2>
      ${activeDebts.length === 0 ? `
        <div class="empty-state" style="border:1px dashed var(--border);border-radius:var(--radius);padding:40px">
          <p>No active debts.</p>
        </div>
      ` : activeDebts.slice().reverse().map(d => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border)">
          <div style="display:flex;align-items:center;gap:12px">
            <div class="money-icon ${d.debtType === 'lend' ? 'green' : 'red'}">
              ${d.debtType === 'lend' ? '↑' : '↓'}
            </div>
            <div>
              <div style="font-weight:500">${d.person}</div>
              <div style="font-size:0.75rem;color:var(--text-muted)">${d.description || ''} · ${formatDate(d.date)}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:12px">
            <span style="font-weight:600;color:${d.debtType === 'lend' ? 'var(--accent)' : 'var(--danger)'}">
              ৳${d.amount}
            </span>
            <span style="font-size:0.7rem;text-transform:uppercase;color:var(--text-muted);letter-spacing:0.06em">${d.debtType}</span>
            <button class="btn-outline" style="color:var(--accent);border-color:var(--border);padding:4px 8px;font-size:0.75rem;margin-left:8px;" onclick="settleDebtItem('${d.id}')">Settle</button>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Settled Debt List -->
    <div class="glass-card" style="min-height:100px;padding:24px;opacity:0.8">
      <h2 style="font-size:1.1rem;margin-bottom:20px">Settled History</h2>
      ${historyDebts.length === 0 ? `
        <div class="empty-state" style="border:1px dashed var(--border);border-radius:var(--radius);padding:40px">
          <p>No settled debts.</p>
        </div>
      ` : historyDebts.slice().reverse().map(d => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border)">
          <div style="display:flex;align-items:center;gap:12px">
            <div class="money-icon" style="background:var(--border);color:var(--text-muted)">
              ✓
            </div>
            <div>
              <div style="font-weight:500">${d.person} <span style="font-size:0.7rem;color:var(--text-muted)">(Settled)</span></div>
              <div style="font-size:0.75rem;color:var(--text-muted)">${d.description || ''} · ${formatDate(d.date)}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:12px">
            <span style="font-weight:600;color:var(--text-muted);text-decoration:line-through">
              ৳${d.amount}
            </span>
            <span style="font-size:0.7rem;text-transform:uppercase;color:var(--text-muted);letter-spacing:0.06em">${d.debtType}</span>
            <button class="icon-btn" style="color:var(--danger);width:28px;height:28px" onclick="deleteDebtItem('${d.id}')">✕</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ========== SAVINGS GOALS TAB ==========
function renderSavingsGoalsTab(goals) {
  return `
    <!-- Add Goal Form (inline like original) -->
    <div class="glass-card" style="padding:24px;margin-bottom:24px" id="goal-form-card">
      <input type="text" id="goal-title" class="input-simple" placeholder="Goal Title (e.g. New Laptop)" style="margin-bottom:16px">
      
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <input type="number" id="goal-target" class="input-simple" placeholder="Target Amount" min="1">
        <input type="number" id="goal-initial" class="input-simple" placeholder="0" min="0" value="0">
      </div>
      
      <input type="date" id="goal-date" class="input-simple" style="margin-bottom:20px;max-width:50%">

      <div style="display:flex;gap:12px;justify-content:flex-end">
        <button class="btn-outline" onclick="clearGoalForm()">Cancel</button>
        <button class="btn-green" onclick="addGoalSubmit()">Create Goal</button>
      </div>
    </div>

    <!-- Goals List -->
    <div class="glass-card" style="min-height:100px;padding:24px">
      ${goals.length === 0 ? `
        <div class="empty-state" style="border:1px dashed var(--border);border-radius:var(--radius);padding:40px">
          <p style="font-style:italic;color:var(--text-muted)">No savings goals yet</p>
        </div>
      ` : goals.map(g => {
    const progress = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0;
    return `
        <div style="padding:16px 0;border-bottom:1px solid var(--border)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <div>
              <div style="font-weight:600">${g.title}</div>
              <div style="font-size:0.75rem;color:var(--text-muted)">${g.targetDate ? 'Target: ' + formatDate(g.targetDate) : ''}</div>
            </div>
            <div style="display:flex;align-items:center;gap:12px">
              <span style="font-weight:600;color:var(--accent)">৳${g.currentAmount} / ৳${g.targetAmount}</span>
              <button class="icon-btn" style="color:var(--danger);width:28px;height:28px" onclick="deleteSavingsGoalItem('${g.id}')">✕</button>
            </div>
          </div>
          <div class="xp-bar" style="height:8px">
            <div class="xp-bar-fill" style="width:${progress}%"></div>
          </div>
          <div style="font-size:0.7rem;color:var(--text-muted);margin-top:4px;text-align:right">${progress}%</div>
        </div>
        `;
  }).join('')}
    </div>
  `;
}

// ========== EVENT HANDLERS ==========
function switchMoneyTab(tab) {
  moneyTab = tab;
  navigateTo('money');
}

// --- Transactions ---
function showAddTransactionModal() {
  const modal = document.createElement('div');
  modal.className = 'transaction-modal-overlay';
  modal.id = 'transaction-modal';
  modal.innerHTML = `
    <div class="transaction-modal">
      <h2>Add Transaction</h2>
      <div class="form-group" style="margin-bottom:16px">
        <label style="display:block;font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:8px">TYPE</label>
        <div class="type-toggle">
          <button class="type-btn active-income" id="type-income" onclick="setTransactionType('income')">Income</button>
          <button class="type-btn" id="type-expense" onclick="setTransactionType('expense')">Expense</button>
        </div>
      </div>
      <div class="form-group" style="margin-bottom:16px">
        <label style="display:block;font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:8px">DESCRIPTION</label>
        <input type="text" id="txn-desc" class="input-simple" placeholder="e.g. Lunch, Salary">
      </div>
      <div class="form-group" style="margin-bottom:16px">
        <label style="display:block;font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:8px">AMOUNT (৳)</label>
        <input type="number" id="txn-amount" class="input-simple" placeholder="0" min="1">
      </div>
      <div style="display:flex;gap:12px;margin-top:20px">
        <button class="btn-outline" style="flex:1" onclick="closeModal('transaction-modal')">Cancel</button>
        <button class="btn-green" style="flex:1" onclick="addTransactionSubmit()">Add</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

let txnType = 'income';
function setTransactionType(type) {
  txnType = type;
  document.getElementById('type-income').className = 'type-btn' + (type === 'income' ? ' active-income' : '');
  document.getElementById('type-expense').className = 'type-btn' + (type === 'expense' ? ' active-expense' : '');
}

function addTransactionSubmit() {
  const description = document.getElementById('txn-desc').value.trim();
  const amount = parseFloat(document.getElementById('txn-amount').value);
  if (!description || !amount) { alert('Please fill all fields'); return; }

  Storage.addTransaction({ type: txnType, description, amount });
  Storage.addXP(5);
  closeModal('transaction-modal');
  navigateTo('money');
}

function deleteTransactionItem(id) {
  if (confirm('Delete this transaction?')) {
    Storage.deleteTransaction(id);
    navigateTo('money');
  }
}

// --- Lend/Borrow ---
function setDebtType(type) {
  debtType = type;
  navigateTo('money');
}

function toggleDebtForm() {
  // Form is always visible inline, just scroll to it
  const form = document.getElementById('debt-form-card');
  if (form) form.scrollIntoView({ behavior: 'smooth' });
}

function clearDebtForm() {
  const person = document.getElementById('debt-person');
  const amount = document.getElementById('debt-amount');
  const desc = document.getElementById('debt-description');
  if (person) person.value = '';
  if (amount) amount.value = '';
  if (desc) desc.value = '';
}

function addDebtSubmit() {
  const person = document.getElementById('debt-person').value.trim();
  const amount = parseFloat(document.getElementById('debt-amount').value);
  if (!person || !amount) { alert('Please enter person name and amount'); return; }

  const description = document.getElementById('debt-description').value.trim();
  const date = document.getElementById('debt-date').value;

  Storage.addDebt({ debtType, person, amount, description, date });
  Storage.addXP(5);
  navigateTo('money');
}

function deleteDebtItem(id) {
  if (confirm('Delete this debt from history?')) {
    Storage.deleteDebt(id);
    navigateTo('money');
  }
}

function settleDebtItem(id) {
  if (confirm('Settle this debt? This will move it to your history.')) {
    Storage.settleDebt(id);
    navigateTo('money');
  }
}

// --- Savings Goals ---
function toggleGoalForm() {
  const form = document.getElementById('goal-form-card');
  if (form) form.scrollIntoView({ behavior: 'smooth' });
}

function clearGoalForm() {
  const title = document.getElementById('goal-title');
  const target = document.getElementById('goal-target');
  const initial = document.getElementById('goal-initial');
  if (title) title.value = '';
  if (target) target.value = '';
  if (initial) initial.value = '0';
}

function addGoalSubmit() {
  const title = document.getElementById('goal-title').value.trim();
  const targetAmount = parseFloat(document.getElementById('goal-target').value);
  if (!title || !targetAmount) { alert('Please enter a goal title and target amount'); return; }

  const initialAmount = parseFloat(document.getElementById('goal-initial').value) || 0;
  const targetDate = document.getElementById('goal-date').value;

  Storage.addSavingsGoal({ title, targetAmount, initialAmount, targetDate });
  Storage.addXP(10);
  navigateTo('money');
}

function deleteSavingsGoalItem(id) {
  if (confirm('Delete this savings goal?')) {
    Storage.deleteSavingsGoal(id);
    navigateTo('money');
  }
}
