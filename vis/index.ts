if (typeof Symbol.dispose === 'undefined') (Symbol as unknown as Record<string, symbol>).dispose = Symbol('Symbol.dispose');
if (typeof Symbol.asyncDispose === 'undefined') (Symbol as unknown as Record<string, symbol>).asyncDispose = Symbol('Symbol.asyncDispose');

export { TOKENS, alpha, palette } from './tokens';
export { len, exitPt, entryPt, getBounds, distribute, centerIn } from './geometry';
export { halo, svgLabel, defineArrows, createCanvas, domLabel, MARKER, markerTip } from './primitives';
export { drawNodeContent, drawDummy, block, compoundRect, pipeline, group, lBend, crossEdge, edgeLabel, boundBox, createLayerGuides } from './shapes';
export { stepper } from './stepper';
export { katexify } from './katex';
export { create } from './create';
export { stage, stage3D } from './stage';
export { FrameManager } from './frame';
export { SVGRenderer } from './renderer/svg';
export type { Renderer, RenderHandle } from './renderer';
export { themes, resolveTheme } from './themes';
