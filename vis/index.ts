if (typeof Symbol.dispose === 'undefined') (Symbol as unknown as Record<string, symbol>).dispose = Symbol('Symbol.dispose');
if (typeof Symbol.asyncDispose === 'undefined') (Symbol as unknown as Record<string, symbol>).asyncDispose = Symbol('Symbol.asyncDispose');

export { TOKENS, alpha, palette } from './tokens';
export { len, exitPt, entryPt, getBounds, distribute, centerIn } from './geometry';
export { halo, svgLabel, defineArrows, createCanvas, domLabel, MARKER, markerTip } from './primitives';
export { drawNodeContent, drawDummy, block, compoundRect, pipeline, group, lBend, crossEdge, edgeLabel, boundBox, createLayerGuides } from './shapes';
export { stepper, pages, steps } from './stepper';
export { katexify } from './katex';
export { create } from './create';
export { stage } from './agent';
export { themes, resolveTheme } from './themes';
