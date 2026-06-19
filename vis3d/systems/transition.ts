// vis3d/systems/transition.ts — TransitionSystem
// Manages enter/exit transitions with per-kind motion profiles.
//
// ══ Design principles ══
//   Material nature  — spheres condense, fills bloom, lines drawn, markers stamped
//   Enter: spring    — damped harmonic with bounce (physical "landing")
//   Exit:  cosine    — slow→fast→slow contraction (physical "deflation" with inertia)
//   Enter ≠ Exit     — appearance and disappearance obey different physics
//
// ══ Categories ══
//   BLOOM    cube, fill         scale 0→1.0        400ms
//   CONDENSE sphere             scale 0→1.15→1.0   350ms
//   MARK     rightAngle         scale 0→1.0        200ms
//   DRAW     line, arrow, arc   fade only           300ms
//   REVEAL   surface            fade + 0.92→1.0    450ms
//   DOT      sprite             fade only           200ms
//   STAGE    grid, axes         fade only           250ms
//
// Enter (entity alive → via ECS):
//   Writes opacityOverride Component (multiplier 0→1). MaterialSystem reads it.
//   Scale-animated kinds get obj.scale manipulation.
//   _entered Set prevents re-entering entities that already completed enter.
//
// Exit (entity dead → direct THREE):
//   Entity already destroyed by sweep — can't write ECS Components.
//   Geometry kind read from obj.userData.lvKind (set by GeometrySystem).
//   Direct material opacity + optional scale fade-out. Scene.remove on completion.
//   CleanupSystem skips entities tracked here (see isExiting).
//
// System order: must run BEFORE MaterialSystem (opacityOverride written before Material reads).

import * as THREE from 'three/webgpu';
import type { World, Entity, System } from '@learnvis/ecs';

type GeometryKind = 'arrow' | 'sphere' | 'cube' | 'sprite' | 'grid' | 'axes' | 'line' | 'surface' | 'fill' | 'arc' | 'rightAngle';

interface ScaleRange { start: number; peak: number }

interface TransitionConfig {
  scale: ScaleRange | null;  // null = fade only
  enterMs: number;
  exitMs: number;
}

// ══ Unified per-kind configuration ══
const TRANSITION: Record<GeometryKind, TransitionConfig> = {
  // A. BLOOM
  cube:       { scale: { start: 0,    peak: 1.0  }, enterMs: 400, exitMs: 400 },
  fill:       { scale: { start: 0,    peak: 1.0  }, enterMs: 400, exitMs: 400 },
  // B. CONDENSE
  sphere:     { scale: { start: 0,    peak: 1.15 }, enterMs: 350, exitMs: 350 },
  // C. MARK
  rightAngle: { scale: { start: 0,    peak: 1.0  }, enterMs: 200, exitMs: 200 },
  arc:        { scale: { start: 0,    peak: 1.0  }, enterMs: 200, exitMs: 200 },
  // D. DRAW — Line2NodeMaterial: no transition (WebGPU limitation). Instant.
  line:       { scale: null,                          enterMs: 0, exitMs: 0 },
  arrow:      { scale: null,                          enterMs: 0, exitMs: 0 },
  // E. REVEAL
  surface:    { scale: { start: 0.92, peak: 1.0  }, enterMs: 450, exitMs: 450 },
  // F. DOT
  sprite:     { scale: null,                          enterMs: 200, exitMs: 200 },
  // G. STAGE
  grid:       { scale: null,                          enterMs: 250, exitMs: 250 },
  axes:       { scale: null,                          enterMs: 250, exitMs: 250 },
};

// ══ Entry types ══

interface EnterEntry {
  obj: THREE.Object3D;
  startMs: number;
  origScale: THREE.Vector3;
  config: TransitionConfig;
}

interface ExitEntry {
  obj: THREE.Object3D;
  startMs: number;
  origScale: THREE.Vector3;
  targets: Map<THREE.Material, number>;
  config: TransitionConfig;
}

// ══ System ══

export class TransitionSystem implements System {
  readonly name = 'transition';
  readonly requiredComponents = [] as const;

  private _objCache: Map<Entity, THREE.Object3D>;
  private _scene: THREE.Scene;

  private _entering = new Map<Entity, EnterEntry>();
  private _entered  = new Set<Entity>();
  private _exiting  = new Map<Entity, ExitEntry>();

  constructor(objCache: Map<Entity, THREE.Object3D>, scene: THREE.Scene) {
    this._objCache = objCache;
    this._scene = scene;
  }

  // Spring for enter — damped harmonic with gentle bounce (physical "landing")
  private static _spring(t: number): number {
    return 1 - Math.pow(2, -8 * t) * Math.cos(3 * Math.PI * t) * (1 - t);
  }

