// ============================
// Enhanced Detox Page
// ============================
let focusActive = false;
let focusStartTime = null;
let focusInterval = null;
let focusElapsed = 0;
let focusDuration = 25 * 60; // default 25 min in seconds
let focusSound = 'none';
let focusAudio = null;
let blockedSites = ['facebook.com', 'youtube.com', 'instagram.com', 'twitter.com', 'tiktok.com'];

// Sound URLs (royalty-free ambient loops)
const SOUND_URLS = {
  rain: 'https://cdn.pixabay.com/audio/2022/05/31/audio_39e41b5e42.mp3',
  white: 'https://cdn.pixabay.com/audio/2024/11/04/audio_664019816f.mp3',
  lofi: 'https://cdn.pixabay.com/audio/2024/09/10/audio_6e1ceed79b.mp3'
};

function getTreeStage() {
  const sessions = Storage.getFocusSessions();
  const totalMin = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
  if (totalMin >= 600) return 5;
  if (totalMin >= 300) return 4;
  if (totalMin >= 120) return 3;
  if (totalMin >= 30) return 2;
  return 1;
}

function getTreeSVG(stage) {
  const colors = ['#1a4a1a', '#22662a', '#2d8a38', '#34d058', '#00ff88'];
  const c = colors[stage - 1];
  const sizes = [20, 28, 36, 44, 52];
  const s = sizes[stage - 1];
  return `
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
      <circle cx="60" cy="60" r="55" fill="${c}22" stroke="${c}" stroke-width="2"/>
      <polygon points="60,${65 - s} ${60 + s / 2},${65 + s / 4} ${60 - s / 2},${65 + s / 4}" fill="${c}" opacity="0.9"/>
      ${stage >= 2 ? `<polygon points="60,${55 - s} ${60 + s / 2 + 4},${55 + s / 4 + 4} ${60 - s / 2 - 4},${55 + s / 4 + 4}" fill="${c}" opacity="0.6"/>` : ''}
      ${stage >= 3 ? `<polygon points="60,${45 - s} ${60 + s / 2 + 8},${45 + s / 4 + 8} ${60 - s / 2 - 8},${45 + s / 4 + 8}" fill="${c}" opacity="0.4"/>` : ''}
      <rect x="57" y="${65 + s / 4}" width="6" height="16" rx="2" fill="#8B6914"/>
    </svg>`;
}

