// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function $(sel) { return document.querySelector(sel); }

function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  $('#toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function setLoading(msg = 'Đang tải...') {
  $('#app').innerHTML = `
    <div class="loading-screen">
      <div class="spinner"></div>
      <p>${msg}</p>
    </div>`;
}

function btnLoading(btn) {
  if (!btn) return;
  btn._origHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner"></span> Đang xử lý...';
}

function btnReset(btn) {
  if (!btn) return;
  btn.disabled = false;
  btn.innerHTML = btn._origHTML || btn.innerHTML;
}

function formatDateTime(iso) {
  if (!iso) return 'Không có hạn';
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function isOverdue(iso) {
  if (!iso) return false;
  return new Date(iso) < new Date();
}

function formatCountdown(iso) {
  if (!iso) return null;
  const diff = new Date(iso) - new Date();
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `⏰ Còn ${days} ngày ${hours} giờ`;
  if (hours > 0) return `⏰ Còn ${hours} giờ ${mins} phút`;
  return `⏰ Còn ${mins} phút`;
}

function countWords(text) {
  return (text || '').trim().split(/\s+/).filter(Boolean).length;
}

function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function repairImageTokensInBlocks(blocks) {
  let counter = 0;
  function nextId() { return `cb-repair-${++counter}`; }
  const result = [];
  for (const block of blocks) {
    if (block.type !== 'text' || !block.html?.includes('document-editor-image-token')) {
      result.push(block);
      continue;
    }
    const div = document.createElement('div');
    div.innerHTML = block.html;
    let textDiv = document.createElement('div');
    function flushText() {
      const h = textDiv.innerHTML.replace(/^(<br\s*\/?>)+|(<br\s*\/?>)+$/gi, '').trim();
      if (h) result.push({ id: nextId(), type: 'text', html: h, text: '' });
      textDiv = document.createElement('div');
    }
    function walkRepair(node) {
      if (node.nodeType === Node.ELEMENT_NODE && node.classList?.contains('document-editor-image-token')) {
        flushText();
        result.push({ id: node.dataset.blockId || nextId(), type: 'image', url: node.dataset.url || '', alt: node.dataset.alt || '', width: Math.max(1, Number(node.dataset.width) || 100) });
      } else if (node.nodeType === Node.ELEMENT_NODE && node.querySelector?.('.document-editor-image-token')) {
        node.childNodes.forEach(child => walkRepair(child));
      } else {
        textDiv.appendChild(node.cloneNode(true));
      }
    }
    div.childNodes.forEach(node => walkRepair(node));
    flushText();
  }
  return result;
}

function normalizeQuestionContentBlocks(blocks, fallbackText = '') {
  const repaired = repairImageTokensInBlocks(Array.isArray(blocks) ? blocks : []);
  const normalized = repaired
    .map((item, index) => {
        if (item?.type === 'image' && item?.url) {
          return { id: item.id || `cb-${index + 1}`, type: 'image', url: item.url, alt: item.alt || '', width: Number(item.width) || 100 };
        }
        return { id: item?.id || `cb-${index + 1}`, type: 'text', html: item?.html ?? (item?.text ? escapeHtml(String(item.text)) : ''), text: String(item?.text || '') };
      }).filter(Boolean);
  if (normalized.length > 0) return normalized;
  return [{ id: 'fallback-text', type: 'text', html: escapeHtml(fallbackText || ''), text: fallbackText || '' }];
}

function renderQuestionContentHTML(blocks, fallbackText = '', extraClass = '') {
  const normalized = normalizeQuestionContentBlocks(blocks, fallbackText);
  return `
    <div class="mixed-content ${extraClass}">
      ${normalized.map(block => block.type === 'image'
        ? `<figure class="mixed-content-image-wrap" data-block-id="${escapeHtml(block.id)}" style="width:${Math.max(1, Number(block.width) || 100)}%"><img class="mixed-content-image" src="${escapeHtml(block.url)}" alt="${escapeHtml(block.alt || 'Question image')}" /></figure>`
        : `<div class="mixed-content-text" data-block-id="${escapeHtml(block.id)}">${block.html ?? escapeHtml(block.text || '')}</div>`
      ).join('')}
    </div>`;
}

function openModal(title, bodyHtml) {
  const overlay = document.getElementById('modal-overlay');
  const titleEl = document.getElementById('modal-title');
  const bodyEl = document.getElementById('modal-body');
  if (!overlay || !titleEl || !bodyEl) return;
  titleEl.textContent = title;
  bodyEl.innerHTML = bodyHtml;
  overlay.classList.remove('hidden');
}

function closeModal(event) {
  const overlay = document.getElementById('modal-overlay');
  const bodyEl = document.getElementById('modal-body');
  if (!overlay) return;
  if (event && event.target !== overlay) return;
  overlay.classList.add('hidden');
  if (bodyEl) bodyEl.innerHTML = '';
}

function syncPasswordToggleButton(btn, input) {
  if (!btn || !input) return;
  const visible = input.type === 'text';
  btn.textContent = visible ? '👁️' : '🙈';
  btn.title = visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu';
  btn.setAttribute('aria-label', visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
  btn.dataset.visible = visible ? '1' : '0';
}

function togglePasswordVisibility(btn, inputId = 'login-password') {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
  syncPasswordToggleButton(btn || document.querySelector(`[data-toggle-password="${inputId}"]`), input);
}

const SKILL_ICONS  = { reading: '📖', listening: '🎧', writing: '✍️', speaking: '🎤' };
const SKILL_LABELS = { reading: 'Reading', listening: 'Listening', writing: 'Writing', speaking: 'Speaking' };
const SKILL_ORDER  = ['reading', 'listening', 'writing', 'speaking'];
const CHART_RANGE_OPTIONS = [3, 7, 30, 90, 365];

function skillBadge(skill) {
  return `<span class="badge badge-${skill}">${SKILL_ICONS[skill] || '?'} ${SKILL_LABELS[skill] || skill}</span>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTH & STATE
// ═══════════════════════════════════════════════════════════════════════════

// _student = { id, full_name, username, classes: [{id, class_name}] }
// _selectedClass = { id, class_name }
let _student = null;
let _selectedClass = null;
let _assignmentSkillFilter = '';

// Highlight mode state
let _highlightMode  = false;
let _highlightColor = 'yellow';

const HIGHLIGHT_COLORS = {
  yellow: '#fef08a',
  green:  '#bbf7d0',
  blue:   '#bfdbfe',
  pink:   '#fbcfe8',
};

// Vocab game state
let _vocabGameId   = null;
let _vocabGameData = null; // { assignment_title, skill, vocabulary: [{word, definition, example}] }
let _fc            = null; // flashcard: { cards, idx, flipped } | null
let _match         = null; // matching: { cards, firstSelected, wrongCount, startTime, timerInterval, done } | null

// ── B1.x — In-task UX state ────────────────────────────────────────────────
let _taskTimer       = null;       // setInterval id for count-up timer
let _taskStartTime   = 0;
let _autoSaveTimer   = null;
let _flaggedSet      = new Set();  // q_no flagged for review
let _activeAssignmentId = null;
let _waveformAnim    = null;       // requestAnimationFrame id for speaking waveform
let _audioCtx        = null;       // shared AudioContext for waveform

function draftKey(aid, kind = 'answers') {
  return `ielts_draft:${_student?.id || 'anon'}:${aid}:${kind}`;
}
function saveDraft(aid, kind, data) {
  try { localStorage.setItem(draftKey(aid, kind), JSON.stringify({ data, savedAt: Date.now() })); } catch {}
}
function loadDraft(aid, kind = 'answers') {
  try {
    const raw = localStorage.getItem(draftKey(aid, kind));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
function clearAllDrafts(aid) {
  for (const k of ['answers', 'writing', 'flags', 'notes', 'startedAt']) {
    try { localStorage.removeItem(draftKey(aid, k)); } catch {}
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

let _notifPanelOpen = false;
let _notifPollTimer = null;

function notifDaysLabel(daysLeft) {
  if (daysLeft <= 0)  return { text: 'hôm nay', cls: 'urgent' };
  if (daysLeft === 1) return { text: '1 ngày', cls: 'warn' };
  if (daysLeft === 2) return { text: '2 ngày', cls: 'caution' };
  return { text: `${daysLeft} ngày`, cls: '' };
}

function notifTimeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 2)  return 'vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  return `${days} ngày trước`;
}

function renderNotifItem(n) {
  const meta = n.metadata || {};
  let icon = '🔔';
  let titleText = '';
  let desc = '';
  let urgencyCls = '';
  let navUrl = '';

  const skillTag = meta.skill
    ? `<span class="badge badge-${meta.skill} notif-skill-badge">${SKILL_ICONS[meta.skill] || ''} ${SKILL_LABELS[meta.skill] || ''}</span> `
    : '';

  if (n.type === 'score_released') {
    icon = '📊';
    navUrl = `/result/${n.ref_id}`;
    titleText = `${skillTag}Bài <strong>${escapeHtml(meta.title || '')}</strong> đã có điểm: <strong>${meta.score ?? '?'} Band</strong>`;
    desc = notifTimeAgo(n.created_at);
  } else if (n.type === 'deadline_reminder') {
    icon = '⏰';
    navUrl = `/assignment/${n.ref_id}`;
    const dl = notifDaysLabel(meta.days_left ?? 99);
    urgencyCls = dl.cls;
    titleText = `${skillTag}Bài <strong>${escapeHtml(meta.title || '')}</strong> còn <strong>${dl.text}</strong> tới hạn`;
    desc = notifTimeAgo(n.created_at);
  } else if (n.type === 'new_assignment') {
    icon = '📝';
    navUrl = `/assignment/${n.ref_id}`;
    const deadlineStr = meta.deadline
      ? ` · Hạn: ${new Date(meta.deadline).toLocaleDateString('vi-VN')}`
      : '';
    titleText = `${skillTag}Bài mới: <strong>${escapeHtml(meta.title || '')}</strong>`;
    desc = notifTimeAgo(n.created_at) + deadlineStr;
  }

  const readCls = n.is_read ? 'notif-item--read' : 'notif-item--unread';
  const markReadBtn = n.is_read
    ? ''
    : `<button class="notif-btn-read" onclick="markNotifRead(this);event.stopPropagation()" title="Đánh dấu đã đọc">✓</button>`;

  return `
    <div class="notif-item ${readCls} ${urgencyCls ? 'notif-item--' + urgencyCls : ''}"
         data-notif-id="${escapeHtml(String(n.id))}"
         data-nav-url="${escapeHtml(navUrl)}">
      <div class="notif-item-icon">${icon}</div>
      <div class="notif-item-body" onclick="navigateFromNotif(this.closest('.notif-item').dataset.navUrl)">
        <div class="notif-item-title">${titleText}</div>
        <div class="notif-item-desc">${escapeHtml(desc)}</div>
      </div>
      <div class="notif-item-btns">
        ${markReadBtn}
        <button class="notif-btn-delete" onclick="deleteNotif(this);event.stopPropagation()" title="Xóa">✕</button>
      </div>
    </div>`;
}

function navigateFromNotif(url) {
  closeNotifPanel();
  if (url) navigate(url);
}

async function markNotifRead(btn) {
  const item = btn.closest('.notif-item');
  const notifId = item?.dataset.notifId;
  if (!notifId) return;
  btn.disabled = true;
  try {
    await api.patch(`/student/notifications/${notifId}/read`, {});
    item.classList.remove('notif-item--unread');
    item.classList.add('notif-item--read');
    btn.remove();
    await refreshNotifBadge();
  } catch {
    btn.disabled = false;
  }
}

async function deleteNotif(btn) {
  const item = btn.closest('.notif-item');
  const notifId = item?.dataset.notifId;
  if (!notifId) return;
  btn.disabled = true;
  try {
    const wasUnread = item.classList.contains('notif-item--unread');
    await fetch(`${API_BASE}/student/notifications/${notifId}`, {
      method: 'DELETE',
      headers: api._authHeaders(),
    });
    item.remove();
    const listEl = document.getElementById('notif-list');
    if (listEl && !listEl.querySelector('.notif-item')) {
      listEl.innerHTML = '<div class="notif-empty">Không có thông báo nào</div>';
    }
    if (wasUnread) await refreshNotifBadge();
  } catch {
    btn.disabled = false;
  }
}

async function markAllNotifsRead() {
  try {
    const classId = _selectedClass?.id;
    if (!classId) return;
    await fetch(`${API_BASE}/student/notifications/read-all?class_id=${encodeURIComponent(classId)}`, {
      method: 'PATCH',
      headers: api._authHeaders(),
    });
    document.querySelectorAll('.notif-item--unread').forEach(el => {
      el.classList.remove('notif-item--unread');
      el.classList.add('notif-item--read');
      el.querySelector('.notif-btn-read')?.remove();
    });
    await refreshNotifBadge();
  } catch {}
}

async function refreshNotifBadge() {
  try {
    const classId = _selectedClass?.id;
    if (!classId) return;
    const data = await fetch(
      `${API_BASE}/student/notifications/count?class_id=${encodeURIComponent(classId)}`,
      { headers: api._authHeaders() }
    ).then(r => r.ok ? r.json() : { count: 0 });
    const badge = document.getElementById('notif-badge');
    if (!badge) return;
    const count = data.count || 0;
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : String(count);
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  } catch {}
}

async function loadNotifPanel() {
  const listEl = document.getElementById('notif-list');
  if (!listEl) return;
  try {
    const classId = _selectedClass?.id;
    if (!classId) { listEl.innerHTML = '<div class="notif-empty">Vui lòng chọn lớp</div>'; return; }
    const rows = await fetch(
      `${API_BASE}/student/notifications?class_id=${encodeURIComponent(classId)}`,
      { headers: api._authHeaders() }
    ).then(r => r.ok ? r.json() : []);
    listEl.innerHTML = rows.length ? rows.map(renderNotifItem).join('') : '<div class="notif-empty">Không có thông báo nào</div>';
  } catch {
    listEl.innerHTML = '<div class="notif-empty">Không thể tải thông báo</div>';
  }
}

function toggleNotifPanel() {
  _notifPanelOpen ? closeNotifPanel() : openNotifPanel();
}

function openNotifPanel() {
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  _notifPanelOpen = true;
  panel.classList.remove('hidden');
  loadNotifPanel();
  const list = document.getElementById('notif-list');
  if (list) {
    list.onscroll = () => {
      const atBottom = list.scrollHeight - list.scrollTop <= list.clientHeight + 4;
      list.classList.toggle('at-bottom', atBottom);
    };
  }
}

function closeNotifPanel() {
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  _notifPanelOpen = false;
  panel.classList.add('hidden');
}

async function syncNotifUIAfterSubmit() {
  await refreshNotifBadge();
  if (_notifPanelOpen) await loadNotifPanel();
}

function startNotifPolling() {
  if (_notifPollTimer) return;
  refreshNotifBadge();
  _notifPollTimer = setInterval(refreshNotifBadge, 60000);
}

function stopNotifPolling() {
  if (_notifPollTimer) clearInterval(_notifPollTimer);
  _notifPollTimer = null;
}

// Close panel when clicking outside (bell wrap OR panel itself)
document.addEventListener('click', e => {
  if (!_notifPanelOpen) return;
  const wrap  = document.getElementById('notif-bell-wrap');
  const panel = document.getElementById('notif-panel');
  if (
    !(wrap  && wrap.contains(e.target)) &&
    !(panel && panel.contains(e.target))
  ) closeNotifPanel();
});

window.toggleNotifPanel  = toggleNotifPanel;
window.markNotifRead     = markNotifRead;
window.deleteNotif       = deleteNotif;
window.markAllNotifsRead = markAllNotifsRead;
window.navigateFromNotif = navigateFromNotif;

function startTaskTimer(aid) {
  // Count-up timer; persists start time so refresh keeps counting
  let stored = loadDraft(aid, 'startedAt');
  if (!stored) {
    stored = { data: Date.now() };
    saveDraft(aid, 'startedAt', Date.now());
  }
  _taskStartTime = stored.data || Date.now();
  function tick() {
    const el = document.getElementById('task-timer');
    if (!el) { stopTaskTimer(); return; }
    const sec = Math.max(0, Math.floor((Date.now() - _taskStartTime) / 1000));
    const m = Math.floor(sec / 60), s = sec % 60;
    el.textContent = `⏱ ${m}:${String(s).padStart(2, '0')}`;
  }
  tick();
  if (_taskTimer) clearInterval(_taskTimer);
  _taskTimer = setInterval(tick, 1000);
}
function stopTaskTimer() {
  if (_taskTimer) clearInterval(_taskTimer);
  _taskTimer = null;
}

function startAutoSave(fn) {
  if (_autoSaveTimer) clearInterval(_autoSaveTimer);
  _autoSaveTimer = setInterval(() => { try { fn(); } catch {} }, 5000);
}
function stopAutoSave() {
  if (_autoSaveTimer) clearInterval(_autoSaveTimer);
  _autoSaveTimer = null;
}

function showSavedIndicator() {
  const el = document.getElementById('save-indicator');
  if (!el) return;
  const now = new Date();
  el.textContent = `💾 Đã lưu ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 1800);
}

function toggleFlag(qNo) {
  if (_flaggedSet.has(qNo)) _flaggedSet.delete(qNo); else _flaggedSet.add(qNo);
  document.querySelectorAll(`[data-flag-q="${qNo}"]`).forEach(b => b.classList.toggle('flagged', _flaggedSet.has(qNo)));
  document.querySelectorAll(`[data-nav-q="${qNo}"]`).forEach(b => b.classList.toggle('flagged', _flaggedSet.has(qNo)));
  if (_activeAssignmentId) saveDraft(_activeAssignmentId, 'flags', Array.from(_flaggedSet));
}

function updateNavigatorState() {
  document.querySelectorAll('[data-nav-q]').forEach(btn => {
    const q = btn.dataset.navQ;
    const inp = document.getElementById(`ans-${q}`);
    btn.classList.toggle('answered', !!(inp?.value?.trim()));
  });
}

function jumpToQuestion(qNo) {
  const inp = document.getElementById(`ans-${qNo}`);
  if (!inp) return;
  inp.focus();
  inp.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function buildQuestionNavigator(qCount, assignmentId) {
  if (!qCount) return '';
  let cells = '';
  for (let i = 1; i <= qCount; i++) {
    cells += `<button class="q-nav-btn" data-nav-q="${i}" onclick="jumpToQuestion(${i})">${i}</button>`;
  }
  const noteKey = `note_${assignmentId}`;
  const savedNote = (() => { try { return localStorage.getItem(noteKey) || ''; } catch { return ''; } })();
  return `
    <div class="q-navigator">
      <div class="q-nav-title">Điều hướng câu hỏi</div>
      <div class="q-nav-grid">${cells}</div>
      <div class="q-nav-legend">
        <span><span class="q-nav-dot answered"></span> đã trả lời</span>
        <span><span class="q-nav-dot flagged"></span> đánh dấu</span>
      </div>
    </div>
    <div class="note-panel">
      <button class="note-panel-toggle" onclick="toggleNotePanel(this)" type="button">
        📝 Ghi chú <span class="note-panel-arrow">▼</span>
      </button>
      <div class="note-panel-body hidden">
        <textarea class="note-panel-textarea" id="note-area-${assignmentId}"
          placeholder="Ghi chú của bạn..."
          oninput="saveNotePanel('${assignmentId}')">${escapeHtml(savedNote)}</textarea>
      </div>
    </div>`;
}

function buildHighlightToolbar() {
  const colors = [
    ['yellow', '🟨'],
    ['green', '🟩'],
    ['blue', '🟦'],
    ['pink', '🩷'],
  ];
  return `
    <div class="highlight-toolbar">
      <span class="hl-label">Highlight</span>
      ${colors.map(([key, emoji]) => `
        <button type="button" class="hl-btn ${_highlightColor === key ? 'hl-btn-active' : ''}"
          title="${key}" onclick="setHighlightColor('${key}')">${emoji}</button>`).join('')}
    </div>`;
}

function escapeAttrJson(value) {
  return escapeHtml(JSON.stringify(value || {}));
}

function setHighlightColor(color) {
  if (!HIGHLIGHT_COLORS[color]) return;
  _highlightColor = color;
  document.querySelectorAll('.highlight-toolbar .hl-btn').forEach(btn => btn.classList.remove('hl-btn-active'));
  document.querySelectorAll('.highlight-toolbar .hl-btn').forEach(btn => {
    if (btn.getAttribute('onclick') === `setHighlightColor('${color}')`) btn.classList.add('hl-btn-active');
  });
}

function applyStudentHighlight() {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || !sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  const target = document.getElementById('reading-text');
  if (!target || !target.contains(range.commonAncestorContainer)) return;
  const mark = document.createElement('mark');
  mark.className = `student-highlight hl-${_highlightColor}`;
  mark.dataset.color = _highlightColor;
  try {
    range.surroundContents(mark);
    sel.removeAllRanges();
  } catch {
    toast('Chưa highlight được đoạn này. Hãy chọn gọn trong một đoạn text.', 'warning');
  }
}

function removeStudentHighlight(mark) {
  const parent = mark?.parentNode;
  if (!parent) return;
  while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
  parent.removeChild(mark);
  parent.normalize();
}

function bindReadingTextInteractions() {
  const target = document.getElementById('reading-text');
  if (!target) return;
  target.addEventListener('click', e => {
    const source = e.target instanceof Element ? e.target : e.target?.parentElement;
    const mark = source?.closest?.('mark.student-highlight');
    if (!mark || !target.contains(mark)) return;
    e.preventDefault();
    e.stopPropagation();
    removeStudentHighlight(mark);
    window.getSelection()?.removeAllRanges();
  });
  target.addEventListener('mouseup', () => {
    setTimeout(() => applyStudentHighlight(), 0);
  });
}

function toggleNotePanel(btn) {
  const body = btn.nextElementSibling;
  const arrow = btn.querySelector('.note-panel-arrow');
  const isOpen = !body.classList.toggle('hidden');
  if (arrow) arrow.textContent = isOpen ? '▲' : '▼';
  if (isOpen) { const ta = body.querySelector('textarea'); if (ta) ta.focus(); }
}
window.toggleNotePanel = toggleNotePanel;
window.setHighlightColor = setHighlightColor;

function saveNotePanel(assignmentId) {
  const ta = document.getElementById(`note-area-${assignmentId}`);
  if (!ta) return;
  try { localStorage.setItem(`note_${assignmentId}`, ta.value); } catch {}
}

// ── Listening replay (B1.6) ────────────────────────────────────────────────
function renderListeningAudioHtml(obj) {
  const tracks = Array.isArray(obj?.content_urls) && obj.content_urls.length > 0
    ? obj.content_urls
    : (obj?.content_url ? [{ url: obj.content_url, name: '' }] : []);
  if (!tracks.length) return '';
  const multi = tracks.length > 1;
  return tracks.map((t, i) => `
    <div class="audio-player-box">
      ${multi ? `<div class="audio-track-label">🎧 ${escapeHtml(t.name || ('File ' + (i + 1)))}</div>` : '<span class="audio-player-icon">🎧</span>'}
      <audio controls src="${escapeHtml(t.url || '')}">Trình duyệt không hỗ trợ audio.</audio>
      <div class="audio-replay-controls">
        <button class="btn-replay" onclick="audioSeekEl(this,-10)" title="Lùi 10s">⏪ -10s</button>
        <button class="btn-replay" onclick="audioSeekEl(this,-5)"  title="Lùi 5s">◀ -5s</button>
        <button class="btn-replay" onclick="audioSeekEl(this,5)"   title="Tới 5s">+5s ▶</button>
        <button class="btn-replay" onclick="audioSeekEl(this,10)"  title="Tới 10s">+10s ⏩</button>
      </div>
    </div>`).join('');
}

function audioSeek(delta) {
  const audio = document.querySelector('.audio-player-box audio');
  if (!audio) return;
  audio.currentTime = Math.max(0, Math.min((audio.duration || 0), audio.currentTime + delta));
  if (audio.paused) audio.play().catch(() => {});
}

function audioSeekEl(btn, delta) {
  const audio = btn?.closest('.audio-player-box')?.querySelector('audio');
  if (!audio) return;
  audio.currentTime = Math.max(0, Math.min((audio.duration || 0), audio.currentTime + delta));
  if (audio.paused) audio.play().catch(() => {});
}

// ── Speaking waveform (B1.8) ───────────────────────────────────────────────
function startWaveform(stream) {
  const canvas = document.getElementById('waveform-canvas');
  if (!canvas) return;
  try {
    _audioCtx = _audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const source = _audioCtx.createMediaStreamSource(stream);
    const analyser = _audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    const buf = new Uint8Array(analyser.frequencyBinCount);
    const ctx = canvas.getContext('2d');
    function draw() {
      _waveformAnim = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(buf);
      const w = canvas.width, h = canvas.height;
      ctx.fillStyle = '#0d5f58';
      ctx.fillRect(0, 0, w, h);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#5eead4';
      ctx.beginPath();
      const slice = w / buf.length;
      let x = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = buf[i] / 128.0;
        const y = (v * h) / 2;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        x += slice;
      }
      ctx.lineTo(w, h / 2);
      ctx.stroke();
    }
    draw();
  } catch (e) { console.warn('Waveform setup failed:', e); }
}
function stopWaveform() {
  if (_waveformAnim) cancelAnimationFrame(_waveformAnim);
  _waveformAnim = null;
}

// ── B1.9 confirm submit modal ──────────────────────────────────────────────
function confirmSubmit({ title, message, confirmText = 'Vẫn nộp', cancelText = 'Quay lại' }) {
  return new Promise(resolve => {
    const wrap = document.createElement('div');
    wrap.className = 'submit-confirm-overlay';
    wrap.innerHTML = `
      <div class="submit-confirm-modal">
        <div class="submit-confirm-title">${escapeHtml(title)}</div>
        <div class="submit-confirm-body">${message}</div>
        <div class="submit-confirm-actions">
          <button class="btn btn-outline" data-act="cancel">${escapeHtml(cancelText)}</button>
          <button class="btn btn-primary" data-act="confirm">${escapeHtml(confirmText)}</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    wrap.querySelector('[data-act=cancel]').onclick = () => { wrap.remove(); resolve(false); };
    wrap.querySelector('[data-act=confirm]').onclick = () => { wrap.remove(); resolve(true); };
    wrap.onclick = (e) => { if (e.target === wrap) { wrap.remove(); resolve(false); } };
  });
}

window.saveNotePanel = saveNotePanel;

function loadAuth() {
  try {
    const s = localStorage.getItem('ielts_student');
    const c = localStorage.getItem('ielts_class');
    const t = localStorage.getItem('ielts_token');
    if (s) _student = JSON.parse(s);
    if (c) _selectedClass = JSON.parse(c);
    if (t) api._token = t;
  } catch {}
}

function saveAuth(student, token) {
  _student = student;
  localStorage.setItem('ielts_student', JSON.stringify(student));
  if (token) {
    api._token = token;
    localStorage.setItem('ielts_token', token);
  }
}

function selectClass(cls) {
  _selectedClass = cls;
  localStorage.setItem('ielts_class', JSON.stringify(cls));
}

function clearAuth() {
  _student = null;
  _selectedClass = null;
  api._token = null;
  api.clearCache?.();
  _myVocabCache = null;
  localStorage.removeItem('ielts_student');
  localStorage.removeItem('ielts_class');
  localStorage.removeItem('ielts_token');
}

function updateHeader() {
  const header = $('#app-header');
  if (!header) return;

  if (_student) {
    header.classList.remove('hidden');
    $('#header-student-name').textContent = _student.full_name;
    $('#header-class-name').textContent   = _selectedClass?.class_name ?? '';
    $('#app').classList.add('with-header');
    startNotifPolling();

    // Show "Đổi lớp" button only if student has multiple classes
    const switchBtn = $('#switch-class-btn');
    if (switchBtn) {
      switchBtn.style.display = (_student.classes?.length > 1) ? 'inline-flex' : 'none';
    }

    // Sync active state on mobile nav links
    const hash = window.location.hash.slice(1) || '/home';
    document.querySelectorAll('.mobile-nav-link[data-mobile-nav]').forEach(link => {
      const key = link.dataset.mobileNav;
      const active = hash.startsWith('/' + key) || (key === 'home' && hash === '/home');
      link.classList.toggle('active', active);
    });
  } else {
    header.classList.add('hidden');
    $('#app').classList.remove('with-header');
    stopNotifPolling();
  }
}

function logout() {
  stopNotifPolling();
  clearAuth();
  navigate('/login');
}

function openChangePasswordModal() {
  openModal('Đổi mật khẩu', `
    <div class="form-group">
      <label class="form-label">Mật khẩu cũ</label>
      <div class="password-wrap">
        <input id="cp-old-password" class="form-input" type="password"
          placeholder="Nhập mật khẩu hiện tại" autocomplete="current-password" />
        <button type="button" class="btn-eye" data-toggle-password="cp-old-password"
          onclick="togglePasswordVisibility(this, 'cp-old-password')" title="Hiện mật khẩu" aria-label="Hiện mật khẩu">🙈</button>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Mật khẩu mới</label>
      <div class="password-wrap">
        <input id="cp-new-password" class="form-input" type="password"
          placeholder="Ít nhất 8 ký tự" autocomplete="new-password" />
        <button type="button" class="btn-eye" data-toggle-password="cp-new-password"
          onclick="togglePasswordVisibility(this, 'cp-new-password')" title="Hiện mật khẩu" aria-label="Hiện mật khẩu">🙈</button>
      </div>
      <div class="form-hint">Mật khẩu mới phải có ít nhất 8 ký tự.</div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" onclick="closeModal()">Hủy</button>
      <button class="btn btn-primary" id="cp-save-btn" onclick="submitChangePassword(this)">Lưu mật khẩu mới</button>
    </div>
  `);
  setTimeout(() => $('#cp-old-password')?.focus(), 50);
}

async function submitChangePassword(btn) {
  const oldPassword = $('#cp-old-password')?.value || '';
  const newPassword = $('#cp-new-password')?.value || '';

  if (!oldPassword || !newPassword) {
    toast('Vui lòng nhập đầy đủ mật khẩu cũ và mật khẩu mới.', 'error');
    return;
  }
  if (newPassword.length < 8) {
    toast('Mật khẩu mới phải có ít nhất 8 ký tự.', 'error');
    return;
  }
  if (oldPassword === newPassword) {
    toast('Mật khẩu mới phải khác mật khẩu cũ.', 'error');
    return;
  }

  const ok = await confirmSubmit({
    title: 'Xác nhận đổi mật khẩu',
    message: 'Sau khi xác nhận, mật khẩu cũ sẽ không còn dùng được nữa.',
    confirmText: 'Xác nhận đổi',
    cancelText: 'Huỷ',
  });
  if (!ok) return;

  btnLoading(btn);
  try {
    await api.post('/student/change-password', {
      old_password: oldPassword,
      new_password: newPassword,
    });
    closeModal();
    toast('Đổi mật khẩu thành công!');
  } catch (e) {
    btnReset(btn);
    toast(e.error || 'Không thể đổi mật khẩu lúc này.', 'error');
  }
}

function switchClass() {
  _selectedClass = null;
  localStorage.removeItem('ielts_class');
  navigate('/select-class');
}

// ═══════════════════════════════════════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════════════════════════════════════

const routes = {
  '/login':          showLogin,
  '/select-class':   showClassSelect,
  '/home':           showHome,
  '/assignments':    showAssignments,
  '/assignment/:id': showAssignment,
  '/result/:id':     showResult,
  '/history':        showHistory,
  '/calendar':       showCalendar,
  '/vocab-games':    showVocabGames,
  '/vocab-game/:id': showVocabGame,
  '/practice/:id':   showPractice,
  '/profile':        showProfile,
  '/my-vocab':       showMyVocab,
};

function navigate(hash) {
  closeMobileNav();
  window.location.hash = hash;
}

// ── Mobile nav drawer ──────────────────────────────────────────────────────
function toggleMobileNav() {
  const nav      = document.getElementById('mobile-nav');
  const backdrop = document.getElementById('mobile-nav-backdrop');
  if (!nav) return;
  const isOpen = nav.classList.contains('open');
  isOpen ? closeMobileNav() : openMobileNav();
}
function openMobileNav() {
  const nav      = document.getElementById('mobile-nav');
  const backdrop = document.getElementById('mobile-nav-backdrop');
  nav?.classList.add('open');
  backdrop?.classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeMobileNav() {
  const nav      = document.getElementById('mobile-nav');
  const backdrop = document.getElementById('mobile-nav-backdrop');
  nav?.classList.remove('open');
  backdrop?.classList.remove('active');
  document.body.style.overflow = '';
}
window.toggleMobileNav = toggleMobileNav;
window.closeMobileNav  = closeMobileNav;

function matchRoute(pattern, path) {
  const pp = pattern.split('/');
  const tp = path.split('/');
  if (pp.length !== tp.length) return null;
  const params = {};
  for (let i = 0; i < pp.length; i++) {
    if (pp[i].startsWith(':')) {
      params[pp[i].slice(1)] = tp[i];
    } else if (pp[i] !== tp[i]) {
      return null;
    }
  }
  return params;
}

function router() {
  const hash = window.location.hash.slice(1) || '/home';
  updateHeader();

  // Not logged in → always go to login
  if (!_student && hash !== '/login') {
    navigate('/login');
    return;
  }
  // Logged in but on login → decide next step
  if (_student && hash === '/login') {
    navigate(_selectedClass ? '/home' : '/select-class');
    return;
  }
  // Logged in, has no class selected, not on select-class → force class select
  if (_student && !_selectedClass && hash !== '/select-class') {
    navigate('/select-class');
    return;
  }

  for (const [pattern, handler] of Object.entries(routes)) {
    const params = matchRoute(pattern, hash);
    if (params !== null) {
      handler(params);
      return;
    }
  }

  // Fallback
  if (!_student)      showLogin({});
  else if (!_selectedClass) showClassSelect({});
  else showHome({});
}

window.addEventListener('hashchange', router);

// ═══════════════════════════════════════════════════════════════════════════
// PAGE: LOGIN
// ═══════════════════════════════════════════════════════════════════════════

function showLogin() {
  $('#app').classList.remove('with-header');
  $('#app-header').classList.add('hidden');
  $('#app').innerHTML = `
    <div class="login-page">
      <div class="login-card">
        <div class="login-logo">
          <span class="login-logo-icon">🎓</span>
          <div class="login-logo-title">IELTS Student</div>
          <div class="login-logo-sub">Cổng học sinh luyện thi IELTS</div>
        </div>

        <div id="login-error" class="login-error"></div>

        <div class="form-group">
          <label class="form-label">Username</label>
          <input id="login-username" class="form-input" placeholder="Nhập username của bạn"
            autocomplete="username" />
        </div>
        <div class="form-group">
          <label class="form-label">Mật khẩu</label>
          <div class="password-wrap">
            <input id="login-password" class="form-input" type="password"
              placeholder="Nhập mật khẩu"
              autocomplete="current-password"
              onkeydown="if(event.key==='Enter') submitLogin($('#login-btn'))" />
            <button type="button" class="btn-eye" data-toggle-password="login-password"
              onclick="togglePasswordVisibility(this, 'login-password')" title="Hiện mật khẩu" aria-label="Hiện mật khẩu">🙈</button>
          </div>
        </div>

        <button id="login-btn" class="btn btn-primary" onclick="submitLogin(this)">
          Đăng nhập
        </button>
      </div>
    </div>`;
  setTimeout(() => $('#login-username')?.focus(), 50);
}

async function submitLogin(btn) {
  const username = $('#login-username')?.value.trim();
  const password = $('#login-password')?.value;
  const errEl    = $('#login-error');

  if (!username || !password) {
    errEl.textContent = 'Vui lòng nhập đầy đủ username và mật khẩu.';
    errEl.classList.add('show');
    return;
  }

  btnLoading(btn);
  errEl.classList.remove('show');

  try {
    const { student, token } = await api.post('/auth/login', { username, password });
    saveAuth(student, token);

    if (!student.classes || student.classes.length === 0) {
      // No class — show a message (class select will handle it)
      navigate('/select-class');
    } else if (student.classes.length === 1) {
      // Single class — auto-select and go directly to home
      selectClass(student.classes[0]);
      navigate('/home');
    } else {
      // Multiple classes — show class selection
      navigate('/select-class');
    }
  } catch (e) {
    btnReset(btn);
    errEl.textContent = e.error || 'Đăng nhập thất bại. Vui lòng thử lại.';
    errEl.classList.add('show');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGE: CLASS SELECTION
// ═══════════════════════════════════════════════════════════════════════════

function showClassSelect() {
  updateHeader();

  const classes = _student?.classes ?? [];

  if (classes.length === 0) {
    $('#app').innerHTML = `
      <div class="class-select-page">
        <div class="class-select-card">
          <div class="class-select-header">
            <div class="class-select-avatar">👋</div>
            <div class="class-select-name">Xin chào, ${escapeHtml(_student?.full_name)}!</div>
          </div>
          <div style="text-align:center;padding:32px 0">
            <div style="font-size:40px;margin-bottom:12px">😕</div>
            <div style="font-weight:700;margin-bottom:6px">Bạn chưa thuộc lớp nào</div>
            <div style="font-size:13px;color:#6b7280">
              Liên hệ giáo viên để được thêm vào lớp học.
            </div>
          </div>
          <button class="btn btn-outline btn-full" onclick="logout()" style="margin-top:8px">
            Đăng xuất
          </button>
        </div>
      </div>`;
    return;
  }

  const classCards = classes.map(cls => `
    <button class="class-card" onclick="chooseClass('${cls.id}', '${escapeHtml(cls.class_name).replace(/'/g, "\\'")}')">
      <div class="class-card-icon">🏫</div>
      <div class="class-card-name">${escapeHtml(cls.class_name)}</div>
      <div class="class-card-arrow">›</div>
    </button>`).join('');

  $('#app').innerHTML = `
    <div class="class-select-page">
      <div class="class-select-card">
        <div class="class-select-header">
          <div class="class-select-avatar">👋</div>
          <div class="class-select-name">Xin chào, ${escapeHtml(_student?.full_name)}!</div>
          <div class="class-select-sub">Chọn lớp học để tiếp tục</div>
        </div>

        <div class="class-list">
          ${classCards}
        </div>

        <button class="btn btn-outline btn-full" onclick="logout()" style="margin-top:16px">
          Đăng xuất
        </button>
      </div>
    </div>`;
}

function chooseClass(classId, className) {
  selectClass({ id: classId, class_name: className });
  navigate('/home');
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGE: HOME (B2.1)
// ═══════════════════════════════════════════════════════════════════════════

// Streak helpers — based on real submission days
function toDateKey(value) {
  const d = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dateFromKey(key) {
  const [y, m, d] = String(key).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function getSubmittedAssignments(assignments) {
  return (assignments || []).filter(a => a.submission_id && (a.submitted_at || a.created_at));
}

function calculateSubmissionStreak(assignments, vocabSessions = []) {
  const submittedDays = getSubmittedAssignments(assignments)
    .map(a => toDateKey(a.submitted_at || a.created_at));
  const vocabDays = vocabSessions.map(s => toDateKey(s.practiced_at));
  const days = Array.from(new Set([...submittedDays, ...vocabDays])).filter(Boolean).sort();

  if (days.length === 0) return { days: [], current: 0, best: 0 };

  const set = new Set(days);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const anchor = set.has(toDateKey(today))
    ? today
    : (set.has(toDateKey(yesterday)) ? yesterday : null);

  let current = 0;
  if (anchor) {
    for (let i = 0; i < days.length; i++) {
      const d = new Date(anchor);
      d.setDate(anchor.getDate() - i);
      const key = toDateKey(d);
      if (set.has(key)) current++;
      else break;
    }
  }

  let best = 0;
  let run = 0;
  let prev = null;
  for (const key of days) {
    const currentDate = dateFromKey(key);
    if (!currentDate) continue;
    if (!prev) {
      run = 1;
    } else {
      const diffDays = Math.round((currentDate - prev) / 86400000);
      run = diffDays === 1 ? run + 1 : 1;
    }
    if (run > best) best = run;
    prev = currentDate;
  }

  return { days, current, best };
}

let _homeChartRange = 30;
let _profileChartRange = 30;

function profileTargetsKey() { return `ielts_targets:${_student?.id}`; }

function normalizeTargetValue(value, fallback = 6.5) {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 && num <= 9 ? num : fallback;
}

function roundOverallTargetFromSkills(value) {
  if (!Number.isFinite(value)) return 6.5;
  const base = Math.floor(value);
  const fraction = value - base;
  if (fraction < 0.25) return base;
  if (fraction < 0.75) return base + 0.5;
  return base + 1;
}

function computeOverallTargetFromSkills(targets) {
  const skills = ['reading', 'listening', 'writing', 'speaking'];
  const values = skills.map(skill => normalizeTargetValue(targets?.[skill], 6.5));
  const average = values.reduce((sum, score) => sum + score, 0) / values.length;
  return roundOverallTargetFromSkills(average);
}

function getTargetSettings() {
  const fallback = { reading: 6.5, listening: 6.5, writing: 6.5, speaking: 6.5 };
  try {
    const raw = localStorage.getItem(profileTargetsKey()) || localStorage.getItem(`ielts_target:${_student?.id}`);
    if (!raw) return { ...fallback, overall: computeOverallTargetFromSkills(fallback) };
    if (raw.trim().startsWith('{')) {
      const parsed = JSON.parse(raw);
      const normalized = {
        reading: normalizeTargetValue(parsed.reading, fallback.reading),
        listening: normalizeTargetValue(parsed.listening, fallback.listening),
        writing: normalizeTargetValue(parsed.writing, fallback.writing),
        speaking: normalizeTargetValue(parsed.speaking, fallback.speaking),
      };
      return { ...normalized, overall: computeOverallTargetFromSkills(normalized) };
    }
    const legacy = normalizeTargetValue(parseFloat(raw), 6.5);
    const normalized = { reading: legacy, listening: legacy, writing: legacy, speaking: legacy };
    return { ...normalized, overall: computeOverallTargetFromSkills(normalized) };
  } catch {
    return { ...fallback, overall: computeOverallTargetFromSkills(fallback) };
  }
}

function setTargetSettings(next) {
  const normalized = {
    reading: normalizeTargetValue(next.reading, 6.5),
    listening: normalizeTargetValue(next.listening, 6.5),
    writing: normalizeTargetValue(next.writing, 6.5),
    speaking: normalizeTargetValue(next.speaking, 6.5),
  };
  localStorage.setItem(profileTargetsKey(), JSON.stringify(normalized));
}

function getGradedAssignments(assignments) {
  return (assignments || []).filter(a =>
    a.submission_id &&
    a.overall_score != null &&
    (a.submitted_at || a.created_at)
  );
}

function calculateOverallAverage(assignments) {
  const graded = getGradedAssignments(assignments).map(a => Number(a.overall_score)).filter(Number.isFinite);
  if (!graded.length) return null;
  return graded.reduce((sum, score) => sum + score, 0) / graded.length;
}

function getSkillGradedAssignments(assignments, skill) {
  return getGradedAssignments(assignments)
    .filter(a => a.skill === skill)
    .sort((a, b) => new Date(a.submitted_at || a.created_at) - new Date(b.submitted_at || b.created_at));
}

function aggregateDailyScores(assignments, skill, rangeDays) {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(end.getDate() - (rangeDays - 1));
  start.setHours(0, 0, 0, 0);

  const grouped = new Map();
  for (const item of getSkillGradedAssignments(assignments, skill)) {
    const dt = new Date(item.submitted_at || item.created_at);
    if (Number.isNaN(dt.getTime()) || dt < start || dt > end) continue;
    const key = toDateKey(dt);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(item);
  }

  return Array.from(grouped.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([dateKey, items]) => {
      const scores = items.map(x => Number(x.overall_score)).filter(Number.isFinite);
      const average = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
      return {
        dateKey,
        date: dateFromKey(dateKey),
        avgScore: average,
        items,
      };
    });
}

function renderChartRangeButtons(scope, current) {
  return `
    <div class="chart-range-tabs">
      ${CHART_RANGE_OPTIONS.map(days => `
        <button type="button"
          class="chart-range-btn ${current === days ? 'active' : ''}"
          onclick="setProgressRange('${scope}', ${days})">
          ${days === 365 ? '1 năm' : `${days} ngày`}
        </button>`).join('')}
    </div>`;
}

function buildProgressChartSvg(points, target, rangeDays, skill, mode = 'profile') {
  const width = mode === 'profile' ? 520 : 320;
  const height = mode === 'profile' ? 220 : 150;
  const padL = mode === 'profile' ? 42 : 30;
  const padR = 14;
  const padT = 14;
  const padB = mode === 'profile' ? 28 : 24;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const axisColor = '#dbe4ef';
  const textColor = '#94a3b8';
  const lineColor = {
    reading: '#0f766e',
    listening: '#7c3aed',
    writing: '#d97706',
    speaking: '#dc2626',
  }[skill] || '#0f766e';

  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(end.getDate() - (rangeDays - 1));
  start.setHours(0, 0, 0, 0);
  const span = Math.max(1, end.getTime() - start.getTime());

  const scaleX = date => padL + ((date.getTime() - start.getTime()) / span) * innerW;
  const scaleY = score => padT + ((9 - score) / 9) * innerH;

  const gridValues = [0, 3, 6, 9];
  const grid = gridValues.map(v => {
    const y = scaleY(v).toFixed(1);
    return `
      <line x1="${padL}" y1="${y}" x2="${width - padR}" y2="${y}" stroke="${axisColor}" stroke-width="1"/>
      <text x="${padL - 8}" y="${Number(y) + 4}" text-anchor="end" font-size="10" fill="${textColor}">${v}</text>`;
  }).join('');

  const targetLine = Number.isFinite(target) ? `
    <line x1="${padL}" y1="${scaleY(target).toFixed(1)}" x2="${width - padR}" y2="${scaleY(target).toFixed(1)}"
      stroke="${lineColor}" stroke-opacity=".38" stroke-width="1.5" stroke-dasharray="5 5"/>
  ` : '';

  const pathPoints = points.map(pt => `${scaleX(pt.date).toFixed(1)},${scaleY(pt.avgScore).toFixed(1)}`).join(' ');
  const polyline = points.length >= 2
    ? `<polyline fill="none" stroke="${lineColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${pathPoints}"/>`
    : '';

  const pointDots = points.map(pt => {
    const x = scaleX(pt.date).toFixed(1);
    const y = scaleY(pt.avgScore).toFixed(1);
    return `
      <circle cx="${x}" cy="${y}" r="5.5" fill="#fff" stroke="${lineColor}" stroke-width="3"
        onmouseenter="showProgressPointTooltip(event, '${skill}', '${pt.dateKey}')"
        onmousemove="moveProgressTooltip(event)"
        onmouseleave="hideProgressTooltip()"></circle>`;
  }).join('');

  const xStart = toDateKey(start).slice(5).replace('-', '/');
  const xEnd = toDateKey(end).slice(5).replace('-', '/');

  return `
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" class="progress-chart-svg" aria-hidden="true">
      ${grid}
      ${targetLine}
      ${polyline}
      ${pointDots}
      <text x="${padL}" y="${height - 6}" font-size="10" fill="${textColor}">${xStart}</text>
      <text x="${width - padR}" y="${height - 6}" text-anchor="end" font-size="10" fill="${textColor}">${xEnd}</text>
    </svg>`;
}

function renderTargetSummaryCompact(assignments) {
  const targets = getTargetSettings();
  const overallAvg = calculateOverallAverage(assignments);
  return `
    <div class="target-summary-card">
      <div class="target-summary-main">
        <div>
          <div class="target-summary-label">🎯 Overall target</div>
          <div class="target-summary-value">${targets.overall.toFixed(1)}</div>
          <div class="target-summary-sub">${overallAvg !== null ? `Band hiện tại: ${overallAvg.toFixed(1)}` : 'Chưa có band tổng quan'} · Tính từ 4 kỹ năng</div>
        </div>
        <a href="#/profile" class="target-summary-link">Chỉnh target</a>
      </div>
      <div class="target-chip-row">
        ${SKILL_ORDER.map(skill => `
          <span class="target-chip">
            <span>${SKILL_ICONS[skill]}</span>
            <span>${SKILL_LABELS[skill]}</span>
            <strong>${targets[skill].toFixed(1)}</strong>
          </span>`).join('')}
      </div>
    </div>`;
}

function renderSkillTargetEditor(assignments) {
  const targets = getTargetSettings();
  const overallAvg = calculateOverallAverage(assignments);
  const options = [4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9];
  const selectHtml = (key, label, icon) => `
    <label class="target-editor-item">
      <span class="target-editor-item-label">${icon} ${label}</span>
      <select class="target-editor-select" data-target-key="${key}">
        ${options.map(v => `<option value="${v}" ${targets[key] === v ? 'selected' : ''}>${v.toFixed(1)}</option>`).join('')}
      </select>
    </label>`;

  return `
    <div class="target-editor-card">
      <div class="target-editor-overview">
        <div>
          <div class="target-editor-label">🎯 Mục tiêu tổng thể</div>
          <div class="target-editor-overall">${targets.overall.toFixed(1)}</div>
          <div class="target-editor-sub">${overallAvg !== null ? `Band hiện tại ${overallAvg.toFixed(1)}` : 'Chưa có điểm tổng quan'} · Tự tính từ 4 kỹ năng</div>
        </div>
      </div>
      <div class="target-editor-grid">
        ${SKILL_ORDER.map(skill => selectHtml(skill, SKILL_LABELS[skill], SKILL_ICONS[skill] || '📝')).join('')}
      </div>
    </div>`;
}

function renderSkillChartCard(assignments, skill, rangeDays, mode = 'profile') {
  const targets = getTargetSettings();
  const skillTarget = targets[skill];
  const graded = getSkillGradedAssignments(assignments, skill);
  const allDone = getSubmittedAssignments(assignments).filter(a => a.skill === skill).length;
  const points = aggregateDailyScores(assignments, skill, rangeDays);
  const color = { reading: '#0f766e', listening: '#7c3aed', writing: '#d97706', speaking: '#dc2626' }[skill] || '#0f766e';
  const avg = graded.length
    ? graded.reduce((sum, item) => sum + Number(item.overall_score), 0) / graded.length
    : null;
  const latest = graded.length ? Number(graded[graded.length - 1].overall_score) : null;
  const delta = avg !== null ? avg - skillTarget : null;
  const deltaLabel = delta === null ? '' : delta >= 0
    ? `<span class="chart-skill-delta ok">+${delta.toFixed(1)} vs target</span>`
    : `<span class="chart-skill-delta gap">${delta.toFixed(1)} vs target</span>`;
  const chartContent = points.length
    ? buildProgressChartSvg(points, skillTarget, rangeDays, skill, mode)
    : `<div class="chart-empty-state">
        <div class="chart-empty-title">Chưa có bài ${SKILL_LABELS[skill]} nào được chấm</div>
        <div class="chart-empty-desc">Biểu đồ sẽ xuất hiện khi bạn có ít nhất 1 bài đã chấm trong khoảng thời gian đang lọc.</div>
      </div>`;

  return `
    <div class="skill-chart-card skill-chart-card-${mode}" onclick="openSkillProgressModal('${skill}')">
      <div class="skill-chart-top">
        <div>
          <div class="skill-chart-label">${SKILL_ICONS[skill] || '📝'} ${SKILL_LABELS[skill]}</div>
          <div class="skill-chart-summary">
            <span class="skill-chart-avg" style="color:${color}">${avg !== null ? avg.toFixed(1) : '—'}</span>
            ${deltaLabel}
          </div>
          <div class="skill-chart-sub">Target ${skillTarget.toFixed(1)} · ${graded.length} bài đã chấm · ${allDone} bài đã làm</div>
        </div>
        <div class="skill-chart-latest">
          <span class="skill-chart-latest-label">Gần nhất</span>
          <strong>${latest !== null ? latest.toFixed(1) : '—'}</strong>
        </div>
      </div>
      <div class="skill-chart-frame">
        ${chartContent}
      </div>
      <div class="skill-chart-footer">Trục X: thời gian · Trục Y: band · Ngày có nhiều bài sẽ lấy điểm trung bình</div>
    </div>`;
}

let _progressTooltipEl = null;
function ensureProgressTooltip() {
  if (_progressTooltipEl) return _progressTooltipEl;
  _progressTooltipEl = document.createElement('div');
  _progressTooltipEl.id = 'progress-point-tooltip';
  _progressTooltipEl.className = 'progress-point-tooltip hidden';
  document.body.appendChild(_progressTooltipEl);
  return _progressTooltipEl;
}

function showProgressPointTooltip(event, skill, dateKey) {
  const assignments = getSkillGradedAssignments(window._cachedAssignments || [], skill)
    .filter(a => toDateKey(a.submitted_at || a.created_at) === dateKey);
  if (!assignments.length) return;
  const avg = assignments.reduce((sum, item) => sum + Number(item.overall_score), 0) / assignments.length;
  const tooltip = ensureProgressTooltip();
  tooltip.innerHTML = `
    <div class="progress-tooltip-date">${dateKey}</div>
    <div class="progress-tooltip-avg">Band trung bình ngày: <strong>${avg.toFixed(1)}</strong></div>
    <div class="progress-tooltip-list">
      ${assignments.map(item => `
        <div class="progress-tooltip-item">
          <div class="progress-tooltip-item-title">${escapeHtml(item.title)}</div>
          <div class="progress-tooltip-item-meta">
            <span>${formatDateTime(item.submitted_at || item.created_at)}</span>
            <strong>${Number(item.overall_score).toFixed(1)}</strong>
          </div>
        </div>`).join('')}
    </div>`;
  tooltip.classList.remove('hidden');
  moveProgressTooltip(event);
}

function moveProgressTooltip(event) {
  const tooltip = ensureProgressTooltip();
  if (tooltip.classList.contains('hidden')) return;
  const pad = 16;
  const width = tooltip.offsetWidth || 260;
  const height = tooltip.offsetHeight || 120;
  let left = event.clientX + pad;
  let top = event.clientY + pad;
  if (left + width > window.innerWidth - 12) left = event.clientX - width - pad;
  if (top + height > window.innerHeight - 12) top = event.clientY - height - pad;
  tooltip.style.left = `${Math.max(12, left)}px`;
  tooltip.style.top = `${Math.max(12, top)}px`;
}

function hideProgressTooltip() {
  const tooltip = ensureProgressTooltip();
  tooltip.classList.add('hidden');
}

function setProgressRange(scope, days) {
  if (scope === 'home') {
    _homeChartRange = days;
    renderHome(window._cachedAssignments || []);
    return;
  }
  _profileChartRange = days;
  renderProfile(window._cachedAssignments || []);
}

function scrollProfileSection(sectionId) {
  const el = document.getElementById(sectionId);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function showHome() {
  setLoading('Đang tải trang chủ...');
  try {
    const [assignments, vocabSessions] = await Promise.all([
      api.get(`/student/assignments?student_id=${_student.id}&class_id=${_selectedClass.id}`),
      api.get('/student/vocab/sessions').catch(() => []),
    ]);
    window._cachedAssignments = assignments;
    window._cachedVocabSessions = vocabSessions;
    renderHome(assignments);
  } catch (e) {
    toast('Lỗi tải trang chủ: ' + (e.error || e.message), 'error');
  }
}

function renderHome(assignments) {
  const streak = calculateSubmissionStreak(assignments, window._cachedVocabSessions || []);
  const total = assignments.length;
  const submitted = getSubmittedAssignments(assignments).length;
  const pendingCount = assignments.filter(a => !a.submission_id && a.is_active).length;
  const overallAvg = calculateOverallAverage(assignments);

  const today = toDateKey(new Date());
  const dueToday = assignments.filter(a => {
    if (a.submission_id || !a.is_active || !a.deadline) return false;
    return toDateKey(a.deadline) === today;
  });

  // Top 5 pending sorted by deadline asc
  const upcoming = assignments
    .filter(a => !a.submission_id && a.is_active)
    .sort((a, b) => {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline) - new Date(b.deadline);
    })
    .slice(0, 5);

  // Streak day cells (last 7 days)
  const dayCells = [];
  const dset = new Set(streak.days);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const k = toDateKey(d);
    const dayLabel = d.toLocaleDateString('vi-VN', { weekday: 'short' });
    dayCells.push(`<div class="home-streak-day ${dset.has(k) ? 'on' : ''}" title="${k}">
      <div class="streak-dot">${dset.has(k) ? '🔥' : '·'}</div>
      <div class="streak-day-label">${dayLabel}</div>
    </div>`);
  }

  $('#app').innerHTML = `
    <div class="container home-page">
      <div class="home-greeting">
        <div>
          <div class="home-hi">Xin chào, ${escapeHtml(_student.full_name)} 👋</div>
          <div class="home-sub">Lớp ${escapeHtml(_selectedClass.class_name)} · ${new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        </div>
      </div>

      <div class="home-quick-actions home-quick-actions--top">
        <a href="#/assignments" class="home-quick-btn">📋 Tất cả bài tập</a>
        <a href="#/history" class="home-quick-btn">📊 Lịch sử</a>
        <a href="#/calendar" class="home-quick-btn">📅 Lịch học</a>
        <a href="#/vocab-games" class="home-quick-btn">🃏 Ôn từ vựng</a>
      </div>

      ${renderTargetSummaryCompact(assignments)}

      <div class="home-stats-row">
        <a href="#/assignments" class="home-stat-card">
          <div class="stat-icon">📋</div>
          <div class="stat-num">${total}</div>
          <div class="stat-label">Tổng bài</div>
        </a>
        <a href="#/assignments" class="home-stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-num">${submitted}</div>
          <div class="stat-label">Đã nộp</div>
        </a>
        <a href="#/assignments" class="home-stat-card">
          <div class="stat-icon">⏳</div>
          <div class="stat-num">${pendingCount}</div>
          <div class="stat-label">Cần làm</div>
        </a>
        <a href="#/history" class="home-stat-card">
          <div class="stat-icon">🎯</div>
          <div class="stat-num">${overallAvg !== null ? overallAvg.toFixed(1) : '—'}</div>
          <div class="stat-label">Band TB</div>
        </a>
      </div>

      <div class="home-streak-card">
        <div class="home-streak-head">
          <div class="streak-fire">${streak.current >= 7 ? '🔥🔥' : '🔥'}</div>
          <div>
            <div class="streak-current">Streak ${streak.current} ngày</div>
            <div class="streak-best">Kỷ lục: ${streak.best} ngày</div>
          </div>
        </div>
        <div class="home-streak-week">${dayCells.join('')}</div>
      </div>

      <div class="home-section-title">📈 Tiến độ gần đây</div>
      <div class="chart-section-toolbar chart-section-toolbar--compact">
        <div class="chart-section-copy">Biểu đồ rút gọn theo điểm trung bình từng ngày đã chấm.</div>
        ${renderChartRangeButtons('home', _homeChartRange)}
      </div>
      <div class="home-chart-grid">
        ${SKILL_ORDER.map(skill => renderSkillChartCard(assignments, skill, _homeChartRange, 'home')).join('')}
      </div>

      ${dueToday.length > 0 ? `
        <div class="home-section-title">⏰ Đến hạn hôm nay (${dueToday.length})</div>
        <div class="home-due-today">
          ${dueToday.map(a => homeAssignCard(a, true)).join('')}
        </div>` : ''}

      <div class="home-section-title">📌 Bài tập sắp tới</div>
      ${upcoming.length === 0 ? `
        <div class="empty-state-v2">
          <div class="empty-illu">🎉</div>
          <div class="empty-title">Đã làm hết bài rồi!</div>
          <div class="empty-desc">Quay lại sau khi giáo viên giao thêm.</div>
        </div>
      ` : `<div class="home-pending-list">${upcoming.map(a => homeAssignCard(a, false)).join('')}</div>`}
    </div>`;
}

function homeAssignCard(a, urgent) {
  const icon = SKILL_ICONS[a.skill] || '📝';
  const cd = formatCountdown(a.deadline);
  return `
    <a href="#/assignment/${a.id}" class="home-assign-card${urgent ? ' urgent' : ''}">
      <div class="home-assign-icon">${icon}</div>
      <div class="home-assign-body">
        <div class="home-assign-title">${escapeHtml(a.title)}</div>
        <div class="home-assign-meta">${skillBadge(a.skill)} ${cd ? `<span class="countdown-chip">${cd}</span>` : ''} <span class="home-assign-date">📅 ${formatDateTime(a.deadline)}</span></div>
      </div>
      <div class="home-assign-arrow">›</div>
    </a>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGE: HISTORY (B2.3)
// ═══════════════════════════════════════════════════════════════════════════

let _historyFilter = { skill: '', minBand: 0 };

async function showHistory() {
  setLoading('Đang tải lịch sử...');
  try {
    const assignments = await api.get(
      `/student/assignments?student_id=${_student.id}&class_id=${_selectedClass.id}`
    );
    window._cachedAssignments = assignments;
    renderHistory(assignments.filter(a => a.submission_id));
  } catch (e) {
    toast('Lỗi tải lịch sử: ' + (e.error || e.message), 'error');
  }
}

function renderHistory(items) {
  // Apply filters
  let list = items.slice();
  if (_historyFilter.skill) list = list.filter(a => a.skill === _historyFilter.skill);
  if (_historyFilter.minBand > 0) list = list.filter(a => Number(a.overall_score || 0) >= _historyFilter.minBand);

  // Sort by submitted (use created_at as proxy if no submitted_at)
  list.sort((a, b) => new Date(b.submitted_at || b.created_at) - new Date(a.submitted_at || a.created_at));

  const skillFilters = [['', 'Tất cả'], ['reading', '📖 Reading'], ['listening', '🎧 Listening'], ['writing', '✍️ Writing'], ['speaking', '🎤 Speaking']];

  $('#app').innerHTML = `
    <div class="container">
      <div class="page-header">
        <div>
          <div class="page-title">📊 Lịch sử bài làm</div>
          <div class="page-subtitle">Lớp ${escapeHtml(_selectedClass.class_name)}</div>
        </div>
      </div>

      <div class="history-filters">
        <div class="skill-filter-tabs">
          ${skillFilters.map(([s, l]) => `
            <button class="skill-filter-tab ${_historyFilter.skill === s ? 'active' : ''}"
              onclick="setHistoryFilter('skill','${s}')">${l}</button>`).join('')}
        </div>
        <div class="history-band-filter">
          <label>Band tối thiểu:</label>
          <select onchange="setHistoryFilter('minBand', Number(this.value))">
            ${[0, 5, 5.5, 6, 6.5, 7, 7.5, 8].map(b =>
              `<option value="${b}" ${_historyFilter.minBand === b ? 'selected' : ''}>${b === 0 ? 'Không lọc' : b + '+'}</option>`).join('')}
          </select>
        </div>
      </div>

      ${list.length === 0 ? `
        <div class="empty-state-v2">
          <div class="empty-illu">📭</div>
          <div class="empty-title">Chưa có bài đã nộp nào</div>
          <div class="empty-desc">Các bài bạn đã nộp sẽ hiện ở đây.</div>
        </div>` : `
        <div class="history-list">
          ${list.map(a => historyRow(a)).join('')}
        </div>`}
    </div>`;
}

function historyRow(a) {
  const score = a.overall_score;
  const hasScore = score != null;
  return `
    <a href="#/result/${a.id}" class="history-row">
      <div class="history-row-icon">${SKILL_ICONS[a.skill] || '📝'}</div>
      <div class="history-row-body">
        <div class="history-row-title">${escapeHtml(a.title)}</div>
        <div class="history-row-meta">
          ${skillBadge(a.skill)}
          <span class="history-row-date">${formatDateTime(a.submitted_at || a.created_at)}</span>
        </div>
      </div>
      <div class="history-row-score">
        ${hasScore
          ? `<div class="band-pill">${score}</div><div class="band-pill-label">Band</div>`
          : `<div class="band-pill waiting">⏳</div><div class="band-pill-label">Chờ chấm</div>`}
      </div>
    </a>`;
}

function setHistoryFilter(key, val) {
  _historyFilter[key] = val;
  renderHistory((window._cachedAssignments || []).filter(a => a.submission_id));
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGE: CALENDAR (B2.2)
// ═══════════════════════════════════════════════════════════════════════════

let _calMonth = null; // [year, month] zero-based

async function showCalendar() {
  setLoading('Đang tải lịch...');
  try {
    const assignments = await api.get(
      `/student/assignments?student_id=${_student.id}&class_id=${_selectedClass.id}`
    );
    window._cachedAssignments = assignments;
    if (!_calMonth) {
      const now = new Date();
      _calMonth = [now.getFullYear(), now.getMonth()];
    }
    renderCalendar(assignments);
  } catch (e) {
    toast('Lỗi tải lịch: ' + (e.error || e.message), 'error');
  }
}

function renderCalendar(assignments) {
  const [y, m] = _calMonth;
  const first = new Date(y, m, 1);
  const last  = new Date(y, m + 1, 0);
  const startWeekday = (first.getDay() + 6) % 7; // make Mon=0
  const daysInMonth = last.getDate();

  // Index assignments by date (deadline + submission)
  const byDate = {}; // 'YYYY-MM-DD' → { deadlines: [], submissions: [] }
  for (const a of assignments) {
    if (a.deadline) {
      const k = toDateKey(a.deadline);
      (byDate[k] ||= { deadlines: [], submissions: [] }).deadlines.push(a);
    }
    if (a.submission_id) {
      const k = toDateKey(a.submitted_at || a.created_at);
      if (k) (byDate[k] ||= { deadlines: [], submissions: [] }).submissions.push(a);
    }
  }

  const weekHeaders = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
    .map(d => `<div class="cal-weekday">${d}</div>`).join('');

  let cells = '';
  for (let i = 0; i < startWeekday; i++) cells += `<div class="cal-cell empty"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const k = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const data = byDate[k];
    const today = new Date().toISOString().slice(0, 10);
    const isToday = (k === today);
    let dotsHtml = '';
    if (data) {
      if (data.deadlines.length) dotsHtml += `<span class="cal-dot deadline" title="${data.deadlines.length} deadline"></span>`;
      if (data.submissions.length) dotsHtml += `<span class="cal-dot submitted" title="${data.submissions.length} đã nộp"></span>`;
    }
    cells += `
      <div class="cal-cell${isToday ? ' today' : ''}${data ? ' has-event' : ''}" data-day="${k}" onclick="selectCalDay('${k}')">
        <div class="cal-day-num">${d}</div>
        <div class="cal-dots">${dotsHtml}</div>
      </div>`;
  }

  const monthLabel = first.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });

  $('#app').innerHTML = `
    <div class="container">
      <div class="page-header">
        <div>
          <div class="page-title">📅 Lịch học</div>
          <div class="page-subtitle">Lớp ${escapeHtml(_selectedClass.class_name)}</div>
        </div>
      </div>
      <div class="cal-toolbar">
        <button class="btn-replay" onclick="changeCalMonth(-1)">‹ Tháng trước</button>
        <div class="cal-month-label">${monthLabel}</div>
        <button class="btn-replay" onclick="changeCalMonth(1)">Tháng sau ›</button>
      </div>
      <div class="cal-grid">
        ${weekHeaders}
        ${cells}
      </div>
      <div class="cal-legend">
        <span><span class="cal-dot deadline"></span> Deadline</span>
        <span><span class="cal-dot submitted"></span> Đã nộp</span>
      </div>
      <div id="cal-detail" class="cal-detail"></div>
    </div>`;
}

function changeCalMonth(delta) {
  let [y, m] = _calMonth;
  m += delta;
  if (m < 0) { y--; m = 11; }
  if (m > 11) { y++; m = 0; }
  _calMonth = [y, m];
  renderCalendar(window._cachedAssignments || []);
}

function selectCalDay(key) {
  const all = window._cachedAssignments || [];
  const items = all.filter(a =>
    (a.deadline || '').slice(0, 10) === key ||
    (a.submission_id && toDateKey(a.submitted_at || a.created_at) === key)
  );
  const detail = document.getElementById('cal-detail');
  if (!detail) return;
  if (!items.length) {
    detail.innerHTML = `<div class="cal-detail-empty">Không có sự kiện ngày ${key}</div>`;
    return;
  }
  detail.innerHTML = `
    <div class="cal-detail-title">Sự kiện ngày ${key}</div>
    ${items.map(a => `
      <a href="#/${a.submission_id ? 'result' : 'assignment'}/${a.id}" class="cal-event-item">
        <span>${SKILL_ICONS[a.skill] || '📝'}</span>
        <span class="cal-event-title">${escapeHtml(a.title)}</span>
        <span class="cal-event-status">${a.submission_id ? '✅ Đã nộp' : '⏳ Hạn'}</span>
      </a>`).join('')}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// C4.1 — PROFILE PAGE
// ═══════════════════════════════════════════════════════════════════════════

function profileTargetKey() { return `ielts_target:${_student?.id}`; }
function getTargetBand() { return parseFloat(localStorage.getItem(profileTargetKey())) || 6.5; }
function setTargetBand(v) { localStorage.setItem(profileTargetKey(), String(v)); }

async function showProfile() {
  setLoading('Đang tải hồ sơ...');
  try {
    const [assignments, profileData, vocabSessions] = await Promise.all([
      api.get(`/student/assignments?student_id=${_student.id}&class_id=${_selectedClass.id}`),
      api.get('/student/profile-answers').catch(() => ({ fields: [], answers: {} })),
      api.get('/student/vocab/sessions').catch(() => []),
      loadMyVocab(),
    ]);
    window._cachedAssignments = assignments;
    window._cachedProfileData = profileData;
    window._cachedVocabSessions = vocabSessions;
    renderProfile(assignments, profileData);
  } catch (e) {
    toast('Lỗi: ' + (e.error || e.message), 'error');
  }
}

function renderProfile(assignments) {
  const streak   = calculateSubmissionStreak(assignments, window._cachedVocabSessions || []);
  const target   = getTargetBand();
  const submittedAssignments = getSubmittedAssignments(assignments);
  const gradedAssignments = assignments.filter(a => a.submission_id && a.overall_score != null);
  const allScores = gradedAssignments.map(a => Number(a.overall_score)).filter(Boolean);
  const overallAvg = allScores.length
    ? (allScores.reduce((s, v) => s + v, 0) / allScores.length).toFixed(1) : '—';

  const SKILLS = ['reading', 'listening', 'writing', 'speaking'];
  const skillStats = SKILLS.map(sk => {
    const subs = gradedAssignments.filter(a => a.skill === sk)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const scores = subs.map(a => Number(a.overall_score)).filter(v => v > 0);
    const avg  = scores.length ? scores.reduce((s, v) => s + v, 0) / scores.length : null;
    const best = scores.length ? Math.max(...scores) : null;
    return { sk, count: subs.length, avg, best, timeline: scores };
  });

  const subDates = new Set(
    submittedAssignments.map(a => toDateKey(a.submitted_at || a.created_at)).filter(Boolean)
  );
  const streakDaySet = new Set(streak.days);
  const streakDayCells = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const k = toDateKey(d);
    const dayLabel = d.toLocaleDateString('vi-VN', { weekday: 'short' });
    streakDayCells.push(`<div class="home-streak-day ${streakDaySet.has(k) ? 'on' : ''}" title="${k}">
      <div class="streak-dot">${streakDaySet.has(k) ? '🔥' : '·'}</div>
      <div class="streak-day-label">${dayLabel}</div>
    </div>`);
  }

  const myVocabCount = (_myVocabCache || []).length;
  const bandOptions = [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9]
    .map(b => `<option value="${b}" ${target === b ? 'selected' : ''}>${b}</option>`).join('');
  const initials = (_student.full_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const streakColor = streak.current >= 30 ? '#dc2626' : streak.current >= 7 ? '#f59e0b' : '#6b7280';

  const SKILL_COLOR = { reading: '#0f766e', listening: '#7c3aed', writing: '#d97706', speaking: '#dc2626' };
  const SKILL_ICON  = { reading: '📖', listening: '🎧', writing: '✍️', speaking: '🎤' };
  const SKILL_NAME  = { reading: 'Reading', listening: 'Listening', writing: 'Writing', speaking: 'Speaking' };
  const submittedBySkill = skill => submittedAssignments
    .filter(a => a.skill === skill)
    .sort((a, b) => new Date(b.submitted_at || b.created_at) - new Date(a.submitted_at || a.created_at));

  function sparkSvg(scores, color) {
    if (scores.length < 2) return '';
    const W = 100, H = 28;
    const pts = scores.map((s, i) => {
      const x = (i / (scores.length - 1)) * W;
      const y = H - (s / 9) * H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    const lx = W, ly = H - (scores[scores.length - 1] / 9) * H;
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="width:100%;height:28px;display:block">
      <polyline fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${pts}"/>
      <circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="3" fill="${color}"/>
    </svg>`;
  }

  function skillCard({ sk, count, avg, best, timeline }) {
    const color = SKILL_COLOR[sk];
    const pct   = avg !== null ? Math.min(100, Math.round((avg / target) * 100)) : 0;
    const status = avg === null ? '' : avg >= target ? '✅' : avg >= target - 0.5 ? '🟡' : '🔴';
    const spark  = sparkSvg(timeline, color);
    const vsTarget = avg !== null ? (avg >= target
      ? `<span class="spc-vs ok">+${(avg - target).toFixed(1)} vs target</span>`
      : `<span class="spc-vs gap">-${(target - avg).toFixed(1)} vs target</span>`) : '';
    const totalDone = submittedBySkill(sk).length;
    return `
      <button class="skill-progress-card spc-${sk}" type="button"
        onclick="openSkillProgressModal('${sk}')">
        <div class="spc-head">
          <span class="spc-icon">${SKILL_ICON[sk]}</span>
          <span class="spc-name">${SKILL_NAME[sk]}</span>
          <span>${status}</span>
        </div>
        <div class="spc-band-row">
          <span class="spc-band" style="color:${color}">${avg !== null ? avg.toFixed(1) : '—'}</span>
          ${vsTarget}
        </div>
        <div class="spc-bar-wrap">
          <div class="spc-bar" style="width:${pct}%;background:${color}"></div>
        </div>
        <div class="spc-bar-label">${avg !== null ? avg.toFixed(1) : '—'} / ${target} target</div>
        ${spark ? `<div class="spc-spark">${spark}</div>` : '<div class="spc-spark spc-spark-empty">Chưa có dữ liệu</div>'}
        <div class="spc-meta">${count === 0 ? 'Chưa có bài nào được chấm' : `${count} bài đã chấm · Best: ${best}`}</div>
        <div class="spc-footnote">${totalDone > 0 ? `${totalDone} bài đã làm · Nhấn để xem chi tiết` : 'Chưa có bài đã làm'}</div>
      </button>`;
  }

  // Activity grid — 28 days (4 weeks × 7 cols)
  const DAYS = 28;
  const firstDay = new Date(); firstDay.setDate(firstDay.getDate() - (DAYS - 1));
  const pad = (firstDay.getDay() + 6) % 7; // 0=Mon
  const gridCells = Array(pad).fill('<div class="act-cell act-pad"></div>');
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const k = d.toISOString().slice(0, 10);
    gridCells.push(`<div class="act-cell ${subDates.has(k) ? 'act-done' : 'act-none'}" title="${k}"></div>`);
  }

  // Milestones
  const ms = [];
  skillStats.forEach(({ sk, best }) => {
    if (best !== null) ms.push(`<div class="ms-card"><div class="ms-icon">${SKILL_ICON[sk]}</div><div class="ms-val">${best}</div><div class="ms-label">Best ${SKILL_NAME[sk]}</div></div>`);
  });
  if (submittedAssignments.length > 0) ms.push(`<div class="ms-card"><div class="ms-icon">📝</div><div class="ms-val">${submittedAssignments.length}</div><div class="ms-label">Bài đã nộp</div></div>`);
  if (streak.best > 1) ms.push(`<div class="ms-card"><div class="ms-icon">🔥</div><div class="ms-val">${streak.best}</div><div class="ms-label">Streak kỷ lục</div></div>`);
  if (myVocabCount > 0) ms.push(`<div class="ms-card"><div class="ms-icon">📖</div><div class="ms-val">${myVocabCount}</div><div class="ms-label">Từ đã lưu</div></div>`);

  $('#app').innerHTML = `
    <div class="container profile-page">

      <!-- Hero -->
      <div class="profile-hero">
        <div class="profile-avatar" style="background:${SKILL_COLOR.reading}">${initials}</div>
        <div class="profile-hero-info">
          <div class="profile-name">${escapeHtml(_student.full_name)}</div>
          <div class="profile-meta">Lớp ${escapeHtml(_selectedClass.class_name)}</div>
          <div class="profile-meta-row">
            <span class="profile-streak" style="color:${streakColor}">🔥 ${streak.current} ngày</span>
            <span class="profile-dot">·</span>
            <span>Band TB: <strong>${overallAvg}</strong></span>
            <span class="profile-dot">·</span>
            <span>${submittedAssignments.length} bài đã nộp</span>
          </div>
        </div>
        <div class="profile-target-box">
          <div class="profile-target-label">🎯 Target band</div>
          <select id="target-band-select" class="profile-target-select">
            ${bandOptions}
          </select>
        </div>
      </div>

      <div class="profile-section-title">🔥 Streak học tập</div>
      <div class="home-streak-card">
        <div class="home-streak-head">
          <div class="streak-fire">${streak.current >= 7 ? '🔥🔥' : '🔥'}</div>
          <div>
            <div class="streak-current">Streak ${streak.current} ngày</div>
            <div class="streak-best">Kỷ lục: ${streak.best} ngày · Tính theo ngày có submit bài</div>
          </div>
        </div>
        <div class="home-streak-week">${streakDayCells.join('')}</div>
      </div>

      <!-- Skill cards -->
      <div class="profile-section-title">📈 Tiến độ kỹ năng</div>
      <div class="skill-cards-grid">
        ${skillStats.map(s => skillCard(s)).join('')}
      </div>

      <!-- Activity grid -->
      <div class="profile-section-title">🗓 Hoạt động 28 ngày qua</div>
      <div class="activity-wrap">
        <div class="activity-day-labels">${['T2','T3','T4','T5','T6','T7','CN'].map(d => `<span>${d}</span>`).join('')}</div>
        <div class="activity-grid">${gridCells.join('')}</div>
        <div class="activity-legend">
          <span class="act-sample act-none"></span><span>Không học</span>
          <span class="act-sample act-done" style="margin-left:12px"></span><span>Có nộp bài</span>
        </div>
      </div>

      <!-- Milestones -->
      ${ms.length > 0 ? `
        <div class="profile-section-title">🏆 Thành tích cá nhân</div>
        <div class="milestones-row">${ms.join('')}</div>
      ` : ''}

      <!-- Quick actions -->
      <div class="profile-section-title">🚀 Tiếp tục học</div>
      <div class="profile-quick-row">
        <a href="#/my-vocab" class="profile-quick-btn pqb-vocab">📖 Từ vựng của tôi <span class="pqb-badge">${myVocabCount}</span></a>
        <a href="#/vocab-games" class="profile-quick-btn">🃏 Luyện từ</a>
        <a href="#/history" class="profile-quick-btn">📊 Lịch sử</a>
        <a href="#/assignments" class="profile-quick-btn">📋 Bài tập</a>
      </div>
    </div>`;

  document.getElementById('target-band-select')?.addEventListener('change', function () {
    setTargetBand(Number(this.value));
    renderProfile(assignments);
  });
}

renderHome = function(assignments) {
  const streak = calculateSubmissionStreak(assignments, window._cachedVocabSessions || []);
  const total = assignments.length;
  const submitted = getSubmittedAssignments(assignments).length;
  const pendingCount = assignments.filter(a => !a.submission_id && a.is_active).length;
  const overallAvg = calculateOverallAverage(assignments);

  const today = toDateKey(new Date());
  const dueToday = assignments.filter(a => {
    if (a.submission_id || !a.is_active || !a.deadline) return false;
    return toDateKey(a.deadline) === today;
  });

  const upcoming = assignments
    .filter(a => !a.submission_id && a.is_active)
    .sort((a, b) => {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline) - new Date(b.deadline);
    })
    .slice(0, 5);

  const dayCells = [];
  const dset = new Set(streak.days);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const k = toDateKey(d);
    const dayLabel = d.toLocaleDateString('vi-VN', { weekday: 'short' });
    dayCells.push(`<div class="home-streak-day ${dset.has(k) ? 'on' : ''}" title="${k}">
      <div class="streak-dot">${dset.has(k) ? '🔥' : '·'}</div>
      <div class="streak-day-label">${dayLabel}</div>
    </div>`);
  }

  $('#app').innerHTML = `
    <div class="container home-page">
      <div class="home-greeting">
        <div>
          <div class="home-hi">Xin chào, ${escapeHtml(_student.full_name)} 👋</div>
          <div class="home-sub">Lớp ${escapeHtml(_selectedClass.class_name)} · ${new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        </div>
      </div>

      <div class="home-quick-actions home-quick-actions--top">
        <a href="#/assignments" class="home-quick-btn">📋 Tất cả bài tập</a>
        <a href="#/history" class="home-quick-btn">📊 Lịch sử</a>
        <a href="#/calendar" class="home-quick-btn">📅 Lịch học</a>
        <a href="#/vocab-games" class="home-quick-btn">🃏 Ôn từ vựng</a>
      </div>

      ${renderTargetSummaryCompact(assignments)}

      <div class="home-stats-row">
        <a href="#/assignments" class="home-stat-card">
          <div class="stat-icon">📋</div>
          <div class="stat-num">${total}</div>
          <div class="stat-label">Tổng bài</div>
        </a>
        <a href="#/assignments" class="home-stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-num">${submitted}</div>
          <div class="stat-label">Đã nộp</div>
        </a>
        <a href="#/assignments" class="home-stat-card">
          <div class="stat-icon">⏳</div>
          <div class="stat-num">${pendingCount}</div>
          <div class="stat-label">Cần làm</div>
        </a>
        <a href="#/history" class="home-stat-card">
          <div class="stat-icon">🎯</div>
          <div class="stat-num">${overallAvg !== null ? overallAvg.toFixed(1) : '—'}</div>
          <div class="stat-label">Band TB</div>
        </a>
      </div>

      <div class="home-streak-card">
        <div class="home-streak-head">
          <div class="streak-fire">${streak.current >= 7 ? '🔥🔥' : '🔥'}</div>
          <div>
            <div class="streak-current">Streak ${streak.current} ngày</div>
            <div class="streak-best">Kỷ lục: ${streak.best} ngày</div>
          </div>
        </div>
        <div class="home-streak-week">${dayCells.join('')}</div>
      </div>

      <div class="home-section-title">📈 Tiến độ gần đây</div>
      <div class="chart-section-toolbar chart-section-toolbar--compact">
        <div class="chart-section-copy">Biểu đồ rút gọn theo điểm trung bình từng ngày đã chấm.</div>
        ${renderChartRangeButtons('home', _homeChartRange)}
      </div>
      <div class="home-chart-grid">
        ${SKILL_ORDER.map(skill => renderSkillChartCard(assignments, skill, _homeChartRange, 'home')).join('')}
      </div>

      ${dueToday.length > 0 ? `
        <div class="home-section-title">⏰ Đến hạn hôm nay (${dueToday.length})</div>
        <div class="home-due-today">
          ${dueToday.map(a => homeAssignCard(a, true)).join('')}
        </div>` : ''}

      <div class="home-section-title">📌 Bài tập sắp tới</div>
      ${upcoming.length === 0 ? `
        <div class="empty-state-v2">
          <div class="empty-illu">🎉</div>
          <div class="empty-title">Đã làm hết bài rồi!</div>
          <div class="empty-desc">Quay lại sau khi giáo viên giao thêm.</div>
        </div>
      ` : `<div class="home-pending-list">${upcoming.map(a => homeAssignCard(a, false)).join('')}</div>`}
    </div>`;
};

renderHistory = function(items) {
  let list = items.slice();
  if (_historyFilter.skill) list = list.filter(a => a.skill === _historyFilter.skill);
  if (_historyFilter.minBand > 0) list = list.filter(a => Number(a.overall_score || 0) >= _historyFilter.minBand);
  list.sort((a, b) => new Date(b.submitted_at || b.created_at) - new Date(a.submitted_at || a.created_at));

  const skillFilters = [['', 'Tất cả'], ['reading', '📖 Reading'], ['listening', '🎧 Listening'], ['writing', '✍️ Writing'], ['speaking', '🎤 Speaking']];
  $('#app').innerHTML = `
    <div class="container">
      <div class="page-header">
        <div>
          <div class="page-title">📊 Lịch sử bài làm</div>
          <div class="page-subtitle">Lớp ${escapeHtml(_selectedClass.class_name)}</div>
        </div>
      </div>

      <div class="history-filters">
        <div class="skill-filter-tabs">
          ${skillFilters.map(([s, l]) => `
            <button class="skill-filter-tab ${_historyFilter.skill === s ? 'active' : ''}"
              onclick="setHistoryFilter('skill','${s}')">${l}</button>`).join('')}
        </div>
        <div class="history-band-filter">
          <label>Band tối thiểu:</label>
          <select onchange="setHistoryFilter('minBand', Number(this.value))">
            ${[0, 5, 5.5, 6, 6.5, 7, 7.5, 8].map(b =>
              `<option value="${b}" ${_historyFilter.minBand === b ? 'selected' : ''}>${b === 0 ? 'Không lọc' : b + '+'}</option>`).join('')}
          </select>
        </div>
      </div>

      ${list.length === 0 ? `
        <div class="empty-state-v2">
          <div class="empty-illu">📭</div>
          <div class="empty-title">Chưa có bài đã nộp nào</div>
          <div class="empty-desc">Các bài bạn đã nộp sẽ hiện ở đây.</div>
        </div>` : `
        <div class="history-list">
          ${list.map(a => historyRow(a)).join('')}
        </div>`}
    </div>`;
};

historyRow = function(a) {
  const score = a.overall_score;
  const hasScore = score != null;
  return `
    <a href="#/result/${a.id}" class="history-row">
      <div class="history-row-icon">${SKILL_ICONS[a.skill] || '📝'}</div>
      <div class="history-row-body">
        <div class="history-row-title">${escapeHtml(a.title)}</div>
        <div class="history-row-meta">
          ${skillBadge(a.skill)}
          <span class="history-row-date">${formatDateTime(a.submitted_at || a.created_at)}</span>
        </div>
      </div>
      <div class="history-row-score">
        ${hasScore
          ? `<div class="band-pill">${score}</div><div class="band-pill-label">Band</div>`
          : `<div class="band-pill waiting">⏳</div><div class="band-pill-label">Chờ chấm</div>`}
      </div>
    </a>`;
};

renderCalendar = function(assignments) {
  const [y, m] = _calMonth;
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  const startWeekday = (first.getDay() + 6) % 7;
  const daysInMonth = last.getDate();

  const byDate = {};
  for (const a of assignments) {
    if (a.deadline) {
      const k = toDateKey(a.deadline);
      (byDate[k] ||= { deadlines: [], submissions: [] }).deadlines.push(a);
    }
    if (a.submission_id) {
      const k = toDateKey(a.submitted_at || a.created_at);
      if (k) (byDate[k] ||= { deadlines: [], submissions: [] }).submissions.push(a);
    }
  }

  const weekHeaders = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
    .map(d => `<div class="cal-weekday">${d}</div>`).join('');

  let cells = '';
  for (let i = 0; i < startWeekday; i++) cells += `<div class="cal-cell empty"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const k = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const data = byDate[k];
    const isToday = (k === toDateKey(new Date()));
    let dotsHtml = '';
    if (data) {
      if (data.deadlines.length) dotsHtml += `<span class="cal-dot deadline" title="${data.deadlines.length} deadline"></span>`;
      if (data.submissions.length) dotsHtml += `<span class="cal-dot submitted" title="${data.submissions.length} đã nộp"></span>`;
    }
    cells += `
      <div class="cal-cell${isToday ? ' today' : ''}${data ? ' has-event' : ''}" data-day="${k}" onclick="selectCalDay('${k}')">
        <div class="cal-day-num">${d}</div>
        <div class="cal-dots">${dotsHtml}</div>
      </div>`;
  }

  const monthLabel = first.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
  $('#app').innerHTML = `
    <div class="container">
      <div class="page-header">
        <div>
          <div class="page-title">📅 Lịch học</div>
          <div class="page-subtitle">Lớp ${escapeHtml(_selectedClass.class_name)}</div>
        </div>
      </div>
      <div class="cal-toolbar">
        <button class="btn-replay" onclick="changeCalMonth(-1)">‹ Tháng trước</button>
        <div class="cal-month-label">${monthLabel}</div>
        <button class="btn-replay" onclick="changeCalMonth(1)">Tháng sau ›</button>
      </div>
      <div class="cal-grid">
        ${weekHeaders}
        ${cells}
      </div>
      <div class="cal-legend">
        <span><span class="cal-dot deadline"></span> Deadline</span>
        <span><span class="cal-dot submitted"></span> Đã nộp</span>
      </div>
      <div id="cal-detail" class="cal-detail"></div>
    </div>`;
};

selectCalDay = function(key) {
  const all = window._cachedAssignments || [];
  const items = all.filter(a =>
    (a.deadline || '').slice(0, 10) === key ||
    (a.submission_id && toDateKey(a.submitted_at || a.created_at) === key)
  );
  const detail = document.getElementById('cal-detail');
  if (!detail) return;
  if (!items.length) {
    detail.innerHTML = `<div class="cal-detail-empty">Không có sự kiện ngày ${key}</div>`;
    return;
  }
  detail.innerHTML = `
    <div class="cal-detail-title">Sự kiện ngày ${key}</div>
    ${items.map(a => `
      <a href="#/${a.submission_id ? 'result' : 'assignment'}/${a.id}" class="cal-event-item">
        <span>${SKILL_ICONS[a.skill] || '📝'}</span>
        <span class="cal-event-title">${escapeHtml(a.title)}</span>
        <span class="cal-event-status">${a.submission_id ? '✅ Đã nộp' : '⏳ Hạn'}</span>
      </a>`).join('')}`;
};

renderProfile = function(assignments, profileData) {
  profileData = profileData || window._cachedProfileData || { fields: [], answers: {} };
  const notificationEmailField = (profileData.fields || []).find(f => f.field_key === 'notification_email');
  const displayEmail = (_student && typeof _student.email === 'string' && _student.email.trim())
    || (profileData.student && typeof profileData.student.email === 'string' && profileData.student.email.trim())
    || (notificationEmailField ? String(profileData.answers?.[notificationEmailField.id] || '').trim() : '');
  const streak = calculateSubmissionStreak(assignments, window._cachedVocabSessions || []);
  const targets = getTargetSettings();
  const submittedAssignments = getSubmittedAssignments(assignments);
  const overallAvgValue = calculateOverallAverage(assignments);
  const overallAvg = overallAvgValue !== null ? overallAvgValue.toFixed(1) : '—';
  const skillStats = SKILL_ORDER.map(sk => {
    const scores = getSkillGradedAssignments(assignments, sk).map(a => Number(a.overall_score)).filter(Number.isFinite);
    return { sk, best: scores.length ? Math.max(...scores) : null };
  });

  const subDates = new Set(submittedAssignments.map(a => toDateKey(a.submitted_at || a.created_at)).filter(Boolean));
  const streakDaySet = new Set(streak.days);
  const streakDayCells = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const k = toDateKey(d);
    const dayLabel = d.toLocaleDateString('vi-VN', { weekday: 'short' });
    streakDayCells.push(`<div class="home-streak-day ${streakDaySet.has(k) ? 'on' : ''}" title="${k}">
      <div class="streak-dot">${streakDaySet.has(k) ? '🔥' : '·'}</div>
      <div class="streak-day-label">${dayLabel}</div>
    </div>`);
  }

  const myVocabCount = (_myVocabCache || []).length;
  const initials = (_student.full_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const streakColor = streak.current >= 30 ? '#dc2626' : streak.current >= 7 ? '#f59e0b' : '#6b7280';
  const skillColors = { reading: '#0f766e', listening: '#7c3aed', writing: '#d97706', speaking: '#dc2626' };

  const ms = [];
  skillStats.forEach(({ sk, best }) => {
    if (best !== null) ms.push(`<div class="ms-card"><div class="ms-icon">${SKILL_ICONS[sk]}</div><div class="ms-val">${best}</div><div class="ms-label">Best ${SKILL_LABELS[sk]}</div></div>`);
  });
  if (submittedAssignments.length > 0) ms.push(`<div class="ms-card"><div class="ms-icon">📝</div><div class="ms-val">${submittedAssignments.length}</div><div class="ms-label">Bài đã nộp</div></div>`);
  if (streak.best > 1) ms.push(`<div class="ms-card"><div class="ms-icon">🔥</div><div class="ms-val">${streak.best}</div><div class="ms-label">Streak kỷ lục</div></div>`);
  if (myVocabCount > 0) ms.push(`<div class="ms-card"><div class="ms-icon">📖</div><div class="ms-val">${myVocabCount}</div><div class="ms-label">Từ đã lưu</div></div>`);
  const navItems = [
    ['profile-info', '📋 Thông tin'],
    ['profile-streak', '🔥 Streak'],
    ['profile-targets', '🎯 Target'],
    ['profile-progress', '📈 Tiến độ'],
    ...(ms.length > 0 ? [['profile-achievements', '🏆 Thành tích']] : []),
    ['profile-next-steps', '🚀 Tiếp tục học'],
  ];

  $('#app').innerHTML = `
    <div class="container profile-page">
      <div class="profile-hero">
        <div class="profile-avatar" style="background:${skillColors.reading}">${initials}</div>
        <div class="profile-hero-info">
          <div class="profile-name">${escapeHtml(_student.full_name)}</div>
          <div class="profile-meta">Lớp ${escapeHtml(_selectedClass.class_name)}</div>
          <div class="profile-meta-row">
            <span class="profile-streak" style="color:${streakColor}">🔥 ${streak.current} ngày</span>
            <span class="profile-dot">·</span>
            <span>Band TB: <strong>${overallAvg}</strong></span>
            <span class="profile-dot">·</span>
            <span>${submittedAssignments.length} bài đã nộp</span>
          </div>
        </div>
        <div class="profile-target-box profile-target-box--summary">
          <div class="profile-target-label">🎯 Overall target</div>
          <div class="profile-target-pill">${targets.overall.toFixed(1)}</div>
        </div>
      </div>

      <div class="profile-nav">
        <div class="profile-nav-list">
          ${navItems.map(([id, label]) => `
            <button type="button" class="profile-nav-btn" onclick="scrollProfileSection('${id}')">${label}</button>
          `).join('')}
        </div>
      </div>

      <section id="profile-info" class="profile-anchor-section">
      <div class="profile-section-title">📋 Thông tin cá nhân</div>
      <div class="pi-card${profileData.fields.length === 0 ? ' pi-card--compact' : ''}">
        <div class="pi-account-box">
          <div>
            <div class="pi-label">Username đăng nhập</div>
            <div class="pi-account-username">${escapeHtml(_student.username || '—')}</div>
            <div class="pi-account-email-row">
              <span class="pi-account-email-label">Gmail</span>
              <span class="pi-account-email">${displayEmail ? escapeHtml(displayEmail) : 'Chưa cập nhật'}</span>
            </div>
          </div>
          <button type="button" class="btn btn-outline pi-account-btn" onclick="openChangePasswordModal()">🔐 Đổi mật khẩu</button>
        </div>
        ${profileData.fields.length === 0
          ? ''
          : `<details class="pi-details">
              <summary class="pi-details-summary">
                <span>
                  <span class="pi-details-title">Thông tin chi tiết</span>
                  <span class="pi-details-sub">${profileData.fields.length} mục hồ sơ</span>
                </span>
                <span class="pi-details-arrow">⌄</span>
              </summary>
              <div class="pi-details-body">
                <div class="pi-fields" id="pi-fields">
                  ${profileData.fields.map(f => {
                    const val = profileData.answers[f.id] || '';
                    const inputId = `pi-field-${f.id}`;
                    let inputEl;
                    if (f.field_type === 'textarea') {
                      inputEl = `<textarea id="${inputId}" class="form-input pi-input" data-field-id="${f.id}" rows="3" placeholder="Chưa có dữ liệu">${escapeHtml(val)}</textarea>`;
                    } else if (f.field_type === 'select' && Array.isArray(f.options)) {
                      const opts = f.options.map(o => `<option value="${escapeHtml(String(o))}" ${val === String(o) ? 'selected' : ''}>${escapeHtml(String(o))}</option>`).join('');
                      inputEl = `<select id="${inputId}" class="form-input pi-input" data-field-id="${f.id}"><option value="">-- Chưa chọn --</option>${opts}</select>`;
                    } else if (f.field_type === 'date') {
                      inputEl = `<input id="${inputId}" class="form-input pi-input" type="date" data-field-id="${f.id}" value="${escapeHtml(val)}" />`;
                    } else {
                      const inputType = f.field_key === 'notification_email' ? 'email' : 'text';
                      const placeholder = f.field_key === 'notification_email' ? 'name@example.com' : 'Chưa có dữ liệu';
                      inputEl = `<input id="${inputId}" class="form-input pi-input" type="${inputType}" data-field-id="${f.id}" value="${escapeHtml(val)}" placeholder="${placeholder}" />`;
                    }
                    return `<div class="pi-field">
                      <label class="pi-label" for="${inputId}">${escapeHtml(f.label)}</label>
                      ${inputEl}
                    </div>`;
                  }).join('')}
                </div>
                <div class="pi-actions">
                  <button class="btn btn-primary" id="pi-save-btn" onclick="saveProfileAnswers(this)">Lưu thông tin</button>
                </div>
              </div>
            </details>`
        }
      </div>
      </section>

      <section id="profile-streak" class="profile-anchor-section">
      <div class="profile-section-title">🔥 Streak học tập</div>
      <div class="home-streak-card">
        <div class="home-streak-head">
          <div class="streak-fire">${streak.current >= 7 ? '🔥🔥' : '🔥'}</div>
          <div>
            <div class="streak-current">Streak ${streak.current} ngày</div>
            <div class="streak-best">Kỷ lục: ${streak.best} ngày · Tính theo ngày có submit bài</div>
          </div>
        </div>
        <div class="home-streak-week">${streakDayCells.join('')}</div>
      </div>
      </section>

      <section id="profile-targets" class="profile-anchor-section">
      <div class="profile-section-title">🎯 Target band</div>
      ${renderSkillTargetEditor(assignments)}
      </section>

      <section id="profile-progress" class="profile-anchor-section">
      <div class="profile-section-title">📈 Tiến độ kỹ năng</div>
      <div class="chart-section-toolbar">
        <div class="chart-section-copy">Biểu đồ chi tiết theo ngày, lấy điểm trung bình của các bài đã chấm trong ngày.</div>
        ${renderChartRangeButtons('profile', _profileChartRange)}
      </div>
      <div class="profile-chart-grid">
        ${SKILL_ORDER.map(skill => renderSkillChartCard(assignments, skill, _profileChartRange, 'profile')).join('')}
      </div>
      </section>

      ${ms.length > 0 ? `
        <section id="profile-achievements" class="profile-anchor-section">
        <div class="profile-section-title">🏆 Thành tích cá nhân</div>
        <div class="milestones-row">${ms.join('')}</div>
        </section>
      ` : ''}

      <section id="profile-next-steps" class="profile-anchor-section">
      <div class="profile-section-title">🚀 Tiếp tục học</div>
      <div class="profile-quick-row">
        <a href="#/my-vocab" class="profile-quick-btn pqb-vocab">📖 Từ vựng của tôi <span class="pqb-badge">${myVocabCount}</span></a>
        <a href="#/vocab-games" class="profile-quick-btn">🃏 Luyện từ</a>
        <a href="#/history" class="profile-quick-btn">📊 Lịch sử</a>
        <a href="#/assignments" class="profile-quick-btn">📋 Bài tập</a>
      </div>
      </section>
    </div>`;

  document.querySelectorAll('.target-editor-select').forEach(select => {
    select.addEventListener('change', function () {
      const next = { ...getTargetSettings(), [this.dataset.targetKey]: Number(this.value) };
      setTargetSettings(next);
      renderProfile(assignments, window._cachedProfileData);
    });
  });
};

async function saveProfileAnswers(btn) {
  const inputs = document.querySelectorAll('.pi-input');
  const answers = {};
  inputs.forEach(el => {
    if (el.dataset.fieldId) answers[el.dataset.fieldId] = el.value;
  });
  if (btn) { btn.disabled = true; btn.textContent = 'Đang lưu...'; }
  try {
    await api.patch('/student/profile-answers', { answers });
    // Update cache
    if (window._cachedProfileData) window._cachedProfileData.answers = { ...window._cachedProfileData.answers, ...answers };
    toast('Đã lưu thông tin cá nhân!');
  } catch (e) {
    toast('Lỗi: ' + (e.error || e.message), 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Lưu thông tin'; }
  }
}
window.saveProfileAnswers = saveProfileAnswers;

function openSkillProgressModal(skill) {
  const all = window._cachedAssignments || [];
  const list = getSubmittedAssignments(all)
    .filter(a => a.skill === skill)
    .sort((a, b) => new Date(b.submitted_at || b.created_at) - new Date(a.submitted_at || a.created_at));

  const title = `${SKILL_ICONS[skill] || '📝'} ${SKILL_LABELS[skill] || skill} — Bài đã làm`;
  const body = list.length === 0
    ? `
      <div class="skill-modal-empty">
        <div class="skill-modal-empty-icon">${SKILL_ICONS[skill] || '📝'}</div>
        <div class="skill-modal-empty-title">Chưa có bài nào đã làm</div>
        <div class="skill-modal-empty-desc">Khi bạn nộp bài ${SKILL_LABELS[skill] || skill}, danh sách kết quả sẽ hiện ở đây.</div>
      </div>`
    : `
      <div class="skill-modal-list">
        ${list.map(a => {
          const hasScore = a.overall_score != null;
          const doneAt = formatDateTime(a.submitted_at || a.created_at);
          return `
            <a href="#/result/${a.id}" class="skill-modal-row" onclick="closeModal()">
              <div class="skill-modal-row-icon">${SKILL_ICONS[a.skill] || '📝'}</div>
              <div class="skill-modal-row-body">
                <div class="skill-modal-row-title">${escapeHtml(a.title)}</div>
                <div class="skill-modal-row-meta">
                  ${skillBadge(a.skill)}
                  <span class="skill-modal-row-date">🕒 ${doneAt}</span>
                </div>
              </div>
              <div class="skill-modal-row-score">
                ${hasScore
                  ? `<div class="band-pill">${a.overall_score}</div><div class="band-pill-label">Band</div>`
                  : `<div class="band-pill waiting">⏳</div><div class="band-pill-label">Chờ chấm</div>`}
              </div>
            </a>`;
        }).join('')}
      </div>`;

  openModal(title, body);
}

// ═══════════════════════════════════════════════════════════════════════════
// C4.5 — MY VOCAB + FLASHCARD  (DB-backed)
// ═══════════════════════════════════════════════════════════════════════════

// In-memory cache so UI stays fast after first load
let _myVocabCache = null; // null = not yet loaded

async function loadMyVocab() {
  if (_myVocabCache !== null) return _myVocabCache;
  try {
    const rows = await api.get('/student/vocab');
    _myVocabCache = rows.map(r => ({
      word: r.word, definition: r.definition, example: r.example,
      source: r.source, savedAt: r.saved_at,
    }));
  } catch { _myVocabCache = []; }
  return _myVocabCache;
}

function _invalidateVocabCache() { _myVocabCache = null; }

function isWordSaved(word) {
  // Use cache synchronously when available; safe because vocab page always loads first
  if (!_myVocabCache) return false;
  return _myVocabCache.some(v => v.word === word);
}
window.isWordSaved = isWordSaved;

async function toggleSaveWordBtn(btn) {
  const { word, def, ex, src } = btn.dataset;
  // Optimistic UI
  const alreadySaved = isWordSaved(word);
  btn.disabled = true;
  try {
    if (alreadySaved) {
      await api.delete(`/student/vocab/${encodeURIComponent(word)}`);
      _invalidateVocabCache();
      btn.textContent = '💾 Lưu';
      btn.classList.remove('saved');
      toast(`Đã xoá "${word}"`, 'info');
    } else {
      await api.post('/student/vocab', { word, definition: def, example: ex || '', source: src || '' });
      _invalidateVocabCache();
      btn.textContent = '✓ Đã lưu';
      btn.classList.add('saved');
      toast(`✅ Đã lưu "${word}"`, 'success');
    }
  } catch (e) {
    toast('Lỗi lưu từ: ' + (e.error || e.message), 'error');
  } finally {
    btn.disabled = false;
  }
}
window.toggleSaveWordBtn = toggleSaveWordBtn;

let _myVocabSearch = '';

async function showMyVocab() {
  _myVocabSearch = '';
  setLoading('Đang tải từ vựng...');
  await loadMyVocab();
  renderMyVocabList();
}

function renderMyVocabList() {
  const all  = _myVocabCache || [];
  const q    = _myVocabSearch.toLowerCase();
  const list = q ? all.filter(v =>
    v.word.toLowerCase().includes(q) || v.definition.toLowerCase().includes(q)
  ) : all;

  const cards = list.length === 0
    ? `<div class="empty-state-v2">
        <div class="empty-illu">📖</div>
        <div class="empty-title">${q ? 'Không tìm thấy từ nào' : 'Chưa lưu từ nào'}</div>
        <div class="empty-desc">${q ? 'Thử từ khoá khác.' : 'Bấm 💾 Lưu trong trang kết quả bài để thêm từ vào đây.'}</div>
      </div>`
    : `<div class="my-vocab-grid">${list.map(v => `
        <div class="mvc">
          <div class="mvc-word">${escapeHtml(v.word)}</div>
          <div class="mvc-def">${escapeHtml(v.definition)}</div>
          ${v.example ? `<div class="mvc-ex">"${escapeHtml(v.example)}"</div>` : ''}
          ${v.source ? `<div class="mvc-src">📋 ${escapeHtml(v.source)}</div>` : ''}
          <button class="mvc-del" data-word="${escapeHtml(v.word)}" onclick="removeMyVocabWord(this)">🗑</button>
        </div>`).join('')}
      </div>`;

  $('#app').innerHTML = `
    <div class="container my-vocab-page">
      <div class="page-header">
        <button class="btn-back" onclick="navigate('/profile')">← Hồ sơ</button>
        <div>
          <div class="page-title">📖 Từ vựng của tôi</div>
          <div class="page-subtitle">${all.length} từ đã lưu</div>
        </div>
        ${all.length > 0 ? `<button class="btn btn-primary" style="flex-shrink:0" onclick="startMyFlashcard()">🃏 Luyện flashcard</button>` : ''}
      </div>

      ${all.length > 0 ? `
        <div class="my-vocab-toolbar">
          <input class="form-input search-input" placeholder="🔍 Tìm từ hoặc nghĩa..."
            value="${escapeHtml(_myVocabSearch)}"
            oninput="_myVocabSearch=this.value; renderMyVocabList()" />
          <span class="mvc-count">${list.length} / ${all.length}</span>
        </div>` : ''}
      ${cards}
    </div>`;
}

async function removeMyVocabWord(btn) {
  const word = btn.dataset.word;
  btn.disabled = true;
  try {
    await api.delete(`/student/vocab/${encodeURIComponent(word)}`);
    _invalidateVocabCache();
    await loadMyVocab();
    renderMyVocabList();
  } catch (e) {
    toast('Lỗi xoá từ: ' + (e.error || e.message), 'error');
    btn.disabled = false;
  }
}
window.removeMyVocabWord = removeMyVocabWord;

// ── My Vocab Flashcard ─────────────────────────────────────────────────────
let _mfc = { deck: [], idx: 0, known: 0, retry: 0, flipped: false };

async function startMyFlashcard() {
  const list = await loadMyVocab();
  if (!list.length) { toast('Chưa có từ nào', 'error'); return; }
  _mfc = { deck: [...list].sort(() => Math.random() - 0.5), idx: 0, known: 0, retry: 0, flipped: false };
  renderMyFlashcard();
}
window.startMyFlashcard = startMyFlashcard;

function renderMyFlashcard() {
  if (_mfc.idx >= _mfc.deck.length) { renderMyFlashcardEnd(); return; }
  const card  = _mfc.deck[_mfc.idx];
  const total = _mfc.deck.length;
  const pct   = Math.round((_mfc.idx / total) * 100);
  $('#app').innerHTML = `
    <div class="container mfc-page">
      <div class="mfc-header">
        <button class="btn-back" onclick="showMyVocab()">← Từ vựng</button>
        <div class="mfc-prog-wrap"><div class="mfc-prog-bar" style="width:${pct}%"></div></div>
        <span class="mfc-counter">${_mfc.idx + 1} / ${total}</span>
      </div>

      <div class="mfc-scene" onclick="flipMyFC()">
        <div class="mfc-inner ${_mfc.flipped ? 'flipped' : ''}" id="mfc-inner">
          <div class="mfc-face mfc-front">
            <div class="mfc-hint">nhấn để lật ▾</div>
            <div class="mfc-word">${escapeHtml(card.word)}</div>
            ${card.source ? `<div class="mfc-src">📋 ${escapeHtml(card.source)}</div>` : ''}
          </div>
          <div class="mfc-face mfc-back">
            <div class="mfc-hint">nghĩa ▴</div>
            <div class="mfc-def">${escapeHtml(card.definition)}</div>
            ${card.example ? `<div class="mfc-ex">"${escapeHtml(card.example)}"</div>` : ''}
          </div>
        </div>
      </div>

      <div class="mfc-actions ${_mfc.flipped ? '' : 'hidden'}" id="mfc-actions">
        <button class="mfc-btn mfc-retry" onclick="mfcAnswer(false)">✗ Ôn lại</button>
        <button class="mfc-btn mfc-known" onclick="mfcAnswer(true)">✓ Biết rồi</button>
      </div>
      <div class="mfc-score-row">
        <span class="mfc-s-known">✓ ${_mfc.known}</span>
        <span class="mfc-s-retry">✗ ${_mfc.retry}</span>
      </div>
    </div>`;
}

function flipMyFC() {
  _mfc.flipped = !_mfc.flipped;
  document.getElementById('mfc-inner')?.classList.toggle('flipped', _mfc.flipped);
  document.getElementById('mfc-actions')?.classList.toggle('hidden', !_mfc.flipped);
}
function mfcAnswer(known) {
  if (known) _mfc.known++; else _mfc.retry++;
  _mfc.idx++;
  _mfc.flipped = false;
  renderMyFlashcard();
}
function renderMyFlashcardEnd() {
  const pct = Math.round((_mfc.known / _mfc.deck.length) * 100);
  const emoji = pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪';
  const msg   = pct >= 80 ? 'Xuất sắc!' : pct >= 50 ? 'Tốt lắm!' : 'Cần ôn thêm!';
  $('#app').innerHTML = `
    <div class="container mfc-page">
      <div class="mfc-end">
        <div class="mfc-end-emoji">${emoji}</div>
        <div class="mfc-end-title">${msg}</div>
        <div class="mfc-score-row" style="justify-content:center;margin:12px 0">
          <span class="mfc-s-known">✓ Biết: ${_mfc.known}</span>
          <span class="mfc-s-retry" style="margin-left:16px">✗ Cần ôn: ${_mfc.retry}</span>
        </div>
        <div class="mfc-end-pct">${pct}% đã thuộc</div>
        <div class="mfc-end-btns">
          <button class="btn btn-primary" onclick="startMyFlashcard()">🔄 Luyện lại</button>
          <button class="btn btn-outline" onclick="showMyVocab()">← Từ vựng</button>
        </div>
      </div>
    </div>`;
}
window.flipMyFC    = flipMyFC;
window.mfcAnswer   = mfcAnswer;

// ═══════════════════════════════════════════════════════════════════════════
// PAGE: ASSIGNMENTS LIST
// ═══════════════════════════════════════════════════════════════════════════

async function showAssignments() {
  setLoading('Đang tải danh sách bài tập...');
  try {
    const assignments = await api.get(
      `/student/assignments?student_id=${_student.id}&class_id=${_selectedClass.id}`
    );
    window._cachedAssignments = assignments;
    renderAssignments(assignments);
  } catch (e) {
    toast('Lỗi tải bài tập: ' + (e.error || e.message), 'error');
  }
}

function renderAssignments(assignments) {
  // Apply skill filter
  const filtered = _assignmentSkillFilter
    ? assignments.filter(a => a.skill === _assignmentSkillFilter)
    : assignments;

  const pending = filtered.filter(a => !a.submission_id && a.is_active);
  const closed  = filtered.filter(a => !a.submission_id && !a.is_active);
  const done    = filtered.filter(a =>  a.submission_id);

  function assignCard(a) {
    const overdue   = isOverdue(a.deadline);
    const isDone    = !!a.submission_id;
    const isClosed  = !a.is_active && !isDone;
    const icon      = SKILL_ICONS[a.skill] || '📝';
    const countdown = !isDone && !overdue && !isClosed ? formatCountdown(a.deadline) : null;

    let statusBadge, rightContent;
    if (isClosed) {
      statusBadge  = `<span class="badge badge-closed">🔒 Đã đóng</span>`;
      rightContent = '';
    } else if (isDone) {
      const hasScore = a.overall_score !== null && a.overall_score !== undefined;
      const isWaiting = !hasScore;
      statusBadge = isWaiting
        ? `<span class="badge badge-waiting">⏳ Chờ chấm</span>`
        : `<span class="badge badge-done">✅ Đã có điểm</span>`;
      rightContent = hasScore
        ? `<div class="score-band">${a.overall_score}</div><div class="score-label">Band</div>`
        : `<div class="score-pending-icon">⏳</div>`;
    } else if (overdue && a.deadline) {
      statusBadge  = `<span class="badge badge-overdue">⚠️ Quá hạn</span>`;
      rightContent = '';
    } else {
      statusBadge  = `<span class="badge badge-pending">Chưa làm</span>`;
      rightContent = '';
    }

    if (isClosed) {
      return `
        <div class="assignment-card assignment-card-closed">
          <div class="assignment-card-icon">${icon}</div>
          <div class="assignment-card-body">
            <div class="assignment-card-title">${escapeHtml(a.title)}</div>
            <div class="assignment-card-meta">
              ${skillBadge(a.skill)}
              ${statusBadge}
            </div>
            <div class="assignment-card-deadline-row">
              <span class="assignment-card-deadline">📅 ${formatDateTime(a.deadline)}</span>
            </div>
          </div>
          <div class="assignment-card-right"></div>
        </div>`;
    }

    const href = isDone ? `#/result/${a.id}` : `#/assignment/${a.id}`;

    return `
      <a class="assignment-card ${isDone ? 'done' : ''}" href="${href}">
        <div class="assignment-card-icon">${icon}</div>
        <div class="assignment-card-body">
          <div class="assignment-card-title">${escapeHtml(a.title)}</div>
          <div class="assignment-card-meta">
            ${skillBadge(a.skill)}
            ${statusBadge}
          </div>
          <div class="assignment-card-deadline-row">
            ${countdown ? `<span class="countdown-chip">${countdown}</span>` : ''}
            <span class="assignment-card-deadline ${overdue && !isDone ? 'overdue' : ''}">
              📅 ${formatDateTime(a.deadline)}
            </span>
          </div>
        </div>
        <div class="assignment-card-right">
          ${rightContent}
          <span class="card-chevron">›</span>
        </div>
      </a>`;
  }

  const skillFilters = [
    ['', 'Tất cả'],
    ['reading', '📖 Reading'],
    ['listening', '🎧 Listening'],
    ['writing', '✍️ Writing'],
    ['speaking', '🎤 Speaking'],
  ];

  const emptyAll = `
    <div class="empty-state">
      <div class="empty-icon">📋</div>
      <div class="empty-title">${_assignmentSkillFilter ? 'Không có bài tập nào cho kỹ năng này' : 'Chưa có bài tập nào'}</div>
      <div class="empty-desc">${_assignmentSkillFilter ? '' : 'Giáo viên chưa giao bài cho lớp này.'}</div>
    </div>`;

  $('#app').innerHTML = `
    <div class="container">
      <div class="page-header" style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <div>
          <div class="page-title">Bài tập của tôi</div>
          <div class="page-subtitle">Lớp ${escapeHtml(_selectedClass.class_name)}</div>
        </div>
        <a href="#/vocab-games" class="btn-vocab-games-link">🃏 Ôn từ vựng</a>
      </div>

      <div class="skill-filter-tabs">
        ${skillFilters.map(([s, label]) => `
          <button class="skill-filter-tab ${_assignmentSkillFilter === s ? 'active' : ''}"
            onclick="_assignmentSkillFilter='${s}';renderAssignments(window._cachedAssignments||[])">
            ${label}
          </button>`).join('')}
      </div>

      ${filtered.length === 0 ? emptyAll : ''}

      ${pending.length > 0 ? `
        <div class="section-label">Cần làm (${pending.length})</div>
        <div class="assignment-list" style="margin-bottom:28px">
          ${pending.map(assignCard).join('')}
        </div>` : ''}

      ${done.length > 0 ? `
        <div class="section-label">Đã nộp (${done.length})</div>
        <div class="assignment-list" style="margin-bottom:28px">
          ${done.map(assignCard).join('')}
        </div>` : ''}

      ${closed.length > 0 ? `
        <div class="section-label section-label-closed">Đã đóng (${closed.length})</div>
        <div class="assignment-list">
          ${closed.map(assignCard).join('')}
        </div>` : ''}
    </div>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGE: TAKE ASSIGNMENT
// ═══════════════════════════════════════════════════════════════════════════

async function showAssignment({ id }) {
  setLoading('Đang tải bài tập...');
  try {
    const assignment = await api.get(`/assignments/${id}/question`);

    // If already submitted → go to result
    try {
      await api.get(`/submissions?assignment_id=${id}&student_id=${_student.id}`);
      navigate(`/result/${id}`);
      return;
    } catch {}

    renderAssignment(assignment);
  } catch (e) {
    toast('Lỗi tải bài tập: ' + (e.error || e.message), 'error');
    navigate('/assignments');
  }
}

function renderAssignment(a) {
  _activeAssignmentId = a.id;
  // Restore flag set from draft
  const flagDraft = loadDraft(a.id, 'flags');
  _flaggedSet = new Set(Array.isArray(flagDraft?.data) ? flagDraft.data : []);

  const skill = a.skill;
  if      (skill === 'reading')   renderReading(a);
  else if (skill === 'listening') renderListening(a);
  else if (skill === 'writing')   renderWriting(a);
  else if (skill === 'speaking')  renderSpeaking(a);

  // B1.3 — count-up timer in toolbar
  const toolbar = document.querySelector('.assignment-toolbar');
  if (toolbar) {
    const timerEl = document.createElement('div');
    timerEl.id = 'task-timer';
    timerEl.className = 'task-timer';
    timerEl.title = 'Thời gian bạn đã làm bài';
    const submitBtn = toolbar.querySelector('#submit-btn');
    if (submitBtn) toolbar.insertBefore(timerEl, submitBtn);
    else toolbar.appendChild(timerEl);

    const saveEl = document.createElement('div');
    saveEl.id = 'save-indicator';
    saveEl.className = 'save-indicator';
    if (submitBtn) toolbar.insertBefore(saveEl, submitBtn);
    else toolbar.appendChild(saveEl);

    startTaskTimer(a.id);
  }
}

// ── Reading ───────────────────────────────────────────────────────────────────

function renderReading(a) {
  const qCount = a.question_count || 0;
  let answerRows = '';
  for (let i = 1; i <= qCount; i++) {
    const flagged = _flaggedSet.has(i) ? ' flagged' : '';
    answerRows += `
      <div class="answer-row">
        <span class="q-label">Q${i}</span>
        <input class="answer-input" id="ans-${i}" type="text" placeholder="Đáp án câu ${i}"
          oninput="updateNavigatorState();autoSaveAnswers('${a.id}', ${qCount})" />
        <button class="q-flag-btn${flagged}" data-flag-q="${i}" onclick="toggleFlag(${i})" title="Đánh dấu xem lại">🚩</button>
      </div>`;
  }

  $('#app').innerHTML = `
    <div class="assignment-page">
      <div class="assignment-toolbar">
        <button class="btn-back" onclick="navigate('/assignments')">← Quay lại</button>
        <div class="assignment-toolbar-title">${skillBadge(a.skill)} ${escapeHtml(a.title)}</div>
        <button class="btn btn-primary btn-sm" id="submit-btn"
          onclick="submitAnswers('${a.id}', ${qCount}, 'reading', this)">Nộp bài</button>
      </div>
      <div class="assignment-content">
        <div class="content-pane" id="reading-content-pane">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px">
            <div class="section-title" style="margin-bottom:0">Bài đọc &amp; Câu hỏi</div>
            ${buildHighlightToolbar()}
          </div>
          <div class="reading-text" id="reading-text">${renderQuestionContentHTML(a.content_blocks, a.content_text || '')}</div>
        </div>
        <div class="answer-pane">
          ${buildQuestionNavigator(qCount, a.id)}
          <div class="section-title">Điền đáp án</div>
          ${qCount === 0
            ? `<div style="color:var(--gray-400);font-size:13px">Bài tập không có câu hỏi.</div>`
            : `<div class="answer-grid">${answerRows}</div>`}
        </div>
      </div>
    </div>`;

  restoreAnswerDraft(a.id, qCount);
  bindReadingTextInteractions();
  updateNavigatorState();
  startAutoSave(() => autoSaveAnswers(a.id, qCount));
}

// ── Listening ─────────────────────────────────────────────────────────────────

function renderListening(a) {
  const qCount = a.question_count || 0;
  let answerRows = '';
  for (let i = 1; i <= qCount; i++) {
    const flagged = _flaggedSet.has(i) ? ' flagged' : '';
    answerRows += `
      <div class="answer-row">
        <span class="q-label">Q${i}</span>
        <input class="answer-input" id="ans-${i}" type="text" placeholder="Đáp án câu ${i}"
          oninput="updateNavigatorState();autoSaveAnswers('${a.id}', ${qCount})" />
        <button class="q-flag-btn${flagged}" data-flag-q="${i}" onclick="toggleFlag(${i})" title="Đánh dấu xem lại">🚩</button>
      </div>`;
  }

  $('#app').innerHTML = `
    <div class="assignment-page">
      <div class="assignment-toolbar">
        <button class="btn-back" onclick="navigate('/assignments')">← Quay lại</button>
        <div class="assignment-toolbar-title">${skillBadge(a.skill)} ${escapeHtml(a.title)}</div>
        <button class="btn btn-primary btn-sm" id="submit-btn"
          onclick="submitAnswers('${a.id}', ${qCount}, 'listening', this)">Nộp bài</button>
      </div>
      <div class="assignment-content">
        <div class="content-pane">
          ${(() => {
            const tracks = Array.isArray(a.content_urls) && a.content_urls.length > 0
              ? a.content_urls
              : (a.content_url ? [{ url: a.content_url, name: '' }] : []);
            if (!tracks.length) return '';
            const multi = tracks.length > 1;
            return tracks.map((t, i) => `
              <div class="audio-player-box">
                ${multi ? `<div class="audio-track-label">🎧 ${escapeHtml(t.name || ('File ' + (i + 1)))}</div>` : '<span class="audio-player-icon">🎧</span>'}
                <audio controls src="${escapeHtml(t.url || '')}">Trình duyệt không hỗ trợ audio.</audio>
                <div class="audio-replay-controls">
                  <button class="btn-replay" onclick="audioSeekEl(this,-10)" title="Lùi 10s">⏪ -10s</button>
                  <button class="btn-replay" onclick="audioSeekEl(this,-5)"  title="Lùi 5s">◀ -5s</button>
                  <button class="btn-replay" onclick="audioSeekEl(this,5)"   title="Tới 5s">+5s ▶</button>
                  <button class="btn-replay" onclick="audioSeekEl(this,10)"  title="Tới 10s">+10s ⏩</button>
                </div>
              </div>`).join('');
          })()}
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px">
            <div class="section-title" style="margin-bottom:0">Câu hỏi</div>
            ${buildHighlightToolbar()}
          </div>
          <div class="reading-text" id="reading-text">${renderQuestionContentHTML(a.content_blocks, a.content_text || '')}</div>
        </div>
        <div class="answer-pane">
          ${buildQuestionNavigator(qCount, a.id)}
          <div class="section-title">Điền đáp án</div>
          ${qCount === 0
            ? `<div style="color:var(--gray-400);font-size:13px">Bài tập không có câu hỏi.</div>`
            : `<div class="answer-grid">${answerRows}</div>`}
        </div>
      </div>
    </div>`;

  restoreAnswerDraft(a.id, qCount);
  bindReadingTextInteractions();
  updateNavigatorState();
  startAutoSave(() => autoSaveAnswers(a.id, qCount));
}

// Auto-save / restore answers (B1.1)
function autoSaveAnswers(aid, qCount) {
  const answers = [];
  for (let i = 1; i <= qCount; i++) {
    answers.push({ q_no: i, answer: ($(`#ans-${i}`)?.value || '') });
  }
  saveDraft(aid, 'answers', answers);
  showSavedIndicator();
}
function restoreAnswerDraft(aid, qCount) {
  const draft = loadDraft(aid, 'answers');
  if (!draft?.data) return;
  for (const { q_no, answer } of draft.data) {
    const inp = document.getElementById(`ans-${q_no}`);
    if (inp && answer) inp.value = answer;
  }
}

// B1.2 Notes: simple sticky note attached to highlighted text
function addStudentNote() {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || !sel.rangeCount) {
    toast('Hãy bôi đen 1 đoạn trong bài đọc trước', 'error');
    return;
  }
  const range = sel.getRangeAt(0);
  const target = document.getElementById('reading-text');
  if (!target || !target.contains(range.commonAncestorContainer)) {
    toast('Chỉ có thể ghi chú trong bài đọc', 'error'); return;
  }
  const text = sel.toString();
  const note = prompt('Ghi chú cho đoạn này:');
  if (!note) return;
  const mark = document.createElement('mark');
  mark.className = 'student-note';
  mark.dataset.note = note;
  mark.title = note;
  try { range.surroundContents(mark); } catch { toast('Không tạo được ghi chú', 'error'); return; }
  mark.onclick = () => {
    const newNote = prompt('Sửa ghi chú (để trống để xoá):', mark.dataset.note);
    if (newNote === null) return;
    if (!newNote.trim()) {
      const p = mark.parentNode;
      while (mark.firstChild) p.insertBefore(mark.firstChild, mark);
      p.removeChild(mark); p.normalize();
    } else {
      mark.dataset.note = newNote;
      mark.title = newNote;
    }
    persistNotes(_activeAssignmentId);
  };
  sel.removeAllRanges();
  persistNotes(_activeAssignmentId);
}

function persistNotes(aid) {
  if (!aid) return;
  const target = document.getElementById('reading-text');
  if (!target) return;
  const notes = [];
  target.querySelectorAll('mark.student-note').forEach(m => {
    notes.push({ text: m.textContent, note: m.dataset.note });
  });
  saveDraft(aid, 'notes', notes);
}

function restoreNotes(aid) {
  const draft = loadDraft(aid, 'notes');
  if (!draft?.data?.length) return;
  const target = document.getElementById('reading-text');
  if (!target) return;
  for (const { text, note } of draft.data) {
    if (!text) continue;
    const idx = target.textContent.indexOf(text);
    if (idx < 0) continue;
    const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT, null);
    let node;
    while ((node = walker.nextNode())) {
      const i = node.textContent.indexOf(text);
      if (i < 0) continue;
      const r = document.createRange();
      r.setStart(node, i); r.setEnd(node, i + text.length);
      const m = document.createElement('mark');
      m.className = 'student-note'; m.dataset.note = note; m.title = note;
      try { r.surroundContents(m); } catch { /* skip if spans nodes */ }
      m.onclick = () => {
        const nn = prompt('Sửa ghi chú (để trống để xoá):', m.dataset.note);
        if (nn === null) return;
        if (!nn.trim()) {
          const p = m.parentNode;
          while (m.firstChild) p.insertBefore(m.firstChild, m);
          p.removeChild(m); p.normalize();
        } else { m.dataset.note = nn; m.title = nn; }
        persistNotes(aid);
      };
      break;
    }
  }
}

async function submitAnswers(assignmentId, qCount, skill, btn) {
  const answers = [];
  for (let i = 1; i <= qCount; i++) {
    answers.push({ q_no: i, answer: ($(`#ans-${i}`)?.value || '').trim() });
  }
  const answered = answers.filter(a => a.answer).length;
  const unanswered = qCount - answered;
  const flagged = _flaggedSet.size;

  // B1.9 — always confirm before submit
  const ok = await confirmSubmit({
    title: 'Xác nhận nộp bài',
    message: `
      <ul class="submit-confirm-stats">
        <li>✅ Đã trả lời: <b>${answered} / ${qCount}</b></li>
        ${unanswered > 0 ? `<li>❌ Còn <b>${unanswered}</b> câu chưa làm</li>` : ''}
        ${flagged > 0 ? `<li>🚩 Đang đánh dấu xem lại <b>${flagged}</b> câu</li>` : ''}
      </ul>
      <div style="margin-top:8px;color:var(--gray-600);font-size:13px">Sau khi nộp bài bạn không thể chỉnh sửa.</div>`,
  });
  if (!ok) return;

  btnLoading(btn);
  try {
    await api.post(`/assignments/${assignmentId}/submit`, {
      student_id: _student.id, student_answers: answers,
    });
    await syncNotifUIAfterSubmit();
    clearAllDrafts(assignmentId);
    stopAutoSave(); stopTaskTimer();
    toast('Nộp bài thành công! 🎉');
    navigate(`/result/${assignmentId}`);
  } catch (e) {
    btnReset(btn);
    if (e.error?.includes('đã nộp')) { navigate(`/result/${assignmentId}`); return; }
    toast('Lỗi nộp bài: ' + (e.error || e.message), 'error');
  }
}

// ── Writing ───────────────────────────────────────────────────────────────────

function renderWriting(a) {
  $('#app').innerHTML = `
    <div class="assignment-page">
      <div class="assignment-toolbar">
        <button class="btn-back" onclick="navigate('/assignments')">← Quay lại</button>
        <div class="assignment-toolbar-title">${skillBadge(a.skill)} ${escapeHtml(a.title)}</div>
        <button class="btn btn-primary btn-sm" id="submit-btn"
          onclick="submitWriting('${a.id}', this)">Nộp bài</button>
      </div>
      <div class="assignment-content">
        <div class="content-pane">
          <div class="section-title">Đề bài</div>
          <div class="writing-prompt-body">${renderQuestionContentHTML(a.content_blocks, a.content_text || 'Không có đề bài.')}</div>
        </div>
        <div class="answer-pane writing-answer-pane">
          <div class="section-title">Bài làm của bạn</div>
          <textarea id="writing-answer" class="writing-textarea"
            placeholder="Viết bài của bạn vào đây..."
            oninput="updateWordCount(this);autoSaveWriting('${a.id}')"></textarea>
          <div id="word-count" class="word-count word-count-extended">
            <span data-stat="words">0 từ</span>
            <span data-stat="chars">0 ký tự</span>
            <span data-stat="sentences">0 câu</span>
            <span data-stat="paragraphs">0 đoạn</span>
          </div>
          <div class="form-hint">Task 1: ~150 từ — Task 2: ~250 từ</div>
        </div>
      </div>
    </div>`;

  // B1.1 — restore writing draft
  const draft = loadDraft(a.id, 'writing');
  if (draft?.data) {
    const ta = $('#writing-answer');
    if (ta) { ta.value = draft.data; updateWordCount(ta); }
  }
  startAutoSave(() => autoSaveWriting(a.id));
}

function updateWordCount(textarea) {
  const text = textarea.value || '';
  const words = countWords(text);
  const chars = text.length;
  const sentences = (text.match(/[^.!?…]+[.!?…]+/g) || (text.trim() ? [text] : [])).length;
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim()).length;
  const el = $('#word-count');
  if (!el) return;
  // B1.7 — extended counters, no warning styling
  const set = (k, v) => { const s = el.querySelector(`[data-stat="${k}"]`); if (s) s.textContent = v; };
  set('words', `${words} từ`);
  set('chars', `${chars} ký tự`);
  set('sentences', `${sentences} câu`);
  set('paragraphs', `${paragraphs} đoạn`);
}

function autoSaveWriting(aid) {
  const v = $('#writing-answer')?.value || '';
  saveDraft(aid, 'writing', v);
  showSavedIndicator();
}

async function submitWriting(assignmentId, btn) {
  const content = ($('#writing-answer')?.value || '').trim();
  if (!content) { toast('Vui lòng viết bài trước khi nộp', 'error'); return; }
  const wc = countWords(content);
  // B1.9 — always confirm before submit
  const okW = await confirmSubmit({
    title: 'Xác nhận nộp bài Writing',
    message: `
      <ul class="submit-confirm-stats">
        <li>📝 Số từ: <b>${wc}</b>${wc < 150 ? ' <span style="color:var(--danger)">⚠ Dưới mức tối thiểu</span>' : ''}</li>
      </ul>
      ${wc < 50 ? `<div style="color:var(--danger);margin-top:4px">Bài quá ngắn — tối thiểu 150 từ (Task 1) hoặc 250 từ (Task 2).</div>` : ''}
      <div style="margin-top:8px;color:var(--gray-600);font-size:13px">Sau khi nộp bạn không thể chỉnh sửa.</div>`,
  });
  if (!okW) return;

  btnLoading(btn);
  try {
    await api.post(`/assignments/${assignmentId}/submit`, {
      student_id: _student.id, writing_content: content,
    });
    await syncNotifUIAfterSubmit();
    clearAllDrafts(assignmentId);
    stopAutoSave(); stopTaskTimer();
    toast('Nộp bài thành công! 🎉');
    navigate(`/result/${assignmentId}`);
  } catch (e) {
    btnReset(btn);
    if (e.error?.includes('đã nộp')) { navigate(`/result/${assignmentId}`); return; }
    toast('Lỗi nộp bài: ' + (e.error || e.message), 'error');
  }
}

// ── Speaking ──────────────────────────────────────────────────────────────────

let _mediaRecorder = null;
let _audioChunks   = [];
let _recordedBlob  = null;
let _uploadedFile  = null;
let _recordTimer   = null;
let _recordSeconds = 0;

function _newSpeakingSlot() {
  return { displayName: '', status: 'idle', localUrl: null, url: null, key: null, name: '', size: 0, pct: 0, eta: null };
}
let _speakingSlots     = [_newSpeakingSlot()];
let _speakingRecordIdx = -1;
let _speakingAssignId  = null;

function renderSpeaking(a) {
  _speakingSlots = [_newSpeakingSlot()];
  _speakingRecordIdx = -1;
  _speakingAssignId = a.id;
  _mediaRecorder = null; _audioChunks = []; _recordedBlob = null; _uploadedFile = null;

  $('#app').innerHTML = `
    <div class="assignment-page">
      <div class="assignment-toolbar">
        <button class="btn-back" onclick="navigate('/assignments')">← Quay lại</button>
        <div class="assignment-toolbar-title">${skillBadge(a.skill)} ${escapeHtml(a.title)}</div>
        <button class="btn btn-primary btn-sm" id="submit-btn"
          onclick="submitSpeaking('${a.id}', this)" disabled>Nộp bài</button>
      </div>
      <div class="assignment-content single-col">
        <div class="content-pane">
          <div class="section-title">Câu hỏi / Cue Card</div>
          <div class="cue-card">${renderQuestionContentHTML(a.content_blocks, a.content_text || '')}</div>
        </div>
        <div class="answer-pane">
          <div class="section-title">Bài nói của bạn</div>
          <div id="recording-indicator" style="display:none;padding:10px 14px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;margin-bottom:10px">
            <canvas id="waveform-canvas" class="waveform-canvas" width="600" height="60"></canvas>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px">
              <div id="record-timer" class="record-timer" style="font-size:18px">0:00</div>
              <button class="record-btn recording-active" style="padding:6px 18px;font-size:13px" onclick="stopSlotRecording()">⏹ Dừng thu âm</button>
            </div>
          </div>
          <div id="speaking-slot-list"></div>
          <button class="btn btn-outline btn-sm" style="margin-top:8px" onclick="addSpeakingSlot()">+ Thêm phần</button>
          <div id="audio-submit-status" class="audio-submit-status hidden" style="margin-top:12px"></div>
        </div>
      </div>
    </div>`;

  _renderSpeakingSlots();
}

function _renderSpeakingSlots() {
  const listEl = $('#speaking-slot-list');
  if (!listEl) return;
  const canRemove = _speakingSlots.length > 1;
  listEl.innerHTML = _speakingSlots.map((s, i) => {
    const removeBtn = canRemove && s.status !== 'recording'
      ? `<button class="remove-audio-slot" onclick="removeSpeakingSlot(${i})" title="Xoá">×</button>`
      : (canRemove ? '<div style="width:28px"></div>' : '');

    let fileBody = '';
    if (s.status === 'idle' || s.status === 'error') {
      const errLabel = s.status === 'error' ? `<span style="color:var(--danger);font-size:12px">✗ Lỗi upload — thử lại:</span>` : '';
      fileBody = `${errLabel}
        <input id="sp-slot-input-${i}" type="file" accept="audio/*" style="display:none" onchange="onSpeakingSlotFileSelected(this,${i})" />
        <button class="audio-pick-btn" onclick="startSlotRecording(${i})">🎙️ Thu âm</button>
        <button class="audio-pick-btn" onclick="document.getElementById('sp-slot-input-${i}').click()">🎵 Chọn file</button>`;
    } else if (s.status === 'recording') {
      fileBody = `<span style="font-size:13px;color:#dc2626;font-weight:600">● Đang ghi âm...</span>`;
    } else if (s.status === 'uploading') {
      const etaStr = s.pct < 100 && s.eta != null ? ` · ETA ${_fmtUploadEta(s.eta)}` : '';
      fileBody = `
        <div class="audio-slot-filename">${escapeHtml(s.name)} <span style="color:var(--gray-400)">(${(s.size/1024/1024).toFixed(1)} MB)</span></div>
        <div class="upload-progress-row" style="width:100%">
          <div class="upload-progress-bar-wrap"><div class="upload-progress-bar" style="width:${s.pct}%"></div></div>
          <span class="upload-progress-label">${s.pct}%${etaStr}</span>
        </div>`;
    } else if (s.status === 'done') {
      fileBody = `
        <div class="audio-slot-done" style="width:100%">
          <span class="audio-upload-done">✓</span>
          <audio controls src="${escapeHtml(s.localUrl || s.url || '')}" style="height:32px;flex:1;min-width:0;border-radius:6px"></audio>
          <button class="btn btn-outline btn-sm" style="padding:2px 8px;font-size:12px;flex-shrink:0" onclick="clearSpeakingSlot(${i})">Xoá</button>
        </div>`;
    }
    return `<div class="audio-slot" id="sp-slot-${i}">
      <div class="audio-slot-num">${i + 1}</div>
      <div class="audio-slot-content">
        <input type="text" class="form-input audio-slot-name" placeholder="Tên phần (VD: Part ${i + 1})"
               value="${escapeHtml(s.displayName)}" onchange="_speakingSlots[${i}].displayName=this.value" />
        <div class="audio-slot-file">${fileBody}</div>
      </div>
      ${removeBtn}
    </div>`;
  }).join('');
}

async function startSlotRecording(idx) {
  if (_speakingRecordIdx >= 0) { toast('Đang ghi âm phần khác, hãy dừng trước', 'warning'); return; }
  _speakingRecordIdx = idx;
  _speakingSlots[idx].status = 'recording';
  _renderSpeakingSlots();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    _audioChunks = [];
    const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
    _mediaRecorder = new MediaRecorder(stream, { mimeType });
    _mediaRecorder.ondataavailable = e => { if (e.data.size > 0) _audioChunks.push(e.data); };
    _mediaRecorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      stopWaveform();
      const rawMime = _mediaRecorder.mimeType || 'audio/webm';
      const blob = new Blob(_audioChunks, { type: rawMime });
      _onSlotRecordingDone(_speakingRecordIdx, blob, rawMime);
    };
    _mediaRecorder.start(250);
    const ind = $('#recording-indicator'); if (ind) ind.style.display = '';
    startWaveform(stream);
    _recordSeconds = 0;
    clearInterval(_recordTimer);
    _recordTimer = setInterval(() => {
      _recordSeconds++;
      const m = Math.floor(_recordSeconds / 60), s = _recordSeconds % 60;
      const el = $('#record-timer'); if (el) el.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    }, 1000);
  } catch (e) {
    _speakingSlots[idx].status = 'idle';
    _speakingRecordIdx = -1;
    _renderSpeakingSlots();
    toast('Không thể truy cập microphone: ' + e.message, 'error');
  }
}

function stopSlotRecording() {
  clearInterval(_recordTimer);
  _mediaRecorder?.stop();
  const ind = $('#recording-indicator'); if (ind) ind.style.display = 'none';
  const tb = $('#record-timer'); if (tb) tb.textContent = '0:00';
}

function _onSlotRecordingDone(idx, blob, mimeType) {
  const slot = _speakingSlots[idx];
  if (!slot) { _speakingRecordIdx = -1; return; }
  // Strip codec qualifier so R2 stores a clean MIME type (e.g. "audio/webm" not "audio/webm;codecs=opus")
  const cleanMime = String(mimeType || 'audio/webm').split(';')[0].trim();
  const ext = cleanMime.includes('webm') ? 'webm' : cleanMime.includes('ogg') ? 'ogg' : 'webm';
  const file = new File([blob], `speaking-part${idx + 1}.${ext}`, { type: cleanMime });
  slot.name = file.name;
  slot.size = blob.size;
  slot.localUrl = URL.createObjectURL(blob);
  slot.status = 'uploading';
  slot.pct = 0;
  _speakingRecordIdx = -1;
  _renderSpeakingSlots();
  _uploadSpeakingSlot(idx, file);
}

function onSpeakingSlotFileSelected(input, idx) {
  const file = input.files?.[0];
  if (!file || !_speakingSlots[idx]) return;
  input.value = '';
  _speakingSlots[idx].name = file.name;
  _speakingSlots[idx].size = file.size;
  _speakingSlots[idx].localUrl = URL.createObjectURL(file);
  _speakingSlots[idx].status = 'uploading';
  _speakingSlots[idx].pct = 0;
  _renderSpeakingSlots();
  _uploadSpeakingSlot(idx, file);
}

async function _uploadSpeakingSlot(idx, file) {
  const slot = _speakingSlots[idx];
  if (!slot) return;
  try {
    const uploadTarget = await requestSpeakingUploadTarget(_speakingAssignId, file);
    await putSpeakingAudioDirect(
      uploadTarget.upload_url, file,
      uploadTarget.headers?.['Content-Type'] || file.type,
      (pct, eta) => {
        if (_speakingSlots[idx]) { _speakingSlots[idx].pct = pct; _speakingSlots[idx].eta = eta; }
        _renderSpeakingSlots();
      }
    );
    _speakingSlots[idx].status = 'done';
    _speakingSlots[idx].url = uploadTarget.public_url;
    _speakingSlots[idx].key = uploadTarget.key;
    _renderSpeakingSlots();
    _checkSpeakingReady();
  } catch (e) {
    _speakingSlots[idx].status = 'error';
    _renderSpeakingSlots();
    toast(`Lỗi upload phần ${idx + 1}: ` + (e.message || 'Unknown error'), 'error');
  }
}

function addSpeakingSlot() {
  _speakingSlots.push(_newSpeakingSlot());
  _renderSpeakingSlots();
}

function removeSpeakingSlot(idx) {
  if (_speakingSlots.length <= 1) { clearSpeakingSlot(0); return; }
  if (_speakingSlots[idx]?.status === 'recording') return;
  _speakingSlots.splice(idx, 1);
  _renderSpeakingSlots();
  _checkSpeakingReady();
}

function clearSpeakingSlot(idx) {
  if (!_speakingSlots[idx]) return;
  _speakingSlots[idx] = { ..._newSpeakingSlot(), displayName: _speakingSlots[idx].displayName };
  _renderSpeakingSlots();
  _checkSpeakingReady();
}

function _checkSpeakingReady() {
  const btn = $('#submit-btn');
  if (!btn) return;
  const hasDone = _speakingSlots.some(s => s.status === 'done');
  const busy = _speakingSlots.some(s => s.status === 'uploading' || s.status === 'recording');
  btn.disabled = !hasDone || busy;
}

function enableSubmit() { _checkSpeakingReady(); }
function resetRecording() { /* legacy no-op */ }
function toggleRecording() { /* legacy no-op */ }
function onFileUploaded() { /* legacy no-op */ }
function showAudioPreview() { /* legacy no-op */ }

function _fmtUploadEta(sec) {
  if (sec === null || sec === undefined || sec < 0) return '';
  if (sec < 60) return `~${sec}s`;
  return `~${Math.ceil(sec / 60)}m`;
}

function setSpeakingSubmitStatus(state, pct = 0, etaSec = null) {
  const statusEl = $('#audio-submit-status');
  if (!statusEl) return;

  if (!state) {
    statusEl.className = 'audio-submit-status hidden';
    statusEl.innerHTML = '';
    return;
  }

  statusEl.className = `audio-submit-status audio-submit-status-${state}`;

  if (state === 'uploading') {
    const safePct = Math.max(0, Math.min(100, Math.round(pct)));
    const etaLabel = safePct < 100 && etaSec !== null ? ` · ETA ${_fmtUploadEta(etaSec)}` : '';
    statusEl.innerHTML = `
      <div class="audio-submit-status-label">
        <span>Đang upload file audio...</span>
        <strong>${safePct}%${etaLabel}</strong>
      </div>
      <div class="audio-submit-progress">
        <div class="audio-submit-progress-bar" style="width:${safePct}%"></div>
      </div>`;
    return;
  }

  statusEl.innerHTML = `
    <div class="audio-submit-processing">
      <span class="btn-spinner btn-spinner--dark"></span>
      <span>Upload xong. Đang trích xuất transcript...</span>
    </div>`;
}

async function requestSpeakingUploadTarget(assignmentId, file) {
  return api.post('/uploads/audio/presign', {
    scope: 'student-speaking',
    assignment_id: assignmentId,
    file_name: file.name,
    content_type: file.type || 'application/octet-stream',
    size: file.size,
  });
}

function putSpeakingAudioDirect(uploadUrl, file, contentType, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const startTime = Date.now();

    xhr.upload.addEventListener('progress', e => {
      if (!e.lengthComputable) return;
      const pct = Math.max(0, Math.min(100, Math.round((e.loaded / e.total) * 100)));
      const elapsed = Math.max((Date.now() - startTime) / 1000, 0.001);
      const rate = e.loaded / elapsed;
      const remaining = e.total - e.loaded;
      const etaSec = rate > 0 ? Math.ceil(remaining / rate) : null;
      onProgress?.(pct, etaSec);
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`HTTP ${xhr.status}`));
    });
    xhr.addEventListener('error', () => reject(new Error('Network error')));
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', contentType || 'application/octet-stream');
    xhr.send(file);
  });
}

