// Thin wrapper around @paper-design/shaders for the cig-card foil effects.
// Card backs run an ambient dithering wave in the pack colour; collected
// badges (and the legendary sky) run a dormant dithering ripple that only
// spins up while the pointer is over the card. See the approved design
// pitch for the exact uniforms this mirrors.
import {
  ShaderMount,
  ditheringFragmentShader,
  DitheringShapes,
  DitheringTypes,
} from "@paper-design/shaders";

export { ShaderMount, ditheringFragmentShader, DitheringShapes, DitheringTypes };

// Standard sizing uniforms — the dithering shader ignores fit/scale/rotation
// in practice since it draws straight off gl_FragCoord, but ShaderMount
// still expects the full sizing uniform set.
const SIZING = {
  u_fit: 0,
  u_scale: 1,
  u_rotation: 0,
  u_offsetX: 0,
  u_offsetY: 0,
  u_originX: 0.5,
  u_originY: 0.5,
  u_worldWidth: 0,
  u_worldHeight: 0,
};

const hexToRgba = (hex, a = 1) => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, a];
};

// Lerp a hex colour toward white (k > 0) or black (k < 0); |k| is the blend
// amount. mixColor(hex, 0) returns the colour unchanged as a plain rgba.
export function mixColor(hex, k) {
  const c = hexToRgba(hex);
  const t = k > 0 ? 1 : 0;
  const m = Math.abs(k);
  return [c[0] + (t - c[0]) * m, c[1] + (t - c[1]) * m, c[2] + (t - c[2]) * m, 1];
}

export function prefersReducedMotion() {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

// Mounts an animated 4x4-Bayer dithering pattern into `el`.
//   back/front  — rgba arrays (see mixColor)
//   shape       — DitheringShapes key, e.g. "wave" | "ripple"
//   pxSize      — dithering grid pixel size
//   speed       — animation speed once running
//   hoverCard   — if given, the mount stays dormant (speed 0) until the
//                 pointer enters this element, matching the pitch's foil
//                 patches; if omitted the mount animates ambiently at `speed`
// Reduced motion always renders a static frame. Returns the ShaderMount
// (has .dispose()) so callers can clean up on unmount.
export function mountDithering(el, { back, front, shape = "wave", pxSize = 3, speed = 0.35, hoverCard = null } = {}) {
  const reduced = prefersReducedMotion();
  const uniforms = {
    ...SIZING,
    u_colorBack: back,
    u_colorFront: front,
    u_shape: DitheringShapes[shape],
    u_type: DitheringTypes["4x4"],
    u_pxSize: pxSize,
  };

  if (hoverCard) {
    const mount = new ShaderMount(el, ditheringFragmentShader, uniforms, undefined, 0, 4200);
    if (!reduced) {
      const onEnter = () => mount.setSpeed(speed);
      const onLeave = () => mount.setSpeed(0);
      hoverCard.addEventListener("pointerenter", onEnter);
      hoverCard.addEventListener("pointerleave", onLeave);
      const baseDispose = mount.dispose;
      mount.dispose = () => {
        hoverCard.removeEventListener("pointerenter", onEnter);
        hoverCard.removeEventListener("pointerleave", onLeave);
        baseDispose();
      };
    }
    return mount;
  }

  return new ShaderMount(el, ditheringFragmentShader, uniforms, undefined, reduced ? 0 : speed, 4200);
}
