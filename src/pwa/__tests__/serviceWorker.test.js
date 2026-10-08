import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, it, expect, vi } from "vitest";

function worker() {
  const listeners = {};
  const config = { base: "/Fruit-Cigs/", revision: "next", assets: ["/Fruit-Cigs/index.html", "/Fruit-Cigs/assets/main.js"], audio: [] };
  const cache = { addAll: vi.fn().mockResolvedValue(), match: vi.fn().mockResolvedValue(new Response("shell")) };
  const caches = { open: vi.fn().mockResolvedValue(cache), keys: vi.fn().mockResolvedValue(["other-app", "fruit-cigs:/Another/:old", "fruit-cigs:/Fruit-Cigs/:old", "fruit-cigs:/Fruit-Cigs/:next"]), delete: vi.fn().mockResolvedValue(true) };
  const self = { location: { origin: "https://example.test" }, addEventListener: (name, fn) => { listeners[name] = fn; }, skipWaiting: vi.fn(), clients: { claim: vi.fn() } };
  class WorkerRequest extends Request {
    constructor(url, options) { super(new URL(url, self.location.origin), options); }
  }
  const code = readFileSync(new URL("../serviceWorker.js", import.meta.url), "utf8").replace("__FC_WORKER_CONFIG__", JSON.stringify(config));
  vm.runInNewContext(code, { self, caches, Request: WorkerRequest, Response, URL, fetch: vi.fn() });
  return { self, caches, cache, listeners };
}

describe("service worker ownership and lifecycle", () => {
  it("preloads the entire critical shell without taking over a running game", async () => {
    const { listeners, self, cache } = worker();
    let pending;
    listeners.install({ waitUntil: promise => { pending = promise; } });
    await pending;
    expect(cache.addAll.mock.calls[0][0].map(request => new URL(request.url).pathname)).toEqual(["/Fruit-Cigs/index.html", "/Fruit-Cigs/assets/main.js"]);
    expect(self.skipWaiting).not.toHaveBeenCalled();
    expect(self.clients.claim).not.toHaveBeenCalled();
  });
  it("only deletes obsolete caches owned by this application path", async () => {
    const { listeners, caches, self } = worker();
    let pending;
    listeners.activate({ waitUntil: promise => { pending = promise; } });
    await pending;
    expect(caches.delete.mock.calls).toEqual([["fruit-cigs:/Fruit-Cigs/:old"]]);
    expect(self.clients.claim).not.toHaveBeenCalled();
  });
  it("a failed critical asset rejects installation rather than declaring an incomplete shell ready", async () => {
    const { listeners, cache } = worker();
    cache.addAll.mockRejectedValue(new Error("asset unavailable"));
    let pending;
    listeners.install({ waitUntil: promise => { pending = promise; } });
    await expect(pending).rejects.toThrow("asset unavailable");
  });
  it("does not intercept other applications, external requests or ranged media", () => {
    const { listeners } = worker();
    for (const request of [
      new Request("https://example.test/Other/"),
      new Request("https://elsewhere.test/Fruit-Cigs/"),
      new Request("https://example.test/Fruit-Cigs/Home.mp3", { headers: { range: "bytes=0-99" } }),
    ]) {
      const respondWith = vi.fn();
      listeners.fetch({ request, respondWith });
      expect(respondWith).not.toHaveBeenCalled();
    }
  });
});
