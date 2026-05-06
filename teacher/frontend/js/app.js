// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function $(sel) { return document.querySelector(sel); }

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (window.innerWidth <= 768) {
    // On mobile: use overlay mode
    openMobileSidebar();
    return;
  }
  const collapsed = sidebar.classList.toggle('sidebar--collapsed');
  localStorage.setItem('sidebar-collapsed', collapsed ? '1' : '0');
}

function openMobileSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  sidebar?.classList.add('sidebar--mobile-open');
  backdrop?.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeMobileSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  sidebar?.classList.remove('sidebar--mobile-open');
  backdrop?.classList.remove('active');
  document.body.style.overflow = '';
}

window.openMobileSidebar  = openMobileSidebar;
window.closeMobileSidebar = closeMobileSidebar;

(function initSidebar() {
  if (localStorage.getItem('sidebar-collapsed') === '1') {
    document.getElementById('sidebar')?.classList.add('sidebar--collapsed');
  }
})();

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderMarkdownInline(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
}

function renderSafeMarkdown(markdown) {
  const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let listType = null;
  const closeList = () => {
    if (!listType) return;
    html.push(`</${listType}>`);
    listType = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      closeList();
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.+)$/);
    const numbered = line.match(/^\d+\.\s+(.+)$/);
    if (bullet || numbered) {
      const nextListType = bullet ? 'ul' : 'ol';
      if (listType !== nextListType) {
        closeList();
        html.push(`<${nextListType}>`);
        listType = nextListType;
      }
      html.push(`<li>${renderMarkdownInline((bullet || numbered)[1])}</li>`);
      continue;
    }

    closeList();
    const heading = line.match(/^(#{2,4})\s+(.+)$/);
    if (heading) {
      html.push(`<h5>${renderMarkdownInline(heading[2])}</h5>`);
    } else {
      html.push(`<p>${renderMarkdownInline(line)}</p>`);
    }
  }

  closeList();
  return html.join('');
}

function btnLoading(btn) {
  if (!btn) return;
  btn._origHTML = btn.innerHTML;
  btn.disabled = true;
  const isIcon = btn.classList.contains('btn-icon');
  btn.innerHTML = isIcon
    ? '<span class="btn-spinner btn-spinner--dark"></span>'
    : '<span class="btn-spinner"></span> Đang xử lý...';
}

function btnReset(btn) {
  if (!btn) return;
  btn.disabled = false;
  btn.innerHTML = btn._origHTML || btn.innerHTML;
}

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

function renderRouteError(title, error, retryHash = window.location.hash.slice(1) || '/classes') {
  const message = error?.error || error?.message || 'Không thể tải dữ liệu. Vui lòng thử lại.';
  $('#app').innerHTML = `
    <div class="empty-state-v2 route-error-state">
      <span class="empty-illu">⚠️</span>
      <div class="empty-title">${escapeHtml(title)}</div>
      <div class="empty-desc">${escapeHtml(message)}</div>
      <div class="route-error-actions">
        <button class="btn btn-primary" onclick="router()">Thử lại</button>
        <button class="btn btn-outline" onclick="navigate('/classes')">Về lớp học</button>
      </div>
    </div>`;
  if (retryHash) window._lastFailedRoute = retryHash;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
}

function formatDateTime(iso) {
  if (!iso) return 'Không có hạn';
  const d = new Date(iso);
  return d.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function isOverdue(iso) {
  if (!iso) return false;
  return new Date(iso) < new Date();
}

const SKILL_LABELS = {
  reading:   { icon: '📖', label: 'Reading',   badge: 'badge-reading' },
  listening: { icon: '🎧', label: 'Listening', badge: 'badge-listening' },
  writing:   { icon: '✍️',  label: 'Writing',   badge: 'badge-writing' },
  speaking:  { icon: '🎤', label: 'Speaking',  badge: 'badge-speaking' },
};

function skillBadge(skill) {
  const s = SKILL_LABELS[skill] || { icon: '?', label: skill, badge: '' };
  return `<span class="badge ${s.badge}">${s.icon} ${s.label}</span>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

function openModal(title, bodyHtml) {
  $('#modal-title').textContent = title;
  $('#modal-body').innerHTML = bodyHtml;
  $('#modal-overlay').classList.remove('hidden');
}

let _oneTimeStudentCredentials = null;

function closeModal(event) {
  if (event && event.target !== $('#modal-overlay')) return;
  _oneTimeStudentCredentials = null;
  $('#modal-overlay').classList.add('hidden');
  $('#modal-body').innerHTML = '';
}

function csvEscape(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function downloadCsvFile(filename, header, rows) {
  const csv = [header, ...rows].map(row => row.map(csvEscape).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function buildStudentCredentialsFilename(prefix = 'student_accounts') {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  return `${prefix}_${stamp}.csv`;
}

function openStudentCredentialsModal(title, credentials, filePrefix = 'student_accounts') {
  const rows = (Array.isArray(credentials) ? credentials : [])
    .map(item => ({
      full_name: String(item?.full_name || '').trim(),
      username: String(item?.username || '').trim(),
      password: String(item?.password || ''),
    }))
    .filter(item => item.full_name && item.username && item.password);

  _oneTimeStudentCredentials = rows.length > 0
    ? { rows, fileName: buildStudentCredentialsFilename(filePrefix) }
    : null;

  openModal(title, `
    <div style="padding:2px 0 6px">
      <div style="margin-bottom:14px;padding:12px 14px;border-radius:12px;background:#fff7e6;border:1px solid #f6d38b;color:#7a5600;font-size:13px;line-height:1.5">
        Thông tin đăng nhập này chỉ hiển thị đúng 1 lần. Hãy tải file hoặc gửi lại cho học sinh ngay bây giờ.
      </div>
      <div style="max-height:320px;overflow:auto;border:1px solid var(--gray-200);border-radius:14px">
        <table>
          <thead>
            <tr><th>Họ và tên</th><th>Username</th><th>Password</th></tr>
          </thead>
          <tbody>
            ${rows.map(item => `
              <tr>
                <td>${escapeHtml(item.full_name)}</td>
                <td style="font-family:monospace">${escapeHtml(item.username)}</td>
                <td style="font-family:monospace">${escapeHtml(item.password)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">Đóng</button>
      <button class="btn btn-primary" onclick="downloadStudentCredentialsCsv()">📥 Tải CSV</button>
    </div>`);
}

function downloadStudentCredentialsCsv() {
  if (!_oneTimeStudentCredentials?.rows?.length) return;
  downloadCsvFile(
    _oneTimeStudentCredentials.fileName,
    ['Họ tên', 'Username', 'Password'],
    _oneTimeStudentCredentials.rows.map(item => [item.full_name, item.username, item.password]),
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CHIP INPUT SYSTEM (for answers)
// ═══════════════════════════════════════════════════════════════════════════

function addChip(container, value) {
  if (!value.trim()) return;
  const chip = document.createElement('span');
  chip.className = 'chip';
  chip.dataset.value = value.trim();
  chip.innerHTML = `${value.trim()} <button class="chip-remove" title="Xoá">×</button>`;
  chip.querySelector('.chip-remove').onclick = () => chip.remove();
  const input = container.querySelector('.chip-input');
  container.insertBefore(chip, input);
}

function getChipValues(container) {
  return Array.from(container.querySelectorAll('.chip')).map(c => c.dataset.value);
}

function _chipKeydown(e) {
  if (e.isComposing || e.keyCode === 229) return;
  if (e.key === 'Enter' && e.target.value.trim()) {
    e.preventDefault();
    addChip(e.target.parentElement, e.target.value.trim());
    e.target.value = '';
  }
}

function attachChipListeners() {
  document.querySelectorAll('.chip-input').forEach(input => {
    input.removeEventListener('keydown', _chipKeydown);
    input.addEventListener('keydown', _chipKeydown);
  });
}

function collectAnswerGrid() {
  const rows = document.querySelectorAll('#answer-grid .answer-row');
  return Array.from(rows).map((row, idx) => {
    const container = row.querySelector('.chip-container');
    const answers = getChipValues(container);
    const location = row.querySelector('.answer-location')?.value.trim() || '';
    const locationMetaRaw = row.querySelector('.answer-location-meta')?.value.trim() || '';
    const explanation = row.querySelector('.answer-explanation')?.value.trim() || '';
    const item = { q_no: idx + 1, answers };
    if (location) item.location = location;
    if (locationMetaRaw) {
      try { item.location_meta = JSON.parse(locationMetaRaw); } catch {}
    }
    if (explanation) item.explanation = explanation;
    return item;
  });
}

function renderAnswerGrid(count) {
  const grid = $('#answer-grid');
  if (!grid) return;
  grid.innerHTML = '';
  for (let i = 1; i <= count; i++) {
    const row = document.createElement('div');
    row.className = 'answer-row';
    row.innerHTML = `
      <div class="answer-row-main">
        <span class="q-label">Q${i}</span>
        <div class="chip-container">
          <input class="chip-input" placeholder="Đáp án + Enter" />
        </div>
      </div>
      <div class="location-row">
        <span class="field-section-label">📍 Vị trí:</span>
        <span class="location-text-display">Chưa chọn</span>
        <input type="hidden" class="answer-location" value="" />
        <input type="hidden" class="answer-location-meta" value="" />
        <button class="btn-clear-location hidden" onclick="clearLocationValue(this.closest('.answer-row'))">×</button>
        <button class="btn-pick-location" onclick="activateLocationPick(this.closest('.answer-row'))">Chọn</button>
      </div>
      <div class="explanation-row">
        <span class="field-section-label">💡 Giải thích:</span>
        <textarea class="answer-explanation" rows="2" placeholder="Nhập giải thích đáp án..."></textarea>
      </div>`;
    grid.appendChild(row);
  }
  attachChipListeners();
}

// ═══════════════════════════════════════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════════════════════════════════════

const routes = {
  '/classes':          showClasses,
  '/class/:id':        showClassDetail,
  '/assignment/:id':   showAssignmentSubmissions,
  '/grading/:id':      showGradingPage,
  '/questions':        showQuestions,
  '/questions/new':    showQuestionForm,
  '/questions/:id':    showQuestionDetail,
  '/inbox':            showInbox,
  '/profile-fields':   showProfileFields,
};

const routeLoadingMessages = {
  '/classes':          'Đang tải danh sách lớp...',
  '/class/:id':        'Đang tải thông tin lớp...',
  '/assignment/:id':   'Đang tải danh sách bài nộp...',
  '/grading/:id':      'Đang tải bài làm...',
  '/questions':        'Đang tải kho đề...',
  '/questions/new':    'Đang mở form tạo đề...',
  '/questions/:id':    'Đang tải đề...',
  '/inbox':            'Đang tải hộp thư...',
  '/profile-fields':   'Đang tải hồ sơ học sinh...',
};

function navigate(hash) {
  closeMobileSidebar();
  window.location.hash = hash;
}

function router() {
  const hash = window.location.hash.slice(1) || '/classes';
  try {
    hideTableFloatToolbar();
    _activeTableCell = null;

    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
      const route = link.dataset.route;
      link.classList.toggle('active',
        (route === 'classes' && hash.startsWith('/class')) ||
        (route === 'questions' && hash.startsWith('/question'))
      );
    });

    // Match routes
    for (const [pattern, handler] of Object.entries(routes)) {
      const params = matchRoute(pattern, hash);
      if (params !== null) {
        const loadingMsg = routeLoadingMessages[pattern];
        if (loadingMsg) setLoading(loadingMsg);
        const result = handler(params);
        if (result && typeof result.catch === 'function') {
          result.catch(e => {
            console.error('Route error:', e);
            renderRouteError('Không tải được trang', e, hash);
          });
        }
        return;
      }
    }

    // Fallback
    setLoading(routeLoadingMessages['/classes']);
    showClasses({});
  } catch (e) {
    console.error('Router boot error:', e);
    renderRouteError('Không mở được trang', e, hash);
  }
}

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

window.addEventListener('hashchange', router);

// ═══════════════════════════════════════════════════════════════════════════
// PAGE: CLASSES LIST
// ═══════════════════════════════════════════════════════════════════════════
// PAGE: INBOX (B4.8)
// ═══════════════════════════════════════════════════════════════════════════

async function showInbox() {
  setLoading('Đang tải hộp thư...');
  try {
    const items = await api.get('/inbox');
    renderInbox(items);
    // Update badge in sidebar
    updateInboxBadge(items.length);
  } catch (e) {
    toast('Lỗi tải inbox: ' + (e.error || e.message), 'error');
    renderRouteError('Không tải được hộp thư', e, '/inbox');
  }
}

function renderInbox(items) {
  const rows = items.length === 0
    ? `<div class="empty-state-v2">
        <span class="empty-illu">✅</span>
        <div class="empty-title">Không có bài nào cần chấm!</div>
        <div class="empty-desc">Tất cả bài Writing và Speaking đã được chấm xong.</div>
      </div>`
    : items.map(it => `
      <div class="inbox-row">
        <div class="inbox-skill">${skillBadge(it.skill)}</div>
        <div class="inbox-info">
          <div class="inbox-student"><strong>${escapeHtml(it.student_name)}</strong></div>
          <div class="inbox-meta">${escapeHtml(it.assignment_title)} · <span class="inbox-class">${escapeHtml(it.class_name)}</span></div>
          <div class="inbox-time">${formatDateTime(it.submitted_at)}</div>
        </div>
        <button class="btn btn-sm btn-primary inbox-grade-btn"
          onclick="navigate('/grading/${it.submission_id}')">✏️ Chấm bài</button>
      </div>`).join('');

  $('#app').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">📥 Hộp thư cần chấm</div>
        <div class="page-subtitle">${items.length} bài Writing/Speaking chưa chấm điểm</div>
      </div>
    </div>
    <div class="inbox-list">${rows}</div>`;
}

function updateInboxBadge(count) {
  const badge = document.getElementById('inbox-badge');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : count;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}
window.updateInboxBadge = updateInboxBadge;

async function refreshInboxBadge() {
  try {
    const items = await api.get('/inbox');
    updateInboxBadge(items.length);
  } catch {}
}

// ═══════════════════════════════════════════════════════════════════════════

async function showClasses() {
  setLoading('Đang tải danh sách lớp...');
  try {
    const classes = await api.get('/classes');
    renderClasses(classes);
  } catch (e) {
    toast('Lỗi tải danh sách lớp: ' + (e.error || e.message), 'error');
    renderRouteError('Không tải được danh sách lớp', e, '/classes');
  }
}

function renderClasses(classes) {
  _allClasses = classes;
  _applyClassFilter();
}

function _applyClassFilter() {
  const classes = _allClasses;
  let list = classes.filter(c =>
    c.class_name.toLowerCase().includes(_classSearch.toLowerCase()) ||
    (c.description || '').toLowerCase().includes(_classSearch.toLowerCase())
  );
  if (_classSort === 'name') list = list.slice().sort((a, b) => a.class_name.localeCompare(b.class_name));
  else if (_classSort === 'students') list = list.slice().sort((a, b) => b.student_count - a.student_count);

  const emptyState = `
    <div class="empty-state">
      <div class="empty-state-icon">🏫</div>
      <h3>${_classSearch ? 'Không tìm thấy lớp nào' : 'Chưa có lớp học nào'}</h3>
      <p>${_classSearch ? 'Thử tìm kiếm với từ khóa khác.' : 'Tạo lớp đầu tiên để bắt đầu giao bài cho học sinh.'}</p>
      ${!_classSearch ? `<button class="btn btn-primary" onclick="openCreateClassModal()">+ Tạo lớp học mới</button>` : ''}
    </div>`;

  const cardsHtml = list.map(cls => {
    const completionPct = cls.student_count > 0
      ? Math.round((cls.submitted_student_count / cls.student_count) * 100)
      : 0;
    const deadlineChip = cls.upcoming_deadline_count > 0
      ? `<span class="card-deadline-chip">⚠️ ${cls.upcoming_deadline_count} bài sắp hạn</span>`
      : '';
    // B4.9 — quick filter "Cần chấm"
    const pendingChip = cls.pending_grading_count > 0
      ? `<span class="card-pending-chip" title="Bài Writing/Speaking chưa chấm">📝 ${cls.pending_grading_count} cần chấm</span>`
      : '';
    return `
    <div class="card" onclick="navigate('/class/${cls.id}')">
      <div class="card-icon">🏫</div>
      <div class="card-name">${escapeHtml(cls.class_name)}</div>
      <div class="card-desc">${escapeHtml(cls.description || 'Chưa có mô tả')}</div>
      <div class="card-meta">
        <span class="card-meta-item">👤 ${cls.student_count} học sinh</span>
        <span class="card-meta-item">📋 ${cls.assignment_count} bài tập</span>
        ${deadlineChip}
        ${pendingChip}
      </div>
      ${cls.student_count > 0 ? `
      <div class="card-progress">
        <div class="card-progress-label">Đã nộp ít nhất 1 bài: ${cls.submitted_student_count}/${cls.student_count} HS</div>
        <div class="card-progress-bar"><div class="card-progress-fill" style="width:${completionPct}%"></div></div>
      </div>` : ''}
    </div>`;
  }).join('');

  const contentHtml = list.length === 0 ? emptyState : `<div class="cards-grid">${cardsHtml}</div>`;

  // If the classes page is already rendered, only update the content area
  // (not the toolbar) so the search input keeps focus between keystrokes.
  const existingContent = document.getElementById('classes-content');
  if (existingContent) {
    existingContent.innerHTML = contentHtml;
    return;
  }

  // Full initial render
  $('#app').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Lớp học</div>
        <div class="page-subtitle">Quản lý các lớp và giao bài tập</div>
      </div>
      <button class="btn btn-primary" onclick="openCreateClassModal()">
        + Tạo lớp mới
      </button>
    </div>
    <div class="list-toolbar">
      <input id="class-search-input" class="form-input search-input"
        placeholder="🔍 Tìm kiếm lớp..."
        value="${escapeHtml(_classSearch)}" />
      <select id="class-sort-select" class="form-input sort-select">
        <option value="newest" ${_classSort==='newest'?'selected':''}>Mới nhất</option>
        <option value="name"    ${_classSort==='name'?'selected':''}>Tên A-Z</option>
        <option value="students" ${_classSort==='students'?'selected':''}>Nhiều HS nhất</option>
      </select>
    </div>
    <div id="classes-content">${contentHtml}</div>`;

  // Attach listeners after DOM is created
  const searchInput = document.getElementById('class-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      _classSearch = searchInput.value;
      _applyClassFilter();
    });
  }
  const sortSelect = document.getElementById('class-sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      _classSort = sortSelect.value;
      _applyClassFilter();
    });
  }
}
window._applyClassFilter = _applyClassFilter;

function openCreateClassModal() {
  openModal('Tạo lớp học mới', `
    <div class="form-group">
      <label class="form-label">Tên lớp <span style="color:var(--danger)">*</span></label>
      <input id="cls-name" class="form-input" placeholder="VD: IELTS 5.5 - Tháng 4/2025" />
    </div>
    <div class="form-group">
      <label class="form-label">Mô tả</label>
      <input id="cls-desc" class="form-input" placeholder="VD: Lớp luyện thi IELTS band 5.5" />
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="submitCreateClass(this)">Tạo lớp</button>
    </div>`);
  setTimeout(() => $('#cls-name')?.focus(), 50);
}

