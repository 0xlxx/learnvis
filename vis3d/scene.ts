// vis3d/scene.ts — Scene3dImpl: World + Systems + render loop
// ECS-backed. Primitives spawn entities with components;
// ThreeSyncSystem syncs components → THREE.Object3D.

import * as THREE from 'three/webgpu';
import { LineSegments2 } from 'three/addons/lines/webgpu/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { World } from '@learnvis/ecs';
import type { Entity, System, ComponentOf, GeometryKind } from '@learnvis/ecs';
import { bootstrap3d, type Bootstrap3d } from './bootstrap';
import { Gfx3dImpl, createColorResolver, type ColorResolver } from './gfx';
import { GeometrySystem, disposeTree } from './systems/geometry';
import { TransformSystem } from './systems/transform';
import { MaterialSystem } from './systems/material';
import { TransitionSystem } from './systems/transition';
import { CleanupSystem } from './systems/cleanup';
import { CSSLabelSystem } from './systems/css-label';
import { resolveMood } from './mood';
import { resolveSizeToken } from '../foundation/tokens';
import { spawnPoint } from './primitives/point';
import { spawnLine } from './primitives/line';
import { spawnVector } from './primitives/vector';
import { spawnSphere } from './primitives/sphere';
import { spawnCube } from './primitives/cube';
import { spawnSurface } from './primitives/surface';
import { spawnFill } from './primitives/fill';
import { spawnArc } from './primitives/arc';
import { spawnRightAngle } from './primitives/right-angle';
import { spawnAxes } from './primitives/axes';
import { spawnGrid } from './primitives/grid';
import { createStepsController3d } from './motion';
import { createCoordSystem3d } from './coords3d';
import type {
  Scene3d, Gfx3d, Canvas3dOpts, Axes3dOpts, Grid3dOpts, Surface3dOpts,
  CameraConfig, CameraDirection, CameraAnimOpts, ViewOpts, LightDef, StepDef3d, StepsOptions3d, Vec3,
  StepsController3d,
  SurfaceFn,
  Frame3dOpts,
} from './types';

// ── Easing helpers ──

const EASINGS: Record<string, (t: number) => number> = {
  'linear':      t => t,
  'ease-out':    t => 1 - (1 - t) ** 3,
  'ease-in-out': t => t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2,
};

// ── Tiny vec3 helpers (for dihedral pre-computation) ──

const v3sub = (a: Vec3, b: Vec3): Vec3 => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
const v3add = (a: Vec3, b: Vec3): Vec3 => [a[0]+b[0], a[1]+b[1], a[2]+b[2]];
const v3scale = (v: Vec3, s: number): Vec3 => [v[0]*s, v[1]*s, v[2]*s];
const v3dot = (a: Vec3, b: Vec3): number => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const v3cross = (a: Vec3, b: Vec3): Vec3 => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const v3norm = (v: Vec3): Vec3 => { const l = Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2]); return l < 1e-9 ? [0,0,0] : [v[0]/l, v[1]/l, v[2]/l]; };

// ── Camera animation state ──

interface CameraAnim {
  fromPos: Vec3;
  fromTgt: Vec3;
  toPos: Vec3;
  toTgt: Vec3;
  startMs: number;
  duration: number;
  easing: (t: number) => number;
}

// ══ Module helpers ══

function resolvePositions(
  src: Vec3[] | ((x: number, y: number, z: number) => Vec3),
  opts?: { x?: [number, number]; y?: [number, number]; z?: [number, number]; step?: number },
): Vec3[] {
  if (Array.isArray(src)) return src;
  const xr = opts?.x ?? [-3, 3], yr = opts?.y ?? [-3, 3], zr = opts?.z ?? [-3, 3];
  const step = opts?.step ?? ((xr[1] - xr[0]) / 8);
  const pts: Vec3[] = [];
  for (let x = xr[0]; x <= xr[1] + step * 0.1; x += step) {
    for (let y = yr[0]; y <= yr[1] + step * 0.1; y += step) {
      for (let z = zr[0]; z <= zr[1] + step * 0.1; z += step) {
        pts.push(src(x, y, z));
      }
    }
  }
  return pts;
}

export class Scene3dImpl implements Scene3d {
  private _boot!: Bootstrap3d;
  private _world = new World();
  private _geometrySys!: GeometrySystem;
  private _transformSys!: TransformSystem;
  private _materialSys!: MaterialSystem;
  private _transitionSys!: TransitionSystem;
  private _cleanupSys!: CleanupSystem;
  private _cssLabel!: CSSLabelSystem;
  private _toonGradient?: THREE.Texture;
  private _labelContainer!: HTMLElement;
  private _resolve!: ColorResolver;
  private _frameFn: ((s: Scene3d) => void) | null = null;
  private _onDispose: Array<() => void> = [];
  private _camAnim: CameraAnim | null = null;
  // Cache: userId → Gfx3dImpl for same-id reuse paths (vector/sphere/cube)
  private _store = new Map<string, Gfx3dImpl>();
  // Frame tracking: entities touched this frame surviving; untouched → exit
  private _touched = new Set<string>();

