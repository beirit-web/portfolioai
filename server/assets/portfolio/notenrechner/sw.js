/* Beirit Digital — the cache and worker are restricted to this calculator. */
const CACHE_PREFIX = "notenrechner-offline-";
// Bump this version when changing any file in OFFLINE_FILES.
const CACHE_NAME = `${CACHE_PREFIX}v1-20261105`;
const OFFLINE_FILES = [
  "index.html", "styles.css", "app.js", "offline.js", "manifest.webmanifest",
  "icons/app-icon.svg", "icons/app-icon-192.png", "icons/app-icon-512.png",
  "img/favicon-32.png", "img/lost.webp", "gewonnen.mp3", "lost-signal.mp3",
];
const APP_ROOT = new URL("./", self.location.href);
const OFFLINE_URLS = OFFLINE_FILES.map(file => new URL(file, APP_ROOT).href);
const ALLOWED_PATHS = new Set(OFFLINE_URLS.map(url => new URL(url).pathname));
let networkUnavailable = false;

async function prepareCache() {
  const cache = await caches.open(CACHE_NAME);
  // addAll commits the batch only when every response succeeded. A failed
  // refresh therefore leaves an existing complete offline copy available.
  await cache.addAll(OFFLINE_URLS.map(url => new Request(url, {
    cache: "reload", credentials: "same-origin",
  })));
  networkUnavailable = false;
}

async function cacheIsComplete() {
  const cache = await caches.open(CACHE_NAME);
  const files = await Promise.all(OFFLINE_URLS.map(url => cache.match(url)));
  return files.every(response => response && response.ok);
}

self.addEventListener("install", event => {
  event.waitUntil(prepareCache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    // Activation follows a successful complete install. Never remove caches
    // belonging to the portfolio, another app, an account or an API.
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", event => {
  if (!["CHECK_OFFLINE", "PREPARE_OFFLINE"].includes(event.data?.type)) return;
  const reply = event.ports[0];
  if (!reply) return;
  event.waitUntil((async () => {
    try {
      if (event.data.type === "PREPARE_OFFLINE") await prepareCache();
      reply.postMessage({ ready: await cacheIsComplete(), offline: networkUnavailable, version: CACHE_NAME });
    } catch {
      reply.postMessage({ ready: false, error: "download-failed" });
    }
  })());
});

async function rangeResponse(cached, rangeHeader) {
  const bytes = await cached.arrayBuffer();
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  const invalid = () => new Response(null, {
    status: 416, headers: { "Content-Range": `bytes */${bytes.byteLength}` },
  });
  if (!match || (!match[1] && !match[2])) return invalid();
  let start;
  let end;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return invalid();
    start = Math.max(0, bytes.byteLength - suffix);
    end = bytes.byteLength - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : bytes.byteLength - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) return invalid();
    end = Math.min(end, bytes.byteLength - 1);
  }
  if (start >= bytes.byteLength || start > end) return invalid();
  const headers = new Headers(cached.headers);
  headers.set("Accept-Ranges", "bytes");
  headers.set("Content-Range", `bytes ${start}-${end}/${bytes.byteLength}`);
  headers.set("Content-Length", String(end - start + 1));
  headers.delete("Content-Encoding");
  return new Response(bytes.slice(start, end + 1), { status: 206, headers });
}

async function networkWithOfflineFallback(request, cacheURL) {
  const cache = await caches.open(CACHE_NAME);
  try {
    // New HTML/CSS/JS versions become visible normally while connected. The
    // worker never forces a reload or silently serves an old navigation.
    const response = await fetch(request);
    if (response.ok && !response.redirected) {
      networkUnavailable = false;
      // Partial audio responses must not replace the complete offline file.
      if (response.status === 200) await cache.put(cacheURL, response.clone());
      return response;
    }
    const fallback = await cache.match(cacheURL);
    if (!fallback) return response;
    networkUnavailable = true;
    return request.headers.has("Range")
      ? rangeResponse(fallback, request.headers.get("Range")) : fallback;
  } catch {
    const fallback = await cache.match(cacheURL);
    if (fallback) {
      networkUnavailable = true;
      return request.headers.has("Range")
        ? rangeResponse(fallback, request.headers.get("Range")) : fallback;
    }
    return new Response("Diese Datei ist noch nicht offline gespeichert.", {
      status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== APP_ROOT.origin) return;
  const isDirectory = url.pathname === APP_ROOT.pathname;
  if (!isDirectory && !ALLOWED_PATHS.has(url.pathname)) return;
  // Ignore asset-version queries only within this explicit public-file list.
  // No API response, account page or another portfolio app is intercepted.
  const cacheURL = isDirectory
    ? new URL("index.html", APP_ROOT).href : `${url.origin}${url.pathname}`;
  event.respondWith(networkWithOfflineFallback(event.request, cacheURL));
});
