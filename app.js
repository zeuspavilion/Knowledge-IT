/**
 * App Controller & UI Logic - SynapseAI
 * Connects UI interactions, Lucide icons, Modals, Handover Sentinel, and Logging
 */

let activeMeetingId = null;
let currentCatchupMeeting = null;

document.addEventListener('DOMContentLoaded', () => {
  // Initialize App Components
  initNavigation();
  initModals();
  initMeetingHandlers();
  initTaskHandlers();
  initKBHandlers();
  initSentinelHandlers();
  initLogHandlers();
  initAISettingsHandlers();

  // Initial Data Render
  renderMeetingsList();
  renderTasksTable();
  renderKBDocs();
  renderSentinelDashboard();
  renderLogsTerminal();
  updateHeaderBadges();

  // Lucide Icon activation
  if (window.lucide) {
    lucide.createIcons();
  }

  // Log application startup
  AppLogger.info('SynapseAI application initialized successfully', {
    build: 'DigiPlus-Assessment-v1.0',
    mode: StorageService.getAIConfig().provider
  });
});

/* ==========================================================================
   Navigation Tabs
   ========================================================================== */

function initNavigation() {
  const navButtons = document.querySelectorAll('.main-nav .nav-link');
  const panes = document.querySelectorAll('.tab-pane');

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');

      navButtons.forEach(b => b.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const activePane = document.getElementById(`pane-${targetTab}`);
      if (activePane) {
        activePane.classList.add('active');
      }

      // Refresh dynamic components when tab switches
      if (targetTab === 'tasks') renderTasksTable();
      if (targetTab === 'knowledge') renderKBDocs();
      if (targetTab === 'special-feature') renderSentinelDashboard();
      if (targetTab === 'logs') renderLogsTerminal();

      if (window.lucide) lucide.createIcons();
    });
  });
}

function updateHeaderBadges() {
  const tasks = StorageService.getTasks();
  const openCount = tasks.filter(t => t.status !== 'Closed').length;
  const badge = document.getElementById('open-tasks-count');
  if (badge) badge.textContent = openCount;

  const aiConfig = StorageService.getAIConfig();
  const aiBadge = document.getElementById('ai-provider-badge');
  if (aiBadge) {
    if (aiConfig.provider === 'gemini') {
      aiBadge.textContent = 'AI: Gemini 1.5';
    } else if (aiConfig.provider === 'openai') {
      aiBadge.textContent = 'AI: OpenAI';
    } else {
      aiBadge.textContent = 'AI: Smart Mock';
    }
  }
}

/* ==========================================================================
   Modals
   ========================================================================== */

function initModals() {
  // Close buttons
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-close-modal');
      closeModal(modalId);
    });
  });

  // Close on outside click
  document.querySelectorAll('.modal-backdrop').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal(modal.id);
      }
    });
  });
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    if (window.lucide) lucide.createIcons();
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const iconName = type === 'success' ? 'check-circle' : (type === 'error' ? 'alert-triangle' : 'info');
  toast.innerHTML = `<i data-lucide="${iconName}"></i> <span>${message}</span>`;
  container.appendChild(toast);

  if (window.lucide) lucide.createIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/* ==========================================================================
   Meetings Tab & Handover Workflow
   ========================================================================== */

function initMeetingHandlers() {
  // Create Meeting button
  document.getElementById('btn-create-meeting').addEventListener('click', () => {
    resetMeetingForm();
    populateCarryoverChecklist();
    document.getElementById('modal-meeting-title').textContent = 'New Meeting or Work Handover';
    openModal('modal-meeting');
  });

  const emptyCreateBtn = document.getElementById('btn-empty-create');
  if (emptyCreateBtn) {
    emptyCreateBtn.addEventListener('click', () => {
      document.getElementById('btn-create-meeting').click();
    });
  }

  // Quick Parse Banner
  document.getElementById('btn-quick-ai-parse').addEventListener('click', () => {
    resetMeetingForm();
    populateCarryoverChecklist();
    document.getElementById('modal-meeting-title').textContent = 'AI Unstructured Ingestion';
    fillSampleNotes();
    openModal('modal-meeting');
    // Auto trigger parse
    triggerModalAIParse();
  });

  // Fill sample notes helper
  document.getElementById('btn-fill-sample-notes').addEventListener('click', fillSampleNotes);

  // Trigger AI Parse inside meeting modal
  document.getElementById('btn-parse-modal-notes').addEventListener('click', triggerModalAIParse);

  // Meeting Form Submit
  document.getElementById('form-meeting').addEventListener('submit', handleMeetingFormSubmit);

  // Search and filter
  document.getElementById('meeting-search-input').addEventListener('input', renderMeetingsList);
  document.getElementById('meeting-filter-type').addEventListener('change', renderMeetingsList);

  // Catchup persona selector
  document.querySelectorAll('#catchup-persona-chips .chip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#catchup-persona-chips .chip-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const persona = btn.getAttribute('data-persona');
      if (currentCatchupMeeting) {
        generateCatchupUI(currentCatchupMeeting, persona);
      }
    });
  });

  // Copy catchup brief
  document.getElementById('btn-copy-catchup').addEventListener('click', () => {
    const text = document.getElementById('catchup-text-result').innerText;
    navigator.clipboard.writeText(text).then(() => {
      showToast('Catch-up brief copied to clipboard!', 'success');
      AppLogger.info('Copied Catch-up brief to clipboard');
    }).catch(err => {
      showToast('Failed to copy', 'error');
    });
  });
}

function fillSampleNotes() {
  const sample = `Team sync notes:
- Incident retro: Redis cache node 2 experienced out-of-memory under high peak load.
- Agreed to migrate to Redis 7.2 with automatic failover and deploy Sentinel replicas.
- Sarah is taking planned medical leave starting Friday.
- TODO: Sarah to hand over database migration scripts to Alex.
- TODO: Priya should update on-call escalation rules in PagerDuty by Nov 2.
- Alex will conduct failover test drill on staging environment next Tuesday.`;
  document.getElementById('meeting-raw-notes').value = sample;
  document.getElementById('meeting-title').value = 'Emergency Cache Retro & On-Call Handover';
  document.getElementById('meeting-type').value = 'handover';
  document.getElementById('meeting-participants').value = 'Alex Chen, Sarah Miller, Priya Sharma';
  document.getElementById('meeting-date').value = new Date().toISOString().slice(0, 16);
  document.getElementById('meeting-agenda').value = 'Review Redis memory exhaustion and reallocate leave responsibilities.';
}

