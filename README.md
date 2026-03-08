<p align="center">
  <img src="public/favicon.svg" alt="GBD Logo" width="80" height="80" />
</p>

<h1 align="center">GBD — Good Bye Dopamine</h1>

<p align="center">
  <strong>A gamified productivity suite for students who want to take back control of their time.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Supabase-Backend-3FCF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/PWA-Installable-5A0FC8?style=flat-square&logo=pwa&logoColor=white" alt="PWA" />
  <img src="https://img.shields.io/badge/Vite-Build-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
</p>

<p align="center">
  <a href="https://goodbye-dopamine.lovable.app">🚀 Live App</a> · 
  <a href="#features">Features</a> · 
  <a href="#tech-stack">Tech Stack</a> · 
  <a href="#getting-started">Getting Started</a> · 
  <a href="#contributing">Contributing</a>
</p>

---

## 🎯 What is GBD?

GBD (Good Bye Dopamine) is an all-in-one academic and personal productivity web app designed for students. It combines task planning, exam tracking, financial management, reading lists, focus sessions, and more — all wrapped in a gamification layer that rewards you with XP and levels for staying productive.

Install it as an app on your phone or desktop — it works offline too.

---

## ✨ Features

| Module | Highlights |
|---|---|
| **📊 Dashboard** | Personalized welcome, daily quotes, XP progress bar, customizable quick-access tiles & links |
| **📅 Planner** | Tasks with priority, dates, reminders · Kanban workflow (Todo → In Progress → Done) · XP rewards |
| **⏰ Routine** | Weekly schedule builder (Mon–Sun) · AI-powered OCR import from timetable photos |
| **📝 Exams** | Countdown timers, urgency indicators (critical/warning/safe) · AI OCR bulk import |
| **🎓 Academic Hub** | GPA Tracker (semester + cumulative CGPA) · GPA Calculator · GPA Simulator |
| **💰 Money Manager** | Income/expense tracker · Debt tracker · Savings goals with progress bars |
| **📓 Notes** | Rich notes with categories · Full-text search · Inline viewer |
| **📚 Booklist** | Reading library with status tabs · Page tracking, ratings, genres |
| **🧘 Digital Detox** | Focus timer (5–120 min) · Ambient sounds (Rain, Forest, Lo-Fi…) · Growing tree visualization |
| **❤️ Health** | Breathing exercise · Customizable health reminders (water, posture, eye break, stretching) |
| **📈 Reports** | Productivity analytics and insights |
| **📅 Global Calendar** | Unified calendar widget accessible from any page — tap events to jump to their section |
| **🔔 Notifications** | Push notifications for task reminders & health alerts · In-app notification center |
| **👤 Profile** | Avatar upload, bio, institution · Account management |
| **🌗 Theming** | Light & dark mode with smooth transitions, persisted preference |
| **🌐 i18n** | English & Bengali language support with one-tap toggle |

---

## 🤖 AI-Powered OCR

GBD features a triple-mode OCR system for importing class routines and exam schedules from photos:

| Mode | How it works |
|---|---|
| **AI (Free)** | Uses Lovable AI (Gemini) — no API key needed, best accuracy |
| **Online AI** | Bring your own Gemini / OpenAI / custom API key for cloud-based extraction |
| **Offline** | Tesseract.js runs entirely in your browser — works without internet |

The AI modes are specifically tuned for university-style timetables (days × time slots) and exam lists (date, subject, faculty, room).

---

## 🎮 Gamification

Every productive action earns XP:

| Action | XP |
|---|---|
| Create a task | +10 |
| Complete a task | +20 |
| Add a routine period | +5 |
| Add an exam | +15 |
| Add a transaction / debt | +5 |
| Set a savings goal | +10 |
| Add a note | +10 |
| Add a book | +10 |
| Finish a book | +25 |
| Add a course | +10 |
| Focus session | +duration (min 5) |

**Level up every 100 XP.** XP is synced to the cloud via server-side atomic increments — tamper-proof and persistent across devices. A celebratory toast with your new rank title appears on every level-up.

---

## 📱 Progressive Web App

- **Installable** on iOS, Android, and Desktop
- **Offline support** — full functionality without internet
- **Sync queue** — failed writes auto-retry on reconnection
- **Connection indicator** — visual offline/online badge in header
- **Responsive** — optimized layouts for mobile and desktop with bottom-sheet dialogs on small screens
- **Push notifications** — task reminders and health alerts via Web Push API

---

## 🔒 Security

- **Row-Level Security (RLS)** on all tables — users only access their own data
- **Server-side XP** via `SECURITY DEFINER` Postgres function — no client-side manipulation
- **JWT verification** on edge functions using `getUser()`
- **Avatar allowlist** — only `jpeg`, `png`, `gif`, `webp` accepted
- **Private storage** with short-lived signed URLs
- **Email OTP** required on signup — no anonymous accounts

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | React 18 + TypeScript |
| **Build Tool** | Vite |
| **Styling** | Tailwind CSS + shadcn/ui |
| **Icons** | Lucide React |
| **Backend** | Supabase (Auth, Database, Storage, Edge Functions) |
| **OCR** | Tesseract.js (offline) + Gemini / OpenAI (online) + Lovable AI (free) |
| **PWA** | vite-plugin-pwa + Workbox |
| **State** | React Context + localStorage (hybrid) |
| **Charts** | Recharts |
| **Markdown** | react-markdown |
| **i18n** | Custom hook with EN/BN support |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm (or bun)

### Installation

```bash
git clone https://github.com/<your-username>/goodbye-dopamine.git
cd goodbye-dopamine
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

### Environment Variables

```
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_PUBLISHABLE_KEY=<your-supabase-anon-key>
```

---

## 📂 Project Structure

```
src/
├── components/
│   ├── gbd/               # App-specific components
│   │   ├── pages/         # All page components
│   │   ├── AppShell.tsx   # Main app layout
│   │   ├── AuthScreen.tsx # Login/signup screen
│   │   ├── Sidebar.tsx    # Navigation sidebar
│   │   ├── TopHeader.tsx  # Top bar with status
│   │   ├── ImageOCRImport # Triple-mode OCR component
│   │   └── DialogProvider # Responsive modal system
│   └── ui/                # shadcn/ui components
├── hooks/                 # Custom hooks (theme, i18n, gamification, health)
├── lib/                   # Utilities (storage, sync, OCR, i18n, leveling)
├── integrations/          # Supabase client & types
└── pages/                 # Route-level pages
supabase/
├── functions/             # Edge functions (OCR, push notifications)
└── config.toml            # Supabase configuration
docs/
└── index.html             # Landing page (GitHub Pages)
```

---

## 🤝 Contributing

1. **Fork** the repository
2. **Create a branch**: `git checkout -b feat/my-feature`
3. **Commit**: `git commit -m "feat: add awesome feature"`
4. **Push**: `git push origin feat/my-feature`
5. **Open a Pull Request**

### Guidelines

- Follow existing code style (TypeScript, functional components, Tailwind tokens)
- One feature or fix per PR
- Test locally before submitting
- Update README for new features

---
## Developer
<p align="center">
Built with ☕ and late nights by **Zia Uddin Zisan**.
</p>

## License

© 2026 Zia Uddin Zisan. All rights reserved
