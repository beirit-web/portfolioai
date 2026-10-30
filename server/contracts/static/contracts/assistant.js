(() => {
  if (!document.body.classList.contains('is-enhanced')) return;
  const form = document.querySelector('#aiForm');
  const action = document.querySelector('#aiAction');
  const template = document.querySelector('#aiTemplate');
  const prompt = document.querySelector('#aiPrompt');
  const button = document.querySelector('#aiSubmit');
  const status = document.querySelector('#aiStatus');
  const output = document.querySelector('#aiResultText');
  const outputDocument = document.querySelector('#aiResultDocument');
  const resultPanel = document.querySelector('.ai-result');
  const resultLabel = document.querySelector('#aiResultLabel');
  const apply = document.querySelector('#aiApply');
  const readyStatus = status.textContent;
  let result = null;
  let pending = false;
  let manualCopyRange = null;
  const examples = {
    rent: 'Max Beispiel vermietet Mira Muster eine Wohnung in der Beispielstraße 12, 12345 Musterstadt, ab 01.12.2026. Monatliche Miete: 850 Euro, Kaution: 1700 Euro. Übergabe besenrein.',
    vehicle: 'Max Beispiel verkauft Mira Muster einen Beispielwagen Baujahr 2018 mit 82000 Kilometern für 7200 Euro. Barzahlung und Übergabe mit zwei Schlüsseln am 01.12.2026 in Musterstadt.',
    purchase: 'Max Beispiel verkauft Mira Muster ein gebrauchtes Fahrrad für 180 Euro. Barzahlung bei Abholung am 01.12.2026 in Musterstadt. Eine Fahrradlampe gehört dazu.',
  };
  function resetResult() {
    result = null;
    manualCopyRange = null;
    output.value = '';
    document.querySelector('#aiResultActions').hidden = true;
    output.hidden = true;
    outputDocument.hidden = true;
    outputDocument.replaceChildren();
    document.querySelector('#aiResultEmpty').hidden = false;
    resultPanel.dataset.state = 'empty';
    resultLabel.textContent = 'Vorschau';
    status.textContent = readyStatus;
    delete status.dataset.error;
  }
  function syncAction() {
    const generate = action.value === 'generate';
    document.querySelector('#aiTemplateField').hidden = !generate;
    document.querySelector('#aiPromptLabel').textContent = generate ? 'Deine Beschreibung' : 'Text zum Überarbeiten';
    button.querySelector('span').textContent = generate ? 'Entwurf vorbereiten' : 'Text überarbeiten';
    output.readOnly = generate;
    document.querySelector('#aiResultTitle span').textContent = generate ? 'Dein Vertragsentwurf' : 'Dein Textvorschlag';
    document.querySelector('#aiResultEmptyTitle').textContent = generate ? 'Hier nimmt dein Vertrag Form an.' : 'Dein Text, klarer formuliert.';
    document.querySelector('#aiResultEmptyHint').textContent = generate
      ? 'Beschreibe die Parteien, den Gegenstand, Preis und Termine. Dein Entwurf erscheint hier mit klar gegliederten Abschnitten.'
      : 'Füge deinen Text ein. Den Vorschlag kannst du hier direkt bearbeiten und anschließend kopieren.';
    resetResult();
  }
  action.addEventListener('change', syncAction);
  template.addEventListener('change', resetResult);
  prompt.addEventListener('input', () => {
    document.querySelector('#aiCharacterCount').textContent = `${prompt.value.length.toLocaleString('de-DE')} / 5.000`;
    resetResult();
  });
  document.querySelector('#aiExample').addEventListener('click', () => {
    prompt.value = action.value === 'generate' ? examples[template.value] : 'Der Käufer bezahlt den vereinbarten Betrag von 180 Euro in bar, wenn er das Fahrrad am 01.12.2026 in Musterstadt abholt.';
    prompt.dispatchEvent(new Event('input'));
    prompt.focus();
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (pending || !config.aiAvailable || !form.reportValidity()) return;
    resetResult();
    pending = true;
    const currentAction = action.value;
    const currentTemplate = template.value;
    const body = new URLSearchParams({action: currentAction, template: currentTemplate, prompt: prompt.value,
      consent: document.querySelector('#aiConsent').checked ? 'yes' : '', csrfmiddlewaretoken: csrfToken});
    [...form.elements].forEach(control => { control.disabled = true; });
    status.textContent = 'Dein Vorschlag wird vorbereitet …';
    status.dataset.error = 'false';
    resultPanel.setAttribute('aria-busy', 'true');
    resultPanel.dataset.state = 'loading';
    resultLabel.textContent = 'Wird vorbereitet …';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    try {
      const response = await fetch(config.aiUrl, {method: 'POST', body, signal: controller.signal,
        credentials: 'same-origin', headers: {'X-CSRFToken': csrfToken}});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Die Anfrage konnte nicht verarbeitet werden.');
      if (typeof data.text !== 'string' || (currentAction === 'generate' && (!data.fields || data.template !== currentTemplate))) throw new Error('Die KI-Antwort ist unvollständig.');
      result = data;
      output.value = data.text;
      output.readOnly = currentAction === 'generate';
      // An already-open tab can still have the previous editor script loaded.
      // Keep a successful response usable if its shared renderer is unavailable.
      const showDocument = currentAction === 'generate' && typeof createDocumentContent === 'function';
      output.hidden = showDocument;
      if (showDocument) {
        outputDocument.replaceChildren(createDocumentContent(data.text, TEMPLATES[currentTemplate], data.documentValues));
        outputDocument.hidden = false;
      }
      document.querySelector('#aiResultEmpty').hidden = true;
      document.querySelector('#aiResultActions').hidden = false;
      apply.hidden = currentAction !== 'generate';
      resultPanel.dataset.state = 'ready';
      resultLabel.textContent = 'Zur Prüfung';
      status.textContent = 'Vorschlag bereit. Bitte prüfe alle Angaben vor der Übernahme.';
    } catch (error) {
      status.textContent = error.name === 'AbortError' ? 'Die KI braucht zu lange. Bitte später erneut versuchen.' :
        error instanceof TypeError || error instanceof SyntaxError ? 'Verbindung fehlgeschlagen. Bitte später erneut versuchen.' : error.message;
      status.dataset.error = 'true';
      resultPanel.dataset.state = 'error';
      resultLabel.textContent = 'Bitte erneut versuchen';
    } finally {
      clearTimeout(timer);
      pending = false;
      [...form.elements].forEach(control => { control.disabled = false; });
      button.disabled = !config.aiAvailable;
      resultPanel.setAttribute('aria-busy', 'false');
    }
  });
  apply.addEventListener('click', () => {
    if (!result?.fields) return;
    document.dispatchEvent(new CustomEvent('contract-ai-apply', {detail: {template: result.template, data: result.fields}}));
  });
  document.querySelector('#aiCopy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(output.value); showToast('Vorschlag in die Zwischenablage kopiert.'); }
    catch {
      if (output.hidden) {
        outputDocument.focus({preventScroll: true});
        const range = document.createRange();
        range.selectNodeContents(outputDocument);
        manualCopyRange = range.cloneRange();
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        output.focus();
        output.select();
      }
      showToast('Bitte den markierten Text manuell kopieren.');
    }
  });
  outputDocument.addEventListener('copy', event => {
    const selection = window.getSelection();
    if (!manualCopyRange || outputDocument.hidden || !event.clipboardData || selection?.rangeCount !== 1) return;
    const range = selection.getRangeAt(0);
    // Only replace the complete fallback selection. Copying a chosen passage
    // or text elsewhere continues to use the browser's normal selection.
    if (!outputDocument.contains(range.commonAncestorContainer) ||
        range.compareBoundaryPoints(Range.START_TO_START, manualCopyRange) !== 0 ||
        range.compareBoundaryPoints(Range.END_TO_END, manualCopyRange) !== 0) return;
    event.clipboardData.setData('text/plain', output.value);
    event.preventDefault();
  });
})();
