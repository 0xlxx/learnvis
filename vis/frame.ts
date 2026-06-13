// vis/frame.ts — FrameManager: unified ECS frame lifecycle (renderer-agnostic)

import * as d3 from 'd3';
import type { Entity, EntityState, EntityId, AnimationConfig } from './types';
import type { Renderer, RenderHandle } from './renderer';
import { SVGRenderer } from './renderer/svg';
import type { StageCtx } from './types';

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

  declare(id: EntityId, state: EntityState): Entity {
    this.current.add(id as string);
    const existing = this.store.get(id as string);
    if (existing) { Object.assign(existing.desired, state); return existing; }
    const entity: Entity = { id, desired: { ...state }, svg: null };
    this.store.set(id as string, entity);
    return entity;
  }

  patch(id: EntityId, partial: Partial<EntityState>): void {
    const entity = this.store.get(id as string);
    if (!entity) throw new Error(`Entity not found: ${id}`);
    Object.assign(entity.desired, partial);
  }

  commit(opts?: { ms?: number; animate?: boolean }) {
    if (!this._uncommitted) throw new Error('begin() required before commit()');
    this._uncommitted = false;

    if (opts?.animate === false || typeof requestAnimationFrame === 'undefined') {
      this._commitStatic();
      this.renderer.commitFrame({ animate: false });
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
        e.svg = (h as any).svg ?? null;
        const to = e.desired.opacity ?? 1;
        (h as any).svg?.attr?.('opacity', 0)?.transition?.(enterTr)?.attr?.('opacity', to);
      }
    }

    // update
    for (const id of this.current) {
      if (this.previous.has(id)) {
        const e = this.store.get(id)!;
        this.handles.get(id)?.update(e.desired, { animate: true, transition: updateTr });
      }
    }

    // exit animation
    for (const id of this.previous) {
      if (!this.current.has(id)) {
        // already removed above — animation would need pre-remove snapshot
      }
    }

    this.renderer.commitFrame({ animate: true, ms: dur });
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
        e.svg = (h as any).svg ?? null;
      } else {
        this.handles.get(id)?.update(e.desired);
      }
    }
  }

  get entities(): ReadonlyMap<string, Entity> { return this.store; }
  get frameIds(): ReadonlySet<string> { return this.current; }
}
