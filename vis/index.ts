if (typeof Symbol.dispose === 'undefined') (Symbol as unknown as Record<string, symbol>).dispose = Symbol('Symbol.dispose');
if (typeof Symbol.asyncDispose === 'undefined') (Symbol as unknown as Record<string, symbol>).asyncDispose = Symbol('Symbol.asyncDispose');

export { TOKENS, alpha, palette } from './tokens';
export { len, exitPt, entryPt, getBounds, distribute, centerIn } from './geometry';
export { halo, svgLabel, defineArrows, createCanvas, MARKER, markerTip } from './primitives';
export { stepper, descBox } from './stepper';
export { katexify } from './katex';
export { bootstrap } from './bootstrap';
export { stage, stage3D } from './stage';
export { createLayout } from './layout';
export type { LayoutAPI, LayoutNode, LayoutPort, LayoutEdge, LayoutLayer } from './layout';
export { FrameManager } from './frame';
export { SVGRenderer } from './renderer/svg';
export type { Renderer, RenderHandle } from './renderer';
export { themes, resolveTheme } from './themes';