function renderDetox(container) {
  if (focusActive) {
    renderActiveFocus(container);
    return;
  }

  const stage = getTreeStage();
  const sessions = Storage.getFocusSessions();
  const totalMin = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
  const totalHrs = (totalMin / 60).toFixed(1);

  container.innerHTML = `
    <div class="page-enter">
      <div class="page-header">
        <div>
          <h1>Detox</h1>
          <p class="page-desc">Lock in. Eliminate distractions. Grow your focus tree.</p>
        </div>
        <button class="btn-green focus-start-btn" onclick="showFocusSetup()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          START FOCUS
        </button>
      </div>

      <!-- Focus Setup Modal (hidden by default) -->
      <div class="glass-card focus-setup-card" id="focus-setup" style="display:none">
        <h3 style="color:var(--accent);margin-bottom:16px">⚡ Configure Focus Session</h3>
        
        <div class="focus-section">
          <label class="focus-label">FOCUS DURATION</label>
          <div class="duration-buttons">
            <button class="dur-btn active" onclick="setDuration(25, this)">25m</button>
            <button class="dur-btn" onclick="setDuration(50, this)">50m</button>
            <button class="dur-btn" onclick="setDuration(90, this)">90m</button>
            <div class="dur-custom">
              <input type="number" id="custom-dur" placeholder="Custom" min="1" max="240" 
                     onfocus="clearDurButtons()" onchange="setDuration(parseInt(this.value), null)">
              <span>min</span>
            </div>
          </div>
        </div>

        <div class="focus-section">
          <label class="focus-label">🎵 FOCUS SOUNDS</label>
          <div class="sound-buttons">
            <button class="sound-btn active" onclick="setSound('none', this)">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
              NONE
            </button>
            <button class="sound-btn" onclick="setSound('rain', this)">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/><path d="M8 16l-2 3M12 18l-2 3M16 16l-2 3"/></svg>
              RAIN
            </button>
            <button class="sound-btn" onclick="setSound('white', this)">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12h2M6 8l1.5 8M10 5l1.5 14M14 8l1.5 8M18 3l1.5 18M22 12h-2"/></svg>
              WHITE
            </button>
            <button class="sound-btn" onclick="setSound('lofi', this)">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="5.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="15.5" r="2.5"/><path d="M8 17V5l12-2v12"/></svg>
              LOFI
            </button>
          </div>
        </div>

        <div class="focus-section">
          <label class="focus-label">🛡️ DISTRACTION GUARD</label>
          <p style="font-size:0.75rem;color:var(--text-muted);margin-bottom:8px">BLOCKED DOMAINS (REMINDERS)</p>
          <div class="blocked-sites" id="blocked-sites-list">
            ${blockedSites.map((s, i) => `
              <span class="blocked-chip">${s.toUpperCase()} <span class="chip-x" onclick="removeBlockedSite(${i})">×</span></span>
            `).join('')}
            <button class="add-site-btn" onclick="addBlockedSite()">+ ADD SITE</button>
          </div>
        </div>

        <div style="display:flex;gap:12px;margin-top:20px">
          <button class="btn-green" style="flex:1" onclick="startFocus()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            BEGIN SESSION
          </button>
          <button class="btn-outline" onclick="hideSetup()">CANCEL</button>
        </div>
      </div>

      <!-- Stats Row -->
      <div class="detox-stats-row">
        <div class="glass-card detox-stat-card">
          <div class="detox-stat-value" style="color:var(--accent)">${sessions.length}</div>
          <div class="detox-stat-label">TOTAL SESSIONS</div>
        </div>
        <div class="glass-card detox-stat-card">
          <div class="detox-stat-value" style="color:#a855f7">${totalHrs}h</div>
          <div class="detox-stat-label">FOCUS TIME</div>
        </div>
        <div class="glass-card detox-stat-card">
          <div class="detox-stat-value" style="color:#f59e0b">${stage}/5</div>
          <div class="detox-stat-label">TREE STAGE</div>
        </div>
      </div>

      <!-- Focus Tree -->
      <div class="glass-card" style="text-align:center;padding:30px">
        <div class="focus-tree-display">
          ${getTreeSVG(stage)}
        </div>
        <div style="margin-top:12px">
          <span class="tree-stage-badge">STAGE ${stage}/5</span>
        </div>
        <p style="color:var(--text-muted);font-size:0.8rem;margin-top:8px">Keep focusing to grow your tree 🌳</p>
      </div>

      <!-- Focus History -->
      <div class="glass-card" style="margin-top:24px">
        <h3 style="margin-bottom:16px">📊 Recent Sessions</h3>
        ${renderFocusHistory()}
      </div>
    </div>
  `;
}

