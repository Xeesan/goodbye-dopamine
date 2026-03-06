// ============================
// Health / Wellness Page
// ============================
let healthTab = 'overview';

function getHealthData() {
    const today = new Date().toISOString().split('T')[0];
    const data = Storage.get('health', {});
    if (!data[today]) {
        data[today] = { water: 0, steps: 0, sleepHours: 0, bedtime: '', wakeup: '', sleepRating: 0, mood: '', moodNote: '', breathingDone: false };
    }
    return { all: data, today: data[today], date: today };
}

function saveHealthData(data) {
    Storage.set('health', data.all);
}

function switchHealthTab(tab) {
    healthTab = tab;
    navigateTo('health');
}

function renderHealth(container) {
    const h = getHealthData();
    const t = h.today;

    // Calculate wellness score
    const waterScore = Math.min(t.water / 8, 1) * 25;
    const sleepScore = Math.min(t.sleepHours / 8, 1) * 25;
    const stepsScore = Math.min(t.steps / 10000, 1) * 25;
    const moodScore = t.mood ? 25 : 0;
    const wellnessScore = Math.round(waterScore + sleepScore + stepsScore + moodScore);
    const level = wellnessScore >= 80 ? 'Champion' : wellnessScore >= 60 ? 'Warrior' : wellnessScore >= 40 ? 'Apprentice' : 'Beginner';

    const tabs = `
    <div class="health-tabs">
      <button class="health-tab ${healthTab === 'overview' ? 'active' : ''}" onclick="switchHealthTab('overview')">OVERVIEW</button>
      <button class="health-tab ${healthTab === 'physical' ? 'active' : ''}" onclick="switchHealthTab('physical')">PHYSICAL</button>
      <button class="health-tab ${healthTab === 'mental' ? 'active' : ''}" onclick="switchHealthTab('mental')">MENTAL</button>
    </div>
  `;

    let content = '';

    if (healthTab === 'overview') {
        content = renderHealthOverview(t, wellnessScore, level);
    } else if (healthTab === 'physical') {
        content = renderHealthPhysical(t, h);
    } else if (healthTab === 'mental') {
        content = renderHealthMental(t, h);
    }

    container.innerHTML = `
    <div class="page-enter">
      <div class="page-header">
        <div>
          <h1>Wellness</h1>
          <p class="page-desc">Holistic health tracking for peak academic performance.</p>
        </div>
        ${tabs}
      </div>
      ${content}
    </div>
  `;
}

function renderHealthOverview(t, score, level) {
    const circumference = 2 * Math.PI * 45;
    const dashoffset = circumference - (score / 100) * circumference;

    return `
    <div class="health-overview-grid">
      <!-- Daily Wellness Score -->
      <div class="glass-card health-score-card">
        <div class="health-score-header">
          <h3>Daily Wellness</h3>
          <span class="health-level-badge">${level.toUpperCase()} (LVL ${Math.floor(score / 20) + 1})</span>
        </div>
        <div class="health-score-ring">
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="45" fill="none" stroke="var(--border)" stroke-width="8"/>
            <circle cx="60" cy="60" r="45" fill="none" stroke="var(--accent)" stroke-width="8" 
                    stroke-dasharray="${circumference}" stroke-dashoffset="${dashoffset}" 
                    stroke-linecap="round" transform="rotate(-90 60 60)" 
                    style="transition: stroke-dashoffset 0.8s ease"/>
            <text x="60" y="55" text-anchor="middle" fill="var(--accent)" font-size="24" font-weight="bold">${score}</text>
            <text x="60" y="72" text-anchor="middle" fill="var(--text-muted)" font-size="10">SCORE</text>
          </svg>
        </div>
        <div class="health-quick-stats">
          <span>💧 ${t.water} GLASSES</span>
          <span>👟 ${t.steps.toLocaleString()} STEPS</span>
          <span>🌙 ${t.sleepHours}H SLEEP</span>
        </div>
      </div>

      <!-- Wellness Spirit -->
      <div class="glass-card health-spirit-card">
        <div class="spirit-icon">
          ${score >= 60 ? '🌟' : score >= 30 ? '🌱' : '💤'}
        </div>
        <h3>Your Wellness Spirit</h3>
        <p style="color:var(--text-muted);font-size:0.8rem">
          ${score >= 60 ? 'Thriving! Keep it up!' : score >= 30 ? 'Growing... needs more care.' : 'Needs care & water.'}
        </p>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="health-quick-row">
      <div class="glass-card health-quick-card" onclick="quickAddWater()">
        <span class="quick-icon">💧</span>
        <span class="quick-label">+ Water</span>
      </div>
      <div class="glass-card health-quick-card" onclick="switchHealthTab('physical')">
        <span class="quick-icon">😴</span>
        <span class="quick-label">Log Sleep</span>
      </div>
      <div class="glass-card health-quick-card" onclick="switchHealthTab('mental')">
        <span class="quick-icon">😊</span>
        <span class="quick-label">Log Mood</span>
      </div>
      <div class="glass-card health-quick-card" onclick="switchHealthTab('physical')">
        <span class="quick-icon">👟</span>
        <span class="quick-label">Log Steps</span>
      </div>
    </div>
  `;
}

