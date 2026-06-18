// cli.ts — learnvis v4 CLI entry point (data-driven SVG rendering)

import { JSDOM } from 'jsdom';
import { canvas } from './vis/scene';
import type { Scene } from './vis/types';

// ── Parse args ──
const args = process.argv.slice(2);
const svgMode = args.includes('--svg');
const jsonMode = args.includes('--json');

if (!svgMode && !jsonMode) {
  console.error('Usage: cat data.json | npx tsx cli.ts --svg [--json]');
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

// ── Types ──

interface SceneInput {
  steps?: { label?: string; elements: any[] }[];
  elements?: any[];
  width?: number;
  height?: number;
  theme?: string;
}

interface CliOptions { svg: boolean; json: boolean; }

// ── Process scene ──

function processScene(input: SceneInput, opts: CliOptions): string {
  const W = input.width ?? 780, H = input.height ?? 460;
  const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="app"></div></body></html>`, { url: 'http://localhost' });
  (global as any).document = dom.window.document;
  (global as any).window = dom.window;

  const s = canvas('#app', { width: W, height: H });
  const elements = input.steps?.[0]?.elements ?? input.elements ?? [];

  s.render(scene => {
    for (const el of elements) {
      _declare(el, scene);
    }
  });

  if (opts.json) {
    // JSON mode: dump entity states (low-level access)
    const fm = (s as any)._fm;
    const lines: string[] = [];
    for (const [id, e] of fm.entities) {
      const d = e.desired as any;
      const entry: any = { id, type: d.type };
      for (const k of Object.keys(d)) { if (k !== 'type') entry[k] = d[k]; }
      lines.push(JSON.stringify(entry));
    }
    s.dispose();
    return lines.join('\n') + '\n';
  }

  const svgStr = s.svg.outerHTML;
  s.dispose();
  return `<?xml version="1.0" encoding="UTF-8"?>\n${svgStr}`;
}

// ── Element dispatch (translates JSON element types to Scene API calls) ──

function _declare(el: any, scene: Scene) {
  const g = _dispatch(el, scene);
  // Apply common chainable styles
  if (g) {
    if (el.color) g.color(el.color);
    if (el.strokeW) g.stroke(el.strokeW);
    if (el.fill) g.fill(el.fill);
    if (el.opacity !== undefined) g.opacity(el.opacity);
    if (el.dash) g.dash(el.dash);
    if (el.label) g.label(el.label, el.labelPlace, el.labelGap);
    if (el.r || el.size) g.size(el.r ?? el.size);
  }
  return g;
}

function _dispatch(el: any, scene: Scene): any {
  switch (el.type) {
    case 'point':
      return scene.point(el.id, el.x, el.y);
    case 'vector':
      return scene.vector(el.id, el.from, el.to);
    case 'segment':
      return scene.line(el.id, el.a[0], el.a[1], el.b[0], el.b[1]);
    case 'polyline':
      return scene.polyline(el.id, el.pts ?? el.points);
    case 'circle':
      return scene.circle(el.id, el.cx, el.cy, el.r);
    case 'polygon':
      return scene.polygon(el.id, el.vertices);
    case 'rect':
      return scene.rect(el.id, el.x, el.y, el.w, el.h);
    case 'fill':
      return scene.fill(el.id, el.pts ?? el.vertices);
    case 'fn':
    case 'curve': {
      const f = new Function('x', `return (${el.f})`) as (x: number) => number;
      return scene.curve(el.id, f, el.domain ?? [el.x ?? 0, (el.x ?? 0) + (el.width ?? 400)]);
    }
    case 'angle':
      return scene.angle(el.id, el.vertex, el.ray1, el.ray2);
    case 'vertex': {
      const v = scene.vertex(el.id, el.x, el.y);
      if (el.r) v.size(el.r);
      return v;
    }
    case 'edge': {
      // Edges need vertex lookup — but since we're in a single render frame,
      // we can use string IDs directly
      return scene.edge(el.from, el.to);
    }
    case 'block':
      return scene.block(el.id, el.x, el.y, el.w ?? 120, el.h ?? 80);
    case 'label':
      return scene.label(el.id, el.text, el.x, el.y);
    case 'axes':
      // axes are handled through coords()
      // For backward compat: create coords + axes
      if (el.origin) {
        const vp = scene.coords({
          x: el.xRange ?? [-5, 5],
          y: el.yRange ?? [-5, 5],
        });
        vp.axes({ xLabel: el.xLabel, yLabel: el.yLabel });
      }
      return null;
    case 'grid':
      if (el.origin) {
        const vp = scene.coords({
          x: el.xRange ?? [-5, 5],
          y: el.yRange ?? [-5, 5],
        });
        vp.grid({ spacing: el.spacing, dash: el.dash, color: el.color });
      }
      return null;
    default:
      // Unknown type — skip
      return null;
  }
}

// Run immediately when executed as script
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('cli.ts')) {
  // stdin reading happens above
}
