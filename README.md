<h1 align="center">Good Bye Dopamine (GBD)</h1>

<p align="center">
  <strong>Your all-in-one student dashboard for academics, focus, finances, and wellness.</strong><br/>
  <em>Built by <a href="#">Zia Uddin Zisan</a></em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Active-22d3ee?style=flat-square" alt="Status" />
  <img src="https://img.shields.io/badge/PWA-Installable-a78bfa?style=flat-square" alt="PWA" />
  <img src="https://img.shields.io/badge/Backend-None-f43f5e?style=flat-square" alt="No Backend" />
  <img src="https://img.shields.io/badge/License-Proprietary-fb923c?style=flat-square" alt="License" />
</p>

---

## What is GBD?

**Good Bye Dopamine** is a personal challenge wrapped inside a student dashboard. The idea is simple — stop doomscrolling, stop chasing cheap dopamine hits, and start actually getting things done.

It's a single web app that replaces a dozen tabs you'd normally have open. Your planner, class routine, exam schedule, CGPA tracker, budget manager, focus timer, and wellness journal — all in one place, all inside your browser.

**No sign-ups. No servers. No data leaves your device.** Everything lives in your browser's localStorage. You own your data, always.

---

## Features

### 📋 Planner
A clean kanban-style task board with three columns: *To Do*, *In Progress*, and *Done*. You drag tasks between columns, tag them by priority, and the app tracks your completion rate. Every task you finish earns you XP.

### 🏫 Class Routine
A visual weekly timetable. You add your classes once and they show up every week — room number, teacher name, time slot, everything. The current day is always highlighted so you know what's coming up.

### 📝 Exam Tracker
Log upcoming exams with their dates, target grades, and credit weights. The tracker shows you a countdown to each exam and keeps them sorted by urgency. No more "wait, when was that midterm again?" moments.

### 🎓 Academic Hub (CGPA Calculator)
Track your GPA across multiple semesters. Add courses, credit hours, and grades — and the app calculates your cumulative CGPA in real time. You can set a target GPA and see exactly how far off you are.

### 💰 Finance Tracker
A straightforward money manager built for students:
- **Transactions** — log income and expenses, see your balance at a glance
- **Debts** — track who owes you money and who you owe (with settle/unsettled status)
- **Savings Goals** — set a target (like "new laptop" or "emergency fund") and contribute to it over time with a visual progress bar

### 📒 Notes
A simple, fast note-taking tool. Write down lecture notes, ideas, or to-do lists. Notes are saved automatically and searchable by title.

### 🧘 Detox (Focus Timer)
This is the heart of GBD. A proper focus session tool with:
- **Preset durations** — 25 min, 50 min, 90 min, or custom
- **Countdown timer** — not a stopwatch, a real countdown that tells you "stay focused for X more minutes"
- **Focus sounds** — Rain, White Noise, or Lofi music playing in the background during your session
- **Distraction Guard** — a list of domains you're "blocking" (as a reminder to yourself — Facebook, YouTube, Instagram, etc.)
- **Focus Tree 🌳** — a gamified tree that grows through 5 stages based on your total focus hours. The more you focus, the bigger it grows
- **Session history** — every completed session is logged with its duration and date

### 💚 Health & Wellness
A brand new wellness tracker with three tabs:
- **Overview** — your Daily Wellness Score (0-100) as a circular progress ring, plus quick-action buttons
- **Physical** — hydration tracker (glasses of water with +/- buttons), sleep tracker (bedtime & wake-up with quality rating), and step counter
- **Mental** — mood journal with 6 emoji moods (Happy, Energetic, Calm, Neutral, Tired, Stressed) plus a free-text notes area, and a guided **4-7-8 breathing exercise** with an animated circle

### 📊 Reports
Visual charts showing your productivity trends — tasks completed, focus hours, and streaks over time.

### 🤖 AI-Powered Import (Magic Import)
Don't want to type your routine or exam schedule by hand? Just snap a photo:
1. Take a picture of your class routine or exam schedule (printed or handwritten)
2. The app uses **Google Gemini Vision API** to read the image
3. It extracts every class/exam into structured data
4. You review, select what to import, and it's done

Your API key stays in your browser. It never touches a server.

### 🎮 Gamification
Every task you complete, every focus session you finish, every exam you log — it all earns you **XP**. You level up your profile as you go. It's a small thing, but it makes the grind feel like progress.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML, CSS, JavaScript |
| Storage | Browser localStorage |
| AI | Google Gemini Vision API (client-side) |
| OCR | Tesseract.js (client-side) |
| PWA | Service Worker + Web App Manifest |
| Hosting | Any static host (GitHub Pages, Vercel, Netlify) |

**Zero dependencies. Zero build steps. Zero backend.**

---

## Install as App

GBD is a **Progressive Web App (PWA)**. Open it in Chrome or Safari on your phone, and you'll get an "Install" or "Add to Home Screen" prompt. It works offline and feels like a native app — no app store needed.

---

## Privacy

- **No accounts.** You pick a username on first launch, but it's just saved locally.
- **No database.** Everything is stored in `localStorage` — your browser, your data.
- **No tracking.** No analytics, no cookies, no third-party scripts (except Google Fonts and the optional Gemini API).
- **The AI key** you enter for Magic Import is stored *only* in your browser. There is no backend to leak it to.

---

## Developer

Built with ☕ and late nights by **Zia Uddin Zisan**.

If you want to contribute, fork the repo and submit a PR. Bug fixes, new features, translations — all welcome.

## License

© 2026 Zia Uddin Zisan. All rights reserved.
