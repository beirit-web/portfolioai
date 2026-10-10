// Module links and labels are shared by the client and Django build catalog.
const modules = {
  sprachdienstleistungen: [
    { id: "deutschlive", href: "/deutschlive/", external: true,
      labels: { de: "DeutschLive öffnen", ru: "Открыть DeutschLive", uk: "Відкрити DeutschLive" } },
    { id: "vokabelbox", href: "/vokabelbox/", external: true,
      labels: { de: "Vokabelbox öffnen", ru: "Открыть Vokabelbox", uk: "Відкрити Vokabelbox" } },
    { id: "musikplayer", href: "/deutschlive/recordings", external: true,
      labels: { de: "Meine Aufnahmen öffnen", ru: "Мои записи", uk: "Мої записи" } },
  ],
  "enbt-botanic": [
    { id: "wetter", href: "/botanic/wetter/", publicPage: true,
      labels: { de: "Wetter öffnen", ru: "Открыть погоду", uk: "Відкрити погоду" } },
  ],
};

export function projectModuleActions(slug, language = "de") {
  return (modules[slug] || []).map(({ labels, ...module }) => ({
    ...module, label: labels[language] || labels.de,
  }));
}
