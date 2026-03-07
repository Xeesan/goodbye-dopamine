// ============================
// Exams Page — Polished
// ============================
let examTab = 'exams';
let editingExamId = null;

function getExamCountdown(dateStr, timeStr) {
  try {
    const examDate = new Date(dateStr + 'T' + (timeStr || '09:00'));
    if (isNaN(examDate.getTime())) return { text: '—', days: 99, urgency: 'safe' };
    const now = new Date();
    const diff = examDate - now;
    if (diff <= 0) return { text: 'PASSED', days: -1, urgency: 'passed' };
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    if (days === 0 && hours >= 0) return { text: hours + 'h left', days: 0, urgency: 'critical' };
    if (days <= 3) return { text: days + 'd ' + Math.max(0, hours) + 'h', days, urgency: 'critical' };
    if (days <= 7) return { text: days + ' days', days, urgency: 'warning' };
    return { text: days + ' days', days, urgency: 'safe' };
  } catch { return { text: '—', days: 99, urgency: 'safe' }; }
}

function renderExams(container) {
  const exams = Storage.getExams();
  const filtered = exams
    .filter(e => e.type === examTab || (!e.type && examTab === 'exams'))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // Stats
  const upcoming = filtered.filter(e => getExamCountdown(e.date, e.time).days >= 0);
  const thisWeek = upcoming.filter(e => getExamCountdown(e.date, e.time).days <= 7);
  const totalCredits = upcoming.reduce((s, e) => s + (parseInt(e.credits) || 0), 0);

  container.innerHTML = `
    <div class="page-enter">
      <div class="page-header">
        <div>
          <h1>Exam Tracker</h1>
          <p class="page-desc">Stay ahead of your academic schedule.</p>
        </div>
        <div class="tab-group">
          <button class="tab-item ${examTab === 'exams' ? 'active' : ''}" onclick="switchExamTab('exams')">EXAMS</button>
          <button class="tab-item ${examTab === 'assignments' ? 'active' : ''}" onclick="switchExamTab('assignments')">ASSIGNMENTS</button>
        </div>
      </div>

      <!-- Stats Overview -->
      <div class="exam-stats-row">
        <div class="glass-card exam-stat-mini">
          <div class="exam-stat-num" style="color:var(--accent)">${upcoming.length}</div>
          <div class="exam-stat-lbl">UPCOMING</div>
        </div>
        <div class="glass-card exam-stat-mini">
          <div class="exam-stat-num" style="color:${thisWeek.length > 0 ? '#f59e0b' : 'var(--text-muted)'}">${thisWeek.length}</div>
          <div class="exam-stat-lbl">THIS WEEK</div>
        </div>
        <div class="glass-card exam-stat-mini">
          <div class="exam-stat-num" style="color:#a78bfa">${totalCredits}</div>
          <div class="exam-stat-lbl">TOTAL CREDITS</div>
        </div>
      </div>

      <!-- Add Exam Form -->
      <div class="glass-card" style="margin-bottom:16px">
        <div class="exam-form">
          <div class="exam-field">
            <label>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
              SUBJECT
            </label>
            <input type="text" id="exam-subject" class="input-simple" placeholder="e.g. Mathematics">
          </div>
          <div class="exam-field">
            <label>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              EXAM DATE
            </label>
            <input type="date" id="exam-date" class="input-simple" value="${new Date().toISOString().split('T')[0]}">
          </div>
          <div class="exam-field">
            <label>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              EXAM TIME
            </label>
            <input type="time" id="exam-time" class="input-simple" value="09:00">
          </div>
          <div class="exam-field">
            <label>TARGET GRADE</label>
            <input type="text" id="exam-grade" class="input-simple" placeholder="A+" value="A+">
          </div>
        </div>
        <div class="exam-form-bottom">
          <div class="exam-field">
            <label>CREDITS</label>
            <input type="number" id="exam-credits" class="input-simple" value="3" min="1" max="10">
          </div>
          <div class="exam-field">
            <label>TEACHER</label>
            <input type="text" id="exam-teacher" class="input-simple" placeholder="e.g. Dr. Smith">
          </div>
          <div class="exam-field">
            <label>ROOM / HALL</label>
            <input type="text" id="exam-room" class="input-simple" placeholder="e.g. Room 301">
          </div>
        </div>
        <div style="padding:0 24px 24px;display:flex;gap:12px">
          <button class="btn-green" style="flex:1" id="exam-submit-btn" onclick="addExamSubmit()">${editingExamId ? '✓ UPDATE ' : '+ ADD '}${examTab === 'exams' ? 'EXAM' : 'ASSIGNMENT'}</button>
          ${editingExamId ? '<button class="btn-outline" onclick="cancelExamEdit()">CANCEL</button>' : `<button class="btn-pdf-import" onclick="openPdfImportModal('exam')">
            🖼️ Import from Image
          </button>`}
        </div>
      </div>

      <!-- Exam List -->
      <div style="min-height:100px">
        ${filtered.length === 0 ? `
          <div class="glass-card empty-state" style="padding:60px 20px;text-align:center">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5" style="margin-bottom:12px">
              <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
            <p style="color:var(--text-muted)">No ${examTab} tracked yet. Add your first one above!</p>
          </div>
        ` : filtered.map(e => {
    const cd = getExamCountdown(e.date, e.time);
    const urgencyColor = cd.urgency === 'critical' ? '#ef4444' : cd.urgency === 'warning' ? '#f59e0b' : cd.urgency === 'passed' ? 'var(--text-muted)' : 'var(--accent)';
    const borderColor = cd.urgency === 'critical' ? 'rgba(239,68,68,0.3)' : cd.urgency === 'warning' ? 'rgba(245,158,11,0.2)' : 'var(--border)';
    return `
          <div class="glass-card exam-card-enhanced" style="border-color:${borderColor};margin-bottom:12px">
            <div class="exam-card-left">
              <div class="exam-countdown-badge" style="background:${urgencyColor}15;color:${urgencyColor};border:1px solid ${urgencyColor}33">
                ${cd.urgency === 'passed' ? '✓' : cd.days <= 3 ? '⚠' : '📅'} ${cd.text}
              </div>
              <h3 class="exam-subject-title">${e.subject}</h3>
              <div class="exam-meta-row">
                <span class="exam-meta-item">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                  ${formatDate(e.date)}
                </span>
                <span class="exam-meta-item">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  ${e.time || '—'}
                </span>
                ${e.room ? `<span class="exam-meta-item">📍 ${e.room}</span>` : ''}
                ${e.teacher ? `<span class="exam-meta-item">🎓 ${e.teacher}</span>` : ''}
              </div>
            </div>
            <div class="exam-card-right">
              <div class="exam-badge" style="background:var(--accent-dim);color:var(--accent)">🎯 ${e.grade || '—'}</div>
              <div class="exam-badge" style="background:rgba(167,139,250,0.12);color:#a78bfa">${e.credits || 3} cr</div>
              <div style="display:flex;gap:4px;margin-top:4px">
                <button class="icon-btn" style="color:var(--accent)" onclick="editExam('${e.id}')" title="Edit">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="icon-btn" style="color:var(--danger)" onclick="deleteExamItem('${e.id}')" title="Delete">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            </div>
          </div>`;
  }).join('')}
      </div>
    </div>
  `;
}

