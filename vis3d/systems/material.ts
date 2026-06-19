// vis3d/systems/material.ts — MaterialSystem
// Reads appearance (+ optional materialRole, opacityOverride) → syncs THREE material properties.
//
// Per-child role dispatch:
//   lvRole='fill'  → base opacity from materialRole.opacity (recipe)
//   otherwise       → base opacity from appearance.opacity (user-controlled)
//
// opacityOverride (written by TransitionSystem) is a multiplier 0→1.
//   actual = base × multiplier
//   Absent → multiplier = 1 (no-op).
//
// Runs AFTER TransitionSystem so opacityOverride is current on the same frame.

import * as THREE from 'three/webgpu';
import type { World, Entity, System } from '@learnvis/ecs';
import type { MoodContext } from '../mood';

export class MaterialSystem implements System {
  readonly name = 'material';
  readonly requiredComponents = ['appearance'] as const;

  private _objCache: Map<Entity, THREE.Object3D>;
  private _mood: MoodContext;
  private _toonGradient?: THREE.Texture;

  private _appHash = new Map<Entity, string>();

  constructor(objCache: Map<Entity, THREE.Object3D>, mood: MoodContext, toonGradient?: THREE.Texture) {
    this._objCache = objCache;
    this._mood = mood;
    this._toonGradient = toonGradient;
  }

  update(world: World, _context: unknown): void {
    const entities = world.query('appearance');

    for (const entity of entities) {
      const obj = this._objCache.get(entity);
      if (!obj) continue;

      const app = world.getComponent(entity, 'appearance')!;
      const role = world.getComponent(entity, 'materialRole');
      const override = world.getComponent(entity, 'opacityOverride');

      // Include opacityOverride in hash — changes every frame during transition
      const hash = `${app.color}:${app.opacity}:${app.wireframe}:${app.emissive}:${override?.value ?? 1}`;
      if (this._appHash.get(entity) === hash) continue;
      this._appHash.set(entity, hash);

      const multiplier = override?.value ?? 1;

      obj.traverse((child) => {
        // Sprites: color baked into canvas texture. Root sprites (points)
        // get color updates via GeometrySystem canvas redraw.
        if (child instanceof THREE.Sprite) return;

        const raw = (child as THREE.Mesh).material ?? (child as THREE.Line).material;
        const mat = (Array.isArray(raw) ? raw[0] : raw) as THREE.MeshStandardMaterial | undefined;
        if (!mat) return;

        // Color + emissive always from appearance
        if (mat.color) mat.color.set(app.color);
        if ((mat as any).emissive) (mat as any).emissive.set(app.emissive);

        // Opacity: base (role-aware) × transition multiplier
        const isFill = (child as any).userData?.lvRole === 'fill' && role;
        const baseOpacity = isFill ? role!.opacity : app.opacity;
        const actualOpacity = baseOpacity * multiplier;

        mat.transparent = actualOpacity < 1;
        mat.opacity = actualOpacity;

        // Wireframe (only for Mesh, not Line/LineSegments)
        if (mat.wireframe !== undefined && !(child instanceof THREE.Line) && !(child instanceof THREE.LineSegments)) {
          mat.wireframe = app.wireframe;
        }

        // Toon gradient
        if (this._toonGradient && (mat as any).isMeshToonMaterial) {
          (mat as any).gradientMap = this._toonGradient;
        }
      });
    }
  }

  /** Clear appearance cache (e.g., after theme change). */
  clearCache(): void {
    this._appHash.clear();
  }
}
