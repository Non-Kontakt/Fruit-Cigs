import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { F, FONT, BODY_FONT, LH, TEXT, TYPE } from "../tokens.js";

describe("Pixel Operator typography", () => {
  it("uses the same family for display and reading text", () => {
    expect(FONT).toContain("'Pixel Operator'");
    expect(BODY_FONT).toBe(FONT);
    for (const style of Object.values(TYPE)) {
      expect(style.fontFamily).toBe(FONT);
      expect(style.fontWeight).toBe(400);
      expect(style.lineHeight).toBeLessThanOrEqual(LH.prose);
    }
  });

  it("keeps fine print readable and multiline leading compact", () => {
    expect(F.micro).toBeGreaterThanOrEqual(16);
    expect(TYPE.body.fontSize).toBe(24);
    for (const style of Object.values(TEXT)) {
      expect(style.lineHeight).toBeGreaterThanOrEqual(1);
      expect(style.lineHeight).toBeLessThanOrEqual(1.2);
    }
  });

  it("bundles real regular and bold WOFF2 faces for the offline shell", () => {
    const css = readFileSync(new URL("../../index.css", import.meta.url), "utf8");
    for (const [file, weight] of [["PixelOperator.woff2", 400], ["PixelOperator-Bold.woff2", 700]]) {
      const face = css.split("@font-face").find(block => block.includes(file));
      expect(face).toContain(`font-weight: ${weight}`);
      expect(existsSync(fileURLToPath(new URL(`../../../public/fonts/${file}`, import.meta.url)))).toBe(true);
    }
    expect(css).not.toMatch(/Press Start|IBM Plex|size-adjust/);
    expect(css).toContain("font-synthesis: none");
  });
});
