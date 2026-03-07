import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// Disable browser scroll restoration so the app always starts at the top
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
window.scrollTo(0, 0);

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
