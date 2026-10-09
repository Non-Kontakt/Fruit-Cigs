import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const source = readFileSync("dist/sw.js", "utf8");
const config = JSON.parse(source.match(/const CONFIG = (\{[^\n]+\});/)[1]);
assert(config.assets.some(file => file.endsWith(".js")), "Offline shell is missing JavaScript");
assert(config.assets.some(file => file.endsWith(".css")), "Offline shell is missing CSS");
for (const font of ["PixelOperator.woff2", "PixelOperator-Bold.woff2"]) {
  assert(config.assets.includes(`${config.base}fonts/${font}`), `Offline shell is missing ${font}`);
}
for (const file of config.assets) {
  assert(existsSync(path.join("dist", file.slice(config.base.length))), `Missing precache asset: ${file}`);
}
const html = readFileSync("dist/index.html", "utf8");
assert(!html.includes("mcp.figma.com"), "Design capture script must not ship");
assert(!html.includes("fonts.googleapis.com"), "The game font must work without an external request");
const scripts = config.assets.filter(file => file.endsWith(".js"));
for (const file of scripts) {
  const code = readFileSync(path.join("dist", file.slice(config.base.length)), "utf8");
  for (const debug of ["window.__fc", "Debug Tools", "Prestige testing tools"]) {
    assert(!code.includes(debug), `Production bundle contains ${debug}`);
  }
}
console.log(`Production shell ${config.revision}: ${config.assets.length} complete local assets, no public debug hook or design capture.`);