  // ── Construction ──

  async init(container: HTMLElement, opts: Canvas3dOpts = {}): Promise<void> {
    this._boot = await bootstrap3d(container, opts);
    const mood = resolveMood(opts.mood);
    this._resolve = createColorResolver(opts.theme ?? opts.mood);

    // CSS label overlay — sits on top of the WebGPU canvas
    this._labelContainer = document.createElement('div');
    this._labelContainer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden;';
    container.style.position = 'relative';
    container.appendChild(this._labelContainer);

    this._cssLabel = new CSSLabelSystem(this._labelContainer, this._boot.camera, mood);

    // Toon gradient for MeshToonMaterial (used when mood.toonBands is set)
    if (mood.toonBands !== undefined) {
      const size = 64;
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = 1;
      const ctx = canvas.getContext('2d')!;
      const step = size / mood.toonBands;
      for (let i = 0; i < mood.toonBands; i++) {
        ctx.fillStyle = `hsl(0, 0%, ${Math.round((i / (mood.toonBands - 1)) * 100)}%)`;
        ctx.fillRect(i * step, 0, step, 1);
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.minFilter = THREE.NearestFilter;
      tex.magFilter = THREE.NearestFilter;
      this._toonGradient = tex;
    }

    this._geometrySys   = new GeometrySystem(this._boot.scene, this._resolve, mood, this._toonGradient);
    this._transformSys  = new TransformSystem(this._geometrySys.objCache);
    this._materialSys   = new MaterialSystem(this._geometrySys.objCache, mood, this._toonGradient);
    this._transitionSys = new TransitionSystem(this._geometrySys.objCache, this._boot.scene);
    this._cleanupSys    = new CleanupSystem(this._geometrySys.objCache, this._boot.scene, this._transitionSys);

    this._world.addSystem(this._geometrySys);
    this._world.addSystem(this._transformSys);
    this._world.addSystem(this._transitionSys);   // before Material — writes opacityOverride
    this._world.addSystem(this._materialSys);     // after Transition — reads opacityOverride
    this._world.addSystem(this._cleanupSys);
    this._world.addSystem(this._cssLabel);

    // Cancel camera animation when user starts interacting with OrbitControls
    this._boot.controls.addEventListener('start', () => { this._camAnim = null; });

    this._boot.renderer.setAnimationLoop(() => {
      this._boot.controls.update();
      this._tickCameraAnim();
      // Frame lifecycle: mark → declare → sweep untouched
      this._touched.clear();
      if (this._frameFn) this._frameFn(this);
      for (const [id, gfx] of this._store) {
        if (!this._touched.has(id)) {
          this._world.destroy(gfx._e);
          this._store.delete(id);
        }
      }
      this._world.update(this._boot);
      this._boot.renderer.render(this._boot.scene, this._boot.camera);
    });
  }

  // ── Camera animation tick ──

  private _tickCameraAnim(): void {
    if (!this._camAnim) return;
    const a = this._camAnim;
    const raw = Math.min((performance.now() - a.startMs) / (a.duration * 1000), 1);
    const k = a.easing(raw);
    const { camera, controls } = this._boot;
    camera.position.set(
      a.fromPos[0] + (a.toPos[0] - a.fromPos[0]) * k,
      a.fromPos[1] + (a.toPos[1] - a.fromPos[1]) * k,
      a.fromPos[2] + (a.toPos[2] - a.fromPos[2]) * k,
    );
    controls.target.set(
      a.fromTgt[0] + (a.toTgt[0] - a.fromTgt[0]) * k,
      a.fromTgt[1] + (a.toTgt[1] - a.fromTgt[1]) * k,
      a.fromTgt[2] + (a.toTgt[2] - a.fromTgt[2]) * k,
    );
    controls.update();
    if (raw >= 1) this._camAnim = null;
  }

  // ── Helpers ──

  private _upsert(id: string): void {
    const existing = this._world.entityByUserId(id);
    if (existing !== undefined) {
      this._world.destroy(existing);
      this._store.delete(id);
    }
  }

  /** After spawning an entity, create THREE object and bind to gfx for escape hatch. */
  private _register(gfx: Gfx3dImpl, entity: Entity): void {
    const obj = this._geometrySys.createAndRegister(entity, this._world);
    gfx._bindThreeObject(obj);
  }

  /** Mark an entity as touched this frame — it survives the sweep. */
  private _touch(id: string): void { this._touched.add(id); }

  // ═══════════════════════════════════════
  // 原语 (primitives)
  // ═══════════════════════════════════════

  point(id: string, x: number, y: number, z: number): Gfx3d {
    const existing = this._store.get(id);
    if (existing) {
      this._world.setComponent(existing._e, { type: 'position3', x, y, z });
      this._touch(id);
      return existing;
    }
    this._upsert(id);
    const { entity, gfx } = spawnPoint(this._world, this._resolve, id, x, y, z);
    this._register(gfx, entity);
    this._store.set(id, gfx);
    this._touch(id);
    return gfx;
  }

  line3d(id: string, from: Vec3, to: Vec3): Gfx3d {
    const existing = this._store.get(id);
    if (existing) {
      const prevGeo = this._world.getComponent(existing._e, 'geometry') as Record<string, unknown> | undefined;
      this._world.setComponent(existing._e, {
        type: 'position3', x: from[0], y: from[1], z: from[2],
      });
      this._world.setComponent(existing._e, {
        type: 'geometry', kind: 'line',
        toX: to[0], toY: to[1], toZ: to[2],
        dash: prevGeo?.dash,
      } as ComponentOf<'geometry'>);
      this._touch(id);
      return existing;
    }
    this._upsert(id);
    const { entity, gfx } = spawnLine(this._world, this._resolve, id, from, to);
    this._register(gfx, entity);
    this._store.set(id, gfx);
    this._touch(id);
    return gfx;
  }

  vector(id: string, from: Vec3, to: Vec3): Gfx3d {
    const existing = this._store.get(id);
    if (existing) {
      // Same-id redeclaration: update geometry + position on existing entity
      const thick = this._world.getComponent(existing._e, 'thickness')?.value ?? 0.015;
      this._world.setComponent(existing._e, {
        type: 'position3', x: from[0], y: from[1], z: from[2],
      });
      this._world.setComponent(existing._e, {
        type: 'geometry', kind: 'arrow',
        toX: to[0], toY: to[1], toZ: to[2], thickness: thick,
      } as ComponentOf<'geometry'>);
      this._touch(id);
      return existing;
    }
    this._upsert(id);
    const { entity, gfx } = spawnVector(this._world, this._resolve, id, from, to);
    this._register(gfx, entity);
    this._store.set(id, gfx);
    this._touch(id);
    return gfx;
  }

  sphere(id: string, cx: number, cy: number, cz: number, r: number): Gfx3d {
    const existing = this._store.get(id);
    if (existing) {
      // Same-id: just update position + size (radius)
      this._world.setComponent(existing._e, {
        type: 'position3', x: cx, y: cy, z: cz,
      });
      this._world.patchComponent(existing._e, 'size', { value: r });
      // Also update geometry radius
      this._world.setComponent(existing._e, {
        type: 'geometry', kind: 'sphere', radius: r,
      } as ComponentOf<'geometry'>);
      this._touch(id);
      return existing;
    }
    this._upsert(id);
    const { entity, gfx } = spawnSphere(this._world, this._resolve, id, cx, cy, cz, r);
    this._register(gfx, entity);
    this._store.set(id, gfx);
    this._touch(id);
    return gfx;
  }

  cube(id: string, cx: number, cy: number, cz: number, size: number): Gfx3d {
    const existing = this._store.get(id);
    if (existing) {
      this._world.setComponent(existing._e, {
        type: 'position3', x: cx, y: cy, z: cz,
      });
      this._world.patchComponent(existing._e, 'size', { value: size });
      this._world.setComponent(existing._e, {
        type: 'geometry', kind: 'cube', size,
      } as ComponentOf<'geometry'>);
      this._touch(id);
      return existing;
    }
    this._upsert(id);
    const { entity, gfx } = spawnCube(this._world, this._resolve, id, cx, cy, cz, size);
    this._register(gfx, entity);
    this._store.set(id, gfx);
    this._touch(id);
    return gfx;
  }

  fill(id: string, vertices: Vec3[]): Gfx3d {
    const existing = this._store.get(id);
    if (existing) {
      this._world.setComponent(existing._e, {
        type: 'geometry', kind: 'fill',
        vertices: vertices.flat(),
        count: vertices.length,
      } as ComponentOf<'geometry'>);
      this._touch(id);
      return existing;
    }
    this._upsert(id);
    const { entity, gfx } = spawnFill(this._world, this._resolve, id, vertices);
    this._register(gfx, entity);
    this._store.set(id, gfx);
    this._touch(id);
    return gfx;
  }

  arc(id: string, a: Vec3 | [Vec3, Vec3], b: Vec3, c: Vec3): Gfx3d {
    // Dihedral form: arc(id, [edgeStart, edgeEnd], ptOnFace1, ptOnFace2)
    if (typeof a[0] !== 'number') {
      const edge = a as [Vec3, Vec3];
      const [center, fromDir, toDir] = this._dihedralParams(edge, b, c);
      return this._arcImpl(id, center, fromDir, toDir);
    }
    // Geometric form: arc(id, center, fromDir, toDir)
    return this._arcImpl(id, a as Vec3, b, c);
  }

  private _arcImpl(id: string, center: Vec3, fromDir: Vec3, toDir: Vec3): Gfx3d {
    const existing = this._store.get(id);
    if (existing) {
      this._world.setComponent(existing._e, { type: 'position3', x: center[0], y: center[1], z: center[2] });
      this._world.setComponent(existing._e, {
        type: 'geometry', kind: 'arc',
        fromX: fromDir[0], fromY: fromDir[1], fromZ: fromDir[2],
        toX: toDir[0], toY: toDir[1], toZ: toDir[2],
        radius: 0.25,
      } as ComponentOf<'geometry'>);
      this._touch(id);
      return existing;
    }
    this._upsert(id);
    const { entity, gfx } = spawnArc(this._world, this._resolve, id, center, fromDir, toDir);
    this._register(gfx, entity);
    this._store.set(id, gfx);
    this._touch(id);
    return gfx;
  }

  /** Compute arc params for a dihedral angle: foot points → midpoint → plane normals → in-plane dirs. */
  private _dihedralParams(edge: [Vec3, Vec3], pt1: Vec3, pt2: Vec3): [Vec3, Vec3, Vec3] {
    const [E1, E2] = edge;
    const eVec = v3sub(E2, E1);
    const eLen2 = v3dot(eVec, eVec);
    const foot = (pt: Vec3): Vec3 => {
      const t = v3dot(v3sub(pt, E1), eVec) / eLen2;
      return v3add(E1, v3scale(eVec, t));
    };
    const H1 = foot(pt1), H2 = foot(pt2);
    const M: Vec3 = v3scale(v3add(H1, H2), 0.5);

    // Direction from foot to point — naturally in face plane and ⟂ edge.
    const dir1 = v3norm(v3sub(pt1, H1));
    const dir2 = v3norm(v3sub(pt2, H2));
    return [M, dir1, dir2];
  }

  perpFoot(id: string, point: Vec3, lineStart: Vec3, lineEnd: Vec3): Vec3 {
    const e = v3sub(lineEnd, lineStart);
    const el2 = v3dot(e, e);
    const t = v3dot(v3sub(point, lineStart), e) / el2;
    const foot: Vec3 = v3add(lineStart, v3scale(e, t));
    this.rightAngle(id, foot, v3sub(point, foot), e);
    return foot;
  }

  rightAngle(id: string, center: Vec3, dirA: Vec3, dirB: Vec3): Gfx3d {
    const existing = this._store.get(id);
    if (existing) {
      this._world.setComponent(existing._e, { type: 'position3', x: center[0], y: center[1], z: center[2] });
      this._world.setComponent(existing._e, {
        type: 'geometry', kind: 'rightAngle',
        dirAX: dirA[0], dirAY: dirA[1], dirAZ: dirA[2],
        dirBX: dirB[0], dirBY: dirB[1], dirBZ: dirB[2],
        size: 0.18,
      } as ComponentOf<'geometry'>);
      this._touch(id);
      return existing;
    }
    this._upsert(id);
    const { entity, gfx } = spawnRightAngle(this._world, this._resolve, id, center, dirA, dirB, 0.18);
    this._register(gfx, entity);
    this._store.set(id, gfx);
    this._touch(id);
    return gfx;
  }

  surface(id: string, fn: SurfaceFn, uRange: [number, number], vRange: [number, number], opts: Surface3dOpts = {}): Gfx3d {
    const existing = this._store.get(id);
    if (existing) {
      this._world.setComponent(existing._e, {
        type: 'geometry', kind: 'surface',
        fn,
        fnKey: fn.toString(),
        uMin: uRange[0], uMax: uRange[1],
        vMin: vRange[0], vMax: vRange[1],
        uSegments: opts.uSegments ?? 32,
        vSegments: opts.vSegments ?? 32,
        style: opts.style ?? 'wireframe-face',
      } as ComponentOf<'geometry'>);
      if (opts.color) {
        this._world.patchComponent(existing._e, 'appearance', { color: this._resolve(opts.color) });
      }
      this._touch(id);
      return existing;
    }
    this._upsert(id);
    const { entity, gfx } = spawnSurface(this._world, this._resolve, id, fn, uRange[0], uRange[1], vRange[0], vRange[1], opts);
    this._register(gfx, entity);
    this._store.set(id, gfx);
    this._touch(id);
    return gfx;
  }

  axes3d(opts: Axes3dOpts = {}): Gfx3d {
    const existing = this._store.get('::axes3d');
    if (existing) {
      this._world.setComponent(existing._e, {
        type: 'geometry', kind: 'axes',
        length: opts.length ?? 4, arrowSize: opts.arrowSize ?? 0.2,
        symmetric: opts.symmetric ?? true, ticks: opts.ticks ?? false,
        basis: opts.basis ?? null,
      });
      this._touch('::axes3d');
      return existing;
    }
    const id = '::axes3d';
    this._upsert(id);
    const { entity, gfx } = spawnAxes(this._world, this._resolve, opts);
    this._register(gfx, entity);
    this._store.set(id, gfx);
    this._touch(id);
    return gfx;
  }

  grid3d(opts: Grid3dOpts = {}): Gfx3d {
    const id = opts.id ?? '::grid3d';
    const existing = this._store.get(id);
    if (existing) {
      this._world.setComponent(existing._e, {
        type: 'geometry', kind: 'grid',
        plane: opts.plane ?? 'xz', spacing: opts.spacing ?? 1,
        size: opts.size ?? 10, basis: opts.basis ?? null,
      });
      this._touch(id);
      return existing;
    }
    this._upsert(id);
    const { entity, gfx } = spawnGrid(this._world, this._resolve, opts);
    this._register(gfx, entity);
    this._store.set(id, gfx);
    this._touch(id);
    return gfx;
  }

  frame3d(opts: Frame3dOpts = {}): void {
    const extent = opts.extent ?? 4;
    this.axes3d({ length: extent, basis: opts.basis });
    this.grid3d({ size: extent * 2, basis: opts.basis });
  }

  group(entities: Gfx3d[]): Gfx3d {
    // Cross-entity grouping: direct THREE operation (not ECS)
    const grp = new THREE.Group();
    for (const e of entities) {
      const impl = e as Gfx3dImpl;
      const obj = impl.object3d;
      if (obj) {
        this._boot.scene.remove(obj);
        grp.add(obj);
      }
    }
    this._boot.scene.add(grp);
    const entity = this._world.spawn();
    this._world.addComponent(entity, { type: 'userId', value: `::group:${entity}` });
    const gfx = new Gfx3dImpl(this._world, entity, this._resolve);
    gfx._bindThreeObject(grp);
    return gfx;
  }

  // ═══════════════════════════════════════
  // 批量原语 (batch primitives)
  // ═══════════════════════════════════════

  /** Parametric space curve. Samples fn(t) at `segments` points, renders as a single polyline. */
  curve(fn: (t: number) => Vec3, opts: { t: [number, number]; segments?: number }): Gfx3d {
    const segs = opts.segments ?? 200;
    const [tMin, tMax] = opts.t;
    const dt = (tMax - tMin) / segs;
    const flat: number[] = [];
    for (let i = 0; i <= segs; i++) {
      const [x, y, z] = fn(tMin + i * dt);
      flat.push(x, y, z);
    }
    const id = `::curve_${this._batchN++}`;
    this._upsert(id);
    const entity = this._world.spawn();
    this._world.addComponent(entity, { type: 'position3', x: 0, y: 0, z: 0 });
    this._world.addComponent(entity, { type: 'geometry', kind: 'line', fromX: 0, fromY: 0, fromZ: 0, toX: 0, toY: 0, toZ: 0, polyline: flat });
    this._world.addComponent(entity, { type: 'appearance', color: this._resolve('primary'), opacity: 1, wireframe: false, emissive: 0 });
    this._world.addComponent(entity, { type: 'userId', value: id });
    const gfx = new Gfx3dImpl(this._world, entity, this._resolve);
    this._register(gfx, entity);
    this._store.set(id, gfx);
    this._touch(id);
    return gfx;
  }

  /** Batch points. Cached — re-touched each frame without rebuilding. */
  points(
    positions: Vec3[] | ((x: number, y: number, z: number) => Vec3),
    opts?: { x?: [number, number]; y?: [number, number]; z?: [number, number]; step?: number },
  ): Gfx3d {
    const pts = resolvePositions(positions, opts);
    const key = `:pts:${pts.length}`;
    const cached = this._store.get(key);
    if (cached) { this._touch(key); return cached; }
    const gfx = this._instancedSpheres(key, pts, 'sphere', this._resolve('primary'), 0.12);
    this._store.set(key, gfx as Gfx3dImpl);
    return gfx;
  }

  /** Batch spheres. Cached — re-touched each frame without rebuilding. */
  spheres(
    centers: Vec3[] | ((x: number, y: number, z: number) => Vec3),
    opts?: { r?: number; x?: [number, number]; y?: [number, number]; z?: [number, number]; step?: number },
  ): Gfx3d {
    const pts = resolvePositions(centers, opts);
    const r = opts?.r ?? 0.25;
    const key = `:sph:${pts.length}:${r}`;
    const cached = this._store.get(key);
    if (cached) { this._touch(key); return cached; }
    const gfx = this._instancedSpheres(key, pts, 'sphere', this._resolve('accent'), r);
    this._store.set(key, gfx as Gfx3dImpl);
    return gfx;
  }

  /** Batch vectors. Single Line2 for all shafts + single InstancedMesh for all cones = 2 draw calls. */
  vectors(
    fn: (x: number, y: number, z: number) => Vec3,
    opts: { x: [number, number]; y: [number, number]; z: [number, number]; step?: number; scale?: number | 'auto'; seed?: 'rect' | 'poisson' },
  ): Gfx3d {
    const step = opts.step ?? ((opts.x[1] - opts.x[0]) / 6);
    const seedMode = opts.seed ?? 'rect';

    // Seeded PRNG for deterministic output across frames
    let prng = 42;
    const rand = () => { prng = (prng * 16807) % 2147483647; return (prng - 1) / 2147483646; };

    // ── Generate sample points ──
    type V9 = [number, number, number, number, number, number, number, number, number];
    const raw: V9[] = [];
    let maxMag = 0;
    const [x0,x1] = opts.x; const [y0,y1] = opts.y; const [z0,z1] = opts.z;

    const evalSample = (sx: number, sy: number, sz: number) => {
      const [vx, vy, vz] = fn(sx, sy, sz);
      const mag = Math.sqrt(vx * vx + vy * vy + vz * vz);
      if (mag < 1e-9) return;
      if (mag > maxMag) maxMag = mag;
      raw.push([sx, sy, sz, vx, vy, vz, 0, 0, 0]);
    };

    if (seedMode === 'poisson') {
      // ── 3D Poisson disk sampling ──
      const r = step;
      const r2 = r * r;
      const cellSize = r / Math.sqrt(3);
      const nx = Math.ceil((x1 - x0) / cellSize) + 1;
      const ny = Math.ceil((y1 - y0) / cellSize) + 1;
      const nz = Math.ceil((z1 - z0) / cellSize) + 1;
      const grid: (V9 | null)[] = new Array(nx * ny * nz).fill(null);
      const active: V9[] = [];

      const key = (ix: number, iy: number, iz: number) => ix + nx * (iy + ny * iz);
      const cell = (coord: number, min: number) => Math.floor((coord - min) / cellSize);

      const hasNeighbor = (px: number, py: number, pz: number): boolean => {
        const cx = cell(px, x0), cy = cell(py, y0), cz = cell(pz, z0);
        for (let iz = Math.max(0, cz-1); iz <= Math.min(nz-1, cz+1); iz++) {
          for (let iy = Math.max(0, cy-1); iy <= Math.min(ny-1, cy+1); iy++) {
            for (let ix = Math.max(0, cx-1); ix <= Math.min(nx-1, cx+1); ix++) {
              const s = grid[key(ix, iy, iz)];
              if (!s) continue;
              const dx = s[0] - px, dy = s[1] - py, dz = s[2] - pz;
              if (dx*dx + dy*dy + dz*dz < r2) return true;
            }
          }
        }
        return false;
      };

      // Seed with a random point
      const s0x = x0 + rand() * (x1 - x0);
      const s0y = y0 + rand() * (y1 - y0);
      const s0z = z0 + rand() * (z1 - z0);
      const s0: V9 = [s0x, s0y, s0z, 0,0,0, 0,0,0];
      active.push(s0);
      grid[key(cell(s0x, x0), cell(s0y, y0), cell(s0z, z0))] = s0;

      const MAX_ATTEMPTS = 30;
      while (active.length > 0) {
        const ai = Math.floor(rand() * active.length);
        const a = active[ai]!;
        let found = false;
        for (let k = 0; k < MAX_ATTEMPTS; k++) {
          const angle1 = rand() * Math.PI * 2;
          const angle2 = Math.acos(2 * rand() - 1);
          const dist = r * (1 + rand());
          const px = a[0] + dist * Math.sin(angle2) * Math.cos(angle1);
          const py = a[1] + dist * Math.sin(angle2) * Math.sin(angle1);
          const pz = a[2] + dist * Math.cos(angle2);
          if (px < x0 || px > x1 || py < y0 || py > y1 || pz < z0 || pz > z1) continue;
          if (hasNeighbor(px, py, pz)) continue;
          const pt: V9 = [px, py, pz, 0,0,0, 0,0,0];
          active.push(pt);
          grid[key(cell(px,x0), cell(py,y0), cell(pz,z0))] = pt;
          found = true;
          break;
        }
        if (!found) { active[ai] = active[active.length-1]!; active.pop(); }
      }

      // Evaluate field at all Poisson sample points
      for (const pt of grid) {
        if (!pt) continue;
        evalSample(pt[0], pt[1], pt[2]);
      }
    } else {
      // ── Rectangular grid ──
      for (let x = x0; x <= x1 + step * 0.1; x += step) {
        for (let y = y0; y <= y1 + step * 0.1; y += step) {
          for (let z = z0; z <= z1 + step * 0.1; z += step) {
            evalSample(x, y, z);
          }
        }
      }
    }
    const N = raw.length;
    if (N === 0) return new Gfx3dImpl(this._world, this._world.spawn(), this._resolve);

    // ── Resolve scale ──
    let scl: number;
    if (opts.scale === 'auto') {
      scl = step / maxMag;
    } else {
      scl = opts.scale ?? 0.25;
    }

    // ── Second pass: build arrow segments ──
    type V6 = [number, number, number, number, number, number];
    const pairs: V6[] = [];
    for (const r of raw) {
      const [x, y, z, vx, vy, vz] = r;
      pairs.push([x, y, z, x + vx * scl, y + vy * scl, z + vz * scl]);
    }

    // ── Shafts: LineSegments2 treats each pair as independent (no connections between vectors) ──
    const shaftPositions: number[] = [];
    for (const p of pairs) {
      shaftPositions.push(p[0]!, p[1]!, p[2]!, p[3]!, p[4]!, p[5]!);
    }
    const shaftGeo = new LineSegmentsGeometry();
    shaftGeo.setPositions(shaftPositions);
    const shaftColor = this._resolve('info');
    const arrThick = 0.021;
    const shaftMat = new THREE.Line2NodeMaterial({ color: shaftColor, linewidth: arrThick, transparent: true, alphaToCoverage: false });
    shaftMat.worldUnits = true;
    const shafts = new LineSegments2(shaftGeo, shaftMat);

    // ── Cones: proportions matching _makeArrow (t*8 capped at 0.28, ≤35% of length) ──
    const headLen = Math.max(arrThick * 8, 0.08);
    const coneRadius = arrThick * 1.65; // proportional to shaft thickness
    const coneGeo = new THREE.ConeGeometry(coneRadius, headLen, 8);
    const coneMat = new THREE.MeshBasicMaterial({ color: shaftColor });
    const cones = new THREE.InstancedMesh(coneGeo, coneMat, N);
    const dummy = new THREE.Object3D();
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < N; i++) {
      const p = pairs[i]!;
      const dx = p[3]! - p[0]!, dy = p[4]! - p[1]!, dz = p[5]! - p[2]!;
      const dir = new THREE.Vector3(dx, dy, dz).normalize();
      dummy.position.set(p[3]!, p[4]!, p[5]!);
      dummy.quaternion.setFromUnitVectors(up, dir);
      dummy.updateMatrix();
      cones.setMatrixAt(i, dummy.matrix);
    }
    cones.instanceMatrix.needsUpdate = true;

    const group = new THREE.Group();
    group.add(shafts);
    group.add(cones);
    group.userData.lvKind = 'arrow'; // for TransitionSystem exit detection

    // Register properly through ECS lifecycle
    const entity = this._world.spawn();
    const geoComp = { type: 'geometry' as const, kind: 'arrow' as const, fromX: 0, fromY: 0, fromZ: 0, toX: 1, toY: 0, toZ: 0 };
    this._world.addComponent(entity, geoComp);
    this._geometrySys.objCache.set(entity, group);
    this._geometrySys.setHash(entity, geoComp); // prevent GeometrySystem from rebuilding
    this._boot.scene.add(group);

    const gfx = new Gfx3dImpl(this._world, entity, this._resolve);
    (gfx as any)._bindThreeObject(group);
    const id = `::vfield_${this._batchN++}`;
    this._world.addComponent(entity, { type: 'userId', value: id });
    this._store.set(id, gfx);
    this._touch(id);
    return gfx;
  }