function renderHealthPhysical(t, h) {
    const waterPct = Math.min(t.water / 8 * 100, 100);
    const stepsPct = Math.min(t.steps / 10000 * 100, 100);

    return `
    <!-- Hydration -->
    <div class="glass-card health-tracker-card">
      <div class="tracker-header">
        <h3>💧 Hydration</h3>
        <span class="tracker-goal">${t.water}/8 glasses</span>
      </div>
      <div class="tracker-progress">
        <div class="tracker-bar"><div class="tracker-fill" style="width:${waterPct}%;background:var(--accent)"></div></div>
      </div>
      <div class="tracker-controls">
        <button class="tracker-btn" onclick="adjustWater(-1)">−</button>
        <span class="tracker-value">${t.water}</span>
        <button class="tracker-btn" onclick="adjustWater(1)">+</button>
      </div>
      <p class="tracker-tip">💡 Drinking water improves focus and reduces fatigue</p>
    </div>

    <!-- Sleep -->
    <div class="glass-card health-tracker-card" style="margin-top:16px">
      <div class="tracker-header">
        <h3>😴 Sleep Tracker</h3>
        <span class="tracker-goal">${t.sleepHours}h / 8h goal</span>
      </div>
      <div class="sleep-inputs">
        <div class="sleep-field">
          <label>BEDTIME</label>
          <input type="time" class="input-simple" value="${t.bedtime}" onchange="updateSleep('bedtime', this.value)">
        </div>
        <div class="sleep-field">
          <label>WAKEUP</label>
          <input type="time" class="input-simple" value="${t.wakeup}" onchange="updateSleep('wakeup', this.value)">
        </div>
      </div>
      <div class="sleep-rating" style="margin-top:12px">
        <label style="font-size:0.75rem;color:var(--text-muted)">SLEEP QUALITY</label>
        <div class="star-rating">
          ${[1, 2, 3, 4, 5].map(i => `
            <span class="star ${t.sleepRating >= i ? 'active' : ''}" onclick="rateSleep(${i})">★</span>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- Activity -->
    <div class="glass-card health-tracker-card" style="margin-top:16px">
      <div class="tracker-header">
        <h3>👟 Activity</h3>
        <span class="tracker-goal">${t.steps.toLocaleString()} / 10,000 steps</span>
      </div>
      <div class="tracker-progress">
        <div class="tracker-bar"><div class="tracker-fill" style="width:${stepsPct}%;background:#a855f7"></div></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;align-items:center">
        <input type="number" class="input-simple" id="steps-input" placeholder="Enter steps" 
               value="${t.steps > 0 ? t.steps : ''}" style="flex:1">
        <button class="btn-green" onclick="updateSteps()" style="white-space:nowrap">UPDATE</button>
      </div>
    </div>
  `;
}

function renderHealthMental(t, h) {
    const moods = [
        { emoji: '😊', label: 'HAPPY', value: 'happy' },
        { emoji: '⚡', label: 'ENERGETIC', value: 'energetic' },
        { emoji: '😌', label: 'CALM', value: 'calm' },
        { emoji: '😐', label: 'NEUTRAL', value: 'neutral' },
        { emoji: '😴', label: 'TIRED', value: 'tired' },
        { emoji: '😰', label: 'STRESSED', value: 'stressed' }
    ];

    return `
    <!-- Mood Journal -->
    <div class="glass-card health-tracker-card">
      <div class="tracker-header">
        <h3>😊 Mood Journal</h3>
        <span class="tracker-goal">REFLECT ON YOUR DAY</span>
      </div>
      <div class="mood-grid">
        ${moods.map(m => `
          <button class="mood-btn ${t.mood === m.value ? 'active' : ''}" onclick="setMood('${m.value}')">
            <span class="mood-emoji">${m.emoji}</span>
            <span class="mood-label">${m.label}</span>
          </button>
        `).join('')}
      </div>
      <textarea class="mood-textarea" placeholder="What's on your mind? Writing helps process emotions..." 
                onchange="saveMoodNote(this.value)">${t.moodNote || ''}</textarea>
      ${t.mood ? `<p style="color:var(--accent);font-size:0.8rem;margin-top:8px">You're feeling <strong>${t.mood}</strong> today ✨</p>` : ''}
    </div>

    <!-- Mindfulness -->
    <div class="glass-card health-tracker-card" style="margin-top:16px">
      <div class="tracker-header">
        <h3>🧘 Mindfulness</h3>
      </div>
      <div class="breathing-section">
        <div class="breathing-circle" id="breathing-circle">
          <span id="breathing-text">START</span>
        </div>
        <p style="color:var(--text-muted);font-size:0.85rem;margin-top:12px">4-7-8 Breathing Technique</p>
        <p style="color:var(--text-muted);font-size:0.75rem">Inhale 4s → Hold 7s → Exhale 8s</p>
        <button class="btn-outline" style="margin-top:16px" onclick="startBreathing()" id="breathing-btn">
          BEGIN EXERCISE
        </button>
      </div>
    </div>
  `;
}

// ============================
// Health Data Actions
// ============================
function quickAddWater() {
    adjustWater(1);
}

function adjustWater(delta) {
    const h = getHealthData();
    h.today.water = Math.max(0, Math.min(20, h.today.water + delta));
    saveHealthData(h);
    navigateTo('health');
}

function updateSleep(field, value) {
    const h = getHealthData();
    h.today[field] = value;
    // Calculate hours if both are set
    if (h.today.bedtime && h.today.wakeup) {
        const [bH, bM] = h.today.bedtime.split(':').map(Number);
        const [wH, wM] = h.today.wakeup.split(':').map(Number);
        let bedMin = bH * 60 + bM;
        let wakeMin = wH * 60 + wM;
        if (wakeMin <= bedMin) wakeMin += 24 * 60; // next day
        h.today.sleepHours = +((wakeMin - bedMin) / 60).toFixed(1);
    }
    saveHealthData(h);
}

function rateSleep(rating) {
    const h = getHealthData();
    h.today.sleepRating = rating;
    saveHealthData(h);
    navigateTo('health');
}

function updateSteps() {
    const input = document.getElementById('steps-input');
    if (!input) return;
    const h = getHealthData();
    h.today.steps = parseInt(input.value) || 0;
    saveHealthData(h);
    navigateTo('health');
}

function setMood(mood) {
    const h = getHealthData();
    h.today.mood = mood;
    saveHealthData(h);
    navigateTo('health');
}

function saveMoodNote(note) {
    const h = getHealthData();
    h.today.moodNote = note;
    saveHealthData(h);
}

// ============================
// Breathing Exercise
// ============================
let breathingActive = false;
let breathingInterval = null;

function startBreathing() {
    if (breathingActive) {
        breathingActive = false;
        clearInterval(breathingInterval);
        const circle = document.getElementById('breathing-circle');
        const text = document.getElementById('breathing-text');
        const btn = document.getElementById('breathing-btn');
        if (circle) circle.style.transform = 'scale(1)';
        if (text) text.textContent = 'START';
        if (btn) btn.textContent = 'BEGIN EXERCISE';
        return;
    }

    breathingActive = true;
    const btn = document.getElementById('breathing-btn');
    if (btn) btn.textContent = 'STOP';

    const phases = [
        { label: 'INHALE', duration: 4000, scale: 1.3 },
        { label: 'HOLD', duration: 7000, scale: 1.3 },
        { label: 'EXHALE', duration: 8000, scale: 1 }
    ];

    let phaseIndex = 0;

    function runPhase() {
        if (!breathingActive) return;
        const phase = phases[phaseIndex % phases.length];
        const circle = document.getElementById('breathing-circle');
        const text = document.getElementById('breathing-text');
        if (circle) circle.style.transform = `scale(${phase.scale})`;
        if (text) text.textContent = phase.label;
        phaseIndex++;
        breathingInterval = setTimeout(runPhase, phase.duration);
    }

    runPhase();
}
