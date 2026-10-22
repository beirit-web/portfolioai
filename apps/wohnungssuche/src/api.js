export const API_BASE = `${(import.meta.env.VITE_API_BASE || "/wohnungssuche-api/").replace(/\/+$/, "")}/`;
const configuredPasswordResetUrl = String(import.meta.env.VITE_PASSWORD_RESET_URL || "").trim();
export const PASSWORD_RESET_URL = configuredPasswordResetUrl.startsWith("/")
  && !configuredPasswordResetUrl.startsWith("//") && !/[\\\s]/.test(configuredPasswordResetUrl)
  ? configuredPasswordResetUrl : "/auth/password_reset/";
export const EMAIL_VERIFICATION_RESEND_URL = "/email-bestaetigung/";

export function localAccountUrl(value) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !/[\\\s]/.test(value)
    ? value : "";
}

export async function apiRequest(endpoint, { token = "", method = "GET", body, signal } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      method,
      signal,
      headers: {
        ...(token ? { Authorization: `Token ${token}` } : {}),
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error("Die API ist nicht erreichbar. Bitte versuchen Sie es erneut.");
  }
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const fields = data?.errors ? Object.values(data.errors).flat().join(" ") : "";
    const message = data?.code === "email_verification_required"
      ? fields || data?.detail || "Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse."
      : response.status === 401 || response.status === 403
      ? "Ihre Anmeldung ist abgelaufen oder fehlt. Bitte melden Sie sich erneut an."
      : fields || data?.detail || "Die Anfrage konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.";
    const error = new Error(message);
    error.status = response.status;
    error.code = data?.code;
    error.remaining = data?.remaining;
    error.emailDelivery = data?.emailDelivery;
    error.activationUrl = localAccountUrl(data?.activationUrl);
    throw error;
  }
  if (response.status !== 204 && (!data || typeof data !== "object")) {
    throw new Error("Die API hat keine gültige Antwort geliefert. Bitte versuchen Sie es erneut.");
  }
  return data;
}

export const resultsOf = data => Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
