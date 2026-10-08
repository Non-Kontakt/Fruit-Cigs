import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

export function offlineBuild() {
  let config;
  return {
    name: "fruit-cigs-offline-shell",
    apply: "build",
    enforce: "post",
    configResolved(value) { config = value; },
    generateBundle(_options, bundle) {
      if (!bundle["index.html"]) throw new Error("Cannot create offline shell without built index.html");
      const base = config.base;
      if (!base.startsWith("/") || !base.endsWith("/")) throw new Error("Offline shell requires an absolute path base");
      const fonts = readdirSync(path.join(config.publicDir, "fonts")).filter(name => name.endsWith(".woff2")).sort().map(name => `fonts/${name}`);
      const publicFiles = ["manifest.json", "icon-192.png", "icon-512.png", "icon-maskable-192.png", "icon-maskable-512.png", "apple-touch-icon.png", ...fonts];
      const builtFiles = Object.keys(bundle).filter(name => !name.endsWith(".map")).sort();
      const source = readFileSync(path.join(config.root, "src/pwa/serviceWorker.js"), "utf8");
      const hash = createHash("sha256").update(source);
      for (const name of builtFiles) hash.update(name).update(bundle[name].type === "chunk" ? bundle[name].code : bundle[name].source);
      for (const name of publicFiles) hash.update(name).update(readFileSync(path.join(config.publicDir, name)));
      const manifest = {
        base,
        revision: hash.digest("hex").slice(0, 16),
        assets: [...builtFiles, ...publicFiles].map(name => base + name),
        audio: readdirSync(config.publicDir).filter(name => name.endsWith(".mp3")).map(name => base + name),
      };
      this.emitFile({ type: "asset", fileName: "sw.js", source: source.replace("__FC_WORKER_CONFIG__", JSON.stringify(manifest)) });
    },
  };
}
