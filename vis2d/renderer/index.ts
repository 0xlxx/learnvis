// vis/renderer/index.ts — Renderer interface

import type { EntityState } from '../types';

export interface RenderHandle {
  /** Update visual to match new state (may animate) */
  update(state: EntityState, opts?: { animate?: boolean; transition?: any }): void;
  /** Remove visual from scene */
  remove(): void;
}

export interface Renderer {
  /** Create visual object for an entity */
  create(id: string, state: EntityState): RenderHandle;
  /** Called before frame rendering */
  beginFrame(): void;
  /** Called after all entities are processed */
  commitFrame(opts?: { animate?: boolean; ms?: number }): void;
  /** Release resources */
  dispose(): void;
}