async function submitCreateClass(btn) {
  const name = $('#cls-name').value.trim();
  const desc = $('#cls-desc').value.trim();
  if (!name) { toast('Vui lòng nhập tên lớp', 'error'); return; }
  btnLoading(btn);
  try {
    await api.post('/classes', { class_name: name, description: desc });
    closeModal();
    toast('Tạo lớp thành công!');
    showClasses();
  } catch (e) {
    btnReset(btn);
    toast('Lỗi: ' + (e.error || 'Không thể tạo lớp'), 'error');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGE: CLASS DETAIL
// ═══════════════════════════════════════════════════════════════════════════

async function showClassDetail({ id }) {
  setLoading('Đang tải thông tin lớp...');
  try {
    const [cls, students] = await Promise.all([
      api.get(`/classes/${id}`),
      api.get(`/classes/${id}/students`),
    ]);
    _cachedCls = cls;
    _cachedStudents = students;
    _classDetailTab = 'assignments';
    _assignFilterSkill = '';
    _assignFilterSearch = '';
    renderClassDetail(cls, students);
  } catch (e) {
    toast('Lỗi tải lớp: ' + (e.error || e.message), 'error');
    renderRouteError('Không tải được thông tin lớp', e, `/class/${id}`);
  }
}

function switchClassTab(tab) {
  _classDetailTab = tab;
  document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
  const el = document.getElementById(`tab-${tab}`);
  if (el) el.style.display = '';
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
}
window.switchClassTab = switchClassTab;

function renderClassDetail(cls, students = []) {
  const assignRows = cls.assignments.length === 0
    ? `<tr><td colspan="6">
        <div class="empty-state" style="padding:30px">
          <div class="empty-state-icon">📋</div>
          <h3>Chưa có bài tập nào</h3>
          <p>Nhấn "Giao bài mới" để assign đề cho lớp này.</p>
        </div>
       </td></tr>`
    : cls.assignments.map(a => {
        const overdue = isOverdue(a.deadline) && a.is_active;
        const pct = cls.student_count > 0 ? Math.round(a.submission_count / cls.student_count * 100) : 0;
        return `
        <tr>
          <td>${skillBadge(a.skill)}</td>
          <td style="font-weight:600">${escapeHtml(a.title)}</td>
          <td style="color:var(--gray-400);font-size:12px">${escapeHtml(a.question_title)}</td>
          <td>
            <span class="deadline${overdue ? ' overdue' : ''}">
              ${overdue ? '⚠️ ' : ''}${formatDateTime(a.deadline)}
            </span>
          </td>
          <td>
            <label class="toggle" title="${a.is_active ? 'Đang mở' : 'Đã đóng'}">
              <input type="checkbox" ${a.is_active ? 'checked' : ''}
                onchange="toggleAssignment('${a.id}', this.checked)" />
              <span class="toggle-slider"></span>
            </label>
          </td>
          <td>
            <div class="td-actions">
              <button class="btn btn-sm btn-outline" title="Xem bài nộp"
                onclick="navigate('/assignment/${a.id}')">
                <span class="sub-progress-wrap">
                  <span class="sub-progress-bar" style="width:${pct}%"></span>
                </span>
                📊 ${a.submission_count}/${cls.student_count} nộp
              </button>
              <button class="btn-icon danger" title="Xoá"
                onclick="deleteAssignment('${a.id}', '${cls.id}', this)">🗑</button>
            </div>
          </td>
        </tr>`;
      }).join('');

  const studentRows = students.length === 0
    ? `<tr><td colspan="4">
        <div class="empty-state" style="padding:24px">
          <div class="empty-state-icon">👤</div>
          <h3 style="font-size:14px">Chưa có học sinh nào</h3>
          <p style="font-size:12px">Nhấn "Thêm học sinh" để tạo tài khoản cho học sinh.</p>
        </div>
       </td></tr>`
    : students.map(s => `
        <tr data-student-id="${s.id}">
          <td style="width:36px">
            <input type="checkbox" class="student-bulk-check" data-sid="${s.id}"
              onchange="updateBulkBar('${cls.id}')" />
          </td>
          <td>
            <div style="display:flex;align-items:center;gap:8px">
              <span class="student-avatar">${escapeHtml(s.full_name.charAt(0).toUpperCase())}</span>
              <button class="btn-student-profile" data-sid="${s.id}" data-sname="${escapeHtml(s.full_name)}"
                onclick="openStudentProfileModal(this.dataset.sid, this.dataset.sname)">
                ${escapeHtml(s.full_name)} <span class="btn-sp-icon">👁</span>
              </button>
            </div>
          </td>
          <td style="color:var(--gray-400);font-size:12px;font-family:monospace">${escapeHtml(s.username)}</td>
          <td>
            <div class="td-actions">
              <button class="btn btn-sm btn-outline" title="Đổi mật khẩu"
                onclick="openResetPasswordModal('${s.id}', '${s.full_name.replace(/'/g, "\\'")}', this)">🔑 Đổi MK</button>
              <button class="btn-icon danger" title="Xoá khỏi lớp này"
                onclick="removeStudentFromClass('${s.id}', '${cls.id}', this)">🗑</button>
            </div>
          </td>
        </tr>`).join('');

  // T13 — stats by skill
  const skillStats = ['reading','listening','writing','speaking'].map(skill => {
    const list = cls.assignments.filter(a => a.skill === skill);
    if (list.length === 0) return null;
    const totalSubs = list.reduce((s, a) => s + (a.submission_count || 0), 0);
    const maxPossible = list.length * (cls.student_count || 1);
    const pct = Math.round(totalSubs / maxPossible * 100);
    return { skill, count: list.length, pct };
  }).filter(Boolean);

  const statsHtml = skillStats.length === 0
    ? `<div class="empty-state" style="padding:40px"><p>Chưa có dữ liệu thống kê</p></div>`
    : `<div class="stats-skill-chart">
        ${skillStats.map(s => `
          <div class="stats-skill-row">
            <div class="stats-skill-label">${skillBadge(s.skill)}</div>
            <div class="stats-bar-wrap">
              <div class="stats-bar-fill" style="width:${s.pct}%"></div>
            </div>
            <div class="stats-pct">${s.pct}% nộp (${s.count} bài tập)</div>
          </div>`).join('')}
      </div>
      <div class="stats-summary">
        <div class="stats-summary-item"><strong>${cls.assignments.length}</strong> bài tập tổng</div>
        <div class="stats-summary-item"><strong>${students.length}</strong> học sinh</div>
        <div class="stats-summary-item"><strong>${cls.assignments.reduce((s,a) => s+(a.submission_count||0), 0)}</strong> lượt nộp</div>
      </div>`;

  const clsNameSafe = cls.class_name.replace(/'/g, "\\'");

  $('#app').innerHTML = `
    <nav class="breadcrumb">
      <a class="breadcrumb-item" onclick="navigate('/classes')">Lớp học</a>
      <span class="breadcrumb-sep">›</span>
      <span class="breadcrumb-item active">${escapeHtml(cls.class_name)}</span>
    </nav>

    <div class="detail-header">
      <div class="detail-header-info">
        <h2>🏫 ${escapeHtml(cls.class_name)}</h2>
        <div class="detail-header-meta">
          <span>👤 ${cls.student_count} học sinh</span>
          <span>📅 Tạo ngày ${formatDate(cls.created_at)}</span>
          ${cls.description ? `<span>📝 ${escapeHtml(cls.description)}</span>` : ''}
        </div>
      </div>
      <button class="btn btn-primary"
        onclick="openAssignModal('${cls.id}', '${clsNameSafe}')">
        + Giao bài mới
      </button>
    </div>

    <div class="tab-bar">
      <button class="tab-btn active" data-tab="assignments" onclick="switchClassTab('assignments')">📋 Bài tập (${cls.assignments.length})</button>
      <button class="tab-btn" data-tab="students" onclick="switchClassTab('students')">👤 Học sinh (${students.length})</button>
      <button class="tab-btn" data-tab="stats" onclick="switchClassTab('stats')">📊 Thống kê</button>
    </div>

    <div id="tab-assignments" class="tab-content">
      ${cls.assignments.length > 0 ? `
      <div class="assign-filter-bar">
        <input class="form-input assign-filter-search" placeholder="🔍 Tìm theo tên bài..."
          oninput="filterAssignments(this.value, null)" />
        <div class="assign-skill-pills">
          <button class="assign-skill-pill active" data-skill="" onclick="filterAssignments(null, '')">Tất cả</button>
          <button class="assign-skill-pill" data-skill="reading" onclick="filterAssignments(null, 'reading')">📖 Reading</button>
          <button class="assign-skill-pill" data-skill="listening" onclick="filterAssignments(null, 'listening')">🎧 Listening</button>
          <button class="assign-skill-pill" data-skill="writing" onclick="filterAssignments(null, 'writing')">✍️ Writing</button>
          <button class="assign-skill-pill" data-skill="speaking" onclick="filterAssignments(null, 'speaking')">🎤 Speaking</button>
        </div>
      </div>` : ''}
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Kỹ năng</th><th>Tên bài tập</th><th>Đề</th>
            <th>Hạn nộp</th><th>Mở/Đóng</th><th>Thao tác</th>
          </tr></thead>
          <tbody id="assign-tbody">${assignRows}</tbody>
        </table>
      </div>
    </div>

    <div id="tab-students" class="tab-content" style="display:none">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div id="bulk-action-bar" class="bulk-action-bar hidden">
          <span id="bulk-count-label" class="bulk-count-label">0 đã chọn</span>
          <button class="btn btn-sm btn-outline" onclick="bulkRemoveStudents('${cls.id}')">🗑 Xoá khỏi lớp</button>
          <button class="btn btn-sm btn-outline" onclick="bulkExportCSV('${cls.id}')">📥 Export CSV</button>
          <button class="btn btn-sm btn-outline" onclick="deselectAll()">✕ Bỏ chọn</button>
        </div>
        <div style="flex:1"></div>
        <button class="btn btn-outline" onclick="openAddStudentModal('${cls.id}')">+ Thêm học sinh</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th style="width:36px"><input type="checkbox" id="select-all-students" onchange="toggleSelectAllStudents(this, '${cls.id}')" title="Chọn tất cả" /></th>
            <th>Họ tên</th><th>Username</th><th>Thao tác</th>
          </tr></thead>
          <tbody>${studentRows}</tbody>
        </table>
      </div>
    </div>

    <div id="tab-stats" class="tab-content" style="display:none">
      ${statsHtml}
    </div>`;
}

let _assignFilterSkill = '';
let _assignFilterSearch = '';

function filterAssignments(search, skill) {
  if (search !== null) _assignFilterSearch = search.toLowerCase().trim();
  if (skill !== null) {
    _assignFilterSkill = skill;
    document.querySelectorAll('.assign-skill-pill').forEach(b => {
      b.classList.toggle('active', b.dataset.skill === skill);
    });
  }
  const cls = _cachedCls;
  if (!cls) return;
  const filtered = cls.assignments.filter(a => {
    const matchSkill  = !_assignFilterSkill || a.skill === _assignFilterSkill;
    const matchSearch = !_assignFilterSearch ||
      a.title.toLowerCase().includes(_assignFilterSearch) ||
      (a.question_title || '').toLowerCase().includes(_assignFilterSearch);
    return matchSkill && matchSearch;
  });

  const tbody = document.getElementById('assign-tbody');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">
      <div class="empty-state" style="padding:20px">
        <div class="empty-state-icon">🔍</div>
        <h3 style="font-size:14px">Không tìm thấy bài nào</h3>
      </div></td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(a => {
    const overdue = isOverdue(a.deadline) && a.is_active;
    const pct = cls.student_count > 0 ? Math.round(a.submission_count / cls.student_count * 100) : 0;
    return `
      <tr>
        <td>${skillBadge(a.skill)}</td>
        <td style="font-weight:600">${escapeHtml(a.title)}</td>
        <td style="color:var(--gray-400);font-size:12px">${escapeHtml(a.question_title)}</td>
        <td>
          <span class="deadline${overdue ? ' overdue' : ''}">
            ${overdue ? '⚠️ ' : ''}${formatDateTime(a.deadline)}
          </span>
        </td>
        <td>
          <label class="toggle" title="${a.is_active ? 'Đang mở' : 'Đã đóng'}">
            <input type="checkbox" ${a.is_active ? 'checked' : ''}
              onchange="toggleAssignment('${a.id}', this.checked)" />
            <span class="toggle-slider"></span>
          </label>
        </td>
        <td>
          <div class="td-actions">
            <button class="btn btn-sm btn-outline" title="Xem bài nộp"
              onclick="navigate('/assignment/${a.id}')">
              <span class="sub-progress-wrap">
                <span class="sub-progress-bar" style="width:${pct}%"></span>
              </span>
              📊 ${a.submission_count}/${cls.student_count} nộp
            </button>
            <button class="btn-icon danger" title="Xoá"
              onclick="deleteAssignment('${a.id}', '${cls.id}', this)">🗑</button>
          </div>
        </td>
      </tr>`;
  }).join('');
}
window.filterAssignments = filterAssignments;

// B4.2 — Bulk actions for student list
function getSelectedStudentIds() {
  return Array.from(document.querySelectorAll('.student-bulk-check:checked')).map(c => c.dataset.sid);
}

function updateBulkBar(classId) {
  const ids = getSelectedStudentIds();
  const bar = document.getElementById('bulk-action-bar');
  const label = document.getElementById('bulk-count-label');
  const selectAll = document.getElementById('select-all-students');
  const total = document.querySelectorAll('.student-bulk-check').length;
  if (bar) bar.classList.toggle('hidden', ids.length === 0);
  if (label) label.textContent = `${ids.length} đã chọn`;
  if (selectAll) {
    selectAll.indeterminate = ids.length > 0 && ids.length < total;
    selectAll.checked = ids.length === total && total > 0;
  }
}
window.updateBulkBar = updateBulkBar;

function toggleSelectAllStudents(checkbox, classId) {
  document.querySelectorAll('.student-bulk-check').forEach(c => { c.checked = checkbox.checked; });
  updateBulkBar(classId);
}
window.toggleSelectAllStudents = toggleSelectAllStudents;

function deselectAll() {
  document.querySelectorAll('.student-bulk-check').forEach(c => { c.checked = false; });
  const sel = document.getElementById('select-all-students');
  if (sel) { sel.checked = false; sel.indeterminate = false; }
  const bar = document.getElementById('bulk-action-bar');
  if (bar) bar.classList.add('hidden');
}
window.deselectAll = deselectAll;

async function bulkRemoveStudents(classId) {
  const ids = getSelectedStudentIds();
  if (ids.length === 0) return;
  if (!confirm(`Xoá ${ids.length} học sinh khỏi lớp này?`)) return;
  try {
    await Promise.all(ids.map(sid =>
      api.delete(`/student-classes?student_id=${sid}&class_id=${classId}`)
    ));
    toast(`Đã xoá ${ids.length} học sinh khỏi lớp`);
    showClassDetail({ id: classId });
  } catch (e) {
    toast('Lỗi xoá: ' + (e.error || e.message), 'error');
  }
}
window.bulkRemoveStudents = bulkRemoveStudents;

function bulkExportCSV(classId) {
  const checked = Array.from(document.querySelectorAll('.student-bulk-check:checked'));
  if (checked.length === 0) return;
  const rows = checked.map(c => {
    const tr = c.closest('tr');
    const name = tr.querySelector('.student-avatar')?.nextSibling?.textContent?.trim() || tr.cells[1]?.textContent?.trim() || '';
    const username = tr.cells[2]?.textContent?.trim() || '';
    return [name, username].map(v => `"${v.replace(/"/g, '""')}"`).join(',');
  });
  const csv = 'Họ tên,Username\n' + rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `students_${classId}.csv`; a.click();
  URL.revokeObjectURL(url);
  toast(`Đã xuất ${rows.length} học sinh ra CSV`);
}
window.bulkExportCSV = bulkExportCSV;

async function toggleAssignment(id, isActive) {
  try {
    await api.patch(`/assignments/${id}`, { is_active: isActive });
    toast(isActive ? 'Đã mở bài tập' : 'Đã đóng bài tập');
    if (_cachedCls?.id) await showClassDetail({ id: _cachedCls.id });
  } catch (e) {
    toast('Lỗi cập nhật: ' + (e.error || e.message), 'error');
    if (_cachedCls?.id) await showClassDetail({ id: _cachedCls.id });
  }
}

async function deleteAssignment(id, classId, btn) {
  if (!confirm('Xoá bài tập này? Tất cả bài nộp sẽ bị xoá theo.')) return;
  btnLoading(btn);
  try {
    await api.delete(`/assignments/${id}`);
    toast('Đã xoá bài tập');
    showClassDetail({ id: classId });
  } catch (e) {
    btnReset(btn);
    toast('Lỗi xoá: ' + (e.error || e.message), 'error');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGE: ASSIGNMENT SUBMISSIONS
// ═══════════════════════════════════════════════════════════════════════════

async function showAssignmentSubmissions({ id }) {
  setLoading('Đang tải danh sách bài nộp...');
  try {
    const { assignment, students } = await api.get(`/assignments/${id}/submissions`);
    renderAssignmentSubmissions(assignment, students);
  } catch (e) {
    toast('Lỗi tải dữ liệu: ' + (e.error || e.message), 'error');
    renderRouteError('Không tải được danh sách bài nộp', e, `/assignment/${id}`);
  }
}

function exportSubmissionsCSV(assignment, students) {
  const header = ['Họ tên', 'Username', 'Trạng thái', 'Điểm', 'Thời gian nộp'];
  const rows = students.map(s => [
    s.full_name,
    s.username,
    s.submission_id ? 'Đã nộp' : 'Chưa nộp',
    s.overall_score != null ? s.overall_score : '',
    s.submitted_at ? formatDateTime(s.submitted_at) : '',
  ]);
  const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${assignment.title.replace(/[^a-zA-Z0-9_\-]/g,'_')}_diem.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
window.exportSubmissionsCSV = exportSubmissionsCSV;

function renderAssignmentSubmissions(assignment, students) {
  const submitted   = students.filter(s => s.submission_id).length;
  const notSubmitted = students.length - submitted;
  const overdue = isOverdue(assignment.deadline) && assignment.is_active;

  const rows = students.length === 0
    ? `<tr><td colspan="5">
        <div class="empty-state" style="padding:30px">
          <div class="empty-state-icon">👤</div>
          <h3>Lớp chưa có học sinh nào</h3>
        </div>
       </td></tr>`
    : students.map(s => {
        const hasSubmission = !!s.submission_id;
        const scoreDisplay  = s.overall_score != null
          ? `<span style="font-weight:700;color:var(--primary)">${s.overall_score}/9</span>`
          : (hasSubmission ? '<span style="color:var(--gray-400)">Chờ chấm</span>' : '—');
        const statusBadge = hasSubmission
          ? `<span class="badge" style="background:#d1fae5;color:#065f46">✓ Đã nộp</span>`
          : `<span class="badge" style="background:#fee2e2;color:#991b1b">✗ Chưa nộp</span>`;
        const viewBtn = hasSubmission
          ? `<button class="btn btn-sm btn-outline"
               onclick="openSubmissionModal('${s.submission_id}', '${assignment.skill}')">
               Xem bài
             </button>`
          : `<span style="font-size:12px;color:var(--gray-400)">—</span>`;
        return `
          <tr>
            <td>
              <div style="font-weight:600">${escapeHtml(s.full_name)}</div>
              <div style="font-size:11px;color:var(--gray-400);font-family:monospace">${escapeHtml(s.username)}</div>
            </td>
            <td>${statusBadge}</td>
            <td>${scoreDisplay}</td>
            <td style="font-size:12px;color:var(--gray-400)">${s.submitted_at ? formatDateTime(s.submitted_at) : '—'}</td>
            <td>${viewBtn}</td>
          </tr>`;
      }).join('');

  // Store for CSV export
  window._currentAssignmentData = { assignment, students };

  $('#app').innerHTML = `
    <nav class="breadcrumb">
      <a class="breadcrumb-item" onclick="navigate('/classes')">Lớp học</a>
      <span class="breadcrumb-sep">›</span>
      <a class="breadcrumb-item" onclick="navigate('/class/${assignment.class_id}')">
        ${escapeHtml(assignment.class_name)}
      </a>
      <span class="breadcrumb-sep">›</span>
      <span class="breadcrumb-item active">${escapeHtml(assignment.title)}</span>
    </nav>

    <div class="detail-header">
      <div class="detail-header-info">
        <h2>${skillBadge(assignment.skill)} ${escapeHtml(assignment.title)}</h2>
        <div class="detail-header-meta">
          <span>🏫 ${escapeHtml(assignment.class_name)}</span>
          <span>📖 ${escapeHtml(assignment.question_title)}</span>
          <span class="deadline${overdue ? ' overdue' : ''}">
            🗓 ${overdue ? '⚠️ ' : ''}${formatDateTime(assignment.deadline)}
          </span>
          <span>${assignment.is_active
            ? '<span style="color:#065f46">● Đang mở</span>'
            : '<span style="color:var(--gray-400)">● Đã đóng</span>'}</span>
        </div>
      </div>
      <button class="btn btn-outline"
        onclick="exportSubmissionsCSV(window._currentAssignmentData.assignment, window._currentAssignmentData.students)">
        ⬇ Export CSV
      </button>
    </div>

    <div style="display:flex;gap:16px;margin-bottom:20px">
      <div class="stat-chip">✓ <strong>${submitted}</strong> đã nộp</div>
      <div class="stat-chip">✗ <strong>${notSubmitted}</strong> chưa nộp</div>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Học sinh</th>
            <th>Trạng thái</th>
            <th>Điểm</th>
            <th>Thời gian nộp</th>
            <th>Bài làm</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

async function openSubmissionModal(submissionId, skill) {
  if (skill === 'writing' || skill === 'speaking') {
    navigate(`/grading/${submissionId}`);
    return;
  }
  openModal('Đang tải bài làm...', '<div class="loading-screen"><div class="spinner"></div></div>');
  try {
    const sub = await api.get(`/submissions/${submissionId}`);
    renderSubmissionModal(sub, skill);
  } catch (e) {
    $('#modal-title').textContent = 'Lỗi';
    const errP = document.createElement('p');
    errP.style.color = 'var(--danger)';
    errP.textContent = e.error || e.message || 'Đã xảy ra lỗi';
    $('#modal-body').replaceChildren(errP);
  }
}

function renderSubmissionModal(sub, skill) {
  const studentName = ''; // sub only has IDs; name already shown in table row

  if (skill === 'reading' || skill === 'listening') {
    const qMap = {};
    (sub.questions_data || []).forEach(q => { qMap[q.q_no] = q.answers || []; });

    const answerRows = (sub.student_answers || []).map(sa => {
      const correct = qMap[sa.q_no] || [];
      const isOk = correct.some(a => a.toLowerCase().trim() === (sa.answer || '').toLowerCase().trim());
      return `
        <tr>
          <td style="font-weight:600;text-align:center">Q${sa.q_no}</td>
          <td>${escapeHtml(sa.answer || '—')}</td>
          <td style="color:var(--gray-400);font-size:12px">${correct.join(' / ')}</td>
          <td style="text-align:center;font-size:16px">${isOk ? '✅' : '❌'}</td>
        </tr>`;
    }).join('');

    const correct = (sub.student_answers || []).filter(sa => {
      const c = qMap[sa.q_no] || [];
      return c.some(a => a.toLowerCase().trim() === (sa.answer || '').toLowerCase().trim());
    }).length;
    const total = (sub.questions_data || []).length;

    $('#modal-title').textContent = `Bài làm — ${skillBadge(skill).replace(/<[^>]+>/g, '')}`;
    $('#modal-body').innerHTML = `
      <div style="margin-bottom:12px;padding:12px 16px;background:var(--primary-lt);border-radius:8px;display:flex;gap:24px;align-items:center">
        <span style="font-size:20px;font-weight:700;color:var(--primary)">${sub.overall_score ?? '—'}/9</span>
        <span style="color:var(--gray-600);font-size:13px">Đúng ${correct}/${total} câu</span>
        <span style="color:var(--gray-400);font-size:12px">Nộp lúc ${formatDateTime(sub.submitted_at)}</span>
      </div>
      <div class="table-wrap" style="max-height:400px;overflow-y:auto">
        <table>
          <thead>
            <tr><th>Câu</th><th>Học sinh trả lời</th><th>Đáp án đúng</th><th>Kết quả</th></tr>
          </thead>
          <tbody>${answerRows || '<tr><td colspan="4" style="text-align:center;color:var(--gray-400)">Không có đáp án</td></tr>'}</tbody>
        </table>
      </div>`;

  } else if (skill === 'writing') {
    $('#modal-title').textContent = 'Bài luận Writing';
    $('#modal-body').innerHTML = `
      <div style="margin-bottom:8px;color:var(--gray-400);font-size:12px">
        Nộp lúc ${formatDateTime(sub.submitted_at)}
      </div>
      <div style="white-space:pre-wrap;font-size:14px;line-height:1.8;padding:16px;
                  background:var(--gray-50,#f9fafb);border-radius:8px;
                  border:1px solid var(--gray-200);min-height:200px;max-height:480px;overflow-y:auto">
        ${escapeHtml(sub.writing_content || '(Trống)')}
      </div>
      <div style="margin-top:12px;padding:10px 14px;background:#fef9c3;border-radius:8px;font-size:12px;color:#713f12">
        ✏️ Giao diện chấm và nhận xét writing sẽ có ở phiên bản tiếp theo.
      </div>`;

  } else if (skill === 'speaking') {
    $('#modal-title').textContent = 'Bài Speaking';
    const tracks = Array.isArray(sub.speaking_audio_urls) && sub.speaking_audio_urls.length > 0
      ? sub.speaking_audio_urls
      : (sub.speaking_audio_url ? [{ url: sub.speaking_audio_url, name: '' }] : []);
    const multi = tracks.length > 1;
    const audioHtml = tracks.length > 0
      ? tracks.map((t, i) => `
          <div style="${multi ? 'margin-bottom:10px' : ''}">
            ${multi ? `<div style="font-size:12px;font-weight:600;color:var(--gray-500);margin-bottom:4px">${escapeHtml(t.name || ('Phần ' + (i + 1)))}</div>` : ''}
            <audio controls src="${escapeHtml(t.url || '')}" style="width:100%;border-radius:8px"></audio>
          </div>`).join('')
      : `<div style="color:var(--gray-400);padding:16px;text-align:center">Không có file audio</div>`;
    const scriptHtml = sub.speaking_script
      ? `<div style="margin-top:12px">
           <div style="font-size:12px;font-weight:600;color:var(--gray-500);margin-bottom:6px">TRANSCRIPT</div>
           <div style="white-space:pre-wrap;font-size:13px;line-height:1.7;padding:12px;
                       background:var(--gray-50,#f9fafb);border-radius:8px;
                       border:1px solid var(--gray-200);max-height:240px;overflow-y:auto">
             ${escapeHtml(sub.speaking_script)}
           </div>
         </div>`
      : '';
    $('#modal-body').innerHTML = `
      <div style="margin-bottom:8px;color:var(--gray-400);font-size:12px">
        Nộp lúc ${formatDateTime(sub.submitted_at)}
      </div>
      ${audioHtml}${scriptHtml}
      <div style="margin-top:12px;padding:10px 14px;background:#fef9c3;border-radius:8px;font-size:12px;color:#713f12">
        ✏️ Giao diện chấm và nhận xét speaking sẽ có ở phiên bản tiếp theo.
      </div>`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════
// B4.10 — AUDIO WAVEFORM
// ═══════════════════════════════════════════════════════════════════════════

async function initWaveform(container, audioEl) {
  const BARS = 200;
  const canvas = document.createElement('canvas');
  canvas.className = 'waveform-canvas';
  canvas.height = 56;
  container.innerHTML = '';
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');

  function resizeCanvas() {
    canvas.width = container.clientWidth || 600;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  let peaks = null;

  function draw(progress) {
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    if (!peaks) {
      ctx.fillStyle = 'var(--gray-200)';
      for (let i = 0; i < BARS; i++) {
        const x = (i / BARS) * w;
        const bh = h * 0.15 + Math.random() * h * 0.1;
        ctx.fillRect(x + 1, (h - bh) / 2, w / BARS - 2, bh);
      }
      return;
    }
    const barW = w / BARS;
    for (let i = 0; i < BARS; i++) {
      const bh = Math.max(3, peaks[i] * h * 0.9);
      const x = i * barW;
      const played = (i / BARS) < (progress || 0);
      ctx.fillStyle = played ? '#0f766e' : '#d1d5db';
      ctx.fillRect(x + 1, (h - bh) / 2, Math.max(1, barW - 2), bh);
    }
    // playhead
    if (progress > 0) {
      const px = progress * w;
      ctx.strokeStyle = 'var(--primary-dk)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, 4);
      ctx.lineTo(px, h - 4);
      ctx.stroke();
    }
  }

  draw(0);

  // Click to seek
  canvas.addEventListener('click', (e) => {
    if (!audioEl.duration) return;
    const rect = canvas.getBoundingClientRect();
    audioEl.currentTime = ((e.clientX - rect.left) / rect.width) * audioEl.duration;
  });

  // Update playhead as audio plays
  audioEl.addEventListener('timeupdate', () => {
    if (audioEl.duration) draw(audioEl.currentTime / audioEl.duration);
  });
  audioEl.addEventListener('seeked', () => {
    if (audioEl.duration) draw(audioEl.currentTime / audioEl.duration);
  });

  // Decode audio for real waveform
  try {
    const res = await fetch(audioEl.src);
    const buf = await res.arrayBuffer();
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const decoded = await audioCtx.decodeAudioData(buf);
    audioCtx.close();

    const data = decoded.getChannelData(0);
    const step = Math.floor(data.length / BARS);
    const rawPeaks = [];
    for (let i = 0; i < BARS; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) sum += Math.abs(data[i * step + j] || 0);
      rawPeaks.push(sum / step);
    }
    const max = Math.max(...rawPeaks, 0.001);
    peaks = rawPeaks.map(v => v / max);

    // Smooth peaks slightly
    peaks = peaks.map((v, i) => {
      const prev = peaks[i - 1] ?? v;
      const next = peaks[i + 1] ?? v;
      return (prev * 0.25 + v * 0.5 + next * 0.25);
    });

    draw(audioEl.duration ? audioEl.currentTime / audioEl.duration : 0);
  } catch (err) {
    // If fetch/decode fails, draw flat placeholder bars
    peaks = Array.from({ length: BARS }, () => 0.2 + Math.random() * 0.3);
    draw(0);
  }
}

// PAGE: WRITING GRADING (Google Docs-style annotations)
// ═══════════════════════════════════════════════════════════════════════════

let _gradingAnnotations   = [];
let _gradingSubmissionId  = null;
let _gradingText          = '';
let _gradingSkill         = '';
let _gradingAiFeedback    = null;

// B4.7 — global grading keyboard shortcuts
let _gradingKeyHandler = null;
function bindGradingShortcuts() {
  if (_gradingKeyHandler) document.removeEventListener('keydown', _gradingKeyHandler);
  _gradingKeyHandler = (e) => {
    // Skip if typing in textarea/input
    const tag = (e.target?.tagName || '').toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA') {
      // Allow ⌘/Ctrl+S even in inputs
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        const saveBtn = document.querySelector('#save-btn, [onclick*="saveGrading"]');
        if (saveBtn) saveGrading(saveBtn);
      }
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      const saveBtn = document.querySelector('#save-btn, [onclick*="saveGrading"]');
      if (saveBtn) saveGrading(saveBtn);
    }
    // ↑↓ navigate annotations
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && _gradingAnnotations.length > 0) {
      e.preventDefault();
      const ids = _gradingAnnotations.map(a => a.id);
      let idx = ids.indexOf(window._gradingFocusAnnId);
      if (idx < 0) idx = e.key === 'ArrowDown' ? -1 : 0;
      idx = e.key === 'ArrowDown' ? (idx + 1) % ids.length : (idx - 1 + ids.length) % ids.length;
      window._gradingFocusAnnId = ids[idx];
      scrollToAnnotation(window._gradingFocusAnnId);
    }
  };
  document.addEventListener('keydown', _gradingKeyHandler);
}
function unbindGradingShortcuts() {
  if (_gradingKeyHandler) document.removeEventListener('keydown', _gradingKeyHandler);
  _gradingKeyHandler = null;
}

async function showGradingPage({ id }) {
  setLoading('Đang tải bài làm...');
  try {
    const sub = await api.get(`/submissions/${id}`);
    renderGradingPage(sub);
    bindGradingShortcuts();
  } catch (e) {
    toast('Lỗi: ' + (e.error || e.message), 'error');
    renderRouteError('Không tải được bài làm', e, `/grading/${id}`);
  }
}

// Unbind shortcuts when leaving grading page
window.addEventListener('hashchange', () => {
  if (!window.location.hash.includes('/grading/')) unbindGradingShortcuts();
});

function renderGradingPage(sub) {
  _gradingSubmissionId = sub.id;
  _gradingSkill        = sub.skill;
  _gradingText         = sub.skill === 'speaking' ? (sub.speaking_script || '') : (sub.writing_content || '');
  const existing       = sub.teacher_feedback || {};
  _gradingAnnotations  = existing.annotations || [];
  _gradingAiFeedback   = sub.ai_feedback || null;

  const titleSkill = sub.skill === 'speaking' ? '🎤 Chấm bài Speaking' : '✏️ Chấm bài Writing';
  
  let mediaHtml = '';
  if (sub.skill === 'speaking') {
    const tracks = Array.isArray(sub.speaking_audio_urls) && sub.speaking_audio_urls.length > 0
      ? sub.speaking_audio_urls
      : (sub.speaking_audio_url ? [{ url: sub.speaking_audio_url, name: '' }] : []);
    const multi = tracks.length > 1;
    if (tracks.length > 0) {
      mediaHtml = `
        <div style="margin-bottom:16px;padding:12px;background:var(--gray-50);border-radius:12px;border:1px solid var(--gray-200)">
          <div style="font-size:12px;font-weight:700;color:var(--gray-500);margin-bottom:8px;text-transform:uppercase">Audio ghi âm</div>
          ${tracks.map((t, i) => `
            <div style="${multi ? 'margin-bottom:10px' : ''}">
              ${multi ? `<div style="font-size:12px;color:var(--gray-500);margin-bottom:4px">${escapeHtml(t.name || ('Phần ' + (i + 1)))}</div>` : ''}
              ${i === 0 ? `<div id="waveform-container" class="waveform-container"><div class="waveform-loading">Đang tải waveform...</div></div>` : ''}
              <audio ${i === 0 ? 'id="waveform-audio"' : ''} controls src="${escapeHtml(t.url || '')}" style="width:100%;height:36px;outline:none;${i === 0 ? 'margin-top:6px' : ''}"></audio>
            </div>`).join('')}
        </div>`;
    }
  }

  $('#app').innerHTML = `
    <nav class="breadcrumb">
      <a class="breadcrumb-item" onclick="navigate('/classes')">Lớp học</a>
      <span class="breadcrumb-sep">›</span>
      ${sub.class_id ? `<a class="breadcrumb-item" onclick="navigate('/class/${sub.class_id}')">${escapeHtml(sub.class_name || 'Lớp học')}</a><span class="breadcrumb-sep">›</span>` : ''}
      ${sub.assignment_id ? `<a class="breadcrumb-item" onclick="navigate('/assignment/${sub.assignment_id}')">${escapeHtml(sub.assignment_title || 'Bài tập')}</a><span class="breadcrumb-sep">›</span>` : ''}
      <span class="breadcrumb-item active">Chấm bài</span>
    </nav>

    <div class="page-header">
      <div>
        <div class="page-title">${titleSkill}</div>
        <div class="page-subtitle">
          ${escapeHtml(sub.student_name || '')}
          ${sub.student_username ? `<span style="color:var(--gray-400);font-family:monospace;font-size:11px">(${escapeHtml(sub.student_username)})</span>` : ''}
          — ${escapeHtml(sub.assignment_title || '')}
          <span style="color:var(--gray-400);font-size:12px">· Nộp ${formatDateTime(sub.submitted_at)}</span>
        </div>
      </div>
      <button class="btn btn-primary" id="save-btn" onclick="saveGrading(this)">💾 Lưu nhận xét</button>
    </div>

    <div class="grading-layout">
      <!-- Left: writing content with highlights -->
      <div class="grading-content-panel">
        ${mediaHtml}
        <div class="grading-panel-label">
          📝 ${sub.skill === 'speaking' ? 'Transcript AI' : 'Bài làm'}
          <span class="grading-select-hint">Bôi đen đoạn văn để thêm nhận xét</span>
        </div>
        <div id="writing-display" class="writing-display"></div>
      </div>

      <!-- Right: annotations sidebar -->
      <div class="grading-sidebar">
        <div class="grading-panel-label">💬 Nhận xét theo đoạn</div>
        <div id="annotations-list" class="annotations-list"></div>

        <div class="grading-sidebar-section">
          <label class="form-label">Nhận xét tổng thể</label>
          <textarea id="overall-feedback" class="form-textarea" rows="5"
            placeholder="Nhận xét chung về bài viết...">${escapeHtml(existing.overall || '')}</textarea>
        </div>

        <div class="grading-sidebar-section" style="display:flex;align-items:center;gap:10px">
          <label class="form-label" style="margin:0;white-space:nowrap">Band Score</label>
          <input id="grading-score" type="number" min="0" max="9" step="0.5"
            class="form-input" style="width:80px;text-align:center"
            value="${sub.overall_score ?? existing.score ?? ''}"
            placeholder="0–9" />
          <span style="font-size:13px;color:var(--gray-400)">/9</span>
        </div>

        <button class="btn btn-primary" style="width:100%;margin-top:4px" onclick="saveGrading(this)">
          💾 Lưu nhận xét
        </button>

        <div class="grading-sidebar-section ai-feedback-section" style="margin-top:16px;border-top:1px solid var(--gray-200);padding-top:16px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <button class="ai-feedback-toggle" onclick="toggleAiFeedback(this)" title="Đóng/Mở">
              🤖 AI Feedback <span class="ai-toggle-icon">▲</span>
            </button>
            <button class="btn btn-secondary" id="ai-feedback-btn" onclick="requestAiFeedback(this)"
              style="font-size:12px;padding:5px 12px">
              ✨ Phân tích AI
            </button>
          </div>
          <div id="ai-feedback-display"></div>
        </div>
      </div>
    </div>`;

  refreshWritingDisplay();
  refreshAnnotationsList();
  refreshAiFeedbackDisplay();

  // Attach selection listener AFTER rendering
  document.getElementById('writing-display').addEventListener('mouseup', handleTextSelection);

  // B4.10 — init waveform if speaking audio present
  const waveformContainer = document.getElementById('waveform-container');
  const waveformAudio = document.getElementById('waveform-audio');
  if (waveformContainer && waveformAudio) {
    initWaveform(waveformContainer, waveformAudio);
  }
}

// ─── Render / refresh ────────────────────────────────────────────────────────

function refreshWritingDisplay() {
  const el = document.getElementById('writing-display');
  if (!el) return;
  el.innerHTML = buildAnnotatedHtml(_gradingText, _gradingAnnotations);
}

function refreshAnnotationsList() {
  const el = document.getElementById('annotations-list');
  if (!el) return;
  const sorted = [..._gradingAnnotations].sort((a, b) => a.start - b.start);
  if (sorted.length === 0) {
    el.innerHTML = `<div class="annotations-empty">Chưa có nhận xét nào. Bôi đen đoạn văn để thêm.</div>`;
    return;
  }
  el.innerHTML = sorted.map((ann, i) => `
    <div class="annotation-card" id="ann-card-${ann.id}">
      <div class="annotation-card-header">
        <span class="annotation-number">${i + 1}</span>
        <button class="annotation-delete" onclick="removeAnnotation('${ann.id}')">×</button>
      </div>
      <div class="annotation-quote">"${escapeHtml(ann.text.slice(0, 70))}${ann.text.length > 70 ? '…' : ''}"</div>
      <div class="annotation-comment">${escapeHtml(ann.comment)}</div>
    </div>`).join('');
}

function buildAnnotatedHtml(text, annotations) {
  if (!text) return '<span style="color:var(--gray-400)">(Trống)</span>';
  const sorted = [...annotations].sort((a, b) => a.start - b.start);
  let html = '';
  let pos = 0;
  for (let i = 0; i < sorted.length; i++) {
    const ann = sorted[i];
    const start = Math.max(ann.start, pos);
    const end   = Math.min(ann.end, text.length);
    if (start >= end) continue;
    if (start > pos) html += escapeHtml(text.slice(pos, start));
    html += `<mark class="ann-highlight" data-id="${ann.id}"
      onclick="scrollToAnnotation('${ann.id}')"
      title="${escapeHtml(ann.comment)}">`;
    html += escapeHtml(text.slice(start, end));
    html += `<sup class="ann-marker">${i + 1}</sup></mark>`;
    pos = end;
  }
  if (pos < text.length) html += escapeHtml(text.slice(pos));
  return html;
}

// ─── Selection → Annotation popup ────────────────────────────────────────────

function handleTextSelection() {
  closeAnnotationPopup();
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || !selection.toString().trim()) return;

  const range = selection.getRangeAt(0);
  const container = document.getElementById('writing-display');
  if (!container || !container.contains(range.commonAncestorContainer)) return;

  // Calc offsets against plain text of the container
  const preRange = document.createRange();
  preRange.selectNodeContents(container);
  preRange.setEnd(range.startContainer, range.startOffset);
  const start = preRange.toString().length;
  const end   = start + range.toString().length;
  const selectedText = range.toString();
  if (!selectedText.trim()) return;

  // Reject overlapping
  if (_gradingAnnotations.some(a => a.start < end && a.end > start)) {
    toast('Đoạn này đã có nhận xét rồi.', 'error');
    selection.removeAllRanges();
    return;
  }

  const rect = range.getBoundingClientRect();
  showAnnotationPopup(start, end, selectedText, rect);
}

function showAnnotationPopup(start, end, selectedText, rect) {
  const popup = document.createElement('div');
  popup.id = 'annotation-popup';
  popup.className = 'annotation-popup';
  popup.innerHTML = `
    <div class="annotation-popup-quote">"${escapeHtml(selectedText.slice(0, 90))}${selectedText.length > 90 ? '…' : ''}"</div>
    <textarea id="ann-comment-input" class="form-textarea" rows="3"
      placeholder="Nhận xét cho đoạn này... (Cmd/Ctrl+Enter để lưu, Esc để hủy)"></textarea>
    <div class="annotation-popup-actions">
      <button class="btn btn-sm btn-outline" onclick="closeAnnotationPopup()">Hủy (Esc)</button>
      <button class="btn btn-sm btn-primary" onclick="confirmAnnotation(${start},${end})">Thêm nhận xét (⌘↵)</button>
    </div>`;
  document.body.appendChild(popup);

  // Position below selection, clamp to viewport width
  const top  = rect.bottom + window.scrollY + 10;
  const left = Math.min(rect.left + window.scrollX, window.innerWidth - 360);
  popup.style.top  = top + 'px';
  popup.style.left = Math.max(8, left) + 'px';

  setTimeout(() => {
    const ta = document.getElementById('ann-comment-input');
    ta?.focus();
    // B4.7 — keyboard shortcuts
    ta?.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); closeAnnotationPopup(); }
      else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); confirmAnnotation(start, end); }
    });
    document.addEventListener('mousedown', _popupOutsideClick);
  }, 60);
}

function _popupOutsideClick(e) {
  const popup = document.getElementById('annotation-popup');
  if (popup && !popup.contains(e.target)) closeAnnotationPopup();
}

function closeAnnotationPopup() {
  const popup = document.getElementById('annotation-popup');
  if (popup) {
    popup.remove();
    window.getSelection()?.removeAllRanges(); // chỉ clear khi có popup thật sự
  }
  document.removeEventListener('mousedown', _popupOutsideClick);
}

function confirmAnnotation(start, end) {
  const comment = document.getElementById('ann-comment-input')?.value.trim();
  if (!comment) { toast('Vui lòng nhập nhận xét', 'error'); return; }
  _gradingAnnotations.push({
    id:      crypto.randomUUID(),
    start, end,
    text:    _gradingText.slice(start, end),
    comment,
  });
  closeAnnotationPopup();
  refreshWritingDisplay();
  refreshAnnotationsList();
}

function removeAnnotation(id) {
  _gradingAnnotations = _gradingAnnotations.filter(a => a.id !== id);
  refreshWritingDisplay();
  refreshAnnotationsList();
}

function scrollToAnnotation(id) {
  document.getElementById(`ann-card-${id}`)
    ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function saveGrading(btn) {
  const overall = document.getElementById('overall-feedback')?.value.trim() || '';
  const scoreRaw = document.getElementById('grading-score')?.value;
  const score = scoreRaw !== '' && scoreRaw != null ? parseFloat(scoreRaw) : null;

  if (score !== null && (isNaN(score) || score < 0 || score > 9)) {
    toast('Điểm Band phải từ 0 đến 9', 'error');
    return;
  }

  btnLoading(btn);
  try {
    await api.patch(`/submissions/${_gradingSubmissionId}`, {
      teacher_feedback: { annotations: _gradingAnnotations, overall, score },
      overall_score: score,
    });
    // Sync both save buttons
    document.querySelectorAll('#save-btn, [onclick="saveGrading(this)"]').forEach(b => btnReset(b));
    toast('Đã lưu nhận xét! ✓');
  } catch (e) {
    btnReset(btn);
    toast('Lỗi lưu: ' + (e.error || e.message), 'error');
  }
}

function toggleAiFeedback(btn) {
  const display = document.getElementById('ai-feedback-display');
  const icon = btn.querySelector('.ai-toggle-icon');
  const analyzeBtn = document.getElementById('ai-feedback-btn');
  if (!display) return;
  const isOpen = display.style.display !== 'none';
  display.style.display = isOpen ? 'none' : '';
  if (analyzeBtn) analyzeBtn.style.display = isOpen ? 'none' : '';
  if (icon) icon.textContent = isOpen ? '▼' : '▲';
}

function refreshAiFeedbackDisplay() {
  const el = document.getElementById('ai-feedback-display');
  if (!el) return;
  if (!_gradingAiFeedback) {
    el.innerHTML = `<div class="ai-feedback-empty">
      Nhấn "✨ Phân tích AI" để nhận gợi ý từ AI về từ vựng và ngữ pháp.
    </div>`;
    return;
  }
  const f = _gradingAiFeedback;
  const lr = getAiCriterionForDisplay(f, 'lr');
  const gra = getAiCriterionForDisplay(f, 'gra');
  const genTime = f.generated_at ? `<span class="ai-feedback-time">Tạo lúc ${formatDateTime(f.generated_at)}</span>` : '';
  el.innerHTML = `
    <div class="ai-feedback-head">
      <div class="ai-feedback-chips">
        ${aiBandChip('LR', f.lr_score)}
        ${aiBandChip('GRA', f.gra_score)}
      </div>
      ${genTime}
    </div>
    ${renderAiCriterionCard('📚', 'Từ vựng', 'LR', f.lr_score, lr)}
    ${renderAiCriterionCard('📐', 'Ngữ pháp', 'GRA', f.gra_score, gra)}`;
}

function aiBandChip(label, score) {
  const s = parseFloat(score);
  const color = s >= 7 ? '#16a34a' : s >= 5 ? '#ca8a04' : '#dc2626';
  return `<span class="ai-band-chip" style="--chip-color:${color}">${label} ${score ?? '—'}</span>`;
}

function getAiCriterionForDisplay(feedback, key) {
  const structured = feedback?.[key];
  const hasStructured = structured && typeof structured === 'object'
    && ['band_justification_md', 'strengths_md', 'errors_md', 'tips_md'].some(k => structured[k]);
  if (hasStructured) {
    const criterion = {
      band_justification_md: structured.band_justification_md || '',
      strengths_md: structured.strengths_md || '',
      errors_md: structured.errors_md || '',
      tips_md: structured.tips_md || '',
    };
    const onlyBandBlob = criterion.band_justification_md
      && !criterion.strengths_md
      && !criterion.errors_md
      && !criterion.tips_md;
    return onlyBandBlob ? parseLegacyAiFeedbackText(criterion.band_justification_md) : criterion;
  }

  return parseLegacyAiFeedbackText(feedback?.[`${key}_feedback`] || '');
}

function parseLegacyAiFeedbackText(text) {
  const raw = String(text || '').trim();
  const empty = {
    band_justification_md: '',
    strengths_md: '',
    errors_md: '',
    tips_md: '',
  };
  if (!raw) return empty;

  const labels = {
    'band justification': 'band_justification_md',
    'lý do band': 'band_justification_md',
    'strengths': 'strengths_md',
    'điểm mạnh': 'strengths_md',
    'errors & weaknesses': 'errors_md',
    'lỗi & điểm yếu': 'errors_md',
    'improvement tips': 'tips_md',
    'gợi ý cải thiện': 'tips_md',
  };
  const pattern = /(?:\*\*)?(Band justification|Lý do band|Strengths|Điểm mạnh|Errors\s*&\s*weaknesses|Lỗi\s*&\s*điểm yếu|Improvement tips|Gợi ý cải thiện)(?:\*\*)?\s*:/gi;
  const matches = [...raw.matchAll(pattern)];
  if (matches.length === 0) {
    return { ...empty, band_justification_md: raw };
  }

  const parsed = { ...empty };
  matches.forEach((match, idx) => {
    const key = labels[match[1].toLowerCase().replace(/\s+/g, ' ')];
    if (!key) return;
    const start = match.index + match[0].length;
    const end = idx + 1 < matches.length ? matches[idx + 1].index : raw.length;
    const value = raw.slice(start, end).trim();
    if (value) parsed[key] = value;
  });
  return parsed;
}

function renderAiCriterionCard(icon, title, code, score, criterion) {
  const sections = [
    ['Lý do band', criterion.band_justification_md],
    ['Điểm mạnh', criterion.strengths_md],
    ['Lỗi & điểm yếu', criterion.errors_md],
    ['Gợi ý cải thiện', criterion.tips_md],
  ].filter(([, body]) => String(body || '').trim());

  return `
    <div class="ai-feedback-card">
      <div class="ai-feedback-card-head">
        <div>
          <div class="ai-feedback-criterion">${icon} ${title} (${code})</div>
          <div class="ai-feedback-score">${score ?? '—'}/9</div>
        </div>
      </div>
      <div class="ai-feedback-sections">
        ${sections.map(([label, body]) => `
          <section class="ai-feedback-md-section">
            <div class="ai-feedback-section-label">${escapeHtml(label)}</div>
            <div class="ai-feedback-markdown">${renderSafeMarkdown(body)}</div>
          </section>
        `).join('')}
      </div>
    </div>`;
}

async function requestAiFeedback(btn) {
  btnLoading(btn);
  try {
    const res = await api.post(`/submissions/${_gradingSubmissionId}/ai-feedback`, {});
    _gradingAiFeedback = res.ai_feedback;
    refreshAiFeedbackDisplay();
    toast('AI đã phân tích xong! ✓');
  } catch (e) {
    toast('Lỗi AI: ' + (e.error || e.message), 'error');
  } finally {
    btnReset(btn);
  }
}

// ── Assign Modal ─────────────────────────────────────────────────────────────

let _assignClassId = null;
let _questions = [];
let _selectedQuestionId = null;
let _assignSkillFilter = '';
let _assignTagFilter = '';
let _assignSearch = '';

async function openAssignModal(classId, className, preSelectedId = null) {
  _assignClassId = classId;
  _selectedQuestionId = preSelectedId;
  _questions = [];
  _assignSkillFilter = '';
  _assignTagFilter = '';
  _assignSearch = '';

  openModal(`Giao bài cho lớp "${className}"`, `
    <div class="form-group">
      <label class="form-label">Tên bài tập <span style="color:var(--danger)">*</span></label>
      <input id="assign-title" class="form-input" placeholder="VD: Reading tháng 5 - CAM 18 Test 1" />
    </div>
    <div class="form-group">
      <label class="form-label">Chọn đề từ kho</label>
      <div class="skill-tabs" id="assign-skill-tabs">
        ${['', 'reading', 'listening', 'writing', 'speaking'].map((s, i) => `
          <button class="skill-tab ${i === 0 ? 'active' : ''}"
            onclick="filterAssignQuestions('${s}', this)">
            ${i === 0 ? 'Tất cả' : SKILL_LABELS[s].icon + ' ' + SKILL_LABELS[s].label}
          </button>`).join('')}
      </div>
      <input id="assign-search" class="form-input assign-search-input"
        placeholder="🔍 Tìm theo tên đề hoặc tag..."
        oninput="filterAssignQuestionSearch(this.value)" />
      <div id="assign-tag-filter-bar" class="tag-filter-bar assign-tag-filter-bar"></div>
      <div id="assign-question-picker" class="question-picker">
        <div style="padding:20px;text-align:center;color:var(--gray-400)">
          <div class="spinner" style="margin:0 auto 8px"></div> Đang tải...
        </div>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Hạn nộp bài</label>
      <input id="assign-deadline" class="form-input" type="datetime-local" />
      <div class="form-hint">Để trống nếu không có hạn</div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="submitAssign(this)">Giao bài</button>
    </div>`);

  try {
    _questions = await api.get('/questions');
    renderAssignPicker('');
  } catch (e) {
    toast('Không thể tải kho đề', 'error');
  }
}

function renderAssignPicker(skillFilter) {
  const normalizedSearch = _assignSearch.trim().toLowerCase();
  const filtered = _questions.filter(q => {
    if (skillFilter && q.skill !== skillFilter) return false;
    if (_assignTagFilter && !(Array.isArray(q.tags) && q.tags.includes(_assignTagFilter))) return false;
    if (!normalizedSearch) return true;
    const title = String(q.title || '').toLowerCase();
    const tags = Array.isArray(q.tags) ? q.tags.join(' ').toLowerCase() : '';
    return title.includes(normalizedSearch) || tags.includes(normalizedSearch);
  });

  const picker = $('#assign-question-picker');
  if (!picker) return;
  renderAssignTagFilterBar(skillFilter);

  if (filtered.length === 0) {
    picker.innerHTML = `<div style="padding:20px;text-align:center;color:var(--gray-400)">
      Không có đề nào phù hợp với bộ lọc hiện tại
    </div>`;
    return;
  }

  picker.innerHTML = filtered.map(q => `
    <div class="question-picker-item ${_selectedQuestionId === q.id ? 'selected' : ''}"
      onclick="selectQuestion('${q.id}', this)">
      <input type="radio" name="assign-q" value="${q.id}"
        ${_selectedQuestionId === q.id ? 'checked' : ''} />
      <div>
        ${skillBadge(q.skill)}
        <div style="font-weight:600;margin-top:4px;font-size:13px">${q.title}</div>
        ${Array.isArray(q.tags) && q.tags.length > 0 ? `
          <div class="assign-question-tags">
            ${q.tags.map(tag => `
              <button type="button"
                class="tag-chip assign-tag-chip ${_assignTagFilter === tag ? 'tag-chip-active' : ''}"
                onclick="event.stopPropagation(); setAssignTagFilter('${escapeHtml(tag)}')">${escapeHtml(tag)}</button>
            `).join('')}
          </div>
        ` : ''}
        <div style="font-size:11px;color:var(--gray-400)">${formatDate(q.created_at)}</div>
      </div>
    </div>`).join('');
}

function filterAssignQuestions(skill, btn) {
  _assignSkillFilter = skill;
  document.querySelectorAll('#assign-skill-tabs .skill-tab')
    .forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderAssignPicker(skill);
}

function filterAssignQuestionSearch(value) {
  _assignSearch = value || '';
  renderAssignPicker(_assignSkillFilter);
}

function renderAssignTagFilterBar(skillFilter) {
  const bar = $('#assign-tag-filter-bar');
  if (!bar) return;
  const tagSet = new Set();
  _questions.forEach(q => {
    if (skillFilter && q.skill !== skillFilter) return;
    if (!Array.isArray(q.tags)) return;
    q.tags.forEach(tag => tag && tagSet.add(String(tag)));
  });
  const tags = Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  if (tags.length === 0) {
    bar.innerHTML = '';
    bar.style.display = 'none';
    return;
  }
  bar.style.display = 'flex';
  bar.innerHTML = `
    <span>Lọc tag:</span>
    <button type="button"
      class="tag-chip ${_assignTagFilter ? '' : 'tag-chip-active'}"
      onclick="setAssignTagFilter('')">Tất cả</button>
    ${tags.map(tag => `
      <button type="button"
        class="tag-chip ${_assignTagFilter === tag ? 'tag-chip-active' : ''}"
        onclick="setAssignTagFilter('${escapeHtml(tag)}')">${escapeHtml(tag)}</button>
    `).join('')}
  `;
}

function setAssignTagFilter(tag) {
  _assignTagFilter = tag || '';
  renderAssignPicker(_assignSkillFilter);
}

function selectQuestion(id, el) {
  _selectedQuestionId = id;
  document.querySelectorAll('.question-picker-item').forEach(i => i.classList.remove('selected'));
  el.classList.add('selected');
  el.querySelector('input[type=radio]').checked = true;
}

async function submitAssign(btn) {
  const title = $('#assign-title')?.value.trim();
  const deadlineRaw = $('#assign-deadline')?.value;
  const deadline = deadlineRaw ? new Date(deadlineRaw).toISOString() : null;

  if (!title) { toast('Vui lòng nhập tên bài tập', 'error'); return; }
  if (!_selectedQuestionId) { toast('Vui lòng chọn một đề từ kho', 'error'); return; }

  btnLoading(btn);
  try {
    await api.post('/assignments', {
      class_id:    _assignClassId,
      question_id: _selectedQuestionId,
      title,
      deadline:    deadline || null,
    });
    closeModal();
    toast('Giao bài thành công! 🎉');
  } catch (e) {
    btnReset(btn);
    toast('Lỗi giao bài: ' + (e.error || e.message), 'error');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGE: QUESTION POOL
// ═══════════════════════════════════════════════════════════════════════════

let _currentSkillFilter = '';
let _allQuestions = [];
let _questionSearch = '';
let _questionTagFilter = '';
let _allClasses = [];
let _classSearch = '';
let _classSort = 'newest'; // 'newest' | 'name' | 'students'
let _classDetailTab = 'assignments';
let _cachedCls = null;
let _cachedStudents = [];

async function showQuestions() {
  setLoading('Đang tải kho đề...');
  try {
    _allQuestions = await api.get('/questions');
    renderQuestions();
  } catch (e) {
    toast('Lỗi tải kho đề: ' + (e.error || e.message), 'error');
    renderRouteError('Không tải được kho đề', e, '/questions');
  }
}

function _buildQuestionTableRows(filtered) {
  if (filtered.length === 0) {
    return `<tr><td colspan="6">
        <div class="empty-state" style="padding:30px">
          <div class="empty-state-icon">📚</div>
          <h3>Chưa có đề nào${_currentSkillFilter || _questionSearch ? ' phù hợp' : ''}</h3>
          <p>Nhấn "Tạo đề mới" để thêm đề vào kho.</p>
        </div>
       </td></tr>`;
  }
  return filtered.map(q => `
      <tr draggable="true"
        ondragstart="onQuestionDragStart('${q.id}', event, this)"
        ondragend="onQuestionDragEnd(this)"
        title="Kéo để giao bài cho lớp">
        <td>${skillBadge(q.skill)}</td>
        <td>
          <span class="q-title-link" onclick="previewQuestion('${q.id}')" title="Xem nhanh">
            ${escapeHtml(q.title)}
          </span>
        </td>
        <td style="font-size:12px;color:var(--gray-400)">
          ${Array.isArray(q.tags) && q.tags.length > 0
            ? q.tags.map(t => `<span class="tag-chip tag-chip-sm" onclick="setQuestionTagFilter('${escapeHtml(t)}')" title="Lọc theo tag này">${escapeHtml(t)}</span>`).join('')
            : '—'}
        </td>
        <td style="font-size:12px;color:var(--gray-400)">
          ${Array.isArray(q.questions_data) ? q.questions_data.length + ' câu' : '—'}
          ${q.content_url ? ' · 🔊 Audio' : ''}
        </td>
        <td style="font-size:12px;color:var(--gray-400)">${formatDate(q.created_at)}</td>
        <td>
          <div class="td-actions">
            <button class="btn-icon" title="Xem / Sửa"
              onclick="navigate('/questions/${q.id}')">✏️</button>
            <button class="btn-icon" title="Sao chép đề"
              onclick="duplicateQuestion('${q.id}', this)">📋</button>
            <button class="btn-icon danger" title="Xoá đề"
              onclick="deleteQuestion('${q.id}', this)">🗑</button>
          </div>
        </td>
      </tr>`).join('');
}

// B4.6 — Duplicate question
async function duplicateQuestion(id, btn) {
  if (!confirm('Tạo bản sao của đề này?')) return;
  btnLoading(btn);
  try {
    const dup = await api.post(`/questions/${id}/duplicate`, {});
    toast('Đã tạo bản sao "' + dup.title + '"');
    await showQuestions();
  } catch (e) {
    btnReset(btn);
    toast('Lỗi sao chép: ' + (e.error || e.message), 'error');
  }
}
window.duplicateQuestion = duplicateQuestion;

// B4.3 — Drag & drop: kéo question → thả vào lớp để giao bài nhanh
let _dragQuestionId = null;
let _dragQuestionTitle = '';
let _dragAutoScrollRaf = null;
let _dragAutoScrollDir = 0;

function onQuestionDragStart(id, e, row) {
  _dragQuestionId = id;
  _dragQuestionTitle = _allQuestions.find(q => q.id === id)?.title || row.querySelector('.q-title-link')?.textContent?.trim() || 'Đề chưa đặt tên';
  e.dataTransfer.effectAllowed = 'copy';
  e.dataTransfer.setData('text/plain', id);
  row.classList.add('dragging');
  showDragAssignPanel();
}

function onQuestionDragEnd(row) {
  row.classList.remove('dragging');
  hideDragAssignPanel();
  _dragQuestionId = null;
  _dragQuestionTitle = '';
}

async function showDragAssignPanel() {
  hideDragAssignPanel();

  // Ensure classes are loaded
  let classes = _allClasses;
  if (!classes.length) {
    try {
      classes = await api.get('/classes');
      _allClasses = classes;
    } catch (_) { return; }
  }
  if (!classes.length) return;

  const panel = document.createElement('div');
  panel.id = 'drag-assign-panel';
  panel.className = 'drag-assign-panel';
  panel.innerHTML = `
    <div class="drag-assign-header">
      <div>
        <div class="drag-assign-label">🎯 Kéo thả để giao bài nhanh</div>
        <div class="drag-assign-title">${escapeHtml(_dragQuestionTitle)}</div>
        <div class="drag-assign-hint">Thả vào lớp để giao bài, hoặc nhấn Esc để huỷ.</div>
      </div>
      <div class="drag-assign-status">Đang kéo 1 đề</div>
    </div>
    <div id="drag-assign-scroll" class="drag-assign-scroll"
      ondragover="onDragAssignListOver(event)"
      ondragleave="onDragAssignListLeave(event)">
      <div class="drag-assign-classes">
        ${classes.map(cls => `
          <div class="drag-class-target"
            ondragover="onDragOverClass(event, this)"
            ondragleave="onDragLeaveClass(event, this)"
            ondrop="onDropToClass('${cls.id}', '${escapeHtml(cls.class_name).replace(/'/g, "\\'")}', event)">
            <div class="drag-class-target-icon">🏫</div>
            <div class="drag-class-target-body">
              <div class="drag-class-target-title">${escapeHtml(cls.class_name)}</div>
              <div class="drag-class-target-meta">${cls.student_count || 0} học sinh</div>
              <div class="drag-class-target-drop-label">Thả để giao vào lớp này</div>
            </div>
          </div>`).join('')}
      </div>
    </div>
    <div class="drag-assign-footer">
      <div class="drag-assign-cancel">Kéo gần mép trên/dưới để cuộn danh sách lớp khi có nhiều lớp.</div>
      <div class="drag-cancel-target"
        ondragover="onDragOverCancel(event, this)"
        ondragleave="onDragLeaveCancel(event, this)"
        ondrop="onDropCancelDrag(event)">
        <div class="drag-cancel-target-icon">✕</div>
        <div>
          <div class="drag-cancel-target-title">Thả vào đây để huỷ</div>
          <div class="drag-cancel-target-meta">Hoặc nhả ra ngoài vùng drop</div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(panel);
  requestAnimationFrame(() => panel.classList.add('drag-assign-panel--visible'));
}

function hideDragAssignPanel() {
  _setDragAssignState('');
  _setDragAssignAutoScroll(0);
  const panel = document.getElementById('drag-assign-panel');
  if (!panel) return;
  panel.classList.remove('drag-assign-panel--visible');
  setTimeout(() => panel.remove(), 220);
}

function cancelDragAssign() {
  hideDragAssignPanel();
  document.querySelectorAll('tr.dragging').forEach(r => r.classList.remove('dragging'));
  _dragQuestionId = null;
  _dragQuestionTitle = '';
}

function _setDragAssignState(state, el = null) {
  const panel = document.getElementById('drag-assign-panel');
  if (!panel) return;

  panel.dataset.dropMode = state || '';
  document.querySelectorAll('.drag-class-target.drag-over, .drag-cancel-target.drag-over')
    .forEach(node => node.classList.remove('drag-over'));

  if (el) el.classList.add('drag-over');
}

function _setDragAssignAutoScroll(dir) {
  _dragAutoScrollDir = dir;
  if (!dir) {
    if (_dragAutoScrollRaf) cancelAnimationFrame(_dragAutoScrollRaf);
    _dragAutoScrollRaf = null;
    return;
  }
  if (_dragAutoScrollRaf) return;

  const tick = () => {
    const box = document.getElementById('drag-assign-scroll');
    if (!box || !_dragAutoScrollDir) {
      _dragAutoScrollRaf = null;
      return;
    }
    box.scrollTop += _dragAutoScrollDir * 14;
    _dragAutoScrollRaf = requestAnimationFrame(tick);
  };
  _dragAutoScrollRaf = requestAnimationFrame(tick);
}

function onDragAssignListOver(e) {
  const box = document.getElementById('drag-assign-scroll');
  if (!box) return;

  const rect = box.getBoundingClientRect();
  const threshold = 64;
  let dir = 0;

  if (e.clientY < rect.top + threshold) dir = -1;
  else if (e.clientY > rect.bottom - threshold) dir = 1;

  _setDragAssignAutoScroll(dir);
}

function onDragAssignListLeave() {
  _setDragAssignAutoScroll(0);
}

function onDragOverClass(e, el) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
  _setDragAssignState('class', el);
  onDragAssignListOver(e);
}

function onDragLeaveClass(e, el) {
  if (el.contains(e.relatedTarget)) return;
  el.classList.remove('drag-over');
  _setDragAssignState('');
}

function onDragOverCancel(e, el) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  _setDragAssignState('cancel', el);
  _setDragAssignAutoScroll(0);
}

function onDragLeaveCancel(e, el) {
  if (el.contains(e.relatedTarget)) return;
  el.classList.remove('drag-over');
  _setDragAssignState('');
}

function onDropToClass(classId, className, e) {
  e.preventDefault();
  const qId = _dragQuestionId || e.dataTransfer.getData('text/plain');
  _dragQuestionId = null;
  _dragQuestionTitle = '';
  hideDragAssignPanel();
  document.querySelectorAll('tr.dragging').forEach(r => r.classList.remove('dragging'));
  if (qId) openAssignModal(classId, className, qId);
}

function onDropCancelDrag(e) {
  e.preventDefault();
  cancelDragAssign();
}
window.onQuestionDragStart = onQuestionDragStart;
window.onQuestionDragEnd   = onQuestionDragEnd;
window.onDropToClass       = onDropToClass;
window.onDragAssignListOver = onDragAssignListOver;
window.onDragAssignListLeave = onDragAssignListLeave;
window.onDragOverClass = onDragOverClass;
window.onDragLeaveClass = onDragLeaveClass;
window.onDragOverCancel = onDragOverCancel;
window.onDragLeaveCancel = onDragLeaveCancel;
window.onDropCancelDrag = onDropCancelDrag;

// B4.4 — Preview as student
async function previewAsStudent(id) {
  const cached = _allQuestions.find(x => x.id == id);
  if (!cached) return;
  const full = (!Array.isArray(cached.content_blocks) && !cached.content_text)
    ? await api.get(`/questions/${id}`).catch(() => cached)
    : cached;
  const data = full || cached;
  const skill = data.skill;
  const qs = Array.isArray(data.questions_data) ? data.questions_data : [];
  let body;
  if (skill === 'reading' || skill === 'listening') {
    let answerRows = '';
    for (let i = 1; i <= qs.length; i++) {
      answerRows += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span style="width:30px;font-weight:600;color:var(--gray-400)">Q${i}</span><input class="form-input" placeholder="Đáp án câu ${i}" style="flex:1" /></div>`;
    }
    body = `
      <div class="preview-as-student">
        <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:8px 12px;font-size:12px;margin-bottom:14px;color:#92400e">⚠️ Đây là chế độ xem trước — không lưu đáp án</div>
        <div style="display:grid;grid-template-columns:1fr 320px;gap:14px">
          <div>
            ${data.content_url ? `<audio controls src="${data.content_url}" style="width:100%;margin-bottom:10px"></audio>` : ''}
            <div style="background:var(--gray-50);border:1px solid var(--gray-200);border-radius:8px;padding:14px;font-size:13px;line-height:1.7;max-height:400px;overflow-y:auto">${renderRichQuestionContentHTML(data.content_blocks, data.content_text || '')}</div>
          </div>
          <div>
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--gray-400);margin-bottom:8px">Điền đáp án</div>
            ${answerRows || '<div style="color:var(--gray-400)">Không có câu hỏi.</div>'}
          </div>
        </div>
      </div>`;
  } else if (skill === 'writing') {
    body = `
      <div>
        <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:8px 12px;font-size:12px;margin-bottom:14px;color:#92400e">⚠️ Đây là chế độ xem trước</div>
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--gray-400);margin-bottom:6px">Đề bài</div>
        <div style="background:var(--gray-50);border:1px solid var(--gray-200);border-radius:8px;padding:14px;font-size:13px;line-height:1.7;margin-bottom:14px">${renderRichQuestionContentHTML(data.content_blocks, data.content_text || '')}</div>
        <textarea class="form-input" placeholder="Học sinh sẽ viết bài ở đây..." style="width:100%;min-height:200px;padding:12px"></textarea>
      </div>`;
  } else if (skill === 'speaking') {
    body = `
      <div>
        <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:8px 12px;font-size:12px;margin-bottom:14px;color:#92400e">⚠️ Đây là chế độ xem trước</div>
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--gray-400);margin-bottom:6px">Cue Card</div>
        <div style="background:var(--gray-50);border:1px solid var(--gray-200);border-radius:8px;padding:14px;font-size:13px;line-height:1.7;margin-bottom:14px">${renderRichQuestionContentHTML(data.content_blocks, data.content_text || '')}</div>
        <div style="text-align:center;padding:24px;border:2px dashed var(--gray-300, var(--gray-200));border-radius:8px;color:var(--gray-400)">🎙️ Học sinh sẽ thu âm ở đây</div>
      </div>`;
  }
  const fullTitle = `Xem trước: ${data.title}`;
  openModal(fullTitle, body + `
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">Đóng</button>
      <button class="btn btn-primary" onclick="closeModal();navigate('/questions/${id}')">Chỉnh sửa đề</button>
    </div>`);
}
window.previewAsStudent = previewAsStudent;

function renderQuestions() {
  const allQuestions = _allQuestions;
  let filtered = _currentSkillFilter
    ? allQuestions.filter(q => q.skill === _currentSkillFilter)
    : allQuestions;
  if (_questionSearch) {
    const s = _questionSearch.toLowerCase();
    filtered = filtered.filter(q =>
      q.title.toLowerCase().includes(s) ||
      (Array.isArray(q.tags) && q.tags.some(t => t.toLowerCase().includes(s)))
    );
  }
  if (_questionTagFilter) {
    filtered = filtered.filter(q =>
      Array.isArray(q.tags) && q.tags.includes(_questionTagFilter)
    );
  }

  // If the questions page is already rendered, only update tbody + skill tabs
  // to avoid destroying the search input and losing focus.
  const existingTbody = $('#app')?.querySelector('table tbody');
  if (existingTbody) {
    existingTbody.innerHTML = _buildQuestionTableRows(filtered);
    document.querySelectorAll('.skill-tab').forEach(btn => {
      btn.classList.toggle('active', btn.textContent.trim().includes(
        _currentSkillFilter
          ? { reading:'Reading', listening:'Listening', writing:'Writing', speaking:'Speaking' }[_currentSkillFilter]
          : 'Tất cả'
      ));
    });
    // Update tag filter bar
    const toolbar = $('#app')?.querySelector('.list-toolbar');
    if (toolbar) {
      let bar = toolbar.querySelector('.tag-filter-bar');
      if (_questionTagFilter && !bar) {
        bar = document.createElement('div');
        bar.className = 'tag-filter-bar';
        toolbar.appendChild(bar);
      }
      if (bar) {
        bar.innerHTML = _questionTagFilter
          ? `Lọc tag: <span class="tag-chip tag-chip-active">${escapeHtml(_questionTagFilter)}<button class="tag-chip-remove" onclick="setQuestionTagFilter('')">×</button></span>`
          : '';
        if (!_questionTagFilter) bar.remove();
      }
    }
    return;
  }

  // Full initial render
  $('#app').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Kho đề</div>
        <div class="page-subtitle">Tổng cộng ${allQuestions.length} đề thi</div>
      </div>
      <button class="btn btn-primary" onclick="navigate('/questions/new')">
        + Tạo đề mới
      </button>
    </div>

    <div class="list-toolbar">
      <input id="question-search-input" class="form-input search-input"
        placeholder="🔍 Tìm theo tên đề hoặc tag..."
        value="${escapeHtml(_questionSearch)}" />
      ${_questionTagFilter ? `<div class="tag-filter-bar">Lọc tag: <span class="tag-chip tag-chip-active">${escapeHtml(_questionTagFilter)}<button class="tag-chip-remove" onclick="setQuestionTagFilter('')">×</button></span></div>` : ''}
    </div>

    <div class="skill-tabs">
      ${[['', 'Tất cả'], ['reading','📖 Reading'], ['listening','🎧 Listening'],
         ['writing','✍️ Writing'], ['speaking','🎤 Speaking']].map(([s, label]) => `
        <button class="skill-tab ${_currentSkillFilter === s ? 'active' : ''}"
          onclick="setSkillFilter('${s}')">
          ${label}
        </button>`).join('')}
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Kỹ năng</th>
            <th>Tiêu đề <span style="font-size:11px;font-weight:400;color:var(--gray-400)">(click để xem nhanh)</span></th>
            <th>Tags</th>
            <th>Chi tiết</th>
            <th>Ngày tạo</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>${_buildQuestionTableRows(filtered)}</tbody>
      </table>
    </div>`;

  // Attach listener after DOM is created so input keeps focus while typing
  const searchInput = document.getElementById('question-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      _questionSearch = searchInput.value;
      renderQuestions();
    });
    if (_questionSearch) searchInput.focus();
  }
}

function setQuestionTagFilter(tag) {
  _questionTagFilter = tag;
  renderQuestions();
}
window.setQuestionTagFilter = setQuestionTagFilter;

async function previewQuestion(id) {
  // Find from cache for instant title display
  const cached = _allQuestions.find(x => x.id == id);
  if (!cached) return;

  // Show modal immediately with cached data while fetching full content
  const qs = Array.isArray(cached.questions_data) ? cached.questions_data : [];
  const buildModal = (q, qRows, hasMore) => `
    <div style="margin-bottom:12px">${skillBadge(q.skill)}</div>
    <div style="display:flex;gap:16px;margin-bottom:16px;flex-wrap:wrap">
      <span class="stat-chip">📋 ${qs.length} câu hỏi</span>
      <span class="stat-chip">📅 Tạo ${formatDate(q.created_at)}</span>
      ${q.content_url ? `<span class="stat-chip">🔊 Có audio</span>` : ''}
    </div>
    ${(q.content_text || (Array.isArray(q.content_blocks) && q.content_blocks.length)) ? `
    <div style="margin-bottom:16px">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--gray-400);margin-bottom:6px">📄 Nội dung đề bài</div>
      <div style="max-height:220px;overflow-y:auto;background:var(--gray-50);border:1px solid var(--gray-200);border-radius:8px;padding:12px 14px;font-size:13px;line-height:1.7;color:var(--gray-800)">${renderRichQuestionContentHTML(q.content_blocks, q.content_text || '')}</div>
    </div>` : ''}
    ${qRows ? `
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--gray-400);margin-bottom:6px">📝 Đáp án</div>
    <div class="preview-q-list">${qRows}${hasMore ? `<p style="color:var(--gray-400);font-size:12px;margin-top:8px">...và ${qs.length-20} câu nữa</p>` : ''}</div>` : ''}
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">Đóng</button>
      <button class="btn btn-primary" onclick="closeModal();navigate('/questions/${id}')">Chỉnh sửa</button>
    </div>`;

  const buildRows = (q) => {
    const qArr = Array.isArray(q.questions_data) ? q.questions_data : [];
    if (qArr.length === 0) return { qRows: '', hasMore: false };
    const qRows = qArr.slice(0, 20).map(item => `
      <div class="preview-q-row">
        <span class="preview-q-num">Q${item.q_no ?? item.question_number ?? '?'}</span>
        <div class="preview-q-main">
          <div class="preview-q-ans-label">Đáp án</div>
          <div class="preview-q-ans">${
            Array.isArray(item.answers) && item.answers.length ? item.answers.map(ans => `<span class="preview-answer-chip">${escapeHtml(ans)}</span>`).join('') :
            Array.isArray(item.correct_answers) && item.correct_answers.length ? item.correct_answers.map(ans => `<span class="preview-answer-chip">${escapeHtml(ans)}</span>`).join('') :
            `<span class="preview-answer-empty">Chưa có đáp án</span>`
          }</div>
        </div>
        <div class="preview-q-meta">
          ${item.location    ? `<span class="preview-q-loc"  title="${escapeHtml(item.location)}">📍</span>`    : ''}
          ${item.explanation ? `<span class="preview-q-expl" title="${escapeHtml(item.explanation)}">💡</span>` : ''}
        </div>
      </div>`).join('');
    return { qRows, hasMore: qArr.length > 20 };
  };

  // Show immediately with cached data (no content_text yet)
  const { qRows: initRows, hasMore: initMore } = buildRows(cached);
  openModal(escapeHtml(cached.title), buildModal(cached, initRows, initMore));

  // Fetch full data in background for content_text
  if (!cached.content_text && (cached.skill === 'reading' || cached.skill === 'listening' || cached.skill === 'writing' || cached.skill === 'speaking')) {
    try {
      const full = await api.get(`/questions/${id}`);
      // Update cache
      Object.assign(cached, full);
      // Re-render modal body if still open
      const modalBody = document.getElementById('modal-body');
      if (modalBody) {
        const { qRows, hasMore } = buildRows(full);
        modalBody.innerHTML = buildModal(full, qRows, hasMore);
      }
    } catch {}
  }
}
window.previewQuestion = previewQuestion;

function setSkillFilter(skill) {
  _currentSkillFilter = skill;
  renderQuestions();
}

async function deleteQuestion(id, btn) {
  if (!confirm('Xoá đề này khỏi kho? Đề đang được dùng trong bài tập sẽ không xoá được.')) return;
  btnLoading(btn);
  try {
    await api.delete(`/questions/${id}`);
    toast('Đã xoá đề');
    showQuestions();
  } catch (e) {
    btnReset(btn);
    toast('Lỗi xoá: ' + (e.error || e.message), 'error');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTENT COMPOSER (text + inline images)
// ═══════════════════════════════════════════════════════════════════════════

let _contentBlocks = [];
let _contentBlockSeq = 1;
let _contentImageUploadCount = 0;
let _composerSavedRange = null;
let _composerCollapsed = false;

function nextContentBlockId() { return `cb-${_contentBlockSeq++}`; }
function createTextBlock(html = '') { return { id: nextContentBlockId(), type: 'text', html }; }
function createImageBlock(url = '', alt = '', width = 100) { return { id: nextContentBlockId(), type: 'image', url, alt, width }; }

function repairImageTokensInBlocks(blocks) {
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
      if (h) result.push({ id: nextContentBlockId(), type: 'text', html: h });
      textDiv = document.createElement('div');
    }
    function walkRepair(node) {
      if (node.nodeType === Node.ELEMENT_NODE && node.classList?.contains('document-editor-image-token')) {
        flushText();
        result.push({ id: node.dataset.blockId || nextContentBlockId(), type: 'image', url: node.dataset.url || '', alt: node.dataset.alt || '', width: Math.max(1, Number(node.dataset.width) || 100) });
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

function normalizeContentBlocksForEditor(blocks, fallbackText = '') {
  const repaired = repairImageTokensInBlocks(Array.isArray(blocks) ? blocks : []);
  const normalized = repaired
    .map(item => {
        if (item?.type === 'image' && item?.url) {
          return { id: item.id || nextContentBlockId(), type: 'image', url: item.url, alt: item.alt || '', width: Number(item.width) || 100 };
        }
        const html = item?.html ?? (item?.text ? textToEditorHtml(item.text) : '');
        const text = (() => { const t = document.createElement('div'); t.innerHTML = html; return t.textContent || ''; })();
        return { id: item?.id || nextContentBlockId(), type: 'text', html, text };
      }).filter(Boolean);
  if (normalized.length > 0) return normalized;
  return [createTextBlock(escapeHtml(fallbackText || ''))];
}

function blocksToPlainText(blocks = _contentBlocks) {
  return (blocks || [])
    .filter(block => block.type === 'text')
    .map(block => {
      if (block.html) {
        const tmp = document.createElement('div');
        tmp.innerHTML = block.html;
        return (tmp.textContent || '').trim();
      }
      return String(block.text || '').trim();
    })
    .filter(Boolean)
    .join('\n\n')
    .trim();
}

function renderRichQuestionContentHTML(blocks, fallbackText = '', extraClass = '') {
  const normalized = normalizeContentBlocksForEditor(blocks, fallbackText);
  if ((!Array.isArray(blocks) || blocks.length === 0) && fallbackText) {
    return `<div class="mixed-content ${extraClass}"><div class="mixed-content-text">${escapeHtml(fallbackText)}</div></div>`;
  }
  return `
    <div class="mixed-content ${extraClass}">
      ${normalized.map(block => block.type === 'image'
        ? `<figure class="mixed-content-image-wrap" data-block-id="${escapeHtml(block.id)}" style="width:${Math.max(1, Number(block.width) || 100)}%"><img class="mixed-content-image" src="${escapeHtml(block.url)}" alt="${escapeHtml(block.alt || 'Question image')}" /></figure>`
        : `<div class="mixed-content-text" data-block-id="${escapeHtml(block.id)}">${block.html ?? escapeHtml(block.text || '')}</div>`
      ).join('')}
    </div>`;
}

function contentComposerHtml(label, hint = '') {
  return `
    <div class="form-group">
      <label class="form-label">${label}</label>
      ${hint ? `<div class="form-hint" style="margin-bottom:8px">${hint}</div>` : ''}
      <div class="content-composer-shell">
        <div class="content-composer-toolbar">
          <button type="button" class="btn btn-outline btn-sm" onclick="openImagePicker()">+ Chèn ảnh</button>
          <button type="button" class="btn btn-outline btn-sm" id="content-composer-toggle" onclick="toggleComposerEditor()">Thu gọn editor</button>
          <span class="content-composer-toolbar-note">Soạn như một tài liệu duy nhất. Có thể paste text bình thường và dán ảnh từ clipboard vào đúng vị trí con trỏ.</span>
        </div>
        <div class="content-composer-format-bar">
          <button type="button" class="fmt-btn" id="fmt-bold" onmousedown="event.preventDefault()" onclick="applyFormat('bold')" title="In đậm (Ctrl+B)"><b>B</b></button>
          <button type="button" class="fmt-btn" id="fmt-italic" onmousedown="event.preventDefault()" onclick="applyFormat('italic')" title="In nghiêng (Ctrl+I)"><i>I</i></button>
          <button type="button" class="fmt-btn" id="fmt-underline" onmousedown="event.preventDefault()" onclick="applyFormat('underline')" title="Gạch chân (Ctrl+U)"><u>U</u></button>
          <div class="fmt-sep"></div>
          <select class="fmt-select" id="fmt-fontsize" onfocus="saveComposerRange()" onchange="applyFormatFontSize(this.value)" title="Cỡ chữ">
            <option value="">Cỡ chữ (13)</option>
            <option value="11">11</option>
            <option value="12">12</option>
            <option value="13">13</option>
            <option value="14">14</option>
            <option value="16">16</option>
            <option value="18">18</option>
            <option value="20">20</option>
            <option value="24">24</option>
            <option value="28">28</option>
            <option value="32">32</option>
          </select>
          <div class="fmt-sep"></div>
          <div style="position:relative">
            <button type="button" class="fmt-color-wrap" id="fmt-color-btn" title="Màu chữ" onmousedown="saveComposerRange();event.preventDefault()" onclick="toggleColorPalette()">
              <span class="fmt-color-label" id="fmt-color-label">A</span>
            </button>
            <div id="fmt-color-palette" class="fmt-color-palette" style="display:none" onmousedown="event.preventDefault()">
              <div class="fmt-palette-swatches">
                ${['#000000','#434343','#666666','#999999','#ffffff',
                   '#ff0000','#e91e63','#9c27b0','#3f51b5','#2196f3',
                   '#03a9f4','#009688','#4caf50','#8bc34a','#ffeb3b',
                   '#ff9800','#ff5722','#795548','#607d8b','#1a237e'].map(c =>
                  `<button type="button" class="fmt-swatch" style="background:${c}" title="${c}" onmousedown="event.preventDefault()" onclick="applyFormatColor('${c}');closeColorPalette()"></button>`
                ).join('')}
              </div>
              <div class="fmt-palette-custom">
                <input type="color" id="fmt-color-input" value="#1a1a1a" class="fmt-color-input-custom">
                <button type="button" class="fmt-palette-apply" onclick="applyFormatColor(document.getElementById('fmt-color-input').value);closeColorPalette()">Áp dụng</button>
              </div>
            </div>
          </div>
          <div class="fmt-sep"></div>
          <div style="position:relative">
            <button type="button" class="fmt-btn fmt-table-btn" id="fmt-table-btn" title="Chèn bảng" onmousedown="saveComposerRange();event.preventDefault()" onclick="toggleTablePicker()">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.4"/><rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.4"/><rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.4"/><rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.4"/></svg>
            </button>
            <div id="fmt-table-picker" class="fmt-table-picker" style="display:none" onmousedown="event.preventDefault()">
              <div class="fmt-table-grid" id="fmt-table-grid"></div>
              <div class="fmt-table-size-label" id="fmt-table-size-label">Chọn kích thước bảng</div>
            </div>
          </div>
        </div>
        <input id="content-image-file-input" type="file" accept="image/*" style="display:none" />
        <div id="content-composer-editor-panel">
          <div id="content-composer-status" class="content-composer-status">Soạn nội dung trong một khung duy nhất. Ảnh sẽ được chèn inline và khi lưu sẽ tự parse thành text/image blocks.</div>
          <div class="content-document-surface">
            <div id="content-composer-host" class="content-composer-host"
              contenteditable="true" spellcheck="false"
              data-placeholder="Nhập nội dung ở đây..."></div>
          </div>
        </div>
        <div class="content-composer-preview">
          <div class="content-composer-preview-title">Xem trước nội dung</div>
          <div id="content-composer-preview-body" class="content-composer-preview-body"></div>
        </div>
      </div>
    </div>`;
}

function setComposerStatus(message, type = '') {
  const el = document.getElementById('content-composer-status');
  if (!el) return;
  el.className = `content-composer-status${type ? ` is-${type}` : ''}`;
  el.textContent = message;
}

function textToEditorHtml(text = '') {
  const normalized = String(text || '').replace(/\r/g, '');
  return normalized ? escapeHtml(normalized).replace(/\n/g, '<br>') : '';
}

function createEditorImageHtml(block) {
  const width = Math.max(1, Number(block.width) || 100);
  return `<figure class="document-editor-image-token" contenteditable="false" data-block-id="${escapeHtml(block.id)}" data-url="${escapeHtml(block.url)}" data-alt="${escapeHtml(block.alt || '')}" data-width="${width}" style="width:${width}%"><img class="document-editor-image-preview" src="${escapeHtml(block.url)}" alt="${escapeHtml(block.alt || 'image')}" draggable="false" /><button type="button" class="document-editor-image-remove" title="Xoá ảnh" aria-label="Xoá ảnh">×</button><button type="button" class="document-editor-image-resize" title="Kéo để đổi kích thước" aria-label="Resize"></button></figure>`;
}

function buildEditorDocumentHtml(blocks, fallbackText = '') {
  const normalized = normalizeContentBlocksForEditor(blocks, fallbackText);
  let html = '';
  for (const block of normalized) {
    if (block.type === 'text') {
      html += block.html !== undefined ? block.html : textToEditorHtml(block.text || '');
    } else if (block.type === 'image' && block.url) {
      html += createEditorImageHtml(block);
    }
  }
  return html;
}

function normalizeEditorExtractedText(text = '') {
  return String(text || '')
    .replace(/ /g, ' ')
    .replace(/​/g, '')
    .replace(/\r/g, '')
    .replace(/^\n+|\n+$/g, '');
}

function syncContentBlocksFromEditor() {
  const host = document.getElementById('content-composer-host');
  if (!host) return;
  const blocks = [];
  let tmpDiv = document.createElement('div');

  function flushHtml() {
    const clone = tmpDiv.cloneNode(true);
    clone.querySelectorAll('.editor-table-wrap').forEach(wrap => {
      const tbl = wrap.querySelector('.editor-table');
      if (tbl) { tbl.style.width = wrap.style.width || '100%'; wrap.replaceWith(tbl.cloneNode(true)); }
      else wrap.remove();
    });
    clone.querySelectorAll('.editor-table-resize-handle').forEach(el => el.remove());
    const html = clone.innerHTML.replace(/^(<br\s*\/?>)+|(<br\s*\/?>)+$/gi, '').trim();
    if (html) blocks.push({ id: nextContentBlockId(), type: 'text', html });
    tmpDiv = document.createElement('div');
  }

  function walkNode(node) {
    if (node.nodeType === Node.ELEMENT_NODE && node.classList?.contains('document-editor-image-token')) {
      flushHtml();
      blocks.push({ id: node.dataset.blockId || nextContentBlockId(), type: 'image', url: node.dataset.url || '', alt: node.dataset.alt || '', width: Math.max(1, Number(node.dataset.width) || 100) });
    } else if (node.nodeType === Node.ELEMENT_NODE && node.querySelector?.('.document-editor-image-token')) {
      node.childNodes.forEach(child => walkNode(child));
    } else {
      tmpDiv.appendChild(node.cloneNode(true));
    }
  }
  host.childNodes.forEach(node => walkNode(node));
  flushHtml();
  _contentBlocks = blocks.length ? blocks : [createTextBlock('')];
  refreshContentComposerPreview();
}

function saveComposerRange() {
  const sel = window.getSelection();
  if (!sel?.rangeCount) return;
  const host = document.getElementById('content-composer-host');
  const range = sel.getRangeAt(0);
  if (host?.contains(range.commonAncestorContainer)) {
    _composerSavedRange = range.cloneRange();
  }
}

function insertImageAtSavedRange(imageBlock) {
  const host = document.getElementById('content-composer-host');
  if (!host) return;
  const frag = document.createRange().createContextualFragment(createEditorImageHtml(imageBlock));
  const figure = frag.firstElementChild;
  const range = _composerSavedRange;
  if (range && host.contains(range.commonAncestorContainer)) {
    range.deleteContents();
    range.insertNode(figure);
    if (!figure.nextSibling) host.appendChild(document.createTextNode(''));
    const sel = window.getSelection();
    const after = document.createRange();
    after.setStartAfter(figure);
    after.collapse(true);
    sel?.removeAllRanges();
    sel?.addRange(after);
  } else {
    host.appendChild(figure);
    if (!figure.nextSibling) host.appendChild(document.createTextNode(''));
  }
  _composerSavedRange = null;
  bindImageEditorEvents(host);
  syncContentBlocksFromEditor();
}

function bindTableEditorEvents(host) {
  host.querySelectorAll('.editor-table').forEach(table => {
    if (table.closest('.editor-table-wrap')) return; // already wrapped
    const wrap = document.createElement('div');
    wrap.className = 'editor-table-wrap';
    wrap.style.width = table.style.width || '100%';
    table.style.width = '100%';
    table.parentNode.insertBefore(wrap, table);
    wrap.appendChild(table);
    const handle = document.createElement('button');
    handle.type = 'button';
    handle.className = 'editor-table-resize-handle';
    handle.contentEditable = 'false';
    handle.title = 'Kéo để đổi kích thước bảng';
    handle.innerHTML = '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 9L9 2M5 9L9 5M8 9L9 8" stroke="#475569" stroke-width="1.6" stroke-linecap="round"/></svg>';
    wrap.appendChild(handle);
    handle.onpointerdown = (e) => {
      e.preventDefault(); e.stopPropagation();
      const hostW = host.clientWidth || 1;
      const startX = e.clientX;
      const startW = wrap.getBoundingClientRect().width;
      wrap.classList.add('resizing');
      document.body.classList.add('resizing-image');
      const onMove = (ev) => {
        const newPx = Math.max(60, startW + (ev.clientX - startX));
        const newPct = Math.max(10, Math.min(100, Math.round((newPx / hostW) * 100)));
        wrap.style.width = newPct + '%';
        setComposerStatus(`Độ rộng bảng: ${newPct}%`, 'loading');
      };
      const onUp = () => {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        wrap.classList.remove('resizing');
        document.body.classList.remove('resizing-image');
        syncContentBlocksFromEditor();
        setComposerStatus('Đã cập nhật kích thước bảng.', 'success');
      };
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp, { once: true });
    };
  });
}

function bindImageEditorEvents(host) {
  host.querySelectorAll('.document-editor-image-token').forEach(figure => {
    const removeBtn = figure.querySelector('.document-editor-image-remove');
    if (removeBtn && !removeBtn._bound) {
      removeBtn._bound = true;
      removeBtn.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); });
      removeBtn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        figure.remove();
        syncContentBlocksFromEditor();
        setComposerStatus('Đã xoá ảnh khỏi nội dung.', 'success');
      });
    }
    const resizeBtn = figure.querySelector('.document-editor-image-resize');
    if (resizeBtn && !resizeBtn._bound) {
      resizeBtn._bound = true;
      resizeBtn.onpointerdown = (e) => {
        e.preventDefault(); e.stopPropagation();
        const hostW = host.clientWidth || 1;
        const startX = e.clientX;
        const startW = figure.getBoundingClientRect().width;
        document.body.classList.add('resizing-image');
        const onMove = (ev) => {
          const newPx = Math.max(40, startW + (ev.clientX - startX));
          const newPct = Math.max(5, Math.min(100, Math.round((newPx / hostW) * 100)));
          figure.style.width = newPct + '%';
          figure.dataset.width = String(newPct);
          const block = _contentBlocks.find(b => b.id === figure.dataset.blockId && b.type === 'image');
          if (block) block.width = newPct;
          setComposerStatus(`Độ rộng ảnh: ${newPct}%`, 'loading');
        };
        const onUp = () => {
          document.removeEventListener('pointermove', onMove);
          document.removeEventListener('pointerup', onUp);
          document.body.classList.remove('resizing-image');
          syncContentBlocksFromEditor();
          setComposerStatus('Đã cập nhật kích thước ảnh.', 'success');
        };
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp, { once: true });
      };
    }
  });
}

