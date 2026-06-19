// vis/scene.ts — Scene: flat-namespace canvas API (replaces stage.ts + math.ts + graph.ts)

import * as d3 from 'd3';
import type { SimulationNodeDatum, SimulationLinkDatum } from 'd3';
import { eid } from './types';
import type {
  Gfx, CanvasOpts, CoordView, CoordsConfig,
  StepDef, StepsController, StepsOptions,
  Scene as SceneInterface,
  NodeState, LineState, RegionState, CurveState, GroupState,
  Vec2, Palette, StageCtx, AxesOpts,
} from './types';
import { FrameManager } from './frame';
import { bootstrap } from './bootstrap';
import { GfxImpl, resolveColor } from './gfx';
import { createCoordView } from './coords';
import { offsetLine, markerHalf } from './geometry';
import { TOKENS } from '../foundation/tokens';
import { themes } from '../foundation/themes';

// ── Layout vertex helper ──

interface LayoutVertex extends SimulationNodeDatum {
  id: string; x: number; y: number; r: number;
}

// ── Scene implementation ──

export class SceneImpl implements SceneInterface {
  readonly svg: SVGSVGElement;
  readonly width: number;
  readonly height: number;
  private _fm: FrameManager;
  private _palette: Palette;
  private _ctx: StageCtx;
  private _geom: { nW: number; nH: number; dR: number; rx: number; gap: number };

  constructor(selector: string, opts: CanvasOpts = {}) {
    const { width = 560, height = 400, margin = 48, theme, geom: gOpts, ms, animation, renderer } = opts;
    
    this._ctx = bootstrap(selector, {
      width, height, margin,
      geom: gOpts,
    });
    this._palette = this._ctx.palette;
    this._geom = this._ctx.geom;
    
    this._fm = new FrameManager(this._ctx, animation, renderer);
    
    this.svg = (this._ctx.svg as any).node() as SVGSVGElement;
    this.width = this._ctx.W;
    this.height = this._ctx.H;

    // Inject theme CSS custom properties
    this._injectTheme(theme || 'warm');
  }

  private _injectTheme(themeName: string) {
    if (typeof document === 'undefined') return; // SSR / JSDOM safety

    const theme = (themes as Record<string, any>)[themeName];
    if (!theme) return;

    // Combine TOKENS with theme-specific palette overrides
    const tp = theme.palette ? { ...TOKENS, ...theme.palette } : TOKENS;
    const fills: Record<string, string> = { ...TOKENS.fills, ...(theme.palette?.fills || {}) };

    let cssVars = '';
    for (const key of Object.keys(tp)) {
      if (key === 'fills') continue;
      const v = (tp as any)[key];
      const bgV = (fills as any)[key];
      const fgColor = typeof v === 'object' ? (v.fg ?? v) : v;
      const bgColor = typeof v === 'object' ? (v.bg ?? bgV) : bgV;
      const varName = key === 'dim' ? 'muted' : key;
      if (fgColor) cssVars += `--lv-${varName}: ${fgColor}; `;
      if (bgColor) cssVars += `--lv-${varName}-bg: ${bgColor}; `;
    }

    // Set mix-bg / mix-fg for color-mix blending base
    const isDark = themeName === 'dark';
    const mixBg = isDark ? 'oklch(0.20 0.01 250)' : 'oklch(0.97 0.005 80)';
    const mixFg = isDark ? 'oklch(0.90 0.01 250)' : 'oklch(0.25 0.02 60)';
    cssVars += `--lv-mix-bg: ${mixBg}; --lv-mix-fg: ${mixFg}; `;

    if (!cssVars) return;

    // 1) Inject <style> once per theme (page-wide, dedup)
    const themeClassName = `lv-theme-${themeName}`;
    const styleId = `lv-style-${themeClassName}`;
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.textContent = `@layer learnvis.theme { .${themeClassName} { ${cssVars} } }`;
      document.head.appendChild(styleEl);
    }

