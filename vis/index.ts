if (typeof Symbol.dispose === 'undefined') (Symbol as unknown as Record<string, symbol>).dispose = Symbol('Symbol.dispose');
if (typeof Symbol.asyncDispose === 'undefined') (Symbol as unknown as Record<string, symbol>).asyncDispose = Symbol('Symbol.asyncDispose');

// ── Core ──
export { canvas } from './scene';
export type { Scene, Gfx, CoordView, CoordView as CoordSystem, CanvasOpts, CoordsConfig, StepDef, StepsController, StepsOptions } from './types';
export type { Palette, Place, Vec2, AnimationConfig } from './types';

// ── Standalone tools ──
export { stepper, descBox } from './stepper';
export { katexify } from './katex';

// ── Low-level (escape hatches) ──
export { FrameManager } from './frame';
export { SVGRenderer } from './renderer/svg';
export type { Renderer, RenderHandle } from './renderer';
export { bootstrap } from './bootstrap';

// ── Utilities ──
export { TOKENS, alpha, palette } from './tokens';
export { len, exitPt, entryPt, getBounds, distribute, centerIn } from './geometry';
export { halo, svgLabel, defineArrows, createCanvas, MARKER, markerTip } from './primitives';
export { themes, resolveTheme } from './themes';
export { applyMat2, applyAffine, mat2Identity, affineIdentity, mat2Multiply, mat2VecMul, mat2Det, mat2Inverse, mat2FromAngle, mat2Scale, mat2Shear, mat2FromReflection, mat2Diag, mat2Eigen, fmtCell } from './linalg';
export type { Mat2, Affine2 } from './linalg';
