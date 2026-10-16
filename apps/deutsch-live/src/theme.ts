const storageKey = "deutsch-live-theme";

export function initTheme() {
  window.localStorage.removeItem(storageKey);
  document.documentElement.dataset.theme = "dark";
  document.documentElement.dataset.themePreference = "dark";
}