function refreshContentComposerPreview() {
  const preview = document.getElementById('content-composer-preview-body');
  if (!preview) return;
  preview.innerHTML = renderRichQuestionContentHTML(_contentBlocks);
}

function applyComposerCollapsedState() {
  const panel = document.getElementById('content-composer-editor-panel');
  const btn = document.getElementById('content-composer-toggle');
  if (panel) panel.classList.toggle('collapsed', _composerCollapsed);
  if (btn) btn.textContent = _composerCollapsed ? 'Mở editor' : 'Thu gọn editor';
}

function toggleComposerEditor(force) {
  _composerCollapsed = typeof force === 'boolean' ? force : !_composerCollapsed;
  applyComposerCollapsedState();
}

function renderContentComposer() {
  const host = document.getElementById('content-composer-host');
  if (!host) return;
  host.innerHTML = buildEditorDocumentHtml(_contentBlocks);
  host.onkeydown = (e) => {
    if (e.key !== 'Enter') return;
    const selNode = window.getSelection()?.getRangeAt(0)?.commonAncestorContainer;
    const selEl = selNode?.nodeType === 3 ? selNode.parentElement : selNode;
    if (selEl?.closest('td,th')) return;
    e.preventDefault();
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const br = document.createElement('br');
    range.insertNode(br);
    if (!br.nextSibling) host.appendChild(document.createTextNode(''));
    const after = document.createRange();
    after.setStartAfter(br);
    after.collapse(true);
    sel.removeAllRanges();
    sel.addRange(after);
    syncContentBlocksFromEditor();
  };
  host.oninput = () => { syncContentBlocksFromEditor(); saveComposerRange(); };
  host.onmouseup = saveComposerRange;
  host.onkeyup = saveComposerRange;
  host.onpaste = handleComposerPaste;
  const imageInput = document.getElementById('content-image-file-input');
  if (imageInput) imageInput.onchange = onComposerImageSelected;
  bindImageEditorEvents(host);
  bindTableEditorEvents(host);
  bindFormatToolbarStateUpdater();
  refreshContentComposerPreview();
}

