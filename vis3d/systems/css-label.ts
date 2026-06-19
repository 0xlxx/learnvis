// vis3d/systems/css-label.ts — CSSLabelSystem
// Pure CSS labels projected from 3D world coords to 2D screen space.
// Replaces Sprite-based labels for superior text rendering quality.
//
// Each label entity has: position3 + label components.
// The system creates a <div> in an overlay container, projects the
// 3D position each frame, and updates the CSS transform.

import * as THREE from 'three/webgpu';
import type { World, Entity, System } from '@learnvis/ecs';
import type { MoodContext } from '../mood';
import type { Vec3 } from '../types';
import { katexify } from '../../vis2d/katex';

// ── CSSLabelSystem ──

export class CSSLabelSystem implements System {
  readonly name = 'css-label';
  readonly requiredComponents = ['position3', 'label'] as const;

  private _container: HTMLElement;
  private _camera: THREE.OrthographicCamera | THREE.PerspectiveCamera;
  private _elCache = new Map<Entity, HTMLElement>();
  private _textCache = new Map<Entity, string>();

  constructor(container: HTMLElement, camera: THREE.OrthographicCamera | THREE.PerspectiveCamera, mood: MoodContext) {
    this._container = container;
    this._camera = camera;
    this._injectStyles(mood);
  }

  // ── System.update ──

  update(world: World, _context: unknown): void {
    const entities = world.query('position3', 'label');

    for (const entity of entities) {
      const pos = world.getComponent(entity, 'position3')!;
      const lbl = world.getComponent(entity, 'label')!;

      let el = this._elCache.get(entity);
      if (!el) {
        el = this._createElement(lbl.text);
        this._container.appendChild(el);
        this._elCache.set(entity, el);
        this._textCache.set(entity, lbl.text);
      } else if (this._textCache.get(entity) !== lbl.text) {
        this._renderText(el, lbl.text);
        this._textCache.set(entity, lbl.text);
      }

      // Project 3D world position (with label offset) → 2D screen coords
      const projected = this._project([
        pos.x + lbl.offset[0],
        pos.y + lbl.offset[1],
        pos.z + lbl.offset[2],
      ]);
      if (!projected.visible) {
        el.style.visibility = 'hidden';
        continue;
      }

      el.style.visibility = 'visible';
      el.style.transform = `translate(-50%, -50%) translate(${projected.x.toFixed(1)}px, ${projected.y.toFixed(1)}px)`;
    }

    // Cleanup destroyed entities
    for (const [entity, el] of this._elCache) {
      if (!world.isAlive(entity)) {
        el.remove();
        this._elCache.delete(entity);
        this._textCache.delete(entity);
      }
    }
  }

  // ── Projection ──

  private _project(worldPos: Vec3): { x: number; y: number; visible: boolean } {
    const v = new THREE.Vector3(...worldPos).project(this._camera);
    const w = this._container.clientWidth;
    const h = this._container.clientHeight;
    return {
      x: (v.x * 0.5 + 0.5) * w,
      y: (-v.y * 0.5 + 0.5) * h,
      visible: v.z < 1,
    };
  }

  // ── Element factory ──

  private _renderText(el: HTMLElement, text: string): void {
    if (text.includes('$')) {
      el.innerHTML = katexify(text);
    } else {
      el.textContent = text;
    }
  }

  private _createElement(text: string): HTMLElement {
    const el = document.createElement('div');
    el.className = 'lv-label lv-label-3d';
    this._renderText(el, text);
    return el;
  }

  // ── Styles ──

  private _injectStyles(mood: MoodContext): void {
    this._container.style.setProperty('--lv-label-font', mood.label.font);
    this._container.style.setProperty('--lv-label-color', mood.label.color);
    this._container.style.setProperty('--lv-label-shadow', mood.label.shadow);

    // Only inject the core style once.
    if (document.getElementById('lv-label-3d-style')) return;

    const style = document.createElement('style');
    style.id = 'lv-label-3d-style';
    style.textContent = `
      .lv-label-3d {
        position: absolute;
        top: 0;
        left: 0;
        pointer-events: none;
        white-space: nowrap;
        font: var(--lv-label-font);
        color: var(--lv-label-color);
        text-shadow: var(--lv-label-shadow);
        letter-spacing: 0.01em;
        -webkit-font-smoothing: antialiased;
        will-change: transform;
      }
    `;
    document.head.appendChild(style);
  }

  // ── Cleanup ──

  dispose(): void {
    for (const el of this._elCache.values()) {
      el.remove();
    }
    this._elCache.clear();
    this._textCache.clear();
  }
}
