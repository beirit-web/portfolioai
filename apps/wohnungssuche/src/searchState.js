export const emptyFilters = { query: "", city: "all", maxColdRent: "", maxBudget: "", socialOnly: false, hideDemo: false };
const sortOptions = ["score", "newest", "rent", "area", "rooms", "social"];
const parameterNames = {
  query: "q", city: "city", maxColdRent: "max_cold_rent", maxBudget: "max_warm_rent",
  socialOnly: "social", hideDemo: "hide_demo",
};

function budget(value) {
  return value !== null && value.trim() !== "" && Number.isFinite(Number(value)) && Number(value) >= 0
    ? String(Number(value)) : "";
}

export function readSearchState(search) {
  const params = new URLSearchParams(search);
  return {
    filters: {
      query: (params.get("q") || "").trim().slice(0, 200),
      city: (params.get("city") || "").trim().slice(0, 120) || "all",
      maxColdRent: budget(params.get("max_cold_rent")),
      maxBudget: budget(params.get("max_warm_rent")),
      socialOnly: params.get("social") === "1",
      hideDemo: params.get("hide_demo") === "1",
    },
    sort: sortOptions.includes(params.get("sort")) ? params.get("sort") : "score",
  };
}

export function searchUrl(href, filters, sort) {
  const url = new URL(href);
  for (const [key, param] of Object.entries(parameterNames)) {
    url.searchParams.delete(param);
    if (filters[key] !== emptyFilters[key]) url.searchParams.set(param, typeof filters[key] === "boolean" ? "1" : filters[key]);
  }
  url.searchParams.delete("sort");
  if (sort !== "score") url.searchParams.set("sort", sort);
  return url;
}