    // 2) ALWAYS set inline CSS variables on THIS SVG element
    //    (even if <style> was already injected by another canvas)
    const svgNode = this.svg;
    if (svgNode) {
      svgNode.classList.add(themeClassName);
      const entries = cssVars.trim().split(';').filter(Boolean);
      for (const e of entries) {
        const [prop, val] = e.split(':').map(s => s.trim());
        if (prop && val) svgNode.style.setProperty(prop, val);
      }
    }
  }

  // ── Primitives ──

  point(id: string, x: number, y: number): Gfx {
    const e = eid('node', id);
    const p = this._palette;
    this._fm.declare(e, {
      type: 'node', shape: 'circle',
      x, y, r: 4,
      fill: p.primary.fg, stroke: p.primary.fg,
    } as NodeState);
    return new GfxImpl(e, this._fm, p);
  }

  vertex(id: string, x: number, y: number): Gfx {
    const e = eid('node', id);
    const p = this._palette;
    this._fm.declare(e, {
      type: 'node', shape: 'circle',
      x, y, r: 10,
      fill: p.primary.a(15), stroke: p.primary.fg,
      label: id, labelPlace: 'below', labelGap: 6,
    } as NodeState);
    return new GfxImpl(e, this._fm, p);
  }

  edge(a: string | Gfx, b: string | Gfx): Gfx {
    const p = this._palette;
    
    // Resolve IDs
    const aId = typeof a === 'string' ? eid('node', a) : (a as GfxImpl).eid;
    const bId = typeof b === 'string' ? eid('node', b) : (b as GfxImpl).eid;
    
    // Look up positions
    const aEnt = this._fm.entities.get(aId);
    const bEnt = this._fm.entities.get(bId);
    if (!aEnt || !bEnt) {
      const missing = !aEnt ? aId : bId;
      throw new Error(`edge(): entity "${missing}" not found. Ensure vertex() is called before edge() in the same frame.`);
    }
    
    const ax = (aEnt.desired as NodeState).x;
    const ay = (aEnt.desired as NodeState).y;
    const ar = (aEnt.desired as NodeState).r ?? 10;
    const bx = (bEnt.desired as NodeState).x;
    const by = (bEnt.desired as NodeState).y;
    const br = (bEnt.desired as NodeState).r ?? 10;
    
    // Compute offset line (accounts for vertex radius + arrow marker)
    const { x1, y1, x2, y2 } = offsetLine(
      [ax, ay], [bx, by],
      ar + 4, // gap
      br + markerHalf(),
      true, // directed
    );
    
    const id = typeof a === 'string' && typeof b === 'string'
      ? `${a}:${b}`
      : `${aId.replace('node:', '')}:${bId.replace('node:', '')}`;
    const e = eid('line', id);
    
    this._fm.declare(e, {
      type: 'line',
      from: [ax, ay] as Vec2, to: [bx, by] as Vec2,
      x1, y1, x2, y2,
      stroke: p.dim.fg, strokeW: 1.8,
      directed: true, marker: 'arrow',
    } as LineState);
    
    return new GfxImpl(e, this._fm, p);
  }

  line(id: string, x1: number, y1: number, x2: number, y2: number): Gfx {
    const e = eid('line', id);
    const p = this._palette;
    this._fm.declare(e, {
      type: 'line',
      from: [x1, y1] as Vec2, to: [x2, y2] as Vec2,
      x1, y1, x2, y2,
      stroke: p.primary.fg, strokeW: 2,
    } as LineState);
    return new GfxImpl(e, this._fm, p);
  }

  vector(id: string, from: Vec2, to: Vec2): Gfx {
    const e = eid('line', id);
    const p = this._palette;
    this._fm.declare(e, {
      type: 'line',
      from: [...from] as Vec2, to: [...to] as Vec2,
      x1: from[0], y1: from[1], x2: to[0], y2: to[1],
      stroke: p.primary.fg, strokeW: 2,
      marker: 'arrow', directed: true,
    } as LineState);
    return new GfxImpl(e, this._fm, p);
  }

  polyline(id: string, pts: Vec2[]): Gfx {
    const e = eid('line', id);
    const p = this._palette;
    this._fm.declare(e, {
      type: 'line',
      points: pts.map(p => [...p] as Vec2),
      x1: pts[0]?.[0], y1: pts[0]?.[1],
      x2: pts[pts.length - 1]?.[0], y2: pts[pts.length - 1]?.[1],
      stroke: p.primary.fg, strokeW: 2,
    } as LineState);
    return new GfxImpl(e, this._fm, p);
  }

  circle(id: string, cx: number, cy: number, r: number): Gfx {
    const e = eid('region', id);
    const p = this._palette;
    this._fm.declare(e, {
      type: 'region', shape: 'circle',
      cx, cy, r,
      fill: 'none', stroke: p.primary.fg, strokeW: 2,
    } as RegionState);
    return new GfxImpl(e, this._fm, p);
  }

  polygon(id: string, vertices: Vec2[]): Gfx {
    const e = eid('region', id);
    const p = this._palette;
    this._fm.declare(e, {
      type: 'region', shape: 'polygon', vertices: vertices.map(v => [...v] as Vec2),
      fill: p.primary.a(15), stroke: p.primary.fg, strokeW: 2,
    } as RegionState);
    return new GfxImpl(e, this._fm, p);
  }

  rect(id: string, x: number, y: number, w: number, h: number): Gfx {
    const e = eid('region', id);
    const p = this._palette;
    this._fm.declare(e, {
      type: 'region', shape: 'polygon',
      vertices: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]],
      fill: 'none', stroke: p.primary.fg, strokeW: 2,
      _rx: 0,
    } as RegionState);
    return new GfxImpl(e, this._fm, p);
  }

  curve(id: string, fn: (x: number) => number, domain: [number, number]): Gfx {
    const e = eid('curve', id);
    const p = this._palette;
    // Use reasonable bounds — we can't know canvas bounds here easily,
    // so use domain as the rendering region
    const sx = domain[0], ex = domain[1];
    const x = Math.min(sx, ex);
    const w = Math.abs(ex - sx);
    const samples = 200;
    this._fm.declare(e, {
      type: 'curve',
      f: fn.toString(),
      domain,
      x, y: 0, width: w, height: 400, samples,
      stroke: p.primary.fg, strokeW: 2,
    } as unknown as CurveState);
    return new GfxImpl(e, this._fm, p);
  }

  angle(id: string, vertex: Vec2, ray1: Vec2, ray2: Vec2): Gfx {
    const e = eid('group', id);
    const p = this._palette;
    this._fm.declare(e, {
      type: 'group', subtype: 'angle',
      vertex: [...vertex] as Vec2,
      ray1: [...ray1] as Vec2,
      ray2: [...ray2] as Vec2,
      arcR: 24,
      stroke: p.primary.fg, strokeW: 1.5, fill: p.primary.a(15),
    } as GroupState);
    return new GfxImpl(e, this._fm, p);
  }

  fill(id: string, vertices: Vec2[]): Gfx {
    const e = eid('region', id);
    const p = this._palette;
    this._fm.declare(e, {
      type: 'region', shape: 'fill',
      vertices: vertices.map(v => [...v] as Vec2),
      fill: p.primary.a(15), stroke: 'none', strokeW: 0,
    } as RegionState);
    return new GfxImpl(e, this._fm, p);
  }

  block(id: string, x: number, y: number, w: number, h: number): Gfx {
    const e = eid('node', id);
    const p = this._palette;
    const fill = `color-mix(in oklab, ${p.primary.bg} 85%, white)`;
    this._fm.declare(e, {
      type: 'node', shape: 'rect',
      x, y, w, h, rx: this._geom.rx,
      fill, stroke: p.primary.fg, strokeW: 1.2,
      label: id,
    } as NodeState);
    return new GfxImpl(e, this._fm, p);
  }

  label(id: string, text: string, x: number, y: number): Gfx {
    const e = eid('node', id);
    const p = this._palette;
    this._fm.declare(e, {
      type: 'node', shape: 'circle',
      x, y, r: 0,
      fill: 'none', stroke: 'none',
      label: text, labelPlace: 'below', labelGap: 0,
    } as NodeState);
    return new GfxImpl(e, this._fm, p);
  }

  // ── Layout ──

  layout(type: 'circular' | 'force', vertices: Gfx[], edges?: Gfx[], opts?: any): void {
    const vs: LayoutVertex[] = vertices.map(g => {
      const eid = (g as GfxImpl).eid;
      const ent = this._fm.entities.get(eid);
      if (!ent) throw new Error(`layout(): entity "${eid}" not found in frame`);
      const d = ent.desired as NodeState;
      return { id: eid, x: d.x, y: d.y, r: d.r ?? 10 };
    });

    const n = vs.length;
    if (n === 0) return;
    const cx = opts?.center?.[0] ?? this.width / 2;
    const cy = opts?.center?.[1] ?? this.height / 2;

    switch (type) {
      case 'circular': {
        const r = opts?.radius ?? Math.min(this.width, this.height) * 0.35;
        vs.forEach((v, i) => {
          const angle = (2 * Math.PI * i) / n - Math.PI / 2;
          v.x = cx + r * Math.cos(angle);
          v.y = cy + r * Math.sin(angle);
          this._fm.patch(v.id, { x: v.x, y: v.y } as any);
        });
        break;
      }
      case 'force': {
        const sim = d3.forceSimulation<LayoutVertex>(vs)
          .force('charge', d3.forceManyBody<LayoutVertex>().strength(-300))
          .force('center', d3.forceCenter(cx, cy))
          .force('collision', d3.forceCollide<LayoutVertex>().radius(d => d.r + 2));
        if (edges && edges.length > 0) {
          // Build a map from node entity IDs to LayoutVertex
          const nodeMap = new Map<string, LayoutVertex>();
          for (const v of vs) nodeMap.set(v.id, v);

          const links: SimulationLinkDatum<LayoutVertex>[] = [];
          for (const e2 of edges) {
            const edgeEid = (e2 as GfxImpl).eid;
            // Edge eid format: "line:A:B" → nodes are "node:A" and "node:B"
            const parts = edgeEid.replace('line:', '').split(':');
            if (parts.length >= 2) {
              const srcId = `node:${parts[0]}`;
              const tgtId = `node:${parts[1]}`;
              const srcV = nodeMap.get(srcId);
              const tgtV = nodeMap.get(tgtId);
              if (srcV && tgtV) {
                links.push({ source: srcV, target: tgtV });
              }
            }
          }
          if (links.length > 0) {
            sim.force('link', d3.forceLink<LayoutVertex, SimulationLinkDatum<LayoutVertex>>(links).distance(60));
          }
        }
        sim.stop();
        for (let i = 0; i < 300; i++) sim.tick();
        vs.forEach(v => {
          this._fm.patch(v.id, { x: v.x, y: v.y } as any);
        });
        break;
      }
    }
  }

  // ── Screen-space axes / grid (standalone, no coords projection) ──

  axes(id: string, origin: Vec2, opts?: AxesOpts): Gfx {
    const e = eid('group', id);
    const p = this._palette;
    const ox = origin[0], oy = origin[1];
    const xLen = opts?.xLen ?? 300;
    const yLen = opts?.yLen ?? 200;
    // Axes extend from origin in the positive direction:
    // x-axis goes right, y-axis goes up (smaller SVG y)
    this._fm.declare(e, {
      type: 'group', subtype: 'axes',
      ox, oy,
      xMin: ox, xMax: ox + xLen,
      yMin: oy - yLen, yMax: oy,
      xLabel: opts?.xLabel, yLabel: opts?.yLabel,
      arrowSize: opts?.arrowSize,
      stroke: p.dim.fg, strokeW: 1.2, fill: 'none',
    } as GroupState);
    return new GfxImpl(e, this._fm, p);
  }

  gridScreen(id: string, origin: Vec2, opts?: { width?: number; height?: number; spacing?: number; color?: string }): Gfx {
    const e = eid('group', id);
    const p = this._palette;
    const w = opts?.width ?? this.width;
    const h = opts?.height ?? this.height;
    const sp = opts?.spacing ?? 40;
    this._fm.declare(e, {
      type: 'group', subtype: 'grid',
      mx0: origin[0], mx1: origin[0] + w, my0: origin[1], my1: origin[1] + h,
      mStep: sp,
      gx: origin[0], gy: origin[1], w, h, sp,
      stroke: opts?.color ?? '#d4d4d4', strokeW: 0.5,
    } as GroupState);
    return new GfxImpl(e, this._fm, p);
  }

  // ── Coordinate projection ──

  coords(config?: CoordsConfig): CoordView {
    return createCoordView(this._fm, this._palette, config, this.width, this.height, this._geom);
  }

  // ── Frame lifecycle ──

  render(fn: (s: SceneInterface) => void, opts?: { animate?: boolean }): void {
    this._fm.begin();
    fn(this);
    this._fm.commit({ animate: opts?.animate });
  }

  steps(defs: StepDef[], opts?: StepsOptions): StepsController {
    return createStepsController(this, defs, opts);
  }

  // ── Lifecycle ──

  [Symbol.dispose](): void {
    // Clean up if needed
  }

  dispose(): void {
    // Alias for Symbol.dispose
    this[Symbol.dispose]();
  }
}