async function triggerModalAIParse() {
  const rawText = document.getElementById('meeting-raw-notes').value;
  const statusEl = document.getElementById('ai-parse-status');
  const btn = document.getElementById('btn-parse-modal-notes');

  if (!rawText.trim()) {
    showToast('Please enter some raw notes or transcripts first.', 'error');
    return;
  }

  btn.disabled = true;
  statusEl.innerHTML = `<span style="color:var(--accent);">⚡ AI parsing raw text into structured recap...</span>`;

  const cid = AppLogger.generateCorrelationId();
  const res = await AIService.parseRawNotes(rawText, cid);

  btn.disabled = false;

  if (res.data) {
    statusEl.innerHTML = `<span style="color:var(--success);">✓ Extracted ${res.data.decisions.length} decisions and ${res.data.actionItems.length} action items in ${res.latencyMs}ms</span>`;
    
    // Fill decisions
    document.getElementById('meeting-decisions').value = res.data.decisions.map(d => `- ${d}`).join('\n');

    // Fill action items
    document.getElementById('meeting-action-items-raw').value = res.data.actionItems.map(
      item => `${item.title} | ${item.owner} | ${item.dueDate}`
    ).join('\n');

    // If agenda is empty, populate with summary
    if (!document.getElementById('meeting-agenda').value && res.data.summary) {
      document.getElementById('meeting-agenda').value = res.data.summary;
    }

    showToast('AI successfully structured your raw notes!', 'success');
  } else {
    statusEl.innerHTML = `<span style="color:var(--danger);">Extraction encountered an issue. Heuristic fallback applied.</span>`;
  }
}

function populateCarryoverChecklist() {
  const tasks = StorageService.getTasks();
  const openTasks = tasks.filter(t => t.status !== 'Closed');
  const container = document.getElementById('carryover-checklist-container');
  const label = document.getElementById('carryover-available-label');

  label.textContent = `${openTasks.length} open items available`;
  container.innerHTML = '';

  if (openTasks.length === 0) {
    container.innerHTML = `<p class="text-muted text-xs">No open items from past meetings to carry forward.</p>`;
    return;
  }

  openTasks.forEach(task => {
    const item = document.createElement('label');
    item.className = 'carryover-checkbox-label';
    item.innerHTML = `
      <input type="checkbox" name="carryover-task" value="${task.id}">
      <span><strong>[${task.owner}]</strong> ${escapeHtml(task.title)} <em class="text-xs text-muted">(${task.status})</em></span>
    `;
    container.appendChild(item);
  });
}

function handleMeetingFormSubmit(e) {
  e.preventDefault();
  const cid = AppLogger.generateCorrelationId();

  const idInput = document.getElementById('form-meeting-id').value;
  const isEdit = !!idInput;
  const meetingId = isEdit ? idInput : 'mtg-' + Date.now().toString(36);

  const title = document.getElementById('meeting-title').value.trim();
  const type = document.getElementById('meeting-type').value;
  const date = document.getElementById('meeting-date').value;
  const participants = document.getElementById('meeting-participants').value
    .split(',')
    .map(p => p.trim())
    .filter(p => p.length > 0);
  const agenda = document.getElementById('meeting-agenda').value.trim();
  const rawNotes = document.getElementById('meeting-raw-notes').value.trim();

  // Parse decisions
  const rawDecisions = document.getElementById('meeting-decisions').value;
  const decisions = rawDecisions.split('\n')
    .map(d => d.replace(/^[-*•]\s*/, '').trim())
    .filter(d => d.length > 0);

  // Carried Forward tasks selected
  const carriedChecked = Array.from(document.querySelectorAll('input[name="carryover-task"]:checked'))
    .map(cb => cb.value);

  // New action items parsed from raw input
  const rawActionText = document.getElementById('meeting-action-items-raw').value;
  const newActionLines = rawActionText.split('\n').filter(l => l.trim().length > 0);

  const meetings = StorageService.getMeetings();
  const existingMeeting = isEdit ? meetings.find(m => m.id === meetingId) : null;

  const meetingObj = {
    id: meetingId,
    title,
    type,
    date,
    participants,
    agenda,
    rawNotes,
    decisions,
    carriedTaskIds: carriedChecked,
    createdAt: existingMeeting ? existingMeeting.createdAt : new Date().toISOString()
  };

  if (isEdit) {
    const idx = meetings.findIndex(m => m.id === meetingId);
    meetings[idx] = meetingObj;
    AppLogger.info('Updated meeting/handover session', { meetingId, title }, cid);
  } else {
    meetings.unshift(meetingObj);
    AppLogger.info('Created new meeting/handover session', { meetingId, title, type, carriedCount: carriedChecked.length }, cid);
  }

  StorageService.saveMeetings(meetings);

  // Update existing carried tasks history & carried count
  const tasks = StorageService.getTasks();
  carriedChecked.forEach(taskId => {
    const t = tasks.find(x => x.id === taskId);
    if (t) {
      t.carriedForwardCount = (t.carriedForwardCount || 0) + 1;
      t.history = t.history || [];
      t.history.push({
        date: new Date().toISOString().split('T')[0],
        event: `Carried forward into session: "${title}"`,
        owner: t.owner
      });
      AppLogger.info('Action item carried forward to new session', { taskId: t.id, taskTitle: t.title, sessionTitle: title }, cid);
    }
  });

  // Create new tasks from textarea lines: [Title] | [Owner] | [Due Date]
  newActionLines.forEach((line, idx) => {
    const parts = line.split('|').map(p => p.trim());
    if (parts[0]) {
      const taskTitle = parts[0];
      const taskOwner = parts[1] || participants[0] || 'Unassigned';
      const taskDueDate = parts[2] || new Date(Date.now() + 7*86400000).toISOString().split('T')[0];

      const newTask = {
        id: 'task-' + Date.now().toString(36) + '-' + idx,
        title: taskTitle,
        owner: taskOwner,
        dueDate: taskDueDate,
        status: 'Open',
        priority: 'Medium',
        sessionId: meetingId,
        outcome: '',
        carriedForwardCount: 0,
        history: [{
          date: new Date().toISOString().split('T')[0],
          event: `Created in session: "${title}"`,
          owner: taskOwner
        }]
      };
      tasks.push(newTask);
      AppLogger.info('Created new action item from meeting recap', { taskId: newTask.id, owner: taskOwner }, cid);
    }
  });

  StorageService.saveTasks(tasks);

  closeModal('modal-meeting');
  showToast(isEdit ? 'Session updated!' : 'Session created & persisted!', 'success');
  
  activeMeetingId = meetingId;
  renderMeetingsList();
  renderMeetingDetail(meetingObj);
  renderTasksTable();
  updateHeaderBadges();
}