let _formatSelListenerBound = false;
let _activeTableCell = null;
function bindFormatToolbarStateUpdater() {
  if (_formatSelListenerBound) return;
  _formatSelListenerBound = true;
  document.addEventListener('selectionchange', () => {
    const host = document.getElementById('content-composer-host');
    if (!host) return;
    const sel = window.getSelection();
    if (sel?.rangeCount && host.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      updateFormatToolbarState();
    }
  });
}

function updateFormatToolbarState() {
  const btnBold = document.getElementById('fmt-bold');
  const btnItalic = document.getElementById('fmt-italic');
  const btnUnderline = document.getElementById('fmt-underline');
  if (btnBold) btnBold.classList.toggle('is-active', document.queryCommandState('bold'));
  if (btnItalic) btnItalic.classList.toggle('is-active', document.queryCommandState('italic'));
  if (btnUnderline) btnUnderline.classList.toggle('is-active', document.queryCommandState('underline'));
  const sel = window.getSelection();
  if (sel?.rangeCount) {
    const node = sel.getRangeAt(0).commonAncestorContainer;
    const el = node.nodeType === 3 ? node.parentElement : node;
    _activeTableCell = el?.closest?.('td,th') || null;
  } else {
    _activeTableCell = null;
  }
  if (_activeTableCell) showTableFloatToolbar(_activeTableCell.closest('table'));
  else hideTableFloatToolbar();
}

