/* Per-field clearing shares the editor's normal preview and autosave events. */
(() => {
  if (!document.body.classList.contains('is-enhanced')) return;

  const selector = [
    '#contractForm input:not([type])',
    ...['text', 'number', 'date', 'email', 'tel', 'url', 'search'].map(type => `#contractForm input[type="${type}"]`),
    '#contractForm textarea',
    '#aiPrompt',
  ].join(', ');
  const controls = new WeakMap();
  const labels = new WeakMap();

  function labelFor(field) {
    if (labels.has(field)) return labels.get(field);
    const label = field.labels?.[0]?.cloneNode(true);
    label?.querySelectorAll('.required-mark, .field-optional').forEach(node => node.remove());
    const text = label?.textContent.trim() || field.getAttribute('aria-label') || 'Eingabe';
    labels.set(field, text);
    return text;
  }

  function sync(field) {
    const button = controls.get(field);
    if (!button) return;
    const disabled = field.value === '' || field.matches(':disabled') || field.readOnly;
    if (button.disabled !== disabled) button.disabled = disabled;
    const label = `${labelFor(field)} leeren`;
    if (button.getAttribute('aria-label') !== label) button.setAttribute('aria-label', label);
    if (button.title !== label) button.title = label;
  }

  function enhance(field) {
    if (!controls.has(field)) {
      let wrapper = field.parentElement;
      if (!wrapper.classList.contains('amount-control')) {
        wrapper = document.createElement('div');
        field.before(wrapper);
        wrapper.append(field);
      }
      wrapper.classList.add('clearable-control');
      wrapper.classList.toggle('clearable-control--date', field.type === 'date');
      wrapper.classList.toggle('clearable-control--textarea', field.tagName === 'TEXTAREA');
      field.classList.add('clearable-input');

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'field-clear';
      button.dataset.clearInput = field.id;
      button.setAttribute('aria-controls', field.id);
      const symbol = document.createElement('span');
      symbol.className = 'field-clear-symbol';
      symbol.setAttribute('aria-hidden', 'true');
      symbol.textContent = '×';
      button.append(symbol);
      if (field.id === 'aiPrompt') {
        button.classList.add('field-clear--label');
        const text = document.createElement('span');
        text.textContent = 'Leeren';
        button.append(text);
        wrapper.classList.add('clearable-control--prompt');
      }
      wrapper.append(button);
      controls.set(field, button);
    }
    sync(field);
  }

  function refresh(root = document) {
    if (root.matches?.(selector)) enhance(root);
    root.querySelectorAll(selector).forEach(enhance);
  }

  function clear(fieldOrId) {
    const field = typeof fieldOrId === 'string' ? document.getElementById(fieldOrId) : fieldOrId;
    if (!field?.matches(selector) || field.matches(':disabled') || field.readOnly) return false;
    field.value = '';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    sync(field);
    field.focus({ preventScroll: true });
    return true;
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-clear-input]');
    if (button && !button.disabled) clear(button.dataset.clearInput);
  });
  // Capture also catches the AI example's intentionally non-bubbling input event.
  for (const name of ['input', 'change']) {
    document.addEventListener(name, event => {
      if (event.target.matches(selector)) sync(event.target);
      else if (name === 'change' && event.target.id === 'aiAction') queueMicrotask(() => {
        const prompt = document.querySelector('#aiPrompt');
        labels.delete(prompt);
        sync(prompt);
      });
    }, true);
  }
  document.addEventListener('reset', event => {
    if (event.target.id === 'contractForm' || event.target.id === 'aiForm') queueMicrotask(refresh);
  }, true);

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes') {
        if (mutation.target.matches(selector)) sync(mutation.target);
        else if (mutation.target.matches('fieldset')) refresh(mutation.target);
      } else {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE && node.isConnected) refresh(node);
        }
      }
    }
  });
  for (const form of document.querySelectorAll('#contractForm, #aiForm')) {
    observer.observe(form, { childList: true, subtree: true, attributes: true,
      attributeFilter: ['disabled', 'readonly', 'value'] });
  }

  window.ContractInputs = Object.freeze({ clear, refresh });
  refresh();
})();