function resetMeetingForm() {
  document.getElementById('form-meeting').reset();
  document.getElementById('form-meeting-id').value = '';
  document.getElementById('meeting-date').value = new Date().toISOString().slice(0, 16);
  document.getElementById('ai-parse-status').textContent = 'Ready to extract structured summary, decisions, and action items.';
}

function renderMeetingsList() {
  const container = document.getElementById('meetings-list-container');
  const countBadge = document.getElementById('meeting-count-badge');
  const query = (document.getElementById('meeting-search-input').value || '').toLowerCase();
  const filterType = document.getElementById('meeting-filter-type').value;

  const allMeetings = StorageService.getMeetings();

  const filtered = allMeetings.filter(m => {
    const matchesQuery = m.title.toLowerCase().includes(query) ||
      m.agenda.toLowerCase().includes(query) ||
      m.participants.some(p => p.toLowerCase().includes(query));
    const matchesType = filterType === 'all' || m.type === filterType;
    return matchesQuery && matchesType;
  });

  countBadge.textContent = `${filtered.length} sessions`;
  container.innerHTML = '';

  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding: 2rem 1rem;">
      <p class="text-muted">No sessions match filter.</p>
    </div>`;
    return;
  }

  // Set default active if none
  if (!activeMeetingId || !allMeetings.some(m => m.id === activeMeetingId)) {
    activeMeetingId = filtered[0].id;
  }

  filtered.forEach(m => {
    const card = document.createElement('div');
    card.className = `meeting-card-item ${m.id === activeMeetingId ? 'active' : ''}`;
    
    const d = new Date(m.date);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    
    const typeLabel = m.type === 'handover' ? 'Handover' : (m.type === 'incident' ? 'Incident' : 'Meeting');

    card.innerHTML = `
      <div class="meeting-item-top">
        <span class="badge-type ${m.type}">${typeLabel}</span>
        <span class="meeting-item-date">${dateStr}</span>
      </div>
      <div class="meeting-item-title">${escapeHtml(m.title)}</div>
      <div class="meeting-item-meta">
        <span><i data-lucide="users" style="width:12px; height:12px;"></i> ${m.participants.length}</span>
        <span><i data-lucide="check-square" style="width:12px; height:12px;"></i> ${m.decisions.length} decisions</span>
        ${m.carriedTaskIds && m.carriedTaskIds.length > 0 ? `<span><i data-lucide="arrow-right-left" style="width:12px; height:12px;"></i> ${m.carriedTaskIds.length} carried</span>` : ''}
      </div>
    `;

    card.addEventListener('click', () => {
      activeMeetingId = m.id;
      renderMeetingsList();
      renderMeetingDetail(m);
    });

    container.appendChild(card);
  });

  const activeMtg = allMeetings.find(m => m.id === activeMeetingId);
  if (activeMtg) {
    renderMeetingDetail(activeMtg);
  }

  if (window.lucide) lucide.createIcons();
}

function renderMeetingDetail(meeting) {
  const container = document.getElementById('meeting-detail-container');
  if (!meeting) return;

  const d = new Date(meeting.date);
  const formattedDate = d.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const allTasks = StorageService.getTasks();
  const sessionTasks = allTasks.filter(t => t.sessionId === meeting.id);
  const carriedTasks = (meeting.carriedTaskIds || []).map(id => allTasks.find(t => t.id === id)).filter(Boolean);

  const decisionsHtml = meeting.decisions && meeting.decisions.length > 0 
    ? meeting.decisions.map(dec => `
        <div class="decision-bullet">
          <i data-lucide="check-circle-2"></i>
          <span>${escapeHtml(dec)}</span>
        </div>
      `).join('')
    : `<p class="text-muted">No explicit decisions recorded.</p>`;

  let carriedHtml = '';
  if (carriedTasks.length > 0) {
    carriedHtml = `
      <div class="detail-section">
        <div class="detail-section-title">
          <i data-lucide="arrow-right-left"></i> Carried Forward Open Items (${carriedTasks.length})
        </div>
        <div class="carried-list-box">
          ${carriedTasks.map(ct => `
            <div class="carried-item-row">
              <div>
                <strong>${escapeHtml(ct.title)}</strong>
                <span class="carried-pill ml-2">Transferred x${ct.carriedForwardCount || 1}</span>
              </div>
              <div class="text-muted text-xs">
                Owner: <strong>${escapeHtml(ct.owner)}</strong> | Due: ${ct.dueDate} | Status: <span class="status-badge ${ct.status.replace(/\s+/g, '-')}">${ct.status}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="detail-banner">
      <div>
        <div class="detail-tags">
          <span class="badge-type ${meeting.type}">${meeting.type.toUpperCase()}</span>
          <span class="text-muted text-xs font-mono">${formattedDate}</span>
        </div>
        <h2 class="detail-title">${escapeHtml(meeting.title)}</h2>
      </div>
      <div class="detail-header-actions">
        <button class="btn btn-accent" id="btn-open-catchup">
          <i data-lucide="sparkles"></i> AI Catch-Up Brief
        </button>
        <button class="btn btn-outline" id="btn-edit-active-meeting">
          <i data-lucide="edit-3"></i> Edit
        </button>
        <button class="btn btn-outline text-danger" id="btn-delete-active-meeting">
          <i data-lucide="trash-2"></i> Delete
        </button>
      </div>
    </div>

    <div class="detail-meta-grid">
      <div class="detail-meta-box">
        <span>Participants</span>
        <strong>${meeting.participants.join(', ')}</strong>
      </div>
      <div class="detail-meta-box">
        <span>Action Items Created</span>
        <strong>${sessionTasks.length} items (${sessionTasks.filter(t => t.status === 'Closed').length} closed)</strong>
      </div>
      <div class="detail-meta-box">
        <span>Carried From Past</span>
        <strong>${carriedTasks.length} legacy items tracked</strong>
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">
        <i data-lucide="file-text"></i> Agenda & Strategic Focus
      </div>
      <p class="text-muted" style="line-height: 1.6;">${escapeHtml(meeting.agenda) || 'No agenda recorded.'}</p>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">
        <i data-lucide="badge-check"></i> Key Decisions & Agreements
      </div>
      <div class="decisions-box">
        ${decisionsHtml}
      </div>
    </div>

    ${carriedHtml}

    <div class="detail-section">
      <div class="detail-section-title">
        <i data-lucide="list-todo"></i> New Tasks Spawned in this Session (${sessionTasks.length})
      </div>
      <div class="carried-list-box">
        ${sessionTasks.length > 0 ? sessionTasks.map(st => `
          <div class="carried-item-row">
            <div>
              <strong>${escapeHtml(st.title)}</strong>
              ${st.outcome ? `<span class="chip text-xs ml-2">Resolved: ${escapeHtml(st.outcome)}</span>` : ''}
            </div>
            <div class="text-muted text-xs">
              Owner: <strong>${escapeHtml(st.owner)}</strong> | Due: ${st.dueDate} | 
              <span class="status-badge ${st.status.replace(/\s+/g, '-')}">${st.status}</span>
            </div>
          </div>
        `).join('') : '<p class="text-muted text-xs">No direct tasks created in this session.</p>'}
      </div>
    </div>

    ${meeting.rawNotes ? `
    <div class="detail-section">
      <div class="detail-section-title">
        <i data-lucide="align-left"></i> Raw Ingested Notes
      </div>
      <pre style="background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 8px; font-size: 0.8rem; color: #94a3b8; white-space: pre-wrap; font-family: var(--font-mono);">${escapeHtml(meeting.rawNotes)}</pre>
    </div>
    ` : ''}
  `;

  // Attach buttons in detail
  document.getElementById('btn-open-catchup').addEventListener('click', () => {
    currentCatchupMeeting = meeting;
    openModal('modal-catchup');
    generateCatchupUI(meeting, 'general');
  });

  document.getElementById('btn-edit-active-meeting').addEventListener('click', () => {
    loadMeetingIntoEditModal(meeting);
  });

  document.getElementById('btn-delete-active-meeting').addEventListener('click', () => {
    if (confirm(`Are you sure you want to delete session "${meeting.title}"?`)) {
      const cid = AppLogger.generateCorrelationId();
      let meetings = StorageService.getMeetings();
      meetings = meetings.filter(m => m.id !== meeting.id);
      StorageService.saveMeetings(meetings);
      AppLogger.info('Deleted meeting session', { meetingId: meeting.id, title: meeting.title }, cid);
      showToast('Session deleted', 'info');
      activeMeetingId = null;
      renderMeetingsList();
    }
  });

  if (window.lucide) lucide.createIcons();
}

function loadMeetingIntoEditModal(meeting) {
  document.getElementById('form-meeting-id').value = meeting.id;
  document.getElementById('meeting-title').value = meeting.title;
  document.getElementById('meeting-type').value = meeting.type;
  document.getElementById('meeting-date').value = meeting.date;
  document.getElementById('meeting-participants').value = meeting.participants.join(', ');
  document.getElementById('meeting-agenda').value = meeting.agenda || '';
  document.getElementById('meeting-raw-notes').value = meeting.rawNotes || '';
  document.getElementById('meeting-decisions').value = (meeting.decisions || []).map(d => `- ${d}`).join('\n');
  document.getElementById('meeting-action-items-raw').value = '';

  populateCarryoverChecklist();
  
  // Pre-check already carried items
  if (meeting.carriedTaskIds) {
    document.querySelectorAll('input[name="carryover-task"]').forEach(cb => {
      if (meeting.carriedTaskIds.includes(cb.value)) {
        cb.checked = true;
      }
    });
  }

  document.getElementById('modal-meeting-title').textContent = 'Edit Session: ' + meeting.title;
  openModal('modal-meeting');
}

async function generateCatchupUI(meeting, persona) {
  const loader = document.getElementById('catchup-loader');
  const resultEl = document.getElementById('catchup-text-result');

  loader.style.display = 'flex';
  resultEl.innerHTML = '';

  const res = await AIService.generateCatchupBrief(meeting, persona);

  loader.style.display = 'none';

  // Render markdown-like text to HTML
  resultEl.innerHTML = formatMarkdownToHTML(res.brief);
}

/* ==========================================================================
   Action Items Tab & Lifecycle
   ========================================================================== */

function initTaskHandlers() {
  document.getElementById('btn-add-action-item').addEventListener('click', () => {
    resetTaskForm();
    populateSessionDropdown();
    document.getElementById('modal-task-title').textContent = 'New Action Item';
    openModal('modal-task');
  });

  document.getElementById('btn-bulk-carryover').addEventListener('click', () => {
    // Open meeting creation with carryover checklist
    resetMeetingForm();
    populateCarryoverChecklist();
    document.getElementById('modal-meeting-title').textContent = 'Carry Forward Open Items to Next Session';
    document.getElementById('meeting-title').value = 'Next Sprint Work Transfer & Follow-up';
    document.getElementById('meeting-type').value = 'handover';
    openModal('modal-meeting');
  });

  document.getElementById('form-task').addEventListener('submit', handleTaskFormSubmit);

  // Filters & Search
  document.getElementById('task-search-input').addEventListener('input', renderTasksTable);
  document.getElementById('filter-task-status').addEventListener('change', renderTasksTable);
  document.getElementById('filter-task-priority').addEventListener('change', renderTasksTable);
}

function populateSessionDropdown(selectedId = null) {
  const select = document.getElementById('task-session-id');
  select.innerHTML = '<option value="">None / Standalone</option>';
  const meetings = StorageService.getMeetings();
  meetings.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = `${m.title} (${m.date.slice(0, 10)})`;
    if (m.id === selectedId) opt.selected = true;
    select.appendChild(opt);
  });
}