  private _batchN = 0;

  /** InstancedMesh for many small spheres. MeshBasicMaterial works with WebGPU instancing. */
  private _instancedSpheres(key: string, pts: Vec3[], kind: GeometryKind, color: number, radius: number): Gfx3d {
    // TODO: switch to BatchedMesh for WebGPU-native batching (instances > 64)
    const N = pts.length;
    const group = new THREE.Group();
    group.userData.lvKind = kind;

    const geo = new THREE.SphereGeometry(radius, 24, 16);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
    for (let i = 0; i < N; i++) {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(pts[i]![0], pts[i]![1], pts[i]![2]);
      group.add(m);
    }

    const entity = this._world.spawn();
    const geoComp = { type: 'geometry' as const, kind: 'sphere' as const, radius };
    this._world.addComponent(entity, geoComp);
    this._world.addComponent(entity, { type: 'appearance', color, opacity: 1, wireframe: false, emissive: 0 });

    // Let createAndRegister set up the ECS hash/lifecycle, then swap the object
    const dummy = this._geometrySys.createAndRegister(entity, this._world);
    this._boot.scene.remove(dummy);
    disposeTree(dummy);
    this._geometrySys.objCache.set(entity, group);
    this._boot.scene.add(group);

    const gfx = new Gfx3dImpl(this._world, entity, this._resolve);
    (gfx as any)._bindThreeObject(group);
    this._world.addComponent(entity, { type: 'userId', value: key });
    this._touch(key);
    return gfx;
  }