async function submitSpeaking(assignmentId, btn) {
  const doneSlots = _speakingSlots.filter(s => s.status === 'done');
  if (doneSlots.length === 0) {
    toast('Vui lòng thu âm hoặc upload ít nhất 1 file audio', 'error'); return;
  }
  const ok = await confirmSubmit({
    title: 'Xác nhận nộp bài Speaking',
    message: `<div>Bạn đã sẵn sàng nộp bài thu âm?</div>
              <div style="margin-top:8px;color:var(--gray-600);font-size:13px">Sau khi nộp bạn không thể thu âm lại.</div>`,
  });
  if (!ok) return;

  btnLoading(btn);
  try {
    const audioUploadKeys = doneSlots.map(s => ({ key: s.key, name: s.displayName || s.name }));
    setSpeakingSubmitStatus('processing');
    await api.post(`/assignments/${assignmentId}/submit`, {
      student_id: _student.id,
      audio_upload_keys: audioUploadKeys,
    });
    await syncNotifUIAfterSubmit();
    clearAllDrafts(assignmentId);
    stopAutoSave(); stopTaskTimer();
    toast('Nộp bài thành công! 🎉');
    navigate(`/result/${assignmentId}`);
  } catch (e) {
    setSpeakingSubmitStatus(null);
    btnReset(btn);
    if (e.error?.includes('đã nộp')) { navigate(`/result/${assignmentId}`); return; }
    toast('Lỗi nộp bài: ' + (e.error || e.message), 'error');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGE: RESULT
// ═══════════════════════════════════════════════════════════════════════════

async function showResult({ id }) {
  setLoading('Đang tải kết quả...');
  try {
    const sub = await api.get(
      `/submissions?assignment_id=${id}&student_id=${_student.id}`
    );
    renderResult(sub);
  } catch (e) {
    toast('Lỗi tải kết quả: ' + (e.error || e.message), 'error');
    navigate('/assignments');
  }
}

function renderResult(sub) {
  const skill = sub.skill;
  if (skill === 'reading' || skill === 'listening') renderGradedResult(sub);
  else if (skill === 'writing')  renderWritingResult(sub);
  else if (skill === 'speaking') renderSpeakingResult(sub);
}

function renderGradedResult(sub) {
  const questionsData  = sub.questions_data || [];
  const studentAnswers = sub.student_answers || [];

  let correctCount = 0;
  const hasActions = questionsData.some(q => q.explanation || q.location);
  const rows = questionsData.map(q => {
    const sa      = studentAnswers.find(a => a.q_no === q.q_no);
    const given   = (sa?.answer || '').trim();
    const correct = q.answers.some(a => a.toLowerCase().trim() === given.toLowerCase());
    if (correct) correctCount++;
    const actionBtns = (q.explanation || q.location) ? `
      <td class="result-actions">
        ${q.explanation ? `<button class="btn-result-action btn-result-explain" onclick="toggleExplanation('exp-q${q.q_no}')">Explain</button>` : ''}
        ${q.location ? `<button class="btn-result-action btn-result-locate" data-locate="${escapeHtml(q.location)}" data-locate-meta="${escapeAttrJson(q.location_meta)}" onclick="locateInText(this.dataset.locate, this.dataset.locateMeta)">Locate</button>` : ''}
      </td>` : (hasActions ? '<td></td>' : '');
    const expRow = q.explanation ? `
      <tr class="explanation-row hidden" id="exp-q${q.q_no}">
        <td colspan="${hasActions ? 5 : 4}">
          <div class="explanation-content"><span class="explanation-label">💡 Giải thích:</span>${escapeHtml(q.explanation)}</div>
        </td>
      </tr>` : '';
    return `
      <tr>
        <td style="font-weight:700;color:var(--gray-400)">Q${q.q_no}</td>
        <td>${escapeHtml(given) || '<em style="color:var(--gray-400)">Bỏ trống</em>'}</td>
        <td>${escapeHtml(q.answers.join(' / '))}</td>
        <td class="${correct ? 'result-correct' : 'result-wrong'}">${correct ? '✓' : '✗'}</td>
        ${actionBtns}
      </tr>${expRow}`;
  }).join('');

  const total = questionsData.length;
  const score = sub.overall_score ?? (total > 0 ? Math.round(correctCount / total * 9 * 10) / 10 : 0);
  const colSpanEmpty = hasActions ? 5 : 4;

  const vocabList = sub.vocabulary || [];
  const vocabHtml = vocabList.length === 0 ? '' : `
    <div class="section-label" style="margin-top:20px">📚 Từ vựng trong bài</div>
    <div class="vocab-result-list">
      ${vocabList.map((v, i) => {
        const saved = isWordSaved(v.word);
        return `
        <div class="vocab-result-item">
          <div class="vocab-result-header" onclick="toggleVocabItem(${i})">
            <span class="vocab-result-word">${escapeHtml(v.word)}</span>
            <span class="vocab-result-toggle" id="vocab-toggle-${i}">▶</span>
            <button class="btn-result-action btn-result-locate" data-locate="${escapeHtml(v.word)}" onclick="event.stopPropagation();locateInText(this.dataset.locate)">Locate</button>
            <button class="btn-save-word ${saved ? 'saved' : ''}"
              data-word="${escapeHtml(v.word)}"
              data-def="${escapeHtml(v.definition)}"
              data-ex="${escapeHtml(v.example || '')}"
              data-src="${escapeHtml(sub.assignment_title || '')}"
              onclick="event.stopPropagation();toggleSaveWordBtn(this)"
            >${saved ? '✓ Đã lưu' : '💾 Lưu'}</button>
          </div>
          <div class="vocab-result-detail hidden" id="vocab-detail-${i}">
            <div class="vocab-result-def">${escapeHtml(v.definition)}</div>
            ${v.example ? `<div class="vocab-result-example">"${escapeHtml(v.example)}"</div>` : ''}
          </div>
        </div>`;}).join('')}
    </div>`;

  $('#app').innerHTML = `
    <div class="assignment-page">
      <div class="assignment-toolbar">
        <button class="btn-back" onclick="navigate('/assignments')">← Danh sách bài tập</button>
        <div class="assignment-toolbar-title">${skillBadge(sub.skill)} ${escapeHtml(sub.assignment_title || '')} - Bảng điểm</div>
        <div class="toolbar-actions">
          ${vocabList.length > 0 ? `<a href="#/vocab-game/${sub.assignment_id || ''}" class="btn-vocab-toolbar" title="Luyện từ vựng bài này">🃏 Từ vựng</a>` : ''}
          ${total - correctCount > 0 ? `<button class="btn-practice btn-practice-wrong" onclick="navigate('/practice/${sub.assignment_id}?type=retry_wrong')">📝 Làm lại câu sai (${total - correctCount})</button>` : ''}
          <button class="btn-practice btn-practice-full" onclick="navigate('/practice/${sub.assignment_id}?type=retry_full')">🔄 Làm lại toàn bài</button>
        </div>
      </div>
      <div class="assignment-content">
        <div class="content-pane" id="result-content-pane">
          ${sub.skill === 'listening' ? renderListeningAudioHtml(sub) : ''}
          ${sub.skill === 'listening' && sub.script ? `
            <div class="script-section" id="listening-script-section">
              <button class="script-toggle" onclick="toggleListeningScript()">
                <span id="script-toggle-icon">▶</span> Script Listening
              </button>
              <div class="script-body hidden" id="listening-script-body">
                <div id="listening-script-text">${escapeHtml(sub.script)}</div>
              </div>
            </div>
          ` : ''}
          <div class="section-title">${sub.skill === 'listening' ? 'Câu hỏi' : 'Bài đọc & Câu hỏi'}</div>
          <div class="reading-text" id="result-reading-text">${renderQuestionContentHTML(sub.content_blocks, sub.content_text || '')}</div>
        </div>
        <div class="answer-pane">
          <div class="result-header" style="margin-bottom:16px;">
            <div class="score-display" style="margin-top:0;">
              <div class="score-number">${score}</div>
              <div class="score-band">Band Score / 9.0</div>
            </div>
            <div class="result-stats">
              <div class="stat-item">
                <div class="stat-value" style="color:var(--success)">${correctCount}</div>
                <div class="stat-label">Đúng</div>
              </div>
              <div class="stat-item">
                <div class="stat-value" style="color:var(--danger)">${total - correctCount}</div>
                <div class="stat-label">Sai</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${total}</div>
                <div class="stat-label">Tổng số</div>
              </div>
            </div>
          </div>
          <div class="section-label">Chi tiết đáp án</div>
          <div class="result-answers">
            <table class="result-table">
              <thead><tr><th>Câu</th><th>Bạn trả lời</th><th>Đáp án đúng</th><th>Kết quả</th>${hasActions ? '<th></th>' : ''}</tr></thead>
              <tbody>${rows || `<tr><td colspan="${colSpanEmpty}" style="text-align:center;padding:20px;color:var(--gray-400)">Không có dữ liệu</td></tr>`}</tbody>
            </table>
          </div>
          ${vocabHtml}
        </div>
      </div>
    </div>`;
}

function toggleExplanation(id) {
  const row = document.getElementById(id);
  if (row) row.classList.toggle('hidden');
}

function toggleListeningScript(forceOpen) {
  const body = document.getElementById('listening-script-body');
  const icon = document.getElementById('script-toggle-icon');
  if (!body) return;
  const isOpen = forceOpen === true ? false : !body.classList.contains('hidden');
  body.classList.toggle('hidden', isOpen);
  if (icon) icon.textContent = isOpen ? '▶' : '▼';
}

function toggleVocabItem(i) {
  const detail = document.getElementById(`vocab-detail-${i}`);
  const toggle = document.getElementById(`vocab-toggle-${i}`);
  if (!detail) return;
  const opening = detail.classList.toggle('hidden');
  if (toggle) toggle.textContent = opening ? '▶' : '▼';
}

function findTextBlockById(container, blockId) {
  return Array.from(container.querySelectorAll('.mixed-content-text')).find(el => el.dataset.blockId === blockId) || null;
}

function unwrapLocateMark(mark) {
  const parent = mark?.parentNode;
  if (!parent) return;
  while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
  parent.removeChild(mark);
  parent.normalize();
}

function flashLocatedMarks(marks) {
  if (!marks.length) return;
  marks[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => marks.forEach(unwrapLocateMark), 2500);
}

function getTextNodePosition(rootEl, charOffset) {
  const totalLength = rootEl.textContent?.length || 0;
  const targetOffset = Math.max(0, Math.min(charOffset, totalLength));
  const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, null);
  let node;
  let consumed = 0;
  while ((node = walker.nextNode())) {
    const next = consumed + node.textContent.length;
    if (targetOffset <= next) {
      return { node, offset: targetOffset - consumed };
    }
    consumed = next;
  }
  return null;
}

function highlightBlockRange(blockEl, startOffset, endOffset) {
  const startPos = getTextNodePosition(blockEl, startOffset);
  const endPos = getTextNodePosition(blockEl, endOffset);
  if (!startPos || !endPos) return null;
  const range = document.createRange();
  range.setStart(startPos.node, startPos.offset);
  range.setEnd(endPos.node, endPos.offset);
  if (range.collapsed) return null;
  const mark = document.createElement('mark');
  mark.className = 'locate-flash';
  try {
    range.surroundContents(mark);
  } catch {
    const frag = range.extractContents();
    mark.appendChild(frag);
    range.insertNode(mark);
  }
  return mark;
}

function locateByMeta(container, metaRaw) {
  if (!metaRaw) return false;
  let meta = null;
  try { meta = JSON.parse(metaRaw); } catch { return false; }
  if (!meta?.start_block_id || !meta?.end_block_id) return false;
  const startBlock = findTextBlockById(container, meta.start_block_id);
  const endBlock = findTextBlockById(container, meta.end_block_id);
  if (!startBlock || !endBlock) return false;
  const allBlocks = Array.from(container.querySelectorAll('.mixed-content-text'));
  const startIndex = allBlocks.indexOf(startBlock);
  const endIndex = allBlocks.indexOf(endBlock);
  if (startIndex < 0 || endIndex < 0) return false;
  const from = Math.min(startIndex, endIndex);
  const to = Math.max(startIndex, endIndex);
  const blocks = allBlocks.slice(from, to + 1);
  const marks = [];
  const sameBlock = startBlock === endBlock;
  blocks.forEach((block, idx) => {
    const blockTextLength = block.textContent?.length || 0;
    let start = 0;
    let end = blockTextLength;
    if (sameBlock) {
      start = Math.max(0, Number(meta.start_offset) || 0);
      end = Math.max(start, Number(meta.end_offset) || 0);
    } else if (idx === 0) {
      start = Math.max(0, Number(meta.start_offset) || 0);
    } else if (idx === blocks.length - 1) {
      end = Math.max(0, Number(meta.end_offset) || 0);
    }
    const mark = highlightBlockRange(block, start, end);
    if (mark) marks.push(mark);
  });
  if (!marks.length) return false;
  flashLocatedMarks(marks);
  return true;
}

function locateInText(searchText, metaRaw = '') {
  if (!searchText) return;

  // If listening script is present and meta says script_text_range, locate there
  const scriptTextEl = document.getElementById('listening-script-text');
  const parsedMeta = (() => { try { return JSON.parse(metaRaw); } catch { return null; } })();
  if (scriptTextEl && parsedMeta?.type === 'script_text_range') {
    toggleListeningScript(true); // force open
    locateInElement(scriptTextEl, searchText);
    return;
  }

  const container = document.getElementById('result-reading-text');
  if (!container) return;
  if (locateByMeta(container, metaRaw)) return;
  locateInElement(container, searchText);
}

function locateInElement(container, searchText) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  let node;
  while ((node = walker.nextNode())) {
    const idx = node.textContent.toLowerCase().indexOf(searchText.toLowerCase());
    if (idx < 0) continue;
    const range = document.createRange();
    range.setStart(node, idx);
    range.setEnd(node, idx + searchText.length);
    const mark = document.createElement('mark');
    mark.className = 'locate-flash';
    try { range.surroundContents(mark); } catch { continue; }
    mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      const parent = mark.parentNode;
      if (parent) {
        while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
        parent.removeChild(mark);
        parent.normalize();
      }
    }, 2500);
    return;
  }
  toast('Không tìm thấy đoạn này trong bài', 'error');
}

