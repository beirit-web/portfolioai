import { useEffect, useState } from "react";
import { emptyFilters, readSearchState, searchUrl } from "./searchState";

export function useHousingSearch() {
  const [state, setState] = useState(() => readSearchState(location.search));
  const [draft, setDraft] = useState(state.filters);
  useEffect(() => {
    const restore = () => {
      const next = readSearchState(location.search);
      setState(next);
      setDraft(next.filters);
    };
    addEventListener("popstate", restore);
    return () => removeEventListener("popstate", restore);
  }, []);

  function apply(filters = draft, sort = state.sort, keepDraft = false) {
    const url = searchUrl(location.href, filters, sort);
    // Normalize typed values in the same way as bookmarked URLs.
    const next = readSearchState(url.search);
    const normalized = searchUrl(url.href, next.filters, next.sort);
    if (normalized.href !== location.href) {
      history.pushState({}, "", normalized);
    }
    setState(next);
    if (!keepDraft) setDraft(next.filters);
  }

  return {
    ...state, draft, setDraft, apply,
    setSort: sort => apply(state.filters, sort, true),
    reset: () => apply(emptyFilters, "score"),
    remove: key => apply({ ...state.filters, [key]: emptyFilters[key] }),
  };
}
