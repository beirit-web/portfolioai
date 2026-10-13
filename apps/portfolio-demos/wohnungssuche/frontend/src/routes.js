import { useEffect, useState } from "react";

const routes = {
  dashboard: "dashboard", apartments: "listings", "search-profiles": "profiles",
  sources: "sources", notifications: "notifications", information: "information",
  login: "login", register: "register",
};

export function routeFromLocation() {
  const hash = window.location.hash.replace(/^#\/?/, "");
  const path = window.location.pathname.replace(/^\/wohnungssuche\/?/, "").replace(/^\//, "").replace(/\/$/, "");
  return routes[hash || path] || "dashboard";
}

export function navigateTo(path) {
  window.history.pushState({}, "", `/wohnungssuche/${path.replace(/^\//, "") || "dashboard"}`);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function useRoute() {
  const [route, setRoute] = useState(routeFromLocation);
  useEffect(() => {
    const update = () => setRoute(routeFromLocation());
    window.addEventListener("popstate", update);
    window.addEventListener("hashchange", update);
    return () => {
      window.removeEventListener("popstate", update);
      window.removeEventListener("hashchange", update);
    };
  }, []);
  return route;
}
