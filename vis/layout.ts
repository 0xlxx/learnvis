// vis/layout.ts — canvas subdivision primitives
//   s.layout.hsplit([0.3, 0.7])     → [left, right]
//   s.layout.vsplit([0.4, 0.6])     → [top, bottom]
//   s.layout.grid(2, 2)             → 2×2 cells
// Each cell is { x, y, w, h } ready for math primitives.

export interface Cell {
  x: number;  // SVG origin x (left)
  y: number;  // SVG origin y (top of cell area)
  w: number;  // cell width
  h: number;  // cell height
}

function cells(width: number, height: number, margin: number) {
  const W = width - margin * 2;
  const H = height - margin * 2;

  return {
    /** Horizontal split. ratios sum to 1. */
    hsplit(ratios: number[]): Cell[] {
      let cx = margin;
      const gap = 8;
      const totalGap = (ratios.length - 1) * gap;
      const avail = W - totalGap;
      return ratios.map(r => {
        const w = avail * r;
        const cell = { x: cx, y: margin, w, h: H };
        cx += w + gap;
        return cell;
      });
    },

    /** Vertical split. ratios sum to 1. */
    vsplit(ratios: number[]): Cell[] {
      let cy = margin;
      const gap = 8;
      const totalGap = (ratios.length - 1) * gap;
      const avail = H - totalGap;
      return ratios.map(r => {
        const h = avail * r;
        const cell = { x: margin, y: cy, w: W, h };
        cy += h + gap;
        return cell;
      });
    },

    /** 2D grid of cells. */
    grid(rows: number, cols: number): Cell[][] {
      const gap = 8;
      const cw = (W - (cols - 1) * gap) / cols;
      const ch = (H - (rows - 1) * gap) / rows;
      const result: Cell[][] = [];
      for (let r = 0; r < rows; r++) {
        const row: Cell[] = [];
        for (let c = 0; c < cols; c++) {
          row.push({
            x: margin + c * (cw + gap),
            y: margin + r * (ch + gap),
            w: cw,
            h: ch,
          });
        }
        result.push(row);
      }
      return result;
    },
  };
}

export function createLayout(width: number, height: number, margin: number = 48) {
  return cells(width, height, margin);
}
