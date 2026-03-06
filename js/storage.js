// ============================
// LocalStorage Utilities — Production
// ============================
const Storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem('gbd_' + key);
      if (raw === null || raw === undefined) return fallback;
      const parsed = JSON.parse(raw);
      return parsed !== null && parsed !== undefined ? parsed : fallback;
    } catch (e) {
      console.warn('[Storage] Failed to read key:', key, e);
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem('gbd_' + key, JSON.stringify(value));
    } catch (e) {
      console.error('[Storage] Failed to write key:', key, e);
      if (e.name === 'QuotaExceededError') {
        alert('Storage is full! Please clear some old data from Settings.');
      }
    }
  },
  remove(key) {
    try { localStorage.removeItem('gbd_' + key); } catch (e) { console.warn('[Storage] Remove failed:', key, e); }
  },

  // User
  getUser() { return this.get('user', null); },
  setUser(user) { this.set('user', user); },
  clearUser() { this.remove('user'); },

  // Tasks (Planner)
  getTasks() {
    const tasks = this.get('tasks', []);
    return Array.isArray(tasks) ? tasks : [];
  },
  setTasks(tasks) { this.set('tasks', Array.isArray(tasks) ? tasks : []); },
  addTask(task) {
    if (!task) return;
    const tasks = this.getTasks();
    tasks.push({ ...task, id: Date.now() + '_' + Math.random().toString(36).slice(2, 8), status: 'todo', createdAt: new Date().toISOString() });
    this.setTasks(tasks);
  },
  updateTask(id, updates) {
    if (!id) return;
    const tasks = this.getTasks().map(t => t.id === id ? { ...t, ...updates } : t);
    this.setTasks(tasks);
  },
  deleteTask(id) {
    if (!id) return;
    this.setTasks(this.getTasks().filter(t => t.id !== id));
  },

  // Routine
  getRoutine() {
    const def = { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] };
    const data = this.get('routine', def);
    // Ensure every day exists as an array
    Object.keys(def).forEach(day => { if (!Array.isArray(data[day])) data[day] = []; });
    return data;
  },
  setRoutine(routine) { this.set('routine', routine); },
  addPeriod(day, period) {
    if (!day || !period) return;
    const routine = this.getRoutine();
    if (!Array.isArray(routine[day])) routine[day] = [];
    routine[day].push({ ...period, id: Date.now() + '_' + Math.random().toString(36).slice(2, 8) });
    this.setRoutine(routine);
  },
  deletePeriod(day, id) {
    if (!day || !id) return;
    const routine = this.getRoutine();
    if (!Array.isArray(routine[day])) return;
    routine[day] = routine[day].filter(p => p.id !== id);
    this.setRoutine(routine);
  },

  // Exams
  getExams() {
    const exams = this.get('exams', []);
    return Array.isArray(exams) ? exams : [];
  },
  setExams(exams) { this.set('exams', Array.isArray(exams) ? exams : []); },
  addExam(exam) {
    if (!exam) return;
    const exams = this.getExams();
    exams.push({ ...exam, id: Date.now() + '_' + Math.random().toString(36).slice(2, 8) });
    this.setExams(exams);
  },
  deleteExam(id) {
    if (!id) return;
    this.setExams(this.getExams().filter(e => e.id !== id));
  },

  // Semesters (Academic Hub)
  getSemesters() {
    const sems = this.get('semesters', []);
    return Array.isArray(sems) ? sems : [];
  },
  setSemesters(semesters) { this.set('semesters', Array.isArray(semesters) ? semesters : []); },
  addSemester(sem) {
    if (!sem) return;
    const sems = this.getSemesters();
    sems.push({ ...sem, id: Date.now() + '_' + Math.random().toString(36).slice(2, 8), courses: [] });
    this.setSemesters(sems);
  },

  // Transactions (Money)
  getTransactions() {
    const txns = this.get('transactions', []);
    return Array.isArray(txns) ? txns : [];
  },
  setTransactions(txns) { this.set('transactions', Array.isArray(txns) ? txns : []); },
  addTransaction(txn) {
    if (!txn) return;
    const txns = this.getTransactions();
    txns.push({ ...txn, id: Date.now() + '_' + Math.random().toString(36).slice(2, 8), date: new Date().toISOString() });
    this.setTransactions(txns);
  },
  deleteTransaction(id) {
    if (!id) return;
    this.setTransactions(this.getTransactions().filter(t => t.id !== id));
  },

  // Notes
  getNotes() {
    const notes = this.get('notes', []);
    return Array.isArray(notes) ? notes : [];
  },
  setNotes(notes) { this.set('notes', Array.isArray(notes) ? notes : []); },
  addNote(note) {
    if (!note) return;
    const notes = this.getNotes();
    notes.push({ ...note, id: Date.now() + '_' + Math.random().toString(36).slice(2, 8), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    this.setNotes(notes);
  },
  updateNote(id, updates) {
    if (!id) return;
    const notes = this.getNotes().map(n => n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n);
    this.setNotes(notes);
  },
  deleteNote(id) {
    if (!id) return;
    this.setNotes(this.getNotes().filter(n => n.id !== id));
  },

  // Debts (Lend/Borrow)
  getDebts() {
    const debts = this.get('debts', []);
    return Array.isArray(debts) ? debts : [];
  },
  setDebts(debts) { this.set('debts', Array.isArray(debts) ? debts : []); },
  addDebt(debt) {
    if (!debt) return;
    const debts = this.getDebts();
    debts.push({ ...debt, id: Date.now() + '_' + Math.random().toString(36).slice(2, 8), date: debt.date || new Date().toISOString(), settled: false });
    this.setDebts(debts);
  },
  deleteDebt(id) {
    if (!id) return;
    this.setDebts(this.getDebts().filter(d => d.id !== id));
  },

  // Savings Goals
  getSavingsGoals() {
    const goals = this.get('savings_goals', []);
    return Array.isArray(goals) ? goals : [];
  },
  setSavingsGoals(goals) { this.set('savings_goals', Array.isArray(goals) ? goals : []); },
  addSavingsGoal(goal) {
    if (!goal) return;
    const goals = this.getSavingsGoals();
    goals.push({ ...goal, id: Date.now() + '_' + Math.random().toString(36).slice(2, 8), currentAmount: goal.initialAmount || 0 });
    this.setSavingsGoals(goals);
  },
  deleteSavingsGoal(id) {
    if (!id) return;
    this.setSavingsGoals(this.getSavingsGoals().filter(g => g.id !== id));
  },

  // Focus sessions (Detox)
  getFocusSessions() {
    const sessions = this.get('focus_sessions', []);
    return Array.isArray(sessions) ? sessions : [];
  },
  addFocusSession(session) {
    if (!session) return;
    const sessions = this.getFocusSessions();
    sessions.push({ ...session, id: Date.now() + '_' + Math.random().toString(36).slice(2, 8) });
    this.set('focus_sessions', sessions);
  },

  // Settings
  getSettings() { return this.get('settings', { language: 'en', targetCGPA: 3.80, totalCreditsRequired: 144 }); },
  setSettings(settings) { this.set('settings', settings); },

  // XP & Level
  getXP() {
    const xp = this.get('xp', { total: 0, level: 1 });
    if (typeof xp.total !== 'number') xp.total = 0;
    if (typeof xp.level !== 'number') xp.level = 1;
    return xp;
  },
  addXP(amount) {
    if (typeof amount !== 'number' || amount <= 0) return this.getXP();
    const xp = this.getXP();
    xp.total += amount;
    xp.level = Math.floor(xp.total / 100) + 1;
    this.set('xp', xp);
    return xp;
  },

  // Quick links
  getQuickLinks() {
    const links = this.get('quick_links', []);
    return Array.isArray(links) ? links : [];
  },
  addQuickLink(link) {
    if (!link) return;
    const links = this.getQuickLinks();
    links.push({ ...link, id: Date.now() + '_' + Math.random().toString(36).slice(2, 8) });
    this.set('quick_links', links);
  },
  removeQuickLink(id) {
    if (!id) return;
    this.set('quick_links', this.getQuickLinks().filter(l => l.id !== id));
  }
};