  // ═══════════════════════════════════════
  // 视点 (viewpoint)
  // ═══════════════════════════════════════

  camera(config: CameraConfig, opts: CameraAnimOpts = {}): void {
    // Resolve semantic fields (lookAt / direction) → position + target
    const resolved = this._resolveCamera(config);

    const duration = opts.duration ?? 0.8;
    const cam = this._boot.camera;
    if (duration <= 0) {
      if (resolved.position) cam.position.set(...resolved.position);
      if (resolved.target) this._boot.controls.target.set(...resolved.target);
      if (config.fov && cam instanceof THREE.PerspectiveCamera) { cam.fov = config.fov; cam.updateProjectionMatrix(); }
      this._boot.controls.update();
      this._camAnim = null;
      return;
    }

    const cp = this._boot.camera.position;
    const ct = this._boot.controls.target;
    const fromPos: Vec3 = [cp.x, cp.y, cp.z];
    const fromTgt: Vec3 = [ct.x, ct.y, ct.z];
    const toPos: Vec3 = resolved.position ?? fromPos;
    const toTgt: Vec3 = resolved.target ?? fromTgt;

    this._camAnim = {
      fromPos, fromTgt, toPos, toTgt,
      startMs: performance.now(),
      duration,
      easing: EASINGS[opts.easing ?? 'ease-out'] ?? EASINGS['ease-out']!,
    };
  }

