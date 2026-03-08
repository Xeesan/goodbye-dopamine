// Internationalization system — English (primary) & Bangla (secondary)
export type Lang = 'en' | 'bn';

const translations = {
  // ─── Common ───
  'app.name': { en: 'GBD', bn: 'GBD' },
  'app.tagline': { en: 'Good Bye Dopamine', bn: 'গুড বাই ডোপামিন' },
  'common.save': { en: 'Save', bn: 'সেভ করুন' },
  'common.cancel': { en: 'Cancel', bn: 'বাতিল' },
  'common.delete': { en: 'Delete', bn: 'মুছুন' },
  'common.add': { en: 'Add', bn: 'যোগ করুন' },
  'common.edit': { en: 'Edit', bn: 'সম্পাদনা' },
  'common.search': { en: 'Search', bn: 'খুঁজুন' },
  'common.close': { en: 'Close', bn: 'বন্ধ' },
  'common.yes': { en: 'Yes', bn: 'হ্যাঁ' },
  'common.no': { en: 'No', bn: 'না' },
  'common.confirm': { en: 'Confirm', bn: 'নিশ্চিত' },
  'common.customize': { en: 'CUSTOMIZE', bn: 'কাস্টমাইজ' },
  'common.offline': { en: 'OFFLINE', bn: 'অফলাইন' },
  'common.refresh': { en: 'Refresh', bn: 'রিফ্রেশ' },

  // ─── Sidebar ───
  'nav.dashboard': { en: 'Dashboard', bn: 'ড্যাশবোর্ড' },
  'nav.academic': { en: 'ACADEMIC', bn: 'একাডেমিক' },
  'nav.planner': { en: 'Planner', bn: 'পরিকল্পনা' },
  'nav.routine': { en: 'Routine', bn: 'রুটিন' },
  'nav.exams': { en: 'Exams', bn: 'পরীক্ষা' },
  'nav.academic_hub': { en: 'Academic Hub', bn: 'একাডেমিক হাব' },
  'nav.personal': { en: 'PERSONAL', bn: 'ব্যক্তিগত' },
  'nav.money': { en: 'Money', bn: 'টাকা-পয়সা' },
  'nav.notes': { en: 'Notes', bn: 'নোটস' },
  'nav.booklist': { en: 'Booklist', bn: 'বইয়ের তালিকা' },
  'nav.wellness': { en: 'WELLNESS', bn: 'সুস্থতা' },
  'nav.detox': { en: 'Detox', bn: 'ডিটক্স' },
  'nav.health': { en: 'Health', bn: 'স্বাস্থ্য' },
  'nav.reports': { en: 'Reports', bn: 'রিপোর্ট' },
  'nav.system': { en: 'SYSTEM', bn: 'সিস্টেম' },
  'nav.notifications': { en: 'Notifications', bn: 'নোটিফিকেশন' },
  'nav.exit': { en: 'Exit Session', bn: 'বের হন' },
  'nav.developed_by': { en: 'Developed by', bn: 'তৈরি করেছেন' },

  // ─── Dashboard ───
  'dash.welcome': { en: 'Welcome back,', bn: 'স্বাগতম,' },
  'dash.subtitle': { en: "Here's your productivity overview for this week.", bn: 'এই সপ্তাহের প্রোডাক্টিভিটি ওভারভিউ।' },
  'dash.daily_inspiration': { en: 'DAILY INSPIRATION', bn: 'আজকের অনুপ্রেরণা' },
  'dash.quick_tiles': { en: 'QUICK TILES', bn: 'কুইক টাইলস' },
  'dash.quick_access': { en: 'QUICK ACCESS', bn: 'দ্রুত প্রবেশ' },
  'dash.add_link': { en: '+ ADD LINK', bn: '+ লিংক যোগ করুন' },
  'dash.no_links': { en: 'No quick links yet. Add your favorite resources!', bn: 'এখনও কোন লিংক নেই। আপনার পছন্দের রিসোর্স যোগ করুন!' },
  'dash.achievements': { en: 'RECENT ACHIEVEMENTS', bn: 'সাম্প্রতিক অর্জন' },
  'dash.no_badges': { en: 'No badges earned yet. Keep pushing!', bn: 'এখনো কোনো ব্যাজ পাননি। চেষ্টা চালিয়ে যান!' },
  'dash.tasks': { en: 'TASKS', bn: 'কাজ' },
  'dash.focus_time': { en: 'FOCUS TIME', bn: 'ফোকাস সময়' },
  'dash.streak': { en: 'STREAK', bn: 'স্ট্রিক' },
  'dash.detox': { en: 'DETOX', bn: 'ডিটক্স' },
  'dash.wellness': { en: 'WELLNESS', bn: 'সুস্থতা' },
  'dash.progress_to': { en: 'Progress to Level', bn: 'লেভেল পর্যন্ত অগ্রগতি' },
  'dash.total_xp': { en: 'TOTAL XP', bn: 'মোট XP' },
  'dash.xp_to_go': { en: 'XP to go', bn: 'XP বাকি' },
  'dash.xp_earned': { en: 'XP earned', bn: 'XP অর্জিত' },
  'dash.level': { en: 'LEVEL', bn: 'লেভেল' },
  'dash.add_link_title': { en: 'Add Quick Link', bn: 'কুইক লিংক যোগ করুন' },
  'dash.link_name_prompt': { en: 'Enter the link name:', bn: 'লিংকের নাম লিখুন:' },
  'dash.link_url_prompt': { en: 'Enter the URL (include https://):', bn: 'URL লিখুন (https:// সহ):' },

  // ─── Money / Lend-Borrow ───
  'money.title': { en: 'Money', bn: 'টাকা-পয়সা' },
  'money.subtitle': { en: 'Manage transactions, debts, and savings', bn: 'লেনদেন, ঋণ এবং সঞ্চয় পরিচালনা করুন' },
  'money.transactions': { en: 'TRANSACTIONS', bn: 'লেনদেন' },
  'money.lend_borrow': { en: 'LEND/BORROW', bn: 'ধার দেওয়া/নেওয়া' },
  'money.savings': { en: 'SAVINGS GOALS', bn: 'সঞ্চয় লক্ষ্য' },
  'money.add_transaction': { en: 'Add Transaction', bn: 'লেনদেন যোগ করুন' },
  'money.add_debt': { en: 'Add Debt', bn: 'ধার যোগ করুন' },
  'money.add_goal': { en: 'Add Goal', bn: 'লক্ষ্য যোগ করুন' },
  'money.total_income': { en: 'TOTAL INCOME', bn: 'মোট আয়' },
  'money.total_expense': { en: 'TOTAL EXPENSE', bn: 'মোট খরচ' },
  'money.balance': { en: 'BALANCE', bn: 'ব্যালেন্স' },
  'money.recent_txns': { en: 'Recent Transactions', bn: 'সাম্প্রতিক লেনদেন' },
  'money.no_txns': { en: 'No transactions yet.', bn: 'এখনও কোন লেনদেন নেই।' },
  'money.income': { en: 'Income', bn: 'আয়' },
  'money.expense': { en: 'Expense', bn: 'খরচ' },
  'money.type': { en: 'TYPE', bn: 'ধরন' },
  'money.description': { en: 'DESCRIPTION', bn: 'বিবরণ' },
  'money.amount': { en: 'AMOUNT', bn: 'পরিমাণ' },
  'money.lent': { en: 'LENT', bn: 'ধার দেওয়া' },
  'money.borrowed': { en: 'BORROWED', bn: 'ধার নেওয়া' },
  'money.net': { en: 'NET', bn: 'নেট' },
  'money.you_are_owed': { en: 'You are owed', bn: 'আপনার পাওনা আছে' },
  'money.you_owe': { en: 'You owe', bn: 'আপনার দেনা আছে' },
  'money.all_even': { en: 'All even', bn: 'সব সমান' },
  'money.people_summary': { en: 'People Summary', bn: 'ব্যক্তি সারসংক্ষেপ' },
  'money.they_owe_you': { en: 'They owe you', bn: 'তারা আপনাকে দেবে' },
  'money.you_owe_them': { en: 'You owe them', bn: 'আপনি তাদের দেবেন' },
  'money.even': { en: 'Even ✓', bn: 'সমান ✓' },
  'money.new_entry': { en: 'New Entry', bn: 'নতুন এন্ট্রি' },
  'money.i_lent': { en: '↑ I Lent Money', bn: '↑ আমি ধার দিয়েছি' },
  'money.i_borrowed': { en: '↓ I Borrowed Money', bn: '↓ আমি ধার নিয়েছি' },
  'money.quick_select': { en: 'QUICK SELECT', bn: 'দ্রুত নির্বাচন' },
  'money.recent_contacts': { en: 'RECENT CONTACTS', bn: 'সাম্প্রতিক পরিচিতি' },
  'money.person': { en: 'PERSON', bn: 'ব্যক্তি' },
  'money.who': { en: 'Who?', bn: 'কে?' },
  'money.reason': { en: 'REASON (OPTIONAL)', bn: 'কারণ (ঐচ্ছিক)' },
  'money.what_for': { en: 'What for?', bn: 'কিসের জন্য?' },
  'money.date': { en: 'DATE', bn: 'তারিখ' },
  'money.save_lend': { en: '↑ Save Lend', bn: '↑ ধার দেওয়া সেভ' },
  'money.save_borrow': { en: '↓ Save Borrow', bn: '↓ ধার নেওয়া সেভ' },
  'money.active_debts': { en: 'Active Debts', bn: 'সক্রিয় ঋণ' },
  'money.no_debts': { en: 'No active debts — all clear!', bn: 'কোনো সক্রিয় ঋণ নেই — সব পরিষ্কার!' },
  'money.no_match': { en: 'No debts matching', bn: 'কোনো ঋণ পাওয়া যায়নি' },
  'money.settle': { en: 'Settle', bn: 'মিটিয়ে দিন' },
  'money.settle_all': { en: 'Settle All', bn: 'সব মিটান' },
  'money.settled_history': { en: 'Settled History', bn: 'মিটানোর ইতিহাস' },
  'money.settled': { en: 'Settled', bn: 'মিটানো হয়েছে' },
  'money.search_person': { en: 'Search person...', bn: 'ব্যক্তি খুঁজুন...' },
  'money.lent_label': { en: 'Lent', bn: 'ধার দেওয়া' },
  'money.borrowed_label': { en: 'Borrowed', bn: 'ধার নেওয়া' },
  'money.goal_title': { en: 'Goal Title (e.g. New Laptop)', bn: 'লক্ষ্যের নাম (যেমন: নতুন ল্যাপটপ)' },
  'money.target_amount': { en: 'Target Amount', bn: 'টার্গেট পরিমাণ' },
  'money.initial_amount': { en: 'Initial Amount', bn: 'প্রাথমিক পরিমাণ' },
  'money.create_goal': { en: 'Create Goal', bn: 'লক্ষ্য তৈরি' },
  'money.no_goals': { en: 'No savings goals yet', bn: 'এখনও কোন সঞ্চয় লক্ষ্য নেই' },
  'money.target': { en: 'Target', bn: 'টার্গেট' },

  // ─── Planner ───
  'planner.title': { en: 'Planner', bn: 'পরিকল্পনা' },
  'planner.subtitle': { en: 'Organize your tasks and priorities', bn: 'আপনার কাজ ও অগ্রাধিকার সাজান' },
  'planner.add_task': { en: '+ Add Task', bn: '+ কাজ যোগ করুন' },
  'planner.todo': { en: 'To Do', bn: 'করতে হবে' },
  'planner.in_progress': { en: 'In Progress', bn: 'চলমান' },
  'planner.done': { en: 'Done', bn: 'সম্পন্ন' },
  'planner.no_tasks': { en: 'No tasks yet', bn: 'এখনও কোন কাজ নেই' },

  // ─── Routine ───
  'routine.title': { en: 'Routine', bn: 'রুটিন' },
  'routine.subtitle': { en: 'Your weekly class schedule', bn: 'আপনার সাপ্তাহিক ক্লাস শিডিউল' },
  'routine.add_period': { en: 'Add Period', bn: 'পিরিয়ড যোগ করুন' },
  'routine.no_classes': { en: 'No classes for this day', bn: 'আজ কোনো ক্লাস নেই' },
  'routine.subject': { en: 'Subject', bn: 'বিষয়' },
  'routine.room': { en: 'Room', bn: 'রুম' },
  'routine.start_time': { en: 'Start Time', bn: 'শুরুর সময়' },
  'routine.end_time': { en: 'End Time', bn: 'শেষের সময়' },

  // ─── Days ───
  'day.monday': { en: 'MONDAY', bn: 'সোমবার' },
  'day.tuesday': { en: 'TUESDAY', bn: 'মঙ্গলবার' },
  'day.wednesday': { en: 'WEDNESDAY', bn: 'বুধবার' },
  'day.thursday': { en: 'THURSDAY', bn: 'বৃহস্পতিবার' },
  'day.friday': { en: 'FRIDAY', bn: 'শুক্রবার' },
  'day.saturday': { en: 'SATURDAY', bn: 'শনিবার' },
  'day.sunday': { en: 'SUNDAY', bn: 'রবিবার' },

  // ─── Exams ───
  'exams.title': { en: 'Exams', bn: 'পরীক্ষা' },
  'exams.subtitle': { en: 'Track your upcoming exams', bn: 'আগামী পরীক্ষার হিসাব রাখুন' },

  // ─── Notes ───
  'notes.title': { en: 'Notes', bn: 'নোটস' },
  'notes.subtitle': { en: 'Quick notes and ideas', bn: 'দ্রুত নোট ও আইডিয়া' },

  // ─── Booklist ───
  'booklist.title': { en: 'Booklist', bn: 'বইয়ের তালিকা' },
  'booklist.subtitle': { en: 'Track your reading list', bn: 'আপনার পড়ার তালিকা ট্র্যাক করুন' },

  // ─── Detox ───
  'detox.title': { en: 'Detox', bn: 'ডিটক্স' },
  'detox.subtitle': { en: 'Focus timer and digital detox', bn: 'ফোকাস টাইমার ও ডিজিটাল ডিটক্স' },

  // ─── Health ───
  'health.title': { en: 'Health', bn: 'স্বাস্থ্য' },
  'health.subtitle': { en: 'Health reminders and wellness', bn: 'স্বাস্থ্য রিমাইন্ডার ও সুস্থতা' },

  // ─── Reports ───
  'reports.title': { en: 'Reports', bn: 'রিপোর্ট' },
  'reports.subtitle': { en: 'Your productivity analytics', bn: 'আপনার প্রোডাক্টিভিটি বিশ্লেষণ' },

  // ─── Profile ───
  'profile.title': { en: 'Profile', bn: 'প্রোফাইল' },

  // ─── Notifications ───
  'notifications.title': { en: 'Notifications', bn: 'নোটিফিকেশন' },

  // ─── Tile names ───
  'tile.planner': { en: 'Planner', bn: 'পরিকল্পনা' },
  'tile.routine': { en: 'Routine', bn: 'রুটিন' },
  'tile.exams': { en: 'Exams', bn: 'পরীক্ষা' },
  'tile.academic': { en: 'Academic', bn: 'একাডেমিক' },
  'tile.money': { en: 'Money', bn: 'টাকা-পয়সা' },
  'tile.notes': { en: 'Notes', bn: 'নোটস' },
  'tile.booklist': { en: 'Booklist', bn: 'বই' },
  'tile.detox': { en: 'Detox', bn: 'ডিটক্স' },
  'tile.reports': { en: 'Reports', bn: 'রিপোর্ট' },

  // ─── Language ───
  'lang.switch': { en: 'বাংলা', bn: 'English' },
} as const;

export type TranslationKey = keyof typeof translations;

let currentLang: Lang = (typeof localStorage !== 'undefined' ? localStorage.getItem('gbd_lang') as Lang : null) || 'en';

const listeners: Set<() => void> = new Set();

export function getLang(): Lang {
  return currentLang;
}

export function setLang(lang: Lang) {
  currentLang = lang;
  if (typeof localStorage !== 'undefined') localStorage.setItem('gbd_lang', lang);
  listeners.forEach(fn => fn());
}

export function t(key: TranslationKey): string {
  const entry = translations[key];
  if (!entry) return key;
  return entry[currentLang] || entry.en;
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