function renderWritingResult(sub) {
  const feedback = sub.teacher_feedback;
  const isGraded = sub.overall_score != null
    || (feedback?.annotations?.length > 0)
    || feedback?.overall;

  if (isGraded) {
    renderWritingFeedback(sub);
  } else {
    renderWritingPending(sub);
  }
}

function renderWritingPending(sub) {
  const wordCount = countWords(sub.writing_content || '');
  $('#app').innerHTML = `
    <div class="container">
      <button class="btn-back" onclick="navigate('/assignments')">← Danh sách bài tập</button>
      <div class="result-header">
        <div>${skillBadge(sub.skill)}</div>
        <div style="font-size:13px;color:var(--gray-400);margin-top:4px">${escapeHtml(sub.assignment_title || '')}</div>
        <div style="margin-top:16px">
          <div style="font-size:32px">✍️</div>
          <div style="font-weight:700;font-size:15px;margin-top:8px">Đã nộp bài</div>
          <div style="font-size:13px;color:var(--gray-400);margin-top:4px">${wordCount} từ</div>
        </div>
      </div>
      <div class="pending-feedback">
        <div class="pending-feedback-icon">⏳</div>
        <div class="pending-feedback-text">
          <h4>Chờ giáo viên chấm điểm</h4>
          <p>Bài luận của bạn đã được ghi nhận. Giáo viên sẽ nhận xét và chấm điểm sớm.</p>
        </div>
      </div>
      <div class="section-label">Bài làm của bạn</div>
      <div class="submitted-content">${escapeHtml(sub.writing_content || '')}</div>
    </div>`;
}