function applyFormat(cmd) {
  document.execCommand(cmd);
  syncContentBlocksFromEditor();
}

function applyFormatFontSize(size) {
  const select = document.getElementById('fmt-fontsize');
  if (!size) return;
  const host = document.getElementById('content-composer-host');
  if (!host) return;
  if (_composerSavedRange) {
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(_composerSavedRange);
  }
  const sel = window.getSelection();
  if (!sel?.rangeCount || sel.isCollapsed) {
    if (select) select.value = '';
    return;
  }
  const range = sel.getRangeAt(0);
  const span = document.createElement('span');
  span.style.fontSize = size + 'px';
  try {
    range.surroundContents(span);
  } catch {
    const fragment = range.extractContents();
    span.appendChild(fragment);
    range.insertNode(span);
  }
  if (select) select.value = '';
  host.focus();
  syncContentBlocksFromEditor();
}

function toggleColorPalette() {
  const palette = document.getElementById('fmt-color-palette');
  if (!palette) return;
  const isOpen = palette.style.display !== 'none';
  if (isOpen) { palette.style.display = 'none'; return; }
  palette.style.display = 'block';
  const close = (e) => {
    if (!palette.contains(e.target) && e.target.id !== 'fmt-color-btn') {
      palette.style.display = 'none';
      document.removeEventListener('mousedown', close);
    }
  };
  setTimeout(() => document.addEventListener('mousedown', close), 0);
}

function closeColorPalette() {
  const palette = document.getElementById('fmt-color-palette');
  if (palette) palette.style.display = 'none';
}

// ── TABLE FLOAT TOOLBAR ───────────────────────────────────────────────────────
function ensureTableFloatToolbar() {
  if (document.getElementById('editor-table-float-toolbar')) return;
  const tb = document.createElement('div');
  tb.id = 'editor-table-float-toolbar';
  tb.className = 'editor-table-float-toolbar';
  const btn = (title, onclick, danger, svgPath) =>
    `<button class="tft-btn${danger ? ' tft-danger' : ''}" title="${title}" onmousedown="event.preventDefault()" onclick="${onclick}"><svg width="15" height="15" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">${svgPath}</svg></button>`;
  tb.innerHTML =
    btn('Thêm hàng phía trên', 'tableAddRowAbove()', false,
      '<rect x="1" y="6" width="12" height="7" rx="1" stroke="currentColor" stroke-width="1.4"/><path d="M7 1v4M5 3h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>') +
    btn('Thêm hàng phía dưới', 'tableAddRowBelow()', false,
      '<rect x="1" y="1" width="12" height="7" rx="1" stroke="currentColor" stroke-width="1.4"/><path d="M7 13v-4M5 11h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>') +
    btn('Xóa hàng hiện tại', 'tableDeleteRow()', true,
      '<rect x="1" y="4" width="12" height="6" rx="1" stroke="currentColor" stroke-width="1.4"/><path d="M4 7h6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>') +
    '<div class="tft-sep"></div>' +
    btn('Thêm cột bên trái', 'tableAddColLeft()', false,
      '<rect x="5" y="1" width="8" height="12" rx="1" stroke="currentColor" stroke-width="1.4"/><path d="M1 7h3M2 5v4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>') +
    btn('Thêm cột bên phải', 'tableAddColRight()', false,
      '<rect x="1" y="1" width="8" height="12" rx="1" stroke="currentColor" stroke-width="1.4"/><path d="M13 7h-3M12 5v4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>') +
    btn('Xóa cột hiện tại', 'tableDeleteCol()', true,
      '<rect x="4" y="1" width="6" height="12" rx="1" stroke="currentColor" stroke-width="1.4"/><path d="M6 7h2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>');
  document.body.appendChild(tb);
}

function showTableFloatToolbar(table) {
  ensureTableFloatToolbar();
  const tb = document.getElementById('editor-table-float-toolbar');
  const wrap = table.closest('.editor-table-wrap') || table;
  const rect = wrap.getBoundingClientRect();
  tb.style.left = rect.left + 'px';
  tb.style.top = (rect.top - 44 + window.scrollY) + 'px';
  tb.style.position = 'absolute';
  tb.style.display = 'flex';
}

function hideTableFloatToolbar() {
  const tb = document.getElementById('editor-table-float-toolbar');
  if (tb) tb.style.display = 'none';
}

// ── TABLE PICKER ──────────────────────────────────────────────────────────────
function toggleTablePicker() {
  const picker = document.getElementById('fmt-table-picker');
  if (!picker) return;
  if (picker.style.display !== 'none') { picker.style.display = 'none'; return; }
  const grid = document.getElementById('fmt-table-grid');
  if (grid && !grid.children.length) {
    for (let r = 1; r <= 5; r++) {
      for (let c = 1; c <= 6; c++) {
        const cell = document.createElement('div');
        cell.className = 'fmt-table-cell';
        cell.dataset.row = r; cell.dataset.col = c;
        cell.onmouseover = () => highlightTableGrid(r, c);
        cell.onclick = () => { insertTable(r, c); closeTablePicker(); };
        grid.appendChild(cell);
      }
    }
    grid.onmouseleave = () => {
      grid.querySelectorAll('.fmt-table-cell').forEach(c => c.classList.remove('is-selected'));
      const lbl = document.getElementById('fmt-table-size-label');
      if (lbl) lbl.textContent = 'Chọn kích thước bảng';
    };
  }
  picker.style.display = 'block';
  const close = (e) => {
    if (!picker.contains(e.target) && e.target.id !== 'fmt-table-btn') {
      picker.style.display = 'none';
      document.removeEventListener('mousedown', close);
    }
  };
  setTimeout(() => document.addEventListener('mousedown', close), 0);
}

function closeTablePicker() {
  const picker = document.getElementById('fmt-table-picker');
  if (picker) picker.style.display = 'none';
}

function highlightTableGrid(rows, cols) {
  const grid = document.getElementById('fmt-table-grid');
  const lbl = document.getElementById('fmt-table-size-label');
  if (!grid) return;
  grid.querySelectorAll('.fmt-table-cell').forEach(cell => {
    cell.classList.toggle('is-selected', Number(cell.dataset.row) <= rows && Number(cell.dataset.col) <= cols);
  });
  if (lbl) lbl.textContent = `${rows} × ${cols} bảng`;
}

