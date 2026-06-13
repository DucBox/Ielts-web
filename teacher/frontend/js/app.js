// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

// $, escapeHtml, renderMarkdownInline, renderSafeMarkdown, btnReset, toast,
// setLoading, formatDateTime, isOverdue, makeSortIcon — defined in utils.js

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if ((window.visualViewport?.width ?? window.innerWidth) <= 768) {
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

function btnLoading(btn) {
  if (!btn) return;
  btn._origHTML = btn.innerHTML;
  btn.disabled = true;
  const isIcon = btn.classList.contains('btn-icon');
  btn.innerHTML = isIcon
    ? '<span class="btn-spinner btn-spinner--dark"></span>'
    : '<span class="btn-spinner"></span> Đang xử lý...';
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

const QUESTION_DRAFT_PREFIX = 'ielts_teacher_question_draft:';
const QUESTION_DRAFT_TTL_MS = 15 * 60 * 1000;
const QUESTION_DRAFT_SAVE_INTERVAL_MS = 15 * 1000;
const QUESTION_DRAFT_SAVE_DEBOUNCE_MS = 800;
let _questionDraftContext = null;
let _questionDraftTimer = null;
let _questionDraftDebounceTimer = null;
let _suspendQuestionDraftSave = false;

function getQuestionDraftKey(mode, questionId = '') {
  return `${QUESTION_DRAFT_PREFIX}${mode}:${questionId || 'new'}`;
}

function pruneTeacherQuestionDrafts() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key || (!key.startsWith(QUESTION_DRAFT_PREFIX) && !key.startsWith(SP_DRAFT_PREFIX))) continue;
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (!parsed?.expiresAt || parsed.expiresAt <= Date.now()) {
          localStorage.removeItem(key);
        }
      } catch {
        localStorage.removeItem(key);
      }
    }
  } catch {}
}

function loadQuestionDraft(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.expiresAt || parsed.expiresAt <= Date.now()) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.data || null;
  } catch {
    try { localStorage.removeItem(key); } catch {}
    return null;
  }
}

function saveQuestionDraft(key, data) {
  const savedAt = Date.now();
  try {
    localStorage.setItem(key, JSON.stringify({
      data,
      savedAt,
      expiresAt: savedAt + QUESTION_DRAFT_TTL_MS,
    }));
  } catch {}
}

function clearQuestionDraft(key) {
  if (!key) return;
  try { localStorage.removeItem(key); } catch {}
}

function hasMeaningfulQuestionDraft(snapshot) {
  if (!snapshot) return false;
  if (String(snapshot.title || '').trim()) return true;
  if (String(snapshot.skill || '').trim()) return true;
  if (Array.isArray(snapshot.tags) && snapshot.tags.length > 0) return true;
  if (String(snapshot.script || '').trim()) return true;
  if (Array.isArray(snapshot.vocabulary) && snapshot.vocabulary.length > 0) return true;
  if (Array.isArray(snapshot.questions_data) && snapshot.questions_data.some(item =>
    (Array.isArray(item.answers) && item.answers.length > 0)
      || String(item.location || '').trim()
      || String(item.explanation || '').trim()
  )) return true;
  const contentText = blocksToPlainText(snapshot.content_blocks || []).trim();
  return !!contentText;
}

function getQuestionTagContainer() {
  return $('#q-tags-chip-edit') || $('#q-tags-chip');
}

function getQuestionTagInput() {
  return $('#q-tag-input-edit') || $('#q-tag-input');
}

function setQuestionChipValues(container, input, values = []) {
  if (!container || !input) return;
  container.querySelectorAll('.chip').forEach(chip => chip.remove());
  values.forEach(value => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.dataset.value = String(value).trim();
    chip.innerHTML = `${escapeHtml(String(value).trim())} <button type="button" class="chip-remove" aria-label="Xoá">×</button>`;
    chip.querySelector('.chip-remove').onclick = () => chip.remove();
    container.insertBefore(chip, input);
  });
}

function snapshotCurrentQuestionDraft() {
  const titleInput = $('#q-title');
  if (!titleInput) return null;
  const skill = $('#q-skill')?.value || _questionDraftContext?.skill || '';
  const contentBlocks = normalizeContentBlocksForEditor(_contentBlocks);
  const snapshot = {
    mode: _questionDraftContext?.mode || 'new',
    question_id: _questionDraftContext?.questionId || '',
    title: titleInput.value.trim(),
    skill,
    tags: (() => {
      const container = getQuestionTagContainer();
      return container ? getChipValues(container) : [];
    })(),
    content_blocks: contentBlocks,
    questions_data: (skill === 'reading' || skill === 'listening') ? collectAnswerGrid() : [],
    vocabulary: Array.isArray(_vocabItems) ? _vocabItems.map(item => ({ ...item })) : [],
    script: skill === 'listening' ? (($('#listening-script')?.value || '').trim()) : '',
  };
  return snapshot;
}

function flushQuestionDraftSave() {
  if (_questionDraftDebounceTimer) {
    clearTimeout(_questionDraftDebounceTimer);
    _questionDraftDebounceTimer = null;
  }
  if (_suspendQuestionDraftSave || !_questionDraftContext) return;
  const snapshot = snapshotCurrentQuestionDraft();
  if (!hasMeaningfulQuestionDraft(snapshot)) {
    clearQuestionDraft(_questionDraftContext.key);
    return;
  }
  saveQuestionDraft(_questionDraftContext.key, snapshot);
}

function scheduleQuestionDraftSave() {
  if (_suspendQuestionDraftSave || !_questionDraftContext) return;
  if (_questionDraftDebounceTimer) clearTimeout(_questionDraftDebounceTimer);
  _questionDraftDebounceTimer = setTimeout(() => {
    _questionDraftDebounceTimer = null;
    flushQuestionDraftSave();
  }, QUESTION_DRAFT_SAVE_DEBOUNCE_MS);
}

function stopQuestionDraftAutosave() {
  flushQuestionDraftSave();
  if (_questionDraftTimer) clearInterval(_questionDraftTimer);
  if (_questionDraftDebounceTimer) clearTimeout(_questionDraftDebounceTimer);
  _questionDraftTimer = null;
  _questionDraftDebounceTimer = null;
  _questionDraftContext = null;
}

function startQuestionDraftAutosave(mode, questionId = '', skill = '') {
  stopQuestionDraftAutosave();
  _questionDraftContext = {
    mode,
    questionId,
    key: getQuestionDraftKey(mode, questionId),
    skill,
  };
  _questionDraftTimer = setInterval(flushQuestionDraftSave, QUESTION_DRAFT_SAVE_INTERVAL_MS);
}

function restoreQuestionDraftIntoForm(mode, questionId = '', fallbackSkill = '') {
  const draft = loadQuestionDraft(getQuestionDraftKey(mode, questionId));
  if (!draft) return false;
  _suspendQuestionDraftSave = true;
  try {
    const titleInput = $('#q-title');
    if (titleInput) titleInput.value = draft.title || '';

    const skillSelect = $('#q-skill');
    const nextSkill = draft.skill || fallbackSkill || skillSelect?.value || '';
    if (skillSelect && !skillSelect.disabled) {
      skillSelect.value = nextSkill;
      onSkillChange(nextSkill);
    }

    const tagContainer = getQuestionTagContainer();
    const tagInput = getQuestionTagInput();
    if (tagContainer && tagInput) setQuestionChipValues(tagContainer, tagInput, draft.tags || []);

    initContentComposer(draft.content_blocks || [], '');

    if ((nextSkill === 'reading' || nextSkill === 'listening') && Array.isArray(draft.questions_data) && draft.questions_data.length > 0) {
      renderAnswerGridWithData(draft.questions_data);
    }

    _vocabItems = Array.isArray(draft.vocabulary) ? draft.vocabulary.map(item => ({ ...item })) : [];
    if (nextSkill === 'reading' || nextSkill === 'listening') renderVocabList();

    const scriptInput = $('#listening-script');
    if (scriptInput) {
      scriptInput.value = draft.script || '';
      if (nextSkill === 'listening') { _speakerNames = []; _refreshSpeakerNames(); _renderSpeakerRenameUI(); }
    }

    attachChipListeners();
    return true;
  } finally {
    _suspendQuestionDraftSave = false;
  }
}

function isQuestionDraftTarget(target) {
  return !!(_questionDraftContext && target instanceof Element && target.closest('#app .form-card'));
}

document.addEventListener('input', e => {
  if (isQuestionDraftTarget(e.target)) scheduleQuestionDraftSave();
}, true);

document.addEventListener('change', e => {
  if (isQuestionDraftTarget(e.target)) scheduleQuestionDraftSave();
}, true);

document.addEventListener('click', e => {
  if (!(e.target instanceof Element)) return;
  const hit = e.target.closest('.chip-remove, .vocab-remove, .vocab-edit, .btn-clear-location');
  if (!hit || !isQuestionDraftTarget(hit)) return;
  setTimeout(scheduleQuestionDraftSave, 0);
});

// ── Shared Pool Draft Autosave ─────────────────────────────────────────────
const SP_DRAFT_PREFIX = 'ielts_teacher_sp_draft:';
let _spDraftContext = null;
let _spDraftTimer = null;
let _spDraftDebounceTimer = null;
let _suspendSpDraftSave = false;

function getSpDraftKey(mode, id = '') {
  return `${SP_DRAFT_PREFIX}${mode}:${id || 'new'}`;
}

function snapshotCurrentSpDraft() {
  const titleInput = $('#sp-title');
  if (!titleInput) return null;
  const skill = $('#sp-skill')?.value || _spDraftContext?.skill || '';
  const contentBlocks = normalizeContentBlocksForEditor(_contentBlocks);
  return {
    mode: _spDraftContext?.mode || 'new',
    sp_id: _spDraftContext?.spId || '',
    title: titleInput.value.trim(),
    skill,
    time_limit_minutes: $('#sp-time-limit')?.value.trim() || '',
    tags: getChipValues($('#sp-tags-chip')),
    content_blocks: contentBlocks,
    questions_data: (skill === 'reading' || skill === 'listening') ? collectAnswerGrid() : [],
    vocabulary: Array.isArray(_vocabItems) ? _vocabItems.map(item => ({ ...item })) : [],
    script: skill === 'listening' ? (($('#listening-script')?.value || '').trim()) : '',
  };
}

function flushSpDraftSave() {
  if (_spDraftDebounceTimer) { clearTimeout(_spDraftDebounceTimer); _spDraftDebounceTimer = null; }
  if (_suspendSpDraftSave || !_spDraftContext) return;
  const snapshot = snapshotCurrentSpDraft();
  if (!hasMeaningfulQuestionDraft(snapshot)) { clearQuestionDraft(_spDraftContext.key); return; }
  saveQuestionDraft(_spDraftContext.key, snapshot);
}

function scheduleSpDraftSave() {
  if (_suspendSpDraftSave || !_spDraftContext) return;
  if (_spDraftDebounceTimer) clearTimeout(_spDraftDebounceTimer);
  _spDraftDebounceTimer = setTimeout(() => {
    _spDraftDebounceTimer = null;
    flushSpDraftSave();
  }, QUESTION_DRAFT_SAVE_DEBOUNCE_MS);
}

function stopSpDraftAutosave() {
  flushSpDraftSave();
  if (_spDraftTimer) clearInterval(_spDraftTimer);
  if (_spDraftDebounceTimer) clearTimeout(_spDraftDebounceTimer);
  _spDraftTimer = null;
  _spDraftDebounceTimer = null;
  _spDraftContext = null;
}

function startSpDraftAutosave(mode, spId = '', skill = '') {
  stopSpDraftAutosave();
  _spDraftContext = { mode, spId, key: getSpDraftKey(mode, spId), skill };
  _spDraftTimer = setInterval(flushSpDraftSave, QUESTION_DRAFT_SAVE_INTERVAL_MS);
}

function restoreSpDraftIntoForm(mode, spId = '', fallbackSkill = '') {
  const draft = loadQuestionDraft(getSpDraftKey(mode, spId));
  if (!draft) return false;
  _suspendSpDraftSave = true;
  try {
    const titleInput = $('#sp-title');
    if (titleInput) titleInput.value = draft.title || '';

    const timeLimitInput = $('#sp-time-limit');
    if (timeLimitInput && draft.time_limit_minutes) timeLimitInput.value = draft.time_limit_minutes;

    const nextSkill = draft.skill || fallbackSkill || '';
    const skillSelect = $('#sp-skill');
    if (skillSelect && nextSkill) {
      skillSelect.value = nextSkill;
      const draftQ = {
        skill: nextSkill,
        content_blocks: draft.content_blocks || [],
        content_text: '',
        questions_data: draft.questions_data || [],
        vocabulary: draft.vocabulary || [],
        script: draft.script || '',
      };
      onSharedSkillChange(nextSkill, draftQ);
    }

    const tagContainer = $('#sp-tags-chip');
    const tagInput = $('#sp-tag-input');
    if (tagContainer && tagInput) setQuestionChipValues(tagContainer, tagInput, draft.tags || []);
    attachChipListeners($('#sp-tag-input'), $('#sp-tags-chip'));

    return true;
  } finally {
    _suspendSpDraftSave = false;
  }
}

function isSpDraftTarget(target) {
  return !!(_spDraftContext && target instanceof Element && target.closest('#app .form-card'));
}

document.addEventListener('input', e => {
  if (isSpDraftTarget(e.target)) scheduleSpDraftSave();
}, true);

document.addEventListener('change', e => {
  if (isSpDraftTarget(e.target)) scheduleSpDraftSave();
}, true);

document.addEventListener('click', e => {
  if (!(e.target instanceof Element)) return;
  const hit = e.target.closest('.chip-remove, .vocab-remove, .vocab-edit, .btn-clear-location');
  if (!hit || !isSpDraftTarget(hit)) return;
  setTimeout(scheduleSpDraftSave, 0);
});

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
}


const SKILL_LABELS = {
  reading:   { icon: '📖', label: 'Reading',   badge: 'badge-reading' },
  listening: { icon: '🎧', label: 'Listening', badge: 'badge-listening' },
  writing:   { icon: '✍️',  label: 'Writing',   badge: 'badge-writing' },
  speaking:  { icon: '🎤', label: 'Speaking',  badge: 'badge-speaking' },
  composite: { icon: '📋', label: 'Tổng hợp',  badge: 'badge-composite' },
};
const FILTERABLE_ASSIGNMENT_SKILLS = ['reading', 'listening', 'writing', 'speaking', 'composite'];

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
  scheduleQuestionDraftSave();
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

function _chipBlur(e) {
  const val = e.target.value.trim();
  if (val) {
    addChip(e.target.parentElement, val);
    e.target.value = '';
  }
}

function attachChipListeners() {
  document.querySelectorAll('.chip-input').forEach(input => {
    input.removeEventListener('keydown', _chipKeydown);
    input.removeEventListener('blur', _chipBlur);
    input.addEventListener('keydown', _chipKeydown);
    input.addEventListener('blur', _chipBlur);
  });
}

function checkEmptyAnswers() {
  const rows = document.querySelectorAll('#answer-grid .answer-row');
  const empty = [];
  rows.forEach((row, idx) => {
    const container = row.querySelector('.chip-container');
    const chips = container ? container.querySelectorAll('.chip') : [];
    const pendingInput = row.querySelector('.chip-input')?.value.trim() || '';
    if (chips.length === 0 && !pendingInput) empty.push(idx + 1);
  });
  return empty;
}

