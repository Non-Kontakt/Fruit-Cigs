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
  const url = new URL(window.location.href);
  url.searchParams.delete("reset");
  window.history.replaceState({}, "", url.toString());
}

// Disable browser scroll restoration so the app always starts at the top
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
window.scrollTo(0, 0);

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
