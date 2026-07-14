import type { GlassOptics } from "@samasante/liquid-glass";

/**
 * Dark-theme liquid-glass optics for KubeCanvas.
 *
 * Philosophy: the glass effect is an accent, not the main visual language.
 * Subtle refraction at the edges, light frost, minimal brightness boost.
 * Surfaces stay dark and high-contrast.
 */

/** Main panel glass — sidebars, navbar, dialog cards. */
export const DARK_GLASS: Partial<GlassOptics> = {
  mapSize: 256,
  clipToShape: true,
  softEdge: true,
  depth: 0.6,
  curvature: 0.25,
  dispersion: 0.3,
  strength: 0.06,
  bend: 0.25,
  bendWidth: 0.08,
  frost: 1.5,
  brightness: 0.06,
  specular: 0.8,
  sheenAngle: 50,
  sheen: 0.4,
  sheenWidth: 1.5,
  sheenFalloff: 1.5,
  glow: 0.08,
  glowSpread: 0.4,
  glowFalloff: 1.5,
  splay: 0.15,
};

/** Compact toolbar glass — shape panel, canvas controls. Even subtler. */
export const DARK_GLASS_TOOLBAR: Partial<GlassOptics> = {
  ...DARK_GLASS,
  depth: 0.4,
  curvature: 0.15,
  dispersion: 0.2,
  strength: 0.04,
  bend: 0.15,
  frost: 1,
  brightness: 0.04,
  sheen: 0.25,
  glow: 0.04,
};

/** `behind` fill matching --bg-base (#080809). */
export const GLASS_BG = "#080809";
