// vis/types.ts — public type declarations for learnvis

import type { Selection } from 'd3';

// ── D3 selection alias — loose generics for interface compatibility ──
type S = Selection<any, any, any, any>;
export type { S as D3S };

// ── Color & Palette ──
export interface SemColor {
  fg: string;
  bg: string;
  a(pct: number): string;
}
export interface Palette {
  primary: SemColor; accent: SemColor; danger: SemColor;
  warning: SemColor;  info: SemColor;    success: SemColor;
  dim: SemColor;      muted: SemColor;
}

// ── Theme ──
export interface Theme {
  name: string;
  palette: Record<string, { fg: string; bg?: string }>;
}

// ── Geometry ──
export type Point = { x: number; y: number };
export type Delta = { dx: number; dy: number };
export interface Rect { x: number; y: number; w: number; h: number; rx?: number }

// ── Label placement ──
export type Place = 'above' | 'below' | 'left' | 'right';

// ── Stage creation ──
export interface StageOptions {
  theme?: string; width?: number; height?: number; margin?: number;
  container?: string | HTMLElement; panel?: string | HTMLElement;
  geom?: { nW: number; nH: number; dR: number; rx: number; gap: number };
  ms?: number;
}

// ── Element ──
export interface El {
  _id: string; _type: string; _x: number; _y: number;
  _opts: Record<string, unknown>; _text: string;
  pos(): Point;
  move(x: number | [number, number], y?: number): El;
  dx(dx: number, dy: number): El;
  font(k: string, v: string): El;
  color(c: string): El;
  size(s: number): El;
  opacity(v: number): El;
  text(t: string): El;
  show(): void;
  glyph(g: string): El;
}

// ── Tag ──
export interface Tag {
  above(gap?: number): Tag; below(gap?: number): Tag;
  left(gap?: number): Tag;  right(gap?: number): Tag;
  gap(g: number): Tag; color(c: string): Tag;
  text(t: string): Tag; size(s: number): Tag; bold(): Tag;
}

// ── Stepper ──
export interface StepperOptions { length?: number; container?: string; panel?: string; labels?: string[]; texts?: string[]; start?: number }
export interface Stepper { go(s: number): void }

// ── Axes ──
export interface AxesOptions { xRange?: [number, number]; yRange?: [number, number]; ticks?: number; labels?: boolean; xLabel?: string; yLabel?: string }

// ── Context (the object returned by createStage) ──
export interface StageCtx {
  svg: S; W: number; H: number; M: number;
  stage: { bg: S; nodes: S; edges: S; overlay: S };
  root: S;
  show(fn: () => void, ms?: number): void;
  flow(fn: () => void, ms?: number): void;
  render(fn: () => void, ms?: number): void;
  callout(anchor: Point, html: string, o?: Record<string, unknown>): S;
  dummy(n: { id: string; x: number; y: number }, o: Record<string, unknown>): S;
  edge(from: { id: string; x: number; y: number }, to: { id: string; x: number; y: number }, o?: Record<string, unknown>): S;
  node(n: { id: string; x: number; y: number }, o: Record<string, unknown>): S;
}

// ── Agent Stage (high-level) ──
export interface AgentStage {
  ctx: StageCtx;
  palette: Palette;
  stage: { bg: S; nodes: S; edges: S; overlay: S };
  root: S;

  dot(x: number | [number, number], y?: number): El;
  zone(x: number, y: number, w: number, h: number, label: string, color: string): El;
  arrow(from: El, dx: number | [number, number], dy?: number): El;
  tag(target: El | { pos(): Point }, html: string): Tag;
  line(x1: number | [number, number], y1: number | [number, number], x2?: number, y2?: number): El;
  path(pts: [number, number][], opts?: { stroke?: string; dash?: string }): El[];
  axes(x: number, y: number, opts?: AxesOptions): void;

  draw(ms?: number): void;
  animate(count: number, stepFn: (i: number) => void, opts?: StepperOptions): Stepper;

  theme: Theme;
  raw: { show(fn: () => void, ms?: number): void; flow(fn: () => void, ms?: number): void; render(fn: () => void, ms?: number): void };
}
