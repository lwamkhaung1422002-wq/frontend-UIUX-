import { apiRequest } from "./api";

// A module-level promise makes refresh-token rotation safe when React StrictMode
// (or multiple API requests) asks for a refresh at the same time.
let refreshInFlight = null;

export function requestAccessTokenRefresh() {
  if (!refreshInFlight) {
    refreshInFlight = apiRequest("/auth/refresh", { method: "POST" })
      .finally(() => {
        refreshInFlight = null;
      });
  }

  return refreshInFlight;
}

export function accessTokenRefreshDelay(token) {
  try {
    const encodedPayload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = encodedPayload.padEnd(Math.ceil(encodedPayload.length / 4) * 4, "=");
    const payload = JSON.parse(atob(paddedPayload));
    if (typeof payload.exp === "number") {
      // Refresh one minute before expiry so a normal request never sees an
      // expired access token while the user is actively working.
      return Math.max(1_000, payload.exp * 1_000 - Date.now() - 60_000);
    }
  } catch {
    // The server remains the authority for token validity. This only controls
    // the client-side refresh schedule.
  }

  return 14 * 60_000;
}