// ── Steps controller (internal) ──

function createStepsController(
  scene: SceneImpl,
  defs: StepDef[],
  opts?: StepsOptions,
): StepsController {
  let _current = (opts?.start ?? 0) - 1; // will go to 0 on first next()
  const _total = defs.length;
  let _mode: 'full' | 'update' = opts?.mode ?? 'full';
  const _listeners: Array<(i: number, step: StepDef) => void> = [];

  function _exec(i: number) {
    const def = defs[i];
    if (!def) return;
    const fn = def.frame;
    if (_mode === 'full') {
      scene.render(s => {
        fn(s);
      });
    } else {
      // 'update' mode: only apply diff
      scene.render(s => {
        fn(s);
      });
    }
    _listeners.forEach(fn => fn(i, def));
  }

  function go(i: number) {
    const idx = Math.max(0, Math.min(i, _total - 1));
    _current = idx;
    _exec(idx);
  }

  function next() {
    go(_current + 1);
  }

  function prev() {
    go(_current - 1);
  }

  function reset() {
    _current = -1;
    scene.render(() => {
      // empty frame — clear all entities
    });
  }

  return {
    go, next, prev, reset,
    get current() { return _current; },
    get total() { return _total; },
    get currentStepDef() { return _current >= 0 && _current < _total ? defs[_current] : null; },
    onChange(fn: (i: number, step: StepDef) => void) {
      _listeners.push(fn);
      return () => {
        const idx = _listeners.indexOf(fn);
        if (idx >= 0) _listeners.splice(idx, 1);
      };
    },
    destroy() {
      // Cleanup listeners
    },
  };
}

// ── Public factory ──

export function canvas(selector: string, opts?: CanvasOpts): SceneImpl {
  return new SceneImpl(selector, opts);
}