  // Cosine ease for exit — physical contraction with inertia: slow→fast→slow
  private static _contract(t: number): number {
    return Math.cos(t * Math.PI / 2);
  }

  // ── isExiting (for CleanupSystem coordination) ──

  isExiting(entity: Entity): boolean {
    return this._exiting.has(entity);
  }

  // ══ Update ══

  update(world: World, _context: unknown): void {
    const now = performance.now();

    // ── Detect new entities ──
    for (const [entity, obj] of this._objCache) {
      if (!world.isAlive(entity)) continue;
      if (this._entering.has(entity)) continue;
      if (this._entered.has(entity)) continue;

      const geoComp = world.getComponent(entity, 'geometry');
      if (!geoComp) continue;

      const kind = (geoComp as Record<string, unknown>).kind as GeometryKind;
      const cfg = TRANSITION[kind];
      if (!cfg) continue;

      world.patchComponent(entity, 'opacityOverride', { value: 0 });

      const origScale = obj.scale.clone();
      if (cfg.scale) obj.scale.copy(origScale).multiplyScalar(cfg.scale.start);

      this._entering.set(entity, { obj, startMs: now, origScale, config: cfg });
    }

    // ── Detect dead entities (exit) ──
    for (const [entity, obj] of this._objCache) {
      if (world.isAlive(entity)) continue;
      if (this._exiting.has(entity)) continue;

      const kind = (obj.userData as Record<string, unknown> | undefined)?.lvKind as GeometryKind | undefined;
      const cfg = kind ? TRANSITION[kind] : undefined;
      if (!cfg) {
        this._scene.remove(obj);
        this._objCache.delete(entity);
        this._entered.delete(entity);
        continue;
      }

      const targets = new Map<THREE.Material, number>();
      obj.traverse((child) => {
        const rawM = (child as THREE.Mesh).material ?? (child as THREE.Line).material;
        const mats = (Array.isArray(rawM) ? rawM : [rawM]) as THREE.Material[];
        for (const mat of mats) {
          if (!mat) continue;
          targets.set(mat, (mat as any).opacity as number);
          mat.transparent = true;
        }
      });

      this._exiting.set(entity, {
        obj, startMs: now, origScale: obj.scale.clone(),
        targets, config: cfg,
      });
      this._entered.delete(entity);
    }

    // ── Tick enter ──
    for (const [entity, { obj, startMs, origScale, config: cfg }] of this._entering) {
      const raw = Math.min((now - startMs) / cfg.enterMs, 1);
      const t = TransitionSystem._spring(raw);

      world.patchComponent(entity, 'opacityOverride', { value: t });

      if (cfg.scale) {
        const { start } = cfg.scale;
        const s = start + (1 - start) * t;
        obj.scale.copy(origScale).multiplyScalar(s);
      }

      if (raw >= 1) {
        world.removeComponent(entity, 'opacityOverride');
        if (cfg.scale) obj.scale.copy(origScale);
        this._entering.delete(entity);
        this._entered.add(entity);
      }
    }

    // ── Tick exit ──
    for (const [entity, { obj, startMs, origScale, targets, config: cfg }] of this._exiting) {
      const raw = Math.min((now - startMs) / cfg.exitMs, 1);
      // Cosine contraction — slow→fast→slow (physical "deflation" with inertia)
      const fade = TransitionSystem._contract(raw);

      // Material opacity fade-out
      obj.traverse((child) => {
        const rawM = (child as THREE.Mesh).material ?? (child as THREE.Line).material;
        const mats = (Array.isArray(rawM) ? rawM : [rawM]) as THREE.Material[];
        for (const mat of mats) {
          if (!mat) continue;
          (mat as any).opacity = fade * (targets.get(mat) ?? 1);
        }
      });

      // Scale exit — ease-out contraction
      if (cfg.scale) {
        const { start } = cfg.scale;
        const s = start + (1 - start) * fade;
        obj.scale.copy(origScale).multiplyScalar(Math.max(0.001, s));
      }

      if (raw >= 1) {
        this._scene.remove(obj);
        this._exiting.delete(entity);
        this._objCache.delete(entity);
      }
    }
  }

  // ── Flush ──

  flush(world: World): void {
    for (const [entity, { obj, origScale, config: cfg }] of this._entering) {
      world.removeComponent(entity, 'opacityOverride');
      if (cfg.scale) obj.scale.copy(origScale);
      this._entered.add(entity);
    }
    this._entering.clear();

    for (const [entity, { obj }] of this._exiting) {
      this._scene.remove(obj);
      this._objCache.delete(entity);
    }
    this._exiting.clear();
  }

  get activeCount(): number {
    return this._entering.size + this._exiting.size;
  }
}