function insertTable(rows, cols) {
  const host = document.getElementById('content-composer-host');
  if (!host) return;
  if (_composerSavedRange) {
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(_composerSavedRange);
  }
  const colPct = Math.floor(100 / cols);
  let html = `<table class="editor-table" style="width:100%"><tbody>`;
  for (let r = 0; r < rows; r++) {
    html += '<tr>';
    for (let c = 0; c < cols; c++) html += `<td style="width:${colPct}%"><br></td>`;
    html += '</tr>';
  }
  html += '</tbody></table><br>';
  document.execCommand('insertHTML', false, html);
  _composerSavedRange = null;
  bindTableEditorEvents(host);
  syncContentBlocksFromEditor();
}

// ── TABLE ROW / COLUMN OPERATIONS ────────────────────────────────────────────
function tableAddRowAbove() {
  if (!_activeTableCell) return;
  const row = _activeTableCell.closest('tr');
  if (!row) return;
  const colCount = row.closest('table').querySelector('tr').querySelectorAll('td,th').length;
  const newRow = document.createElement('tr');
  for (let i = 0; i < colCount; i++) { const td = document.createElement('td'); td.innerHTML = '<br>'; newRow.appendChild(td); }
  row.parentNode.insertBefore(newRow, row);
  syncContentBlocksFromEditor();
}

function tableAddRowBelow() {
  if (!_activeTableCell) return;
  const row = _activeTableCell.closest('tr');
  if (!row) return;
  const colCount = row.closest('table').querySelector('tr').querySelectorAll('td,th').length;
  const newRow = document.createElement('tr');
  for (let i = 0; i < colCount; i++) { const td = document.createElement('td'); td.innerHTML = '<br>'; newRow.appendChild(td); }
  row.parentNode.insertBefore(newRow, row.nextSibling);
  syncContentBlocksFromEditor();
}

function tableDeleteRow() {
  if (!_activeTableCell) return;
  const row = _activeTableCell.closest('tr');
  if (!row) return;
  const table = row.closest('table');
  row.remove();
  if (table && !table.querySelectorAll('tr').length) table.remove();
  _activeTableCell = null;
  hideTableFloatToolbar();
  syncContentBlocksFromEditor();
}

function tableAddColLeft() {
  if (!_activeTableCell) return;
  const table = _activeTableCell.closest('table');
  if (!table) return;
  const currentRow = _activeTableCell.closest('tr');
  const colIndex = Array.from(currentRow.querySelectorAll('td,th')).indexOf(_activeTableCell);
  table.querySelectorAll('tr').forEach(tr => {
    const cells = tr.querySelectorAll('td,th');
    const ref = cells[colIndex];
    if (!ref) return;
    const newCell = document.createElement('td');
    newCell.innerHTML = '<br>';
    tr.insertBefore(newCell, ref);
  });
  syncContentBlocksFromEditor();
}

function tableAddColRight() {
  if (!_activeTableCell) return;
  const table = _activeTableCell.closest('table');
  if (!table) return;
  const currentRow = _activeTableCell.closest('tr');
  const colIndex = Array.from(currentRow.querySelectorAll('td,th')).indexOf(_activeTableCell);
  table.querySelectorAll('tr').forEach(tr => {
    const cells = tr.querySelectorAll('td,th');
    const ref = cells[colIndex];
    if (!ref) return;
    const newCell = document.createElement('td');
    newCell.innerHTML = '<br>';
    tr.insertBefore(newCell, ref.nextSibling);
  });
  syncContentBlocksFromEditor();
}

function tableDeleteCol() {
  if (!_activeTableCell) return;
  const table = _activeTableCell.closest('table');
  if (!table) return;
  const currentRow = _activeTableCell.closest('tr');
  const colIndex = Array.from(currentRow.querySelectorAll('td,th')).indexOf(_activeTableCell);
  table.querySelectorAll('tr').forEach(tr => {
    const cells = tr.querySelectorAll('td,th');
    if (cells[colIndex]) cells[colIndex].remove();
  });
  _activeTableCell = null;
  hideTableFloatToolbar();
  syncContentBlocksFromEditor();
}

function applyFormatColor(color) {
  const host = document.getElementById('content-composer-host');
  if (!host) return;
  if (_composerSavedRange) {
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(_composerSavedRange);
  }
  document.execCommand('styleWithCSS', false, true);
  document.execCommand('foreColor', false, color);
  const label = document.getElementById('fmt-color-label');
  if (label) label.style.borderBottomColor = color;
  syncContentBlocksFromEditor();
}

function initContentComposer(blocks, fallbackText = '') {
  _contentBlocks = normalizeContentBlocksForEditor(blocks, fallbackText);
  _composerSavedRange = null;
  renderContentComposer();
  applyComposerCollapsedState();
}

function openImagePicker() {
  saveComposerRange();
  document.getElementById('content-image-file-input')?.click();
}

async function uploadComposerImage(file) {
  _contentImageUploadCount++;
  setComposerStatus(`Đang upload ảnh "${file.name}"...`, 'loading');
  try {
    const presign = await api.post('/uploads/images/presign', {
      file_name: file.name,
      content_type: file.type || 'image/png',
      size: file.size,
    });
    await fetch(presign.upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'image/png' },
      body: file,
    });
    return { url: presign.public_url, name: file.name, content_type: file.type, size: file.size };
  } finally {
    _contentImageUploadCount = Math.max(0, _contentImageUploadCount - 1);
  }
}

async function onComposerImageSelected(e) {
  const file = e.target?.files?.[0];
  if (!file) return;
  if (!_composerSavedRange) saveComposerRange();
  try {
    const uploaded = await uploadComposerImage(file);
    const block = createImageBlock(uploaded.url, uploaded.name || '', 100);
    insertImageAtSavedRange(block);
    setComposerStatus(`Đã chèn ảnh "${file.name}" vào nội dung.`, 'success');
  } catch (err) {
    setComposerStatus(err?.error || err?.message || 'Không thể upload ảnh.', 'error');
    toast(err?.error || err?.message || 'Không thể upload ảnh', 'error');
  } finally {
    if (e.target) e.target.value = '';
  }
}

async function handleComposerPaste(e) {
  const files = Array.from(e.clipboardData?.files || []).filter(f => f.type.startsWith('image/'));
  if (files.length) {
    e.preventDefault();
    saveComposerRange();
    await onComposerImageSelected({ target: { files, value: '' } });
    return;
  }
  const text = e.clipboardData?.getData('text/plain');
  if (!text) return;
  e.preventDefault();
  const sel = window.getSelection();
  if (!sel?.rangeCount) return;
  const range = sel.getRangeAt(0);
  range.deleteContents();
  const lines = text.replace(/\r/g, '').split('\n');
  const frag = document.createDocumentFragment();
  lines.forEach((line, i) => {
    if (i > 0) frag.appendChild(document.createElement('br'));
    if (line) frag.appendChild(document.createTextNode(line));
  });
  range.insertNode(frag);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
  syncContentBlocksFromEditor();
  saveComposerRange();
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGE: QUESTION DETAIL / EDIT
// ═══════════════════════════════════════════════════════════════════════════

async function showQuestionDetail({ id }) {
  setLoading('Đang tải đề...');
  try {
    const q = await api.get(`/questions/${id}`);
    renderQuestionDetail(q);
  } catch (e) {
    toast('Lỗi tải đề: ' + (e.error || e.message), 'error');
    renderRouteError('Không tải được đề', e, `/questions/${id}`);
  }
}

function renderQuestionDetail(q) {
  _audioFile  = null;
  _vocabItems = Array.isArray(q.vocabulary) ? [...q.vocabulary] : [];

  let skillSection = '';
  if (q.skill === 'reading') {
    skillSection = `
      ${contentComposerHtml('Nội dung đề (Bài đọc + Câu hỏi)', 'Soạn nội dung dạng text, và chèn ảnh vào giữa khi cần. Location chỉ áp dụng cho phần text.')}
      <div id="location-pick-hint" class="location-pick-hint hidden"></div>
      ${answerGridHtml()}
      ${vocabSectionHtml()}`;
  } else if (q.skill === 'listening') {
    const audioTracks = Array.isArray(q.content_urls) && q.content_urls.length > 0
      ? q.content_urls
      : (q.content_url ? [{ url: q.content_url, name: '' }] : []);
    const multi = audioTracks.length > 1;
    skillSection = `
      ${audioTracks.length > 0 ? `
        <div class="form-group">
          <label class="form-label">Audio hiện tại</label>
          ${audioTracks.map((t, i) => `
            <div style="${multi ? 'margin-bottom:10px' : ''}">
              ${multi ? `<div style="font-size:12px;font-weight:600;color:var(--gray-500);margin-bottom:4px">${escapeHtml(t.name || ('File ' + (i + 1)))}</div>` : ''}
              <audio controls src="${escapeHtml(t.url || '')}" style="width:100%;border-radius:8px"></audio>
            </div>`).join('')}
          <div class="form-hint">Không hỗ trợ thay audio — xoá và tạo lại đề nếu cần đổi file.</div>
        </div>` : ''}
      <div class="form-group" id="script-section">
        <label class="form-label">Script Listening
          <span style="font-size:12px;font-weight:400;color:var(--gray-400)"> — có thể chỉnh sửa</span>
        </label>
        <textarea id="listening-script" class="form-textarea listening-script-editor" rows="8"
          placeholder="Script listening...">${escapeHtml(q.script || '')}</textarea>
        <div class="form-hint">Học sinh xem script sau khi nộp bài. Bôi chọn text ở đây để set Location cho đáp án.</div>
      </div>
      ${contentComposerHtml('Câu hỏi (text)', 'Bạn có thể chèn ảnh minh hoạ hoặc bảng câu hỏi vào giữa các đoạn text.')}
      <div id="location-pick-hint" class="location-pick-hint hidden"></div>
      ${answerGridHtml()}
      ${vocabSectionHtml()}`;
  } else if (q.skill === 'writing') {
    skillSection = `
      ${contentComposerHtml('Đề bài Writing', 'Dùng text làm nền chính và chèn chart/diagram/image vào đúng vị trí mong muốn.')}`;
  } else if (q.skill === 'speaking') {
    skillSection = `
      ${contentComposerHtml('Câu hỏi / Cue Card', 'Bạn có thể chèn ảnh hoặc cue card visual vào giữa nội dung.')}`;
  }

  $('#app').innerHTML = `
    <a class="back-link" onclick="navigate('/questions')">← Kho đề</a>
    <div class="page-header">
      <div class="page-title">Xem / Sửa đề</div>
    </div>
    <div class="form-card">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Tiêu đề đề thi <span style="color:var(--danger)">*</span></label>
          <input id="q-title" class="form-input" value="${escapeHtml(q.title)}" />
        </div>
        <div class="form-group">
          <label class="form-label">Kỹ năng</label>
          <select id="q-skill" class="form-select" disabled>
            <option value="reading"   ${q.skill === 'reading'   ? 'selected' : ''}>📖 Reading</option>
            <option value="listening" ${q.skill === 'listening' ? 'selected' : ''}>🎧 Listening</option>
            <option value="writing"   ${q.skill === 'writing'   ? 'selected' : ''}>✍️ Writing</option>
            <option value="speaking"  ${q.skill === 'speaking'  ? 'selected' : ''}>🎤 Speaking</option>
          </select>
          <div class="form-hint">Kỹ năng không thể thay đổi sau khi tạo.</div>
        </div>
      </div>
      <div id="skill-section" class="skill-section">${skillSection}</div>
      <div class="form-group" style="margin-top:20px">
        <label class="form-label">Tags <span style="font-size:12px;font-weight:400;color:var(--gray-400)">(tùy chọn — phân loại đề theo chủ đề, level, nguồn...)</span></label>
        <div id="q-tags-chip-edit" class="chip-input-container">
          <input id="q-tag-input-edit" class="chip-input" placeholder="Nhập tag rồi Enter..." />
        </div>
      </div>
      <div style="margin-top:24px;display:flex;justify-content:flex-end;gap:10px">
        <button class="btn btn-outline" onclick="navigate('/questions')">Hủy</button>
        <button class="btn btn-primary" onclick="submitQuestionEdit('${q.id}', this)">
          💾 Lưu thay đổi
        </button>
      </div>
    </div>`;

  if ((q.skill === 'reading' || q.skill === 'listening') && q.questions_data?.length > 0) {
    renderAnswerGridWithData(q.questions_data);
  }

  // Pre-populate existing tags
  if (Array.isArray(q.tags) && q.tags.length > 0) {
    const tagContainer = $('#q-tags-chip-edit');
    const tagInput = $('#q-tag-input-edit');
    if (tagContainer && tagInput) {
      for (const tag of q.tags) {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.dataset.value = tag;
        chip.innerHTML = `${escapeHtml(tag)} <button type="button" class="chip-remove">×</button>`;
        chip.querySelector('.chip-remove').onclick = () => chip.remove();
        tagContainer.insertBefore(chip, tagInput);
      }
    }
  }

  if (q.skill === 'reading' || q.skill === 'listening') {
    renderVocabList();
  }

  attachChipListeners();
  initContentComposer(q.content_blocks, q.content_text || '');

  const countInput = $('#answer-count');
  if (countInput) {
    if (q.questions_data?.length > 0) countInput.value = q.questions_data.length;
    countInput.addEventListener('input', () => {
      const n = parseInt(countInput.value) || 0;
      if (n > 0 && n <= 100) renderAnswerGrid(n);
    });
  }
}

function renderAnswerGridWithData(questionsData) {
  const grid = $('#answer-grid');
  if (!grid) return;
  const countInput = $('#answer-count');
  if (countInput) countInput.value = questionsData.length;
  grid.innerHTML = '';
  for (const q of questionsData) {
    const row = document.createElement('div');
    row.className = 'answer-row';

    const main = document.createElement('div');
    main.className = 'answer-row-main';

    const label = document.createElement('span');
    label.className = 'q-label';
    label.textContent = `Q${q.q_no}`;

    const container = document.createElement('div');
    container.className = 'chip-container';
    for (const a of (q.answers || [])) {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.dataset.value = a;
      chip.innerHTML = `${escapeHtml(a)} <button class="chip-remove" title="Xoá">×</button>`;
      chip.querySelector('.chip-remove').onclick = () => chip.remove();
      container.appendChild(chip);
    }
    const input = document.createElement('input');
    input.className = 'chip-input';
    input.placeholder = 'Đáp án + Enter';
    container.appendChild(input);

    main.appendChild(label);
    main.appendChild(container);

    // Location row
    const locRow = document.createElement('div');
    locRow.className = 'location-row';

    const locLabel = document.createElement('span');
    locLabel.className = 'field-section-label';
    locLabel.textContent = '📍 Vị trí:';

    const locDisp = document.createElement('span');
    locDisp.className = 'location-text-display';
    locDisp.textContent = q.location || 'Chưa chọn';

    const locInput = document.createElement('input');
    locInput.type = 'hidden';
    locInput.className = 'answer-location';
    locInput.value = q.location || '';

    const locMetaInput = document.createElement('input');
    locMetaInput.type = 'hidden';
    locMetaInput.className = 'answer-location-meta';
    locMetaInput.value = q.location_meta ? JSON.stringify(q.location_meta) : '';

    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn-clear-location' + (q.location ? '' : ' hidden');
    clearBtn.textContent = '×';
    clearBtn.onclick = function() { clearLocationValue(this.closest('.answer-row')); };

    const pickBtn = document.createElement('button');
    pickBtn.className = 'btn-pick-location';
    pickBtn.textContent = 'Chọn';
    pickBtn.onclick = function() { activateLocationPick(this.closest('.answer-row')); };

    locRow.appendChild(locLabel);
    locRow.appendChild(locDisp);
    locRow.appendChild(locInput);
    locRow.appendChild(locMetaInput);
    locRow.appendChild(clearBtn);
    locRow.appendChild(pickBtn);

    // Explanation row
    const expRow = document.createElement('div');
    expRow.className = 'explanation-row';

    const expLabel = document.createElement('span');
    expLabel.className = 'field-section-label';
    expLabel.textContent = '💡 Giải thích:';

    const expArea = document.createElement('textarea');
    expArea.className = 'answer-explanation';
    expArea.rows = 2;
    expArea.placeholder = 'Nhập giải thích đáp án...';
    expArea.value = q.explanation || '';

    expRow.appendChild(expLabel);
    expRow.appendChild(expArea);

    row.appendChild(main);
    row.appendChild(locRow);
    row.appendChild(expRow);
    grid.appendChild(row);
  }
  attachChipListeners();
}

async function submitQuestionEdit(id, btn) {
  const title   = $('#q-title')?.value.trim();
  const skill   = $('#q-skill')?.value;
  const contentBlocks = normalizeContentBlocksForEditor(_contentBlocks);
  const content = blocksToPlainText(contentBlocks) || null;

  if (!title) { toast('Vui lòng nhập tiêu đề', 'error'); return; }
  if (_contentImageUploadCount > 0) { toast('Ảnh đang upload, vui lòng đợi xong rồi lưu', 'warning'); return; }

  let questions_data = [];
  if (skill === 'reading' || skill === 'listening') {
    questions_data = collectAnswerGrid();
  }

  const tags = getChipValues($('#q-tags-chip-edit'));

  btnLoading(btn);
  try {
    await api.patch(`/questions/${id}`, {
      title,
      content_text: content,
      content_blocks: contentBlocks,
      questions_data,
      vocabulary: _vocabItems,
      tags,
      ...(skill === 'listening' ? {
        script: ($('#listening-script')?.value || '').trim() || null,
      } : {}),
    });
    toast('Đã lưu thay đổi! ✓');
    navigate('/questions');
  } catch (e) {
    btnReset(btn);
    toast('Lỗi lưu: ' + (e.error || e.message), 'error');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGE: QUESTION FORM (Tạo đề mới)
// ═══════════════════════════════════════════════════════════════════════════

// Multi-audio slot state: each item = {displayName, file, url, key, name, size, status:'idle'|'uploading'|'done'|'error', pct, eta}
function _newAudioSlot() { return { displayName: '', file: null, name: '', size: 0, status: 'idle', url: null, key: null, pct: 0, eta: null }; }
let _audioSlots = [_newAudioSlot()];
let _audioFiles = _audioSlots; // legacy alias
let _audioUploading = false;
let _scriptTranscribing = false;
let _audioFile = null, _audioUploadUrl = null, _audioUploadKey = null, _audioUploadName = '', _audioUploadSize = 0;
let _vocabItems = [];
let _pendingLocationRow = null;

function vocabSectionHtml() {
  return `
    <div class="form-group" style="margin-top:20px">
      <label class="form-label">Từ vựng <span style="font-size:12px;font-weight:400;color:var(--gray-400)">(tùy chọn — học sinh xem sau khi nộp bài)</span></label>
      <div class="vocab-add-row">
        <input id="vocab-word"    class="form-input" placeholder="Từ vựng"         style="flex:1;min-width:0" />
        <input id="vocab-def"     class="form-input" placeholder="Định nghĩa"       style="flex:2;min-width:0" />
        <input id="vocab-example" class="form-input" placeholder="Ví dụ (tùy chọn)" style="flex:2;min-width:0" />
        <button class="btn btn-primary btn-sm" onclick="addVocabItem()">+ Thêm</button>
      </div>
      <div id="vocab-list" class="vocab-list"></div>
    </div>`;
}

function addVocabItem() {
  const word = $('#vocab-word')?.value.trim();
  const def  = $('#vocab-def')?.value.trim();
  const ex   = $('#vocab-example')?.value.trim() || '';
  if (!word || !def) { toast('Nhập từ vựng và định nghĩa', 'warning'); return; }
  _vocabItems.push({ word, definition: def, ...(ex && { example: ex }) });
  if ($('#vocab-word'))    $('#vocab-word').value    = '';
  if ($('#vocab-def'))     $('#vocab-def').value     = '';
  if ($('#vocab-example')) $('#vocab-example').value = '';
  renderVocabList();
}

function removeVocabItem(idx) {
  _vocabItems.splice(idx, 1);
  renderVocabList();
}

function renderVocabList() {
  const el = $('#vocab-list');
  if (!el) return;
  if (_vocabItems.length === 0) {
    el.innerHTML = '<div style="color:var(--gray-400);font-size:12px;padding:8px 0">Chưa có từ vựng nào.</div>';
    return;
  }
  el.innerHTML = _vocabItems.map((v, i) => `
    <div class="vocab-item">
      <span class="vocab-word">${escapeHtml(v.word)}</span>
      <span class="vocab-def">${escapeHtml(v.definition)}</span>
      ${v.example ? `<span class="vocab-example">${escapeHtml(v.example)}</span>` : ''}
      <button class="vocab-remove" onclick="removeVocabItem(${i})">×</button>
    </div>`).join('');
}

function showQuestionForm() {
  _audioSlots = [_newAudioSlot()]; _audioFiles = _audioSlots;
  _audioFile = null; _audioUploadUrl = null; _audioUploadKey = null; _audioUploadName = ''; _audioUploadSize = 0;
  _audioUploading = false;
  $('#app').innerHTML = `
    <a class="back-link" onclick="navigate('/questions')">← Kho đề</a>

    <div class="page-header">
      <div class="page-title">Tạo đề mới</div>
    </div>

    <div class="form-card">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Tiêu đề đề thi <span style="color:var(--danger)">*</span></label>
          <input id="q-title" class="form-input"
            placeholder="VD: CAM 18 Test 1 - Reading Passage 1" />
        </div>
        <div class="form-group">
          <label class="form-label">Kỹ năng <span style="color:var(--danger)">*</span></label>
          <select id="q-skill" class="form-select" onchange="onSkillChange(this.value)">
            <option value="">— Chọn kỹ năng —</option>
            <option value="reading">📖 Reading</option>
            <option value="listening">🎧 Listening</option>
            <option value="writing">✍️ Writing</option>
            <option value="speaking">🎤 Speaking</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Tags <span style="font-size:12px;font-weight:400;color:var(--gray-400)">(Enter để thêm — VD: cam18, band-7, technology)</span></label>
        <div id="q-tags-chip" class="chip-input-container">
          <input id="q-tag-input" class="chip-input" placeholder="Nhập tag rồi Enter..." />
        </div>
      </div>

      <div id="skill-section" class="skill-section">
        <div style="text-align:center;padding:30px;color:var(--gray-400)">
          Chọn kỹ năng để hiển thị form nhập đề
        </div>
      </div>

      <div style="margin-top:24px;display:flex;justify-content:flex-end;gap:10px">
        <button class="btn btn-outline" onclick="navigate('/questions')">Hủy</button>
        <button class="btn btn-primary" onclick="submitQuestion(this)">
          💾 Lưu vào kho đề
        </button>
      </div>
    </div>`;
  attachChipListeners();
}

function onSkillChange(skill) {
  _vocabItems = [];
  _contentBlocks = [];
  _audioSlots = [_newAudioSlot()]; _audioFiles = _audioSlots;
  _audioFile = null; _audioUploadUrl = null; _audioUploadKey = null; _audioUploadName = ''; _audioUploadSize = 0;
  _audioUploading = false;
  _scriptTranscribing = false;
  const section = $('#skill-section');
  if (!skill) {
    section.innerHTML = `<div style="text-align:center;padding:30px;color:var(--gray-400)">
      Chọn kỹ năng để hiển thị form nhập đề</div>`;
    return;
  }

  let html = '';

  if (skill === 'reading') {
    html = `
      ${contentComposerHtml('Nội dung đề (Bài đọc + Câu hỏi)', 'Copy/paste text như bình thường. Khi cần bảng hoặc hình, hãy chèn ảnh vào đúng vị trí giữa các đoạn text.')}
      <div id="location-pick-hint" class="location-pick-hint hidden"></div>
      ${answerGridHtml()}
      ${vocabSectionHtml()}`;

  } else if (skill === 'listening') {
    html = `
      <div class="form-group">
        <label class="form-label">File Audio <span style="color:var(--danger)">*</span></label>
        ${audioUploadHtml()}
      </div>
      <div class="form-group" id="script-section">
        <label class="form-label">Script Listening
          <span style="font-size:12px;font-weight:400;color:var(--gray-400)"> — tự động trích xuất sau khi upload audio, có thể chỉnh sửa</span>
        </label>
        <div id="script-loading" class="script-loading hidden">
          <span class="btn-spinner btn-spinner--dark"></span> Đang trích xuất script (từ R2, không upload lại)...
        </div>
        <textarea id="listening-script" class="form-textarea listening-script-editor" rows="8"
          placeholder="Script sẽ tự động điền sau khi upload audio v2. Bạn cũng có thể nhập thủ công."></textarea>
        <div class="form-hint">Học sinh xem script sau khi nộp bài. Bôi chọn text ở đây để set Location cho đáp án.</div>
      </div>
      ${contentComposerHtml('Câu hỏi (text)', 'Bạn có thể xen kẽ text và ảnh minh hoạ / bảng câu hỏi trong cùng một nội dung.')}
      <div id="location-pick-hint" class="location-pick-hint hidden"></div>
      ${answerGridHtml()}
      ${vocabSectionHtml()}`;

  } else if (skill === 'writing') {
    html = `
      ${contentComposerHtml('Đề bài Writing', 'Nhập đề bài Task 1 hoặc Task 2, và chèn biểu đồ / hình minh hoạ vào đúng vị trí nếu cần.')}
      <div style="padding:12px 16px;background:var(--primary-lt);border-radius:8px;font-size:13px;color:var(--primary-dk)">
        ℹ️ Writing là tự luận — không cần nhập đáp án mẫu.
      </div>`;

  } else if (skill === 'speaking') {
    html = `
      ${contentComposerHtml('Câu hỏi / Cue Card', 'Nhập cue card dạng text và chèn thêm image nếu muốn hiển thị visual support cho học sinh.')}
      <div style="padding:12px 16px;background:var(--primary-lt);border-radius:8px;font-size:13px;color:var(--primary-dk)">
        ℹ️ Speaking — học sinh sẽ upload file audio của mình. Không cần đáp án mẫu.
      </div>`;
  }

  section.innerHTML = html;

  // Attach audio upload listeners if needed
  if (skill === 'listening') { attachAudioUpload(); _renderAudioSlots(); }
  initContentComposer([], '');

  // Attach answer grid listener
  const countInput = $('#answer-count');
  if (countInput) {
    countInput.addEventListener('input', () => {
      const n = parseInt(countInput.value) || 0;
      if (n > 0 && n <= 100) renderAnswerGrid(n);
    });
  }
}

function answerGridHtml() {
  return `
    <div class="form-group">
      <label class="form-label">Đáp án</label>
      <div class="answer-grid-wrap">
        <div class="answer-count-row">
          <span style="font-size:13px;font-weight:600">Số câu hỏi:</span>
          <input id="answer-count" type="number" min="1" max="100" placeholder="VD: 13" />
          <span style="font-size:12px;color:var(--gray-400)">Nhập số rồi bấm Tab/Enter</span>
        </div>
        <div id="answer-grid" class="answer-grid">
          <div style="text-align:center;padding:16px;color:var(--gray-400);font-size:13px;grid-column:1/-1">
            Nhập số câu hỏi ở trên để hiển thị form đáp án
          </div>
        </div>
      </div>
      <div class="form-hint">Mỗi câu có thể có nhiều đáp án chấp nhận được. Gõ đáp án rồi nhấn Enter.</div>
    </div>`;
}

let _pdfJsLoadingPromise = null;

function pdfImportBoxHtml() {
  return `
    <div class="pdf-import-box">
      <div class="pdf-import-head">
        <div>
          <div class="pdf-import-title">📄 Hoặc upload PDF để tự điền nội dung</div>
          <div class="pdf-import-sub">Phù hợp nhất với PDF có text thật. Nếu là PDF scan ảnh, kết quả có thể thiếu hoặc lỗi format.</div>
        </div>
        <div id="pdf-import-area" class="pdf-import-area" role="button" tabindex="0" aria-label="Upload PDF">
          <input id="pdf-file-input" type="file" accept="application/pdf,.pdf" />
          <button type="button" id="pdf-import-btn" class="btn btn-outline btn-sm">Upload PDF</button>
          <span class="pdf-import-meta">Kéo thả file hoặc bấm để chọn</span>
        </div>
      </div>
      <div id="pdf-import-status" class="pdf-import-status">Chưa có file PDF nào được xử lý.</div>
    </div>`;
}

function setPdfImportStatus(message, type = '') {
  const status = $('#pdf-import-status');
  if (!status) return;
  status.className = `pdf-import-status${type ? ` is-${type}` : ''}`;
  status.textContent = message;
}

function setPdfImportBusy(isBusy) {
  const area = $('#pdf-import-area');
  const input = $('#pdf-file-input');
  const btn = $('#pdf-import-btn');
  area?.classList.toggle('processing', isBusy);
  if (input) input.disabled = isBusy;
  if (btn) btn.disabled = isBusy;
}

async function ensurePdfJsLoaded() {
  if (window.pdfjsLib) return window.pdfjsLib;
  if (_pdfJsLoadingPromise) return _pdfJsLoadingPromise;

  _pdfJsLoadingPromise = import('./vendor/pdfjs-dist/build/pdf.min.mjs')
    .then(mod => {
      mod.GlobalWorkerOptions.workerSrc = './js/vendor/pdfjs-dist/build/pdf.worker.min.mjs';
      window.pdfjsLib = mod;
      return mod;
    })
    .catch(err => {
      _pdfJsLoadingPromise = null;
      throw err;
    });

  return _pdfJsLoadingPromise;
}

function mergePdfTextItems(items) {
  const lines = [];
  let currentLine = '';
  let lastY = null;
  let lastRightX = null;

  function flushLine() {
    const cleaned = currentLine.replace(/[ \t]+/g, ' ').trim();
    if (cleaned) lines.push(cleaned);
    currentLine = '';
    lastY = null;
    lastRightX = null;
  }

  for (const item of items || []) {
    if (!item || typeof item.str !== 'string') continue;
    const text = item.str.replace(/\u0000/g, '');
    const y = item.transform?.[5] ?? lastY;
    const x = item.transform?.[4] ?? null;
    const breakByY = lastY !== null && y !== null && Math.abs(y - lastY) > 4;

    if (breakByY) flushLine();

    if (text) {
      let prefix = '';
      if (currentLine) {
        const gap = x != null && lastRightX != null ? x - lastRightX : 0;
        const startsWithPunctuation = /^[,.;:!?%)\]\}]/.test(text);
        const endsWithJoiner = /[-/(\[]$/.test(currentLine);
        if (!startsWithPunctuation && !endsWithJoiner && gap > 1) prefix = ' ';
      }
      currentLine += prefix + text;
    }

    lastY = y;
    lastRightX = x != null ? x + (item.width || 0) : lastRightX;

    if (item.hasEOL) flushLine();
  }

  flushLine();
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

async function extractTextFromPdf(file) {
  const pdfjsLib = await ensurePdfJsLoaded();
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: true,
    isEvalSupported: false,
  });
  const pdf = await loadingTask.promise;
  const pages = [];

  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
    setPdfImportStatus(`Đang trích xuất trang ${pageNo}/${pdf.numPages}...`, 'loading');
    const page = await pdf.getPage(pageNo);
    const textContent = await page.getTextContent();
    const pageText = mergePdfTextItems(textContent.items);
    if (pageText) pages.push(pageText);
  }

  const merged = pages.join('\n\n').trim();
  if (!merged) {
    throw new Error('Không đọc được text từ PDF này. Có thể đây là PDF scan ảnh hoặc file không có lớp text.');
  }
  return { text: merged, pageCount: pdf.numPages };
}

