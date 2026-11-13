async function withoutEmbeddedProjects(page) {
  // Exercise the API/fallback path used when HTML has no project bootstrap.
  // Install this before the template assigns its configuration and JS imports it.
  await page.addInitScript(() => {
    let config;
    Object.defineProperty(window, "BEIRIT_HOME_CONFIG", {
      configurable: true,
      get() { return config; },
      set(value) {
        config = { ...value };
        delete config.initialProjects;
      },
    });
  });
}

module.exports = { withoutEmbeddedProjects };
