import { useEffect, useState } from "react";

const routes = {
  dashboard: "dashboard", apartments: "listings", "search-profiles": "profiles",
  sources: "sources", notifications: "notifications", information: "information",
  login: "login", register: "register",
};

export function routeFromLocation() {
  const hash = location.hash.replace(/^#\/?/, "");
  const path = location.pathname.replace(/^\/wohnungssuche\/?/, "").replace(/^\//, "").replace(/\/$/, "");
  return routes[hash || path] || "dashboard";
}

export function navigateTo(path) {
  const url = new URL(location.href);
  url.pathname = `/wohnungssuche/${path.replace(/^\//, "") || "dashboard"}`;
  url.hash = "";
  history.pushState({}, "", url);
  dispatchEvent(new PopStateEvent("popstate"));
}

export function useRoute() {
  const [route, setRoute] = useState(routeFromLocation);
  useEffect(() => {
    const update = () => setRoute(routeFromLocation());
    addEventListener("popstate", update);
    addEventListener("hashchange", update);
    return () => {
      removeEventListener("popstate", update);
      removeEventListener("hashchange", update);
    };
  }, []);
  return route;
}
