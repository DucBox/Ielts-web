// Shared utility functions — loaded before app.js

function $(sel) { return document.querySelector(sel); }

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

function formatDateTime(iso) {
  if (!iso) return 'Không có hạn';
  const d = new Date(iso);
  return d.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function isOverdue(iso) {
  if (!iso) return false;
  return new Date(iso) < new Date();
}

function makeSortIcon(col, currentCol, currentDir) {
  if (currentCol !== col) return '<span class="sort-icon">↕</span>';
  return `<span class="sort-icon active">${currentDir === 'asc' ? '↑' : '↓'}</span>`;
}
window.makeSortIcon = makeSortIcon;
