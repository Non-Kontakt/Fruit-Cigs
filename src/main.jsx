import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { installDevHooks } from "./devHooks.js";

// Dev-only test hooks (no-op / stripped in production builds).
installDevHooks();

// Dev-only `?reset` URL trigger: wipe browser storage and strip the query
// before mount. Bookmark `/Fruit-Cigs/?reset` on the dev server for a
// clean slate without the F12 console dance. Gated on `import.meta.env.DEV`
// so the deployed Pages build doesn't honour it — a stranger sharing a
// `?reset` link should never be able to silently nuke a player's saves.
if (import.meta.env.DEV && new URLSearchParams(window.location.search).has("reset")) {
  try { localStorage.clear(); } catch (e) {}
  try { sessionStorage.clear(); } catch (e) {}
  // Game data lives in IndexedDB now; a reset that leaves it standing isn't
  // one. Deletion is awaited via the blocked/success events before the app
  // mounts and reopens the database.
  await new Promise((resolve) => {
    const req = indexedDB.deleteDatabase("fruit-cigs");
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
  const url = new URL(window.location.href);
  url.searchParams.delete("reset");
  window.history.replaceState({}, "", url.toString());
}

// Disable browser scroll restoration so the app always starts at the top
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
window.scrollTo(0, 0);

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
