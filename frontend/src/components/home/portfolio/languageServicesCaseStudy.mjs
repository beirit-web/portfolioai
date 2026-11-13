import { portfolioSlugFor } from "./portfolioPresentation.mjs";

export function languageServicesCaseStudy(item, language) {
  if (portfolioSlugFor(item) !== "sprachdienstleistungen") return item;
  return {
    ...item,
    status: { de: "Portfolio-Fallstudie", ru: "Портфолио-кейс", uk: "Кейс портфоліо" }[language] || "Portfolio-Fallstudie",
    href: "/deutschlive/",
    liveUrl: "",
    localHref: "",
    showPrimaryAction: false,
    showContactCta: false,
  };
}
