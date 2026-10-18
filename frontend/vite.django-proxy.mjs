// Native Django account pages need the same origin for forms, cookies and assets.
// Keep the app routes /account, /login and /register available to the local SPAs.
export function djangoAccountProxy({ target = "http://127.0.0.1:8000", localStaticPrefix = "" } = {}) {
  const accountPaths = "^/(?:auth(?:/|$)|password-reset(?:/|$)|reset(?:/|$)|email-bestaetigung(?:/|$)|verify-email/|(?:login|register|logout|profil)/|account/delete(?:/|$)|api/session/(?:status|activity)/)";
  const localStaticPath = localStaticPrefix.replace(/^\/static\//, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Housing serves its Vite entry and public files below /static/ as well.
  const assetPaths = localStaticPath
    ? `^/(?:static/(?!${localStaticPath})|media/)`
    : "^/(?:static/|media/)";
  // Preserve Host so Django can match the browser's Origin during CSRF checks.
  return {
    [accountPaths]: { target, changeOrigin: false },
    [assetPaths]: { target, changeOrigin: false },
  };
}
