import { useEffect } from "react";
import { fetchMe, type CurrentUser } from "../api";

export function usePlatformSession(user: CurrentUser | null, onUserChange: (user: CurrentUser | null) => void) {
  useEffect(() => {
    if (import.meta.env.VITE_PLATFORM_INTEGRATION !== "true") return;
    let active = true;
    let csrfToken = "";
    let lastActivity = 0;
    async function refresh() {
      try {
        const response = await fetchMe();
        if (active) onUserChange(response.user);
      } catch {
        // A failed request does not turn an authenticated local collection into a guest collection.
      }
    }
    async function activity() {
      if (!user || !csrfToken || Date.now() - lastActivity < 15000) return;
      lastActivity = Date.now();
      try {
        const response = await fetch("/api/session/activity/", {
          method: "POST", credentials: "same-origin",
          headers: { "X-CSRFToken": csrfToken, "Accept": "application/json" },
        });
        if (response.status === 401) await refresh();
      } catch {
        // Local playback remains available while the network is unavailable.
      }
    }
    if (user) fetch("/deutschlive/api/auth/csrf/", { credentials: "same-origin" })
      .then(response => response.json()).then(response => { if (active) csrfToken = response.csrfToken; }).catch(() => {});
    function onVisibility() { if (document.visibilityState === "visible") void refresh(); }
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 30000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pointerdown", activity);
    window.addEventListener("keydown", activity);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointerdown", activity);
      window.removeEventListener("keydown", activity);
    };
  }, [user?.id, onUserChange]);
}
