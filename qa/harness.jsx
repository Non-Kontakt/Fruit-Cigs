import React from "react";
import ReactDOM from "react-dom/client";
import "../src/index.css";
import { FIXTURE_MAP, FIXTURES } from "./fixtures/components.jsx";

// Dev-only component harness. Renders a single game component in isolation
// with deterministic mock props, selected by `?c=<fixtureId>`. With no
// param it renders an index of every fixture so you can click through them
// by hand. Playwright drives it by URL and screenshots each fixture.

// Some components pull in the storage shim / audio helpers that App.jsx sets
// up. Provide a minimal localStorage-backed window.storage so nothing throws
// when the harness mounts a component outside the real app shell.
if (!window.storage) {
  window.storage = {
    async get(key) { const v = localStorage.getItem(key); return v !== null ? { key, value: v } : null; },
    async set(key, value) { localStorage.setItem(key, value); return { key, value }; },
    async delete(key) { localStorage.removeItem(key); return { key, deleted: true }; },
    async list(prefix) {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!prefix || k.startsWith(prefix)) keys.push(k); }
      return { keys };
    },
  };
}

function Index() {
  return (
    <div style={{ fontFamily: "monospace", color: "#e2e8f0", padding: 24, lineHeight: 1.9 }}>
      <div style={{ fontSize: 20, color: "#4ade80", marginBottom: 12 }}>Fruit Cigs — QA fixtures</div>
      <div style={{ color: "#94a3b8", marginBottom: 16, fontSize: 13 }}>
        Append <code>?c=&lt;id&gt;</code> to view one in isolation.
      </div>
      {FIXTURES.map(f => (
        <div key={f.id}>
          <a href={`?c=${f.id}`} style={{ color: "#60a5fa" }}>{f.id}</a>
          <span style={{ color: "#64748b", marginLeft: 10 }}>{f.label}</span>
        </div>
      ))}
    </div>
  );
}

const id = new URLSearchParams(location.search).get("c");
const fixture = id ? FIXTURE_MAP[id] : null;

ReactDOM.createRoot(document.getElementById("qa-root")).render(
  fixture ? fixture.render() : <Index />
);