async function importPdfIntoQuestion(file) {
  if (!file) return;
  if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
    setPdfImportStatus('File không hợp lệ. Vui lòng chọn file PDF.', 'error');
    toast('Chỉ hỗ trợ file PDF', 'error');
    return;
  }

  const textarea = $('#q-content');
  if (!textarea) return;
  if (textarea.value.trim() && !confirm('Nội dung hiện tại sẽ bị thay thế bằng text trích xuất từ PDF. Tiếp tục?')) {
    return;
  }

  setPdfImportBusy(true);
  setPdfImportStatus('Đang tải thư viện đọc PDF...', 'loading');

  try {
    const { text, pageCount } = await extractTextFromPdf(file);
    textarea.value = text;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.focus();
    textarea.setSelectionRange(0, 0);
    textarea.scrollTop = 0;
    setPdfImportStatus(`Đã xử lý ${pageCount} trang từ "${file.name}" và điền vào ô nội dung.`, 'success');
    toast('Đã chuyển PDF thành text');
  } catch (e) {
    console.error('PDF import failed:', e);
    const msg = e?.message || 'Không thể xử lý file PDF này.';
    setPdfImportStatus(msg, 'error');
    toast(msg, 'error');
  } finally {
    setPdfImportBusy(false);
  }
}

function attachPdfImport() {
  const area = $('#pdf-import-area');
  const input = $('#pdf-file-input');
  const btn = $('#pdf-import-btn');
  if (!area || !input || !btn) return;

  const openPicker = () => {
    if (!input.disabled) input.click();
  };

  btn.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    openPicker();
  });

  area.addEventListener('click', e => {
    if (e.target === input || e.target === btn) return;
    openPicker();
  });

  area.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openPicker();
    }
  });

  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (file) importPdfIntoQuestion(file);
    input.value = '';
  });

  area.addEventListener('dragover', e => {
    e.preventDefault();
    area.classList.add('dragover');
  });
  area.addEventListener('dragleave', () => area.classList.remove('dragover'));
  area.addEventListener('drop', e => {
    e.preventDefault();
    area.classList.remove('dragover');
    const file = e.dataTransfer.files?.[0];
    if (file) importPdfIntoQuestion(file);
  });
}

function audioUploadHtml() {
  return `<div id="audio-upload-area"><div id="audio-slot-list"></div>
    <button class="btn btn-outline btn-sm" style="margin-top:8px" onclick="addAudioSlot()">+ Thêm file audio</button>
  </div>`;
}

function _renderAudioSlots() {
  const listEl = $('#audio-slot-list');
  if (!listEl) return;
  listEl.innerHTML = _audioSlots.map((s, i) => {
    const canRemove = _audioSlots.length > 1;
    const removeBtn = canRemove
      ? `<button class="remove-audio-slot" onclick="removeAudioSlot(${i})" title="Xoá slot">×</button>`
      : '';
    let fileBody = '';
    if (s.status === 'idle') {
      fileBody = `
        <input id="audio-slot-input-${i}" type="file" accept="audio/*" style="display:none" onchange="onSlotFileSelected(this,${i})" />
        <button class="audio-pick-btn" onclick="document.getElementById('audio-slot-input-${i}').click()">🎵 Chọn file audio</button>
        <span style="font-size:12px;color:var(--gray-400)">MP3, WAV, M4A... tối đa 200MB</span>`;
    } else if (s.status === 'uploading') {
      const etaStr = s.pct < 100 && s.eta != null ? ` · ETA ${_fmtEta(s.eta)}` : '';
      fileBody = `
        <div class="audio-slot-filename">${escapeHtml(s.name)} <span style="color:var(--gray-400)">(${(s.size/1024/1024).toFixed(1)} MB)</span></div>
        <div class="upload-progress-row">
          <div class="upload-progress-bar-wrap"><div class="upload-progress-bar" style="width:${s.pct}%"></div></div>
          <span class="upload-progress-label">${s.pct}%${etaStr}</span>
        </div>`;
    } else if (s.status === 'done') {
      fileBody = `
        <div class="audio-slot-done">
          <span class="audio-upload-done">✓</span>
          <span class="audio-slot-filename">${escapeHtml(s.name)} <span style="color:var(--gray-400)">(${(s.size/1024/1024).toFixed(1)} MB)</span></span>
          <button class="btn btn-outline btn-sm" style="padding:2px 8px;font-size:12px" onclick="clearSlotFile(${i})">Đổi file</button>
        </div>`;
    } else if (s.status === 'error') {
      fileBody = `
        <div style="display:flex;align-items:center;gap:8px">
          <span style="color:var(--danger)">✗ Lỗi upload: ${escapeHtml(s.name)}</span>
          <input id="audio-slot-input-${i}" type="file" accept="audio/*" style="display:none" onchange="onSlotFileSelected(this,${i})" />
          <button class="btn btn-outline btn-sm" style="padding:2px 8px;font-size:12px" onclick="document.getElementById('audio-slot-input-${i}').click()">Thử lại</button>
        </div>`;
    }
    return `<div class="audio-slot" id="audio-slot-${i}">
      <div class="audio-slot-num">${i + 1}</div>
      <div class="audio-slot-content">
        <input type="text" class="form-input audio-slot-name" placeholder="Tên hiển thị (VD: Section ${i + 1})"
               value="${escapeHtml(s.displayName)}" onchange="_audioSlots[${i}].displayName=this.value" />
        <div class="audio-slot-file">${fileBody}</div>
      </div>
      ${removeBtn}
    </div>`;
  }).join('');
}

function _renderAudioFileList() { _renderAudioSlots(); }

function attachAudioUpload() { /* no-op: slots use inline pickers */ }

function onSlotFileSelected(input, idx) {
  const file = input.files?.[0];
  if (!file || !_audioSlots[idx]) return;
  input.value = '';
  _audioSlots[idx].file = file;
  _audioSlots[idx].name = file.name;
  _audioSlots[idx].size = file.size;
  _audioSlots[idx].status = 'uploading';
  _audioSlots[idx].pct = 0;
  _audioSlots[idx].eta = null;
  _audioSlots[idx].url = null;
  _audioSlots[idx].key = null;
  _renderAudioSlots();
  _uploadAudioSlot(idx);
}

function onAudioFilesSelected(input) { onSlotFileSelected(input, 0); }

function addAudioSlot() {
  _audioSlots.push(_newAudioSlot());
  _renderAudioSlots();
}

function clearSlotFile(idx) {
  if (!_audioSlots[idx]) return;
  _audioSlots[idx] = { ..._newAudioSlot(), displayName: _audioSlots[idx].displayName };
  _audioUploading = _audioSlots.some(s => s.status === 'uploading');
  _renderAudioSlots();
}

async function requestDirectAudioUpload(file, scope, extra = {}) {
  return api.post('/uploads/audio/presign', {
    scope,
    file_name: file.name,
    content_type: file.type || 'application/octet-stream',
    size: file.size,
    ...extra,
  });
}

function putDirectAudioXHR(uploadUrl, file, contentType, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const startTime = Date.now();
    xhr.upload.addEventListener('progress', e => {
      if (!e.lengthComputable) return;
      const pct = Math.round((e.loaded / e.total) * 100);
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = e.loaded / elapsed;
      const etaSec = rate > 0 ? Math.ceil((e.total - e.loaded) / rate) : null;
      onProgress(pct, etaSec);
    });
    xhr.addEventListener('load', () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`HTTP ${xhr.status}`)));
    xhr.addEventListener('error', () => reject(new Error('Network error')));
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', contentType || 'application/octet-stream');
    xhr.send(file);
  });
}

function _fmtEta(sec) {
  if (sec === null || sec < 0) return '';
  if (sec < 60) return `~${sec}s`;
  return `~${Math.ceil(sec / 60)}m`;
}

async function _uploadAudioSlot(idx) {
  const slot = _audioSlots[idx];
  if (!slot) return;
  _audioUploading = true;
  try {
    const uploadTarget = await requestDirectAudioUpload(slot.file, 'teacher-listening');
    await putDirectAudioXHR(uploadTarget.upload_url, slot.file, uploadTarget.headers?.['Content-Type'] || slot.file.type, (pct, eta) => {
      if (_audioSlots[idx]) { _audioSlots[idx].pct = pct; _audioSlots[idx].eta = eta; }
      _renderAudioSlots();
    });
    _audioSlots[idx].status = 'done';
    _audioSlots[idx].url    = uploadTarget.public_url;
    _audioSlots[idx].key    = uploadTarget.key;
    _renderAudioSlots();
    _maybeTranscribeAll();
  } catch (e) {
    _audioSlots[idx].status = 'error';
    _renderAudioSlots();
    toast(`Lỗi upload "${slot.name}": ` + (e.message || 'Unknown error'), 'error');
  } finally {
    _audioUploading = _audioSlots.some(s => s.status === 'uploading');
  }
}

function _maybeTranscribeAll() {
  const active = _audioSlots.filter(s => s.status !== 'idle');
  if (active.length === 0) return;
  if (active.some(s => s.status === 'uploading')) return;
  if (active.every(s => s.status === 'done')) {
    transcribeListeningScript(active.map(s => ({ key: s.key, name: s.displayName || s.name })));
  }
}

function removeAudioSlot(idx) {
  if (_audioSlots.length <= 1) { clearSlotFile(0); return; }
  _audioSlots.splice(idx, 1);
  _audioUploading = _audioSlots.some(s => s.status === 'uploading');
  _renderAudioSlots();
  const doneCount = _audioSlots.filter(s => s.status === 'done').length;
  if (doneCount === 0) {
    const scriptEl = $('#listening-script');
    if (scriptEl) scriptEl.value = '';
    const loadingEl = $('#script-loading');
    if (loadingEl) loadingEl.classList.add('hidden');
  }
}

function removeAudioFile(idx) { removeAudioSlot(idx); }
function removeAudio(e) { if (e) e.stopPropagation(); removeAudioSlot(0); }

async function transcribeListeningScript(keysOrKey) {
  const scriptEl = $('#listening-script');
  const loadingEl = $('#script-loading');
  if (!scriptEl || _scriptTranscribing) return;
  _scriptTranscribing = true;
  if (loadingEl) loadingEl.classList.remove('hidden');
  scriptEl.disabled = true;
  try {
    let data;
    if (Array.isArray(keysOrKey)) {
      data = await api.post('/questions/transcribe-audio', { keys: keysOrKey });
    } else {
      data = await api.post('/questions/transcribe-audio', { key: keysOrKey });
    }
    if (data?.text) {
      scriptEl.value = data.text;
      toast('Đã trích xuất script tự động ✓');
    }
  } catch (e) {
    toast('Không thể tự động trích xuất script: ' + (e.error || e.message), 'error');
  } finally {
    _scriptTranscribing = false;
    scriptEl.disabled = false;
    if (loadingEl) loadingEl.classList.add('hidden');
  }
}

function toggleExplanation(btn) {
  const row = btn?.closest?.('.answer-row');
  const explanation = row?.querySelector?.('.explanation-row');
  if (!explanation) return;
  const hidden = explanation.style.display === 'none';
  explanation.style.display = hidden ? '' : 'none';
  btn.setAttribute('aria-expanded', hidden ? 'true' : 'false');
}

function locateInText() {}
function scrollToFeedbackMark() {}

