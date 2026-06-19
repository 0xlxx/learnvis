// vis/frame.ts — FrameManager: unified ECS frame lifecycle (renderer-agnostic)

import * as d3 from 'd3';
import type { Entity, EntityState, AnimationConfig } from './types';
import type { Renderer, RenderHandle } from './renderer';
import { SVGRenderer, type SVGHandle } from './renderer/svg';
import type { StageCtx } from './types';

export { type SVGHandle };

const defaultAnimation: AnimationConfig = {
  duration: 500,
  enter: { ratio: 0.6, easing: d3.easeCubicOut },
  update: { ratio: 1.0, easing: d3.easeCubicOut },
  exit: { ratio: 0.4, easing: d3.easeCubicIn },
};

export class FrameManager {
  private store = new Map<string, Entity>();
  private handles = new Map<string, RenderHandle>();
  private current = new Set<string>();
  private previous = new Set<string>();
  private _uncommitted = false;
  private animation: AnimationConfig;
  private renderer: Renderer;

  constructor(ctx: StageCtx, animation?: Partial<AnimationConfig>, renderer?: Renderer) {
    this.animation = { ...defaultAnimation, ...animation };
    this.renderer = renderer ?? new SVGRenderer(ctx);
  }

  begin() {
    if (this._uncommitted) throw new Error('commit() required before begin()');
    this._uncommitted = true;
    this.previous = new Set(this.current);
    this.current.clear();
    this.renderer.beginFrame();
  }

  declare(id: string, state: EntityState): Entity {
    this.current.add(id);
    const existing = this.store.get(id);
    if (existing) {
      // Clear stale transform state when re-declaring without transforms —
      // prevents transforms accumulation across frames which breaks smooth interpolation.
      if (!('transforms' in (state as unknown as Record<string, unknown>)))
        delete (existing.desired as unknown as Record<string, unknown>).transforms;
      Object.assign(existing.desired, state);
      return existing;
    }
    const entity: Entity = { id, desired: { ...state }, svg: null };
    this.store.set(id, entity);
    return entity;
  }

  patch(id: string, partial: Partial<EntityState>): void {
    const entity = this.store.get(id);
    if (!entity) throw new Error(`Entity not found: ${id}`);
    Object.assign(entity.desired, partial);
  }

  /** Typed getter: narrows EntityState by its discriminant type field. */
  get<T extends EntityState['type']>(
    id: string,
    _type: T,
  ): (Entity & { desired: Extract<EntityState, { type: T }> }) | undefined {
    return this.store.get(id) as any;
  }

  commit(opts?: { ms?: number; transition?: boolean }) {
    if (!this._uncommitted) throw new Error('begin() required before commit()');
    this._uncommitted = false;

    if (opts?.transition === false || typeof requestAnimationFrame === 'undefined') {
      this._commitStatic();
      this.renderer.commitFrame({ transition: false });
      return;
    }

    const dur = opts?.ms ?? this.animation.duration;
    const enterTr = d3.transition().duration(dur * this.animation.enter.ratio).ease(this.animation.enter.easing);
    const updateTr = d3.transition().duration(dur * this.animation.update.ratio).ease(this.animation.update.easing);
    const exitTr = d3.transition().duration(dur * this.animation.exit.ratio).ease(this.animation.exit.easing);

    // exit
    for (const id of this.previous) {
      if (!this.current.has(id)) {
        this.handles.get(id)?.remove();
        this.store.delete(id);
        this.handles.delete(id);
      }
    }

    // enter
    for (const id of this.current) {
      if (!this.previous.has(id)) {
        const e = this.store.get(id)!;
        const h = this.renderer.create(id, e.desired);
        this.handles.set(id, h);
        e.svg = (h as SVGHandle).svg ?? null;
        const to = e.desired.opacity ?? 1;
        const svgEl = (h as SVGHandle).svg;
        if (svgEl) {
          svgEl.attr('opacity', 0).transition(enterTr).attr('opacity', to);
        }
      }
    }

    // update
    for (const id of this.current) {
      if (this.previous.has(id)) {
        const e = this.store.get(id)!;
        this.handles.get(id)?.update(e.desired, { animate: true, transition: updateTr });
      }
    }

    this.renderer.commitFrame({ transition: true, ms: dur });
  }

  private _commitStatic() {
    for (const id of this.previous) {
      if (!this.current.has(id)) {
        this.handles.get(id)?.remove();
        this.store.delete(id);
        this.handles.delete(id);
      }
    }
    for (const id of this.current) {
      const e = this.store.get(id)!;
      if (!this.previous.has(id)) {
        const h = this.renderer.create(id, e.desired);
        this.handles.set(id, h);
        e.svg = (h as SVGHandle).svg ?? null;
      } else {
        this.handles.get(id)?.update(e.desired);
      }
    }
  }

  get entities(): ReadonlyMap<string, Entity> { return this.store; }
  get frameIds(): ReadonlySet<string> { return this.current; }
}
