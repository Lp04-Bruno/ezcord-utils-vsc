const vscode = acquireVsCodeApi();

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
        '<td class="key">' + warn + esc(r.key) + '</td>' +
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

  fileLabelEl.textContent = data.fileLabel ? ('— ' + data.fileLabel) : '';
  langMetaEl.textContent = 'Languages: ' + data.languagesTotal;
  reloadMetaEl.textContent = 'Last reload: ' + data.lastReloadText;

  baseHeadingEl.textContent = 'BASE Keys (' + data.baseKeys.length + ')';
  generalHeadingEl.textContent = 'GENERAL Keys (' + data.generalKeys.length + ')';

  baseContainerEl.innerHTML = renderTable(data.baseKeys);
  generalContainerEl.innerHTML = renderTable(data.generalKeys);
  wireButtons();
}

window.addEventListener('message', event => {
  const msg = event.data;
  if (msg && msg.type === 'update') {
    applyData(msg.data);
  }
});