  /** Auto-compute camera from scene bounding box + optional focus point. */
  private _resolveCamera(config: CameraConfig): { position?: Vec3; target?: Vec3 } {
    // Compute bounding box of all scene entities (for distance + auto-target)
    const box = new THREE.Box3();
    for (const gfx of this._store.values()) {
      const obj = gfx.object3d;
      if (obj) box.expandByObject(obj);
    }
    if (box.isEmpty()) return { position: config.position, target: config.target };

    // Full manual: both position + target provided → pass through
    if (config.position && config.target) {
      return { position: config.position, target: config.target };
    }

    // Target: explicit, or scene-center
    let target: Vec3;
    if (config.target) {
      target = config.target;
    } else {
      const c = new THREE.Vector3();
      box.getCenter(c);
      target = [c.x, c.y, c.z];
    }

    // Position: explicit, or auto-compute from direction + distance
    let position: Vec3 | undefined;
    if (config.position) {
      position = config.position;
    } else {
      const size = new THREE.Vector3();
      box.getSize(size);
      const diag = Math.sqrt(size.x * size.x + size.y * size.y + size.z * size.z);
      if (diag < 0.01) return { target };

      const offset = new THREE.Vector3();
      const dir = config.direction ?? 'isometric';
      switch (dir) {
        case 'top-down':  offset.set(0, 1, 0.02); break;
        case 'front':     offset.set(0, 0.1, 1); break;
        case 'side':      offset.set(1, 0.1, 0); break;
        case 'back':      offset.set(0, 0.1, -1); break;
        default:          offset.set(0.7, 0.55, 1); break;
      }
      offset.normalize();
      const dist = (config.distance ?? 1.4) * diag;
      position = [
        target[0] + offset.x * dist,
        target[1] + offset.y * dist,
        target[2] + offset.z * dist,
      ];
    }

    return { position, target };
  }

