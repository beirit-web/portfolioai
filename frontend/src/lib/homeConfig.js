// Django supplies this configuration before the frontend entry point runs.
export const homeConfig = globalThis.BEIRIT_HOME_CONFIG || {};

export function getDjangoOrigin() {
  const browserLocation = globalThis.location;
  if (!browserLocation || !/^517\d$/.test(browserLocation.port || "")) return "";
  return `${browserLocation.protocol}//${browserLocation.hostname}:8000`;
}

export const publicPageBaseUrl = homeConfig.publicPageBaseUrl || getDjangoOrigin();
export const publicPageUrl = (path) => `${publicPageBaseUrl}${path}`;
