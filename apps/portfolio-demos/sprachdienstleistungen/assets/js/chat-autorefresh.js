// Auto-refresh only for admin chat changelists.
// It stays passive while the tab is hidden or the user is actively interacting.
(function () {
  const REFRESH_INTERVAL_MS = 60 * 60 * 1000;
  const IDLE_THRESHOLD_MS = 20000;
  const INTERACTION_EVENTS = ["click", "keydown", "input", "focusin", "submit"];
  const FORM_CONTROL_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT", "OPTION", "BUTTON"]);

  const body = document.body;
  if (!body) return;

  const isAdminChatChangeList =
    body.classList.contains("model-chatmessage") ||
    body.classList.contains("model-chatreply");

  if (!isAdminChatChangeList || body.classList.contains("change-form")) return;

  const storageKey = `admin-chat-scroll:${window.location.pathname}${window.location.search}`;
  let lastInteractionAt = Date.now();

  const isRecentlyActive = () => Date.now() - lastInteractionAt < IDLE_THRESHOLD_MS;
  const hasFocusedFormControl = () => FORM_CONTROL_TAGS.has(document.activeElement?.tagName);
  const hasPendingAdminAction = () => {
    const selectedAction = document.querySelector('#changelist-form select[name="action"]');
    return Boolean(
      document.querySelector("input.action-select:checked") ||
        selectedAction?.value
    );
  };

  const markInteraction = () => {
    lastInteractionAt = Date.now();
  };

  const restoreScroll = () => {
    const savedPosition = window.sessionStorage.getItem(storageKey);
    if (!savedPosition) return;
    window.sessionStorage.removeItem(storageKey);
    window.requestAnimationFrame(() => {
      window.scrollTo(0, Number(savedPosition) || 0);
    });
  };

  const shouldSkipRefresh = () => {
    if (document.hidden) return true;
    if (isRecentlyActive()) return true;
    if (hasFocusedFormControl()) return true;
    return hasPendingAdminAction();
  };

  const scheduleRefresh = () => {
    window.setTimeout(() => {
      if (!shouldSkipRefresh()) {
        window.sessionStorage.setItem(storageKey, String(window.scrollY));
        window.location.reload();
        return;
      }
      scheduleRefresh();
    }, REFRESH_INTERVAL_MS);
  };

  INTERACTION_EVENTS.forEach((eventName) => {
    document.addEventListener(eventName, markInteraction, true);
  });
  document.addEventListener("visibilitychange", markInteraction);

  restoreScroll();
  scheduleRefresh();
})();