function switchExamTab(tab) {
  examTab = tab;
  navigateTo('exams');
}

function addExamSubmit() {
  const subject = document.getElementById('exam-subject').value.trim();
  if (!subject) { alert('Please enter a subject'); return; }

  const examData = {
    subject,
    date: document.getElementById('exam-date').value,
    time: document.getElementById('exam-time').value,
    grade: document.getElementById('exam-grade').value,
    credits: parseInt(document.getElementById('exam-credits').value) || 3,
    teacher: document.getElementById('exam-teacher') ? document.getElementById('exam-teacher').value.trim() : '',
    room: document.getElementById('exam-room') ? document.getElementById('exam-room').value.trim() : '',
    type: examTab
  };

  if (editingExamId) {
    // Update existing exam
    examData.id = editingExamId;
    Storage.updateExam(examData);
    editingExamId = null;
  } else {
    Storage.addExam(examData);
    Storage.addXP(15);
  }
  navigateTo('exams');
}

function editExam(id) {
  const exams = Storage.getExams();
  const exam = exams.find(e => String(e.id) === String(id));
  if (!exam) return;

  editingExamId = String(id);
  navigateTo('exams');

  // Populate form after re-render
  setTimeout(() => {
    const el = (s) => document.getElementById(s);
    if (el('exam-subject')) el('exam-subject').value = exam.subject || '';

    // Parse date for HTML5 date input (requires YYYY-MM-DD)
    if (el('exam-date')) {
      let d = exam.date || '';
      if (d.includes('/')) {
        const parts = d.split('/');
        if (parts.length === 3) {
          // Assuming DD/MM/YYYY
          d = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      } else if (d.includes('-') && d.split('-')[0].length === 2) {
        // Assuming DD-MM-YYYY
        const parts = d.split('-');
        d = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      el('exam-date').value = d;
    }

    // Parse time for HTML5 time input (requires HH:mm)
    if (el('exam-time')) {
      let t = exam.time || '09:00';
      if (t.toLowerCase().includes('pm') || t.toLowerCase().includes('am')) {
        const firstTime = t.split('-')[0].trim(); // Take start time "03:00pm"
        let [hours, minutes] = firstTime.replace(/[^\d:]/g, '').split(':');
        hours = parseInt(hours || 0);
        if (firstTime.toLowerCase().includes('pm') && hours < 12) hours += 12;
        if (firstTime.toLowerCase().includes('am') && hours === 12) hours = 0;
        t = `${String(hours).padStart(2, '0')}:${(minutes || '00').padStart(2, '0')}`;
      }
      el('exam-time').value = t;
    }
    if (el('exam-grade')) el('exam-grade').value = exam.grade || 'A+';
    if (el('exam-credits')) el('exam-credits').value = exam.credits || 3;
    if (el('exam-teacher')) el('exam-teacher').value = exam.teacher || '';
    if (el('exam-room')) el('exam-room').value = exam.room || '';
    // Scroll to form
    el('exam-subject').scrollIntoView({ behavior: 'smooth', block: 'center' });
    el('exam-subject').focus();
  }, 50);
}

function cancelExamEdit() {
  editingExamId = null;
  navigateTo('exams');
}

function deleteExamItem(id) {
  if (confirm('Delete this exam?')) {
    Storage.deleteExam(id); // storage.js handles the string cast
    if (String(editingExamId) === String(id)) editingExamId = null;
    navigateTo('exams');
  }
}
