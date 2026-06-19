/** Wires upload preview labels and bulk-review workflows. */
function initUploadPreview() {
  document.querySelectorAll('input[type=file][data-preview]').forEach((input) => {
    input.addEventListener('change', () => {
      const target = document.getElementById(input.dataset.preview);
      const file = input.files && input.files[0];
      if (target && file) target.textContent = `${file.name} (${Math.ceil(file.size / 1024)}KB)`;
    });
  });
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[char]));
}

function bulkCategoryOptions(selected) {
  const labels = {
    equity: 'Equity',
    fixed_income: 'Fixed Income',
    macro: 'Macro',
    sector: 'Sector',
    index: 'Index',
    other: 'Other',
  };
  return Object.entries(labels).map(([value, label]) => (
    `<option value="${value}" ${value === selected ? 'selected' : ''}>${label}</option>`
  )).join('');
}

function renderBulkRows(items) {
  return items.map((item) => {
    const metadata = item.metadata || {};
    const extracted = item.extracted || {};
    const llm = item.llm || {};
    const tags = Array.isArray(metadata.tags) ? metadata.tags.join(', ') : '';
    const warnings = Array.isArray(item.warnings) && item.warnings.length ? item.warnings.join(' ') : 'None';
    const llmText = Object.keys(llm).length
      ? `<strong>${escapeHtml(llm.title || '')}</strong><br><small>Confidence: ${escapeHtml(llm.confidence || 0)}</small>`
      : '<span class="muted">No suggestion requested or available.</span>';
    return `<article class="bulk-review-row bulk-review-card" data-token="${escapeHtml(item.token)}" data-file-name="${escapeHtml(item.file_name)}">
      <div class="bulk-review-card-head">
        <div><strong>${escapeHtml(item.file_name)}</strong><small>${escapeHtml(item.stored_path)}</small></div>
        <select data-field="action" aria-label="Review decision"><option value="approve">Approve</option><option value="reject">Reject</option></select>
      </div>
      <div class="bulk-review-grid">
      <div class="bulk-review-main">
        <div class="field"><label>Title</label><input data-field="title" value="${escapeHtml(metadata.title || extracted.title_hint || '')}" required></div>
        <div class="grid-2">
          <div class="field"><label>Category</label><select data-field="category">${bulkCategoryOptions(metadata.category || 'other')}</select></div>
          <div class="field"><label>Analyst Hint</label><input data-field="analyst_hint" value="${escapeHtml(metadata.analyst_hint || '')}"></div>
        </div>
        <div class="field"><label>Tags</label><input data-field="tags" value="${escapeHtml(tags)}"></div>
        <div class="field"><label>Abstract</label><textarea data-field="abstract">${escapeHtml(llm.abstract || '')}</textarea></div>
      </div>
      <aside class="bulk-review-side">
        <span class="status-pill status-pending">Ready for review</span>
        <small>Date hint: ${escapeHtml(extracted.date || 'None')}</small>
        <div><strong>LLM suggestion</strong><p>${llmText}</p></div>
        <div><strong>Warnings</strong><p>${escapeHtml(warnings)}</p></div>
      </aside>
      </div>
    </article>`;
  }).join('');
}

function messageFromResponse(data) {
  if (data.ok) {
    const saved = typeof data.success_count === 'number' ? `${data.success_count} saved` : 'Action completed';
    const failed = typeof data.failed_count === 'number' ? `, ${data.failed_count} failed` : '';
    return `${saved}${failed}.`;
  }
  return data.error || 'We could not complete this action. Please check your input and try again.';
}

function initBulkUpload() {
  const ingestForm = document.querySelector('[data-bulk-ingest-form]');
  const approveForm = document.querySelector('[data-bulk-approve-form]');
  const reviewBody = document.querySelector('[data-bulk-review-body]');
  const results = document.querySelector('[data-bulk-results]');

  ingestForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = ingestForm.querySelector('[data-form-message]');
    if (message) {
      message.className = 'notice';
      message.textContent = 'Uploading files for review...';
    }
    const ingestEndpoint = ingestForm.getAttribute('action') || ingestForm.action;
    const response = await fetch(ingestEndpoint, { method: 'POST', body: new FormData(ingestForm), credentials: 'same-origin' });
    const data = await response.json().catch(() => ({ ok: false, error: 'We could not complete this action. Please check your input and try again.' }));
    if (message) {
      message.className = data.ok ? 'notice notice-success' : 'notice notice-error';
      message.textContent = messageFromResponse(data);
    }
    if (results && Array.isArray(data.details)) {
      results.innerHTML = `<div class="panel"><h2>Upload Results</h2><ul>${data.details.map((detail) => `<li><strong>${escapeHtml(detail.file)}</strong>: ${escapeHtml(detail.status)} ${Array.isArray(detail.errors) && detail.errors.length ? `- ${escapeHtml(detail.errors.join(' '))}` : ''}</li>`).join('')}</ul></div>`;
    }
    const items = data.data && Array.isArray(data.data.review_items) ? data.data.review_items : [];
    if (data.ok && items.length && reviewBody && approveForm) {
      reviewBody.innerHTML = renderBulkRows(items);
      approveForm.hidden = false;
      approveForm.scrollIntoView({ block: 'start' });
    }
  });

  approveForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const rows = [...approveForm.querySelectorAll('.bulk-review-row')];
    const items = rows.map((row) => ({
      token: row.dataset.token,
      file_name: row.dataset.fileName,
      title: row.querySelector('[data-field="title"]')?.value || '',
      category: row.querySelector('[data-field="category"]')?.value || '',
      tags: (row.querySelector('[data-field="tags"]')?.value || '').split(',').map((tag) => tag.trim()).filter(Boolean),
      analyst_hint: row.querySelector('[data-field="analyst_hint"]')?.value || '',
      abstract: row.querySelector('[data-field="abstract"]')?.value || '',
      action: row.querySelector('[data-field="action"]')?.value || 'reject',
    }));
    approveForm.querySelector('input[name="items"]').value = JSON.stringify(items);
    const approveEndpoint = approveForm.getAttribute('action') || approveForm.action;
    const response = await fetch(approveEndpoint, { method: 'POST', body: new FormData(approveForm), credentials: 'same-origin' });
    const data = await response.json().catch(() => ({ ok: false, error: 'We could not complete this action. Please check your input and try again.' }));
    if (data.ok && data.data && data.data.redirect) {
      window.location.href = data.data.redirect;
      return;
    }
    const box = document.createElement('div');
    box.className = data.ok ? 'notice notice-success' : 'notice notice-error';
    box.textContent = messageFromResponse(data);
    approveForm.prepend(box);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initUploadPreview();
  initBulkUpload();
});