async function submitQuestion(btn) {
  const title = $('#q-title')?.value.trim();
  const skill = $('#q-skill')?.value;
  const contentBlocks = normalizeContentBlocksForEditor(_contentBlocks);
  const content = blocksToPlainText(contentBlocks) || '';

  if (!title) { toast('Vui lòng nhập tiêu đề', 'error'); return; }
  if (!skill)  { toast('Vui lòng chọn kỹ năng', 'error'); return; }
  if (_contentImageUploadCount > 0) { toast('Ảnh đang upload, vui lòng đợi xong rồi lưu', 'warning'); return; }
  if (skill === 'listening') {
    const doneSlots = _audioSlots.filter(s => s.status === 'done');
    if (doneSlots.length === 0) {
      toast('Vui lòng chọn và upload ít nhất 1 file audio cho Listening', 'error');
      return;
    }
    if (_audioUploading) {
      toast('Audio vẫn đang upload, vui lòng đợi xong rồi lưu', 'warning');
      return;
    }
  }

  // Collect answers + vocabulary for reading/listening
  let questions_data = [];
  if (skill === 'reading' || skill === 'listening') {
    questions_data = collectAnswerGrid();
  }
  // B4.5 — collect tags chips
  const tags = getChipValues($('#q-tags-chip'));

  btnLoading(btn);
  try {
    let listeningExtra = {};
    if (skill === 'listening') {
      const doneSlots = _audioSlots.filter(s => s.status === 'done');
      const contentUrls = doneSlots.map(s => ({ url: s.url, key: s.key, name: s.displayName || s.name, filename: s.name }));
      listeningExtra = {
        content_url: doneSlots[0]?.url || null,
        content_upload_key: doneSlots[0]?.key || null,
        content_urls: contentUrls,
        script: ($('#listening-script')?.value || '').trim() || null,
      };
    }
    await api.post('/questions', {
      title,
      skill,
      content_text: content,
      content_blocks: contentBlocks,
      questions_data,
      vocabulary: _vocabItems,
      tags,
      ...listeningExtra,
    });

    toast('Đã lưu đề vào kho! 🎉');
    _audioSlots = [_newAudioSlot()]; _audioFiles = _audioSlots;
    _audioFile = null; _audioUploadUrl = null; _audioUploadKey = null; _audioUploadName = ''; _audioUploadSize = 0;
    _audioUploading = false;
    navigate('/questions');
  } catch (e) {
    btnReset(btn);
    toast('Lỗi lưu đề: ' + (e.error || e.message), 'error');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// STUDENT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

let _addStudentClassId = null;
let _addStudentTab = 'new'; // 'new' | 'existing'

function parseStudentNameLines(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function openAddStudentModal(classId) {
  _addStudentClassId = classId;
  _addStudentTab = 'new';
  renderAddStudentModal();
}

function renderAddStudentModal() {
  openModal('Thêm học sinh vào lớp', `
    <div class="modal-tabs" style="display:flex;gap:0;margin-bottom:20px;border-bottom:2px solid var(--gray-200)">
      <button id="tab-new" class="modal-tab ${_addStudentTab === 'new' ? 'active' : ''}"
        onclick="switchStudentTab('new')" style="flex:1;padding:10px;background:none;border:none;
        font-weight:600;font-size:13px;cursor:pointer;border-bottom:2px solid transparent;
        margin-bottom:-2px;color:${_addStudentTab === 'new' ? 'var(--primary)' : 'var(--gray-400)'};
        border-bottom-color:${_addStudentTab === 'new' ? 'var(--primary)' : 'transparent'}">
        ✨ Tạo tài khoản mới
      </button>
      <button id="tab-existing" class="modal-tab ${_addStudentTab === 'existing' ? 'active' : ''}"
        onclick="switchStudentTab('existing')" style="flex:1;padding:10px;background:none;border:none;
        font-weight:600;font-size:13px;cursor:pointer;border-bottom:2px solid transparent;
        margin-bottom:-2px;color:${_addStudentTab === 'existing' ? 'var(--primary)' : 'var(--gray-400)'};
        border-bottom-color:${_addStudentTab === 'existing' ? 'var(--primary)' : 'transparent'}">
        🔗 Thêm học sinh có sẵn
      </button>
    </div>

    ${_addStudentTab === 'new' ? `
      <div class="form-group">
        <label class="form-label">Danh sách họ tên <span style="color:var(--danger)">*</span></label>
        <textarea id="stu-names" class="form-input" rows="7"
          placeholder="Ngô Quang Đức&#10;Lê Hoàng Nam&#10;Nguyễn Thị An"></textarea>
        <div class="form-hint">Mỗi dòng là 1 học sinh. Nhập 1 dòng cũng dùng được cho trường hợp thêm lẻ. Username và password sẽ được tạo tự động.</div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal()">Hủy</button>
        <button class="btn btn-primary" onclick="submitCreateStudent(this)">Tạo &amp; thêm vào lớp</button>
      </div>
    ` : `
      <div class="form-group">
        <label class="form-label">Username học sinh <span style="color:var(--danger)">*</span></label>
        <input id="stu-existing-username" class="form-input"
          placeholder="Nhập username của học sinh đã có tài khoản" />
        <div class="form-hint">Học sinh sẽ được thêm vào lớp này mà không mất dữ liệu ở lớp cũ</div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal()">Hủy</button>
        <button class="btn btn-primary" onclick="submitAddExistingStudent(this)">Thêm vào lớp</button>
      </div>
    `}`);

  setTimeout(() => {
    ($('#stu-names') || $('#stu-existing-username'))?.focus();
  }, 50);
}

function switchStudentTab(tab) {
  _addStudentTab = tab;
  renderAddStudentModal();
}

async function submitCreateStudent(btn) {
  const names = parseStudentNameLines($('#stu-names')?.value);
  if (names.length === 0) { toast('Vui lòng nhập ít nhất 1 học sinh', 'error'); return; }

  btnLoading(btn);
  try {
    const res = await api.post('/students', {
      class_id: _addStudentClassId,
      students: names.map(full_name => ({ full_name })),
    });

    const created = Array.isArray(res.created) ? res.created : [];
    if (created.length === 0) throw new Error('Không nhận được tài khoản đã tạo');

    closeModal();
    openStudentCredentialsModal(
      created.length === 1 ? 'Tài khoản học sinh đã được tạo' : `Đã tạo ${created.length} tài khoản học sinh`,
      created,
      created.length === 1 ? 'student_account' : 'student_accounts',
    );
    toast(`Đã tạo ${created.length} tài khoản học sinh!`);
    showClassDetail({ id: _addStudentClassId });
  } catch (e) {
    btnReset(btn);
    toast('Lỗi: ' + (e.error || e.message || 'Không thể tạo học sinh'), 'error');
  }
}

async function submitAddExistingStudent(btn) {
  const username = $('#stu-existing-username')?.value.trim();
  if (!username) { toast('Vui lòng nhập username', 'error'); return; }

  btnLoading(btn);
  try {
    await api.post('/student-classes', { class_id: _addStudentClassId, username });
    closeModal();
    toast('Đã thêm học sinh vào lớp!');
    showClassDetail({ id: _addStudentClassId });
  } catch (e) {
    btnReset(btn);
    toast('Lỗi: ' + (e.error || 'Không thể thêm học sinh'), 'error');
  }
}

function openResetPasswordModal(studentId, studentName, btn) {
  if (!confirm(`Cấp mật khẩu mới cho "${studentName}"?\n\nMật khẩu cũ sẽ hết hiệu lực ngay sau khi đổi.`)) return;
  submitResetPassword(studentId, btn);
}

async function submitResetPassword(studentId, btn) {
  btnLoading(btn);
  try {
    const res = await api.post(`/students/${studentId}/reset-password`, {});
    if (!res?.credentials) throw new Error('Không nhận được mật khẩu mới');
    openStudentCredentialsModal('Mật khẩu mới của học sinh', [res.credentials], 'student_password_reset');
    toast('Đã cấp mật khẩu mới!');
  } catch (e) {
    btnReset(btn);
    toast('Lỗi: ' + (e.error || e.message || 'Không thể đổi mật khẩu'), 'error');
    return;
  }
  btnReset(btn);
}

// Remove student from this class only (not delete account)
async function removeStudentFromClass(studentId, classId, btn) {
  if (!confirm('Xoá học sinh khỏi lớp này?\n\nTài khoản học sinh vẫn còn, chỉ rời khỏi lớp này.')) return;
  btnLoading(btn);
  try {
    const res = await fetch(
      `${api._base}/student-classes?student_id=${studentId}&class_id=${classId}`,
      { method: 'DELETE' }
    );
    if (!res.ok) throw await res.json();
    toast('Đã xoá học sinh khỏi lớp');
    showClassDetail({ id: classId });
  } catch (e) {
    btnReset(btn);
    toast('Lỗi: ' + (e.error || e.message), 'error');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PROFILE FIELDS — Teacher manages student profile questions
// ═══════════════════════════════════════════════════════════════════════════

async function showProfileFields() {
  setLoading('Đang tải...');
  try {
    const fields = await api.get('/profile-fields');
    renderProfileFieldsPage(fields);
  } catch (e) {
    toast('Lỗi: ' + (e.error || e.message), 'error');
    renderRouteError('Không tải được hồ sơ học sinh', e, '/profile-fields');
  }
}

function renderProfileFieldsPage(fields) {
  const PF_TYPE_LABELS = { text: 'Văn bản ngắn', textarea: 'Văn bản dài', select: 'Chọn đáp án', date: 'Ngày sinh' };
  const PF_KEY_LABELS = { notification_email: 'Email thông báo' };
  const listHtml = fields.length === 0
    ? `<div class="pf-empty"><div class="pf-empty-icon">📋</div><div>Chưa có câu hỏi nào. Thêm câu hỏi đầu tiên bên trên!</div></div>`
    : `<table class="pf-table">
        <thead><tr><th>#</th><th>Câu hỏi</th><th>Kiểu</th><th>Vai trò</th><th></th></tr></thead>
        <tbody>${fields.map((f, i) => {
          const opts = Array.isArray(f.options) && f.options.length
            ? `<div class="pf-opts-preview">${f.options.slice(0, 3).map(o => `<span class="pf-opt-pill">${escapeHtml(String(o))}</span>`).join('')}${f.options.length > 3 ? `<span class="pf-opt-more">+${f.options.length - 3}</span>` : ''}</div>`
            : '';
          const role = f.field_key ? `<span class="pf-type-badge">${PF_KEY_LABELS[f.field_key] || f.field_key}</span>` : '<span style="color:var(--gray-400)">—</span>';
          return `<tr>
            <td class="pf-num">${i + 1}</td>
            <td><div class="pf-label-cell">${escapeHtml(f.label)}${opts}</div></td>
            <td><span class="pf-type-badge">${PF_TYPE_LABELS[f.field_type] || f.field_type}</span></td>
            <td>${role}</td>
            <td><button class="btn-icon danger" onclick="deleteProfileField('${f.id}')">🗑</button></td>
          </tr>`;
        }).join('')}</tbody>
      </table>`;

  $('#app').innerHTML = `
    <div class="container">
      <div class="detail-header">
        <div class="detail-header-info">
          <h2>👤 Câu hỏi hồ sơ học sinh</h2>
          <div class="detail-header-meta"><span>Học sinh điền vào các trường này trong trang Hồ sơ của mình</span></div>
        </div>
      </div>

      <div class="pf-add-card">
        <div class="pf-add-title">+ Thêm câu hỏi mới</div>
        <form id="pf-add-form" onsubmit="submitAddProfileField(event)">
          <div class="pf-add-row">
            <input id="pf-label" class="form-input" type="text" maxlength="200"
              placeholder="Nội dung câu hỏi (vd: Học tiếng Anh lâu chưa?)" required />
            <select id="pf-type" class="form-input pf-type-select" onchange="onPfTypeChange()">
              <option value="text">Văn bản ngắn</option>
              <option value="textarea">Văn bản dài</option>
              <option value="select">Chọn đáp án</option>
              <option value="date">Ngày sinh</option>
            </select>
            <button type="submit" class="btn btn-primary">Thêm</button>
          </div>
          <div id="pf-options-row" class="pf-options-row hidden">
            <label class="form-label" style="margin-bottom:4px">Các lựa chọn (mỗi dòng 1 lựa chọn)</label>
            <textarea id="pf-options" class="form-input" rows="4"
              placeholder="Dưới 1 năm&#10;1-3 năm&#10;3-5 năm&#10;Trên 5 năm"></textarea>
          </div>
          <label style="display:inline-flex;align-items:center;gap:8px;margin-top:12px;font-size:13px;color:var(--gray-600)">
            <input id="pf-notification-email" type="checkbox" onchange="onPfSpecialToggle()" />
            Dùng câu hỏi này làm email nhận thông báo cho học sinh
          </label>
        </form>
      </div>

      <div class="pf-list-card">
        <div class="pf-list-header">
          <span class="pf-list-title">Danh sách câu hỏi</span>
          <span class="pf-count-badge">${fields.length}</span>
        </div>
        ${listHtml}
      </div>
    </div>`;
}

function onPfTypeChange() {
  if ($('#pf-notification-email')?.checked) {
    $('#pf-options-row')?.classList.add('hidden');
    return;
  }
  const type = $('#pf-type')?.value;
  $('#pf-options-row')?.classList.toggle('hidden', type !== 'select');
}
window.onPfTypeChange = onPfTypeChange;

function onPfSpecialToggle() {
  const isNotificationEmail = !!$('#pf-notification-email')?.checked;
  const typeEl = $('#pf-type');
  const labelEl = $('#pf-label');
  if (typeEl) {
    if (isNotificationEmail) {
      typeEl.value = 'text';
      typeEl.disabled = true;
    } else {
      typeEl.disabled = false;
    }
  }
  if (isNotificationEmail && labelEl && !labelEl.value.trim()) {
    labelEl.value = 'Gmail';
  }
  onPfTypeChange();
}
window.onPfSpecialToggle = onPfSpecialToggle;

async function submitAddProfileField(e) {
  e.preventDefault();
  const label = $('#pf-label')?.value.trim();
  const fieldType = $('#pf-type')?.value || 'text';
  const fieldKey = $('#pf-notification-email')?.checked ? 'notification_email' : null;
  const optionsRaw = $('#pf-options')?.value || '';
  const options = !fieldKey && fieldType === 'select'
    ? optionsRaw.split('\n').map(s => s.trim()).filter(Boolean)
    : null;
  if (!label) { toast('Vui lòng nhập nội dung câu hỏi', 'error'); return; }
  if (!fieldKey && fieldType === 'select' && (!options || options.length < 2)) { toast('Nhập ít nhất 2 lựa chọn', 'error'); return; }
  try {
    await api.post('/profile-fields', { label, field_key: fieldKey, field_type: fieldType, options });
    toast('Đã thêm câu hỏi!');
    showProfileFields();
  } catch (e2) {
    toast('Lỗi: ' + (e2.error || e2.message), 'error');
  }
}
window.submitAddProfileField = submitAddProfileField;

async function deleteProfileField(id) {
  if (!confirm('Xoá câu hỏi này?\nCác câu trả lời của học sinh cũng sẽ bị xoá.')) return;
  try {
    await api.delete(`/profile-fields/${id}`);
    toast('Đã xoá câu hỏi');
    showProfileFields();
  } catch (e) {
    toast('Lỗi: ' + (e.error || e.message), 'error');
  }
}
window.deleteProfileField = deleteProfileField;

async function openStudentProfileModal(studentId, fullName) {
  openModal(`👤 Hồ sơ — ${fullName}`, `<div style="text-align:center;padding:24px;color:var(--gray-400)">Đang tải...</div>`);
  try {
    const { student, fields, answers } = await api.get(`/students/${studentId}/profile-answers`);
    const bodyHtml = fields.length === 0
      ? `<div class="pf-modal-empty">
          <p>Chưa có câu hỏi hồ sơ nào.</p>
          <a href="#/profile-fields" onclick="closeModal()">Thêm câu hỏi tại đây →</a>
        </div>`
      : `<div class="pf-modal-list">
          <div class="pf-modal-row">
            <span class="pf-modal-label">Họ và tên</span>
            <span class="pf-modal-value">${escapeHtml(student.full_name)}</span>
          </div>
          <div class="pf-modal-row">
            <span class="pf-modal-label">Tên đăng nhập</span>
            <span class="pf-modal-value" style="font-family:monospace">${escapeHtml(student.username)}</span>
          </div>
          <div class="pf-modal-row">
            <span class="pf-modal-label">Email thông báo</span>
            <span class="pf-modal-value ${student.email ? '' : 'pf-empty-val'}">${student.email ? escapeHtml(student.email) : 'Chưa có dữ liệu'}</span>
          </div>
          <div class="pf-modal-divider"></div>
          ${fields.map(f => `
            <div class="pf-modal-row">
              <span class="pf-modal-label">${escapeHtml(f.label)}</span>
              <span class="pf-modal-value ${answers[f.id] ? '' : 'pf-empty-val'}">${answers[f.id] ? escapeHtml(answers[f.id]) : 'Chưa có dữ liệu'}</span>
            </div>`).join('')}
        </div>`;
    const modalBody = document.getElementById('modal-body');
    if (modalBody) modalBody.innerHTML = bodyHtml;
  } catch (e) {
    const modalBody = document.getElementById('modal-body');
    if (modalBody) modalBody.innerHTML = `<p style="color:var(--danger)">Lỗi: ${e.error || e.message}</p>`;
  }
}
window.openStudentProfileModal = openStudentProfileModal;

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════

// Make functions globally accessible from inline HTML handlers
// ═══════════════════════════════════════════════════════════════════════════
// LOCATION PICK (drag-select from passage textarea)
// ═══════════════════════════════════════════════════════════════════════════

function activateLocationPick(rowEl) {
  if (_pendingLocationRow) cancelLocationPick();
  _pendingLocationRow = rowEl;
  const qLabel = rowEl.querySelector('.q-label')?.textContent || '';
  const hint = document.getElementById('location-pick-hint');

  // Listening: pick from script textarea
  const scriptEl = document.getElementById('listening-script');
  if (scriptEl) {
    scriptEl.classList.add('location-pickable-textarea');
    if (hint) {
      hint.textContent = `Đang chọn vị trí cho ${qLabel} — bôi chọn đoạn text trong ô Script Listening bên trên. Esc để huỷ.`;
      hint.classList.remove('hidden');
    }
    rowEl.querySelector('.btn-pick-location')?.classList.add('picking-active');
    scriptEl.addEventListener('mouseup', _onScriptMouseUp);
    scriptEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  // Reading: pick from preview blocks
  const preview = document.getElementById('content-composer-preview-body');
  const textBlocks = preview?.querySelectorAll?.('.mixed-content-text');
  if (!preview || !textBlocks?.length) return;
  toggleComposerEditor(true);
  preview.classList.add('location-picking');
  textBlocks.forEach(block => block.classList.add('location-pickable'));
  if (hint) {
    hint.textContent = `Đang chọn vị trí cho ${qLabel} — bôi chọn text ngay trong preview. Có thể span qua nhiều block text liên tiếp, nhưng không được đi qua ảnh. Esc để huỷ.`;
    hint.classList.remove('hidden');
  }
  rowEl.querySelector('.btn-pick-location')?.classList.add('picking-active');
  preview.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function getTextareaSelectionRect(textarea, start, end) {
  const taRect = textarea.getBoundingClientRect();
  const cs = window.getComputedStyle(textarea);
  const mirror = document.createElement('div');
  Object.assign(mirror.style, {
    position: 'fixed', top: taRect.top + 'px', left: taRect.left + 'px',
    width: taRect.width + 'px', height: taRect.height + 'px',
    overflow: 'hidden', opacity: '0', pointerEvents: 'none', zIndex: '-1',
    whiteSpace: 'pre-wrap', wordBreak: cs.wordBreak, overflowWrap: cs.overflowWrap,
    fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight,
    lineHeight: cs.lineHeight, letterSpacing: cs.letterSpacing,
    paddingTop: cs.paddingTop, paddingRight: cs.paddingRight,
    paddingBottom: cs.paddingBottom, paddingLeft: cs.paddingLeft,
    boxSizing: cs.boxSizing,
  });
  const inner = document.createElement('div');
  inner.style.cssText = 'position:relative;width:100%';
  inner.style.top = -textarea.scrollTop + 'px';
  const text = textarea.value;
  inner.appendChild(document.createTextNode(text.slice(0, start)));
  const span = document.createElement('span');
  span.textContent = text.slice(start, end) || ' ';
  inner.appendChild(span);
  inner.appendChild(document.createTextNode(text.slice(end)));
  mirror.appendChild(inner);
  document.body.appendChild(mirror);
  const rect = span.getBoundingClientRect();
  document.body.removeChild(mirror);
  return rect;
}

function _onScriptMouseUp() {
  const scriptEl = document.getElementById('listening-script');
  if (!scriptEl || !_pendingLocationRow) return;
  const start = scriptEl.selectionStart;
  const end   = scriptEl.selectionEnd;
  if (start === end) return;
  const selectedText = scriptEl.value.slice(start, end).trim();
  if (!selectedText) return;
  const result = {
    text: selectedText,
    meta: { type: 'script_text_range', start, end, text: selectedText },
  };
  const selRect = getTextareaSelectionRect(scriptEl, start, end);
  showLocationConfirmPopup(result, { getBoundingClientRect: () => selRect });
}

function cancelLocationPick() {
  if (!_pendingLocationRow) return;
  _pendingLocationRow.querySelector('.btn-pick-location')?.classList.remove('picking-active');
  _pendingLocationRow = null;
  // Clean up script textarea picking
  const scriptEl = document.getElementById('listening-script');
  if (scriptEl) {
    scriptEl.classList.remove('location-pickable-textarea');
    scriptEl.removeEventListener('mouseup', _onScriptMouseUp);
  }
  // Clean up preview picking
  const preview = document.getElementById('content-composer-preview-body');
  preview?.classList.remove('location-picking');
  preview?.querySelectorAll?.('.mixed-content-text').forEach(block => block.classList.remove('location-pickable'));
  const hint = document.getElementById('location-pick-hint');
  if (hint) hint.classList.add('hidden');
  window.getSelection()?.removeAllRanges?.();
}

function clearLocationValue(rowEl) {
  rowEl.querySelector('.answer-location').value = '';
  const metaInput = rowEl.querySelector('.answer-location-meta');
  if (metaInput) metaInput.value = '';
  rowEl.querySelector('.location-text-display').textContent = 'Chưa chọn';
  rowEl.querySelector('.btn-clear-location').classList.add('hidden');
}

function getPreviewBlockElement(node) {
  if (!node) return null;
  const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  return el?.closest?.('#content-composer-preview-body [data-block-id]') || null;
}

function getTextOffsetWithin(rootEl, container, offset) {
  try {
    const range = document.createRange();
    range.selectNodeContents(rootEl);
    range.setEnd(container, offset);
    return range.toString().length;
  } catch {
    return null;
  }
}

function extractPreviewLocationSelection() {
  const preview = document.getElementById('content-composer-preview-body');
  const content = preview?.querySelector?.('.mixed-content');
  const sel = window.getSelection();
  if (!preview || !content || !sel || sel.isCollapsed || !sel.rangeCount) return null;
  const range = sel.getRangeAt(0);
  if (!preview.contains(range.commonAncestorContainer)) return null;

  const startBlock = getPreviewBlockElement(range.startContainer);
  const endBlock = getPreviewBlockElement(range.endContainer);
  if (!startBlock || !endBlock) return { error: 'Vui lòng chọn trong phần text của preview.' };
  if (!startBlock.classList.contains('mixed-content-text') || !endBlock.classList.contains('mixed-content-text')) {
    return { error: 'Location chỉ hỗ trợ trên text, không hỗ trợ trên ảnh.' };
  }

  const items = Array.from(content.children).filter(el => el.matches('[data-block-id]'));
  const startIndex = items.indexOf(startBlock);
  const endIndex = items.indexOf(endBlock);
  if (startIndex < 0 || endIndex < 0) return { error: 'Không xác định được vùng text đã chọn.' };
  const from = Math.min(startIndex, endIndex);
  const to = Math.max(startIndex, endIndex);
  const spanItems = items.slice(from, to + 1);
  if (spanItems.some(el => !el.classList.contains('mixed-content-text'))) {
    return { error: 'Bạn chỉ có thể chọn trên các block text liên tiếp, không được đi qua ảnh.' };
  }

  const selectedText = sel.toString().trim();
  if (!selectedText) return { error: 'Chưa có text nào được chọn.' };

  const startOffset = getTextOffsetWithin(startBlock, range.startContainer, range.startOffset);
  const endOffset = getTextOffsetWithin(endBlock, range.endContainer, range.endOffset);
  if (startOffset == null || endOffset == null) return { error: 'Không đọc được vị trí text đã chọn.' };

  return {
    text: selectedText,
    meta: {
      type: 'preview_text_range',
      start_block_id: startBlock.dataset.blockId,
      end_block_id: endBlock.dataset.blockId,
      start_offset: startOffset,
      end_offset: endOffset,
      text: selectedText,
    },
  };
}

// ── Location confirm popup ─────────────────────────────────────────────────
let _pendingLocationResult = null;
let _pendingLocationRange  = null;

function removeLocationPopup() {
  document.getElementById('location-confirm-popup')?.remove();
  _pendingLocationResult = null;
  _pendingLocationRange  = null;
}

function showLocationConfirmPopup(result, rangeOrAnchor) {
  removeLocationPopup();
  _pendingLocationResult = result;
  // cloneRange only exists on real DOM Range objects (Reading); textarea uses plain anchor object
  _pendingLocationRange  = rangeOrAnchor?.cloneRange ? rangeOrAnchor.cloneRange() : null;

  const rect = rangeOrAnchor.getBoundingClientRect();
  const preview = document.getElementById('content-composer-preview-body');
  const previewRect = preview?.getBoundingClientRect() || { left: 0, right: window.innerWidth };

  const popup = document.createElement('div');
  popup.id = 'location-confirm-popup';
  popup.className = 'location-confirm-popup';
  popup.innerHTML = `
    <div class="lcp-label">Xác nhận vị trí đã chọn</div>
    <div class="lcp-text">${escapeHtml(result.text)}</div>
    <div class="lcp-actions">
      <button class="lcp-cancel" id="lcp-cancel">✕ Huỷ</button>
      <button class="lcp-confirm" id="lcp-confirm">✓ Xác nhận</button>
    </div>`;

  // Position below selection, clamped to viewport
  const spaceBelow = window.innerHeight - rect.bottom;
  const top = spaceBelow >= 110 ? rect.bottom + 8 : rect.top - 118;
  const left = Math.min(Math.max(previewRect.left + 4, rect.left), window.innerWidth - 376);
  popup.style.top  = Math.max(8, top) + 'px';
  popup.style.left = Math.max(8, left) + 'px';

  document.body.appendChild(popup);
  document.getElementById('lcp-confirm').onclick = () => commitLocationSelection();
  document.getElementById('lcp-cancel').onclick  = () => {
    removeLocationPopup();
    window.getSelection()?.removeAllRanges?.();
    cancelLocationPick();
  };
}

function commitLocationSelection(directResult) {
  const result = directResult ?? _pendingLocationResult;
  if (!result || !_pendingLocationRow) return;
  const range  = directResult ? null : _pendingLocationRange;
  if (!directResult) removeLocationPopup();

  // Yellow fade overlay over the selected region
  if (range) {
    const rect = range.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const overlay = document.createElement('div');
      Object.assign(overlay.style, {
        position:       'fixed',
        top:            rect.top + 'px',
        left:           rect.left + 'px',
        width:          rect.width + 'px',
        height:         rect.height + 'px',
        background:     '#fef08a',
        borderRadius:   '3px',
        pointerEvents:  'none',
        zIndex:         '599',
        opacity:        '1',
        transition:     'opacity 2s ease',
      });
      document.body.appendChild(overlay);
      requestAnimationFrame(() => requestAnimationFrame(() => { overlay.style.opacity = '0'; }));
      setTimeout(() => overlay.remove(), 2100);
    }
  }

  // Save
  _pendingLocationRow.querySelector('.answer-location').value = result.text;
  const metaInput = _pendingLocationRow.querySelector('.answer-location-meta');
  if (metaInput) metaInput.value = JSON.stringify(result.meta);
  const disp = _pendingLocationRow.querySelector('.location-text-display');
  if (disp) disp.textContent = result.text;
  _pendingLocationRow.querySelector('.btn-clear-location')?.classList.remove('hidden');
  window.getSelection()?.removeAllRanges?.();
  const savedRow = _pendingLocationRow;
  cancelLocationPick();
  savedRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

document.addEventListener('mouseup', (e) => {
  if (!_pendingLocationRow) return;
  // Don't trigger if clicking inside the confirm popup itself
  if (e.target?.closest?.('#location-confirm-popup')) return;
  const result = extractPreviewLocationSelection();
  if (!result) return;
  if (result.error) {
    toast(result.error, 'warning');
    return;
  }
  const sel = window.getSelection();
  const range = sel?.rangeCount ? sel.getRangeAt(0) : null;
  if (!range) return;
  showLocationConfirmPopup(result, range);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const dragPanel = document.getElementById('drag-assign-panel');
    if (dragPanel || _dragQuestionId) {
      e.preventDefault();
      cancelDragAssign();
      return;
    }
    if (document.getElementById('location-confirm-popup')) {
      removeLocationPopup();
      window.getSelection()?.removeAllRanges?.();
      cancelLocationPick();
      return;
    }
    if (_pendingLocationRow) cancelLocationPick();
    // Close modal on Escape
    const overlay = document.getElementById('modal-overlay');
    if (overlay && !overlay.classList.contains('hidden')) closeModal();
  }
  // Ctrl+S / Cmd+S → save grading if on grading page
  if ((e.ctrlKey || e.metaKey) && e.key === 's' && _gradingSubmissionId) {
    e.preventDefault();
    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) saveBtn.click();
  }
});

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

document.addEventListener('DOMContentLoaded', () => {
  initDarkMode();
  // Refresh inbox badge on startup
  refreshInboxBadge();
});

initDarkMode();

window.navigate          = navigateWithTransition;
window.router            = router;
window.closeModal        = closeModal;
window.openCreateClassModal = openCreateClassModal;
window.submitCreateClass = submitCreateClass;
window.openAssignModal   = openAssignModal;
window.filterAssignQuestionSearch = filterAssignQuestionSearch;
window.setAssignTagFilter = setAssignTagFilter;
window.filterAssignQuestions = filterAssignQuestions;
window.selectQuestion    = selectQuestion;
window.submitAssign      = submitAssign;
window.toggleAssignment  = toggleAssignment;
window.deleteAssignment  = deleteAssignment;
window.deleteQuestion    = deleteQuestion;
window.setSkillFilter    = setSkillFilter;
window.onSkillChange     = onSkillChange;
window.openImagePicker   = openImagePicker;
window.toggleComposerEditor = toggleComposerEditor;
window.onAudioSelected   = onAudioFilesSelected;
window.removeAudio       = removeAudio;
window.submitQuestion    = submitQuestion;
window.submitQuestionEdit      = submitQuestionEdit;
window.openSubmissionModal     = openSubmissionModal;
window.closeAnnotationPopup    = closeAnnotationPopup;
window.confirmAnnotation       = confirmAnnotation;
window.removeAnnotation        = removeAnnotation;
window.scrollToAnnotation      = scrollToAnnotation;
window.saveGrading             = saveGrading;
window.SKILL_LABELS            = SKILL_LABELS;
window.openAddStudentModal      = openAddStudentModal;
window.switchStudentTab         = switchStudentTab;
window.submitCreateStudent      = submitCreateStudent;
window.submitAddExistingStudent = submitAddExistingStudent;
window.downloadStudentCredentialsCsv = downloadStudentCredentialsCsv;
window.openResetPasswordModal   = openResetPasswordModal;
window.submitResetPassword      = submitResetPassword;
window.removeStudentFromClass   = removeStudentFromClass;
window.addVocabItem             = addVocabItem;
window.removeVocabItem          = removeVocabItem;
window.toggleExplanation        = toggleExplanation;
window.locateInText             = locateInText;
window.scrollToFeedbackMark     = scrollToFeedbackMark;
window.activateLocationPick     = activateLocationPick;
window.clearLocationValue       = clearLocationValue;
window.cancelLocationPick       = cancelLocationPick;

// Boot
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', router, { once: true });
} else {
  router();
}
