const APP_BASE = normalizeBase(import.meta.env.VITE_APP_BASE ?? "");

function normalizeBase(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed || trimmed === "/") return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function stripBase(pathname: string) {
  if (!APP_BASE) return pathname || "/";
  if (pathname === APP_BASE) return "/";
  if (pathname.startsWith(`${APP_BASE}/`)) return pathname.slice(APP_BASE.length) || "/";
  return pathname || "/";
}

export function withBase(pathname: string) {
  if (!APP_BASE) return pathname;
  return pathname === "/" ? `${APP_BASE}/` : `${APP_BASE}${pathname}`;
}