  view(opts: ViewOpts): void {
    const { camera, controls } = this._boot;
    const dx = opts.x ? opts.x[1] - opts.x[0] : 10;
    const dy = opts.y ? opts.y[1] - opts.y[0] : 10;
    const dz = opts.z ? opts.z[1] - opts.z[0] : 10;
    const maxExtent = Math.max(dx, dy, dz, 1);
    const dist = maxExtent * 1.5;
    camera.position.set(dist, dist * 0.6, dist);
    controls.target.set(
      opts.x ? (opts.x[0] + opts.x[1]) / 2 : 0,
      opts.y ? (opts.y[0] + opts.y[1]) / 2 : 0,
      opts.z ? (opts.z[0] + opts.z[1]) / 2 : 0,
    );
    controls.update();
  }

  // ═══════════════════════════════════════
  // 叙事 (narrative)
  // ═══════════════════════════════════════

  render(fn: (s: Scene3d) => void): void {
    this._frameFn = fn;
  }

  steps(defs: StepDef3d[], opts: StepsOptions3d = {}): StepsController3d {
    return createStepsController3d(this, defs, opts);
  }

  // ═══════════════════════════════════════
  // 照明 (lighting)
  // ═══════════════════════════════════════

  light(def: LightDef): void {
    const hex = this._resolve(def.color ?? 'primary');
    switch (def.type) {
      case 'ambient': {
        this._boot.scene.add(new THREE.AmbientLight(hex, def.intensity ?? 1));
        break;
      }
      case 'directional': {
        const l = new THREE.DirectionalLight(hex, def.intensity ?? 3);
        if (def.position) l.position.set(...def.position);
        this._boot.scene.add(l);
        break;
      }
      case 'point': {
        const l = new THREE.PointLight(hex, def.intensity ?? 3);
        if (def.position) l.position.set(...def.position);
        this._boot.scene.add(l);
        break;
      }
    }
  }

  // ═══════════════════════════════════════
  // System registration (ECS extension point)
  // ═══════════════════════════════════════

  use(system: System): this {
    this._world.addSystem(system);
    return this;
  }

  // ═══════════════════════════════════════
  // Coordinate system
  // ═══════════════════════════════════════

  coords3d(config?: import('./types').CoordsConfig3d): import('./types').CoordSystem3d {
    return createCoordSystem3d(this, config);
  }

  // ═══════════════════════════════════════
  // Escape hatches
  // ═══════════════════════════════════════

  get three(): THREE.Scene { return this._boot.scene; }
  get camera3d(): THREE.OrthographicCamera | THREE.PerspectiveCamera { return this._boot.camera; }
  get renderer(): THREE.WebGPURenderer { return this._boot.renderer; }

  // ═══════════════════════════════════════
  // Lifecycle
  // ═══════════════════════════════════════

  [Symbol.dispose](): void {
    this._boot.renderer.setAnimationLoop(null);
    this._cleanupSys.disposeAll();
    this._toonGradient?.dispose();
    this._cssLabel.dispose();
    this._labelContainer.remove();
    this._boot.dispose();
    for (const fn of this._onDispose) fn();
  }
}
