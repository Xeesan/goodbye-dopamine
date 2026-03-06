// ============================
// Dashboard Page
// ============================

// All available tiles with icons
const ALL_TILES = [
  { id: 'planner', name: 'Planner', icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>', color: '#00FF88' },
  { id: 'routine', name: 'Routine', icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>', color: '#3B82F6' },
  { id: 'exams', name: 'Exams', icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8M16 17H8M10 9H8"/></svg>', color: '#F59E0B' },
  { id: 'academic-hub', name: 'Academic', icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>', color: '#8B5CF6' },
  { id: 'money', name: 'Money', icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="4" width="22" height="16" rx="2"/><circle cx="12" cy="12" r="3"/></svg>', color: '#10B981' },
  { id: 'notes', name: 'Notes', icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>', color: '#EC4899' },
  { id: 'detox', name: 'Detox', icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>', color: '#06B6D4' },
  { id: 'reports', name: 'Reports', icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>', color: '#F97316' },
];

// Default tiles shown on first use
const DEFAULT_TILE_IDS = ['planner', 'routine', 'exams', 'money', 'notes'];

function getEnabledTiles() {
  return Storage.get('dashboard_tiles', DEFAULT_TILE_IDS);
}

function setEnabledTiles(ids) {
  Storage.set('dashboard_tiles', ids);
}

function renderDashboard(container) {
  const user = Storage.getUser();
  const xp = Storage.getXP();
  const tasks = Storage.getTasks();
  const quote = getDailyQuote();
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const sessions = Storage.getFocusSessions();
  const totalFocusMin = sessions.reduce((a, s) => a + (s.duration || 0), 0);
  const streak = Storage.get('streak', 0);
  const enabledTileIds = getEnabledTiles();
  const enabledTiles = ALL_TILES.filter(t => enabledTileIds.includes(t.id));

  container.innerHTML = `
    <div class="page-enter">
      <!-- Welcome Header -->
      <div class="dashboard-header">
        <div class="welcome-text">
          <h1>Welcome back, ${user ? user.name.split(' ')[0] : 'User'}</h1>
          <p>Here's your productivity overview for this week.</p>
        </div>
        <div class="header-right">
          <div class="level-pill">
            LEVEL ${xp.level}
            <span class="text-accent" style="font-weight:700">${xp.total} XP</span>
            <span class="level-number">${xp.level}</span>
          </div>
          <button class="enable-notif-btn" onclick="requestNotifications()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            ENABLE NOTIFICATIONS
          </button>
        </div>
      </div>

      <!-- Daily Inspiration -->
      <div class="inspiration-card">
        <div class="inspiration-tag">
          <span style="font-size:1.2rem">❝</span> DAILY INSPIRATION
          <button class="quote-refresh-btn" onclick="refreshQuote()" title="New Quote">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          </button>
        </div>
        <div class="inspiration-quote" id="inspiration-quote-text">"${quote.text}"</div>
        <div class="inspiration-author" id="inspiration-author-text">— ${quote.author}</div>
        <div class="big-quote">❞</div>
      </div>

      <!-- Quick Navigation Tiles -->
      <div class="quick-tiles-section">
        <div class="quick-tiles-header">
          <div class="quick-tiles-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            QUICK TILES
          </div>
          <button class="add-link-btn" onclick="openTileCustomizer()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            CUSTOMIZE
          </button>
        </div>
        <div class="quick-tiles-grid">
          ${enabledTiles.map(tile => `
            <button class="quick-tile" onclick="navigateTo('${tile.id}')" style="--tile-color: ${tile.color}">
              <div class="quick-tile-icon">${tile.icon}</div>
              <div class="quick-tile-name">${tile.name}</div>
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Quick Access Links -->
      <div class="quick-access">
        <div class="quick-access-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          QUICK ACCESS
        </div>
        <button class="add-link-btn" onclick="addQuickLink()">+ ADD LINK</button>
      </div>
      <div id="quick-links-container">
        ${renderQuickLinks()}
      </div>

      <!-- Level & Achievements -->
      <div class="level-section">
        <div class="glass-card-accent level-card">
          <div class="level-circle">
            <span class="level-num">${xp.level}</span>
            <span class="level-label">LEVEL</span>
          </div>
          <div class="level-info">
            <h3>Progress to Level ${xp.level + 1}</h3>
            <p class="xp-text">${xp.total % 100} / 100 XP earned</p>
            <div class="xp-bar">
              <div class="xp-bar-fill" style="width: ${(xp.total % 100)}%"></div>
            </div>
            <div class="xp-meta">
              <span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                ${xp.total} TOTAL XP
              </span>
              <span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
                0 BADGES
              </span>
            </div>
          </div>
        </div>
        <div class="glass-card-accent achievements-card">
          <h3>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
            RECENT ACHIEVEMENTS
          </h3>
          <p class="achievements-empty">No badges earned yet. Keep pushing!</p>
        </div>
      </div>

      <!-- Stats Row -->
      <div class="stats-row">
        <div class="glass-card stat-card">
          <div class="stat-icon green">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          </div>
          <div class="stat-card-label">FOCUS TIME</div>
          <div class="stat-card-value">${(totalFocusMin / 60).toFixed(1)}h</div>
        </div>
        <div class="glass-card stat-card">
          <div class="stat-icon blue">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          </div>
          <div class="stat-card-label">TASKS</div>
          <div class="stat-card-value">${completedTasks}</div>
        </div>
        <div class="glass-card stat-card">
          <div class="stat-icon purple">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
          </div>
          <div class="stat-card-label">DETOX</div>
          <div class="stat-card-value">${sessions.length}</div>
        </div>
        <div class="glass-card stat-card">
          <div class="stat-icon orange">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </div>
          <div class="stat-card-label">WELLNESS</div>
          <div class="stat-card-value">0</div>
        </div>
        <div class="glass-card stat-card">
          <div class="stat-icon pink">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          </div>
          <div class="stat-card-label">STREAK</div>
          <div class="stat-card-value">${streak}</div>
        </div>
      </div>
    </div>
  `;
}

// ============================
// Quick Links (external URLs)
// ============================
function renderQuickLinks() {
  const links = Storage.getQuickLinks();
  if (links.length === 0) {
    return '<p class="quick-access-empty">No quick links added yet.</p>';
  }
  return links.map(l => `
    <span class="quick-link-chip">
      <a href="${l.url}" target="_blank" rel="noopener" class="badge badge-accent" style="text-decoration:none">${l.name}</a>
      <button class="quick-link-remove" onclick="removeQuickLinkItem(${l.id})">✕</button>
    </span>
  `).join('');
}

function addQuickLink() {
  const name = prompt('Link name:');
  if (!name) return;
  const url = prompt('URL (include https://):');
  if (!url) return;
  Storage.addQuickLink({ name, url });
  navigateTo('dashboard');
}

function removeQuickLinkItem(id) {
  Storage.removeQuickLink(id);
  navigateTo('dashboard');
}

// ============================
// Tile Customizer Modal
// ============================
function openTileCustomizer() {
  const enabledIds = getEnabledTiles();
  const modal = document.createElement('div');
  modal.className = 'transaction-modal-overlay';
  modal.id = 'tile-customizer-modal';
  modal.innerHTML = `
    <div class="transaction-modal" style="max-width:440px">
      <h2 style="margin-bottom:4px">Customize Quick Tiles</h2>
      <p style="color:var(--text-muted);font-size:0.8rem;margin-bottom:20px">Toggle which tiles appear on your dashboard</p>
      <div class="tile-customizer-list">
        ${ALL_TILES.map(tile => `
          <label class="tile-toggle-row" style="--tile-color: ${tile.color}">
            <div style="display:flex;align-items:center;gap:12px">
              <div class="tile-toggle-icon">${tile.icon}</div>
              <span style="font-weight:500">${tile.name}</span>
            </div>
            <input type="checkbox" class="tile-checkbox" data-tile-id="${tile.id}" ${enabledIds.includes(tile.id) ? 'checked' : ''}>
          </label>
        `).join('')}
      </div>
      <div style="display:flex;gap:12px;margin-top:20px">
        <button class="btn-outline" style="flex:1" onclick="closeModal('tile-customizer-modal')">Cancel</button>
        <button class="btn-green" style="flex:1" onclick="saveTileCustomization()">Save</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function saveTileCustomization() {
  const checkboxes = document.querySelectorAll('.tile-checkbox');
  const enabled = [];
  checkboxes.forEach(cb => {
    if (cb.checked) enabled.push(cb.dataset.tileId);
  });
  setEnabledTiles(enabled);
  closeModal('tile-customizer-modal');
  navigateTo('dashboard');
}