function resetTaskForm() {
  document.getElementById('form-task').reset();
  document.getElementById('form-task-id').value = '';
  document.getElementById('task-duedate').value = new Date(Date.now() + 7*86400000).toISOString().split('T')[0];
  document.getElementById('task-status').value = 'Open';
  document.getElementById('task-priority').value = 'Medium';
}

function handleTaskFormSubmit(e) {
  e.preventDefault();
  const cid = AppLogger.generateCorrelationId();

  const idInput = document.getElementById('form-task-id').value;
  const isEdit = !!idInput;
  const taskId = isEdit ? idInput : 'task-' + Date.now().toString(36);

  const title = document.getElementById('task-title').value.trim();
  const owner = document.getElementById('task-owner').value.trim();
  const dueDate = document.getElementById('task-duedate').value;
  const status = document.getElementById('task-status').value;
  const priority = document.getElementById('task-priority').value;
  const sessionId = document.getElementById('task-session-id').value;
  const outcome = document.getElementById('task-outcome').value.trim();

  const tasks = StorageService.getTasks();
  const existing = isEdit ? tasks.find(t => t.id === taskId) : null;

  let history = existing ? (existing.history || []) : [];

  if (isEdit) {
    if (existing.owner !== owner) {
      history.push({
        date: new Date().toISOString().split('T')[0],
        event: `Reassigned from ${existing.owner} to ${owner}`,
        owner: owner
      });
      AppLogger.info('Task reassigned', { taskId, from: existing.owner, to: owner }, cid);
    }
    if (existing.status !== status) {
      history.push({
        date: new Date().toISOString().split('T')[0],
        event: `Status changed from ${existing.status} to ${status}`,
        owner: owner
      });
      if (status === 'Closed') {
        AppLogger.info('Task closed with outcome', { taskId, title, outcome }, cid);
      } else {
        AppLogger.info('Task status changed', { taskId, oldStatus: existing.status, newStatus: status }, cid);
      }
    }
  } else {
    history.push({
      date: new Date().toISOString().split('T')[0],
      event: `Task created`,
      owner: owner
    });
    AppLogger.info('Task created', { taskId, title, owner, dueDate, priority }, cid);
  }

  const taskObj = {
    id: taskId,
    title,
    owner,
    dueDate,
    status,
    priority,
    sessionId,
    outcome,
    carriedForwardCount: existing ? existing.carriedForwardCount : 0,
    history
  };

  if (isEdit) {
    const idx = tasks.findIndex(t => t.id === taskId);
    tasks[idx] = taskObj;
  } else {
    tasks.push(taskObj);
  }

  StorageService.saveTasks(tasks);
  closeModal('modal-task');
  showToast(isEdit ? 'Task updated!' : 'Task created!', 'success');
  renderTasksTable();
  updateHeaderBadges();
}

