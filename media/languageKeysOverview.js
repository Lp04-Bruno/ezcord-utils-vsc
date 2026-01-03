const vscode = acquireVsCodeApi();

let lastOverviewData = null;
let activeDetailsKey = null;

function esc(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderTable(rows) {
  if (!rows || rows.length === 0) {
    return '<div class="empty">No keys found for this section.</div>';
  }

  const header =
    '<table>' +
    '<thead>' +
    '<tr>' +
    '<th style="width: 68%">Key</th>' +
    '<th style="width: 22%">Translations</th>' +
    '<th style="width: 10%">Jump</th>' +
    '</tr>' +
    '</thead>' +
    '<tbody>';

  const body = rows
    .map(r => {
      const warn = r.hasMissingTranslations
        ? '<span class="warn" title="Missing translations">⚠</span>'
        : '';
      return (
        '<tr>' +
        '<td class="key">' +
        '<button class="keyBtn" data-key="' + esc(r.key) + '" title="Show translations">' + warn + esc(r.key) + '</button>' +
        '</td>' +
        '<td class="muted">' + esc(r.translations) + ' lang(s)</td>' +
        '<td><button class="jumpBtn" data-key="' + esc(r.key) + '" title="Open in YAML">Open</button></td>' +
        '</tr>'
      );
    })
    .join('');

  const footer = '</tbody></table>';
  return header + body + footer;
}

function wireButtons() {
  for (const btn of document.querySelectorAll('.jumpBtn')) {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-key');
      if (key) vscode.postMessage({ type: 'jump', key });
    });
  }

  for (const btn of document.querySelectorAll('.keyBtn')) {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-key');
      if (key) {
        openDetails(key);
      }
    });
  }
}

function setView(showDetails) {
  const listView = document.getElementById('listView');
  const detailView = document.getElementById('detailView');
  if (!listView || !detailView) return;

  if (showDetails) {
    listView.classList.add('hidden');
    detailView.classList.remove('hidden');
    detailView.setAttribute('aria-hidden', 'false');
  } else {
    detailView.classList.add('hidden');
    detailView.setAttribute('aria-hidden', 'true');
    listView.classList.remove('hidden');
  }
}

function renderDetailsLoading(key) {
  const detailKeyEl = document.getElementById('detailKey');
  const detailContainer = document.getElementById('detailContainer');
  if (detailKeyEl) detailKeyEl.textContent = key;
  if (detailContainer) {
    detailContainer.innerHTML = '<div class="section" style="margin-top: 10px;"><div class="empty">Loading translations…</div></div>';
  }
}

function renderDetails(details) {
  const detailKeyEl = document.getElementById('detailKey');
  const detailContainer = document.getElementById('detailContainer');
  if (!detailKeyEl || !detailContainer) return;

  detailKeyEl.textContent = details.key;

  const rows = (details.translations || []).map(t => {
    const value = t.value == null ? '<span class="missing">Missing</span>' : '<span>' + esc(t.value) + '</span>';
    return (
      '<tr>' +
      '<td style="width: 22%" class="muted">' + esc(t.language) + '</td>' +
      '<td style="width: 78%">' + value + '</td>' +
      '</tr>'
    );
  }).join('');

  const table =
    '<div class="section" style="margin-top: 12px;">' +
    '<h2>Translations</h2>' +
    '<table class="detailTable">' +
    '<thead><tr><th style="width: 22%">Language</th><th style="width: 78%">Value</th></tr></thead>' +
    '<tbody>' + rows + '</tbody>' +
    '</table>' +
    '</div>';

  detailContainer.innerHTML = table;
}

function wireDetailsBar() {
  const backBtn = document.getElementById('backBtn');
  const jumpBtn = document.getElementById('detailJumpBtn');

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      activeDetailsKey = null;
      setView(false);
    });
  }

  if (jumpBtn) {
    jumpBtn.addEventListener('click', () => {
      if (activeDetailsKey) vscode.postMessage({ type: 'jump', key: activeDetailsKey });
    });
  }
}

function openDetails(key) {
  activeDetailsKey = key;
  setView(true);
  renderDetailsLoading(key);
  vscode.postMessage({ type: 'details', key });
}

function applyData(data) {
  const fileLabelEl = document.getElementById('fileLabel');
  const langMetaEl = document.getElementById('langMeta');
  const reloadMetaEl = document.getElementById('reloadMeta');
  const baseHeadingEl = document.getElementById('baseHeading');
  const generalHeadingEl = document.getElementById('generalHeading');
  const baseContainerEl = document.getElementById('baseContainer');
  const generalContainerEl = document.getElementById('generalContainer');

  if (!fileLabelEl || !langMetaEl || !reloadMetaEl || !baseHeadingEl || !generalHeadingEl || !baseContainerEl || !generalContainerEl) {
    return;
  }

  lastOverviewData = data;
  fileLabelEl.textContent = data.fileLabel ? data.fileLabel : '';
  langMetaEl.textContent = 'Languages: ' + data.languagesTotal;
  reloadMetaEl.textContent = 'Last reload: ' + data.lastReloadText;

  baseHeadingEl.textContent = (data.fileStem ? (data.fileStem + ' keys') : 'File keys') + ' (' + data.baseKeys.length + ')';
  generalHeadingEl.textContent = 'GENERAL Keys (' + data.generalKeys.length + ')';

  baseContainerEl.innerHTML = renderTable(data.baseKeys);
  generalContainerEl.innerHTML = renderTable(data.generalKeys);
  wireButtons();

  if (activeDetailsKey) {
    setView(true);
    vscode.postMessage({ type: 'details', key: activeDetailsKey });
  } else {
    setView(false);
  }
}

wireDetailsBar();

window.addEventListener('message', event => {
  const msg = event.data;
  if (msg && msg.type === 'update') {
    applyData(msg.data);
  }
  if (msg && msg.type === 'keyDetails') {
    if (msg.data && msg.data.key && msg.data.key === activeDetailsKey) {
      renderDetails(msg.data);
    }
  }
});
