// LocalStorage Utilities
const Storage = {
  get(key: string, fallback: any = null) {
    try {
      const raw = localStorage.getItem('gbd_' + key);
      if (raw === null || raw === undefined) return fallback;
      const parsed = JSON.parse(raw);
      return parsed !== null && parsed !== undefined ? parsed : fallback;
    } catch {
      return fallback;
    }
  },
  set(key: string, value: any) {
    try {
      localStorage.setItem('gbd_' + key, JSON.stringify(value));
    } catch (e: any) {
      if (e.name === 'QuotaExceededError') {
        alert('Storage is full! Please clear some old data.');
      }
    }
  },
  remove(key: string) {
    try { localStorage.removeItem('gbd_' + key); } catch {}
  },

  // User
  getUser() { return this.get('user', null); },
  setUser(user: any) { this.set('user', user); },
  clearUser() { this.remove('user'); },

  // Tasks
  getTasks(): any[] {
    const tasks = this.get('tasks', []);
    return Array.isArray(tasks) ? tasks : [];
  },
  setTasks(tasks: any[]) { this.set('tasks', Array.isArray(tasks) ? tasks : []); },
  addTask(task: any) {
    if (!task) return;
    const tasks = this.getTasks();
    tasks.push({ ...task, id: Date.now() + '_' + Math.random().toString(36).slice(2, 8), status: 'todo', createdAt: new Date().toISOString() });
    this.setTasks(tasks);
  },
  updateTask(id: string, updates: any) {
    if (!id) return;
    const tasks = this.getTasks().map(t => t.id === id ? { ...t, ...updates } : t);
    this.setTasks(tasks);
  },
  deleteTask(id: string) {
    if (!id) return;
    this.setTasks(this.getTasks().filter(t => t.id !== id));
  },

  // Routine
  getRoutine(): Record<string, any[]> {
    const def: Record<string, any[]> = { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] };
    const data = this.get('routine', def);
    Object.keys(def).forEach(day => { if (!Array.isArray(data[day])) data[day] = []; });
    return data;
  },
  setRoutine(routine: any) { this.set('routine', routine); },
  addPeriod(day: string, period: any) {
    if (!day || !period) return;
    const routine = this.getRoutine();
    if (!Array.isArray(routine[day])) routine[day] = [];
    routine[day].push({ ...period, id: Date.now() + '_' + Math.random().toString(36).slice(2, 8) });
    this.setRoutine(routine);
  },
  deletePeriod(day: string, id: string) {
    if (!day || !id) return;
    const routine = this.getRoutine();
    if (!Array.isArray(routine[day])) return;
    routine[day] = routine[day].filter(p => p.id !== id);
    this.setRoutine(routine);
  },

  // Exams
  getExams(): any[] {
    const exams = this.get('exams', []);
    return Array.isArray(exams) ? exams : [];
  },
  setExams(exams: any[]) { this.set('exams', Array.isArray(exams) ? exams : []); },
  addExam(exam: any) {
    if (!exam) return;
    const exams = this.getExams();
    exams.push({ ...exam, id: Date.now() + '_' + Math.random().toString(36).slice(2, 8) });
    this.setExams(exams);
  },
  deleteExam(id: string) {
    if (!id) return;
    this.setExams(this.getExams().filter(e => String(e.id) !== String(id)));
  },
  updateExam(exam: any) {
    if (!exam || !exam.id) return;
    const exams = this.getExams();
    const idx = exams.findIndex(e => String(e.id) === String(exam.id));
    if (idx !== -1) { exams[idx] = exam; this.setExams(exams); }
  },

  // Semesters
  getSemesters(): any[] {
    const sems = this.get('semesters', []);
    return Array.isArray(sems) ? sems.map(s => ({ ...s, courses: Array.isArray(s.courses) ? s.courses : [] })) : [];
  },
  setSemesters(semesters: any[]) { this.set('semesters', Array.isArray(semesters) ? semesters : []); },
  addSemester(sem: any) {
    if (!sem) return;
    const sems = this.getSemesters();
    sems.push({ ...sem, id: Date.now() + '_' + Math.random().toString(36).slice(2, 8), courses: [] });
    this.setSemesters(sems);
  },
  deleteSemester(id: string) {
    if (!id) return;
    this.setSemesters(this.getSemesters().filter(s => String(s.id) !== String(id)));
  },
  addCourse(semId: string, course: any) {
    if (!semId || !course) return;
    const sems = this.getSemesters();
    const sem = sems.find(s => String(s.id) === String(semId));
    if (sem) {
      sem.courses.push({ ...course, id: Date.now() + '_' + Math.random().toString(36).slice(2, 8) });
      this.setSemesters(sems);
    }
  },
  deleteCourse(semId: string, courseId: string) {
    if (!semId || !courseId) return;
    const sems = this.getSemesters();
    const sem = sems.find(s => String(s.id) === String(semId));
    if (sem) {
      sem.courses = sem.courses.filter((c: any) => String(c.id) !== String(courseId));
      this.setSemesters(sems);
    }
  },
  updateCourse(semId: string, courseId: string, updates: any) {
    if (!semId || !courseId) return;
    const sems = this.getSemesters();
    const sem = sems.find(s => String(s.id) === String(semId));
    if (sem) {
      sem.courses = sem.courses.map((c: any) => String(c.id) === String(courseId) ? { ...c, ...updates } : c);
      this.setSemesters(sems);
    }
  },

  // Transactions
  getTransactions(): any[] {
    const txns = this.get('transactions', []);
    return Array.isArray(txns) ? txns : [];
  },
  setTransactions(txns: any[]) { this.set('transactions', Array.isArray(txns) ? txns : []); },
  addTransaction(txn: any) {
    if (!txn) return;
    const txns = this.getTransactions();
    txns.push({ ...txn, id: Date.now() + '_' + Math.random().toString(36).slice(2, 8), date: new Date().toISOString() });
    this.setTransactions(txns);
  },
  deleteTransaction(id: string) {
    if (!id) return;
    this.setTransactions(this.getTransactions().filter(t => t.id !== id));
  },

  // Notes
  getNotes(): any[] {
    const notes = this.get('notes', []);
    return Array.isArray(notes) ? notes : [];
  },
  setNotes(notes: any[]) { this.set('notes', Array.isArray(notes) ? notes : []); },
  addNote(note: any) {
    if (!note) return;
    const notes = this.getNotes();
    notes.push({ ...note, id: Date.now() + '_' + Math.random().toString(36).slice(2, 8), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    this.setNotes(notes);
  },
  updateNote(id: string, updates: any) {
    if (!id) return;
    const notes = this.getNotes().map(n => n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n);
    this.setNotes(notes);
  },
  deleteNote(id: string) {
    if (!id) return;
    this.setNotes(this.getNotes().filter(n => n.id !== id));
  },

  // Debts
  getDebts(): any[] {
    const debts = this.get('debts', []);
    return Array.isArray(debts) ? debts : [];
  },
  setDebts(debts: any[]) { this.set('debts', Array.isArray(debts) ? debts : []); },
  addDebt(debt: any) {
    if (!debt) return;
    const debts = this.getDebts();
    debts.push({ ...debt, id: Date.now() + '_' + Math.random().toString(36).slice(2, 8), date: debt.date || new Date().toISOString(), settled: false });
    this.setDebts(debts);
  },
  deleteDebt(id: string) {
    if (!id) return;
    this.setDebts(this.getDebts().filter(d => String(d.id) !== String(id)));
  },
  settleDebt(id: string) {
    if (!id) return;
    const debts = this.getDebts().map(d => String(d.id) === String(id) ? { ...d, settled: true, settledDate: new Date().toISOString() } : d);
    this.setDebts(debts);
  },

  // Savings Goals
  getSavingsGoals(): any[] {
    const goals = this.get('savings_goals', []);
    return Array.isArray(goals) ? goals : [];
  },
  setSavingsGoals(goals: any[]) { this.set('savings_goals', Array.isArray(goals) ? goals : []); },
  addSavingsGoal(goal: any) {
    if (!goal) return;
    const goals = this.getSavingsGoals();
    goals.push({ ...goal, id: Date.now() + '_' + Math.random().toString(36).slice(2, 8), currentAmount: goal.initialAmount || 0 });
    this.setSavingsGoals(goals);
  },
  deleteSavingsGoal(id: string) {
    if (!id) return;
    this.setSavingsGoals(this.getSavingsGoals().filter(g => g.id !== id));
  },

  // Focus sessions
  getFocusSessions(): any[] {
    const sessions = this.get('focus_sessions', []);
    return Array.isArray(sessions) ? sessions : [];
  },
  addFocusSession(session: any) {
    if (!session) return;
    const sessions = this.getFocusSessions();
    sessions.push({ ...session, id: Date.now() + '_' + Math.random().toString(36).slice(2, 8) });
    this.set('focus_sessions', sessions);
  },

  // Settings
  getSettings() { return this.get('settings', { language: 'en', targetCGPA: 3.80, totalCreditsRequired: 144 }); },
  setSettings(settings: any) { this.set('settings', settings); },

  // XP & Level
  getXP() {
    const xp = this.get('xp', { total: 0, level: 1 });
    if (typeof xp.total !== 'number') xp.total = 0;
    if (typeof xp.level !== 'number') xp.level = 1;
    return xp;
  },
  addXP(amount: number) {
    if (typeof amount !== 'number' || amount <= 0) return this.getXP();
    const xp = this.getXP();
    xp.total += amount;
    xp.level = Math.floor(xp.total / 100) + 1;
    this.set('xp', xp);
    return xp;
  },

  // Books
  getBooks(): any[] {
    const books = this.get('books', []);
    return Array.isArray(books) ? books : [];
  },
  setBooks(books: any[]) { this.set('books', Array.isArray(books) ? books : []); },
  addBook(book: any) {
    if (!book) return;
    const books = this.getBooks();
    books.push({ ...book, id: Date.now() + '_' + Math.random().toString(36).slice(2, 8), addedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    this.setBooks(books);
  },
  updateBook(id: string, updates: any) {
    if (!id) return;
    const books = this.getBooks().map(b => b.id === id ? { ...b, ...updates, updatedAt: new Date().toISOString() } : b);
    this.setBooks(books);
  },
  deleteBook(id: string) {
    if (!id) return;
    this.setBooks(this.getBooks().filter(b => b.id !== id));
  },

  // Quick links
  getQuickLinks(): any[] {
    const links = this.get('quick_links', []);
    return Array.isArray(links) ? links : [];
  },
  addQuickLink(link: any) {
    if (!link) return;
    const links = this.getQuickLinks();
    links.push({ ...link, id: Date.now() + '_' + Math.random().toString(36).slice(2, 8) });
    this.set('quick_links', links);
  },
  removeQuickLink(id: string) {
    if (!id) return;
    this.set('quick_links', this.getQuickLinks().filter(l => l.id !== id));
  },

  // Dashboard tiles
  getDashboardTiles() {
    return this.get('dashboard_tiles', ['planner', 'routine', 'exams', 'money', 'notes']);
  },
  setDashboardTiles(ids: string[]) {
    this.set('dashboard_tiles', ids);
  },

  // Export all gbd_ data as JSON
  exportAllData(): string {
    const data: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('gbd_')) {
        try { data[key] = JSON.parse(localStorage.getItem(key)!); } catch { data[key] = localStorage.getItem(key); }
      }
    }
    return JSON.stringify(data, null, 2);
  },

  // Clear all gbd_ data from localStorage
  clearAllData() {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('gbd_')) keysToRemove.push(key);
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  },

  // Import data from JSON string, merges/overwrites
  importAllData(jsonString: string) {
    const data = JSON.parse(jsonString);
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('gbd_')) {
        localStorage.setItem(key, JSON.stringify(value));
      }
    }
  },
};

export default Storage;
