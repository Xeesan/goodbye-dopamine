// ============================
// Main App Router & Utilities — Production
// ============================
let currentPage = 'dashboard';

// Global error handler
window.onerror = function (msg, url, line, col, error) {
    console.error('[GBD Error]', msg, 'at', url, ':', line, ':', col, error);
    return false; // let the browser also log it
};
window.addEventListener('unhandledrejection', function (e) {
    console.error('[GBD Unhandled Promise]', e.reason);
});

function navigateTo(page) {
    currentPage = page;

    // Update sidebar active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) item.classList.add('active');
    });

    // Close sidebar on mobile after navigation
    closeSidebar();

    // Render page
    const container = document.getElementById('page-container');
    if (!container) return;
    container.scrollTop = 0;

    try {
        switch (page) {
            case 'dashboard': renderDashboard(container); break;
            case 'planner': renderPlanner(container); break;
            case 'routine': renderRoutine(container); break;
            case 'exams': renderExams(container); break;
            case 'academic-hub': renderAcademicHub(container); break;
            case 'money': renderMoney(container); break;
            case 'notes': renderNotes(container); break;
            case 'detox': renderDetox(container); break;
            case 'health': renderHealth(container); break;
            case 'reports': renderReports(container); break;
            case 'profile': renderProfile(container); break;
            default: renderDashboard(container);
        }
    } catch (err) {
        console.error('[GBD] Page render error:', err);
        container.innerHTML = `
            <div class="empty-state" style="padding:80px 20px">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                <h3 style="margin-top:16px">Something went wrong</h3>
                <p>Try refreshing the page or <a href="#" onclick="navigateTo('dashboard')" style="color:var(--accent)">go to Dashboard</a></p>
            </div>`;
    }
}

function updateHeaderDate() {
    const now = new Date();
    const el = document.getElementById('header-date');
    if (el) {
        el.textContent = formatDateShort(now);
    }
}

// ============================
// Daily Summary - show once per day
// ============================
function showDailySummary() {
    const today = new Date().toDateString();
    const lastShown = Storage.get('daily_summary_last_shown', '');

    // Only show once per day
    if (lastShown === today) return;

    const tasks = Storage.getTasks();
    const completedToday = tasks.filter(t => {
        try {
            const d = new Date(t.createdAt);
            return t.status === 'done' && d.toDateString() === today;
        } catch { return false; }
    }).length;

    const sessions = Storage.getFocusSessions();
    const todaySessions = sessions.filter(s => {
        try {
            const d = new Date(s.date);
            return d.toDateString() === today;
        } catch { return false; }
    });
    const totalFocusMin = todaySessions.reduce((acc, s) => acc + (s.duration || 0), 0);

    const focusEl = document.getElementById('modal-focus');
    const plannerEl = document.getElementById('modal-planner');
    const modalEl = document.getElementById('daily-summary-modal');
    if (focusEl) focusEl.textContent = (totalFocusMin / 60).toFixed(1) + 'h';
    if (plannerEl) plannerEl.textContent = completedToday;
    if (modalEl) modalEl.style.display = 'flex';
}

function closeDailySummary() {
    const el = document.getElementById('daily-summary-modal');
    if (el) el.style.display = 'none';
    // Mark as shown for today
    Storage.set('daily_summary_last_shown', new Date().toDateString());
}

// ============================
// Mobile Sidebar Toggle
// ============================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('active');
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
}

// ============================
// Utilities — DD/MM/YYYY Date Format
// ============================
function toggleLanguage() {
    alert('Language toggle is a visual feature. Bengali translation coming soon!');
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    } catch { return dateStr; }
}

function formatDateShort(dateOrStr) {
    try {
        const d = typeof dateOrStr === 'string' ? new Date(dateOrStr) : dateOrStr;
        if (isNaN(d.getTime())) return '';
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    } catch { return ''; }
}

function formatTime(timeStr) {
    if (!timeStr) return '';
    return timeStr;
}

function getCurrentDayName() {
    return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()];
}

// Notification permission request
function requestNotifications() {
    if ('Notification' in window) {
        Notification.requestPermission().then(p => {
            if (p === 'granted') alert('Notifications enabled!');
        });
    }
}

// Initialize app on load
document.addEventListener('DOMContentLoaded', () => {
    try {
        const user = Storage.getUser();
        if (user) {
            showApp();
        } else {
            showAuth();
        }
    } catch (err) {
        console.error('[GBD] Init error:', err);
        showAuth();
    }
});