function renderWritingFeedback(sub) {
  const feedback    = sub.teacher_feedback || {};
  const annotations = (feedback.annotations || []).sort((a, b) => a.start - b.start);
  const overall     = feedback.overall || '';
  const score       = sub.overall_score ?? feedback.score;
  const wordCount   = countWords(sub.writing_content || '');

  const overallBlock = overall ? `
    <div class="section-label">Nhận xét tổng thể</div>
    <div class="feedback-overall">${escapeHtml(overall)}</div>` : '';

  const annSidebar = annotations.length === 0
    ? `<div style="color:var(--gray-400);font-size:13px;text-align:center;padding-top:48px">Không có nhận xét theo đoạn</div>`
    : `<div class="section-label">Nhận xét theo đoạn</div>
       <div class="feedback-annotations">
         ${annotations.map((ann, i) => `
           <div class="feedback-ann-card feedback-ann-clickable" onclick="scrollToFeedbackMark(${i})" title="Bấm để tới đoạn được nhận xét">
             <div class="feedback-ann-header">
               <span class="feedback-ann-number">${i + 1}</span>
               <span class="feedback-ann-quote">"${escapeHtml(ann.text.slice(0, 80))}${ann.text.length > 80 ? '…' : ''}"</span>
             </div>
             <div class="feedback-ann-comment">${escapeHtml(ann.comment)}</div>
           </div>`).join('')}
       </div>`;

  $('#app').innerHTML = `
    <div class="assignment-page">
      <div class="assignment-toolbar">
        <button class="btn-back" onclick="navigate('/assignments')">← Danh sách bài tập</button>
        <div class="assignment-toolbar-title">${skillBadge(sub.skill)} ${escapeHtml(sub.assignment_title || '')}</div>
        <div class="score-chip">
          <span class="score-chip-val">${score ?? '—'}</span>
          <span class="score-chip-label">/9.0</span>
        </div>
      </div>
      <div class="assignment-content">
        <div class="content-pane" id="feedback-content-pane">
          ${overallBlock}
          <div class="section-label"${overall ? ' style="margin-top:20px"' : ''}>Bài làm của bạn
            ${annotations.length > 0 ? '<span class="feedback-hint">Bôi vàng = nhận xét · Bấm số để xem</span>' : ''}
          </div>
          <div class="submitted-content feedback-essay">${buildAnnotatedHtml(sub.writing_content || '', annotations)}</div>
          <div style="font-size:12px;color:var(--gray-400);margin-top:8px;text-align:right">${wordCount} từ</div>
        </div>
        <div class="answer-pane">
          ${annSidebar}
        </div>
      </div>
    </div>`;
}

