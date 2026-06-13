// cli.ts — learnvis CLI entry point

import { JSDOM } from 'jsdom';
import * as d3 from 'd3';
import { FrameManager } from './vis/frame';
import { createMathRenderer } from './vis/math';
import { createGraph } from './vis/graph';
import { SVGRenderer } from './vis/renderer/svg';
import type { EntityState } from './vis/types';

// ── Parse args ──
const args = process.argv.slice(2);
const svgMode = args.includes('--svg');
const jsonMode = args.includes('--json');

if (!svgMode && !jsonMode) {
  console.error('Usage: cat data.json | learnvis --svg [--json]');
  process.exit(1);
}

// ── Read stdin ──
let stdin = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => stdin += chunk);
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(stdin.trim() || '{}');
    const output = processScene(input, { svg: svgMode, json: jsonMode });
    process.stdout.write(output);
  } catch (e: any) {
    console.error('Error:', e.message);
    process.exit(1);
  }
});

// ── Helpers ──

function svgEl(doc: Document, tag: string, attrs: Record<string, string | number>) {
  const el = doc.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

function palette() {
  const _p = (fg: string, bg: string) => ({ fg, bg, a: (pct: number) => `${fg} / ${(pct/100).toFixed(2)}` as any });
  return {
    primary: _p('oklch(0.38 0.03 60)', 'oklch(0.92 0.01 80)'),
    accent: _p('oklch(0.40 0.06 240)', 'oklch(0.90 0.02 240)'),
    danger: _p('oklch(0.45 0.12 20)', 'oklch(0.92 0.02 20)'),
    warning: _p('oklch(0.50 0.12 80)', 'oklch(0.92 0.04 80)'),
    info: _p('oklch(0.40 0.06 240)', 'oklch(0.90 0.02 240)'),
    success: _p('oklch(0.42 0.10 140)', 'oklch(0.90 0.03 140)'),
    dim: _p('oklch(0.45 0.01 80)', 'oklch(0.45 0.01 80)'),
    muted: _p('oklch(0.55 0.01 80)', 'oklch(0.55 0.01 80)'),
  };
}

interface SceneInput {
  steps?: { label?: string; elements: any[] }[];
  elements?: any[];
  width?: number;
  height?: number;
  theme?: string;
}

interface CliOptions { svg: boolean; json: boolean; }

function processScene(input: SceneInput, _opts: CliOptions): string {
  const W = input.width ?? 780, H = input.height ?? 460;
  const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`, { url: 'http://localhost' });
  const doc = dom.window.document;
  const svg = svgEl(doc, 'svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: `0 0 ${W} ${H}`, width: W, height: H });
  doc.body.appendChild(svg);

  const bg = svgEl(doc, 'g', {}); svg.appendChild(bg);
  const nodes = svgEl(doc, 'g', {}); svg.appendChild(nodes);
  const edges = svgEl(doc, 'g', {}); svg.appendChild(edges);
  const overlay = svgEl(doc, 'g', {}); svg.appendChild(overlay);

  const ctx = {
    W, H, margin: 0,
    palette: palette(),
    stage: {
      bg: d3.select(bg as any), nodes: d3.select(nodes as any),
      edges: d3.select(edges as any), overlay: d3.select(overlay as any),
    },
    root: d3.select(svg as any),
    svg: d3.select(svg as any),
  } as any;

  const fm = new FrameManager(ctx);
  const math = createMathRenderer(fm, ctx, ctx.palette);
  const graph = createGraph(fm, ctx, ctx.palette);

  const steps = input.steps ?? [{ elements: input.elements ?? [] }];
  const step = steps[0];
  const vertexMap = new Map<string, any>();

  fm.begin();
  for (const el of step.elements ?? []) {
    _declare(el, math, graph, vertexMap);
  }
  // Second pass for edges
  for (const el of step.elements ?? []) {
    if (el.type === 'edge') {
      const a = vertexMap.get(el.from), b = vertexMap.get(el.to);
      if (a && b) graph.edge(a, b, { directed: el.directed, marker: el.marker });
    }
  }
  fm.commit({ animate: false });

  if (_opts.json) {
    const lines: string[] = [];
    for (const [id, e] of fm.entities) {
      const d = e.desired as any;
      const entry: any = { module: d.type === 'vertex' || d.type === 'edge' ? 'graph' : 'math', type: d.type, id };
      for (const k of Object.keys(d)) { if (k !== 'type') entry[k] = d[k]; }
      lines.push(JSON.stringify(entry));
    }
    return lines.join('\n') + '\n';
  }

  const svgStr = (ctx.svg.node() as Element).outerHTML;
  return `<?xml version="1.0" encoding="UTF-8"?>\n${svgStr}`;
}

function _declare(el: any, math: any, graph: any, vm: Map<string, any>) {
  switch (el.type) {
    case 'point': math.point(el.id, [el.x, el.y], { color: el.color, label: el.label, size: el.size }); break;
    case 'vector': math.vector(el.id, el.from, el.to, { color: el.color, label: el.label, strokeW: el.strokeW, dash: el.dash }); break;
    case 'segment': math.segment(el.id, el.a, el.b, { color: el.color, strokeW: el.strokeW, dash: el.dash, label: el.label }); break;
    case 'circle': math.circle(el.id, [el.cx, el.cy], el.r, { color: el.color, fill: el.fill, strokeW: el.strokeW, dash: el.dash, opacity: el.opacity }); break;
    case 'polygon': math.polygon(el.id, el.vertices, { color: el.color, fill: el.fill, opacity: el.opacity }); break;
    case 'angle': math.angle(el.id, el.vertex, el.ray1, el.ray2, { color: el.color, label: el.label, size: el.size }); break;
    case 'fn': {
      const f = new Function('x', `return ${el.f}`) as (x: number) => number;
      math.fn(el.id, f, { domain: el.domain, range: el.range, x: el.x, y: el.y, width: el.width, height: el.height, samples: el.samples, color: el.color, label: el.label });
      break;
    }
    case 'grid': math.grid(el.id, el.origin, { width: el.width, height: el.height, spacing: el.spacing, color: el.color }); break;
    case 'axes': math.axes(el.id, el.origin, { xLen: el.xLen, yLen: el.yLen, xLabel: el.xLabel, yLabel: el.yLabel, color: el.color }); break;
    case 'rightAngle': math.rightAngle(el.id, el.vertex, el.ray1, el.ray2, { color: el.color, size: el.size }); break;
    case 'projection': math.projection(el.id, el.point, el.lineFrom, el.lineTo, { color: el.color, dash: el.dash, pointColor: el.pointColor }); break;
    case 'fill': math.fill(el.id, el.pts, { color: el.color, opacity: el.opacity }); break;
    case 'fillFn': { math.fillFn(el.id, new Function('x', `return ${el.f}`), { domain: el.domain, range: el.range, x: el.x, y: el.y, width: el.width, height: el.height, samples: el.samples, color: el.color, opacity: el.opacity, baseline: el.baseline }); break; }
    case 'vertex': {
      const v = graph.vertex(el.id, [el.x, el.y]);
      if (el.color) v.color(el.color);
      if (el.label) v.label(el.label);
      if (el.r) v.size(el.r);
      if (el.fill) v.fill(el.fill);
      vm.set(el.id, v);
      break;
    }
  }
}