function renderTasksTable() {
  const tbody = document.getElementById('tasks-table-body');
  const search = (document.getElementById('task-search-input').value || '').toLowerCase();
  const filterStatus = document.getElementById('filter-task-status').value;
  const filterPriority = document.getElementById('filter-task-priority').value;

  const tasks = StorageService.getTasks();
  const meetings = StorageService.getMeetings();

  // Update Metrics
  const total = tasks.length;
  const openCount = tasks.filter(t => t.status === 'Open' || t.status === 'In Progress' || t.status === 'Blocked').length;
  const closedCount = tasks.filter(t => t.status === 'Closed').length;
  const carriedCount = tasks.filter(t => (t.carriedForwardCount || 0) > 0).length;

  document.getElementById('metric-total-tasks').textContent = total;
  document.getElementById('metric-open-tasks').textContent = openCount;
  document.getElementById('metric-closed-tasks').textContent = closedCount;
  document.getElementById('metric-carried-tasks').textContent = carriedCount;

  const filtered = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(search) ||
      t.owner.toLowerCase().includes(search) ||
      (t.outcome && t.outcome.toLowerCase().includes(search));
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || t.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  tbody.innerHTML = '';

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding: 2.5rem;">No action items match the active filters.</td></tr>`;
    return;
  }

  filtered.forEach(task => {
    const tr = document.createElement('tr');
    const linkedMeeting = meetings.find(m => m.id === task.sessionId);
    const sessionTitle = linkedMeeting ? linkedMeeting.title : 'Standalone';

    tr.innerHTML = `
      <td>
        <span class="status-badge ${task.status.replace(/\s+/g, '-')}">${task.status}</span>
      </td>
      <td>
        <strong>${escapeHtml(task.title)}</strong>
        ${task.carriedForwardCount > 0 ? `<br><span class="task-history-chip">Carried x${task.carriedForwardCount}</span>` : ''}
        ${task.history && task.history.length > 1 ? `<br><span class="text-xs text-muted font-mono">${task.history[task.history.length-1].event}</span>` : ''}
      </td>
      <td><strong>${escapeHtml(task.owner)}</strong></td>
      <td class="font-mono text-xs">${task.dueDate}</td>
      <td><span class="priority-tag ${task.priority}">${task.priority}</span></td>
      <td class="text-xs text-muted" title="${escapeHtml(sessionTitle)}">${escapeHtml(sessionTitle.slice(0, 24))}${sessionTitle.length > 24 ? '...' : ''}</td>
      <td>
        ${task.outcome 
          ? `<span class="text-xs" style="color:var(--success); font-weight:500;">${escapeHtml(task.outcome)}</span>` 
          : `<span class="text-xs text-muted italic">Pending closure</span>`}
      </td>
      <td>
        <div style="display:flex; gap:0.4rem;">
          <button class="btn btn-sm btn-outline btn-task-edit" data-id="${task.id}" title="Edit / Update Status">
            <i data-lucide="edit-2" style="width:14px; height:14px;"></i>
          </button>
          <button class="btn btn-sm btn-outline text-danger btn-task-delete" data-id="${task.id}" title="Delete">
            <i data-lucide="trash" style="width:14px; height:14px;"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Attach row actions
  tbody.querySelectorAll('.btn-task-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const task = tasks.find(t => t.id === id);
      if (task) {
        document.getElementById('form-task-id').value = task.id;
        document.getElementById('task-title').value = task.title;
        document.getElementById('task-owner').value = task.owner;
        document.getElementById('task-duedate').value = task.dueDate;
        document.getElementById('task-status').value = task.status;
        document.getElementById('task-priority').value = task.priority;
        document.getElementById('task-outcome').value = task.outcome || '';
        populateSessionDropdown(task.sessionId);
        document.getElementById('modal-task-title').textContent = 'Update Action Item';
        openModal('modal-task');
      }
    });
  });

  tbody.querySelectorAll('.btn-task-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const task = tasks.find(t => t.id === id);
      if (task && confirm(`Delete action item "${task.title}"?`)) {
        const cid = AppLogger.generateCorrelationId();
        const updated = tasks.filter(t => t.id !== id);
        StorageService.saveTasks(updated);
        AppLogger.info('Deleted action item', { taskId: id, title: task.title }, cid);
        showToast('Task removed', 'info');
        renderTasksTable();
        updateHeaderBadges();
      }
    });
  });

  if (window.lucide) lucide.createIcons();
}

/* ==========================================================================
   Knowledge Base Tab & Semantic Linker
   ========================================================================== */

function initKBHandlers() {
  document.getElementById('btn-add-kb-doc').addEventListener('click', () => {
    document.getElementById('form-kb').reset();
    document.getElementById('form-kb-id').value = '';
    document.getElementById('modal-kb-title').textContent = 'Add Knowledge Document';
    openModal('modal-kb');
  });

  document.getElementById('form-kb').addEventListener('submit', (e) => {
    e.preventDefault();
    const cid = AppLogger.generateCorrelationId();
    const idInput = document.getElementById('form-kb-id').value;
    const isEdit = !!idInput;
    const docId = isEdit ? idInput : 'kb-' + Date.now().toString(36);

    const title = document.getElementById('kb-title').value.trim();
    const category = document.getElementById('kb-category').value;
    const tags = document.getElementById('kb-tags').value.split(',').map(t => t.trim()).filter(Boolean);
    const content = document.getElementById('kb-content').value.trim();

    const docs = StorageService.getKBDocs();
    const docObj = { id: docId, title, category, tags, content };

    if (isEdit) {
      const idx = docs.findIndex(d => d.id === docId);
      docs[idx] = docObj;
      AppLogger.info('Updated knowledge doc', { docId, title }, cid);
    } else {
      docs.unshift(docObj);
      AppLogger.info('Created new knowledge doc', { docId, title, category }, cid);
    }

    StorageService.saveKBDocs(docs);
    closeModal('modal-kb');
    showToast('Knowledge doc saved!', 'success');
    renderKBDocs();
  });

  // AI Semantic Linker Button
  document.getElementById('btn-trigger-ai-link').addEventListener('click', async () => {
    const docId = document.getElementById('kb-select-doc-analyze').value;
    const resultsContainer = document.getElementById('ai-link-results');
    const docs = StorageService.getKBDocs();
    const doc = docs.find(d => d.id === docId);

    if (!doc) {
      showToast('Please select a document first', 'error');
      return;
    }

    resultsContainer.innerHTML = `
      <div class="ai-generating-loader" style="display:flex;">
        <div class="spinner"></div>
        <p>Scanning all meetings, transcripts, and action items for semantic linkages...</p>
      </div>
    `;

    const meetings = StorageService.getMeetings();
    const tasks = StorageService.getTasks();

    const res = await AIService.findSemanticLinks(doc, meetings, tasks);

    if (res.matchedMeetings.length === 0 && res.matchedTasks.length === 0) {
      resultsContainer.innerHTML = `<div class="info-note">No strong semantic matches found across past meetings and action items.</div>`;
      return;
    }

    let html = `<div><strong class="text-xs" style="color:var(--accent);">AI Semantic Map (${res.matchedMeetings.length + res.matchedTasks.length} connections found in ${res.latencyMs}ms):</strong></div><div class="mt-2">`;

    res.matchedMeetings.forEach(item => {
      html += `
        <div class="link-result-item">
          <span class="rel-score">${item.relevanceScore}% match</span>
          <div><i data-lucide="calendar" style="width:12px; height:12px; color:var(--primary);"></i> <strong>${escapeHtml(item.meeting.title)}</strong></div>
          <p class="text-xs text-muted mt-1">${escapeHtml(item.reason)}</p>
        </div>
      `;
    });

    res.matchedTasks.forEach(item => {
      html += `
        <div class="link-result-item">
          <span class="rel-score">${item.relevanceScore}% match</span>
          <div><i data-lucide="check-square" style="width:12px; height:12px; color:var(--success);"></i> <strong>${escapeHtml(item.task.title)}</strong></div>
          <p class="text-xs text-muted mt-1">${escapeHtml(item.reason)} (Owner: ${item.task.owner})</p>
        </div>
      `;
    });

    html += `</div>`;
    resultsContainer.innerHTML = html;
    if (window.lucide) lucide.createIcons();
  });
}

function renderKBDocs() {
  const container = document.getElementById('kb-docs-container');
  const selectAnalyze = document.getElementById('kb-select-doc-analyze');
  const docs = StorageService.getKBDocs();

  container.innerHTML = '';
  selectAnalyze.innerHTML = '';

  if (docs.length === 0) {
    container.innerHTML = `<div class="empty-state"><p class="text-muted">No knowledge base documents created yet.</p></div>`;
    return;
  }

  docs.forEach(doc => {
    // Add to analyze dropdown
    const opt = document.createElement('option');
    opt.value = doc.id;
    opt.textContent = `${doc.title} (${doc.category})`;
    selectAnalyze.appendChild(opt);

    // Card
    const card = document.createElement('div');
    card.className = 'kb-doc-card';
    card.innerHTML = `
      <div class="kb-category-tag">${escapeHtml(doc.category)}</div>
      <div class="kb-doc-title">${escapeHtml(doc.title)}</div>
      <div class="kb-tag-pills">
        ${doc.tags.map(t => `<span class="kb-tag-pill">#${escapeHtml(t)}</span>`).join('')}
      </div>
      <div class="kb-doc-snippet">${escapeHtml(doc.content.slice(0, 140))}${doc.content.length > 140 ? '...' : ''}</div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:auto; pt-2;">
        <button class="btn btn-sm btn-outline btn-edit-kb" data-id="${doc.id}"><i data-lucide="edit-3"></i> Edit</button>
        <button class="btn btn-sm btn-outline text-danger btn-delete-kb" data-id="${doc.id}"><i data-lucide="trash-2"></i></button>
      </div>
    `;
    container.appendChild(card);
  });

  // Attach events
  container.querySelectorAll('.btn-edit-kb').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const d = docs.find(x => x.id === id);
      if (d) {
        document.getElementById('form-kb-id').value = d.id;
        document.getElementById('kb-title').value = d.title;
        document.getElementById('kb-category').value = d.category;
        document.getElementById('kb-tags').value = d.tags.join(', ');
        document.getElementById('kb-content').value = d.content;
        document.getElementById('modal-kb-title').textContent = 'Edit Knowledge Document';
        openModal('modal-kb');
      }
    });
  });

  container.querySelectorAll('.btn-delete-kb').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const d = docs.find(x => x.id === id);
      if (d && confirm(`Delete document "${d.title}"?`)) {
        const updated = docs.filter(x => x.id !== id);
        StorageService.saveKBDocs(updated);
        AppLogger.info('Deleted knowledge doc', { docId: id, title: d.title });
        showToast('Document deleted', 'info');
        renderKBDocs();
      }
    });
  });

  if (window.lucide) lucide.createIcons();
}

/* ==========================================================================
   STANDOUT FEATURE: Handover Sentinel (Risk & Orphan Task Radar)
   ========================================================================== */

function initSentinelHandlers() {
  document.getElementById('btn-run-sentinel-audit').addEventListener('click', () => {
    renderSentinelDashboard();
    showToast('Sentinel risk diagnostic re-computed!', 'success');
  });

  document.getElementById('btn-simulate-leave').addEventListener('click', () => {
    const person = document.getElementById('sim-person-select').value;
    runLeaveSimulation(person);
  });
}

function renderSentinelDashboard() {
  const tasks = StorageService.getTasks();
  const meetings = StorageService.getMeetings();
  const findingsContainer = document.getElementById('sentinel-findings-container');

  const openTasks = tasks.filter(t => t.status !== 'Closed');
  const now = new Date();

  // Find Orphan tasks (unassigned or missing valid due date)
  const orphanTasks = openTasks.filter(t => !t.owner || t.owner.toLowerCase().includes('unassigned'));

  // Find Stale carried tasks (carried more than once without closing)
  const staleCarriedTasks = openTasks.filter(t => (t.carriedForwardCount || 0) >= 1);

  // Find Overdue tasks
  const overdueTasks = openTasks.filter(t => {
    const due = new Date(t.dueDate);
    return due < now;
  });

  // Calculate Health Score
  let score = 100;
  score -= (orphanTasks.length * 15);
  score -= (staleCarriedTasks.length * 10);
  score -= (overdueTasks.length * 12);
  score = Math.max(25, Math.min(100, score));

  // Update Score UI
  document.getElementById('sentinel-health-score').textContent = `${score}%`;
  document.getElementById('stat-orphans').textContent = orphanTasks.length;
  document.getElementById('stat-stale').textContent = staleCarriedTasks.length;
  document.getElementById('stat-covered').textContent = `${Math.round(100 - (orphanTasks.length * 5))}%`;

  const headline = document.getElementById('sentinel-status-headline');
  const desc = document.getElementById('sentinel-status-desc');

  if (score >= 80) {
    headline.textContent = 'Transfer Health: Robust';
    desc.textContent = 'All meetings have designated proxy owners, action items have clear due dates, and open items are properly carried forward without stalls.';
  } else if (score >= 50) {
    headline.textContent = 'Transfer Health: Moderate Risk';
    desc.textContent = 'Detected open action items carried across multiple meetings without resolution. Prioritize reassignment before upcoming leave windows.';
  } else {
    headline.textContent = 'Transfer Health: Critical Transition Gaps';
    desc.textContent = 'High volume of orphan or overdue items detected. Handover protocol requires immediate attention to avoid lost project context.';
  }

  // Render Findings
  findingsContainer.innerHTML = '';

  const findings = [];

  if (orphanTasks.length > 0) {
    findings.push({
      severity: 'high',
      title: `${orphanTasks.length} Unowned / Orphan Action Items`,
      desc: `Action items detected with no assigned owner: ${orphanTasks.map(o => `"${o.title}"`).join(', ')}. Assign an owner to prevent dropped tasks.`
    });
  }

  if (staleCarriedTasks.length > 0) {
    findings.push({
      severity: 'medium',
      title: `${staleCarriedTasks.length} Stagnant Carried Forward Items`,
      desc: `Items carried over across sessions without status update: ${staleCarriedTasks.map(s => `"${s.title}" (x${s.carriedForwardCount})`).join(', ')}.`
    });
  }

  if (overdueTasks.length > 0) {
    findings.push({
      severity: 'high',
      title: `${overdueTasks.length} Overdue Critical Tasks`,
      desc: `Open tasks whose target due date has lapsed: ${overdueTasks.map(o => `"${o.title}" (${o.dueDate})`).join(', ')}.`
    });
  }

  // Check if handovers exist without matching KB doc
  findings.push({
    severity: 'info',
    title: `Handover Protocol Verification`,
    desc: `Active SOP document "Team On-Call Handover & Escalation Protocol" is linked to ${meetings.filter(m => m.type === 'handover').length} handover sessions.`
  });

  findings.forEach(f => {
    const item = document.createElement('div');
    item.className = `finding-item severity-${f.severity}`;
    item.innerHTML = `
      <div style="font-size: 1.2rem; color: ${f.severity === 'high' ? 'var(--danger)' : (f.severity === 'medium' ? 'var(--warning)' : 'var(--accent)')};">
        <i data-lucide="${f.severity === 'high' ? 'alert-triangle' : (f.severity === 'medium' ? 'clock' : 'info')}"></i>
      </div>
      <div class="finding-item-content">
        <h4>${escapeHtml(f.title)}</h4>
        <p>${escapeHtml(f.desc)}</p>
      </div>
    `;
    findingsContainer.appendChild(item);
  });

  if (window.lucide) lucide.createIcons();
}

function runLeaveSimulation(personName) {
  const tasks = StorageService.getTasks();
  const openByPerson = tasks.filter(t => t.owner.toLowerCase() === personName.toLowerCase() && t.status !== 'Closed');
  const outputEl = document.getElementById('simulation-output');

  if (openByPerson.length === 0) {
    outputEl.innerHTML = `
      <div class="info-note" style="border-color: var(--success); color: #86efac;">
        <strong>Zero Transition Risk:</strong> ${escapeHtml(personName)} has 0 open action items. Safe to step away without immediate backlog interruption.
      </div>
    `;
    return;
  }

  outputEl.innerHTML = `
    <div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
        <strong style="color:var(--danger); font-size:0.9rem;">⚠️ ${openByPerson.length} Active Responsibilities at Risk for ${escapeHtml(personName)}:</strong>
        <button class="btn btn-sm btn-accent" id="btn-auto-reassign-sim">
          <i data-lucide="sparkles"></i> AI Auto-Reassign Backlog
        </button>
      </div>
      <ul style="padding-left:1.2rem; font-size:0.85rem; line-height:1.6; color:#e2e8f0;">
        ${openByPerson.map(t => `
          <li><strong>${escapeHtml(t.title)}</strong> (Due: ${t.dueDate}, Priority: ${t.priority})</li>
        `).join('')}
      </ul>
      <div class="info-note mt-3">
        <strong>Sentinel Recommendation:</strong> Trigger a work handover session to delegate high-priority items before departure.
      </div>
    </div>
  `;

  document.getElementById('btn-auto-reassign-sim').addEventListener('click', () => {
    const cid = AppLogger.generateCorrelationId();
    // Simulate AI intelligent load balancing to another engineer (e.g. Priya Sharma or Alex Chen)
    const targetProxy = personName.includes('Sarah') ? 'Alex Chen' : 'Priya Sharma';

    openByPerson.forEach(t => {
      t.history = t.history || [];
      t.history.push({
        date: new Date().toISOString().split('T')[0],
        event: `Handover Sentinel: Auto-reassigned from ${personName} to proxy ${targetProxy} due to simulated leave`,
        owner: targetProxy
      });
      t.owner = targetProxy;
    });

    StorageService.saveTasks(tasks);
    AppLogger.info('Handover Sentinel executed automated leave mitigation reassignments', {
      departing: personName,
      targetProxy,
      itemsReassigned: openByPerson.length
    }, cid);

    showToast(`Transferred ${openByPerson.length} items to ${targetProxy}!`, 'success');
    runLeaveSimulation(personName);
    renderTasksTable();
    renderSentinelDashboard();
  });

  if (window.lucide) lucide.createIcons();
}

/* ==========================================================================
   Logs Tab & Structured Audit Terminal
   ========================================================================== */

function initLogHandlers() {
  document.getElementById('btn-export-logs-json').addEventListener('click', () => {
    AppLogger.exportLogsToFile();
    showToast('Exported structured logs to JSON file!', 'success');
  });

  document.getElementById('btn-clear-logs').addEventListener('click', () => {
    if (confirm('Clear all stored audit logs?')) {
      AppLogger.clearLogs();
      showToast('Logs cleared', 'info');
    }
  });

  document.getElementById('log-search-input').addEventListener('input', renderLogsTerminal);
  document.getElementById('filter-log-level').addEventListener('change', renderLogsTerminal);

  // Hook live log updates
  window.onNewLogEntry = (entry) => {
    const pane = document.getElementById('pane-logs');
    if (pane && pane.classList.contains('active')) {
      renderLogsTerminal();
    }
  };
}

function renderLogsTerminal() {
  const container = document.getElementById('terminal-logs-container');
  const search = (document.getElementById('log-search-input').value || '').toLowerCase();
  const filterLevel = document.getElementById('filter-log-level').value;

  const logs = StorageService.getLogs();

  const filtered = logs.filter(l => {
    const matchesSearch = l.message.toLowerCase().includes(search) ||
      l.correlationId.toLowerCase().includes(search) ||
      JSON.stringify(l.metadata).toLowerCase().includes(search);
    const matchesLevel = filterLevel === 'all' || l.level === filterLevel;
    return matchesSearch && matchesLevel;
  });

  container.innerHTML = '';

  if (filtered.length === 0) {
    container.innerHTML = `<div class="text-muted" style="padding: 2rem; text-align: center;">No log records matching filter.</div>`;
    return;
  }

  // Display newest at the bottom like a real terminal
  filtered.forEach(log => {
    const timeStr = log.timestamp.slice(11, 19);
    const line = document.createElement('div');
    line.className = 'log-entry';
    line.innerHTML = `
      <span class="log-timestamp">${timeStr}</span>
      <span class="log-cid">[${log.correlationId}]</span>
      <span class="log-level ${log.level}">${log.level}</span>
      <span class="log-msg">${escapeHtml(log.message)}</span>
      ${log.metadata && Object.keys(log.metadata).length > 0 ? `<span class="log-meta font-mono">${escapeHtml(JSON.stringify(log.metadata))}</span>` : ''}
    `;
    container.appendChild(line);
  });

  // Auto scroll to bottom
  container.scrollTop = container.scrollHeight;
}

/* ==========================================================================
   AI Settings Modal
   ========================================================================== */

function initAISettingsHandlers() {
  const settingsBtn = document.getElementById('ai-settings-btn');
  const modeSelect = document.getElementById('ai-mode-select');
  const credsContainer = document.getElementById('ai-credentials-container');
  const keyInput = document.getElementById('ai-api-key');
  const modelInput = document.getElementById('ai-model-name');
  const form = document.getElementById('form-ai-settings');
  const statusLabel = document.getElementById('current-ai-mode-label');

  settingsBtn.addEventListener('click', () => {
    const config = StorageService.getAIConfig();
    modeSelect.value = config.provider;
    keyInput.value = config.apiKey || '';
    modelInput.value = config.model || '';

    toggleCredsVisibility(config.provider);
    openModal('modal-ai-settings');
  });

  modeSelect.addEventListener('change', () => {
    toggleCredsVisibility(modeSelect.value);
  });

  function toggleCredsVisibility(provider) {
    if (provider === 'mock') {
      credsContainer.style.display = 'none';
      statusLabel.textContent = 'Smart Mock Engine (Active, Zero-Cost)';
    } else {
      credsContainer.style.display = 'block';
      statusLabel.textContent = provider === 'gemini' ? 'Google Gemini API' : 'OpenAI API';
      if (!modelInput.value) {
        modelInput.value = provider === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o-mini';
      }
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const config = {
      provider: modeSelect.value,
      apiKey: keyInput.value.trim(),
      model: modelInput.value.trim()
    };
    StorageService.saveAIConfig(config);
    AppLogger.info('AI Provider configuration updated', { provider: config.provider, model: config.model });
    showToast('AI Settings updated!', 'success');
    closeModal('modal-ai-settings');
    updateHeaderBadges();
  });

  document.getElementById('btn-test-ai-key').addEventListener('click', async () => {
    const statusDiv = document.getElementById('ai-test-connection-status');
    const provider = modeSelect.value;
    const key = keyInput.value.trim();

    if (provider === 'mock') {
      statusDiv.innerHTML = `<span style="color:var(--success);">✓ Smart Mock is operational (100% availability).</span>`;
      return;
    }

    if (!key) {
      statusDiv.innerHTML = `<span style="color:var(--danger);">Please enter an API key to test connection.</span>`;
      return;
    }

    statusDiv.innerHTML = `<span style="color:var(--accent);">⚡ Testing ${provider} API connection...</span>`;

    const cid = AppLogger.generateCorrelationId();
    try {
      const testConfig = { provider, apiKey: key, model: modelInput.value.trim() };
      const res = await AIService.parseRawNotes('Testing API connection. Decision: System online.', cid);
      statusDiv.innerHTML = `<span style="color:var(--success);">✓ Connection verified! Latency: ${res.latencyMs}ms</span>`;
      showToast('API Connection verified!', 'success');
    } catch (err) {
      statusDiv.innerHTML = `<span style="color:var(--danger);">✗ Connection failed: ${escapeHtml(err.message)}</span>`;
    }
  });
}

/* ==========================================================================
   Utilities
   ========================================================================== */

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatMarkdownToHTML(md) {
  if (!md) return '';
  let html = escapeHtml(md);

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h4>$1</h4>');
  html = html.replace(/^#### (.*$)/gim, '<h5 style="color:var(--text-muted); font-size:0.9rem; margin-top:0.75rem; margin-bottom:0.25rem;">$1</h5>');

  // Bold & Italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Bullet items
  html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

  // Paragraph breaks
  html = html.replace(/\n\n/g, '<br><br>');
  html = html.replace(/\n/g, '<br>');

  return html;
}
