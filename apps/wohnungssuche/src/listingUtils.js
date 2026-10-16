export const isIndividual = listing => listing.listing_kind === "individual_offer";
export const isDemo = listing => Boolean(listing.is_demo || listing.import_method === "demo");
export const scoreOf = listing => isDemo(listing) || !isIndividual(listing) ? null : listing.scores?.[0]?.score ?? null;
export const hasScore = listing => scoreOf(listing) !== null && Number.isFinite(Number(scoreOf(listing))) && Boolean(listing.scores?.[0]?.search_profile_name);

export function euro(value) {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value)) || Number(value) < 0) return null;
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(value));
}

export function quantity(value, suffix, absent) {
  const number = Number(value);
  return value === null || value === undefined || value === "" || !Number.isFinite(number) || number <= 0
    ? absent : `${number.toLocaleString("de-DE")} ${suffix}`;
}

export function safeUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value, window.location.origin);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch { return ""; }
}

export function searchableText(listing) {
  return [listing.title, listing.city, listing.description, listing.source_name, listing.status,
    listing.social_housing && "sozialwohnung", listing.wbs_required && "wbs",
    listing.private_landlord && "privat private vermietung", listing.balcony && "balkon",
    listing.fitted_kitchen && "einbaukueche ebk", listing.elevator && "aufzug",
    ...(listing.scores?.[0]?.reasons || [])].filter(Boolean).join(" ").toLowerCase();
}
