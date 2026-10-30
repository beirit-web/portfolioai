/* Named snapshots are independent of the editor's autosaved working copies. */
(() => {
  if (!document.body.classList.contains('is-enhanced')) return;
  const ARCHIVE_KEY = `${STORAGE_PREFIX}library-v1`;
  const title = document.querySelector('#workspaceTitle');
  const search = document.querySelector('#draftSearch');
  const filter = document.querySelector('#draftFilter');
  const list = document.querySelector('#draftList');
  const dialog = document.querySelector('#snapshotDialog');
  const nameInput = document.querySelector('#snapshotName');
  const dialogError = document.querySelector('#snapshotError');
  let library = [];
  let storageReadable = true;
  function readLibrary() {
    try {
      const value = JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '[]');
      if (!Array.isArray(value) || value.some(item => !item || typeof item.id !== 'string' ||
          typeof item.name !== 'string' || !Object.hasOwn(TEMPLATES, item.template) ||
          !item.data || typeof item.data !== 'object' || Array.isArray(item.data) ||
          !Number.isFinite(Date.parse(item.updated)))) throw new Error('Invalid library');
      library = value;
      storageReadable = true;
    } catch {
      storageReadable = false;
      showToast('Die lokale Ablage konnte nicht gelesen werden. Vorhandene Daten bleiben unverändert.');
    }
  }
  function writeLibrary(next) {
    if (!storageReadable) return false;
    try {
      localStorage.setItem(ARCHIVE_KEY, JSON.stringify(next));
      library = next;
      renderLibrary();
      return true;
    } catch { return false; }
  }
  function makeNode(tag, className, text) {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function action(label, symbol, handler, primary = false) {
    const button = makeNode('button', primary ? 'button button--secondary' : 'icon-button');
    button.type = 'button';
    button.setAttribute('aria-label', label);
    button.title = label;
    button.append(icon(symbol));
    if (primary) button.append(document.createTextNode('Öffnen'));
    button.addEventListener('click', handler);
    return button;
  }
  function showWorkspace(view, focus = true, push = true) {
    if (!['overview', 'templates', 'drafts', 'editor', 'assistant'].includes(view)) view = 'overview';
    closeMenus();
    document.body.dataset.workspace = view;
    const labels = { assistant: ['Eine Idee. Ein erster Entwurf.', 'Beschreiben, prüfen und Schritt für Schritt verfeinern.', 'KI-Assistent'], overview: ['Deine Verträge. An einem Ort.', 'Von der ersten Vorlage bis zum fertigen Entwurf.', 'Übersicht'],
      templates: ['Die passende Vorlage für deine Idee.', 'Wähle eine Vertragsart und ergänze deine Angaben im Editor.', 'Vorlagen'],
      drafts: ['Deine Entwürfe, griffbereit.', 'Gespeicherte Kopien öffnen, duplizieren und weiterbearbeiten.', 'Meine Entwürfe'] };
    if (view !== 'editor') {
      title.textContent = labels[view][0];
      document.querySelector('#workspaceSubtitle').textContent = labels[view][1];
      document.querySelector('#workspaceBreadcrumb').textContent = labels[view][2];
      renderLibrary();
      if (focus) title.focus({ preventScroll: true });
    } else {
      ensureDocumentPreview();
      scheduleDocumentZoom();
      if (focus) elements.templateTrigger.focus({ preventScroll: true });
    }
    document.querySelectorAll('.studio-nav [data-workspace-link]').forEach(link => {
      if (link.dataset.workspaceLink === view) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    if (push) {
      const url = new URL(location.href);
      url.search = view === 'editor' ? `?workspace=editor&template=${elements.templateSelect.value}` : '';
      url.hash = ['templates', 'drafts', 'assistant'].includes(view) ? view : '';
      history.pushState({ workspace: view }, '', url);
    }
    if (focus) window.scrollTo(0, 0);
  }
  function openSnapshot(item) {
    saveDraft();
    // Keep the current working copy when restoring an archived version of the same type.
    const current = elements.templateSelect.value === item.template ? getData() : (() => {
      try { return JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}${item.template}`) || 'null'); }
      catch { return null; }
    })();
    const changed = current && Object.values(current).some(Boolean) &&
      TEMPLATES[item.template].fields.some(([, , key]) => (current[key] || '') !== (item.data[key] || ''));
    if (changed) {
      const backup = { id: crypto.randomUUID(), name: `${TEMPLATES[item.template].label} – vor Wiederherstellung`,
        template: item.template, data: current, updated: new Date().toISOString() };
      if (!writeLibrary([backup, ...library])) { showToast('Arbeitskopie konnte nicht gesichert werden. Öffnen abgebrochen.'); return; }
    }
    selectTemplate(item.template);
    elements.form.reset();
    applyData(Object.fromEntries(TEMPLATES[item.template].fields.map(([, , key]) => [key, typeof item.data[key] === 'string' ? item.data[key] : ''])));
    saveDraft();
    updatePreview();
    setView('form');
    selectSection('parties');
    showWorkspace('editor');
    showToast(changed ? 'Entwurf geöffnet. Vorherige Arbeitskopie in der Ablage gesichert.' : 'Entwurf zum Bearbeiten geöffnet.');
  }
  function renderLibrary() {
    document.querySelector('#draftCount').textContent = library.length;
    document.querySelector('#sidebarDraftCount').textContent = library.length;
    list.replaceChildren();
    const empty = document.querySelector('#draftEmpty');
    empty.hidden = library.length > 0 || !storageReadable;
    if (!storageReadable) {
      list.append(makeNode('p', 'draft-no-results', 'Die lokale Ablage ist nicht verfügbar. Bitte die Browsereinstellungen prüfen.'));
      return;
    }
    const query = search.value.trim().toLocaleLowerCase('de');
    const matches = library.filter(item => (filter.value === 'all' || item.template === filter.value) &&
      `${item.name} ${TEMPLATES[item.template].label}`.toLocaleLowerCase('de').includes(query));
    if (library.length && !matches.length) list.append(makeNode('p', 'draft-no-results', 'Keine passenden Entwürfe. Ändere den Suchbegriff oder den Filter.'));
    matches.forEach(item => {
      const row = makeNode('article', 'draft-row');
      const symbol = makeNode('span', `color-icon ${{rent: 'lilac', vehicle: 'mint', purchase: 'peach'}[item.template]}`);
      symbol.append(icon({rent: 'house', vehicle: 'car', purchase: 'package'}[item.template]));
      const copy = makeNode('div', '');
      copy.append(makeNode('h3', '', item.name), makeNode('p', '', `${TEMPLATES[item.template].label} · ${new Date(item.updated).toLocaleDateString('de-DE', {day: '2-digit', month: 'short', year: 'numeric'})}`));
      const actions = makeNode('div', 'draft-actions');
      actions.append(action(`${item.name} öffnen`, 'pen-line', () => openSnapshot(item), true),
        action(`${item.name} duplizieren`, 'copy', () => {
          const duplicate = {...item, id: crypto.randomUUID(), name: `${item.name.slice(0, 90)} – Kopie`, updated: new Date().toISOString()};
          showToast(writeLibrary([duplicate, ...library]) ? 'Kopie in der Ablage gespeichert.' : 'Kopie konnte nicht gespeichert werden.');
        }), action(`${item.name} löschen`, 'trash-2', () => {
          if (!confirm(`„${item.name}“ aus der lokalen Ablage löschen?`)) return;
          showToast(writeLibrary(library.filter(entry => entry.id !== item.id)) ? 'Entwurf aus der Ablage gelöscht.' : 'Löschen nicht möglich.');
        }));
      row.append(symbol, copy, actions);
      list.append(row);
    });
  }
  document.querySelectorAll('[data-workspace-link]').forEach(link => link.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (document.body.dataset.workspace === 'editor') saveDraft();
    showWorkspace(link.dataset.workspaceLink);
  }));
  document.querySelectorAll('[data-open-template]').forEach(link => link.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    saveDraft();
    selectTemplate(link.dataset.openTemplate);
    setView('form');
    selectSection('parties');
    showWorkspace('editor');
  }));
  search.addEventListener('input', renderLibrary);
  filter.addEventListener('change', renderLibrary);
  document.querySelector('#saveSnapshotButton').addEventListener('click', () => {
    readLibrary();
    nameInput.value = getTemplate().label;
    dialogError.textContent = '';
    dialog.showModal();
    nameInput.select();
  });
  document.querySelectorAll('#cancelSnapshot, #cancelSnapshotFooter').forEach(button => button.addEventListener('click', () => dialog.close()));
  document.querySelector('#snapshotForm').addEventListener('submit', event => {
    event.preventDefault();
    const name = nameInput.value.trim();
    if (!name) { dialogError.textContent = 'Bitte einen Namen eingeben.'; nameInput.focus(); return; }
    readLibrary();
    const entry = {id: crypto.randomUUID(), name, template: elements.templateSelect.value, data: getData(), updated: new Date().toISOString()};
    if (!writeLibrary([entry, ...library])) {
      dialogError.textContent = 'Speichern nicht möglich. Der lokale Speicher ist voll oder nicht verfügbar. Du kannst deinen Entwurf weiterhin exportieren.';
      return;
    }
    saveDraft();
    dialog.close();
    showToast('Kopie unter „Meine Entwürfe“ gespeichert.');
  });
  addEventListener('storage', event => { if (event.key === ARCHIVE_KEY || event.key === null) { readLibrary(); renderLibrary(); } });
  addEventListener('popstate', () => {
    const url = new URL(location.href);
    if (url.searchParams.has('template')) selectTemplate(url.searchParams.get('template'));
    showWorkspace(url.searchParams.has('template') || url.searchParams.get('workspace') === 'editor' ? 'editor' : url.hash.slice(1), true, false);
  });
  document.addEventListener('contract-ai-apply', event => {
    openSnapshot(event.detail);
  });
  readLibrary();
  showWorkspace(location.hash ? location.hash.slice(1) : document.body.dataset.workspace, false, false);
})();
