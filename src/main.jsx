import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// `?reset` URL trigger: wipe browser storage and strip the query before
// mount. Lets us bookmark e.g. /Fruit-Cigs/?reset for a clean slate on
// each click without the F12 console dance.
if (new URLSearchParams(window.location.search).has("reset")) {
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
