import App from "./App.jsx";
import { mountSiteApp } from "./lib/mountSiteApp.jsx";
import { detectInitialLanguage, ensureLanguage } from "./i18n/index.js";

async function mount() {
  // Keep the server's first paint while the matching locale becomes available.
  if (document.getElementById("beirit-root")?.dataset.prerenderedLanguage) {
    await ensureLanguage(detectInitialLanguage()).catch(() => {});
  }
  // A direct contact visit should paint the full form with its footer position.
  const contactComponents = location.pathname.replace(/\/+$/, "") === "/kontakt"
    ? await Promise.all([
      import("./components/contact/ContactForm.jsx"),
      import("./components/contact/ContactDetails.jsx"),
    ]).then(([form, details]) => ({ Form: form.default, Details: details.default }))
    : undefined;
  mountSiteApp(() => <App contactComponents={contactComponents} />);
}

void mount();