function buildAnnotatedHtml(text, annotations) {
  if (!text) return '<span style="color:var(--gray-400)">(Trống)</span>';
  if (!annotations || annotations.length === 0) return escapeHtml(text);
  const sorted = [...annotations].sort((a, b) => a.start - b.start);
  let html = '';
  let pos  = 0;
  let markIdx = 0;
  for (let i = 0; i < sorted.length; i++) {
    const ann   = sorted[i];
    const start = Math.max(ann.start, pos);
    const end   = Math.min(ann.end, text.length);
    if (start >= end) continue;
    if (start > pos) html += escapeHtml(text.slice(pos, start));
    html += `<mark class="ann-highlight" id="ann-mark-${markIdx}" title="${escapeHtml(ann.comment)}">`;
    html += escapeHtml(text.slice(start, end));
    html += `<sup class="ann-marker">${markIdx + 1}</sup></mark>`;
    pos = end;
    markIdx++;
  }
  if (pos < text.length) html += escapeHtml(text.slice(pos));
  return html;
}

function scrollToFeedbackMark(i) {
  const mark = document.getElementById(`ann-mark-${i}`);
  if (!mark) return;
  const pane = document.getElementById('feedback-content-pane');
  if (pane) {
    const markTop = mark.getBoundingClientRect().top - pane.getBoundingClientRect().top;
    pane.scrollTop += markTop - pane.clientHeight / 3;
  } else {
    mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  mark.classList.add('ann-flash');
  setTimeout(() => mark.classList.remove('ann-flash'), 1500);
}

function renderSpeakingResult(sub) {
  const feedback = sub.teacher_feedback;
  const isGraded = sub.overall_score != null
    || (feedback?.annotations?.length > 0)
    || feedback?.overall;

  if (isGraded) {
    renderSpeakingFeedback(sub);
  } else {
    renderSpeakingPending(sub);
  }
}

function renderSpeakingPending(sub) {
  $('#app').innerHTML = `
    <div class="container">
      <button class="btn-back" onclick="navigate('/assignments')">← Danh sách bài tập</button>
      <div class="result-header">
        <div>${skillBadge(sub.skill)}</div>
        <div style="font-size:13px;color:var(--gray-400);margin-top:4px">${escapeHtml(sub.assignment_title || '')}</div>
        <div style="margin-top:16px">
          <div style="font-size:32px">🎤</div>
          <div style="font-weight:700;font-size:15px;margin-top:8px">Đã nộp bài</div>
        </div>
      </div>
      <div class="pending-feedback">
        <div class="pending-feedback-icon">⏳</div>
        <div class="pending-feedback-text">
          <h4>Chờ giáo viên chấm điểm</h4>
          <p>File audio của bạn đã được ghi nhận. Giáo viên sẽ nghe và chấm điểm sớm.</p>
        </div>
      </div>
      ${sub.speaking_audio_url ? `
        <div class="section-label">Bài thu âm của bạn</div>
        <div class="submitted-content" style="padding:16px">
          <audio controls src="${sub.speaking_audio_url}" style="width:100%"></audio>
        </div>` : ''}
    </div>`;
}

function renderSpeakingFeedback(sub) {
  const feedback    = sub.teacher_feedback || {};
  const annotations = (feedback.annotations || []).sort((a, b) => a.start - b.start);
  const overall     = feedback.overall || '';
  const score       = sub.overall_score ?? feedback.score;

  const overallBlock = overall ? `
    <div class="section-label">Nhận xét tổng thể</div>
    <div class="feedback-overall">${escapeHtml(overall)}</div>` : '';

  const annSidebar = annotations.length === 0
    ? `<div style="color:var(--gray-400);font-size:13px;text-align:center;padding-top:48px">Không có nhận xét theo đoạn</div>`
    : `<div class="section-label">Nhận xét theo đoạn</div>
       <div class="feedback-annotations">
         ${annotations.map((ann, i) => `
           <div class="feedback-ann-card feedback-ann-clickable" onclick="scrollToFeedbackMark(${i})" title="Bấm để tới đoạn được nhận xét">
             <div class="feedback-ann-header">
               <span class="feedback-ann-number">${i + 1}</span>
               <span class="feedback-ann-quote">"${escapeHtml(ann.text.slice(0, 80))}${ann.text.length > 80 ? '…' : ''}"</span>
             </div>
             <div class="feedback-ann-comment">${escapeHtml(ann.comment)}</div>
           </div>`).join('')}
       </div>`;

  $('#app').innerHTML = `
    <div class="assignment-page">
      <div class="assignment-toolbar">
        <button class="btn-back" onclick="navigate('/assignments')">← Danh sách bài tập</button>
        <div class="assignment-toolbar-title">${skillBadge(sub.skill)} ${escapeHtml(sub.assignment_title || '')}</div>
        <div class="score-chip">
          <span class="score-chip-val">${score ?? '—'}</span>
          <span class="score-chip-label">/9.0</span>
        </div>
      </div>
      <div class="assignment-content">
        <div class="content-pane" id="feedback-content-pane">
          ${overallBlock}
          ${sub.speaking_audio_url ? `
            <div class="section-label"${overall ? ' style="margin-top:20px"' : ''}>Audio ghi âm của bạn</div>
            <div style="margin-bottom:16px">
              <audio controls src="${escapeHtml(sub.speaking_audio_url)}" style="width:100%;height:36px;outline:none"></audio>
            </div>` : ''}
          <div class="section-label">Transcript (AI Generated)
            ${annotations.length > 0 ? '<span class="feedback-hint">Bôi vàng = nhận xét · Bấm số để xem</span>' : ''}
          </div>
          <div class="submitted-content feedback-essay">${buildAnnotatedHtml(sub.speaking_script || '', annotations)}</div>
        </div>
        <div class="answer-pane">
          ${annSidebar}
        </div>
      </div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// VOCAB GAME — DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

// Tracks which skill groups are expanded beyond 3
const _vocabExpanded = {};
let _vocabSearch = '';

async function showVocabGames() {
  const needsAssignments = !window._cachedAssignments && _student && _selectedClass;
  await Promise.all([
    loadMyVocab(),
    needsAssignments
      ? api.get(`/student/assignments?student_id=${_student.id}&class_id=${_selectedClass.id}`)
          .then(r => { window._cachedAssignments = r; })
          .catch(() => {})
      : Promise.resolve(),
  ]);
  _vocabSearch = '';
  renderVocabGames();
}

function buildVocabTeacherHtml(withVocab) {
  const q = _vocabSearch.toLowerCase().trim();
  const filtered = q
    ? withVocab.filter(a =>
        a.title.toLowerCase().includes(q) || a.skill.toLowerCase().includes(q)
      )
    : withVocab;

  const SKILL_ORDER = ['reading', 'listening', 'writing', 'speaking'];
  const grouped = {};
  for (const sk of SKILL_ORDER) grouped[sk] = [];
  for (const a of filtered) {
    if (grouped[a.skill]) grouped[a.skill].push(a);
    else grouped[a.skill] = [a];
  }

  if (filtered.length === 0) {
    return `<div class="vocab-empty-mini">
      <span class="vocab-empty-icon">📭</span>
      <span>${q ? 'Không tìm thấy bài nào khớp' : 'Giáo viên chưa thêm từ vựng vào bài nào'}</span>
    </div>`;
  }

  const COLLAPSE_AT = 3;
  let html = '';
  for (const sk of SKILL_ORDER) {
    const items = grouped[sk];
    if (!items || items.length === 0) continue;
    const expanded = !!_vocabExpanded[sk];
    const shown    = expanded ? items : items.slice(0, COLLAPSE_AT);
    const hidden   = items.length - COLLAPSE_AT;

    const cards = shown.map(a => `
      <a class="vocab-game-card" href="#/vocab-game/${a.id}">
        <div class="vocab-game-card-icon">${SKILL_ICONS[a.skill]}</div>
        <div class="vocab-game-card-body">
          <div class="vocab-game-card-title">${escapeHtml(a.title)}</div>
          <div class="vocab-game-card-meta">
            ${skillBadge(a.skill)}
            <span class="vocab-count-badge">${a.vocab_count} từ</span>
          </div>
        </div>
        <div class="vocab-game-card-arrow">›</div>
      </a>`).join('');

    const toggleBtn = !expanded && hidden > 0
      ? `<button class="vocab-show-more" onclick="vocabToggleSkill('${sk}')">+ Xem thêm ${hidden} bài</button>`
      : expanded && items.length > COLLAPSE_AT
      ? `<button class="vocab-show-more" onclick="vocabToggleSkill('${sk}')">− Thu gọn</button>`
      : '';

    html += `
      <div class="vocab-skill-group">
        <div class="vocab-skill-group-header">
          <span class="vocab-skill-group-icon">${SKILL_ICONS[sk]}</span>
          <span class="vocab-skill-group-name">${SKILL_LABELS[sk] || sk}</span>
          <span class="vocab-skill-group-count">${items.length} bài</span>
        </div>
        <div class="vocab-game-list">${cards}</div>
        ${toggleBtn}
      </div>`;
  }
  return html;
}

function renderVocabGames() {
  const all       = window._cachedAssignments || [];
  const withVocab = all.filter(a => Number(a.vocab_count) > 0);

  // If already rendered, only update the list container to preserve search focus
  const listEl = document.getElementById('vocab-teacher-list');
  if (listEl) {
    listEl.innerHTML = buildVocabTeacherHtml(withVocab);
    return;
  }

  const myVocab = _myVocabCache || [];
  const myVocabCard = myVocab.length === 0
    ? `<div class="vocab-my-empty">
         <span>Bạn chưa lưu từ nào.</span>
         <span class="vocab-my-empty-hint">Bấm 💾 Lưu trong trang kết quả bài làm để thêm từ.</span>
       </div>`
    : `<div class="vocab-my-info">
         <div class="vocab-my-count">${myVocab.length} <span>từ đã lưu</span></div>
         <div class="vocab-my-preview">${myVocab.slice(0, 5).map(v => `<span class="vocab-my-pill">${escapeHtml(v.word)}</span>`).join('')}${myVocab.length > 5 ? `<span class="vocab-my-pill muted">+${myVocab.length - 5}</span>` : ''}</div>
       </div>
       <div class="vocab-my-actions">
         <button class="btn btn-primary" onclick="startMyFlashcard()">🃏 Flashcard</button>
         <button class="btn btn-outline" onclick="navigate('/my-vocab')">📖 Xem danh sách</button>
       </div>`;

  $('#app').innerHTML = `
    <div class="container vocab-hub-page">
      <div class="page-header">
        <div class="page-title">🃏 Từ vựng</div>
        <div class="page-subtitle">Chọn nguồn từ vựng để luyện tập</div>
      </div>

      <div class="vocab-section">
        <div class="vocab-section-header">
          <span class="vocab-section-icon">👩‍🏫</span>
          <div>
            <div class="vocab-section-title">Từ vựng bài học</div>
            <div class="vocab-section-sub">Do giáo viên biên soạn kèm bài</div>
          </div>
        </div>
        ${withVocab.length > 3 ? `
        <div class="vocab-search-bar">
          <input class="form-input" placeholder="🔍 Tìm bài theo tên hoặc kỹ năng..."
            oninput="_vocabSearch=this.value; renderVocabGames()" />
        </div>` : ''}
        <div id="vocab-teacher-list">${buildVocabTeacherHtml(withVocab)}</div>
      </div>

      <div class="vocab-section">
        <div class="vocab-section-header">
          <span class="vocab-section-icon">📖</span>
          <div>
            <div class="vocab-section-title">Từ vựng của tôi</div>
            <div class="vocab-section-sub">Các từ bạn đã tự lưu từ kết quả bài làm</div>
          </div>
        </div>
        <div class="vocab-my-card">${myVocabCard}</div>
      </div>
    </div>`;
}

function vocabToggleSkill(skill) {
  _vocabExpanded[skill] = !_vocabExpanded[skill];
  renderVocabGames();
}
window.vocabToggleSkill = vocabToggleSkill;
window.renderVocabGames = renderVocabGames;

// ═══════════════════════════════════════════════════════════════════════════
// VOCAB GAME — ENTRY & MENU
// ═══════════════════════════════════════════════════════════════════════════

async function showVocabGame({ id }) {
  setLoading('Đang tải từ vựng...');
  try {
    const data = await api.get(`/assignments/${id}/vocabulary`);
    _vocabGameId   = id;
    _vocabGameData = data;
    if (!data.vocabulary?.length) {
      toast('Bài này chưa có từ vựng', 'error');
      navigate('/vocab-games');
      return;
    }
    renderVocabGameMenu();
  } catch (e) {
    toast('Lỗi tải từ vựng: ' + (e.error || e.message), 'error');
    navigate('/vocab-games');
  }
}

function renderVocabGameMenu() {
  if (!_vocabGameData) return;
  const count    = _vocabGameData.vocabulary.length;
  const gameCount = Math.min(count, 10);
  $('#app').innerHTML = `
    <div class="container">
      <div class="page-header">
        <button class="btn-back" onclick="navigate('/vocab-games')">← Danh sách</button>
        <div class="page-title">🃏 ${escapeHtml(_vocabGameData.assignment_title)}</div>
        <div class="page-subtitle">${count} từ vựng</div>
      </div>
      <div class="vocab-mode-grid">
        <div class="vocab-mode-card" onclick="startFlashcard()">
          <div class="vocab-mode-icon">📖</div>
          <div class="vocab-mode-title">Ôn tập</div>
          <div class="vocab-mode-desc">Lật thẻ học từng từ một<br><span class="vocab-mode-tip">Space / bấm thẻ để lật · ← → để chuyển</span></div>
          <div class="vocab-mode-count">${count} thẻ</div>
        </div>
        <div class="vocab-mode-card" onclick="startMatchingGame(10)">
          <div class="vocab-mode-icon">🎮</div>
          <div class="vocab-mode-title">Test nhanh</div>
          <div class="vocab-mode-desc">Nối từ tiếng Anh với nghĩa<br><span class="vocab-mode-tip">Bấm giờ · đếm số lần sai</span></div>
          <div class="vocab-mode-count">${gameCount} cặp · ${gameCount * 2} thẻ</div>
        </div>
        <div class="vocab-mode-card" onclick="startMatchingGame(${count}, true)">
          <div class="vocab-mode-icon">🏆</div>
          <div class="vocab-mode-title">Test đầy đủ</div>
          <div class="vocab-mode-desc">Nối tất cả từ trong bài<br><span class="vocab-mode-tip">Hoàn thành để tính vào streak</span></div>
          <div class="vocab-mode-count">${count} cặp · ${count * 2} thẻ</div>
        </div>
      </div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// VOCAB GAME — FLASHCARD MODE
// ═══════════════════════════════════════════════════════════════════════════

function startFlashcard() {
  if (!_vocabGameData) return;
  _fc = { cards: [..._vocabGameData.vocabulary], idx: 0, flipped: false };
  renderFlashcard();
}

function renderFlashcard() {
  const { cards, idx, flipped } = _fc;
  const card  = cards[idx];
  const total = cards.length;

  $('#app').innerHTML = `
    <div class="container">
      <div class="page-header" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <button class="btn-back" onclick="exitFlashcard()">← Chọn chế độ</button>
        <div style="flex:1">
          <div class="page-title">📖 Ôn tập</div>
        </div>
        <div class="fc-counter">${idx + 1} / ${total}</div>
      </div>

      <div class="flashcard-scene" onclick="flipFlashcard()">
        <div class="flashcard ${flipped ? 'flipped' : ''}">
          <div class="flashcard-face flashcard-front">
            <div class="flashcard-lang">Tiếng Anh</div>
            <div class="flashcard-word">${escapeHtml(card.word)}</div>
            <div class="flashcard-hint-text">Bấm thẻ hoặc nhấn Space để xem nghĩa</div>
          </div>
          <div class="flashcard-face flashcard-back">
            <div class="flashcard-lang">Nghĩa tiếng Việt</div>
            <div class="flashcard-word">${escapeHtml(card.definition)}</div>
            ${card.example ? `<div class="flashcard-example">"${escapeHtml(card.example)}"</div>` : ''}
          </div>
        </div>
      </div>

      <div class="fc-nav">
        <button class="btn-fc-nav" onclick="fcPrev()" ${idx === 0 ? 'disabled' : ''}>← Trước</button>
        <div class="fc-progress">
          <div class="fc-progress-bar" style="width:${((idx + 1) / total * 100).toFixed(0)}%"></div>
        </div>
        <button class="btn-fc-nav" onclick="fcNext()" ${idx === total - 1 ? 'disabled' : ''}>Tiếp →</button>
      </div>

      ${idx === total - 1 ? `
        <div style="text-align:center;margin-top:20px">
          <div style="font-size:32px;margin-bottom:8px">🎉</div>
          <div style="font-weight:700;margin-bottom:12px">Bạn đã xem hết ${total} từ!</div>
          <button class="btn btn-primary" onclick="exitFlashcard()">Về menu</button>
        </div>` : ''}
    </div>`;
}

function flipFlashcard() {
  if (!_fc) return;
  _fc.flipped = !_fc.flipped;
  document.querySelector('.flashcard')?.classList.toggle('flipped');
}

function fcPrev() {
  if (!_fc || _fc.idx <= 0) return;
  _fc.idx--;
  _fc.flipped = false;
  renderFlashcard();
}

function fcNext() {
  if (!_fc || _fc.idx >= _fc.cards.length - 1) return;
  _fc.idx++;
  _fc.flipped = false;
  renderFlashcard();
}

function exitFlashcard() {
  _fc = null;
  renderVocabGameMenu();
}

// ═══════════════════════════════════════════════════════════════════════════
// VOCAB GAME — MATCHING MODE
// ═══════════════════════════════════════════════════════════════════════════

function startMatchingGame(limit = 10, fullGame = false) {
  if (!_vocabGameData) return;
  if (_match?.timerInterval) clearInterval(_match.timerInterval);

  const vocab     = _vocabGameData.vocabulary;
  const shuffled  = [...vocab].sort(() => Math.random() - 0.5);
  const pairs     = shuffled.slice(0, Math.min(limit, shuffled.length));

  const cards = [];
  pairs.forEach((v, i) => {
    cards.push({ id: `en-${i}`, pairId: i, text: v.word,       type: 'en', matched: false, selected: false });
    cards.push({ id: `vi-${i}`, pairId: i, text: v.definition, type: 'vi', matched: false, selected: false });
  });
  cards.sort(() => Math.random() - 0.5);

  _match = { cards, firstSelected: null, wrongCount: 0, startTime: Date.now(), timerInterval: null, done: false, limit, fullGame };
  _match.timerInterval = setInterval(() => {
    const el = document.getElementById('match-timer');
    if (!el) { clearInterval(_match.timerInterval); return; }
    const s = Math.floor((Date.now() - _match.startTime) / 1000);
    el.textContent = `⏱ ${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  }, 1000);

  renderMatchGame();
}

function renderMatchGame() {
  const { cards, wrongCount } = _match;
  const remaining = cards.filter(c => !c.matched).length / 2;

  $('#app').innerHTML = `
    <div class="container">
      <div class="page-header" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <button class="btn-back" onclick="exitMatchGame()">← Thoát</button>
        <div style="flex:1"><div class="page-title">🎮 Test từ vựng</div></div>
        <div class="match-stat-bar">
          <span id="match-timer">⏱ 0:00</span>
          <span class="match-stat-wrong">❌ <strong id="match-wrong-count">${wrongCount}</strong> sai</span>
          <span class="match-stat-left">Còn <strong id="match-remaining">${remaining}</strong> cặp</span>
        </div>
      </div>
      <div class="match-grid" id="match-grid">
        ${cards.map(c => `
          <div class="match-card${c.matched ? ' matched' : ''}${c.selected ? ' selected' : ''}"
               data-id="${c.id}" onclick="selectMatchCard('${c.id}')">
            <span class="match-card-text">${escapeHtml(c.text)}</span>
          </div>`).join('')}
      </div>
    </div>`;
}

function selectMatchCard(cardId) {
  if (!_match || _match.done) return;
  const card = _match.cards.find(c => c.id === cardId);
  if (!card || card.matched) return;

  // Deselect if same card clicked again
  if (_match.firstSelected?.id === cardId) {
    card.selected = false;
    _match.firstSelected = null;
    _updateMatchCardEl(card);
    return;
  }

  if (!_match.firstSelected) {
    card.selected = true;
    _match.firstSelected = card;
    _updateMatchCardEl(card);
  } else {
    const first = _match.firstSelected;
    card.selected = true;
    _updateMatchCardEl(card);

    if (first.pairId === card.pairId) {
      // Match!
      first.matched = card.matched = true;
      first.selected = card.selected = false;
      _match.firstSelected = null;
      _updateMatchCardEl(first);
      _updateMatchCardEl(card);

      const remaining = _match.cards.filter(c => !c.matched).length / 2;
      const remEl = document.getElementById('match-remaining');
      if (remEl) remEl.textContent = remaining;

      if (remaining === 0) {
        _match.done = true;
        clearInterval(_match.timerInterval);
        _showMatchFinish();
      }
    } else {
      // Wrong — flash red then deselect
      _match.wrongCount++;
      const wrongEl = document.getElementById('match-wrong-count');
      if (wrongEl) wrongEl.textContent = _match.wrongCount;

      const elA = document.querySelector(`.match-card[data-id="${first.id}"]`);
      const elB = document.querySelector(`.match-card[data-id="${card.id}"]`);
      elA?.classList.add('wrong');
      elB?.classList.add('wrong');

      setTimeout(() => {
        first.selected = card.selected = false;
        _match.firstSelected = null;
        elA?.classList.remove('wrong', 'selected');
        elB?.classList.remove('wrong', 'selected');
      }, 650);
    }
  }
}

function _updateMatchCardEl(card) {
  const el = document.querySelector(`.match-card[data-id="${card.id}"]`);
  if (!el) return;
  el.className = `match-card${card.matched ? ' matched' : ''}${card.selected ? ' selected' : ''}`;
}

function _showMatchFinish() {
  const elapsed = Math.floor((Date.now() - _match.startTime) / 1000);
  const timeStr = `${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')}`;
  const wrong   = _match.wrongCount;
  const isFullGame = !!_match.fullGame;

  if (isFullGame) {
    api.post('/student/vocab/sessions', {}).catch(() => {});
  }

  const grid = document.getElementById('match-grid');
  if (!grid) return;
  grid.outerHTML = `
    <div class="match-finish">
      <div class="match-finish-icon">🎉</div>
      <div class="match-finish-title">Hoàn thành!</div>
      ${isFullGame ? `<div class="match-finish-streak">🔥 +1 streak · Chúc mừng bạn đã hoàn thành luyện từ vựng hôm nay!</div>` : ''}
      <div class="match-finish-stats">
        <div class="match-finish-stat">
          <div class="mfs-val">⏱ ${timeStr}</div>
          <div class="mfs-label">Thời gian</div>
        </div>
        <div class="match-finish-stat">
          <div class="mfs-val">❌ ${wrong}</div>
          <div class="mfs-label">Lần chọn sai</div>
        </div>
      </div>
      <div class="match-finish-actions">
        <button class="btn btn-outline" onclick="startMatchingGame(${_match?.limit ?? 10}, ${!!_match?.fullGame})">Chơi lại</button>
        <button class="btn btn-primary" onclick="exitMatchGame()">Về menu</button>
      </div>
    </div>`;
}

function exitMatchGame() {
  if (_match?.timerInterval) clearInterval(_match.timerInterval);
  _match = null;
  renderVocabGameMenu();
}

// ═══════════════════════════════════════════════════════════════════════════
// HIGHLIGHT LOGIC
// ═══════════════════════════════════════════════════════════════════════════

function removeHighlight(el) {
  const parent = el.parentNode;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
  parent.normalize();
}

// ═══════════════════════════════════════════════════════════════════════════
// GLOBAL EXPORTS & BOOT
// ═══════════════════════════════════════════════════════════════════════════

// ═══ DARK MODE ═══
function initDarkMode() {
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  const btn = document.getElementById('dark-mode-toggle');
  if (btn) btn.textContent = saved === 'dark' ? '☀️' : '🌙';
}

function toggleDarkMode() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  const btn = document.getElementById('dark-mode-toggle');
  if (btn) btn.textContent = next === 'dark' ? '☀️' : '🌙';
}
window.toggleDarkMode = toggleDarkMode;
window.togglePasswordVisibility = togglePasswordVisibility;
window.openChangePasswordModal = openChangePasswordModal;
window.submitChangePassword = submitChangePassword;

// ═══ PAGE TRANSITIONS ═══
const _origNavigate = navigate;
function navigateWithTransition(hash) {
  const app = document.getElementById('app');
  if (app) {
    app.classList.add('page-exit');
    setTimeout(() => {
      app.classList.remove('page-exit');
      _origNavigate(hash);
    }, 120);
  } else {
    _origNavigate(hash);
  }
}

// ═══ KEYBOARD NAV ═══
document.addEventListener('keydown', (e) => {
  // Flashcard keyboard controls
  if (_fc && document.querySelector('.flashcard-scene')) {
    if (e.code === 'Space') { e.preventDefault(); flipFlashcard(); return; }
    if (e.key === 'ArrowLeft')  { fcPrev(); return; }
    if (e.key === 'ArrowRight') { fcNext(); return; }
  }
  if (e.key === 'Escape') {
    const overlay = document.querySelector('.modal-overlay:not(.hidden)');
    if (overlay) overlay.querySelector('.modal-close')?.click();
  }
});

initDarkMode();

window.navigate         = navigateWithTransition;
window.openModal        = openModal;
window.closeModal       = closeModal;
window.logout           = logout;
window.openSkillProgressModal = openSkillProgressModal;
window.setProgressRange = setProgressRange;
window.scrollProfileSection = scrollProfileSection;
window.showProgressPointTooltip = showProgressPointTooltip;
window.moveProgressTooltip = moveProgressTooltip;
window.hideProgressTooltip = hideProgressTooltip;

// Vocab game exports
window.renderVocabGameMenu = renderVocabGameMenu;
window.startFlashcard      = startFlashcard;
window.flipFlashcard       = flipFlashcard;
window.fcPrev              = fcPrev;
window.fcNext              = fcNext;
window.exitFlashcard       = exitFlashcard;
window.startMatchingGame   = startMatchingGame;
window.selectMatchCard     = selectMatchCard;
window.exitMatchGame       = exitMatchGame;
window.switchClass      = switchClass;
window.chooseClass      = chooseClass;
window.submitLogin      = submitLogin;
window.submitAnswers    = submitAnswers;
window.submitWriting    = submitWriting;
window.updateWordCount  = updateWordCount;
window.submitSpeaking   = submitSpeaking;
window.toggleRecording  = toggleRecording;
window.onFileUploaded   = onFileUploaded;
window.toggleFlag          = toggleFlag;
window.jumpToQuestion      = jumpToQuestion;
window.updateNavigatorState= updateNavigatorState;
window.audioSeek           = audioSeek;
window.autoSaveAnswers     = autoSaveAnswers;
window.autoSaveWriting     = autoSaveWriting;
window.resetRecording      = resetRecording;
window.setHistoryFilter    = setHistoryFilter;
window.changeCalMonth      = changeCalMonth;
window.selectCalDay        = selectCalDay;
window.toggleExplanation   = toggleExplanation;
window.toggleVocabItem     = toggleVocabItem;
window.locateInText        = locateInText;
window.scrollToFeedbackMark = scrollToFeedbackMark;
window.submitPractice      = submitPractice;
window.togglePracticeExp   = togglePracticeExp;

// ═══════════════════════════════════════════════════════════════════════════
// C1.1 / C1.2 — Practice Mode (Làm lại bài / Làm lại câu sai)
// ═══════════════════════════════════════════════════════════════════════════

let _practiceData = null; // { assignment, questionsToShow, attemptType, origAnswers }

async function showPractice({ id: rawId }) {
  setLoading('Đang tải...');
  // rawId may contain "?type=..." because the router splits on "/" not "?"
  const qIdx = rawId.indexOf('?');
  const id     = qIdx >= 0 ? rawId.slice(0, qIdx) : rawId;
  const params = new URLSearchParams(qIdx >= 0 ? rawId.slice(qIdx + 1) : '');
  const type   = params.get('type') === 'retry_full' ? 'retry_full' : 'retry_wrong';

  try {
    // Load from submission — it already contains questions_data + content_text + content_url
    // This avoids calling /assignments/:id/question which strips questions_data for security
    const sub = await api.get(`/submissions?assignment_id=${id}&student_id=${_student.id}`);

    if (sub.skill !== 'reading' && sub.skill !== 'listening') {
      toast('Chế độ luyện tập chỉ hỗ trợ Reading và Listening.', 'warning');
      navigate(`/result/${id}`);
      return;
    }

    // Build a pseudo-assignment object from submission data
    const assignment = {
      id:            sub.assignment_id || id,
      title:         sub.assignment_title || '',
      skill:         sub.skill,
      content_text:  sub.content_text || '',
      content_blocks: sub.content_blocks || [],
      content_url:   sub.content_url || '',
      content_urls:  sub.content_urls || [],
      questions_data: sub.questions_data || [],
    };

    let questionsToShow = assignment.questions_data;
    const origAnswers   = sub.student_answers || [];

    if (type === 'retry_wrong') {
      questionsToShow = questionsToShow.filter(q => {
        const sa    = origAnswers.find(a => a.q_no === q.q_no);
        const given = (sa?.answer || '').trim().toLowerCase();
        return !q.answers?.some(a => a.toLowerCase().trim() === given);
      });
      if (questionsToShow.length === 0) {
        toast('Không có câu sai nào để làm lại! 🎉', 'success');
        navigate(`/result/${id}`);
        return;
      }
    }

    _practiceData = { assignment, questionsToShow, attemptType: type, origAnswers };
    renderPractice();
  } catch (e) {
    toast('Lỗi tải bài: ' + (e.error || e.message), 'error');
    navigate('/assignments');
  }
}

function renderPractice() {
  const { assignment: a, questionsToShow, attemptType } = _practiceData;
  const typeLabel = attemptType === 'retry_wrong'
    ? `Làm lại câu sai (${questionsToShow.length} câu)`
    : 'Làm lại toàn bài';

  let answerRows = '';
  for (const q of questionsToShow) {
    answerRows += `
      <div class="answer-row">
        <span class="q-label">Q${q.q_no}</span>
        <input class="answer-input" id="pans-${q.q_no}" type="text" placeholder="Đáp án câu ${q.q_no}" />
      </div>`;
  }

  const qNos = questionsToShow.map(q => q.q_no).join(',');

  $('#app').innerHTML = `
    <div class="assignment-page">
      <div class="assignment-toolbar">
        <button class="btn-back" onclick="navigate('/result/${a.id}')">← Kết quả</button>
        <div class="assignment-toolbar-title">${skillBadge(a.skill)} ${escapeHtml(a.title)} — ${typeLabel}</div>
        <button class="btn btn-primary btn-sm" id="submit-btn"
          onclick="submitPractice('${a.id}', this)">Kiểm tra</button>
      </div>
      <div style="background:#fef3c7;border-bottom:1px solid #fbbf24;padding:8px 16px;font-size:12px;color:#92400e;display:flex;align-items:center;gap:6px">
        🔄 Chế độ luyện tập — kết quả <strong>không ghi điểm</strong> vào hồ sơ chính
      </div>
      <div class="assignment-content">
        <div class="content-pane" id="practice-content-pane">
          ${a.skill === 'listening' ? renderListeningAudioHtml(a) : ''}
          <div class="section-title">${a.skill === 'listening' ? 'Câu hỏi' : 'Bài đọc & Câu hỏi'}</div>
          <div class="reading-text" id="practice-reading-text">${renderQuestionContentHTML(a.content_blocks, a.content_text || '')}</div>
        </div>
        <div class="answer-pane">
          <div style="font-size:12px;color:var(--gray-400);margin-bottom:12px">Điền đáp án cho ${questionsToShow.length} câu và bấm <strong>Kiểm tra</strong>.</div>
          <input type="hidden" id="practice-q-nos" value="${qNos}" />
          ${answerRows || '<div class="empty-hint">Không có câu nào.</div>'}
        </div>
      </div>
    </div>`;
}

async function submitPractice(assignmentId, btn) {
  const { assignment, questionsToShow, attemptType } = _practiceData || {};
  if (!questionsToShow) return;

  const answers = questionsToShow.map(q => ({
    q_no:   q.q_no,
    answer: ($(`#pans-${q.q_no}`)?.value || '').trim(),
  }));

  btnLoading(btn);
  try {
    const result = await api.post('/practice/submit', {
      student_id:     _student.id,
      assignment_id:  assignmentId,
      attempt_type:   attemptType,
      student_answers: answers,
    });
    renderPracticeResult(result, questionsToShow, answers);
  } catch (e) {
    btnReset(btn);
    toast('Lỗi: ' + (e.error || e.message), 'error');
  }
}

function renderPracticeResult(result, questionsToShow, answers) {
  const qData = result.questions_data || [];
  const rows = questionsToShow.map(q => {
    const fullQ  = qData.find(x => x.q_no === q.q_no) || q;
    const sa     = answers.find(a => a.q_no === q.q_no);
    const given  = (sa?.answer || '').trim();
    const correct = fullQ.answers?.some(a => a.toLowerCase().trim() === given.toLowerCase());
    const expRow  = fullQ.explanation ? `
      <tr class="explanation-row hidden" id="pexp-q${q.q_no}">
        <td colspan="5">
          <div class="explanation-content"><span class="explanation-label">💡 Giải thích:</span>${escapeHtml(fullQ.explanation)}</div>
        </td>
      </tr>` : '';
    return `
      <tr>
        <td style="font-weight:700;color:var(--gray-400)">Q${q.q_no}</td>
        <td>${escapeHtml(given) || '<em style="color:var(--gray-400)">Bỏ trống</em>'}</td>
        <td>${escapeHtml((fullQ.answers || []).join(' / '))}</td>
        <td class="${correct ? 'result-correct' : 'result-wrong'}">${correct ? '✓' : '✗'}</td>
        <td class="result-actions">${fullQ.explanation ? `<button class="btn-result-action btn-result-explain" onclick="togglePracticeExp('pexp-q${q.q_no}')">Explain</button>` : ''}${fullQ.location ? `<button class="btn-result-action btn-result-locate" data-locate="${escapeHtml(fullQ.location)}" data-locate-meta="${escapeAttrJson(fullQ.location_meta)}" onclick="locatePracticeText(this.dataset.locate, this.dataset.locateMeta)">Locate</button>` : ''}</td>
      </tr>${expRow}`;
  }).join('');

  const correct = result.correct_count;
  const total   = result.total_count || questionsToShow.length;

  $('#app').innerHTML = `
    <div class="assignment-page">
      <div class="assignment-toolbar">
        <button class="btn-back" onclick="navigate('/result/${result.assignment_id || ''}')">← Kết quả chính</button>
        <div class="assignment-toolbar-title">Kết quả luyện tập</div>
        <button class="btn btn-outline btn-sm" onclick="renderPractice()">🔄 Làm lại</button>
      </div>
      <div style="background:#fef3c7;border-bottom:1px solid #fbbf24;padding:8px 16px;font-size:12px;color:#92400e">
        🔄 Chế độ luyện tập — không ghi điểm chính thức
      </div>
      <div class="assignment-content">
        <div class="content-pane" id="practice-content-pane">
          ${_practiceData?.assignment?.skill === 'listening' ? renderListeningAudioHtml(_practiceData.assignment) : ''}
          <div class="reading-text" id="practice-reading-text">${renderQuestionContentHTML(_practiceData?.assignment?.content_blocks, _practiceData?.assignment?.content_text || '')}</div>
        </div>
        <div class="answer-pane">
          <div class="result-header" style="margin-bottom:16px">
            <div class="score-display" style="margin-top:0">
              <div class="score-number">${correct}</div>
              <div class="score-band">/ ${total} đúng</div>
            </div>
            <div class="result-stats">
              <div class="stat-item"><div class="stat-value" style="color:var(--success)">${correct}</div><div class="stat-label">Đúng</div></div>
              <div class="stat-item"><div class="stat-value" style="color:var(--danger)">${total - correct}</div><div class="stat-label">Sai</div></div>
            </div>
          </div>
          <div class="section-label">Chi tiết đáp án</div>
          <div class="result-answers">
            <table class="result-table">
              <thead><tr><th>Câu</th><th>Bạn trả lời</th><th>Đáp án đúng</th><th>Kết quả</th><th></th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>`;
}

function togglePracticeExp(id) {
  const row = document.getElementById(id);
  if (row) row.classList.toggle('hidden');
}

function locatePracticeText(searchText, metaRaw = '') {
  if (!searchText) return;
  const container = document.getElementById('practice-reading-text');
  if (!container) { locateInText(searchText, metaRaw); return; }
  if (locateByMeta(container, metaRaw)) return;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  let node;
  while ((node = walker.nextNode())) {
    const idx = node.textContent.toLowerCase().indexOf(searchText.toLowerCase());
    if (idx < 0) continue;
    const range = document.createRange();
    range.setStart(node, idx);
    range.setEnd(node, idx + searchText.length);
    const mark = document.createElement('mark');
    mark.className = 'locate-flash';
    try { range.surroundContents(mark); } catch { continue; }
    mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      const parent = mark.parentNode;
      if (parent) {
        const text = document.createTextNode(mark.textContent);
        parent.replaceChild(text, mark);
      }
    }, 2000);
    return;
  }
  toast('Không tìm thấy đoạn tham chiếu.', 'warning');
}
window.locatePracticeText = locatePracticeText;

loadAuth();

// If any API call returns 401 (missing or expired JWT), clear session and go to login
window.addEventListener('auth:expired', () => {
  clearAuth();
  navigate('/login');
});

router();
