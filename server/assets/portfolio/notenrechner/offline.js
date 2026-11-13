(() => {
  "use strict";
  const prepareButton = document.querySelector("#prepareOffline");
  const installButton = document.querySelector("#installApp");
  const status = document.querySelector("#offlineStatus");
  const help = document.querySelector("#offlineHelp");
  const portable = window.location.protocol === "file:";
  const supported = !portable && window.isSecureContext && "serviceWorker" in navigator;
  const appRoot = new URL("./", window.location.href);
  let offlineReady = false;
  let networkUnavailable = false;
  let busy = false;
  let installPrompt = null;

  function showStatus(message, state = "info") {
    if (!status) return;
    status.textContent = message;
    status.dataset.state = state;
  }

  function updateConnection() {
    // navigator.onLine can stay true when only the local network is reachable.
    // The worker also reports when it actually had to serve its offline copy.
    const online = navigator.onLine && !networkUnavailable;
    document.body.dataset.portable = String(portable);
    document.body.dataset.offline = String(!online);
    document.body.dataset.offlineReady = String(offlineReady);
    // CSS also covers links revealed asynchronously by the optional account
    // check, without overwriting their original guest/member hidden state.
    document.querySelectorAll("[data-online-only]").forEach(element => {
      element.classList.toggle("is-offline-hidden", portable || !online);
    });
    if (busy) return;
    if (prepareButton) {
      // Allow an explicit retry after a failed request even if the browser
      // never emits another online event when the connection recovers.
      prepareButton.disabled = !navigator.onLine;
      prepareButton.textContent = offlineReady ? "Offline-Daten aktualisieren" : "Offline bereitmachen";
    }
    if (portable) {
      showStatus("Offline-Version geöffnet. Du kannst direkt losrechnen.", "ready");
      if (help) help.textContent = "Bewahre den App-Ordner zusammen auf. Öffne darin index.html. Eine Anmeldung oder Internetverbindung ist nicht nötig.";
    } else if (offlineReady) {
      showStatus(online
        ? "Offline bereit. Dieser Browser kann den Rechner jetzt ohne Internet öffnen."
        : "Offline aktiv. Berechnung und Einstellungen sind weiterhin verfügbar.", "ready");
    } else if (!online) {
      showStatus("Du bist offline. Bereite die App bei bestehender Verbindung einmal in diesem Browser vor.", "info");
    } else if (!supported) {
      showStatus("Dieser Browser unterstützt das Offline-Speichern hier nicht.", "info");
      if (help) help.textContent = "Öffne den Rechner über HTTPS in einem Browser, der das Offline-Speichern unterstützt. Online kannst du wie gewohnt rechnen.";
    } else {
      showStatus("Noch nicht offline gespeichert. Bereite die App vor, solange du mit dem Internet verbunden bist.", "info");
    }
    if (installButton) installButton.hidden = portable || !installPrompt;
  }

  function messageWorker(worker, type) {
    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => {
        channel.port1.close();
        reject(new Error("worker-timeout"));
      }, 45000);
      channel.port1.onmessage = event => {
        clearTimeout(timer);
        channel.port1.close();
        resolve(event.data);
      };
      worker.postMessage({ type }, [channel.port2]);
    });
  }

  function waitForActivation(registration) {
    const worker = registration.installing || registration.waiting || registration.active;
    if (!worker) return Promise.reject(new Error("worker-missing"));
    if (worker.state === "activated") return Promise.resolve(worker);
    return new Promise((resolve, reject) => {
      const done = error => {
        clearTimeout(timer);
        worker.removeEventListener("statechange", check);
        if (error) reject(error);
        else resolve(worker);
      };
      const check = () => {
        if (worker.state === "activated") done();
        else if (worker.state === "redundant") done(new Error("worker-install-failed"));
      };
      const timer = setTimeout(() => done(new Error("worker-timeout")), 45000);
      worker.addEventListener("statechange", check);
      check();
    });
  }

  async function prepareOffline() {
    if (!supported || busy) return false;
    busy = true;
    prepareButton.disabled = true;
    prepareButton.setAttribute("aria-busy", "true");
    showStatus("App und Ergebnismedien werden für die Offline-Nutzung gespeichert …", "loading");
    try {
      const previous = await navigator.serviceWorker.getRegistration(appRoot.href);
      const hadOwnWorker = previous?.scope === appRoot.href && Boolean(previous.active);
      const registration = await navigator.serviceWorker.register(new URL("sw.js", appRoot).href, {
        scope: appRoot.href, updateViaCache: "none",
      });
      const worker = await waitForActivation(registration);
      const result = await messageWorker(worker, hadOwnWorker ? "PREPARE_OFFLINE" : "CHECK_OFFLINE");
      if (!result?.ready) throw new Error("offline-incomplete");
      offlineReady = true;
      networkUnavailable = Boolean(result.offline);
      busy = false;
      updateConnection();
      return true;
    } catch {
      busy = false;
      updateConnection();
      showStatus("Offline-Vorbereitung fehlgeschlagen. Prüfe Verbindung und freien Browserspeicher und versuche es erneut.", "error");
      return false;
    } finally {
      prepareButton.disabled = !navigator.onLine;
      prepareButton.removeAttribute("aria-busy");
    }
  }

  window.addEventListener("beforeinstallprompt", event => {
    if (portable) return;
    event.preventDefault();
    installPrompt = event;
    updateConnection();
  });

  installButton?.addEventListener("click", async () => {
    if (!installPrompt) return;
    const prompt = installPrompt;
    installPrompt = null;
    installButton.hidden = true;
    try {
      // Call prompt within the click gesture; preparing downloads first would
      // consume user activation on browsers that require it for installation.
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "accepted") await prepareOffline();
    } catch {
      showStatus("Die Installation wurde nicht abgeschlossen. Du kannst es über das Browsermenü erneut versuchen oder den Rechner mit „Offline bereitmachen“ speichern.", "info");
    }
  });

  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    if (installButton) installButton.hidden = true;
  });
  window.addEventListener("online", () => {
    networkUnavailable = false;
    updateConnection();
  });
  window.addEventListener("offline", updateConnection);
  prepareButton?.addEventListener("click", prepareOffline);

  if (prepareButton) prepareButton.hidden = !supported;
  updateConnection();
  // Reading an existing registration is passive: the first page view does not
  // register a worker or download images/audio. Preparation is an explicit act.
  if (supported) {
    navigator.serviceWorker.getRegistration(appRoot.href).then(async registration => {
      if (registration?.scope !== appRoot.href || !registration.active) return;
      const result = await messageWorker(registration.active, "CHECK_OFFLINE");
      offlineReady = Boolean(result?.ready);
      networkUnavailable = Boolean(result?.offline);
      updateConnection();
    }).catch(() => {});
  }
})();