function renderActiveFocus(container) {
  const remaining = Math.max(0, focusDuration - focusElapsed);
  const m = String(Math.floor(remaining / 60)).padStart(2, '0');
  const s = String(remaining % 60).padStart(2, '0');
  const progress = focusDuration > 0 ? ((focusElapsed / focusDuration) * 100).toFixed(1) : 0;
  const stage = getTreeStage();

  container.innerHTML = `
    <div class="focus-active-view">
      <div class="focus-active-header">
        <div>
          <h2 style="color:var(--accent);margin:0">🛡️ Detox</h2>
          <p style="color:var(--text-muted);font-size:0.8rem;margin:0">DISTRACTIONS BLOCKED</p>
        </div>
        <div class="focus-active-timer">
          <span class="timer-min" id="focus-timer-min">${m}</span>
          <span class="timer-sep">:</span>
          <span class="timer-sec" id="focus-timer-sec">${s}</span>
        </div>
        <button class="btn-danger focus-exit-btn" onclick="stopFocus()">EXIT</button>
      </div>

      <div class="focus-active-body">
        <div class="focus-active-sidebar">
          <div style="text-align:center;padding:20px">
            ${getTreeSVG(stage)}
            <div style="margin-top:8px"><span class="tree-stage-badge">STAGE ${stage}/5</span></div>
            <p style="color:var(--text-muted);font-size:0.75rem;margin-top:6px">KEEP FOCUSING TO GROW YOUR TREE</p>
          </div>
        </div>

        <div class="focus-active-main">
          <div class="focus-shield-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="M9 12l2 2 4-4" stroke="var(--accent)" stroke-width="2"/>
            </svg>
          </div>
          <h2 style="color:var(--text-primary);margin:16px 0 8px">Deep Focus Active</h2>
          <p style="color:var(--text-muted);font-size:0.9rem">Stay focused. All distractions are blocked.</p>

          <div class="focus-active-stats">
            <div class="focus-active-stat-card">
              <div class="focus-active-stat-val" id="focus-level">${progress}%</div>
              <div class="focus-active-stat-lbl">FOCUS LEVEL</div>
            </div>
            <div class="focus-active-stat-card">
              <div class="focus-active-stat-val">${blockedSites.length}</div>
              <div class="focus-active-stat-lbl">SITES BLOCKED</div>
            </div>
          </div>

          <!-- Progress bar -->
          <div class="focus-progress-bar">
            <div class="focus-progress-fill" id="focus-progress-fill" style="width:${progress}%"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  if (!focusInterval) {
    focusInterval = setInterval(updateFocusCountdown, 1000);
  }
}

// Setup UI
function showFocusSetup() {
  document.getElementById('focus-setup').style.display = 'block';
}

function hideSetup() {
  document.getElementById('focus-setup').style.display = 'none';
}

function setDuration(mins, btn) {
  if (!mins || mins < 1) return;
  focusDuration = mins * 60;
  if (btn) {
    document.querySelectorAll('.dur-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const customInput = document.getElementById('custom-dur');
    if (customInput) customInput.value = '';
  }
}

function clearDurButtons() {
  document.querySelectorAll('.dur-btn').forEach(b => b.classList.remove('active'));
}

function setSound(sound, btn) {
  focusSound = sound;
  document.querySelectorAll('.sound-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

function removeBlockedSite(index) {
  blockedSites.splice(index, 1);
  const list = document.getElementById('blocked-sites-list');
  if (list) {
    list.innerHTML = blockedSites.map((s, i) => `
      <span class="blocked-chip">${s.toUpperCase()} <span class="chip-x" onclick="removeBlockedSite(${i})">×</span></span>
    `).join('') + '<button class="add-site-btn" onclick="addBlockedSite()">+ ADD SITE</button>';
  }
}

function addBlockedSite() {
  const site = prompt('Enter domain to block (e.g. reddit.com):');
  if (site && site.trim()) {
    blockedSites.push(site.trim().toLowerCase());
    navigateTo('detox');
    showFocusSetup();
  }
}

// Focus Session Control
function startFocus() {
  focusActive = true;
  focusStartTime = Date.now();
  focusElapsed = 0;

  // Play sound
  if (focusSound !== 'none' && SOUND_URLS[focusSound]) {
    try {
      focusAudio = new Audio(SOUND_URLS[focusSound]);
      focusAudio.loop = true;
      focusAudio.volume = 0.4;
      focusAudio.play().catch(e => console.warn('Audio play failed:', e));
    } catch (e) {
      console.warn('Audio error:', e);
    }
  }

  navigateTo('detox');
}

function stopFocus() {
  focusActive = false;
  clearInterval(focusInterval);
  focusInterval = null;

  if (focusAudio) {
    focusAudio.pause();
    focusAudio = null;
  }

  const duration = Math.floor((Date.now() - focusStartTime) / 60000);
  if (duration > 0) {
    Storage.addFocusSession({ date: new Date().toISOString(), duration });
    Storage.addXP(Math.max(5, duration));
  }

  focusStartTime = null;
  focusElapsed = 0;
  navigateTo('detox');
}

// Keep the old toggleFocus for compatibility
function toggleFocus() {
  if (focusActive) {
    stopFocus();
  } else {
    showFocusSetup();
  }
}

function updateFocusCountdown() {
  if (!focusActive || !focusStartTime) return;
  focusElapsed = Math.floor((Date.now() - focusStartTime) / 1000);

  const remaining = Math.max(0, focusDuration - focusElapsed);
  const m = String(Math.floor(remaining / 60)).padStart(2, '0');
  const s = String(remaining % 60).padStart(2, '0');
  const progress = focusDuration > 0 ? ((focusElapsed / focusDuration) * 100).toFixed(1) : 0;

  const minEl = document.getElementById('focus-timer-min');
  const secEl = document.getElementById('focus-timer-sec');
  const levelEl = document.getElementById('focus-level');
  const fillEl = document.getElementById('focus-progress-fill');

  if (minEl) minEl.textContent = m;
  if (secEl) secEl.textContent = s;
  if (levelEl) levelEl.textContent = Math.min(100, progress) + '%';
  if (fillEl) fillEl.style.width = Math.min(100, progress) + '%';

  // Session complete
  if (remaining <= 0) {
    stopFocus();
    alert('🎉 Focus session complete! Great work!');
  }
}

function renderFocusHistory() {
  const sessions = Storage.getFocusSessions().slice().reverse().slice(0, 10);
  if (sessions.length === 0) {
    return '<p style="color:var(--text-muted);font-size:0.9rem">No focus sessions yet. Start your first one!</p>';
  }
  return sessions.map(s => `
    <div class="focus-history-row">
      <span style="color:var(--text-secondary)">${formatDate(s.date)}</span>
      <span class="focus-duration-badge">${s.duration} min</span>
    </div>
  `).join('');
}
