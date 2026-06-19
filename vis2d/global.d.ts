// Type declarations for untyped dependencies

declare module 'jsdom' {
  export class JSDOM {
    constructor(html: string, opts?: Record<string, unknown>);
    window: { document: Document; [key: string]: unknown };
  }
}

declare module 'd3-shape' {
  export function symbol<T = unknown>(): {
    type(t: unknown): T;
    size(s: number): T;
    (): unknown;
  };
  export const symbolCircle: unknown;
  export const symbolCross: unknown;
  export const symbolDiamond: unknown;
  export const symbolSquare: unknown;
  export const symbolStar: unknown;
  export const symbolTriangle: unknown;
  export const symbolWye: unknown;
  export function arc<T = unknown>(): (opts: {
    innerRadius?: number;
    outerRadius?: number;
    startAngle?: number;
    endAngle?: number;
  }) => string | null;
}
