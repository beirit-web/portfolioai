import App from "./App.jsx";
import { mountSiteApp } from "./lib/mountSiteApp.jsx";

async function mount() {
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
