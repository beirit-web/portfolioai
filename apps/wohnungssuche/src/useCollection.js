import { useEffect, useState } from "react";
import { apiRequest, resultsOf } from "./api";

// Associate responses with their account and abort requests on account changes.
// A late response from the previous account must never enter the next session.
export function useCollection(endpoint, token, reloadKey = 0) {
  const [state, setState] = useState({ token, entries: [], error: "", loading: Boolean(token) });
  useEffect(() => {
    const controller = new AbortController();
    setState({ token, entries: [], error: "", loading: Boolean(token) });
    if (token) {
      apiRequest(endpoint, { token, signal: controller.signal })
        .then(data => setState({ token, entries: resultsOf(data), error: "", loading: false }))
        .catch(error => {
          if (error.name !== "AbortError") setState({ token, entries: [], error: error.message, loading: false });
        });
    }
    return () => controller.abort();
  }, [endpoint, token, reloadKey]);
  return state.token === token ? state : { entries: [], error: "", loading: Boolean(token) };
}
