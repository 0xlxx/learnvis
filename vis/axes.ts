// vis/axes.ts — coordinate axes renderer
import type { Point, SemColor, Tag, AxesOptions } from './types';
import type { Selection } from 'd3';

export type AxesRenderer = () => void;

function formatTick(v: number): string {
  if (Number.isInteger(v)) return String(v);
  const s = v.toFixed(2);
  return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
}

export function createAxes(
  bg: Selection<any, any, any, any>,
  p: Record<string, SemColor>,
  tagFn: (pos: Point, html: string) => Tag,
  schedule: () => void,
): { axes(x: number, y: number, opts?: AxesOptions): void; _axes: AxesRenderer[] } {
  const _axes: AxesRenderer[] = [];

  function axes(ox: number, oy: number, { xRange = [0, 10], yRange = [0, 10], ticks = 5, labels = true, xLabel, yLabel }: AxesOptions = {}) {
    const originX = ox, originY = oy;
    const len = 300;
    const c = p.dim;
    const tickLen = 5, labelGap = 18;
    const axisW = 1.3;

    _axes.push(() => {
      const x = originX, y = originY;
      const g = bg;

      g.selectAll('.ax-grid,.ax-tip,.ax-origin,.ax-tick,.ax-line').remove();

      // Grid lines
      for (let i = 0; i <= ticks; i++) {
        const tx = x + (len / ticks) * i;
        const ty = y - (len / ticks) * i;
        g.append('line').attr('class','ax-grid').attr('x1',tx).attr('y1',y).attr('x2',tx).attr('y2',y-len)
          .attr('stroke', c.a(8)).attr('stroke-width',0.3);
        g.append('line').attr('class','ax-grid').attr('x1',x).attr('y1',ty).attr('x2',x+len).attr('y2',ty)
          .attr('stroke', c.a(8)).attr('stroke-width',0.3);
      }

      // Axes with arrow tips
      const as = 6;
      g.append('line').attr('class','ax-line').attr('x1',x).attr('y1',y).attr('x2',x+len+as+4).attr('y2',y)
        .attr('stroke', c.a(40)).attr('stroke-width', axisW);
      g.append('polygon').attr('class','ax-tip')
        .attr('points', `${x+len+as+4},${y} ${x+len},${y-as} ${x+len},${y+as}`)
        .attr('fill', c.a(40));
      g.append('line').attr('class','ax-line').attr('x1',x).attr('y1',y).attr('x2',x).attr('y2',y-len-as-4)
        .attr('stroke', c.a(40)).attr('stroke-width', axisW);
      g.append('polygon').attr('class','ax-tip')
        .attr('points', `${x},${y-len-as-4} ${x-as},${y-len} ${x+as},${y-len}`)
        .attr('fill', c.a(40));

      // Origin dot
      g.append('circle').attr('class','ax-origin')
        .attr('cx', x).attr('cy', y).attr('r', 3)
        .attr('fill', '#fff').attr('stroke', c.a(40)).attr('stroke-width', axisW);

      // Ticks + labels
      if (labels) {
        for (let i = 0; i <= ticks; i++) {
          const tx = x + (len / ticks) * i;
          const ty = y - (len / ticks) * i;
          g.append('line').attr('class','ax-tick').attr('x1',tx).attr('y1',y-tickLen).attr('x2',tx).attr('y2',y+tickLen)
            .attr('stroke', c.a(35)).attr('stroke-width', 0.8);
          const xv = xRange[0] + ((xRange[1] - xRange[0]) / ticks) * i;
          tagFn({ x: tx, y: y }, formatTick(xv))
            .below(labelGap).size(11);
          g.append('line').attr('class','ax-tick').attr('x1',x-tickLen).attr('y1',ty).attr('x2',x+tickLen).attr('y2',ty)
            .attr('stroke', c.a(35)).attr('stroke-width', 0.8);
          const yv = yRange[0] + ((yRange[1] - yRange[0]) / ticks) * i;
          tagFn({ x: x, y: ty }, formatTick(yv))
            .left(labelGap - 6).size(11);
        }
        if (xLabel) tagFn({ x: x + len / 2, y: y }, xLabel).below(labelGap + 20).size(11);
        if (yLabel) tagFn({ x: x - 36, y: y - len / 2 }, yLabel).size(11);
      }
    });
    schedule();
  }

  return { axes, _axes };
}
