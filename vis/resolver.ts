import { offsetLine, intersectRect, intersectCircle } from './geometry';
import { markerTip } from './primitives';
import type { Entity, NodeState, LineState } from './types';

export function resolveGeometry(store: Map<string, Entity>) {
  for (const entity of store.values()) {
    if (entity.desired.type === 'line' && (entity.desired as LineState)._fromPort && (entity.desired as LineState)._toPort) {
      const ld = entity.desired as LineState;
      const fromId = ld._fromPort!;
      const toId = ld._toPort!;

      // 1. Smart Fallback: look for port, otherwise fallback to vertex
      const isFromFallback = !store.has(`port:${fromId}`);
      const isToFallback = !store.has(`port:${toId}`);
      
      const fpe = store.get(isFromFallback ? `vertex:${fromId}` : `port:${fromId}`);
      const tpe = store.get(isToFallback ? `vertex:${toId}` : `port:${toId}`);

      if (!fpe) console.warn(`[vis.js] Edge '${entity.id}': Source '${fromId}' not found.`);
      if (!tpe) console.warn(`[vis.js] Edge '${entity.id}': Destination '${toId}' not found.`);

      const fs = fpe?.desired as NodeState;
      const ts = tpe?.desired as NodeState;

      const fx = fs?.x ?? 0, fy = fs?.y ?? 0;
      const tx = ts?.x ?? 0, ty = ts?.y ?? 0;

      const mt = ld.directed ? markerTip() : 0;
      const GAP = 2;

      // 2. Compute Intersection or Offset
      if (isFromFallback && fs) {
        // Dynamic boundary routing from vertex
        const margin = 0;
        let pt: [number, number];
        if (fs.shape === 'rect') {
          pt = intersectRect(fx, fy, fs._blockW ?? 60, fs._blockH ?? 36, tx, ty, margin);
        } else {
          pt = intersectCircle(fx, fy, fs.r ?? 10, tx, ty, margin);
        }
        ld.x1 = pt[0];
        ld.y1 = pt[1];
      } else {
        // Standard port offset
        const portR = ld._portR ?? fs?.r ?? 4;
        const pt = offsetLine([fx, fy], [tx, ty], portR, 0, ld.directed);
        ld.x1 = pt.x1;
        ld.y1 = pt.y1;
      }

      if (isToFallback && ts) {
        // Dynamic boundary routing into vertex
        const margin = mt + GAP;
        let pt: [number, number];
        if (ts.shape === 'rect') {
          pt = intersectRect(tx, ty, ts._blockW ?? 60, ts._blockH ?? 36, fx, fy, margin);
        } else {
          pt = intersectCircle(tx, ty, ts.r ?? 10, fx, fy, margin);
        }
        ld.x2 = pt[0];
        ld.y2 = pt[1];
      } else {
        // Standard port offset
        const toR = ld._toR ?? ts?.r ?? 4;
        const pt = offsetLine([tx, ty], [fx, fy], toR + mt + GAP, 0, ld.directed);
        ld.x2 = pt.x1;
        ld.y2 = pt.y1;
      }
    }
  }
}