function confirmSaveWithEmptyAnswers(emptyQnos, onConfirm) {
  const list = emptyQnos.map(n => `Q${n}`).join(', ');
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal" style="max-width:400px">
      <div class="modal-header"><h3>⚠️ Câu chưa có đáp án</h3></div>
      <div class="modal-body">
        <p style="margin:0 0 8px">Các câu sau chưa có đáp án: <strong>${list}</strong></p>
        <p style="margin:0;font-size:13px;color:var(--gray-500)">Bạn vẫn muốn lưu?</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" id="confirm-cancel-save">Quay lại điền</button>
        <button class="btn btn-primary" id="confirm-do-save">Vẫn lưu</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.querySelector('#confirm-cancel-save').onclick = () => modal.remove();
  modal.querySelector('#confirm-do-save').onclick = () => { modal.remove(); onConfirm(); };
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
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

function _createAnswerRow(qNo, data = null) {
  const row = document.createElement('div');
  row.className = 'answer-row';

  const main = document.createElement('div');
  main.className = 'answer-row-main';

  const label = document.createElement('span');
  label.className = 'q-label';
  label.textContent = `Q${qNo}`;

  const chipContainer = document.createElement('div');
  chipContainer.className = 'chip-container';
  if (data?.answers) {
    for (const a of data.answers) {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.dataset.value = a;
      chip.innerHTML = `${escapeHtml(a)} <button class="chip-remove" title="Xoá" aria-label="Xoá">×</button>`;
      chip.querySelector('.chip-remove').onclick = () => chip.remove();
      chipContainer.appendChild(chip);
    }
  }
  const chipInput = document.createElement('input');
  chipInput.className = 'chip-input';
  chipInput.placeholder = 'Đáp án + Enter';
  chipContainer.appendChild(chipInput);

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn-delete-row';
  deleteBtn.title = 'Xoá câu này';
  deleteBtn.setAttribute('aria-label', 'Xoá câu này');
  deleteBtn.textContent = '×';
  deleteBtn.onclick = function() { removeAnswerRow(this.closest('.answer-row')); };

  main.appendChild(label);
  main.appendChild(chipContainer);
  main.appendChild(deleteBtn);

  const locRow = document.createElement('div');
  locRow.className = 'location-row';
  locRow.innerHTML = `
    <span class="field-section-label">📍 Vị trí:</span>
    <span class="location-text-display">${data?.location || 'Chưa chọn'}</span>
    <input type="hidden" class="answer-location" value="${escapeHtml(data?.location || '')}" />
    <input type="hidden" class="answer-location-meta" value="${data?.location_meta ? escapeHtml(JSON.stringify(data.location_meta)) : ''}" />
    <button class="btn-clear-location${data?.location ? '' : ' hidden'}" onclick="clearLocationValue(this.closest('.answer-row'))" aria-label="Xoá vị trí">×</button>
    <button class="btn-pick-location" onclick="activateLocationPick(this.closest('.answer-row'))">Chọn</button>`;

  const expRow = document.createElement('div');
  expRow.className = 'explanation-row';
  const expLabel = document.createElement('span');
  expLabel.className = 'field-section-label';
  expLabel.textContent = '💡 Giải thích:';
  const expArea = document.createElement('textarea');
  expArea.className = 'answer-explanation';
  expArea.rows = 2;
  expArea.placeholder = 'Nhập giải thích đáp án...';
  expArea.value = data?.explanation || '';
  expRow.appendChild(expLabel);
  expRow.appendChild(expArea);

  row.appendChild(main);
  row.appendChild(locRow);
  row.appendChild(expRow);
  return row;
}

function renumberAnswerRows() {
  const rows = document.querySelectorAll('#answer-grid .answer-row');
  rows.forEach((row, idx) => {
    const label = row.querySelector('.q-label');
    if (label) label.textContent = `Q${idx + 1}`;
  });
  const countInput = $('#answer-count');
  if (countInput) countInput.value = rows.length;
}

function removeAnswerRow(row) {
  row.remove();
  renumberAnswerRows();
}

function addAnswerRow() {
  const grid = $('#answer-grid');
  if (!grid) return;
  const current = grid.querySelectorAll('.answer-row').length;
  const newRow = _createAnswerRow(current + 1);
  grid.appendChild(newRow);
  attachChipListeners();
  renumberAnswerRows();
  newRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderAnswerGrid(count) {
  const grid = $('#answer-grid');
  if (!grid) return;
  grid.innerHTML = '';
  for (let i = 1; i <= count; i++) {
    grid.appendChild(_createAnswerRow(i));
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
  '/shared-pool':          showSharedPool,
  '/shared-pool/new':      showSharedPoolForm,
  '/shared-pool/:id':      showSharedPoolDetail,
  '/composite/:id':        showCompositeSubmissions,
  '/inbox':                showInbox,
  '/profile-fields':       showProfileFields,
};

const routeLoadingMessages = {
  '/classes':          'Đang tải danh sách lớp...',
  '/class/:id':        'Đang tải thông tin lớp...',
  '/assignment/:id':   'Đang tải danh sách bài nộp...',
  '/grading/:id':      'Đang tải bài làm...',
  '/questions':        'Đang tải kho đề...',
  '/questions/new':    'Đang mở form tạo đề...',
  '/questions/:id':    'Đang tải đề...',
  '/shared-pool':      'Đang tải kho đề luyện tập...',
  '/shared-pool/new':  'Đang mở form tạo đề...',
  '/shared-pool/:id':  'Đang tải đề...',
  '/inbox':            'Đang tải hộp thư...',
  '/profile-fields':   'Đang tải hồ sơ học sinh...',
};

function navigate(hash) {
  flushQuestionDraftSave();
  closeMobileSidebar();
  window.location.hash = hash;
}

function router() {
  stopQuestionDraftAutosave();
  stopSpDraftAutosave();
  document.getElementById('preview-sticky-float')?.classList.remove('is-visible');
  document.getElementById('preview-sticky-toggle')?.classList.remove('is-visible');
  const hash = window.location.hash.slice(1) || '/classes';
  try {
    hideTableFloatToolbar();
    clearTableCellSelection();
    _activeTableCell = null;

    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
      const route = link.dataset.route;
      link.classList.toggle('active',
        (route === 'classes' && hash.startsWith('/class')) ||
        (route === 'questions' && hash.startsWith('/questions')) ||
        (route === 'shared-pool' && hash.startsWith('/shared-pool'))
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

let _inboxItems = [];
let _inboxSortCol = 'submitted_at';
let _inboxSortDir = 'desc';

async function showInbox() {
  _inboxSortCol = 'submitted_at';
  _inboxSortDir = 'desc';
  setLoading('Đang tải hộp thư...');
  try {
    const items = await api.get('/inbox');
    _inboxItems = items;
    renderInbox(items);
    // Update badge in sidebar
    updateInboxBadge(items.length);
  } catch (e) {
    toast('Lỗi tải inbox: ' + (e.error || e.message), 'error');
    renderRouteError('Không tải được hộp thư', e, '/inbox');
  }
}

function sortedInboxItems() {
  if (!_inboxSortCol) return _inboxItems;
  return [..._inboxItems].sort((a, b) => {
    let va, vb;
    if (_inboxSortCol === 'student_name')    { va = a.student_name.toLowerCase(); vb = b.student_name.toLowerCase(); }
    else if (_inboxSortCol === 'class_name') { va = a.class_name.toLowerCase();   vb = b.class_name.toLowerCase(); }
    else if (_inboxSortCol === 'skill')      { va = a.skill || '';                vb = b.skill || ''; }
    else if (_inboxSortCol === 'submitted_at') { va = a.submitted_at || '';       vb = b.submitted_at || ''; }
    else return 0;
    if (va < vb) return _inboxSortDir === 'asc' ? -1 : 1;
    if (va > vb) return _inboxSortDir === 'asc' ? 1 : -1;
    return 0;
  });
}

function sortInbox(col) {
  if (_inboxSortCol === col) {
    _inboxSortDir = _inboxSortDir === 'asc' ? 'desc' : 'asc';
  } else {
    _inboxSortCol = col;
    _inboxSortDir = col === 'student_name' || col === 'class_name' ? 'asc' : 'desc';
  }
  const list = document.getElementById('inbox-list-body');
  if (list) list.innerHTML = buildInboxRows(sortedInboxItems());
  document.querySelectorAll('th[data-inbox-col]').forEach(th => {
    const icon = th.querySelector('.sort-icon');
    if (icon) icon.remove();
    th.insertAdjacentHTML('beforeend', makeSortIcon(th.dataset.inboxCol, _inboxSortCol, _inboxSortDir));
  });
}
window.sortInbox = sortInbox;

function buildInboxRows(items) {
  return items.length === 0
    ? `<tr><td colspan="5"><div class="empty-state-v2">
        <span class="empty-illu">✅</span>
        <div class="empty-title">Không có bài nào cần chấm!</div>
        <div class="empty-desc">Tất cả bài Writing và Speaking đã được chấm xong.</div>
      </div></td></tr>`
    : items.map(it => `
      <tr>
        <td>${skillBadge(it.skill)}</td>
        <td><strong>${escapeHtml(it.student_name)}</strong></td>
        <td>
          ${escapeHtml(it.assignment_title)}
          ${(it.attempt_number || 1) > 1 ? `<span class="inbox-rewrite-badge">BÀI VIẾT LẠI · Lần ${it.attempt_number}</span>` : ''}
        </td>
        <td><span class="inbox-class">${escapeHtml(it.class_name)}</span></td>
        <td style="font-size:12px;color:var(--gray-400)">${formatDateTime(it.submitted_at)}</td>
        <td>
          <button class="btn btn-sm btn-primary inbox-grade-btn"
            onclick="openInboxSubmission('${it.submission_kind || 'assignment'}','${it.submission_id}','${it.skill}','${it.assignment_id || ''}')">✏️ Chấm bài</button>
        </td>
      </tr>`).join('');
}

function openInboxSubmission(submissionKind, submissionId, skill, assignmentId) {
  navigate(`/grading/${submissionId}`);
}
window.openInboxSubmission = openInboxSubmission;

function renderInbox(items) {
  _inboxItems = items;
  const isi = col => makeSortIcon(col, _inboxSortCol, _inboxSortDir);

  $('#app').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">📥 Hộp thư cần chấm</div>
        <div class="page-subtitle">${items.length} bài Writing/Speaking chưa chấm điểm</div>
      </div>
    </div>
    ${items.length > 0 ? `
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th class="sortable" data-inbox-col="skill" onclick="sortInbox('skill')">Kỹ năng ${isi('skill')}</th>
          <th class="sortable" data-inbox-col="student_name" onclick="sortInbox('student_name')">Học sinh ${isi('student_name')}</th>
          <th>Bài tập</th>
          <th class="sortable" data-inbox-col="class_name" onclick="sortInbox('class_name')">Lớp ${isi('class_name')}</th>
          <th class="sortable" data-inbox-col="submitted_at" onclick="sortInbox('submitted_at')">Thời gian nộp ${isi('submitted_at')}</th>
          <th></th>
        </tr></thead>
        <tbody id="inbox-list-body">${buildInboxRows(sortedInboxItems())}</tbody>
      </table>
    </div>` : buildInboxRows([])}`;
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
    _statsData = null;
    _statsSkillFilter = '';
    _statsStatusFilter = '';
    _statsModeFilter = '';
    _statsScaleFilter = 'ielts';
    _assignTableSortCol = '';
    _assignTableSortDir = 'desc';
    _assignListSortCol = '';
    _assignListSortDir = 'desc';
    _classStudentsSortCol = '';
    _classStudentsSortDir = 'asc';
    destroyStatsCharts();
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
  if (tab === 'stats' && _cachedCls) loadStatsTab(_cachedCls.id);
}
window.switchClassTab = switchClassTab;

// ─── Stats tab ────────────────────────────────────────────────────────────────

let _statsCharts = [];
let _statsData = null;
let _statsSkillFilter = '';
let _statsStatusFilter = '';
let _statsModeFilter = '';
let _statsScaleFilter = 'ielts'; // default: IELTS Test
let _statsSortCol = '';
let _statsSortDir = 'desc';
let _statsAllScoredSubs = []; // flat list of all scored submissions with student_name
let _statsTrendSkill = ''; // skill filter for the trend chart only
let _closedAssignsExpanded = false;
let _closedAssignsSearch = '';
let _statsSubSortCol = '';
let _statsSubSortDir = 'asc';

function destroyStatsCharts() {
  _statsCharts.forEach(c => { try { c.destroy(); } catch {} });
  _statsCharts = [];
}

function refreshStatsTab() {
  const container = document.getElementById('tab-stats');
  if (container) delete container.dataset.loadedFor;
  if (_cachedCls) loadStatsTab(_cachedCls.id);
}
window.refreshStatsTab = refreshStatsTab;

async function loadStatsTab(classId) {
  const container = document.getElementById('tab-stats');
  if (!container) return;
  if (container.dataset.loadedFor === classId) return;
  destroyStatsCharts();
  _statsData = null;
  container.innerHTML = `<div class="stats-loading-placeholder"><div class="spinner"></div><p>Đang tải thống kê...</p></div>`;
  try {
    _statsData = await api.get(`/classes/${classId}/analytics`);
    _statsSkillFilter = '';
    _statsStatusFilter = '';
    _statsModeFilter = '';
    _statsScaleFilter = 'ielts';
    _statsSortCol = '';
    _statsSortDir = 'desc';
    _closedAssignsExpanded = false;
    _closedAssignsSearch = '';
    _statsSubSortCol = '';
    _statsSubSortDir = 'asc';
    // Default to first skill that has assignments
    const skillOrder = ['reading','listening','writing','speaking'];
    _statsTrendSkill = skillOrder.find(sk =>
      _statsData.per_assignment.some(a => a.skill === sk)
    ) || 'reading';
    renderStatsTab(container, _statsData);
    container.dataset.loadedFor = classId;
  } catch (e) {
    container.innerHTML = `<div class="empty-state" style="padding:40px"><p>Lỗi tải thống kê: ${escapeHtml(e.error || e.message)}</p></div>`;
  }
}

function applyStatsFilter() {
  const container = document.getElementById('tab-stats');
  if (!container || !_statsData) return;
  renderStatsTab(container, _statsData);
  container.dataset.loadedFor = _cachedCls?.id || '';
}
window.applyStatsFilter = applyStatsFilter;

function toggleClosedAssignsExpanded() {
  _closedAssignsExpanded = !_closedAssignsExpanded;
  applyStatsFilter();
}
window.toggleClosedAssignsExpanded = toggleClosedAssignsExpanded;

function setClosedAssignsSearch(val) {
  _closedAssignsSearch = val.toLowerCase().trim();
  _closedAssignsExpanded = true;
  applyStatsFilter();
}
window.setClosedAssignsSearch = setClosedAssignsSearch;

function sortStudentTable(col) {
  if (_statsSortCol === col) {
    _statsSortDir = _statsSortDir === 'asc' ? 'desc' : 'asc';
  } else {
    _statsSortCol = col;
    _statsSortDir = col === 'name' ? 'asc' : 'desc';
  }
  applyStatsFilter();
}
window.sortStudentTable = sortStudentTable;

function sortAssignTable(col) {
  if (_assignTableSortCol === col) {
    _assignTableSortDir = _assignTableSortDir === 'asc' ? 'desc' : 'asc';
  } else {
    _assignTableSortCol = col;
    _assignTableSortDir = col === 'title' || col === 'skill' ? 'asc' : 'desc';
  }
  applyStatsFilter();
}
window.sortAssignTable = sortAssignTable;

function toggleTrendStudent(studentId) {
  const btn = document.querySelector(`.stats-student-toggle[data-sid="${studentId}"]`);
  if (!btn) return;
  btn.classList.toggle('active');
  const chart = _statsCharts.find(c => c.canvas?.id === 'chart-trend');
  if (!chart) return;
  const idx = chart.data.datasets.findIndex(d => d._studentId === studentId);
  if (idx !== -1) {
    chart.setDatasetVisibility(idx, btn.classList.contains('active'));
    chart.update();
  }
}
window.toggleTrendStudent = toggleTrendStudent;

function filterTrendSkill(skill) {
  _statsTrendSkill = skill;
  document.querySelectorAll('.trend-skill-pill').forEach(b => {
    b.classList.toggle('active', b.dataset.skill === skill);
  });
  rebuildTrendChart();
}
window.filterTrendSkill = filterTrendSkill;

function rebuildTrendChart() {
  const chart = _statsCharts.find(c => c.canvas?.id === 'chart-trend');
  if (!chart || !_statsData) return;

  const { per_student, per_assignment } = _statsData;
  const skill = _statsTrendSkill;

  // Assignments in chronological order, filtered by selected skill
  const chronoAssigns = [...per_assignment].reverse().filter(a => {
    if (skill && a.skill !== skill) return false;
    if (_statsModeFilter && a.mode !== _statsModeFilter) return false;
    if (_statsScaleFilter && (a.scoring_scale || '10') !== _statsScaleFilter) return false;
    return true;
  });

  const emptyEl = document.getElementById('trend-empty-msg');
  const canvasEl = document.getElementById('chart-trend');

  if (chronoAssigns.length < 1) {
    if (canvasEl) canvasEl.style.display = 'none';
    if (emptyEl) emptyEl.style.display = '';
    return;
  }
  if (canvasEl) canvasEl.style.display = '';
  if (emptyEl) emptyEl.style.display = 'none';

  chart.data.labels = chronoAssigns.map(a => a.title.length > 18 ? a.title.slice(0, 16) + '…' : a.title);
  chart.data.datasets.forEach(dataset => {
    const student = per_student.find(st => st.id === dataset._studentId);
    if (!student) { dataset.data = []; return; }
    dataset.data = chronoAssigns.map(a => {
      const sub = student.submissions
        .filter(s => s.assignment_id === a.id)
        .sort((x, y) => (y.attempt_number || 1) - (x.attempt_number || 1))[0];
      return (sub && sub.overall_score !== null) ? Number(sub.overall_score) : null;
    });
  });
  chart.update();
}
window.rebuildTrendChart = rebuildTrendChart;

function showHistogramStudents(bucketIdx) {
  const ranges = [[0,2],[2,4],[4,6],[6,8],[8,10]];
  const labels = ['0 – 2','2 – 4','4 – 6','6 – 8','8 – 9'];
  const [lo, hi] = ranges[bucketIdx] || [0,10];
  const panel = document.getElementById('stats-hist-detail');
  if (!panel) return;
  const matching = _statsAllScoredSubs.filter(s => {
    const sc = Number(s.overall_score);
    return sc >= lo && sc < hi;
  });
  if (matching.length === 0) { panel.style.display = 'none'; return; }
  panel.style.display = '';
  panel.innerHTML = `
    <div class="stats-hist-detail-header">
      Điểm <strong>${labels[bucketIdx]}</strong> — ${matching.length} bài
      <button onclick="document.getElementById('stats-hist-detail').style.display='none'"
        style="float:right;background:none;border:none;cursor:pointer;color:var(--gray-400);font-size:16px" aria-label="Đóng">✕</button>
    </div>
    <div class="stats-hist-detail-list">
      ${matching.map(s => `
        <div class="stats-hist-detail-item">
          <span class="student-avatar" style="width:22px;height:22px;font-size:10px;flex-shrink:0">
            ${escapeHtml(s.student_name.charAt(0).toUpperCase())}
          </span>
          <span style="font-weight:500">${escapeHtml(s.student_name)}</span>
          <span style="color:var(--gray-400);font-size:12px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
            ${escapeHtml(s.assignment_title)}
          </span>
          <span class="stats-score-badge" style="margin-left:8px;flex-shrink:0">
            ${Number(s.overall_score).toFixed(1)}
          </span>
        </div>`).join('')}
    </div>`;
}
window.showHistogramStudents = showHistogramStudents;

function renderStatsTab(container, data) {
  destroyStatsCharts();
  const { timeline, per_student, per_assignment } = data;

  const sf = _statsSkillFilter;
  const stf = _statsStatusFilter;
  const mf = _statsModeFilter;
  const scf = _statsScaleFilter;

  // Filter assignments by all active filters
  const filteredAssignments = per_assignment.filter(a => {
    if (sf && a.skill !== sf) return false;
    if (stf === 'active' && !a.is_active) return false;
    if (stf === 'closed' && a.is_active) return false;
    if (mf && a.mode !== mf) return false;
    if (scf && (a.scoring_scale || '10') !== scf) return false;
    return true;
  });
  const filteredAssignmentIds = new Set(filteredAssignments.map(a => a.id));

  // Recompute all stats from filtered data
  const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  const totalStudents = per_student.length;
  const totalAssignments = filteredAssignments.length;
  const activeAssignments = filteredAssignments.filter(a => a.is_active).length;
  const closedAssignmentsCount = totalAssignments - activeAssignments;

  // Deduplicate: keep only latest attempt per (student, assignment)
  const latestSubMap = new Map();
  per_student.forEach(st => {
    st.submissions.forEach(s => {
      if (!filteredAssignmentIds.has(s.assignment_id)) return;
      const key = `${st.id || st.student_id}:${s.assignment_id}`;
      const existing = latestSubMap.get(key);
      if (!existing || (s.attempt_number || 1) > (existing.attempt_number || 1)) {
        latestSubMap.set(key, { ...s, student_name: st.name });
      }
    });
  });
  const allFilteredSubs = Array.from(latestSubMap.values());
  const filteredScoredSubs = allFilteredSubs.filter(s => s.overall_score !== null);
  _statsAllScoredSubs = filteredScoredSubs;

  const avgScore = avg(filteredScoredSubs.map(s => Number(s.overall_score)));
  const maxPossible = totalAssignments * totalStudents;
  const submissionRate = maxPossible > 0 ? Math.round(allFilteredSubs.length / maxPossible * 100) : 0;

  const distribution = [0, 0, 0, 0, 0];
  for (const sub of filteredScoredSubs) {
    const score = Number(sub.overall_score);
    const idx = score >= 9 ? 4 : Math.min(4, Math.floor(score / 2));
    distribution[idx]++;
  }

  const skillKeys = ['reading', 'listening', 'writing', 'speaking'];
  const scoreBySkill = {};
  const completionBySkill = {};
  for (const skill of skillKeys) {
    const skillSubs = filteredScoredSubs.filter(s => s.skill === skill);
    scoreBySkill[skill] = avg(skillSubs.map(s => Number(s.overall_score)));
    const skillAssigns = filteredAssignments.filter(a => a.skill === skill);
    const allSkillSubs = allFilteredSubs.filter(s => s.skill === skill);
    const maxPoss = skillAssigns.length * totalStudents;
    completionBySkill[skill] = {
      count: skillAssigns.length,
      submitted: allSkillSubs.length,
      pct: maxPoss > 0 ? Math.round(allSkillSubs.length / maxPoss * 100) : 0,
    };
  }

  // Build per-student display rows (recomputed from filtered submissions)
  let displayStudents = per_student.map(st => {
    const stSubs = st.submissions.filter(s => filteredAssignmentIds.has(s.assignment_id));
    // Deduplicate stSubs: latest attempt per assignment
    const latestStSubMap = new Map();
    stSubs.forEach(s => {
      const existing = latestStSubMap.get(s.assignment_id);
      if (!existing || (s.attempt_number || 1) > (existing.attempt_number || 1)) {
        latestStSubMap.set(s.assignment_id, s);
      }
    });
    const dedupedStSubs = Array.from(latestStSubMap.values());
    const stScored = dedupedStSubs.filter(s => s.overall_score !== null);
    const skillAvg = skill => avg(stScored.filter(s => s.skill === skill).map(s => Number(s.overall_score)));
    const closedSubs = dedupedStSubs.filter(s => !s.is_active && s.deadline);
    const onTimeCount = closedSubs.filter(s => s.on_time).length;
    return {
      ...st,
      submitted: dedupedStSubs.length,
      total: totalAssignments,
      avg_score: sf ? skillAvg(sf) : avg(stScored.map(s => Number(s.overall_score))),
      avg_reading: skillAvg('reading'),
      avg_listening: skillAvg('listening'),
      avg_writing: skillAvg('writing'),
      avg_speaking: skillAvg('speaking'),
      on_time: onTimeCount,
      closed_total: closedSubs.length,
      on_time_rate: closedSubs.length > 0 ? onTimeCount / closedSubs.length : null,
    };
  });

  // Apply sort
  if (_statsSortCol) {
    displayStudents = [...displayStudents].sort((a, b) => {
      let av = a[_statsSortCol], bv = b[_statsSortCol];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === 'string') return _statsSortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return _statsSortDir === 'asc' ? av - bv : bv - av;
    });
  }

  const scoreNum = v => (v !== null && v !== undefined) ? Number(v).toFixed(1) : '—';
  const pct = (a, b) => b > 0 ? Math.round(a / b * 100) : 0;
  const sortIcon = col => {
    if (_statsSortCol !== col) return '<span class="sort-icon">↕</span>';
    return `<span class="sort-icon active">${_statsSortDir === 'asc' ? '↑' : '↓'}</span>`;
  };

  const skillColors = {
    reading: '#3b82f6', listening: '#f59e0b', writing: '#8b5cf6', speaking: '#22c55e',
  };
  const studentPalette = ['#3b82f6','#ef4444','#22c55e','#f59e0b','#8b5cf6','#06b6d4','#ec4899','#14b8a6','#f97316','#a3e635'];
  const skillLabels = { reading: 'Reading', listening: 'Listening', writing: 'Writing', speaking: 'Speaking', composite: 'Tổng hợp' };

  // Overview cards
  const cardsHtml = `
    <div class="stats-cards-grid">
      <div class="stats-card">
        <div class="stats-card-icon" style="background:#e0f2fe;color:#0284c7">👥</div>
        <div class="stats-card-body">
          <div class="stats-card-value">${totalStudents}</div>
          <div class="stats-card-label">Học sinh</div>
        </div>
      </div>
      <div class="stats-card">
        <div class="stats-card-icon" style="background:#dcfce7;color:#16a34a">📋</div>
        <div class="stats-card-body">
          <div class="stats-card-value">${totalAssignments}</div>
          <div class="stats-card-label">${activeAssignments} đang mở · ${closedAssignmentsCount} đã đóng</div>
        </div>
      </div>
      <div class="stats-card">
        <div class="stats-card-icon" style="background:#fef9c3;color:#ca8a04">📊</div>
        <div class="stats-card-body">
          <div class="stats-card-value">${submissionRate}%</div>
          <div class="stats-card-label">${allFilteredSubs.length} / ${maxPossible} lượt nộp</div>
        </div>
      </div>
      <div class="stats-card">
        <div class="stats-card-icon" style="background:var(--primary-lt);color:var(--primary)">🎯</div>
        <div class="stats-card-body">
          <div class="stats-card-value">${avgScore !== null ? Number(avgScore).toFixed(2) : '—'}</div>
          <div class="stats-card-label">Điểm TB lớp (${filteredScoredSubs.length} bài đã chấm)</div>
        </div>
      </div>
    </div>`;

  // Skill completion bars
  const skillCompHtml = `
    <div class="stats-section-card">
      <div class="stats-section-title">Tỷ lệ nộp bài theo kỹ năng</div>
      <div class="stats-skill-chart">
        ${['reading','listening','writing','speaking'].map(skill => {
          const c = completionBySkill[skill];
          if (!c || c.count === 0) return '';
          return `<div class="stats-skill-row">
            <div class="stats-skill-label">${skillBadge(skill)}</div>
            <div class="stats-bar-wrap">
              <div class="stats-bar-fill" style="width:${c.pct}%;background:${skillColors[skill]}"></div>
            </div>
            <div class="stats-pct">${c.pct}% &nbsp;<span style="color:var(--gray-400)">(${c.submitted}/${c.count * totalStudents} nộp)</span></div>
          </div>`;
        }).join('')}
      </div>
    </div>`;

  // Chart: avg score by skill
  const skillScoreChartHtml = `
    <div class="stats-section-card stats-chart-card">
      <div class="stats-section-title">Điểm TB theo kỹ năng</div>
      <canvas id="chart-skill-score" height="200"></canvas>
    </div>`;

  // Chart: score distribution with click-to-drill-down
  const scoreDistChartHtml = `
    <div class="stats-section-card stats-chart-card">
      <div class="stats-section-title">
        Phân bổ điểm (${filteredScoredSubs.length} bài chấm)
        <span style="font-size:11px;font-weight:400;color:var(--gray-400);margin-left:6px">Click vào cột để xem chi tiết</span>
      </div>
      <canvas id="chart-score-dist" height="200" style="cursor:pointer"></canvas>
      <div id="stats-hist-detail" style="display:none;margin-top:12px"></div>
    </div>`;

  // Chart: timeline
  const timelineChartHtml = timeline.length < 2 ? '' : `
    <div class="stats-section-card">
      <div class="stats-section-title">Xu hướng nộp bài theo tuần</div>
      <canvas id="chart-timeline" height="100"></canvas>
    </div>`;

  // Chart: on-time stacked bar (closed assignments only)
  const closedAssigns = filteredAssignments.filter(a => !a.is_active && a.deadline);
  const closedSearched = _closedAssignsSearch
    ? closedAssigns.filter(a => a.title.toLowerCase().includes(_closedAssignsSearch))
    : closedAssigns;
  const CLOSED_PREVIEW = 3;
  const displayedClosedAssigns = _closedAssignsExpanded ? closedSearched : closedSearched.slice(0, CLOSED_PREVIEW);
  const closedHiddenCount = closedSearched.length - displayedClosedAssigns.length;
  const onTimeChartHtml = closedAssigns.length === 0 ? '' : `
    <div class="stats-section-card">
      <div class="stats-section-title">Đúng hạn / muộn / chưa nộp (bài đã đóng)</div>
      <div class="stats-closed-controls">
        <input class="stats-closed-search" type="text" placeholder="🔍 Tìm bài tập..."
          value="${escapeHtml(_closedAssignsSearch)}"
          oninput="setClosedAssignsSearch(this.value)" />
      </div>
      ${closedSearched.length === 0
        ? '<p style="color:var(--gray-400);font-size:13px;padding:8px 0 4px">Không tìm thấy bài tập phù hợp</p>'
        : `<canvas id="chart-ontime" height="${Math.max(80, displayedClosedAssigns.length * 38)}"></canvas>`}
      ${closedSearched.length > CLOSED_PREVIEW ? `
        <button class="stats-closed-toggle-btn" onclick="toggleClosedAssignsExpanded()">
          ${_closedAssignsExpanded
            ? '▲ Thu gọn'
            : `▼ Xem thêm ${closedHiddenCount} bài tập`}
        </button>` : ''}
    </div>`;

  // Chart: student score trend (multi-line, per-student + skill filters)
  const hasTrendData = filteredScoredSubs.length >= 1;
  const trendChartHtml = !hasTrendData ? '' : `
    <div class="stats-section-card">
      <div class="stats-trend-header">
        <div class="stats-section-title" style="margin-bottom:0">Xu hướng điểm từng học sinh</div>
      </div>
      <div class="stats-trend-filters">
        <div class="stats-filter-group">
          <span class="stats-filter-label">Kỹ năng:</span>
          <div class="stats-filter-pills">
            ${[['reading', 'Reading'], ['listening', 'Listening'], ['writing', 'Writing'], ['speaking', 'Speaking']].map(([v, l]) => `
              <button class="stats-filter-pill trend-skill-pill${_statsTrendSkill === v ? ' active' : ''}"
                data-skill="${v}" onclick="filterTrendSkill('${v}')">
                ${l}
              </button>`).join('')}
          </div>
        </div>
      </div>
      <div class="stats-filter-group" style="margin-bottom:12px">
        <span class="stats-filter-label">Học sinh:</span>
        <div class="stats-student-toggles" id="stats-trend-toggles" style="margin-bottom:0">
          ${per_student.map((st, i) => `
            <button class="stats-student-toggle active"
              data-sid="${st.id}"
              style="--sc:${studentPalette[i % studentPalette.length]}"
              onclick="toggleTrendStudent('${st.id}')">
              ${escapeHtml(st.name)}
            </button>`).join('')}
        </div>
      </div>
      <div id="trend-empty-msg" style="display:none;color:var(--gray-400);font-size:13px;padding:20px 0">
        Không có dữ liệu cho kỹ năng này
      </div>
      <canvas id="chart-trend" height="120"></canvas>
    </div>`;

  // Filter bar with Refresh button
  const filterHtml = `
    <div class="stats-filter-bar">
      <div class="stats-filter-group">
        <span class="stats-filter-label">Loại bài:</span>
        <div class="stats-filter-pills">
          ${[['ielts', '🎯 IELTS Test'], ['10', '📊 Practice Test'], ['composite', '🧩 Mixed Skills']].map(([v, l]) => `
            <button class="stats-filter-pill${_statsScaleFilter === v ? ' active' : ''}"
              onclick="_statsScaleFilter='${v}';applyStatsFilter()">
              ${l}
            </button>`).join('')}
        </div>
      </div>
      <div class="stats-filter-group">
        <span class="stats-filter-label">Kỹ năng:</span>
        <div class="stats-filter-pills">
          ${['', ...FILTERABLE_ASSIGNMENT_SKILLS].map(sk => `
            <button class="stats-filter-pill${_statsSkillFilter === sk ? ' active' : ''}"
              onclick="_statsSkillFilter='${sk}';applyStatsFilter()">
              ${sk ? skillLabels[sk] : 'Tất cả'}
            </button>`).join('')}
        </div>
      </div>
      <div class="stats-filter-group">
        <span class="stats-filter-label">Bài tập:</span>
        <div class="stats-filter-pills">
          ${[['', 'Tất cả'], ['active', 'Đang mở'], ['closed', 'Đã đóng']].map(([v, l]) => `
            <button class="stats-filter-pill${_statsStatusFilter === v ? ' active' : ''}"
              onclick="_statsStatusFilter='${v}';applyStatsFilter()">
              ${l}
            </button>`).join('')}
        </div>
      </div>
      <div class="stats-filter-group">
        <span class="stats-filter-label">Chế độ:</span>
        <div class="stats-filter-pills">
          ${[['', 'Tất cả'], ['exam', '📝 Kiểm tra'], ['practice', '🎧 Luyện tập']].map(([v, l]) => `
            <button class="stats-filter-pill${_statsModeFilter === v ? ' active' : ''}"
              onclick="_statsModeFilter='${v}';applyStatsFilter()">
              ${l}
            </button>`).join('')}
        </div>
      </div>
      <button class="btn btn-sm btn-outline stats-refresh-btn" onclick="refreshStatsTab()" title="Tải lại dữ liệu thống kê">
        ↻ Làm mới
      </button>
    </div>`;

  // Per-student table with sortable headers
  const colCount = !sf ? 8 : 5;
  const studentTableHtml = `
    <div class="stats-section-card">
      <div class="stats-section-title">Tiến độ từng học sinh</div>
      ${displayStudents.length === 0
        ? '<div class="empty-state" style="padding:20px">Không có dữ liệu</div>'
        : `<div class="table-wrap">
          <table class="stats-table">
            <thead><tr>
              <th class="sortable" onclick="sortStudentTable('name')">Học sinh ${sortIcon('name')}</th>
              <th class="sortable" onclick="sortStudentTable('submitted')">Đã nộp ${sortIcon('submitted')}</th>
              <th class="sortable" onclick="sortStudentTable('avg_score')">Điểm TB ${sortIcon('avg_score')}</th>
              ${!sf ? `
                <th class="sortable" style="color:#3b82f6" onclick="sortStudentTable('avg_reading')">Reading ${sortIcon('avg_reading')}</th>
                <th class="sortable" style="color:#f59e0b" onclick="sortStudentTable('avg_listening')">Listening ${sortIcon('avg_listening')}</th>
                <th class="sortable" style="color:#8b5cf6" onclick="sortStudentTable('avg_writing')">Writing ${sortIcon('avg_writing')}</th>
                <th class="sortable" style="color:#22c55e" onclick="sortStudentTable('avg_speaking')">Speaking ${sortIcon('avg_speaking')}</th>` : ''}
              <th class="sortable" onclick="sortStudentTable('on_time_rate')">Đúng hạn ${sortIcon('on_time_rate')}</th>
              <th></th>
            </tr></thead>
            <tbody>
              ${displayStudents.map(st => {
                const submittedPct = pct(st.submitted, st.total);
                const ontimePct = st.on_time_rate !== null ? Math.round(st.on_time_rate * 100) : null;
                return `<tr>
                  <td><span class="student-avatar">${escapeHtml(st.name.charAt(0).toUpperCase())}</span> ${escapeHtml(st.name)}</td>
                  <td>
                    <div class="stats-mini-bar-wrap">
                      <div class="stats-mini-bar" style="width:${submittedPct}%"></div>
                    </div>
                    <span class="stats-mini-label">${st.submitted}/${st.total}</span>
                  </td>
                  <td><span class="stats-score-badge">${scoreNum(st.avg_score)}</span></td>
                  ${!sf ? `
                    <td style="color:#3b82f6">${scoreNum(st.avg_reading)}</td>
                    <td style="color:#f59e0b">${scoreNum(st.avg_listening)}</td>
                    <td style="color:#8b5cf6">${scoreNum(st.avg_writing)}</td>
                    <td style="color:#22c55e">${scoreNum(st.avg_speaking)}</td>` : ''}
                  <td>${ontimePct !== null
                    ? `<span class="stats-ontime-pill ${ontimePct >= 80 ? 'good' : ontimePct >= 50 ? 'mid' : 'bad'}">${ontimePct}%</span>`
                    : '<span style="color:var(--gray-400)">—</span>'}</td>
                  <td>
                    <button class="btn btn-sm btn-outline" onclick="toggleStudentStatsRow('${st.id}')">Chi tiết</button>
                  </td>
                </tr>
                <tr id="stats-row-${st.id}" style="display:none">
                  <td colspan="${colCount}" style="padding:0">
                    <div class="stats-expand-body">
                      <table class="stats-sub-table">
                            <thead id="stats-sub-thead-${st.id}"><tr>
                              <th class="sortable" onclick="sortStatsSubTable('${st.id}','title')">Bài tập ${makeSortIcon('title',_statsSubSortCol,_statsSubSortDir)}</th>
                              <th class="sortable" onclick="sortStatsSubTable('${st.id}','skill')">Kỹ năng ${makeSortIcon('skill',_statsSubSortCol,_statsSubSortDir)}</th>
                              <th class="sortable" onclick="sortStatsSubTable('${st.id}','score')">Điểm ${makeSortIcon('score',_statsSubSortCol,_statsSubSortDir)}</th>
                              <th class="sortable" onclick="sortStatsSubTable('${st.id}','submitted_at')">Ngày nộp ${makeSortIcon('submitted_at',_statsSubSortCol,_statsSubSortDir)}</th>
                              <th class="sortable" onclick="sortStatsSubTable('${st.id}','on_time')">Đúng hạn ${makeSortIcon('on_time',_statsSubSortCol,_statsSubSortDir)}</th>
                              <th>Overtime</th>
                            </tr></thead>
                            <tbody id="stats-sub-tbody-${st.id}">${buildStatsSubRows(st.submissions.filter(s => filteredAssignmentIds.has(s.assignment_id)))}</tbody>
                          </table>
                    </div>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>`}
    </div>`;

  // Per-assignment table — sortable
  const atsi = col => makeSortIcon(col, _assignTableSortCol, _assignTableSortDir);
  const sortedAssignments = [...filteredAssignments];
  if (_assignTableSortCol) {
    sortedAssignments.sort((a, b) => {
      let va, vb;
      switch (_assignTableSortCol) {
        case 'title':         va = a.title.toLowerCase(); vb = b.title.toLowerCase(); break;
        case 'skill':         va = a.skill || ''; vb = b.skill || ''; break;
        case 'mode':          va = a.mode || ''; vb = b.mode || ''; break;
        case 'submitted_rate': va = a.total ? a.submitted / a.total : 0; vb = b.total ? b.submitted / b.total : 0; break;
        case 'avg_score':     va = a.avg_score ?? -1; vb = b.avg_score ?? -1; break;
        case 'on_time':       va = a.on_time ?? -1; vb = b.on_time ?? -1; break;
        case 'late':          va = a.late ?? -1; vb = b.late ?? -1; break;
        case 'missing':       va = a.missing ?? -1; vb = b.missing ?? -1; break;
        case 'is_active':     va = a.is_active ? 1 : 0; vb = b.is_active ? 1 : 0; break;
        default: return 0;
      }
      if (va < vb) return _assignTableSortDir === 'asc' ? -1 : 1;
      if (va > vb) return _assignTableSortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }
  const assignTableHtml = `
    <div class="stats-section-card">
      <div class="stats-section-title">Chi tiết từng bài tập</div>
      ${filteredAssignments.length === 0
        ? '<div class="empty-state" style="padding:20px">Không có bài tập phù hợp</div>'
        : `<div class="table-wrap">
          <table class="stats-table">
            <thead><tr>
              <th class="sortable" onclick="sortAssignTable('skill')">Kỹ năng ${atsi('skill')}</th>
              <th class="sortable" onclick="sortAssignTable('title')">Tên bài tập ${atsi('title')}</th>
              <th class="sortable" onclick="sortAssignTable('mode')">Chế độ ${atsi('mode')}</th>
              <th>Thời gian</th>
              <th class="sortable" onclick="sortAssignTable('submitted_rate')">Tỷ lệ nộp ${atsi('submitted_rate')}</th>
              <th class="sortable" onclick="sortAssignTable('avg_score')">Điểm TB ${atsi('avg_score')}</th>
              <th class="sortable" onclick="sortAssignTable('on_time')">Đúng hạn ${atsi('on_time')}</th>
              <th class="sortable" onclick="sortAssignTable('late')">Muộn ${atsi('late')}</th>
              <th class="sortable" onclick="sortAssignTable('missing')">Chưa nộp ${atsi('missing')}</th>
              <th class="sortable" onclick="sortAssignTable('is_active')">Trạng thái ${atsi('is_active')}</th>
            </tr></thead>
            <tbody>
              ${sortedAssignments.map(a => {
                const submittedPct = pct(a.submitted, a.total);
                return `<tr>
                  <td>${skillBadge(a.skill)}</td>
                  <td style="font-weight:600">${escapeHtml(a.title)}</td>
                  <td>${a.mode === 'practice' ? '<span class="stats-mode-chip practice">🎧 Luyện tập</span>' : '<span class="stats-mode-chip exam">📝 Kiểm tra</span>'}</td>
                  <td>${a.time_limit_minutes ? `${a.time_limit_minutes} phút` : '<span style="color:var(--text-muted)">—</span>'}</td>
                  <td>
                    <div class="stats-mini-bar-wrap">
                      <div class="stats-mini-bar" style="width:${submittedPct}%"></div>
                    </div>
                    <span class="stats-mini-label">${a.submitted}/${a.total}</span>
                  </td>
                  <td><span class="stats-score-badge">${scoreNum(a.avg_score)}</span></td>
                  <td>${!a.is_active && a.deadline ? `<span style="color:var(--success)">${a.on_time}</span>` : '—'}</td>
                  <td>${!a.is_active && a.deadline ? `<span style="color:var(--accent)">${a.late}</span>` : '—'}</td>
                  <td>${a.missing !== null ? `<span style="color:var(--danger)">${a.missing}</span>` : '—'}</td>
                  <td>${a.is_active
                    ? '<span class="badge badge-success">Đang mở</span>'
                    : '<span class="badge badge-gray">Đã đóng</span>'}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>`}
    </div>`;

  container.innerHTML = `
    ${filterHtml}
    ${cardsHtml}
    <div class="stats-charts-row">
      ${skillScoreChartHtml}
      ${scoreDistChartHtml}
    </div>
    ${trendChartHtml}
    ${timelineChartHtml}
    ${onTimeChartHtml}
    ${skillCompHtml}
    ${studentTableHtml}
    ${assignTableHtml}`;

  // Initialize all charts
  requestAnimationFrame(() => {
    // Chart 1: Skill score horizontal bar
    const skillScoreCanvas = document.getElementById('chart-skill-score');
    if (skillScoreCanvas) {
      const skillsWithScore = ['reading','listening','writing','speaking'].filter(sk => scoreBySkill[sk] !== null);
      if (skillsWithScore.length > 0) {
        const chart = new Chart(skillScoreCanvas.getContext('2d'), {
          type: 'bar',
          data: {
            labels: skillsWithScore.map(sk => skillLabels[sk]),
            datasets: [{
              data: skillsWithScore.map(sk => Number(scoreBySkill[sk]).toFixed(2)),
              backgroundColor: skillsWithScore.map(sk => skillColors[sk] + 'cc'),
              borderColor: skillsWithScore.map(sk => skillColors[sk]),
              borderWidth: 1, borderRadius: 6,
            }],
          },
          options: {
            indexAxis: 'y', responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              x: { min: 0, max: 9, grid: { color: '#f3f4f6' }, ticks: { font: { size: 11 } } },
              y: { ticks: { font: { size: 12 } } },
            },
          },
        });
        _statsCharts.push(chart);
      } else {
        skillScoreCanvas.insertAdjacentHTML('afterend', '<p style="color:var(--gray-400);font-size:13px;padding:20px 0">Chưa có dữ liệu điểm</p>');
        skillScoreCanvas.remove();
      }
    }

    // Chart 2: Score distribution — clickable bars
    const distCanvas = document.getElementById('chart-score-dist');
    if (distCanvas) {
      const total = distribution.reduce((a, b) => a + b, 0);
      if (total > 0) {
        const chart = new Chart(distCanvas.getContext('2d'), {
          type: 'bar',
          data: {
            labels: ['0 – 2','2 – 4','4 – 6','6 – 8','8 – 9'],
            datasets: [{
              label: 'Số bài',
              data: distribution,
              backgroundColor: ['#fca5a5','#fcd34d','#86efac','#67e8f9','#6ee7b7'],
              hoverBackgroundColor: ['#f87171','#fbbf24','#4ade80','#22d3ee','#34d399'],
              borderRadius: 6,
            }],
          },
          options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } }, grid: { color: '#f3f4f6' } },
              x: { ticks: { font: { size: 11 } } },
            },
            onClick: (_, elements) => {
              if (elements.length) showHistogramStudents(elements[0].index);
            },
            onHover: (e, elements) => {
              e.native.target.style.cursor = elements.length ? 'pointer' : 'default';
            },
          },
        });
        _statsCharts.push(chart);
      } else {
        distCanvas.insertAdjacentHTML('afterend', '<p style="color:var(--gray-400);font-size:13px;padding:20px 0">Chưa có bài nào được chấm điểm</p>');
        distCanvas.remove();
      }
    }

    // Chart 3: Student score trend (multi-line, per-student + skill filter)
    const trendCanvas = document.getElementById('chart-trend');
    if (trendCanvas) {
      // Initial render uses _statsTrendSkill (default: '' = all skills)
      const initAssigns = [...per_assignment].reverse().filter(a => {
        if (_statsTrendSkill && a.skill !== _statsTrendSkill) return false;
        if (_statsModeFilter && a.mode !== _statsModeFilter) return false;
        if (_statsScaleFilter && (a.scoring_scale || '10') !== _statsScaleFilter) return false;
        return true;
      });
      const trendLabels = initAssigns.map(a => a.title.length > 18 ? a.title.slice(0,16) + '…' : a.title);
      const datasets = per_student.map((st, i) => {
        const color = studentPalette[i % studentPalette.length];
        return {
          label: st.name,
          _studentId: st.id,
          data: initAssigns.map(a => {
            const sub = st.submissions.find(s => s.assignment_id === a.id);
            return (sub && sub.overall_score !== null) ? Number(sub.overall_score) : null;
          }),
          borderColor: color,
          backgroundColor: color + '22',
          borderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          fill: false,
          tension: 0.3,
          spanGaps: true,
        };
      });

      if (initAssigns.length < 1) {
        trendCanvas.style.display = 'none';
        const emptyEl = document.getElementById('trend-empty-msg');
        if (emptyEl) emptyEl.style.display = '';
      }

      const chart = new Chart(trendCanvas.getContext('2d'), {
        type: 'line',
        data: { labels: trendLabels, datasets },
        options: {
          responsive: true,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              filter: item => item.raw !== null,
              callbacks: {
                title: items => items[0]?.label || '',
                label: item => ` ${item.dataset.label}: ${item.raw !== null ? Number(item.raw).toFixed(1) : '—'}`,
              },
            },
          },
          scales: {
            y: { min: 0, max: 9, ticks: { font: { size: 11 } }, grid: { color: '#f3f4f6' } },
            x: { ticks: { font: { size: 10 }, maxRotation: 30 } },
          },
        },
      });
      _statsCharts.push(chart);
    }

    // Chart 4: Timeline line
    const timelineCanvas = document.getElementById('chart-timeline');
    if (timelineCanvas && timeline.length >= 2) {
      const chart = new Chart(timelineCanvas.getContext('2d'), {
        type: 'line',
        data: {
          labels: timeline.map(t => { const d = new Date(t.week); return `${d.getDate()}/${d.getMonth()+1}`; }),
          datasets: [{
            label: 'Lượt nộp',
            data: timeline.map(t => t.count),
            borderColor: '#0f766e', backgroundColor: '#0f766e22',
            borderWidth: 2, pointRadius: 4, fill: true, tension: 0.3,
          }],
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } }, grid: { color: '#f3f4f6' } },
            x: { ticks: { font: { size: 11 } } },
          },
        },
      });
      _statsCharts.push(chart);
    }

    // Chart 5: On-time stacked horizontal bar
    const ontimeCanvas = document.getElementById('chart-ontime');
    if (ontimeCanvas && displayedClosedAssigns.length > 0) {
      const chart = new Chart(ontimeCanvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels: displayedClosedAssigns.map(a => a.title.length > 22 ? a.title.slice(0,20) + '…' : a.title),
          datasets: [
            { label: 'Đúng hạn', data: displayedClosedAssigns.map(a => a.on_time), backgroundColor: '#86efac', borderRadius: 4 },
            { label: 'Nộp muộn', data: displayedClosedAssigns.map(a => a.late), backgroundColor: '#fcd34d', borderRadius: 4 },
            { label: 'Chưa nộp', data: displayedClosedAssigns.map(a => a.missing || 0), backgroundColor: '#fca5a5', borderRadius: 4 },
          ],
        },
        options: {
          indexAxis: 'y', responsive: true,
          plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } },
          scales: {
            x: { stacked: true, ticks: { stepSize: 1, font: { size: 11 } }, grid: { color: '#f3f4f6' } },
            y: { stacked: true, ticks: { font: { size: 11 } } },
          },
        },
      });
      _statsCharts.push(chart);
    }
  });
}

function toggleStudentStatsRow(studentId) {
  const row = document.getElementById(`stats-row-${studentId}`);
  if (!row) return;
  row.style.display = row.style.display === 'none' ? '' : 'none';
}
window.toggleStudentStatsRow = toggleStudentStatsRow;

function buildStatsSubRows(subs) {
  if (subs.length === 0) return `<tr><td colspan="5" style="color:var(--gray-400);padding:12px">Chưa nộp bài nào</td></tr>`;
  const sorted = _statsSubSortCol ? [...subs].sort((a, b) => {
    let va, vb;
    if (_statsSubSortCol === 'title')       { va = (a.assignment_title||'').toLowerCase(); vb = (b.assignment_title||'').toLowerCase(); }
    else if (_statsSubSortCol === 'skill')  { va = a.skill||''; vb = b.skill||''; }
    else if (_statsSubSortCol === 'score')  { va = a.overall_score ?? -1; vb = b.overall_score ?? -1; }
    else if (_statsSubSortCol === 'submitted_at') { va = a.submitted_at||''; vb = b.submitted_at||''; }
    else if (_statsSubSortCol === 'on_time') { va = a.on_time === null ? -1 : a.on_time ? 1 : 0; vb = b.on_time === null ? -1 : b.on_time ? 1 : 0; }
    else return 0;
    if (va < vb) return _statsSubSortDir === 'asc' ? -1 : 1;
    if (va > vb) return _statsSubSortDir === 'asc' ? 1 : -1;
    return 0;
  }) : subs;
  return sorted.map(s => `<tr>
    <td>${escapeHtml(s.assignment_title)}</td>
    <td>${skillBadge(s.skill)}</td>
    <td><span class="stats-score-badge">${s.overall_score !== null ? Number(s.overall_score).toFixed(1) : '—'}</span></td>
    <td style="color:var(--gray-400);font-size:12px">${formatDate(s.submitted_at)}</td>
    <td>${s.on_time === null ? '—' : s.on_time ? '<span class="stats-ontime-pill good">Đúng hạn</span>' : '<span class="stats-ontime-pill bad">Muộn</span>'}</td>
    <td>${s.is_overtime ? '<span class="stats-overtime-pill">⏰ Overtime</span>' : '—'}</td>
  </tr>`).join('');
}

function sortStatsSubTable(studentId, col) {
  if (_statsSubSortCol === col) {
    _statsSubSortDir = _statsSubSortDir === 'asc' ? 'desc' : 'asc';
  } else {
    _statsSubSortCol = col;
    _statsSubSortDir = col === 'title' || col === 'skill' ? 'asc' : 'desc';
  }
  if (!_statsData) return;
  const st = _statsData.per_student.find(s => s.id === studentId);
  if (!st) return;
  const sf = _statsSkillFilter, stf = _statsStatusFilter, mf = _statsModeFilter;
  const filteredIds = new Set(
    _statsData.per_assignment
      .filter(a => (!sf || a.skill === sf) && (stf !== 'active' || a.is_active) && (stf !== 'closed' || !a.is_active) && (!mf || a.mode === mf))
      .map(a => a.id)
  );
  const subs = st.submissions.filter(s => filteredIds.has(s.assignment_id));
  const tbody = document.getElementById(`stats-sub-tbody-${studentId}`);
  if (tbody) tbody.innerHTML = buildStatsSubRows(subs);
  const thead = document.getElementById(`stats-sub-thead-${studentId}`);
  if (thead) {
    thead.querySelectorAll('th.sortable').forEach(th => {
      const icon = th.querySelector('.sort-icon');
      if (icon) icon.remove();
      const c = th.getAttribute('onclick').match(/'([^']+)'\)$/)?.[1];
      if (c) th.insertAdjacentHTML('beforeend', makeSortIcon(c, _statsSubSortCol, _statsSubSortDir));
    });
  }
}
window.sortStatsSubTable = sortStatsSubTable;

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
        const isComposite = a.skill === 'composite';
        const secBadges = isComposite && Array.isArray(a.composite_sections)
          ? a.composite_sections.map(s => {
              const icons = { reading:'📖', listening:'🎧', writing:'✍️', speaking:'🎤' };
              return `<span class="badge" style="background:var(--surface);border:1px solid var(--border);font-size:10px;padding:1px 5px">${icons[s.skill]||''} ${escapeHtml(s.label)}</span>`;
            }).join(' ')
          : '';
        const submissionsRoute = isComposite ? `/composite/${a.id}` : `/assignment/${a.id}`;
        return `
        <tr>
          <td>${skillBadge(a.skill)}</td>
          <td style="font-weight:600">
            ${escapeHtml(a.title)}
            ${isComposite && secBadges ? `<div style="margin-top:3px;display:flex;flex-wrap:wrap;gap:3px">${secBadges}</div>` : ''}
          </td>
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
                onclick="navigate('${submissionsRoute}')">
                <span class="sub-progress-wrap">
                  <span class="sub-progress-bar" style="width:${pct}%"></span>
                </span>
                📊 ${a.submission_count}/${cls.student_count} nộp
              </button>
              <button class="btn-icon" title="Đổi hạn nộp" aria-label="Đổi hạn nộp"
                onclick="changeDeadline('${a.id}')">📅</button>
              <button class="btn-icon danger" title="Xoá" aria-label="Xoá bài tập"
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
    : buildStudentRows(students, cls.id);

  const statsHtml = `<div class="stats-loading-placeholder" id="stats-loading-placeholder">
      <div class="spinner"></div><p style="margin-top:12px;color:var(--gray-400)">Đang tải thống kê...</p>
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
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary"
          onclick="openAssignModal('${cls.id}', '${clsNameSafe}')">
          + Giao bài mới
        </button>
      </div>
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
          ${FILTERABLE_ASSIGNMENT_SKILLS.map(skill => `
            <button class="assign-skill-pill" data-skill="${skill}" onclick="filterAssignments(null, '${skill}')">${SKILL_LABELS[skill].icon} ${SKILL_LABELS[skill].label}</button>
          `).join('')}
        </div>
      </div>` : ''}
      <div class="table-wrap assign-table-wrap">
        <table>
          <thead><tr>
            <th class="sortable" id="assign-th-skill" onclick="sortAssignList('skill')">Kỹ năng</th>
            <th class="sortable" id="assign-th-title" onclick="sortAssignList('title')">Tên bài tập</th>
            <th>Đề</th>
            <th class="sortable" id="assign-th-deadline" onclick="sortAssignList('deadline')">Hạn nộp</th>
            <th>Mở/Đóng</th><th>Thao tác</th>
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
            <th class="sortable" id="student-th-name" onclick="sortClassStudentsTable('full_name')">Họ tên</th>
            <th class="sortable" id="student-th-username" onclick="sortClassStudentsTable('username')">Username</th>
            <th>Thao tác</th>
          </tr></thead>
          <tbody id="students-tbody">${studentRows}</tbody>
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

  if (_assignListSortCol) {
    filtered.sort((a, b) => {
      let va, vb;
      if (_assignListSortCol === 'skill')     { va = a.skill || '';      vb = b.skill || ''; }
      else if (_assignListSortCol === 'title') { va = a.title.toLowerCase(); vb = b.title.toLowerCase(); }
      else if (_assignListSortCol === 'deadline') { va = a.deadline || ''; vb = b.deadline || ''; }
      else return 0;
      if (va < vb) return _assignListSortDir === 'asc' ? -1 : 1;
      if (va > vb) return _assignListSortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }
  updateAssignListSortIcons();

  tbody.innerHTML = filtered.map(a => {
    const overdue = isOverdue(a.deadline) && a.is_active;
    const pct = cls.student_count > 0 ? Math.round(a.submission_count / cls.student_count * 100) : 0;
    const isComposite = a.skill === 'composite';
    const submissionsRoute = isComposite ? `/composite/${a.id}` : `/assignment/${a.id}`;
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
              onclick="navigate('${submissionsRoute}')">
              <span class="sub-progress-wrap">
                <span class="sub-progress-bar" style="width:${pct}%"></span>
              </span>
              📊 ${a.submission_count}/${cls.student_count} nộp
            </button>
            <button class="btn-icon" title="Đổi hạn nộp" aria-label="Đổi hạn nộp"
              onclick="changeDeadline('${a.id}')">📅</button>
            <button class="btn-icon danger" title="Xoá" aria-label="Xoá bài tập"
              onclick="deleteAssignment('${a.id}', '${cls.id}', this)">🗑</button>
          </div>
        </td>
      </tr>`;
  }).join('');
}
window.filterAssignments = filterAssignments;

function updateAssignListSortIcons() {
  [['assign-th-skill', 'skill'], ['assign-th-title', 'title'], ['assign-th-deadline', 'deadline']].forEach(([id, col]) => {
    const th = document.getElementById(id);
    if (!th) return;
    const existing = th.querySelector('.sort-icon');
    if (existing) existing.remove();
    th.insertAdjacentHTML('beforeend', makeSortIcon(col, _assignListSortCol, _assignListSortDir));
  });
}

function sortAssignList(col) {
  if (_assignListSortCol === col) {
    _assignListSortDir = _assignListSortDir === 'asc' ? 'desc' : 'asc';
  } else {
    _assignListSortCol = col;
    _assignListSortDir = col === 'title' || col === 'skill' ? 'asc' : 'desc';
  }
  filterAssignments(null, null);
}
window.sortAssignList = sortAssignList;

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

function buildStudentRows(students, classId) {
  return students.map(s => `
    <tr data-student-id="${s.id}">
      <td style="width:36px">
        <input type="checkbox" class="student-bulk-check" data-sid="${s.id}"
          onchange="updateBulkBar('${classId}')" />
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
            data-sid="${s.id}" data-sname="${escapeHtml(s.full_name)}"
            onclick="openResetPasswordModal(this.dataset.sid, this.dataset.sname, this)">🔑 Đổi MK</button>
          <button class="btn-icon danger" title="Xoá khỏi lớp này" aria-label="Xoá học sinh khỏi lớp"
            onclick="removeStudentFromClass('${s.id}', '${classId}', this)">🗑</button>
        </div>
      </td>
    </tr>`).join('');
}

function sortClassStudentsTable(col) {
  if (_classStudentsSortCol === col) {
    _classStudentsSortDir = _classStudentsSortDir === 'asc' ? 'desc' : 'asc';
  } else {
    _classStudentsSortCol = col;
    _classStudentsSortDir = 'asc';
  }
  if (!_cachedStudents.length || !_cachedCls) return;
  const sorted = [..._cachedStudents].sort((a, b) => {
    const va = (a[col] || '').toLowerCase();
    const vb = (b[col] || '').toLowerCase();
    if (va < vb) return _classStudentsSortDir === 'asc' ? -1 : 1;
    if (va > vb) return _classStudentsSortDir === 'asc' ? 1 : -1;
    return 0;
  });
  const tbody = document.getElementById('students-tbody');
  if (tbody) tbody.innerHTML = buildStudentRows(sorted, _cachedCls.id);
  [['student-th-name', 'full_name'], ['student-th-username', 'username']].forEach(([id, c]) => {
    const th = document.getElementById(id);
    if (!th) return;
    const existing = th.querySelector('.sort-icon');
    if (existing) existing.remove();
    th.insertAdjacentHTML('beforeend', makeSortIcon(c, _classStudentsSortCol, _classStudentsSortDir));
  });
}
window.sortClassStudentsTable = sortClassStudentsTable;

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

function changeDeadline(id) {
  const currentISO = _cachedCls?.assignments?.find(a => a.id === id)?.deadline ?? null;
  const localValue = currentISO
    ? new Date(new Date(currentISO) - new Date().getTimezoneOffset() * 60000)
        .toISOString().slice(0, 16)
    : '';
  openModal('Cập nhật hạn nộp', `
    <div style="padding:4px 0 16px">
      <label style="display:block;font-size:13px;font-weight:600;margin-bottom:8px">Hạn nộp mới</label>
      <input id="new-deadline-input" type="datetime-local" class="form-input" value="${escapeHtml(localValue)}"
        style="width:100%" />
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Huỷ</button>
      <button class="btn btn-primary" onclick="saveDeadline('${escapeHtml(id)}', this)">Lưu</button>
    </div>
  `);
}
window.changeDeadline = changeDeadline;

async function saveDeadline(id, btn) {
  const raw = $('#new-deadline-input')?.value;
  if (!raw) { toast('Vui lòng chọn thời gian', 'error'); return; }
  const deadline = new Date(raw).toISOString();
  btnLoading(btn);
  try {
    await api.patch(`/assignments/${id}`, { deadline });
    closeModal();
    toast('Đã cập nhật hạn nộp');
    if (_cachedCls?.id) await showClassDetail({ id: _cachedCls.id });
  } catch (e) {
    toast('Lỗi: ' + (e.error || e.message), 'error');
    btnLoading(btn, false);
  }
}
window.saveDeadline = saveDeadline;

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
  _submissionsSortCol = '';
  _submissionsSortDir = 'desc';
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

function buildSubmissionRows(students, assignment) {
  if (students.length === 0) {
    return `<tr><td colspan="5">
      <div class="empty-state" style="padding:30px">
        <div class="empty-state-icon">👤</div>
        <h3>Lớp chưa có học sinh nào</h3>
      </div>
     </td></tr>`;
  }
  return students.map(s => {
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
}

function sortedSubmissionStudents(students) {
  if (!_submissionsSortCol) return students;
  return [...students].sort((a, b) => {
    let va, vb;
    switch (_submissionsSortCol) {
      case 'full_name':    va = a.full_name.toLowerCase(); vb = b.full_name.toLowerCase(); break;
      case 'status':       va = a.submission_id ? 1 : 0;  vb = b.submission_id ? 1 : 0; break;
      case 'score':        va = a.overall_score ?? -1;     vb = b.overall_score ?? -1; break;
      case 'submitted_at': va = a.submitted_at || '';       vb = b.submitted_at || ''; break;
      default: return 0;
    }
    if (va < vb) return _submissionsSortDir === 'asc' ? -1 : 1;
    if (va > vb) return _submissionsSortDir === 'asc' ? 1 : -1;
    return 0;
  });
}

function sortSubmissionsTable(col) {
  if (_submissionsSortCol === col) {
    _submissionsSortDir = _submissionsSortDir === 'asc' ? 'desc' : 'asc';
  } else {
    _submissionsSortCol = col;
    _submissionsSortDir = col === 'full_name' ? 'asc' : 'desc';
  }
  const data = window._currentAssignmentData;
  if (!data) return;
  const tbody = document.querySelector('.table-wrap table tbody');
  if (tbody) tbody.innerHTML = buildSubmissionRows(sortedSubmissionStudents(data.students), data.assignment);
  document.querySelectorAll('th[data-sub-col]').forEach(th => {
    th.querySelector('.sort-icon')?.remove();
    th.insertAdjacentHTML('beforeend', makeSortIcon(th.dataset.subCol, _submissionsSortCol, _submissionsSortDir));
  });
}
window.sortSubmissionsTable = sortSubmissionsTable;

function renderAssignmentSubmissions(assignment, students) {
  const submitted   = students.filter(s => s.submission_id).length;
  const notSubmitted = students.length - submitted;
  const overdue = isOverdue(assignment.deadline) && assignment.is_active;

  const sssi = col => makeSortIcon(col, _submissionsSortCol, _submissionsSortDir);
  const rows = buildSubmissionRows(sortedSubmissionStudents(students), assignment);

  // Store for CSV export and re-sort
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
            <th class="sortable" data-sub-col="full_name" onclick="sortSubmissionsTable('full_name')">Học sinh ${sssi('full_name')}</th>
            <th class="sortable" data-sub-col="status" onclick="sortSubmissionsTable('status')">Trạng thái ${sssi('status')}</th>
            <th class="sortable" data-sub-col="score" onclick="sortSubmissionsTable('score')">Điểm ${sssi('score')}</th>
            <th class="sortable" data-sub-col="submitted_at" onclick="sortSubmissionsTable('submitted_at')">Thời gian nộp ${sssi('submitted_at')}</th>
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
        if (saveBtn) saveGrading(saveBtn, 'complete');
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
  const submissionsHref = sub.submission_kind === 'composite_section'
    ? `/composite/${sub.assignment_id}`
    : `/assignment/${sub.assignment_id}`;
  const supportsAiFeedback = sub.supports_ai_feedback !== false;

  const titleSkill = sub.skill === 'speaking' ? '🎤 Chấm bài Speaking' : '✏️ Chấm bài Writing';
  const isRewrite = (sub.attempt_number || 1) > 1;
  const prevAttempts = sub.previous_attempts || [];
  
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
      ${sub.assignment_id ? `<a class="breadcrumb-item" onclick="navigate('${submissionsHref}')">${escapeHtml(sub.assignment_title || 'Bài tập')}</a><span class="breadcrumb-sep">›</span>` : ''}
      <span class="breadcrumb-item active">Chấm bài</span>
    </nav>

    <div class="page-header">
      <div>
        <div class="page-title">
          ${titleSkill}
          ${isRewrite ? `<span class="rewrite-badge-title">BÀI VIẾT LẠI · Lần ${sub.attempt_number}</span>` : ''}
        </div>
        <div class="page-subtitle">
          ${escapeHtml(sub.student_name || '')}
          ${sub.student_username ? `<span style="color:var(--gray-400);font-family:monospace;font-size:11px">(${escapeHtml(sub.student_username)})</span>` : ''}
          — ${escapeHtml(sub.assignment_title || '')}
          <span style="color:var(--gray-400);font-size:12px">· Nộp ${formatDateTime(sub.submitted_at)}</span>
        </div>
      </div>
      <button class="btn btn-primary" id="save-btn" onclick="saveGrading(this, 'complete')">✅ Hoàn thành</button>
    </div>

    <div class="grading-layout">
      <!-- Left: writing content with highlights -->
      <div class="grading-content-panel">
        ${(sub.content_blocks?.length || sub.content_text) ? `
        <details class="grading-question-details">
          <summary class="grading-panel-label grading-question-summary">
            📋 Đề bài <span class="grading-select-hint">Nhấn để mở/thu gọn</span>
          </summary>
          <div class="grading-question-body">
            ${renderRichQuestionContentHTML(sub.content_blocks, sub.content_text || '')}
          </div>
        </details>` : ''}
        ${mediaHtml}
        <div class="grading-panel-label">
          📝 ${sub.skill === 'speaking' ? 'Transcript AI' : 'Bài làm'}
          <span class="grading-select-hint">Bôi đen đoạn văn để thêm nhận xét</span>
          ${sub.skill === 'writing' && sub.word_count != null ? `<span style="margin-left:auto;font-size:12px;color:var(--gray-500);font-weight:500">📊 ${sub.word_count} từ</span>` : ''}
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

        <div class="grading-action-buttons">
          <button class="btn btn-primary" style="flex:1" onclick="saveGrading(this, 'complete')">✅ Hoàn thành</button>
          ${sub.skill === 'writing' ? `<button class="btn btn-outline grading-rewrite-btn" onclick="saveGrading(this, 'request_rewrite')">✏️ Yêu cầu viết lại</button>` : ''}
        </div>

        ${prevAttempts.length > 0 ? `
        <div class="prev-attempts-section">
          <div class="prev-attempts-title">📋 Lần chấm trước</div>
          ${prevAttempts.map(a => `
            <div class="prev-attempt-card">
              <div class="prev-attempt-header">
                <span class="prev-attempt-label">Lần ${a.attempt_number}</span>
                <span class="prev-attempt-score">${a.overall_score != null ? `${a.overall_score} Band` : 'Chưa có điểm'}</span>
                <span class="prev-attempt-date">${formatDateTime(a.submitted_at)}</span>
              </div>
              ${a.teacher_feedback?.overall
                ? `<div class="prev-attempt-overall">${escapeHtml(a.teacher_feedback.overall)}</div>`
                : `<div class="prev-attempt-overall" style="color:var(--gray-400);font-style:italic">Không có nhận xét tổng</div>`}
            </div>`).join('')}
        </div>` : ''}

        ${supportsAiFeedback ? `
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
        ` : ''}
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
  const colorIdx = _annColorMap(_gradingAnnotations);
  el.innerHTML = sorted.map((ann, i) => `
    <div class="annotation-card ann-card-c${colorIdx.get(ann.id)}" id="ann-card-${ann.id}">
      <div class="annotation-card-header">
        <span class="annotation-number ann-num-c${colorIdx.get(ann.id)}">${i + 1}</span>
        <div class="annotation-actions">
          <button class="annotation-edit" onclick="editAnnotation('${ann.id}')" title="Sửa nhận xét" aria-label="Sửa nhận xét"><svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M8 4l2 2" stroke="currentColor" stroke-width="1.4"/></svg></button>
          <button class="annotation-delete" onclick="removeAnnotation('${ann.id}')" title="Xoá nhận xét" aria-label="Xoá nhận xét">×</button>
        </div>
      </div>
      <div class="annotation-quote">"${escapeHtml(ann.text.slice(0, 70))}${ann.text.length > 70 ? '…' : ''}"</div>
      <div class="annotation-comment" id="ann-comment-${ann.id}">${escapeHtml(ann.comment)}</div>
    </div>`).join('');
}

const ANN_COLORS = ['ann-c0', 'ann-c1', 'ann-c2', 'ann-c3', 'ann-c4', 'ann-c5'];

// Color = nesting depth from leaves: standalone/innermost = 0 (yellow),
// annotation wrapping a yellow = 1 (blue), wrapping blue = 2 (red), etc.
function _annColorMap(annotations) {
  if (!annotations || !annotations.length) return new Map();
  const depths = new Map(annotations.map(a => [a.id, 0]));
  // Process small annotations first so inner depths propagate outward
  const bySize = [...annotations].sort((a, b) => (a.end - a.start) - (b.end - b.start));
  for (const inner of bySize) {
    for (const outer of annotations) {
      if (outer !== inner && outer.start <= inner.start && outer.end >= inner.end) {
        depths.set(outer.id, Math.max(depths.get(outer.id), depths.get(inner.id) + 1));
      }
    }
  }
  return new Map(annotations.map(a => [a.id, Math.min(depths.get(a.id), ANN_COLORS.length - 1)]));
}

function buildAnnotatedHtml(text, annotations) {
  if (!text) return '<span style="color:var(--gray-400)">(Trống)</span>';
  if (!annotations.length) return escapeHtml(text);

  const colorIdx = _annColorMap(annotations);
  const byStart = [...annotations].sort((a, b) => a.start - b.start);
  const markerNum = new Map(byStart.map((ann, i) => [ann.id, i + 1]));

  // Recursive render: outer annotations wrap inner ones so mix-blend-mode shows both colors
  function renderSpan(lo, hi, anns) {
    if (lo >= hi) return '';
    if (!anns.length) return escapeHtml(text.slice(lo, hi));

    // Sort: earlier start first, then larger range first (outer before inner at same start)
    const sorted = [...anns].sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));

    let html = '';
    let pos = lo;
    const done = new Set();

    for (const ann of sorted) {
      if (done.has(ann.id)) continue;

      // Partial overlap already passed: render only the remaining tail
      const effectiveStart = Math.max(ann.start, pos);
      if (effectiveStart >= ann.end) continue;

      // Gap before this annotation
      html += escapeHtml(text.slice(pos, effectiveStart));

      // Children: annotations fully inside [ann.start, ann.end] not yet rendered
      const children = sorted.filter(a => !done.has(a.id) && a !== ann && a.start >= ann.start && a.end <= ann.end);
      children.forEach(c => done.add(c.id));
      done.add(ann.id);

      const colorCls = ANN_COLORS[colorIdx.get(ann.id)];
      html += `<mark class="ann-highlight ${colorCls}" data-id="${ann.id}" onclick="scrollToAnnotation('${ann.id}')" title="${escapeHtml(ann.comment)}">`;
      html += renderSpan(effectiveStart, ann.end, children);
      html += `<sup class="ann-marker ann-marker-c${colorIdx.get(ann.id)}">${markerNum.get(ann.id)}</sup>`;
      html += `</mark>`;

      pos = ann.end;
    }

    html += escapeHtml(text.slice(pos, hi));
    return html;
  }

  return renderSpan(0, text.length, annotations);
}

// ─── Selection → Annotation popup ────────────────────────────────────────────

// Walk text nodes in container, skipping .ann-marker sups, to get plain-text offset.
function _plainTextOffset(container, targetNode, targetOffset) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => n.parentElement?.closest('.ann-marker')
      ? NodeFilter.FILTER_REJECT
      : NodeFilter.FILTER_ACCEPT,
  });
  let len = 0;
  let node;
  while ((node = walker.nextNode())) {
    if (node === targetNode) return len + targetOffset;
    len += node.length;
  }
  return len;
}

function handleTextSelection() {
  closeAnnotationPopup();
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || !selection.toString().trim()) return;

  const range = selection.getRangeAt(0);
  const container = document.getElementById('writing-display');
  if (!container || !container.contains(range.commonAncestorContainer)) return;

  // Calc offsets against plain text, ignoring ann-marker sup numbers
  const start = _plainTextOffset(container, range.startContainer, range.startOffset);
  const end   = _plainTextOffset(container, range.endContainer, range.endOffset);
  const selectedText = range.toString();
  if (!selectedText.trim()) return;

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

  // Position below selection, clamp to viewport width (fixed coords — no scrollX/Y offset)
  const annVw = window.visualViewport?.width ?? window.innerWidth;
  const annVh = window.visualViewport?.height ?? window.innerHeight;
  const annPopupW = popup.offsetWidth || 340;
  const annPopupH = popup.offsetHeight || 200;
  const top  = Math.min(rect.bottom + 10, annVh - annPopupH - 8);
  const left = Math.max(8, Math.min(rect.left, annVw - annPopupW - 8));
  popup.style.top  = top + 'px';
  popup.style.left = left + 'px';

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

function editAnnotation(id) {
  const ann = _gradingAnnotations.find(a => a.id === id);
  if (!ann) return;
  const commentEl = document.getElementById(`ann-comment-${id}`);
  if (!commentEl || commentEl.querySelector('textarea')) return;
  commentEl.innerHTML = `
    <textarea class="annotation-edit-input" rows="3"></textarea>
    <div class="annotation-edit-actions">
      <button class="annotation-save-btn" onclick="saveAnnotation('${id}')">Lưu</button>
      <button class="annotation-cancel-btn" onclick="refreshAnnotationsList()">Huỷ</button>
    </div>`;
  const ta = commentEl.querySelector('textarea');
  ta.value = ann.comment;
  ta.focus();
}

function saveAnnotation(id) {
  const textarea = document.getElementById(`ann-comment-${id}`)?.querySelector('textarea');
  if (!textarea) return;
  const newComment = textarea.value.trim();
  if (!newComment) { toast('Vui lòng nhập nhận xét', 'error'); return; }
  const ann = _gradingAnnotations.find(a => a.id === id);
  if (ann) ann.comment = newComment;
  refreshWritingDisplay();
  refreshAnnotationsList();
}

function scrollToAnnotation(id) {
  document.getElementById(`ann-card-${id}`)
    ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function saveGrading(btn, action = 'complete') {
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
      action,
    });
    const msg = action === 'request_rewrite' ? 'Đã yêu cầu học sinh viết lại! ✓' : 'Đã hoàn thành chấm bài! ✓';
    toast(msg);
    setTimeout(() => navigate('/inbox'), 800);
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
let _assignSortCol = '';
let _assignSortDir = 'asc';

async function openAssignModal(classId, className, preSelectedId = null) {
  _assignClassId = classId;
  _selectedQuestionId = preSelectedId;
  _questions = [];
  _assignSkillFilter = '';
  _assignTagFilter = '';
  _assignSearch = '';
  _assignSortCol = '';
  _assignSortDir = 'asc';

  openModal(`Giao bài cho lớp "${className}"`, `
    <div class="form-group">
      <label class="form-label">Tên bài tập <span style="color:var(--danger)">*</span></label>
      <input id="assign-title" class="form-input" placeholder="VD: Reading tháng 5 - CAM 18 Test 1" />
    </div>
    <div class="form-group">
      <label class="form-label">Chọn đề từ kho</label>
      <div class="skill-tabs" id="assign-skill-tabs">
        ${['', ...FILTERABLE_ASSIGNMENT_SKILLS].map((s, i) => `
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
    <div class="form-group">
      <label class="form-label">Chế độ bài tập <span class="form-hint-inline">(chỉ áp dụng cho Listening)</span></label>
      <div class="assign-mode-options">
        <label class="assign-mode-option">
          <input type="radio" name="assign-mode" value="exam" checked />
          <span class="assign-mode-label">
            <span class="assign-mode-icon">📝</span>
            <span>
              <strong>Kiểm tra</strong>
              <span class="assign-mode-desc">Audio phát 1 lần liên tục, không tua/pause</span>
            </span>
          </span>
        </label>
        <label class="assign-mode-option">
          <input type="radio" name="assign-mode" value="practice" />
          <span class="assign-mode-label">
            <span class="assign-mode-icon">🎧</span>
            <span>
              <strong>Luyện tập</strong>
              <span class="assign-mode-desc">Cho phép tua, pause, nghe lại thoải mái</span>
            </span>
          </span>
        </label>
      </div>
    </div>
    <div class="form-group" id="assign-time-limit-group">
      <label class="form-label">Thời gian làm bài <span class="form-hint-inline">(chỉ áp dụng cho Kiểm tra)</span></label>
      <div style="display:flex;align-items:center;gap:8px">
        <input id="assign-time-limit" class="form-input" type="number" min="1" max="300" placeholder="Không giới hạn" style="width:140px" />
        <span style="color:var(--gray-400);font-size:13px">phút — hết giờ tự động nộp bài</span>
      </div>
    </div>
    <div class="form-group" id="assign-scale-group">
      <label class="form-label">Thang điểm <span class="form-hint-inline">(Reading &amp; Listening)</span></label>
      <div class="assign-mode-options">
        <label class="assign-mode-option">
          <input type="radio" name="assign-scale" value="ielts" checked />
          <span class="assign-mode-label">
            <span class="assign-mode-icon">🎯</span>
            <span>
              <strong>IELTS Test</strong>
              <span class="assign-mode-desc">Bảng quy đổi IELTS chuẩn (40 câu → band 0–9)</span>
            </span>
          </span>
        </label>
        <label class="assign-mode-option">
          <input type="radio" name="assign-scale" value="10" />
          <span class="assign-mode-label">
            <span class="assign-mode-icon">📊</span>
            <span>
              <strong>Practice Test</strong>
              <span class="assign-mode-desc">Thang điểm 10 (đúng/tổng × 10)</span>
            </span>
          </span>
        </label>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="submitAssign(this)">Giao bài</button>
    </div>`);

  document.querySelectorAll('input[name="assign-mode"]').forEach(radio => {
    radio.addEventListener('change', _syncAssignTimeLimitVisibility);
  });
  _syncAssignTimeLimitVisibility();
  // Hide scale group until a reading/listening question is selected
  const scaleGroup = $('#assign-scale-group');
  if (scaleGroup) scaleGroup.style.display = 'none';

  try {
    _questions = await api.get('/questions');
    renderAssignPicker('');
    if (preSelectedId) {
      const preQ = _questions.find(q => q.id === preSelectedId);
      const skill = preQ?.skill || '';
      const scaleGroup = $('#assign-scale-group');
      if (scaleGroup) scaleGroup.style.display = (skill === 'reading' || skill === 'listening' || skill === 'composite') ? '' : 'none';
    }
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

  if (_assignSortCol) {
    filtered.sort((a, b) => {
      let va, vb;
      if (_assignSortCol === 'title')      { va = a.title.toLowerCase(); vb = b.title.toLowerCase(); }
      else if (_assignSortCol === 'created_at') { va = a.created_at || ''; vb = b.created_at || ''; }
      else return 0;
      if (va < vb) return _assignSortDir === 'asc' ? -1 : 1;
      if (va > vb) return _assignSortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const sortPills = `<div class="assign-sort-pills">
    <span style="font-size:11px;font-weight:600;color:var(--gray-400)">Sắp xếp:</span>
    ${[['', 'Mặc định'], ['title', 'A→Z tên'], ['created_at', 'Mới nhất']].map(([col, label]) => `
      <button type="button" class="stats-filter-pill${_assignSortCol === col ? ' active' : ''}"
        onclick="_assignSortCol='${col}'; _assignSortDir='asc'; renderAssignPicker(_assignSkillFilter)">
        ${label}
      </button>`).join('')}
  </div>`;

  picker.innerHTML = sortPills + filtered.map(q => `
    <div class="question-picker-item ${_selectedQuestionId === q.id ? 'selected' : ''}"
      data-skill="${q.skill}" onclick="selectQuestion('${q.id}', this)">
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
  const skill = el.dataset.skill || '';
  const scaleGroup = $('#assign-scale-group');
  if (scaleGroup) scaleGroup.style.display = (skill === 'reading' || skill === 'listening' || skill === 'composite') ? '' : 'none';
}

function _syncAssignTimeLimitVisibility() {
  const modeEl = document.querySelector('input[name="assign-mode"]:checked');
  const isExam = !modeEl || modeEl.value !== 'practice';
  const group = $('#assign-time-limit-group');
  if (group) group.style.display = isExam ? '' : 'none';
}

async function submitAssign(btn) {
  const title = $('#assign-title')?.value.trim();
  const deadlineRaw = $('#assign-deadline')?.value;
  const deadline = deadlineRaw ? new Date(deadlineRaw).toISOString() : null;
  const modeEl = document.querySelector('input[name="assign-mode"]:checked');
  const mode = modeEl?.value === 'practice' ? 'practice' : 'exam';
  const timeLimitRaw = $('#assign-time-limit')?.value.trim();
  const timeLimitMinutes = (mode === 'exam' && timeLimitRaw) ? Number(timeLimitRaw) : null;
  const scaleEl = document.querySelector('input[name="assign-scale"]:checked');
  const scoringScale = scaleEl?.value || null; // null = backend auto-detect

  if (!title) { toast('Vui lòng nhập tên bài tập', 'error'); return; }
  if (!_selectedQuestionId) { toast('Vui lòng chọn một đề từ kho', 'error'); return; }

  btnLoading(btn);
  try {
    await api.post('/assignments', {
      class_id:    _assignClassId,
      question_id: _selectedQuestionId,
      title,
      deadline:    deadline || null,
      mode,
      time_limit_minutes: timeLimitMinutes,
      scoring_scale: scoringScale,
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
let _allFolders = [];
let _currentFolderFilter = null; // null=tất cả | 'root'=chưa phân loại | uuid=thư mục cụ thể
let _questionSearch = '';
let _questionTagFilter = '';
let _questionSortCol = '';
let _questionSortDir = 'asc';
let _allClasses = [];
let _classSearch = '';
let _classSort = 'newest'; // 'newest' | 'name' | 'students'
let _classDetailTab = 'assignments';
let _cachedCls = null;
let _cachedStudents = [];

// Sort state for tables that don't use applyStatsFilter
let _assignTableSortCol = '';    // stats: "Chi tiết từng bài tập"
let _assignTableSortDir = 'desc';
let _submissionsSortCol = '';    // assignment submissions page
let _submissionsSortDir = 'desc';
let _assignListSortCol = '';     // class detail: assignment list
let _assignListSortDir = 'desc';
let _classStudentsSortCol = '';  // class detail: student list
let _classStudentsSortDir = 'asc';

async function showQuestions() {
  _questionSortCol = '';
  _questionSortDir = 'asc';
  setLoading('Đang tải kho đề...');
  try {
    [_allQuestions, _allFolders] = await Promise.all([
      api.get('/questions'),
      api.get('/question-folders'),
    ]);
    renderQuestions();
  } catch (e) {
    toast('Lỗi tải kho đề: ' + (e.error || e.message), 'error');
    renderRouteError('Không tải được kho đề', e, '/questions');
  }
}

// ─── Folder helpers ───────────────────────────────────────────────────────────

function _getFolderSubtreeIds(folderId) {
  const ids = new Set([folderId]);
  const queue = [folderId];
  while (queue.length) {
    const cur = queue.shift();
    for (const f of _allFolders) {
      if (f.parent_id === cur) { ids.add(f.id); queue.push(f.id); }
    }
  }
  return ids;
}

function _getFilteredQuestions() {
  let list = _allQuestions;
  if (_currentFolderFilter === 'root') {
    list = list.filter(q => !q.folder_id);
  } else if (_currentFolderFilter) {
    const ids = _getFolderSubtreeIds(_currentFolderFilter);
    list = list.filter(q => ids.has(q.folder_id));
  }
  if (_currentSkillFilter) list = list.filter(q => q.skill === _currentSkillFilter);
  if (_questionSearch) {
    const s = _questionSearch.toLowerCase();
    list = list.filter(q =>
      q.title.toLowerCase().includes(s) ||
      (Array.isArray(q.tags) && q.tags.some(t => t.toLowerCase().includes(s)))
    );
  }
  if (_questionTagFilter) list = list.filter(q => Array.isArray(q.tags) && q.tags.includes(_questionTagFilter));
  return list;
}

function _buildFolderSidebar() {
  const allCount  = _allQuestions.length;
  const rootCount = _allQuestions.filter(q => !q.folder_id).length;
  return `
    <div class="folder-sidebar-header">
      <span class="folder-sidebar-title">Thư mục</span>
      <button class="btn-icon folder-add-root" title="Thêm thư mục" aria-label="Thêm thư mục" onclick="createFolderPrompt(null)">&#xff0b;</button>
    </div>
    <div class="folder-item ${_currentFolderFilter === null ? 'active' : ''}" onclick="setFolderFilter(null)" role="button" tabindex="0">
      <span class="folder-icon">🗂</span>
      <span class="folder-name">Tất cả</span>
      <span class="folder-count">${allCount}</span>
    </div>
    <div class="folder-item ${_currentFolderFilter === 'root' ? 'active' : ''}" onclick="setFolderFilter('root')" role="button" tabindex="0">
      <span class="folder-icon">📄</span>
      <span class="folder-name">Chưa phân loại</span>
      <span class="folder-count">${rootCount}</span>
    </div>
    ${_allFolders.filter(f => !f.parent_id).length > 0 ? '<div class="folder-divider"></div>' : ''}
    ${_buildFolderTreeItems(null, 0)}
  `;
}

function _buildFolderTreeItems(parentId, depth) {
  return _allFolders
    .filter(f => f.parent_id === parentId)
    .sort((a, b) => (a.display_order - b.display_order) || a.name.localeCompare(b.name))
    .map(f => {
      const ids   = _getFolderSubtreeIds(f.id);
      const count = _allQuestions.filter(q => ids.has(q.folder_id)).length;
      const isActive    = _currentFolderFilter === f.id;
      const hasChildren = _allFolders.some(c => c.parent_id === f.id);
      const safeName    = escapeHtml(f.name).replace(/'/g, '&#39;');
      return `
        <div class="folder-item ${isActive ? 'active' : ''}" style="padding-left:${12 + depth * 14}px"
             onclick="setFolderFilter('${f.id}')" role="button" tabindex="0">
          <span class="folder-icon">${hasChildren ? '📂' : '📁'}</span>
          <span class="folder-name">${escapeHtml(f.name)}</span>
          <span class="folder-count">${count}</span>
          <span class="folder-item-actions" onclick="event.stopPropagation()">
            <button class="folder-action-btn" title="Thêm thư mục con" aria-label="Thêm thư mục con" onclick="createFolderPrompt('${f.id}')">&#xff0b;</button>
            <button class="folder-action-btn" title="Đổi tên" aria-label="Đổi tên thư mục" onclick="renameFolderPrompt('${f.id}','${safeName}')">&#x270f;</button>
            <button class="folder-action-btn danger" title="Xoá" aria-label="Xoá thư mục" onclick="deleteFolderConfirm('${f.id}','${safeName}')">&#x1f5d1;</button>
          </span>
        </div>
        ${_buildFolderTreeItems(f.id, depth + 1)}`;
    }).join('');
}

function setFolderFilter(v) { _currentFolderFilter = v; renderQuestions(); }
window.setFolderFilter = setFolderFilter;

async function createFolderPrompt(parentId) {
  const name = window.prompt(parentId ? 'Tên thư mục con:' : 'Tên thư mục mới:');
  if (!name?.trim()) return;
  try {
    const folder = await api.post('/question-folders', { name: name.trim(), parent_id: parentId });
    _allFolders.push(folder);
    renderQuestions();
    toast('Đã tạo thư mục "' + folder.name + '"');
  } catch (e) { toast('Lỗi: ' + (e.error || e.message), 'error'); }
}
window.createFolderPrompt = createFolderPrompt;

async function renameFolderPrompt(id, currentName) {
  const name = window.prompt('Đổi tên thư mục:', currentName);
  if (!name?.trim() || name.trim() === currentName) return;
  try {
    const folder = await api.patch(`/question-folders/${id}`, { name: name.trim() });
    const idx = _allFolders.findIndex(f => f.id === id);
    if (idx >= 0) _allFolders[idx] = folder;
    renderQuestions();
  } catch (e) { toast('Lỗi: ' + (e.error || e.message), 'error'); }
}
window.renameFolderPrompt = renameFolderPrompt;

async function deleteFolderConfirm(id, name) {
  const childCount = _allFolders.filter(f => f.parent_id === id).length;
  const qCount     = _allQuestions.filter(q => q.folder_id === id).length;
  let msg = `Xoá thư mục "${name}"?`;
  if (childCount > 0) msg += `\n• ${childCount} thư mục con cũng sẽ bị xoá.`;
  if (qCount     > 0) msg += `\n• ${qCount} đề sẽ được chuyển về Chưa phân loại.`;
  if (!confirm(msg)) return;
  try {
    await api.delete(`/question-folders/${id}`);
    const subtree = _getFolderSubtreeIds(id);
    _allFolders   = _allFolders.filter(f => !subtree.has(f.id));
    _allQuestions.forEach(q => { if (subtree.has(q.folder_id)) q.folder_id = null; });
    if (subtree.has(_currentFolderFilter)) _currentFolderFilter = null;
    renderQuestions();
    toast('Đã xoá thư mục');
  } catch (e) { toast('Lỗi: ' + (e.error || e.message), 'error'); }
}
window.deleteFolderConfirm = deleteFolderConfirm;

function openMoveQuestionModal(questionId) {
  const q = _allQuestions.find(x => x.id === questionId);
  if (!q) return;
  const buildOpts = (parentId, depth) =>
    _allFolders
      .filter(f => f.parent_id === parentId)
      .sort((a, b) => (a.display_order - b.display_order) || a.name.localeCompare(b.name))
      .map(f => `
        <option value="${f.id}" ${q.folder_id === f.id ? 'selected' : ''}>
          ${'　'.repeat(depth)}${escapeHtml(f.name)}
        </option>${buildOpts(f.id, depth + 1)}`).join('');
  openModal('Di chuyển đề vào thư mục', `
    <div style="margin-bottom:8px;font-size:13px;color:var(--gray-500)">${escapeHtml(q.title)}</div>
    <div class="form-group">
      <label class="form-label">Chọn thư mục đích</label>
      <select id="move-folder-select" class="form-input">
        <option value="" ${!q.folder_id ? 'selected' : ''}>📄 Chưa phân loại (gốc)</option>
        ${buildOpts(null, 0)}
      </select>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
      <button class="btn btn-outline" onclick="closeModal()">Huỷ</button>
      <button class="btn btn-primary" onclick="confirmMoveQuestion('${questionId}')">Di chuyển</button>
    </div>
  `);
}
window.openMoveQuestionModal = openMoveQuestionModal;

async function confirmMoveQuestion(questionId) {
  const folderId = document.getElementById('move-folder-select')?.value || null;
  try {
    await api.patch(`/questions/${questionId}`, { folder_id: folderId || null });
    const q = _allQuestions.find(x => x.id === questionId);
    if (q) q.folder_id = folderId || null;
    closeModal();
    renderQuestions();
    toast('Đã di chuyển đề');
  } catch (e) { toast('Lỗi: ' + (e.error || e.message), 'error'); }
}
window.confirmMoveQuestion = confirmMoveQuestion;

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
          ${q.skill === 'composite'
            ? '📋 Tổng hợp'
            : (q.question_count != null ? q.question_count + ' câu' : '—')}
          ${q.content_url ? ' · 🔊 Audio' : ''}
        </td>
        <td style="font-size:12px;color:var(--gray-400)">${formatDate(q.created_at)}</td>
        <td>
          <div class="td-actions">
            <button class="btn-icon" title="Xem / Sửa" aria-label="Xem và sửa câu hỏi"
              onclick="navigate('/questions/${q.id}')">✏️</button>
            <button class="btn-icon" title="Di chuyển vào thư mục" aria-label="Di chuyển vào thư mục"
              onclick="openMoveQuestionModal('${q.id}')">📁</button>
            <button class="btn-icon" title="Sao chép đề" aria-label="Sao chép câu hỏi"
              onclick="duplicateQuestion('${q.id}', this)">📋</button>
            <button class="btn-icon danger" title="Xoá đề" aria-label="Xoá câu hỏi"
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
  let filtered = _getFilteredQuestions();

  if (_questionSortCol) {
    filtered = [...filtered].sort((a, b) => {
      let va, vb;
      if (_questionSortCol === 'skill')           { va = a.skill || ''; vb = b.skill || ''; }
      else if (_questionSortCol === 'title')       { va = a.title.toLowerCase(); vb = b.title.toLowerCase(); }
      else if (_questionSortCol === 'created_at') { va = a.created_at || ''; vb = b.created_at || ''; }
      else return 0;
      if (va < vb) return _questionSortDir === 'asc' ? -1 : 1;
      if (va > vb) return _questionSortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // Partial update: sidebar + tbody + sort icons + tabs — avoids destroying search input focus
  const existingLayout = $('#app')?.querySelector('.question-bank-layout');
  if (existingLayout) {
    existingLayout.querySelector('.folder-sidebar').innerHTML = _buildFolderSidebar();
    existingLayout.querySelector('table tbody').innerHTML = _buildQuestionTableRows(filtered);
    const sub = existingLayout.querySelector('.page-subtitle');
    if (sub) sub.textContent = `Tổng cộng ${_allQuestions.length} đề thi`;
    ['skill','title','created_at'].forEach(col => {
      const th = document.querySelector(`th[data-q-col="${col}"]`);
      if (!th) return;
      const icon = th.querySelector('.sort-icon');
      if (icon) icon.remove();
      th.insertAdjacentHTML('beforeend', makeSortIcon(col, _questionSortCol, _questionSortDir));
    });
    document.querySelectorAll('.skill-tab').forEach(btn => {
      btn.classList.toggle('active', btn.textContent.trim().includes(
        _currentSkillFilter
          ? { reading:'Reading', listening:'Listening', writing:'Writing', speaking:'Speaking', composite:'Tổng hợp' }[_currentSkillFilter]
          : 'Tất cả'
      ));
    });
    const toolbar = existingLayout.querySelector('.list-toolbar');
    if (toolbar) {
      let bar = toolbar.querySelector('.tag-filter-bar');
      if (_questionTagFilter && !bar) {
        bar = document.createElement('div'); bar.className = 'tag-filter-bar'; toolbar.appendChild(bar);
      }
      if (bar) {
        bar.innerHTML = _questionTagFilter
          ? `Lọc tag: <span class="tag-chip tag-chip-active">${escapeHtml(_questionTagFilter)}<button class="tag-chip-remove" onclick="setQuestionTagFilter('')" aria-label="Xoá bộ lọc tag">×</button></span>`
          : '';
        if (!_questionTagFilter) bar.remove();
      }
    }
    return;
  }

  // Full initial render — two-panel layout
  $('#app').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Kho đề</div>
        <div class="page-subtitle">Tổng cộng ${_allQuestions.length} đề thi</div>
      </div>
      <button class="btn btn-primary" onclick="navigate('/questions/new')">+ Tạo đề mới</button>
    </div>

    <div class="question-bank-layout">
      <div class="folder-sidebar">${_buildFolderSidebar()}</div>

      <div class="question-main">
        <div class="list-toolbar">
          <input id="question-search-input" class="form-input search-input"
            placeholder="🔍 Tìm theo tên đề hoặc tag..."
            value="${escapeHtml(_questionSearch)}" />
          ${_questionTagFilter ? `<div class="tag-filter-bar">Lọc tag: <span class="tag-chip tag-chip-active">${escapeHtml(_questionTagFilter)}<button class="tag-chip-remove" onclick="setQuestionTagFilter('')" aria-label="Xoá bộ lọc tag">×</button></span></div>` : ''}
        </div>

        <div class="skill-tabs">
          ${[['', 'Tất cả'], ['reading','📖 Reading'], ['listening','🎧 Listening'],
             ['writing','✍️ Writing'], ['speaking','🎤 Speaking'], ['composite','📋 Tổng hợp']].map(([s, label]) => `
            <button class="skill-tab ${_currentSkillFilter === s ? 'active' : ''}"
              onclick="setSkillFilter('${s}')">${label}</button>`).join('')}
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th class="sortable" data-q-col="skill" onclick="sortQuestions('skill')">Kỹ năng ${makeSortIcon('skill', _questionSortCol, _questionSortDir)}</th>
                <th class="sortable" data-q-col="title" onclick="sortQuestions('title')">Tiêu đề <span style="font-size:11px;font-weight:400;color:var(--gray-400)">(click để xem nhanh)</span> ${makeSortIcon('title', _questionSortCol, _questionSortDir)}</th>
                <th>Tags</th>
                <th>Chi tiết</th>
                <th class="sortable" data-q-col="created_at" onclick="sortQuestions('created_at')">Ngày tạo ${makeSortIcon('created_at', _questionSortCol, _questionSortDir)}</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>${_buildQuestionTableRows(filtered)}</tbody>
          </table>
        </div>
      </div>
    </div>`;

  const searchInput = document.getElementById('question-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => { _questionSearch = searchInput.value; renderQuestions(); });
    if (_questionSearch) searchInput.focus();
  }
}

function setQuestionTagFilter(tag) {
  _questionTagFilter = tag;
  renderQuestions();
}
window.setQuestionTagFilter = setQuestionTagFilter;

function sortQuestions(col) {
  if (_questionSortCol === col) {
    _questionSortDir = _questionSortDir === 'asc' ? 'desc' : 'asc';
  } else {
    _questionSortCol = col;
    _questionSortDir = 'asc';
  }
  renderQuestions();
}
window.sortQuestions = sortQuestions;

async function previewQuestion(id) {
  // Find from cache for instant title display
  const cached = _allQuestions.find(x => x.id == id);
  if (!cached) return;

  const buildCompositeModal = (q) => {
    const sections = Array.isArray(q.sections) ? q.sections : [];
    const secHtml = sections.map(s => {
      const qCount = Array.isArray(s.questions_data) ? s.questions_data.length : 0;
      return `<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border:1px solid var(--border);border-radius:8px;margin-bottom:6px;background:var(--bg-card)">
        <span>${_cqSkillIcon(s.skill)}</span>
        <span style="font-weight:600;font-size:13px">${escapeHtml(s.label || _cqSkillLabel(s.skill))}</span>
        <span style="color:var(--gray-400);font-size:12px">${_cqSkillLabel(s.skill)}${qCount ? ` · ${qCount} câu` : ''}${s.time_limit_minutes ? ` · ⏱${s.time_limit_minutes}ph` : ''}</span>
      </div>`;
    }).join('');
    return `
      <div style="margin-bottom:12px">${skillBadge(q.skill)}</div>
      <div style="display:flex;gap:16px;margin-bottom:16px;flex-wrap:wrap">
        <span class="stat-chip">📋 ${sections.length} phần thi</span>
        <span class="stat-chip">📅 Tạo ${formatDate(q.created_at)}</span>
      </div>
      ${sections.length ? `
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--gray-400);margin-bottom:8px">Các phần thi</div>
      ${secHtml}` : '<div style="color:var(--gray-400);font-size:13px">Chưa có phần thi nào.</div>'}
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal()">Đóng</button>
        <button class="btn btn-primary" onclick="closeModal();navigate('/questions/${id}')">Chỉnh sửa</button>
      </div>`;
  };

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

  if (cached.skill === 'composite') {
    openModal(escapeHtml(cached.title), '<div style="color:var(--gray-400)">Đang tải...</div>');
    try {
      const full = await api.get(`/questions/${id}`);
      Object.assign(cached, full);
      const modalBody = document.getElementById('modal-body');
      if (modalBody) modalBody.innerHTML = buildCompositeModal(full);
    } catch {}
    return;
  }

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
        const html = normalizeIndentMarkupHtml(item?.html ?? (item?.text ? textToEditorHtml(item.text) : ''));
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
          <button type="button" class="fmt-btn" id="fmt-align-left"    onmousedown="event.preventDefault()" onclick="applyFormat('justifyLeft')"   title="Căn trái"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><line x1="1" y1="3" x2="13" y2="3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="1" y1="6" x2="9"  y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="1" y1="9" x2="13" y2="9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="1" y1="12" x2="8" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>
          <button type="button" class="fmt-btn" id="fmt-align-center"  onmousedown="event.preventDefault()" onclick="applyFormat('justifyCenter')" title="Căn giữa"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><line x1="1" y1="3" x2="13" y2="3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="3" y1="6" x2="11" y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="1" y1="9" x2="13" y2="9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="3" y1="12" x2="11" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>
          <button type="button" class="fmt-btn" id="fmt-align-right"   onmousedown="event.preventDefault()" onclick="applyFormat('justifyRight')"  title="Căn phải"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><line x1="1" y1="3" x2="13" y2="3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="5" y1="6" x2="13" y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="1" y1="9" x2="13" y2="9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="6" y1="12" x2="13" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>
          <button type="button" class="fmt-btn" id="fmt-align-justify" onmousedown="event.preventDefault()" onclick="applyJustify()"   title="Căn đều"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><line x1="1" y1="3" x2="13" y2="3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="1" y1="6" x2="13" y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="1" y1="9" x2="13" y2="9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="1" y1="12" x2="13" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>
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

const EDITOR_INDENT_NBSP_COUNT = 4;
const EDITOR_INDENT_BLOCK_TAGS = new Set(['DIV', 'P', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE']);

function createEditorIndentHtml(count = 1) {
  const safeCount = Math.max(1, Number(count) || 1);
  return Array.from({ length: safeCount }, () =>
    '<span class="document-editor-indent" contenteditable="false" data-indent="1">&nbsp;</span>'
  ).join('');
}

function extractLeadingIndentInfo(text = '') {
  let units = 0;
  let consumedChars = 0;
  let pendingSpaces = 0;
  while (consumedChars < text.length) {
    const ch = text[consumedChars];
    if (ch === '\t') {
      if (pendingSpaces) break;
      units += 1;
      consumedChars += 1;
      continue;
    }
    if (ch === ' ' || ch === '\u00a0') {
      pendingSpaces += 1;
      consumedChars += 1;
      if (pendingSpaces === EDITOR_INDENT_NBSP_COUNT) {
        units += 1;
        pendingSpaces = 0;
      }
      continue;
    }
    break;
  }
  consumedChars -= pendingSpaces;
  return { units, consumedChars };
}

function normalizeLeadingIndentTextNodes(root) {
  if (!root?.childNodes) return true;
  let atLineStart = true;
  Array.from(root.childNodes).forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      const raw = String(node.textContent || '');
      if (atLineStart && raw) {
        const { units, consumedChars } = extractLeadingIndentInfo(raw);
        if (units > 0) {
          const frag = document.createDocumentFragment();
          const indentFrag = document.createRange().createContextualFragment(createEditorIndentHtml(units));
          frag.appendChild(indentFrag);
          const remainder = raw.slice(consumedChars);
          if (remainder) frag.appendChild(document.createTextNode(remainder));
          node.replaceWith(frag);
          atLineStart = !remainder || !/[^\s\u00a0]/.test(remainder);
          return;
        }
      }
      if (/[^\s\u00a0]/.test(raw)) atLineStart = false;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (node.tagName === 'BR') {
      atLineStart = true;
      return;
    }
    if (node.classList.contains('document-editor-indent')) return;
    if (EDITOR_INDENT_BLOCK_TAGS.has(node.tagName)) {
      normalizeLeadingIndentTextNodes(node);
      atLineStart = true;
      return;
    }
    atLineStart = normalizeLeadingIndentTextNodes(node);
  });
  return atLineStart;
}

function normalizeIndentTokensInElement(root) {
  if (!root?.querySelectorAll) return;
  root.querySelectorAll('span').forEach(span => {
    const rawText = String(span.textContent || '').replace(/ /g, '').replace(/\n/g, '');
    const hasOnlyNbsp = rawText && /^[\u00a0\t]+$/.test(rawText);
    const inlineBlockStyle = /display\s*:\s*inline-block/i.test(span.getAttribute('style') || '');
    const isIndentToken = span.classList.contains('document-editor-indent') || (inlineBlockStyle && hasOnlyNbsp);
    if (!isIndentToken) return;
    const indentUnits = Math.max(1, Math.round(rawText.length / EDITOR_INDENT_NBSP_COUNT) || 1);
    const frag = document.createRange().createContextualFragment(createEditorIndentHtml(indentUnits));
    span.replaceWith(frag);
  });
  normalizeLeadingIndentTextNodes(root);
}

function normalizeIndentMarkupHtml(html = '') {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = String(html);
  normalizeIndentTokensInElement(tmp);
  return tmp.innerHTML;
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
    normalizeIndentTokensInElement(clone);
    clone.querySelectorAll('.editor-table-wrap').forEach(wrap => {
      const tbl = wrap.querySelector('.editor-table');
      if (tbl) { tbl.style.width = wrap.style.width || '100%'; wrap.replaceWith(tbl.cloneNode(true)); }
      else wrap.remove();
    });
    clone.querySelectorAll('.editor-table-resize-handle, .tbl-col-resize-handle, .tbl-row-resize-handle').forEach(el => el.remove());
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
  scheduleQuestionDraftSave();
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

    injectTableResizeHandles(table);

    // Shift+click for multi-cell range selection (merge)
    table.addEventListener('mousedown', (e) => {
      const cell = e.target.closest('td,th');
      if (!cell || !table.contains(cell)) return;
      if (e.shiftKey && _activeTableCell && _activeTableCell.closest('table') === table) {
        e.preventDefault();
        selectTableCellRange(table, _activeTableCell, cell);
        showTableFloatToolbar(table);
      } else if (!e.shiftKey) {
        clearTableCellSelection();
      }
    });
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
  const html = renderRichQuestionContentHTML(_contentBlocks);
  const preview = document.getElementById('content-composer-preview-body');
  if (preview) preview.innerHTML = html;
  const floatBody = document.getElementById('preview-sticky-float-body');
  if (floatBody) floatBody.innerHTML = html;
}

let _stickyPreviewObserver = null;
let _stickyPreviewDismissed = false;

function initStickyPreview() {
  if (_stickyPreviewObserver) { _stickyPreviewObserver.disconnect(); _stickyPreviewObserver = null; }
  _stickyPreviewDismissed = false;

  let floatEl = document.getElementById('preview-sticky-float');
  if (!floatEl) {
    floatEl = document.createElement('div');
    floatEl.id = 'preview-sticky-float';
    floatEl.className = 'preview-sticky-float';
    document.body.appendChild(floatEl);
  }
  floatEl.innerHTML = `
    <div class="preview-sticky-float-header">
      <span class="content-composer-preview-title" style="margin:0">Xem trước nội dung</span>
      <button class="preview-sticky-close" onclick="dismissStickyPreview()" title="Ẩn" aria-label="Ẩn xem trước">✕</button>
    </div>
    <div id="preview-sticky-float-body" class="content-composer-preview-body"></div>`;

  const srcBody = document.getElementById('content-composer-preview-body');
  const dstBody = document.getElementById('preview-sticky-float-body');
  if (srcBody && dstBody) dstBody.innerHTML = srcBody.innerHTML;

  let toggleBtn = document.getElementById('preview-sticky-toggle');
  if (!toggleBtn) {
    toggleBtn = document.createElement('button');
    toggleBtn.id = 'preview-sticky-toggle';
    toggleBtn.className = 'preview-sticky-toggle';
    toggleBtn.title = 'Xem trước nội dung';
    toggleBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    toggleBtn.onclick = () => { _stickyPreviewDismissed = false; updateStickyPreviewVisibility(); };
    document.body.appendChild(toggleBtn);
  }

  const originalPreview = document.querySelector('.content-composer-preview');
  if (!originalPreview) return;

  const updateVisibility = (outOfView) => {
    floatEl.classList.toggle('is-visible', outOfView && !_stickyPreviewDismissed);
    toggleBtn.classList.toggle('is-visible', outOfView && _stickyPreviewDismissed);
    if (!outOfView) _stickyPreviewDismissed = false;
  };
  window._updateStickyPreviewVisibility = updateVisibility;

  _stickyPreviewObserver = new IntersectionObserver(([entry]) => {
    updateVisibility(!entry.isIntersecting && entry.boundingClientRect.top < 0);
  }, { threshold: 0 });
  _stickyPreviewObserver.observe(originalPreview);
}

function updateStickyPreviewVisibility() {
  if (window._updateStickyPreviewVisibility) {
    const originalPreview = document.querySelector('.content-composer-preview');
    if (!originalPreview) return;
    const rect = originalPreview.getBoundingClientRect();
    window._updateStickyPreviewVisibility(!originalPreview.checkVisibility?.() || rect.bottom < 0);
  }
}

function dismissStickyPreview() {
  _stickyPreviewDismissed = true;
  document.getElementById('preview-sticky-float')?.classList.remove('is-visible');
  document.getElementById('preview-sticky-toggle')?.classList.add('is-visible');
}
window.dismissStickyPreview = dismissStickyPreview;

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
  normalizeIndentTokensInElement(host);
  host.onkeydown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand('insertHTML', false, createEditorIndentHtml(1));
      syncContentBlocksFromEditor();
      return;
    }
    if (e.key !== 'Enter') return;
    const selNode = window.getSelection()?.getRangeAt(0)?.commonAncestorContainer;
    const selEl = selNode?.nodeType === 3 ? selNode.parentElement : selNode;
    if (selEl?.closest('td,th')) return;
    e.preventDefault();
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    const range = sel.getRangeAt(0);

    // Check if there is visible content after the cursor inside the host.
    // If not, we are at end-of-block: a single <br> is consumed by the browser
    // as a sentinel and the cursor does not visually move — need <br><br>.
    const afterRange = range.cloneRange();
    afterRange.setEnd(host, host.childNodes.length);
    const hasContentAfter = afterRange.toString().trim().length > 0
      || afterRange.cloneContents().querySelector('img,table') !== null;

    // Use a marker span to position cursor precisely after execCommand.
    // execCommand puts the action in the browser undo stack so Ctrl+Z works.
    const MARKER = '__br_cursor__';
    document.execCommand('insertHTML', false,
      hasContentAfter
        ? `<br><span id="${MARKER}"></span>`
        : `<br><span id="${MARKER}"></span><br>`
    );
    const marker = document.getElementById(MARKER);
    if (marker) {
      const parent = marker.parentNode;
      const offset = Array.from(parent.childNodes).indexOf(marker);
      marker.remove();
      const r = document.createRange();
      r.setStart(parent, offset);
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);
    }
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
let _selectedTableCells = [];
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
  ['Left','Center','Right'].forEach(dir => {
    const btn = document.getElementById(`fmt-align-${dir.toLowerCase()}`);
    if (btn) btn.classList.toggle('is-active', document.queryCommandState(`justify${dir}`));
  });
  const host2 = document.getElementById('content-composer-host');
  const btnJustify = document.getElementById('fmt-align-justify');
  if (btnJustify && host2) {
    btnJustify.classList.toggle('is-active',
      document.queryCommandState('justifyFull') || host2.style.textAlign === 'justify');
  }
  const sel = window.getSelection();
  if (sel?.rangeCount) {
    const node = sel.getRangeAt(0).commonAncestorContainer;
    const el = node.nodeType === 3 ? node.parentElement : node;
    _activeTableCell = el?.closest?.('td,th') || null;
  } else {
    _activeTableCell = null;
  }
  if (_activeTableCell) showTableFloatToolbar(_activeTableCell.closest('table'));
  else { clearTableCellSelection(); hideTableFloatToolbar(); }
}

function applyFormat(cmd) {
  document.execCommand(cmd);
  syncContentBlocksFromEditor();
}

// Custom justify: applies text-align:justify directly to the host and all block
// children instead of execCommand('justifyFull'), which creates inconsistent
// <div> wrappers that render leading NBSP indents at different positions.
function applyJustify() {
  const host = document.getElementById('content-composer-host');
  if (!host) return;
  normalizeIndentTokensInElement(host);
  const isOn = document.queryCommandState('justifyFull')
    || host.style.textAlign === 'justify';
  const val = isOn ? '' : 'justify';
  host.style.textAlign = val;
  host.querySelectorAll('div, p, h1, h2, h3, h4, h5, h6').forEach(el => {
    el.style.textAlign = val;
  });
  updateFormatToolbarState();
  syncContentBlocksFromEditor();
}
window.applyJustify = applyJustify;

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

  // Extract, strip all existing font-size styles inside the selection so the
  // new outer span is not overridden by inner spans with their own font-size.
  const fragment = range.extractContents();
  fragment.querySelectorAll('[style]').forEach(el => {
    el.style.fontSize = '';
    // Remove the style attribute entirely if it became empty after stripping
    if (!el.getAttribute('style').trim()) el.removeAttribute('style');
  });

  const span = document.createElement('span');
  span.style.fontSize = size + 'px';
  span.appendChild(fragment);
  range.insertNode(span);

  // Restore selection over the newly inserted span
  const newRange = document.createRange();
  newRange.selectNodeContents(span);
  sel.removeAllRanges();
  sel.addRange(newRange);

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
  const btn = (title, onclick, danger, svgPath, id) =>
    `<button${id ? ` id="${id}"` : ''} class="tft-btn${danger ? ' tft-danger' : ''}" title="${title}" onmousedown="event.preventDefault()" onclick="${onclick}"><svg width="15" height="15" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">${svgPath}</svg></button>`;
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
      '<rect x="4" y="1" width="6" height="12" rx="1" stroke="currentColor" stroke-width="1.4"/><path d="M6 7h2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>') +
    '<div class="tft-sep" id="tft-merge-sep" style="display:none"></div>' +
    btn('Gộp ô đã chọn (Shift+click để chọn nhiều ô)', 'tableMergeCells()', false,
      '<rect x="1" y="1" width="5" height="5" rx=".8" stroke="currentColor" stroke-width="1.3"/><rect x="8" y="1" width="5" height="5" rx=".8" stroke="currentColor" stroke-width="1.3"/><rect x="1" y="8" width="5" height="5" rx=".8" stroke="currentColor" stroke-width="1.3"/><rect x="8" y="8" width="5" height="5" rx=".8" stroke="currentColor" stroke-width="1.3"/><path d="M5 5L9 9M9 5L5 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
      'tft-merge-btn') +
    btn('Tách ô', 'tableSplitCell()', false,
      '<rect x="1" y="1" width="12" height="12" rx="1" stroke="currentColor" stroke-width="1.3"/><path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>',
      'tft-split-btn') +
    '<div class="tft-sep"></div>' +
    btn('Kiểu viền bảng', 'toggleTableBorderPicker()', false,
      '<rect x="1" y="1" width="12" height="12" rx="1" stroke="currentColor" stroke-width="1.3"/><path d="M5 1v12M9 1v12M1 5h12M1 9h12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>',
      'tft-border-btn');
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

  const mergeBtn = document.getElementById('tft-merge-btn');
  const splitBtn = document.getElementById('tft-split-btn');
  const mergeSep = document.getElementById('tft-merge-sep');
  const canMerge = _selectedTableCells.length > 1;
  const canSplit = _selectedTableCells.length <= 1 && _activeTableCell &&
    ((_activeTableCell.colSpan || 1) > 1 || (_activeTableCell.rowSpan || 1) > 1);
  if (mergeBtn) mergeBtn.style.display = canMerge ? '' : 'none';
  if (splitBtn) splitBtn.style.display = canSplit ? '' : 'none';
  if (mergeSep) mergeSep.style.display = (canMerge || canSplit) ? '' : 'none';
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
function getTableColCount(table) {
  let max = 0;
  table.querySelectorAll('tr').forEach(tr => {
    let count = 0;
    tr.querySelectorAll('td,th').forEach(cell => { count += (cell.colSpan || 1); });
    if (count > max) max = count;
  });
  return max;
}

// ── COL/ROW RESIZE ───────────────────────────────────────────────────────────
function injectTableResizeHandles(table) {
  table.querySelectorAll('.tbl-col-resize-handle, .tbl-row-resize-handle').forEach(h => h.remove());

  const colCount = getTableColCount(table);
  let cg = table.querySelector('colgroup');
  if (!cg) {
    cg = document.createElement('colgroup');
    const firstRow = table.querySelector('tr');
    const firstCells = firstRow ? Array.from(firstRow.querySelectorAll('td,th')) : [];
    const hasInlineWidths = firstCells.length === colCount && firstCells.every(c => c.style.width);
    for (let i = 0; i < colCount; i++) {
      const col = document.createElement('col');
      if (hasInlineWidths) {
        col.style.width = firstCells[i].style.width;
      } else {
        const w = Math.floor(100 / colCount);
        col.style.width = (i === colCount - 1 ? 100 - w * (colCount - 1) : w) + '%';
      }
      cg.appendChild(col);
    }
    table.prepend(cg);
  }
  const cols = Array.from(cg.querySelectorAll('col'));

  table.querySelectorAll('tr').forEach(row => {
    const cells = Array.from(row.querySelectorAll('td,th'));
    let colPos = 0;
    cells.forEach((cell, idx) => {
      const span = cell.colSpan || 1;
      const isLastInRow = idx === cells.length - 1;

      if (!isLastInRow) {
        const rightColIdx = colPos + span - 1;
        const h = document.createElement('div');
        h.className = 'tbl-col-resize-handle';
        h.onpointerdown = (e) => {
          e.preventDefault(); e.stopPropagation();
          if (rightColIdx + 1 >= cols.length) return;
          const tableW = table.getBoundingClientRect().width || 1;
          const startX = e.clientX;
          const leftCol = cols[rightColIdx];
          const rightCol = cols[rightColIdx + 1];
          const startL = parseFloat(leftCol.style.width) || (100 / colCount);
          const startR = parseFloat(rightCol.style.width) || (100 / colCount);
          h.classList.add('is-dragging');
          document.body.style.cursor = 'col-resize';
          const onMove = (ev) => {
            const dPct = ((ev.clientX - startX) / tableW) * 100;
            leftCol.style.width = Math.max(3, startL + dPct) + '%';
            rightCol.style.width = Math.max(3, startR - dPct) + '%';
          };
          const onUp = () => {
            h.classList.remove('is-dragging');
            document.body.style.cursor = '';
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
            syncContentBlocksFromEditor();
          };
          document.addEventListener('pointermove', onMove);
          document.addEventListener('pointerup', onUp, { once: true });
        };
        cell.appendChild(h);
      }

      if (idx === 0) {
        const h = document.createElement('div');
        h.className = 'tbl-row-resize-handle';
        h.onpointerdown = (e) => {
          e.preventDefault(); e.stopPropagation();
          const startY = e.clientY;
          const startH = row.getBoundingClientRect().height;
          h.classList.add('is-dragging');
          document.body.style.cursor = 'row-resize';
          const onMove = (ev) => {
            row.style.height = Math.max(24, startH + (ev.clientY - startY)) + 'px';
          };
          const onUp = () => {
            h.classList.remove('is-dragging');
            document.body.style.cursor = '';
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
            syncContentBlocksFromEditor();
          };
          document.addEventListener('pointermove', onMove);
          document.addEventListener('pointerup', onUp, { once: true });
        };
        cell.appendChild(h);
      }

      colPos += span;
    });
  });
}

function tableAddRowAbove() {
  if (!_activeTableCell) return;
  const row = _activeTableCell.closest('tr');
  if (!row) return;
  const table = row.closest('table');
  const colCount = getTableColCount(table);
  const newRow = document.createElement('tr');
  for (let i = 0; i < colCount; i++) { const td = document.createElement('td'); td.innerHTML = '<br>'; newRow.appendChild(td); }
  row.parentNode.insertBefore(newRow, row);
  syncContentBlocksFromEditor();
  injectTableResizeHandles(table);
}

function tableAddRowBelow() {
  if (!_activeTableCell) return;
  const row = _activeTableCell.closest('tr');
  if (!row) return;
  const table = row.closest('table');
  const colCount = getTableColCount(table);
  const newRow = document.createElement('tr');
  for (let i = 0; i < colCount; i++) { const td = document.createElement('td'); td.innerHTML = '<br>'; newRow.appendChild(td); }
  row.parentNode.insertBefore(newRow, row.nextSibling);
  syncContentBlocksFromEditor();
  injectTableResizeHandles(table);
}

function tableDeleteRow() {
  if (!_activeTableCell) return;
  const row = _activeTableCell.closest('tr');
  if (!row) return;
  const table = row.closest('table');
  row.remove();
  if (table && !table.querySelectorAll('tr').length) { table.remove(); }
  else if (table) injectTableResizeHandles(table);
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
  const cg = table.querySelector('colgroup');
  if (cg) { const col = document.createElement('col'); col.style.width = '10%'; cg.insertBefore(col, cg.children[colIndex]); redistributeColWidths(cg); }
  syncContentBlocksFromEditor();
  injectTableResizeHandles(table);
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
  const cg = table.querySelector('colgroup');
  if (cg) { const col = document.createElement('col'); col.style.width = '10%'; cg.insertBefore(col, cg.children[colIndex + 1] || null); redistributeColWidths(cg); }
  syncContentBlocksFromEditor();
  injectTableResizeHandles(table);
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
  const cg = table.querySelector('colgroup');
  if (cg && cg.children[colIndex]) { cg.children[colIndex].remove(); redistributeColWidths(cg); }
  _activeTableCell = null;
  hideTableFloatToolbar();
  syncContentBlocksFromEditor();
  injectTableResizeHandles(table);
}

function redistributeColWidths(cg) {
  const cols = Array.from(cg.querySelectorAll('col'));
  if (!cols.length) return;
  const total = cols.reduce((s, c) => s + (parseFloat(c.style.width) || 0), 0) || 100;
  const scale = 100 / total;
  cols.forEach(c => { c.style.width = ((parseFloat(c.style.width) || 0) * scale).toFixed(2) + '%'; });
}

// ── CELL RANGE SELECTION ─────────────────────────────────────────────────────
function clearTableCellSelection() {
  _selectedTableCells.forEach(c => c.classList.remove('is-td-selected'));
  _selectedTableCells = [];
}

function selectTableCellRange(table, startCell, endCell) {
  const rows = Array.from(table.querySelectorAll('tr'));
  function getCellPos(cell) {
    const row = cell.parentElement;
    const rowIdx = rows.indexOf(row);
    const cells = Array.from(row.querySelectorAll('td,th'));
    return { row: rowIdx, col: cells.indexOf(cell) };
  }
  const sp = getCellPos(startCell);
  const ep = getCellPos(endCell);
  if (sp.row < 0 || ep.row < 0 || sp.col < 0 || ep.col < 0) return;
  const minRow = Math.min(sp.row, ep.row), maxRow = Math.max(sp.row, ep.row);
  const minCol = Math.min(sp.col, ep.col), maxCol = Math.max(sp.col, ep.col);
  document.querySelectorAll('.editor-table .is-td-selected').forEach(c => c.classList.remove('is-td-selected'));
  _selectedTableCells = [];
  for (let r = minRow; r <= maxRow; r++) {
    const rowCells = Array.from(rows[r].querySelectorAll('td,th'));
    for (let c = minCol; c <= maxCol; c++) {
      if (rowCells[c]) { rowCells[c].classList.add('is-td-selected'); _selectedTableCells.push(rowCells[c]); }
    }
  }
}

// ── MERGE CELLS ───────────────────────────────────────────────────────────────
function tableMergeCells() {
  if (_selectedTableCells.length < 2) return;
  const table = _selectedTableCells[0].closest('table');
  if (!table) return;
  const rows = Array.from(table.querySelectorAll('tr'));
  const positions = _selectedTableCells.map(cell => {
    const row = cell.parentElement;
    const rowIdx = rows.indexOf(row);
    const colIdx = Array.from(row.querySelectorAll('td,th')).indexOf(cell);
    return { cell, rowIdx, colIdx };
  });
  const minRow = Math.min(...positions.map(p => p.rowIdx));
  const maxRow = Math.max(...positions.map(p => p.rowIdx));
  const minCol = Math.min(...positions.map(p => p.colIdx));
  const maxCol = Math.max(...positions.map(p => p.colIdx));

  const firstCell = Array.from(rows[minRow].querySelectorAll('td,th'))[minCol];
  if (!firstCell) return;

  const contents = _selectedTableCells
    .map(c => c.innerHTML.replace(/^(<br\s*\/?>|\s)+|(<br\s*\/?>|\s)+$/gi, '').trim())
    .filter(c => c && c !== '<br>');

  firstCell.colSpan = maxCol - minCol + 1;
  firstCell.rowSpan = maxRow - minRow + 1;
  firstCell.innerHTML = contents.join(' ') || '<br>';

  _selectedTableCells.forEach(cell => { if (cell !== firstCell) cell.remove(); });
  clearTableCellSelection();
  _activeTableCell = firstCell;
  syncContentBlocksFromEditor();
  injectTableResizeHandles(table);
  showTableFloatToolbar(table);
}

// ── SPLIT CELL ────────────────────────────────────────────────────────────────
function tableSplitCell() {
  const cell = _activeTableCell;
  if (!cell) return;
  const colSpan = cell.colSpan || 1;
  const rowSpan = cell.rowSpan || 1;
  if (colSpan === 1 && rowSpan === 1) return;
  const table = cell.closest('table');
  const rows = Array.from(table.querySelectorAll('tr'));
  const row = cell.parentElement;
  const rowIdx = rows.indexOf(row);
  const colIdx = Array.from(row.querySelectorAll('td,th')).indexOf(cell);
  const borderStyle = cell.style.border || '';

  cell.colSpan = 1;
  cell.rowSpan = 1;

  for (let c = 1; c < colSpan; c++) {
    const newCell = document.createElement('td');
    newCell.innerHTML = '<br>';
    if (borderStyle) newCell.style.border = borderStyle;
    row.insertBefore(newCell, cell.nextSibling);
  }

  for (let r = 1; r < rowSpan; r++) {
    const targetRow = rows[rowIdx + r];
    if (!targetRow) continue;
    const targetCells = Array.from(targetRow.querySelectorAll('td,th'));
    const insertBefore = targetCells[colIdx] || null;
    for (let c = 0; c < colSpan; c++) {
      const newCell = document.createElement('td');
      newCell.innerHTML = '<br>';
      if (borderStyle) newCell.style.border = borderStyle;
      targetRow.insertBefore(newCell, insertBefore);
    }
  }

  syncContentBlocksFromEditor();
  injectTableResizeHandles(table);
  showTableFloatToolbar(table);
}

// ── TABLE BORDER STYLE ────────────────────────────────────────────────────────
function toggleTableBorderPicker() {
  let picker = document.getElementById('editor-table-border-picker');
  if (picker && picker.style.display !== 'none') { hideTableBorderPicker(); return; }

  if (!picker) {
    picker = document.createElement('div');
    picker.id = 'editor-table-border-picker';
    picker.className = 'editor-table-border-picker';
    picker.innerHTML =
      '<div class="tbp-label">Kiểu viền bảng</div>' +
      '<div class="tbp-options">' +
        '<button class="tbp-btn" title="Tất cả viền" onmousedown="event.preventDefault()" onclick="tableApplyBorderStyle(\'all\')">' +
          '<svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="3" y="3" width="22" height="22" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M3 10h22M3 18h22M10 3v22M18 3v22" stroke="currentColor" stroke-width="1.5"/></svg>' +
          '<span>Tất cả viền</span>' +
        '</button>' +
        '<button class="tbp-btn" title="Không viền" onmousedown="event.preventDefault()" onclick="tableApplyBorderStyle(\'none\')">' +
          '<svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="3" y="3" width="22" height="22" rx="2" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 2"/></svg>' +
          '<span>Không viền</span>' +
        '</button>' +
        '<button class="tbp-btn" title="Chỉ viền ngoài" onmousedown="event.preventDefault()" onclick="tableApplyBorderStyle(\'outer\')">' +
          '<svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="3" y="3" width="22" height="22" rx="2" stroke="currentColor" stroke-width="2"/></svg>' +
          '<span>Viền ngoài</span>' +
        '</button>' +
        '<button class="tbp-btn" title="Chỉ viền trong" onmousedown="event.preventDefault()" onclick="tableApplyBorderStyle(\'inner\')">' +
          '<svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="3" y="3" width="22" height="22" rx="2" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 2"/><path d="M3 10h22M3 18h22M10 3v22M18 3v22" stroke="currentColor" stroke-width="1.5"/></svg>' +
          '<span>Viền trong</span>' +
        '</button>' +
      '</div>';
    document.body.appendChild(picker);
  }

  const btn = document.getElementById('tft-border-btn');
  if (btn) {
    const rect = btn.getBoundingClientRect();
    picker.style.left = rect.left + 'px';
    picker.style.top = (rect.bottom + 6 + window.scrollY) + 'px';
  }
  picker.style.display = 'block';

  setTimeout(() => {
    const close = (e) => {
      if (!picker.contains(e.target) && e.target.id !== 'tft-border-btn') {
        hideTableBorderPicker();
        document.removeEventListener('mousedown', close);
      }
    };
    document.addEventListener('mousedown', close);
  }, 0);
}

function hideTableBorderPicker() {
  const picker = document.getElementById('editor-table-border-picker');
  if (picker) picker.style.display = 'none';
}

function tableApplyBorderStyle(style) {
  const cell = _activeTableCell || _selectedTableCells[0];
  if (!cell) return;
  const table = cell.closest('table');
  if (!table) return;
  const rows = Array.from(table.querySelectorAll('tr'));
  const totalRows = rows.length;
  const brd = '1px solid #cbd5e1';

  rows.forEach((row, rowIdx) => {
    const rowCells = Array.from(row.querySelectorAll('td,th'));
    const totalCols = rowCells.length;
    rowCells.forEach((c, colIdx) => {
      c.style.removeProperty('border');
      c.style.removeProperty('border-top');
      c.style.removeProperty('border-right');
      c.style.removeProperty('border-bottom');
      c.style.removeProperty('border-left');
      if (style === 'all') {
        c.style.border = brd;
      } else if (style === 'none') {
        c.style.border = 'none';
      } else if (style === 'outer') {
        c.style.borderTop    = rowIdx === 0             ? brd : 'none';
        c.style.borderBottom = rowIdx === totalRows - 1 ? brd : 'none';
        c.style.borderLeft   = colIdx === 0             ? brd : 'none';
        c.style.borderRight  = colIdx === totalCols - 1 ? brd : 'none';
      } else if (style === 'inner') {
        c.style.borderTop    = rowIdx === 0             ? 'none' : brd;
        c.style.borderBottom = rowIdx === totalRows - 1 ? 'none' : brd;
        c.style.borderLeft   = colIdx === 0             ? 'none' : brd;
        c.style.borderRight  = colIdx === totalCols - 1 ? 'none' : brd;
      }
    });
  });

  syncContentBlocksFromEditor();
  hideTableBorderPicker();
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
  initStickyPreview();
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
  const host = document.getElementById('content-composer-host');
  if (host) normalizeIndentTokensInElement(host);
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
  _editingVocabIndex = -1;
  _vocabItems = Array.isArray(q.vocabulary) ? [...q.vocabulary] : [];

  let skillSection = '';
  if (q.skill === 'composite') {
    _cqSections = Array.isArray(q.sections) ? q.sections.map(s => ({
      label: s.label || '',
      skill: s.skill || '',
      time_limit_minutes: s.time_limit_minutes ?? null,
      questions_data: s.questions_data || [],
      content_blocks: s.content_blocks || [],
      content_text: s.content_text || '',
      content_url: s.content_url || null,
      content_urls: s.content_urls || [],
      script: s.script || '',
      vocabulary: s.vocabulary || [],
      _id: s.id,
    })) : [];
    _cqEditingIdx = -1;
    skillSection = `<div id="cq-sections-ui"></div>`;
  } else if (q.skill === 'reading') {
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
        ${speakerRenameSectionHtml()}
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
            <option value="composite" ${q.skill === 'composite' ? 'selected' : ''}>📋 Tổng hợp</option>
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

  if (q.skill === 'composite') {
    renderCQSectionsUI();
    attachChipListeners();
    return;
  }

  if (q.skill === 'reading' || q.skill === 'listening') {
    renderVocabList();
    syncVocabEditorState();
  }

  if (q.skill === 'listening') {
    _speakerNames = [];
    _refreshSpeakerNames();
    _renderSpeakerRenameUI();
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

  const restored = restoreQuestionDraftIntoForm('edit', q.id, q.skill);
  startQuestionDraftAutosave('edit', q.id, q.skill);
  syncVocabEditorState();
  if (restored) toast('Đã khôi phục bản nháp chưa lưu trong 15 phút gần nhất.', 'info');
}

function renderAnswerGridWithData(questionsData) {
  const grid = $('#answer-grid');
  if (!grid) return;
  const countInput = $('#answer-count');
  if (countInput) countInput.value = questionsData.length;
  grid.innerHTML = '';
  questionsData.forEach((q, idx) => {
    grid.appendChild(_createAnswerRow(idx + 1, q));
  });
  attachChipListeners();
}

async function submitQuestionEdit(id, btn) {
  const title   = $('#q-title')?.value.trim();
  const skill   = $('#q-skill')?.value;

  if (!title) { toast('Vui lòng nhập tiêu đề', 'error'); return; }

  const tags = getChipValues($('#q-tags-chip-edit'));

  if (skill === 'composite') {
    _saveCQCurrentEditorState();
    if (_cqEditingIdx >= 0) { toast('Vui lòng lưu phần đang chỉnh sửa trước', 'warning'); return; }
    if (_cqSections.length === 0) { toast('Vui lòng thêm ít nhất 1 phần thi', 'error'); return; }
    for (let i = 0; i < _cqSections.length; i++) {
      if (!_cqSections[i].label.trim()) { toast(`Phần ${i+1}: Chưa đặt tên`, 'error'); return; }
      if (!_cqSections[i].skill) { toast(`Phần ${i+1}: Chưa chọn kỹ năng`, 'error'); return; }
    }
    btnLoading(btn);
    try {
      await api.patch(`/questions/${id}`, {
        title,
        tags,
        sections: _cqSections.map(s => ({
          _id: s._id || null,
          label: s.label,
          skill: s.skill,
          time_limit_minutes: s.time_limit_minutes || null,
          questions_data: s.questions_data || [],
          content_blocks: s.content_blocks || [],
          content_text: s.content_text || null,
          content_url: s.content_url || null,
          content_urls: s.content_urls || [],
          script: s.script || null,
        })),
      });
      toast('Đã lưu thay đổi! ✓');
      navigate('/questions');
    } catch (e) {
      btnReset(btn);
      toast('Lỗi lưu: ' + (e.error || e.message), 'error');
    }
    return;
  }

  if (_contentImageUploadCount > 0) { toast('Ảnh đang upload, vui lòng đợi xong rồi lưu', 'warning'); return; }

  const contentBlocks = normalizeContentBlocksForEditor(_contentBlocks);
  const content = blocksToPlainText(contentBlocks) || null;

  let questions_data = [];
  if (skill === 'reading' || skill === 'listening') {
    questions_data = collectAnswerGrid();
    const emptyQnos = checkEmptyAnswers();
    if (emptyQnos.length > 0) {
      confirmSaveWithEmptyAnswers(emptyQnos, () => submitQuestionEdit(id, btn));
      return;
    }
  }

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
    stopQuestionDraftAutosave();
    clearQuestionDraft(getQuestionDraftKey('edit', id));
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

// Multi-audio slot state: each item = {displayName, file, url, key, name, size, status:'idle'|'uploading'|'done'|'error', pct, eta, transcript: undefined|null|string}
// transcript: undefined = chưa transcribe, null = đang transcribe, string = xong (kể cả rỗng nếu lỗi)
function _newAudioSlot() { return { displayName: '', file: null, name: '', size: 0, status: 'idle', url: null, key: null, pct: 0, eta: null, transcript: undefined }; }
let _audioSlots = [_newAudioSlot()];
let _audioFiles = _audioSlots; // legacy alias
let _audioUploading = false;
let _scriptTranscribing = false;
let _sttModel = 'diarize';      // 'mini' | 'diarize'
let _speakerNames = [];         // [{original:'A', replace:''}, ...]
let _audioFile = null, _audioUploadUrl = null, _audioUploadKey = null, _audioUploadName = '', _audioUploadSize = 0;
let _vocabItems = [];
let _editingVocabIndex = -1;
let _pendingLocationRow = null;

function vocabSectionHtml() {
  return `
    <div class="form-group" style="margin-top:20px">
      <label class="form-label">Từ vựng <span style="font-size:12px;font-weight:400;color:var(--gray-400)">(tùy chọn — học sinh xem sau khi nộp bài)</span></label>
      <div class="vocab-add-row">
        <input id="vocab-word"    class="form-input" placeholder="Từ vựng"         style="flex:1;min-width:0" />
        <input id="vocab-def"     class="form-input" placeholder="Định nghĩa"       style="flex:2;min-width:0" />
        <input id="vocab-pronunciation" class="form-input" placeholder="Phiên âm (tùy chọn)" style="flex:1.5;min-width:0" />
        <input id="vocab-collocation" class="form-input" placeholder="Collocation (tùy chọn)" style="flex:2;min-width:0" />
        <input id="vocab-example" class="form-input" placeholder="Ví dụ (tùy chọn)" style="flex:2;min-width:0" />
        <button id="vocab-submit-btn" class="btn btn-primary btn-sm" onclick="addVocabItem()">+ Thêm</button>
        <button id="vocab-cancel-btn" class="btn btn-outline btn-sm hidden" onclick="cancelVocabEdit()">Hủy sửa</button>
      </div>
      <div class="vocab-list-heading">Danh sách từ vựng</div>
      <div id="vocab-list" class="vocab-list"></div>
    </div>`;
}

function syncVocabEditorState() {
  const submitBtn = $('#vocab-submit-btn');
  const cancelBtn = $('#vocab-cancel-btn');
  if (submitBtn) submitBtn.textContent = _editingVocabIndex >= 0 ? 'Lưu sửa' : '+ Thêm';
  if (cancelBtn) cancelBtn.classList.toggle('hidden', _editingVocabIndex < 0);
}

function resetVocabInputs() {
  if ($('#vocab-word')) $('#vocab-word').value = '';
  if ($('#vocab-def')) $('#vocab-def').value = '';
  if ($('#vocab-pronunciation')) $('#vocab-pronunciation').value = '';
  if ($('#vocab-collocation')) $('#vocab-collocation').value = '';
  if ($('#vocab-example')) $('#vocab-example').value = '';
}

function cancelVocabEdit() {
  _editingVocabIndex = -1;
  resetVocabInputs();
  syncVocabEditorState();
  scheduleQuestionDraftSave();
}

function addVocabItem() {
  const word = $('#vocab-word')?.value.trim();
  const def  = $('#vocab-def')?.value.trim();
  const pronunciation = $('#vocab-pronunciation')?.value.trim() || '';
  const collocation = $('#vocab-collocation')?.value.trim() || '';
  const ex   = $('#vocab-example')?.value.trim() || '';
  if (!word || !def) { toast('Nhập từ vựng và định nghĩa', 'warning'); return; }
  const item = {
    word,
    definition: def,
    ...(pronunciation && { pronunciation }),
    ...(collocation && { collocation }),
    ...(ex && { example: ex }),
  };
  if (_editingVocabIndex >= 0 && _vocabItems[_editingVocabIndex]) {
    _vocabItems[_editingVocabIndex] = item;
  } else {
    _vocabItems.push(item);
  }
  _editingVocabIndex = -1;
  resetVocabInputs();
  renderVocabList();
  syncVocabEditorState();
  scheduleQuestionDraftSave();
}

function removeVocabItem(idx) {
  _vocabItems.splice(idx, 1);
  if (_editingVocabIndex === idx) {
    _editingVocabIndex = -1;
    resetVocabInputs();
  } else if (_editingVocabIndex > idx) {
    _editingVocabIndex -= 1;
  }
  renderVocabList();
  syncVocabEditorState();
  scheduleQuestionDraftSave();
}

function editVocabItem(idx) {
  const item = _vocabItems[idx];
  if (!item) return;
  _editingVocabIndex = idx;
  if ($('#vocab-word')) $('#vocab-word').value = item.word || '';
  if ($('#vocab-def')) $('#vocab-def').value = item.definition || '';
  if ($('#vocab-pronunciation')) $('#vocab-pronunciation').value = item.pronunciation || '';
  if ($('#vocab-collocation')) $('#vocab-collocation').value = item.collocation || '';
  if ($('#vocab-example')) $('#vocab-example').value = item.example || '';
  syncVocabEditorState();
  const wordInput = $('#vocab-word');
  wordInput?.closest('.vocab-add-row')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  wordInput?.focus();
  scheduleQuestionDraftSave();
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
      ${v.pronunciation ? `<span class="vocab-pronunciation">${escapeHtml(v.pronunciation)}</span>` : ''}
      ${v.collocation ? `<span class="vocab-collocation">${escapeHtml(v.collocation)}</span>` : ''}
      ${v.example ? `<span class="vocab-example">${escapeHtml(v.example)}</span>` : ''}
      <div class="vocab-actions">
        <button class="vocab-edit" onclick="editVocabItem(${i})">Sửa</button>
        <button class="vocab-remove" onclick="removeVocabItem(${i})" aria-label="Xoá từ vựng">×</button>
      </div>
    </div>`).join('');
}

function showQuestionForm() {
  _audioSlots = [_newAudioSlot()]; _audioFiles = _audioSlots;
  _audioFile = null; _audioUploadUrl = null; _audioUploadKey = null; _audioUploadName = ''; _audioUploadSize = 0;
  _audioUploading = false;
  _editingVocabIndex = -1;
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
            <option value="composite">📋 Tổng hợp (nhiều kỹ năng)</option>
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
  const restored = restoreQuestionDraftIntoForm('new');
  startQuestionDraftAutosave('new');
  syncVocabEditorState();
  if (restored) toast('Đã khôi phục bản nháp chưa lưu trong 15 phút gần nhất.', 'info');
}

function onSkillChange(skill) {
  _vocabItems = [];
  _editingVocabIndex = -1;
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

  if (skill === 'composite') {
    _cqSections = [];
    _cqEditingIdx = -1;
    renderCQSectionsUI();
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
        ${sttSelectorHtml()}
        <div id="script-loading" class="script-loading hidden">
          <span class="btn-spinner btn-spinner--dark"></span> <span id="script-loading-msg">Đang trích xuất script...</span>
        </div>
        <textarea id="listening-script" class="form-textarea listening-script-editor" rows="8"
          placeholder="Script sẽ tự động điền sau khi upload audio v2. Bạn cũng có thể nhập thủ công."></textarea>
        ${speakerRenameSectionHtml()}
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
        <button type="button" class="btn-add-row" onclick="addAnswerRow()">+ Thêm câu</button>
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

function sttSelectorHtml() {
  return `<div id="stt-selector" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:8px;padding:8px 10px;background:var(--bg-secondary);border-radius:8px;font-size:13px">
    <span style="font-weight:600;color:var(--gray-600)">Model:</span>
    <label style="display:flex;align-items:center;gap:4px;cursor:pointer">
      <input type="radio" name="stt-model" value="diarize" ${_sttModel==='diarize'?'checked':''} onchange="setSttModel('diarize')">
      <span>Diarize <span style="color:var(--gray-400);font-size:11px">(có Speaker ID, tối đa 5 phút)</span></span>
    </label>
    <label style="display:flex;align-items:center;gap:4px;cursor:pointer">
      <input type="radio" name="stt-model" value="mini" ${_sttModel==='mini'?'checked':''} onchange="setSttModel('mini')">
      <span>Mini <span style="color:var(--gray-400);font-size:11px">(nhanh, không giới hạn)</span></span>
    </label>
  </div>`;
}

function setSttModel(val) { _sttModel = val; }

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
      ? `<button class="remove-audio-slot" onclick="removeAudioSlot(${i})" title="Xoá slot" aria-label="Xoá audio slot">×</button>`
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

const SUPPORTED_AUDIO_EXTS = new Set(['mp3','mp4','mpeg','mpga','m4a','ogg','oga','wav','wave','webm','flac','aac','aif','aiff']);

// Read first 2 bytes to detect raw AAC ADTS stream (FF F1 = MPEG-4, FF F9 = MPEG-2).
// These cannot be decoded by OpenAI Whisper — must be converted to MP3 first.
async function isRawAacFile(file) {
  const buf = await file.slice(0, 2).arrayBuffer();
  const b = new Uint8Array(buf);
  return b[0] === 0xFF && (b[1] === 0xF1 || b[1] === 0xF9);
}

function showUnsupportedAudioWarning(fileName, ext) {
  openModal('⚠️ Định dạng audio không được hỗ trợ', `
    <div style="line-height:1.7">
      <p>File <strong>${escapeHtml(fileName)}</strong> có định dạng <strong>.${escapeHtml(ext)}</strong> không được hỗ trợ.</p>
      <p style="margin-top:8px">Các định dạng được hỗ trợ: <strong>mp3, m4a, wav, ogg, webm, flac, aac, aiff, mp4</strong></p>
      <p style="margin-top:12px">Vui lòng <strong>convert sang MP3</strong> trước khi upload. Một số cách nhanh:</p>
      <ul style="margin:8px 0 0 18px;font-size:14px">
        <li>Windows/macOS: dùng <a href="https://www.ffmpeg.org/" target="_blank">FFmpeg</a>: <code>ffmpeg -i input.${escapeHtml(ext)} output.mp3</code></li>
        <li>Online: <a href="https://cloudconvert.com/audio-converter" target="_blank">cloudconvert.com/audio-converter</a></li>
      </ul>
    </div>
    <div style="margin-top:20px;text-align:right">
      <button class="btn btn-primary" onclick="document.getElementById('modal-overlay').classList.add('hidden')">Đã hiểu</button>
    </div>`);
}

function showRawAacWarning(fileName) {
  openModal('⚠️ Định dạng audio không được hỗ trợ', `
    <div style="line-height:1.7">
      <p>File <strong>${escapeHtml(fileName)}</strong> là <strong>raw AAC ADTS stream</strong> — định dạng này không được OpenAI Whisper hỗ trợ và sẽ bị lỗi khi transcribe.</p>
      <p style="margin-top:12px">Vui lòng <strong>convert sang MP3</strong> trước khi upload. Một số cách nhanh:</p>
      <ul style="margin:8px 0 0 18px;font-size:14px">
        <li>macOS: mở bằng <em>QuickTime Player</em> → File → Export As → Audio Only (xuất ra .m4a), rồi dùng <a href="https://cloudconvert.com/m4a-to-mp3" target="_blank">CloudConvert</a> để chuyển sang .mp3</li>
        <li>Windows: dùng <a href="https://www.ffmpeg.org/" target="_blank">FFmpeg</a>: <code>ffmpeg -i input.aac output.mp3</code></li>
        <li>Online: <a href="https://cloudconvert.com/aac-to-mp3" target="_blank">cloudconvert.com/aac-to-mp3</a></li>
      </ul>
    </div>
    <div style="margin-top:20px;text-align:right">
      <button class="btn btn-primary" onclick="document.getElementById('modal-overlay').classList.add('hidden')">Đã hiểu</button>
    </div>`);
}

async function onSlotFileSelected(input, idx) {
  const file = input.files?.[0];
  if (!file || !_audioSlots[idx]) return;
  input.value = '';
  const ext = file.name.split('.').pop().toLowerCase();
  if (!SUPPORTED_AUDIO_EXTS.has(ext)) { showUnsupportedAudioWarning(file.name, ext); return; }
  if (await isRawAacFile(file)) { showRawAacWarning(file.name); return; }
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
  if (_audioSlots.some(s => s.status === 'uploading')) return;
  // Only transcribe slots that just finished uploading (transcript === undefined)
  const newSlots = _audioSlots.filter(s => s.status === 'done' && s.transcript === undefined);
  for (const slot of newSlots) {
    slot.transcript = null; // mark as in-progress so we don't queue it twice
    _transcribeSlot(slot);
  }
}

async function _transcribeSlot(slot) {
  const scriptEl = $('#listening-script');
  const loadingEl = $('#script-loading');
  if (loadingEl) loadingEl.classList.remove('hidden');
  try {
    const result = await transcribeListeningScript({ key: slot.key, model: _sttModel });
    slot.transcript = result?.text || '';
    slot.transcriptFallback = result?.fallback || false;
    slot.transcriptModel = result?.modelUsed || _sttModel;
    slot.transcriptDuration = result?.durationSeconds || 0;
    _renderCombinedTranscript();
    const dur = slot.transcriptDuration;
    const durStr = dur > 0 ? ` (${Math.floor(dur/60)}:${String(dur%60).padStart(2,'0')})` : '';
    if (result?.fallback) {
      openModal('Đã tự động dùng Mini model', `<p style="margin:0 0 8px;line-height:1.6">"${escapeHtml(slot.displayName || slot.name)}"${durStr} dài hơn 5 phút — Diarize không hỗ trợ.</p><p style="margin:0;line-height:1.6">Đã dùng <strong>Mini model</strong> thay thế (không có Speaker ID).</p>`);
    }
  } catch (e) {
    slot.transcript = '';
    toast(`Không thể transcribe "${slot.displayName || slot.name}": ${e.error || e.message}`, 'error');
  } finally {
    if (!_audioSlots.some(s => s.transcript === null)) {
      if (loadingEl) loadingEl.classList.add('hidden');
    }
  }
}

function _renderCombinedTranscript() {
  const scriptEl = $('#listening-script');
  if (!scriptEl) return;
  const done = _audioSlots.filter(s => typeof s.transcript === 'string' && s.transcript !== '');
  if (done.length === 0) return;
  if (done.length === 1) {
    scriptEl.value = done[0].transcript;
  } else {
    scriptEl.value = done.map(s => `--- Transcript: ${s.displayName || s.name} ---\n${s.transcript}`).join('\n\n\n');
  }
  _refreshSpeakerNames();
  _renderSpeakerRenameUI();
}

function speakerRenameSectionHtml() {
  return `<div id="speaker-rename-section" style="display:none;margin-top:8px;padding:10px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
      <span style="font-size:12px;font-weight:600;color:var(--gray-500);letter-spacing:.3px">SPEAKER RENAME</span>
      <div style="display:flex;gap:6px;">
        <button type="button" onclick="addSpeakerRow()" style="font-size:12px;padding:3px 10px;border:1px solid var(--border);border-radius:5px;background:transparent;color:var(--text);cursor:pointer;line-height:1.5">+ Thêm</button>
        <button type="button" onclick="applySpeakerRenames()" style="font-size:12px;padding:3px 12px;border:none;border-radius:5px;background:var(--primary);color:#fff;cursor:pointer;font-weight:600;line-height:1.5">Replace →</button>
      </div>
    </div>
    <div id="speaker-rename-list" style="display:flex;flex-direction:column;gap:4px;"></div>
  </div>`;
}

function _parseSpeakersFromTranscript(text) {
  const seen = new Set();
  const speakers = [];
  for (const line of text.split('\n')) {
    const m = line.match(/^([^:\n]+?):\s/);
    if (m && !seen.has(m[1])) { seen.add(m[1]); speakers.push(m[1]); }
  }
  return speakers;
}

function _nextSpeakerLabel() {
  const used = new Set(_speakerNames.map(s => s.original));
  for (const l of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') { if (!used.has(l)) return l; }
  return '?';
}

function _hasSpeakerPattern(text) {
  return /^[A-Za-z][^:\n]*:\s/m.test(text);
}

function _refreshSpeakerNames() {
  const scriptEl = $('#listening-script');
  if (!scriptEl || !_hasSpeakerPattern(scriptEl.value)) return;
  const found = _parseSpeakersFromTranscript(scriptEl.value);
  const existingMap = new Map(_speakerNames.map(s => [s.original, s]));
  _speakerNames = found.map(sp => existingMap.get(sp) || { original: sp, replace: '' });
  if (_speakerNames.length === 0) {
    _speakerNames = [{ original: 'A', replace: '' }, { original: 'B', replace: '' }];
  }
}

function _renderSpeakerRenameUI() {
  const section = $('#speaker-rename-section');
  if (!section) return;
  const scriptEl = $('#listening-script');
  const hasPattern = scriptEl && _hasSpeakerPattern(scriptEl.value);
  if (!hasPattern) { section.style.display = 'none'; return; }
  section.style.display = '';
  const list = $('#speaker-rename-list');
  if (!list) return;
  const inp = 'padding:4px 8px;border:1px solid var(--border);border-radius:5px;font-size:13px;background:var(--surface,var(--bg-subtle));color:var(--text);outline:none;width:100%';
  list.innerHTML = _speakerNames.map((s, i) => `
    <div style="display:flex;align-items:center;gap:6px;">
      <input type="text" value="${escapeHtml(s.original)}" oninput="_speakerNames[${i}].original=this.value" style="${inp};max-width:120px;flex:0 0 120px">
      <span style="color:var(--gray-400);font-size:13px;flex-shrink:0">→</span>
      <input type="text" value="${escapeHtml(s.replace)}" oninput="_speakerNames[${i}].replace=this.value" placeholder="Tên mới..." style="${inp};flex:1">
      <button type="button" onclick="_removeSpeakerRow(${i})" style="flex-shrink:0;border:none;background:none;color:var(--gray-400);cursor:pointer;font-size:15px;padding:2px 4px;line-height:1" title="Xóa">×</button>
    </div>`).join('');
}

function addSpeakerRow() {
  _speakerNames.push({ original: _nextSpeakerLabel(), replace: '' });
  _renderSpeakerRenameUI();
}

function _removeSpeakerRow(idx) {
  _speakerNames.splice(idx, 1);
  _renderSpeakerRenameUI();
}

function applySpeakerRenames() {
  const scriptEl = $('#listening-script');
  if (!scriptEl) return;
  const toRename = _speakerNames.filter(s => s.replace.trim());
  if (toRename.length === 0) { toast('Chưa điền tên mới', 'warning'); return; }
  let text = scriptEl.value;
  for (const s of toRename) {
    const escaped = s.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    text = text.replace(new RegExp(`^${escaped}:`, 'gm'), `${s.replace}:`);
  }
  scriptEl.value = text;
  for (const s of _speakerNames) {
    if (s.replace.trim()) { s.original = s.replace; s.replace = ''; }
  }
  _renderSpeakerRenameUI();
  toast('Đã đổi tên speaker', 'success');
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

// Direct synchronous call — returns result object. Throws on error.
async function transcribeListeningScript({ key, model }) {
  return await api.post('/questions/transcribe-audio', { key, model });
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
  const tags = getChipValues($('#q-tags-chip'));

  if (!title) { toast('Vui lòng nhập tiêu đề', 'error'); return; }
  if (!skill)  { toast('Vui lòng chọn kỹ năng', 'error'); return; }

  // Handle composite question
  if (skill === 'composite') {
    if (_cqEditingIdx >= 0) { toast('Vui lòng lưu phần đang chỉnh sửa trước', 'warning'); return; }
    if (_cqSections.length === 0) { toast('Vui lòng thêm ít nhất 1 phần thi', 'error'); return; }
    for (let i = 0; i < _cqSections.length; i++) {
      if (!_cqSections[i].label.trim()) { toast(`Phần ${i+1}: Chưa đặt tên`, 'error'); return; }
      if (!_cqSections[i].skill) { toast(`Phần ${i+1}: Chưa chọn kỹ năng`, 'error'); return; }
    }
    btnLoading(btn);
    try {
      await api.post('/questions', {
        title,
        skill: 'composite',
        tags,
        sections: _cqSections.map(s => ({
          label: s.label,
          skill: s.skill,
          time_limit_minutes: s.time_limit_minutes || null,
          questions_data: s.questions_data || [],
          content_blocks: s.content_blocks || [],
          content_text: s.content_text || '',
          content_url: s.content_url || null,
          content_urls: s.content_urls || [],
          script: s.script || '',
        })),
      });
      stopQuestionDraftAutosave();
      clearQuestionDraft(getQuestionDraftKey('new'));
      toast('Đã lưu đề tổng hợp vào kho! 🎉');
      navigate('/questions');
    } catch (e) {
      btnReset(btn);
      toast('Lỗi lưu đề: ' + (e.error || e.message), 'error');
    }
    return;
  }

  const contentBlocks = normalizeContentBlocksForEditor(_contentBlocks);
  const content = blocksToPlainText(contentBlocks) || '';
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
    const emptyQnos = checkEmptyAnswers();
    if (emptyQnos.length > 0) {
      confirmSaveWithEmptyAnswers(emptyQnos, () => submitQuestion(btn));
      return;
    }
  }
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

    stopQuestionDraftAutosave();
    clearQuestionDraft(getQuestionDraftKey('new'));
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
    await api.delete(`/student-classes?student_id=${studentId}&class_id=${classId}`);
    toast('Đã xoá học sinh khỏi lớp');
    showClassDetail({ id: classId });
  } catch (e) {
    btnReset(btn);
    toast('Lỗi: ' + (e.error || e.message), 'error');
    return;
  }
  btnReset(btn);
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
            <td><button class="btn-icon danger" onclick="deleteProfileField('${f.id}')" aria-label="Xoá trường hồ sơ">🗑</button></td>
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
  scheduleQuestionDraftSave();
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

  document.body.appendChild(popup);
  const popupWidth = popup.offsetWidth || 320;
  const popupHeight = popup.offsetHeight || 118;

  // Position below selection, clamped to real popup size and viewport width.
  const lcpVw = window.visualViewport?.width ?? window.innerWidth;
  const lcpVh = window.visualViewport?.height ?? window.innerHeight;
  const spaceBelow = lcpVh - rect.bottom;
  const top = spaceBelow >= popupHeight + 12 ? rect.bottom + 8 : rect.top - popupHeight - 8;
  const maxLeft = Math.max(8, lcpVw - popupWidth - 8);
  const left = Math.min(Math.max(previewRect.left + 4, rect.left), maxLeft);
  popup.style.top  = `${Math.max(8, top)}px`;
  popup.style.left = `${Math.max(8, left)}px`;

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
  scheduleQuestionDraftSave();
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
window.editAnnotation          = editAnnotation;
window.saveAnnotation          = saveAnnotation;
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
// ── Teacher Auth Gate ─────────────────────────────────────────────────────

function renderLoginGate(errorMsg = '') {
  document.getElementById('sidebar').style.display = 'none';
  document.getElementById('mobile-hamburger').style.display = 'none';
  document.getElementById('app').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:80vh">
      <div style="width:100%;max-width:360px;padding:32px;border:1px solid var(--border);border-radius:12px;background:var(--bg-card)">
        <div style="text-align:center;margin-bottom:24px">
          <span style="font-size:2rem">🎓</span>
          <h2 style="margin:8px 0 4px;font-size:1.25rem">English Teacher Portal</h2>
          <p style="color:var(--text-muted);font-size:.875rem">Nhập mật khẩu để truy cập</p>
        </div>
        ${errorMsg ? `<div style="color:#ef4444;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:8px 12px;margin-bottom:16px;font-size:.875rem">${errorMsg}</div>` : ''}
        <form id="login-gate-form" onsubmit="submitLoginGate(event)">
          <div style="position:relative;margin-bottom:12px">
            <input id="gate-password" type="password" placeholder="Mật khẩu" autocomplete="current-password"
              style="width:100%;padding:10px 40px 10px 12px;border:1px solid var(--border);border-radius:6px;background:var(--bg);color:var(--text);font-size:1rem;box-sizing:border-box" />
            <button type="button" onclick="toggleGatePassword()"
              style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:1rem;padding:0;line-height:1"
              id="gate-eye-btn" title="Hiện/ẩn mật khẩu">👁</button>
          </div>
          <button type="submit" id="gate-submit-btn"
            style="width:100%;padding:10px;background:var(--primary);color:#fff;border:none;border-radius:6px;font-size:1rem;cursor:pointer">
            Đăng nhập
          </button>
        </form>
      </div>
    </div>`;
  document.getElementById('gate-password').focus();
}

const TEACHER_AUTH_FLAG = 'teacher_auth_ok';

function expireTeacherSession(errorMsg = '') {
  api.clearCache();
  api.setAuthToken('');
  sessionStorage.removeItem(TEACHER_AUTH_FLAG);
  history.replaceState(null, '', window.location.pathname);
  document.getElementById('sidebar').style.display = 'none';
  document.getElementById('mobile-hamburger').style.display = 'none';
  renderLoginGate(errorMsg);
}

async function submitLoginGate(e) {
  e.preventDefault();
  const btn = document.getElementById('gate-submit-btn');
  const password = document.getElementById('gate-password').value;
  btn.disabled = true;
  btn.textContent = 'Đang kiểm tra...';
  try {
    await fetch(api._base + '/teacher-auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
      credentials: 'include',
    }).then(async res => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Sai mật khẩu');
      if (!data?.token) throw new Error('Không nhận được token đăng nhập');
      api.setAuthToken(data.token);
    });
    sessionStorage.setItem(TEACHER_AUTH_FLAG, '1');
    document.getElementById('sidebar').style.display = '';
    document.getElementById('mobile-hamburger').style.display = '';
    refreshInboxBadge();
    router();
  } catch (err) {
    renderLoginGate(err.message || 'Sai mật khẩu');
  }
}

async function logout() {
  await fetch(api._base + '/teacher-auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
  expireTeacherSession();
}

async function boot() {
  pruneTeacherQuestionDrafts();
  try {
    const res = await fetch(api._base + '/teacher-auth/status', {
      headers: api._authHeaders(),
      credentials: 'include',
    });
    const { authenticated } = await res.json();
    if (!authenticated) { expireTeacherSession(); return; }
    sessionStorage.setItem(TEACHER_AUTH_FLAG, '1');
  } catch {
    renderLoginGate('Không kết nối được server');
    return;
  }
  refreshInboxBadge();
  router();
}

function toggleGatePassword() {
  const input = document.getElementById('gate-password');
  const btn   = document.getElementById('gate-eye-btn');
  if (!input) return;
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  btn.textContent = isHidden ? '🙈' : '👁';
}

// ─── Shared Pool (Kho đề luyện tập) ─────────────────────────────────────────

let _sharedQuestions = [];
let _sharedSearch = '';
let _sharedSkillFilter = '';

async function showSharedPool() {
  try {
    _sharedQuestions = await api.get('/shared-pool');
  } catch (e) {
    renderRouteError('Không tải được kho đề luyện tập', e, '/shared-pool');
    return;
  }
  renderSharedPool();
}

function renderSharedPool() {
  let filtered = _sharedSkillFilter
    ? _sharedQuestions.filter(q => q.skill === _sharedSkillFilter)
    : _sharedQuestions;
  if (_sharedSearch) {
    const s = _sharedSearch.toLowerCase();
    filtered = filtered.filter(q =>
      q.title.toLowerCase().includes(s) ||
      (Array.isArray(q.tags) && q.tags.some(t => t.toLowerCase().includes(s)))
    );
  }

  const existingTbody = $('#app')?.querySelector('.shared-pool-tbody');
  if (existingTbody) {
    existingTbody.innerHTML = _buildSharedPoolRows(filtered);
    document.querySelectorAll('.shared-skill-tab').forEach(btn =>
      btn.classList.toggle('active', btn.dataset.skill === _sharedSkillFilter));
    return;
  }

  $('#app').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Kho đề luyện tập</div>
        <div class="page-subtitle">Tổng cộng ${_sharedQuestions.length} đề — tự động hiển thị cho tất cả học sinh</div>
      </div>
      <button class="btn btn-primary" onclick="navigate('/shared-pool/new')">+ Tạo đề mới</button>
    </div>
    <div class="list-toolbar">
      <input id="shared-search-input" class="form-input search-input"
        placeholder="🔍 Tìm theo tên đề hoặc tag..."
        value="${escapeHtml(_sharedSearch)}" />
    </div>
    <div class="skill-tabs">
      ${[['','Tất cả'],['reading','📖 Reading'],['listening','🎧 Listening'],
         ['writing','✍️ Writing'],['speaking','🎤 Speaking']].map(([s,l]) =>
        `<button class="skill-tab shared-skill-tab ${_sharedSkillFilter===s?'active':''}" data-skill="${s}" onclick="setSharedSkillFilter('${s}')">${l}</button>`
      ).join('')}
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Kỹ năng</th><th>Tiêu đề</th><th>Tags</th>
          <th>Thời gian</th><th>Lượt làm</th><th>Ngày tạo</th><th>Thao tác</th>
        </tr></thead>
        <tbody class="shared-pool-tbody">${_buildSharedPoolRows(filtered)}</tbody>
      </table>
    </div>`;

  const inp = document.getElementById('shared-search-input');
  if (inp) {
    inp.addEventListener('input', () => { _sharedSearch = inp.value; renderSharedPool(); });
    if (_sharedSearch) inp.focus();
  }
}

function _buildSharedPoolRows(list) {
  if (!list.length) return '<tr><td colspan="7" style="text-align:center;color:var(--gray-400);padding:32px">Chưa có đề nào.</td></tr>';
  return list.map(q => `
    <tr>
      <td>${skillBadge(q.skill)}</td>
      <td><a onclick="navigate('/shared-pool/${q.id}')" style="cursor:pointer;color:var(--primary)">${escapeHtml(q.title)}</a></td>
      <td>${Array.isArray(q.tags)&&q.tags.length ? q.tags.map(t=>`<span class="tag-chip">${escapeHtml(t)}</span>`).join(' ') : '<span style="color:var(--gray-300)">—</span>'}</td>
      <td>${q.time_limit_minutes ? `${q.time_limit_minutes} phút` : '<span style="color:var(--gray-300)">—</span>'}</td>
      <td>${q.attempt_count || 0}</td>
      <td>${formatDate(q.created_at)}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-sm btn-outline" onclick="showSharedPoolStats('${q.id}','${escapeHtml(q.title)}')">📊 Thống kê</button>
        <button class="btn btn-sm btn-outline" onclick="navigate('/shared-pool/${q.id}')">✏️ Sửa</button>
        <button class="btn btn-sm btn-outline" style="color:var(--red)" onclick="deleteSharedQuestion('${q.id}','${escapeHtml(q.title)}')">🗑</button>
      </td>
    </tr>`).join('');
}

function setSharedSkillFilter(s) { _sharedSkillFilter = s; renderSharedPool(); }
window.setSharedSkillFilter = setSharedSkillFilter;

async function deleteSharedQuestion(id, title) {
  if (!confirm(`Xoá đề "${title}" khỏi Kho đề luyện tập?`)) return;
  try {
    await api.delete(`/shared-pool/${id}`);
    _sharedQuestions = _sharedQuestions.filter(q => q.id !== id);
    renderSharedPool();
    toast('Đã xoá đề', 'success');
  } catch (e) { toast('Lỗi xoá đề: ' + (e.error || e.message), 'error'); }
}
window.deleteSharedQuestion = deleteSharedQuestion;

// ─── Shared Pool Stats Modal ────────────────────────────────────────────────

let _sharedStatsModal = null;
let _sharedStatsChart = null;
let _sharedStatsRows = [];
let _sharedStatsMode = 'avg';

async function showSharedPoolStats(id, title) {
  if (_sharedStatsModal) { _sharedStatsModal.remove(); _sharedStatsModal = null; }
  if (_sharedStatsChart) { try { _sharedStatsChart.destroy(); } catch {} _sharedStatsChart = null; }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal modal-wide" onclick="event.stopPropagation()">
      <div class="modal-header">
        <h3>📊 Thống kê: ${escapeHtml(title)}</h3>
        <button class="modal-close" onclick="closeSharedStatsModal()" aria-label="Đóng">×</button>
      </div>
      <div class="modal-body sp-stats-body">
        <div style="text-align:center;padding:40px 0"><div class="spinner"></div><p style="color:var(--gray-400);margin-top:12px">Đang tải thống kê...</p></div>
      </div>
    </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) closeSharedStatsModal(); });
  document.body.appendChild(overlay);
  _sharedStatsModal = overlay;

  let rows;
  try {
    rows = await api.get(`/shared-pool/${id}/stats`);
  } catch (e) {
    overlay.querySelector('.sp-stats-body').innerHTML =
      `<p style="color:var(--red);text-align:center">Lỗi tải thống kê: ${escapeHtml(e.error || e.message)}</p>`;
    return;
  }

  _sharedStatsRows = rows;
  _sharedStatsMode = 'avg';
  _renderSharedStatsBody(overlay.querySelector('.sp-stats-body'));
}

function closeSharedStatsModal() {
  if (_sharedStatsChart) { try { _sharedStatsChart.destroy(); } catch {} _sharedStatsChart = null; }
  if (_sharedStatsModal) { _sharedStatsModal.remove(); _sharedStatsModal = null; }
}

function _groupSharedStatsByStudent(rows) {
  const studentMap = new Map();
  for (const r of rows) {
    if (!studentMap.has(r.student_id)) {
      studentMap.set(r.student_id, {
        student_id: r.student_id,
        student_name: r.student_name || '',
        class_names: r.class_names || '—',
        attempts: [],
      });
    }
    studentMap.get(r.student_id).attempts.push(r);
  }
  const students = [...studentMap.values()];
  for (const st of students) {
    const scores = st.attempts.map(a => a.overall_score).filter(s => s != null).map(Number);
    st.avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    st.max = scores.length ? Math.max(...scores) : null;
    st.count = st.attempts.length;
  }
  return students;
}

function _renderSharedStatsBody(bodyEl) {
  const rows = _sharedStatsRows;
  const students = _groupSharedStatsByStudent(rows);
  const allScores = rows.map(r => r.overall_score).filter(s => s != null).map(Number);

  const mean = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  const median = arr => {
    if (!arr.length) return null;
    const s = [...arr].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  const fmt = v => v != null ? Number(v).toFixed(1) : '—';

  bodyEl.innerHTML = `
    <div class="sp-stats-summary">
      <div class="sp-stats-kpi"><div class="sp-stats-kpi-val">${rows.length}</div><div class="sp-stats-kpi-lbl">Tổng lượt làm</div></div>
      <div class="sp-stats-kpi"><div class="sp-stats-kpi-val">${students.length}</div><div class="sp-stats-kpi-lbl">Học sinh</div></div>
      <div class="sp-stats-kpi"><div class="sp-stats-kpi-val">${fmt(mean(allScores))}</div><div class="sp-stats-kpi-lbl">Điểm TB</div></div>
      <div class="sp-stats-kpi"><div class="sp-stats-kpi-val">${fmt(allScores.length ? Math.max(...allScores) : null)}</div><div class="sp-stats-kpi-lbl">Cao nhất</div></div>
      <div class="sp-stats-kpi"><div class="sp-stats-kpi-val">${fmt(allScores.length ? Math.min(...allScores) : null)}</div><div class="sp-stats-kpi-lbl">Thấp nhất</div></div>
      <div class="sp-stats-kpi"><div class="sp-stats-kpi-val">${fmt(median(allScores))}</div><div class="sp-stats-kpi-lbl">Trung vị</div></div>
    </div>

    <div class="sp-stats-chart-section">
      <div class="sp-stats-chart-header">
        <span class="sp-stats-section-title">Phổ điểm</span>
        <div class="sp-stats-mode-toggle">
          <button class="sp-stats-mode-btn ${_sharedStatsMode === 'avg' ? 'active' : ''}" onclick="setSharedStatsMode('avg')">Trung bình / HS</button>
          <button class="sp-stats-mode-btn ${_sharedStatsMode === 'max' ? 'active' : ''}" onclick="setSharedStatsMode('max')">Điểm cao nhất / HS</button>
        </div>
      </div>
      <div class="sp-stats-chart-wrap">
        <canvas id="sp-stats-chart"></canvas>
      </div>
    </div>

    <div class="sp-stats-section-title" style="margin:20px 0 10px">Kết quả từng học sinh</div>
    ${students.length === 0
      ? '<p style="color:var(--gray-400);text-align:center;padding:24px 0">Chưa có học sinh nào làm bài.</p>'
      : `<div class="sp-stats-table-wrap">
          <table class="sp-stats-table">
            <thead><tr>
              <th>Học sinh</th><th>Lớp</th><th>Số lần</th>
              <th>Điểm TB</th><th>Cao nhất</th><th></th>
            </tr></thead>
            <tbody>
              ${students.map(st => `
                <tr class="sp-stats-student-row" data-sid="${st.student_id}">
                  <td>
                    <span class="sp-stats-avatar">${escapeHtml((st.student_name || '?').charAt(0).toUpperCase())}</span>
                    ${escapeHtml(st.student_name)}
                  </td>
                  <td class="sp-stats-cell-muted">${escapeHtml(st.class_names)}</td>
                  <td>${st.count}</td>
                  <td><span class="stats-score-badge">${fmt(st.avg)}</span></td>
                  <td><span class="stats-score-badge">${fmt(st.max)}</span></td>
                  <td>
                    <button class="btn btn-sm btn-outline sp-expand-btn"
                      onclick="toggleSharedStudentDetail('${st.student_id}')">Chi tiết ▾</button>
                  </td>
                </tr>
                <tr class="sp-stats-detail-row hidden" id="sp-detail-${st.student_id}">
                  <td colspan="6" style="padding:0 0 0 40px">
                    <div class="sp-stats-detail-inner">
                      <table class="sp-stats-detail-table">
                        <thead><tr><th>#</th><th>Chế độ</th><th>Ngày nộp</th><th>Điểm</th></tr></thead>
                        <tbody>
                          ${[...st.attempts].sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at)).map((a, i) => `
                            <tr>
                              <td>${i + 1}</td>
                              <td>${a.mode === 'real_test' ? '🎯 Thi thật' : '📝 Luyện tập'}</td>
                              <td>${formatDateTime(a.submitted_at)}</td>
                              <td><span class="stats-score-badge">${a.overall_score != null ? Number(a.overall_score).toFixed(1) : '—'}</span></td>
                            </tr>`).join('')}
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`}
    <div style="display:flex;justify-content:flex-end;margin-top:20px;padding-top:16px;border-top:1px solid var(--border)">
      <button class="btn btn-outline" onclick="closeSharedStatsModal()">Đóng</button>
    </div>
  `;

  _buildSharedStatsChart(students);
}

function _buildSharedStatsChart(students) {
  if (_sharedStatsChart) { try { _sharedStatsChart.destroy(); } catch {} _sharedStatsChart = null; }
  const canvas = document.getElementById('sp-stats-chart');
  if (!canvas) return;

  const scores = students
    .map(s => _sharedStatsMode === 'avg' ? s.avg : s.max)
    .filter(s => s != null)
    .map(Number);

  // Bucket into IELTS half-bands: 1.0, 1.5, ..., 9.0 → 17 buckets
  const buckets = [];
  for (let b = 1; b <= 9; b += 0.5) buckets.push(b);
  const counts = new Array(buckets.length).fill(0);
  for (const s of scores) {
    const rounded = Math.round(s * 2) / 2; // snap to nearest 0.5
    const idx = buckets.indexOf(Math.min(9, Math.max(1, rounded)));
    if (idx >= 0) counts[idx]++;
  }

  const colors = buckets.map(b => {
    if (b >= 7) return { bg: '#16a34a99', border: '#16a34a' };
    if (b >= 5) return { bg: '#ca8a0499', border: '#ca8a04' };
    return { bg: '#dc262699', border: '#dc2626' };
  });

  _sharedStatsChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: buckets.map(b => b % 1 === 0 ? String(b) : b.toFixed(1)),
      datasets: [{
        label: _sharedStatsMode === 'avg' ? 'Điểm TB / HS' : 'Điểm cao nhất / HS',
        data: counts,
        backgroundColor: colors.map(c => c.bg),
        borderColor: colors.map(c => c.border),
        borderWidth: 1,
        borderRadius: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: ctx => `Band ${ctx[0].label}`,
            label: ctx => `${ctx.raw} học sinh`,
          },
        },
      },
      scales: {
        x: { title: { display: true, text: 'Band IELTS' }, grid: { display: false } },
        y: { title: { display: true, text: 'Số học sinh' }, beginAtZero: true, ticks: { stepSize: 1 } },
      },
    },
  });
}

function setSharedStatsMode(mode) {
  _sharedStatsMode = mode;
  document.querySelectorAll('.sp-stats-mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.includes(mode === 'avg' ? 'Trung bình' : 'Cao nhất'));
  });
  _buildSharedStatsChart(_groupSharedStatsByStudent(_sharedStatsRows));
}

function toggleSharedStudentDetail(studentId) {
  const row = document.getElementById(`sp-detail-${studentId}`);
  const btn = document.querySelector(`.sp-stats-student-row[data-sid="${studentId}"] .sp-expand-btn`);
  if (!row) return;
  const nowHidden = row.classList.toggle('hidden');
  if (btn) btn.textContent = nowHidden ? 'Chi tiết ▾' : 'Thu gọn ▴';
}

window.showSharedPoolStats = showSharedPoolStats;
window.closeSharedStatsModal = closeSharedStatsModal;
window.setSharedStatsMode = setSharedStatsMode;
window.toggleSharedStudentDetail = toggleSharedStudentDetail;

// ─── Shared Pool Form (create / edit) ──────────────────────────────────────

let _sharedEditingId = null;

async function showSharedPoolForm() {
  _sharedEditingId = null;
  _vocabItems = [];
  _contentBlocks = [createTextBlock('')];
  _audioSlots = [_newAudioSlot()]; _audioFiles = _audioSlots;
  _audioFile = null; _audioUploadUrl = null; _audioUploadKey = null;
  _audioUploadName = ''; _audioUploadSize = 0; _audioUploading = false;
  _editingVocabIndex = -1;
  renderSharedPoolFormPage('Tạo đề luyện tập mới', null);
  const restored = restoreSpDraftIntoForm('new');
  startSpDraftAutosave('new');
  if (restored) toast('Đã khôi phục bản nháp chưa lưu trong 15 phút gần nhất.', 'info');
}

async function showSharedPoolDetail({ id }) {
  let q;
  try { q = await api.get(`/shared-pool/${id}`); } catch (e) {
    renderRouteError('Không tải được đề', e, '/shared-pool'); return;
  }
  _sharedEditingId = id;
  _vocabItems = Array.isArray(q.vocabulary) ? [...q.vocabulary] : [];
  _contentBlocks = Array.isArray(q.content_blocks) && q.content_blocks.length
    ? q.content_blocks : [createTextBlock(q.content_text || '')];
  _audioSlots = [_newAudioSlot()]; _audioFiles = _audioSlots;
  _audioFile = null; _audioUploadUrl = q.content_url || null;
  _audioUploadKey = null; _audioUploadName = ''; _audioUploadSize = 0; _audioUploading = false;
  _editingVocabIndex = -1;
  renderSharedPoolFormPage('Sửa đề luyện tập', q);
  const restored = restoreSpDraftIntoForm('edit', id, q.skill);
  startSpDraftAutosave('edit', id, q.skill);
  if (restored) toast('Đã khôi phục bản nháp chưa lưu trong 15 phút gần nhất.', 'info');

  // Load and show stats dashboard below form
  try {
    const stats = await api.get(`/shared-pool/${id}/stats`);
    renderSharedPoolStats(stats, id);
  } catch (_) {}
}

function renderSharedPoolFormPage(pageTitle, q) {
  const skill = q?.skill || '';
  $('#app').innerHTML = `
    <a class="back-link" onclick="navigate('/shared-pool')">← Kho đề luyện tập</a>
    <div class="page-header"><div class="page-title">${escapeHtml(pageTitle)}</div></div>
    <div class="form-card">
      <div class="form-group">
        <label class="form-label">Tiêu đề <span class="required">*</span></label>
        <input id="sp-title" class="form-input" placeholder="Tên đề..." value="${escapeHtml(q?.title||'')}" />
      </div>
      <div style="display:flex;gap:16px;flex-wrap:wrap">
        <div class="form-group" style="flex:1;min-width:180px">
          <label class="form-label">Kỹ năng <span class="required">*</span></label>
          <select id="sp-skill" class="form-input" onchange="onSharedSkillChange(this.value)">
            <option value="">-- Chọn kỹ năng --</option>
            ${['reading','listening','writing','speaking'].map(s =>
              `<option value="${s}" ${skill===s?'selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group" style="flex:0 0 160px">
          <label class="form-label">Thời gian kiểm tra (phút)</label>
          <input id="sp-time-limit" class="form-input" type="number" min="1" max="999"
            placeholder="Không giới hạn" value="${q?.time_limit_minutes||''}" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Tags</label>
        <div id="sp-tags-chip" class="chip-input-container">
          <input id="sp-tag-input" class="chip-input" placeholder="Nhập tag rồi Enter..." />
        </div>
      </div>
      <div id="sp-skill-form"></div>
      <div class="form-actions">
        <button class="btn btn-outline" onclick="navigate(_sharedEditingId ? '/shared-pool/'+_sharedEditingId : '/shared-pool')">Huỷ</button>
        <button id="sp-submit-btn" class="btn btn-primary" onclick="submitSharedPoolQuestion()">
          ${_sharedEditingId ? 'Lưu thay đổi' : 'Tạo đề'}
        </button>
      </div>
    </div>
    <div id="sp-stats-section"></div>`;

  // Populate tags
  if (Array.isArray(q?.tags)) q.tags.forEach(t => addChip($('#sp-tags-chip'), t));
  attachChipListeners($('#sp-tag-input'), $('#sp-tags-chip'));

  if (skill) onSharedSkillChange(skill, q);
}

function onSharedSkillChange(skill, q) {
  const container = $('#sp-skill-form');
  if (!container) return;
  if (!skill) { container.innerHTML = ''; return; }

  let html = '';
  if (skill === 'reading') {
    html = `${contentComposerHtml('Nội dung đề')}${answerGridHtml()}${vocabSectionHtml()}`;
  } else if (skill === 'listening') {
    html = `
      <div class="form-group"><label class="form-label">File Audio <span style="color:var(--danger)">*</span></label>${audioUploadHtml()}</div>
      <div class="form-group" id="script-section">
        <label class="form-label">Script Listening</label>
        <textarea id="listening-script" class="form-textarea listening-script-editor" rows="8"
          placeholder="Script...">${escapeHtml(q?.script || '')}</textarea>
      </div>
      ${contentComposerHtml('Câu hỏi (text)')}${answerGridHtml()}${vocabSectionHtml()}`;
  } else if (skill === 'writing') {
    html = `${contentComposerHtml('Đề bài Writing')}<div class="form-hint-box">ℹ️ Writing là tự luận — không cần nhập đáp án mẫu.</div>`;
  } else if (skill === 'speaking') {
    html = `${contentComposerHtml('Câu hỏi / Cue Card')}<div class="form-hint-box">ℹ️ Speaking — học sinh sẽ upload file audio.</div>`;
  }

  container.innerHTML = html;
  initContentComposer(q?.content_blocks || [], q?.content_text || '');

  if ((skill === 'reading' || skill === 'listening') && Array.isArray(q?.questions_data) && q.questions_data.length) {
    renderAnswerGridWithData(q.questions_data);
  } else {
    const countInput = $('#answer-count');
    if (countInput) countInput.addEventListener('input', () => {
      const n = parseInt(countInput.value) || 0;
      if (n > 0 && n <= 100) renderAnswerGrid(n);
    });
  }

  if (Array.isArray(q?.vocabulary)) { _vocabItems = [...q.vocabulary]; renderVocabList(); }

  if (skill === 'listening') { attachAudioUpload(); _renderAudioSlots(); }
}
window.onSharedSkillChange = onSharedSkillChange;

async function submitSharedPoolQuestion() {
  const title = $('#sp-title')?.value.trim();
  const skill  = $('#sp-skill')?.value;
  const timeLimitRaw = $('#sp-time-limit')?.value.trim();
  const timeLimit = timeLimitRaw ? parseInt(timeLimitRaw, 10) : null;
  if (!title) { toast('Vui lòng nhập tiêu đề', 'error'); return; }
  if (!skill)  { toast('Vui lòng chọn kỹ năng', 'error'); return; }
  if (_contentImageUploadCount > 0) { toast('Ảnh đang upload, vui lòng đợi xong rồi lưu', 'warning'); return; }
  if (skill === 'listening' && _audioSlots.filter(s => s.status === 'done').length === 0 && !_sharedEditingId) {
    toast('Vui lòng upload ít nhất 1 file audio', 'error'); return;
  }

  const btn = $('#sp-submit-btn');
  btnLoading(btn);
  try {
    const tags = getChipValues($('#sp-tags-chip'));
    const contentBlocks = normalizeContentBlocksForEditor(_contentBlocks);
    const content_text  = blocksToPlainText(contentBlocks) || '';

    let body = { title, skill, content_blocks: contentBlocks, content_text, vocabulary: _vocabItems, tags };
    if (timeLimit) body.time_limit_minutes = timeLimit;

    if (skill === 'reading' || skill === 'listening') {
      body.questions_data = collectAnswerGrid();
    }
    if (skill === 'listening') {
      const doneSlots = _audioSlots.filter(s => s.status === 'done');
      if (doneSlots.length > 0) {
        body.content_url  = doneSlots[0]?.url || null;
        body.content_urls = doneSlots.map(s => ({ url: s.url, key: s.key, name: s.displayName || s.name }));
      }
      body.script = ($('#listening-script')?.value || '').trim() || null;
    }

    if (_sharedEditingId) {
      await api.patch(`/shared-pool/${_sharedEditingId}`, body);
      stopSpDraftAutosave();
      clearQuestionDraft(getSpDraftKey('edit', _sharedEditingId));
      toast('Đã lưu thay đổi', 'success');
    } else {
      await api.post('/shared-pool', body);
      stopSpDraftAutosave();
      clearQuestionDraft(getSpDraftKey('new'));
      toast('Đã tạo đề luyện tập! 🎉', 'success');
    }
    navigate('/shared-pool');
  } catch (e) {
    btnReset(btn);
    toast('Lỗi lưu đề: ' + (e.error || e.message), 'error');
  }
}
window.submitSharedPoolQuestion = submitSharedPoolQuestion;

function renderSharedPoolStats(stats, poolId) {
  const el = $('#sp-stats-section');
  if (!el) return;
  el.innerHTML = `
    <div class="page-header" style="margin-top:32px">
      <div class="page-title" style="font-size:18px">📊 Thống kê lượt làm</div>
    </div>
    ${stats.length === 0
      ? '<p style="color:var(--gray-400)">Chưa có học sinh nào làm đề này.</p>'
      : `<div class="table-wrap"><table>
          <thead><tr>
            <th>Học sinh</th><th>Lớp</th><th>Mode</th>
            <th>Điểm</th><th>Thời gian nộp</th>
          </tr></thead>
          <tbody>${stats.map(s => `
            <tr>
              <td>${escapeHtml(s.full_name||s.username)}</td>
              <td>${escapeHtml(s.class_names||'—')}</td>
              <td><span class="badge ${s.mode==='real_test'?'badge-red':'badge-blue'}">${s.mode==='real_test'?'Thi thử':'Luyện tập'}</span></td>
              <td>${s.overall_score != null ? `${s.overall_score}${s.max_score?'/'+s.max_score:''}` : '—'}</td>
              <td>${formatDate(s.submitted_at)}</td>
            </tr>`).join('')}
          </tbody></table></div>`
    }`;
}

window.showSharedPool       = showSharedPool;
window.showSharedPoolForm   = showSharedPoolForm;
window.showSharedPoolDetail = showSharedPoolDetail;

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSITE QUESTION BUILDER (kho đề)
// ═══════════════════════════════════════════════════════════════════════════

// Each section: { label, skill, time_limit_minutes, questions_data, content_blocks, content_text, content_url, content_urls, script, vocabulary }
let _cqSections = [];
let _cqEditingIdx = -1;

function _cqSkillIcon(s) { return { reading:'📖', listening:'🎧', writing:'✍️', speaking:'🎤' }[s] || ''; }
function _cqSkillLabel(s) { return { reading:'Reading', listening:'Listening', writing:'Writing', speaking:'Speaking' }[s] || s; }

function _newCQSection() {
  return { label: '', skill: '', time_limit_minutes: null, questions_data: [], content_blocks: [], content_text: '', content_url: null, content_urls: [], script: '', vocabulary: [] };
}

function _saveCQCurrentEditorState() {
  if (_cqEditingIdx < 0 || !_cqSections[_cqEditingIdx]) return;
  const sec = _cqSections[_cqEditingIdx];
  sec.label = document.getElementById('cq-label')?.value.trim() ?? sec.label;
  sec.time_limit_minutes = (() => { const v = document.getElementById('cq-time')?.value; return v ? Number(v) : null; })();
  const blocks = normalizeContentBlocksForEditor(_contentBlocks);
  sec.content_blocks = blocks;
  sec.content_text = blocksToPlainText(blocks) || '';
  if (sec.skill === 'reading' || sec.skill === 'listening') {
    sec.questions_data = collectAnswerGrid ? collectAnswerGrid() : [];
  }
  if (sec.skill === 'listening') {
    const doneSlots = _audioSlots.filter(s => s.status === 'done');
    sec.content_url   = doneSlots[0]?.url || null;
    sec.content_urls  = doneSlots.map(s => ({ url: s.url, key: s.key, name: s.displayName || s.name, filename: s.name }));
    sec.script = document.getElementById('listening-script')?.value.trim() ?? sec.script;
  }
  sec.vocabulary = Array.isArray(_vocabItems) ? [..._vocabItems] : [];
}

function _loadCQSectionIntoEditor(idx) {
  const sec = _cqSections[idx];
  _contentBlocks = (sec.content_blocks || []).map(b => ({ ...b }));
  _vocabItems = Array.isArray(sec.vocabulary) ? [...sec.vocabulary] : [];
  _editingVocabIndex = -1;
  if (sec.skill === 'listening') {
    const slots = (sec.content_urls?.length ? sec.content_urls : (sec.content_url ? [{ url: sec.content_url, key: null, name: 'audio' }] : []));
    _audioSlots = slots.map(s => ({ displayName: s.name || '', file: null, name: s.filename || s.name || '', size: 0, status: 'done', url: s.url, key: s.key || null, pct: 100, eta: null }));
    if (_audioSlots.length === 0) _audioSlots = [_newAudioSlot()];
    _audioFiles = _audioSlots;
    _audioUploading = false;
  }
}

function renderCQSectionsUI() {
  const section = document.getElementById('skill-section');
  if (!section) return;
  const isEditing = _cqEditingIdx >= 0;

  const listHtml = _cqSections.map((sec, idx) => {
    if (idx === _cqEditingIdx) return '';
    const summary = [sec.skill ? `${_cqSkillIcon(sec.skill)} ${_cqSkillLabel(sec.skill)}` : '',
      sec.time_limit_minutes ? `⏱ ${sec.time_limit_minutes} phút` : '',
      (sec.skill === 'reading' || sec.skill === 'listening') && sec.questions_data?.length ? `${sec.questions_data.length} câu` : ''
    ].filter(Boolean).join(' · ');
    return `<div class="cq-section-card" style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border:1px solid var(--border);border-radius:8px;margin-bottom:6px;background:var(--bg-card)">
      <div>
        <span style="font-weight:600;font-size:14px">${idx + 1}. ${escapeHtml(sec.label || '(Chưa đặt tên)')}</span>
        ${summary ? `<span style="font-size:12px;color:var(--gray-400);margin-left:8px">${summary}</span>` : ''}
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-sm btn-outline" onclick="editCQSection(${idx})">✏️ Sửa</button>
        <button class="btn-icon danger" onclick="removeCQSection(${idx})" aria-label="Xoá phần này">×</button>
      </div>
    </div>`;
  }).join('');

  let editorHtml = '';
  if (isEditing) {
    const sec = _cqSections[_cqEditingIdx];
    let skillContentHtml = '';
    if (sec.skill === 'reading') {
      skillContentHtml = `${contentComposerHtml('Nội dung đề (Bài đọc + Câu hỏi)')}
        <div id="location-pick-hint" class="location-pick-hint hidden"></div>
        ${answerGridHtml()}`;
    } else if (sec.skill === 'listening') {
      skillContentHtml = `<div class="form-group"><label class="form-label">File Audio <span style="color:var(--danger)">*</span></label>${audioUploadHtml()}</div>
        <div class="form-group" id="script-section">
          <label class="form-label">Script Listening</label>
          ${sttSelectorHtml()}
          <div id="script-loading" class="script-loading hidden"><span class="btn-spinner btn-spinner--dark"></span> <span id="script-loading-msg">Đang trích xuất script...</span></div>
          <textarea id="listening-script" class="form-textarea listening-script-editor" rows="6"
            placeholder="Script tự động điền sau khi upload audio">${escapeHtml(sec.script||'')}</textarea>
          ${speakerRenameSectionHtml()}
        </div>
        ${contentComposerHtml('Câu hỏi (text)')}
        <div id="location-pick-hint" class="location-pick-hint hidden"></div>
        ${answerGridHtml()}`;
    } else if (sec.skill === 'writing') {
      skillContentHtml = `${contentComposerHtml('Đề bài Writing')}`;
    } else if (sec.skill === 'speaking') {
      skillContentHtml = `${contentComposerHtml('Câu hỏi / Cue Card')}`;
    }

    editorHtml = `
      <div class="cq-editor-panel" style="border:2px solid var(--primary);border-radius:10px;padding:16px;margin-bottom:10px;background:var(--bg-card)">
        <div style="font-weight:700;font-size:14px;margin-bottom:12px;color:var(--primary)">
          ✏️ Chỉnh sửa phần ${_cqEditingIdx + 1}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px">
          <div>
            <label class="form-label" style="font-size:12px">Tên phần *</label>
            <input id="cq-label" class="form-input" value="${escapeHtml(sec.label)}" placeholder="VD: Bài đọc 1" />
          </div>
          <div>
            <label class="form-label" style="font-size:12px">Kỹ năng *</label>
            <select id="cq-skill" class="form-select" onchange="onCQSkillChange(this.value)">
              <option value="">— Chọn —</option>
              <option value="reading" ${sec.skill==='reading'?'selected':''}>📖 Reading</option>
              <option value="listening" ${sec.skill==='listening'?'selected':''}>🎧 Listening</option>
              <option value="writing" ${sec.skill==='writing'?'selected':''}>✍️ Writing</option>
              <option value="speaking" ${sec.skill==='speaking'?'selected':''}>🎤 Speaking</option>
            </select>
          </div>
          <div>
            <label class="form-label" style="font-size:12px">Thời gian (phút)</label>
            <input id="cq-time" class="form-input" type="number" min="1" max="300"
              value="${sec.time_limit_minutes ?? ''}" placeholder="Không giới hạn" />
          </div>
        </div>
        <div id="cq-skill-content">${sec.skill ? skillContentHtml : '<div style="color:var(--gray-400);font-size:13px;padding:12px;text-align:center">Chọn kỹ năng để hiển thị form</div>'}</div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">
          <button class="btn btn-outline" onclick="cancelCQEdit()">Hủy</button>
          <button class="btn btn-primary" onclick="saveCQSection()">💾 Lưu phần này</button>
        </div>
      </div>`;
  }

  section.innerHTML = `
    <div style="margin-bottom:10px;font-weight:600;font-size:14px">Các phần thi <span style="color:var(--danger)">*</span></div>
    ${editorHtml}
    <div id="cq-list">${listHtml || (!isEditing ? '<div style="text-align:center;padding:20px;color:var(--gray-400);border:2px dashed var(--border);border-radius:8px">Nhấn "+ Thêm kỹ năng" để bắt đầu</div>' : '')}</div>
    ${!isEditing ? '<button class="btn btn-outline" style="margin-top:10px" onclick="addCQSection()">+ Thêm kỹ năng</button>' : ''}
  `;

  if (isEditing) {
    const sec = _cqSections[_cqEditingIdx];
    initContentComposer(sec.content_blocks || [], '');
    if (sec.skill === 'listening') {
      attachAudioUpload();
      _renderAudioSlots();
    }
    if (sec.skill === 'reading' || sec.skill === 'listening') {
      if (sec.questions_data?.length > 0) {
        renderAnswerGridWithData(sec.questions_data);
      }
      const countInput = document.getElementById('answer-count');
      if (countInput) {
        countInput.addEventListener('input', () => {
          const n = parseInt(countInput.value) || 0;
          if (n > 0 && n <= 100) renderAnswerGrid(n);
        });
      }
    }
    renderVocabList && renderVocabList();
    syncVocabEditorState && syncVocabEditorState();
  }
}
window.renderCQSectionsUI = renderCQSectionsUI;

function addCQSection() {
  _saveCQCurrentEditorState();
  _cqSections.push(_newCQSection());
  _cqEditingIdx = _cqSections.length - 1;
  // Reset global state for new empty section
  _contentBlocks = [];
  _vocabItems = [];
  _editingVocabIndex = -1;
  _audioSlots = [_newAudioSlot()]; _audioFiles = _audioSlots;
  _audioUploading = false;
  renderCQSectionsUI();
}
window.addCQSection = addCQSection;

function editCQSection(idx) {
  _saveCQCurrentEditorState();
  _cqEditingIdx = idx;
  _loadCQSectionIntoEditor(idx);
  renderCQSectionsUI();
}
window.editCQSection = editCQSection;

function saveCQSection() {
  const labelEl = document.getElementById('cq-label');
  if (!labelEl || !labelEl.value.trim()) { toast('Vui lòng đặt tên phần thi', 'error'); return; }
  const skillEl = document.getElementById('cq-skill');
  if (!skillEl?.value) { toast('Vui lòng chọn kỹ năng', 'error'); return; }
  _cqSections[_cqEditingIdx].skill = skillEl.value;
  _saveCQCurrentEditorState();
  _cqEditingIdx = -1;
  _contentBlocks = [];
  _vocabItems = [];
  _audioSlots = [_newAudioSlot()]; _audioFiles = _audioSlots;
  renderCQSectionsUI();
}
window.saveCQSection = saveCQSection;

function cancelCQEdit() {
  if (_cqSections[_cqEditingIdx]?.skill === '') {
    _cqSections.splice(_cqEditingIdx, 1);
  }
  _cqEditingIdx = -1;
  _contentBlocks = [];
  _vocabItems = [];
  _audioSlots = [_newAudioSlot()]; _audioFiles = _audioSlots;
  renderCQSectionsUI();
}
window.cancelCQEdit = cancelCQEdit;

function removeCQSection(idx) {
  if (_cqEditingIdx === idx) { _cqEditingIdx = -1; _contentBlocks = []; _vocabItems = []; _audioSlots = [_newAudioSlot()]; _audioFiles = _audioSlots; }
  else if (_cqEditingIdx > idx) _cqEditingIdx--;
  _cqSections.splice(idx, 1);
  renderCQSectionsUI();
}
window.removeCQSection = removeCQSection;

function onCQSkillChange(skill) {
  if (_cqEditingIdx < 0) return;
  _saveCQCurrentEditorState();
  _cqSections[_cqEditingIdx].skill = skill;
  _cqSections[_cqEditingIdx].questions_data = [];
  _cqSections[_cqEditingIdx].content_blocks = [];
  _cqSections[_cqEditingIdx].content_url = null;
  _cqSections[_cqEditingIdx].content_urls = [];
  _cqSections[_cqEditingIdx].script = '';
  _contentBlocks = [];
  _vocabItems = [];
  _audioSlots = [_newAudioSlot()]; _audioFiles = _audioSlots;
  _audioUploading = false;
  renderCQSectionsUI();
}
window.onCQSkillChange = onCQSkillChange;

// ── Composite submissions page ────────────────────────────────────────────────

async function showCompositeSubmissions({ id }) {
  setLoading('Đang tải đề tổng hợp...');
  try {
    const data = await api.get(`/assignments/${id}/composite-submissions`);
    renderCompositeSubmissions(data);
  } catch (e) {
    renderRouteError('Không tải được dữ liệu', e, '/classes');
  }
}
window.showCompositeSubmissions = showCompositeSubmissions;

function renderCompositeSubmissions({ assignment, sections, perStudent }) {
  const composite = assignment; // compatibility alias
  const compositeAssignmentId = assignment?.id || '';
  const skillIcons = { reading:'📖', listening:'🎧', writing:'✍️', speaking:'🎤' };
  const totalSecs = sections.length;
  const studentRows = perStudent.length === 0
    ? `<tr><td colspan="${totalSecs + 2}" style="text-align:center;padding:24px;color:var(--gray-400)">Lớp chưa có học sinh</td></tr>`
    : perStudent.map(s => {
        const sectionCells = sections.map(sec => {
          const sub = s.sections.find(ss => ss.section_id === sec.id)?.submission;
          if (!sub) return `<td style="text-align:center;color:var(--gray-400)">—</td>`;
          const score = sub.score != null
            ? `<span style="font-weight:700;color:var(--primary)">${sub.score}/9</span>`
            : `<span style="color:var(--gray-400);font-size:12px">${sec.skill === 'reading' || sec.skill === 'listening' ? '—' : 'Chờ chấm'}</span>`;
          const overtimeBadge = sub.is_overtime ? `<span class="stats-overtime-pill" style="display:block;font-size:10px;margin-top:2px">OT</span>` : '';
          const viewBtn = (sec.skill === 'writing' || sec.skill === 'speaking')
            ? `<button class="btn btn-sm btn-outline" style="font-size:11px;padding:2px 6px;margin-top:2px"
                onclick="navigate('/grading/${sub.id}')">Chấm</button>` : '';
          return `<td style="text-align:center">${score}${overtimeBadge}${viewBtn}</td>`;
        }).join('');
        return `<tr>
          <td>
            <div style="font-weight:600">${escapeHtml(s.full_name)}</div>
            <div style="font-size:11px;color:var(--gray-400);font-family:monospace">${escapeHtml(s.username)}</div>
          </td>
          ${sectionCells}
          <td style="text-align:center;font-size:12px;color:var(--gray-400)">
            ${s.sections.filter(ss => ss.submission).length}/${totalSecs} phần
          </td>
        </tr>`;
      }).join('');

  $('#app').innerHTML = `
    <nav class="breadcrumb">
      <a class="breadcrumb-item" onclick="navigate('/classes')">Lớp học</a>
      <span class="breadcrumb-sep">›</span>
      <a class="breadcrumb-item" onclick="navigate('/class/${composite.class_id || ''}')">Lớp</a>
      <span class="breadcrumb-sep">›</span>
      <span class="breadcrumb-item active">${escapeHtml(composite.title)}</span>
    </nav>
    <div class="detail-header">
      <div class="detail-header-info">
        <h2>📋 ${escapeHtml(composite.title)}</h2>
        <div class="detail-header-meta">
          <span>📅 Hạn nộp: ${formatDateTime(composite.deadline)}</span>
          <span>${composite.is_active ? '🟢 Đang mở' : '🔴 Đã đóng'}</span>
        </div>
      </div>
    </div>
    <div class="table-wrap" style="overflow-x:auto">
      <table>
        <thead><tr>
          <th>Học sinh</th>
          ${sections.map(sec => `<th style="text-align:center;min-width:110px">${skillIcons[sec.skill]||''} ${escapeHtml(sec.label)}</th>`).join('')}
          <th style="text-align:center">Tiến độ</th>
        </tr></thead>
        <tbody>${studentRows}</tbody>
      </table>
    </div>`;
}
window.renderCompositeSubmissions = renderCompositeSubmissions;

let _gradingCompositeSubId = null;
let _gradingCompositeAssignId = null;

async function openCompositeSubmissionGrading(submissionId, skill, assignmentId) {
  _gradingCompositeSubId = submissionId;
  _gradingCompositeAssignId = assignmentId || null;
  openModal(`Chấm bài — ${skill === 'writing' ? 'Writing' : 'Speaking'}`, `
    <div class="form-group">
      <label class="form-label">Điểm Band (0–9)</label>
      <input id="composite-grade-score" class="form-input" type="number" min="0" max="9" step="0.5" placeholder="VD: 6.5" />
    </div>
    <div class="form-group">
      <label class="form-label">Nhận xét</label>
      <textarea id="composite-grade-feedback" class="form-input" rows="4" placeholder="Nhận xét của giáo viên..."></textarea>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">Đóng</button>
      <button class="btn btn-primary" onclick="saveCompositeGrading(this)">💾 Lưu</button>
    </div>`);
}
window.openCompositeSubmissionGrading = openCompositeSubmissionGrading;

async function saveCompositeGrading(btn) {
  const scoreRaw = document.getElementById('composite-grade-score')?.value;
  const feedback = document.getElementById('composite-grade-feedback')?.value.trim() || '';
  const score = scoreRaw !== '' && scoreRaw != null ? parseFloat(scoreRaw) : null;
  if (score !== null && (isNaN(score) || score < 0 || score > 9)) {
    toast('Điểm Band phải từ 0 đến 9', 'error'); return;
  }
  btnLoading(btn);
  try {
    await api.patch(`/composite-section-submissions/${_gradingCompositeSubId}/score`, { score, feedback });
    closeModal();
    toast('Đã lưu nhận xét! ✓');
    if (_gradingCompositeAssignId) {
      showCompositeSubmissions({ id: _gradingCompositeAssignId });
    }
  } catch (e) {
    btnReset(btn);
    toast('Lỗi: ' + (e.error || e.message), 'error');
  }
}
window.saveCompositeGrading = saveCompositeGrading;

window.submitLoginGate        = submitLoginGate;
window.toggleGatePassword     = toggleGatePassword;
window.logout                 = logout;
window._onTeacherUnauthorized = () => {
  expireTeacherSession('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
};
window.addEventListener('pagehide', flushQuestionDraftSave);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
