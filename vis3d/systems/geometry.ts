// vis3d/systems/geometry.ts — GeometrySystem
// Creates/rebuilds THREE objects from ECS geometry components.
// Owns _objCache. Handles size/thickness change detection and in-place updates.
//
// Labels are handled by CSSLabelSystem (pure CSS, no Sprites).
// Arrows and lines use Line2 (fat lines) for proper width rendering on WebGPU.

import * as THREE from 'three/webgpu';
import { Line2 } from 'three/addons/lines/webgpu/Line2.js';
import { LineSegments2 } from 'three/addons/lines/webgpu/LineSegments2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import type { World, Entity, System, ComponentOf, DataOf } from '@learnvis/ecs';
import type { ColorResolver } from '../gfx';
import type { MoodContext } from '../mood';
import type { Vec3, SurfaceFn } from '../types';

// ═══════════════════════════════════════════════════════════
// Geometry param types (internal)
// ═══════════════════════════════════════════════════════════

interface ArrowParams  { kind: 'arrow';  toX: number; toY: number; toZ: number; thickness: number }
interface SphereParams { kind: 'sphere'; radius: number }
interface CubeParams   { kind: 'cube';   size: number }
interface SpriteParams { kind: 'sprite' }
interface GridParams   { kind: 'grid';   plane: string; spacing: number; size: number; basis?: [Vec3,Vec3,Vec3] | null }
interface AxesParams   { kind: 'axes';   length: number; arrowSize: number; symmetric: boolean; ticks?: boolean; basis?: [Vec3,Vec3,Vec3] | null }
interface LineParams   { kind: 'line';   toX: number; toY: number; toZ: number }
interface SurfaceParams { kind: 'surface'; fn: SurfaceFn; fnKey: string; uMin: number; uMax: number; vMin: number; vMax: number; uSegments: number; vSegments: number; style?: 'wireframe-face' | 'height-color' | 'minimal' }
interface FillParams   { kind: 'fill';   vertices: number[]; count: number }
interface ArcParams    { kind: 'arc';    fromX: number; fromY: number; fromZ: number; toX: number; toY: number; toZ: number; radius: number }
interface RAngleParams  { kind: 'rightAngle'; dirAX: number; dirAY: number; dirAZ: number; dirBX: number; dirBY: number; dirBZ: number; size: number }
type GeometryParams = ArrowParams | SphereParams | CubeParams | SpriteParams | GridParams | AxesParams | LineParams | SurfaceParams | FillParams | ArcParams | RAngleParams;

// ── Tiny vec3 helpers ──
const cross3 = (a: Vec3, b: Vec3): Vec3 => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const len3 = (v: Vec3): number => Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2]);
const normalize3 = (v: Vec3): Vec3 => { const l=len3(v); return l<1e-9 ? [0,0,0] : [v[0]/l, v[1]/l, v[2]/l]; };

// ═══════════════════════════════════════════════════════════
// Color derivation helpers (Desaturate rule for arrow parts)
// ═══════════════════════════════════════════════════════════

function _hexToRGB(h: number): [number, number, number] {
  return [(h >> 16) & 0xff, (h >> 8) & 0xff, h & 0xff];
}
function _rgbToHex(r: number, g: number, b: number): number {
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

function _lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }

export function _desaturateHex(hex: number, amt: number): number {
  const [r, g, b] = _hexToRGB(hex);
  const gray = r * 0.299 + g * 0.587 + b * 0.114;
  return _rgbToHex(_lerp(r, gray, amt), _lerp(g, gray, amt), _lerp(b, gray, amt));
}

export function _lightenHex(hex: number, amt: number): number {
  const [r, g, b] = _hexToRGB(hex);
  return _rgbToHex(_lerp(r, 255, amt), _lerp(g, 255, amt), _lerp(b, 255, amt));
}

// ═══════════════════════════════════════════════════════════
// GeometrySystem
// ═══════════════════════════════════════════════════════════

export class GeometrySystem implements System {
  readonly name = 'geometry';
  readonly requiredComponents = ['geometry'] as const;

  // Public cache — owned by this system, read-only for other systems
  readonly objCache   = new Map<Entity, THREE.Object3D>();

  private _scene: THREE.Scene;
  private _resolve: ColorResolver;
  private _mood: MoodContext;
  private _toonGradient?: THREE.Texture;

  // Per-entity caches for change detection
  private _geoHash     = new Map<Entity, string>();
  private _gridStruct  = new Map<Entity, string>();
  private _sizeCache   = new Map<Entity, number>();
  private _thickCache  = new Map<Entity, number>();
  private _dirCache    = new Map<Entity, string>();
  private _spriteColor = new Map<Entity, number>();

  constructor(scene: THREE.Scene, resolve: ColorResolver, mood: MoodContext, toonGradient?: THREE.Texture) {
    this._scene = scene;
    this._resolve = resolve;
    this._mood = mood;
    this._toonGradient = toonGradient;
  }

  // ══ System.update ══

  update(world: World, _context: unknown): void {
    const entities = world.query('geometry');

    for (const entity of entities) {
      let obj = this.objCache.get(entity);
      const geo = world.getComponent(entity, 'geometry')!;
      const geoKey = JSON.stringify(geo);

      // Geometry changed → rebuild (grid only on structural param changes)
      if (obj && this._geoHash.get(entity) !== geoKey) {
        const gp = geo as unknown as GeometryParams;
        if (gp.kind !== 'grid') {
          this._scene.remove(obj);
          this.objCache.delete(entity);
          obj = undefined;
        } else {
          const g = gp as GridParams;
          const structKey = `grid:${g.plane}:${g.spacing}:${g.size}`;
          if (this._gridStruct.get(entity) !== structKey) {
            this._scene.remove(obj);
            this.objCache.delete(entity);
            obj = undefined;
            this._gridStruct.set(entity, structKey);
          }
        }
      }

      if (!obj) {
        const built = this._buildThreeObject(entity, world);
        if (!built) continue;
        obj = built;
        this.objCache.set(entity, obj);
        this._geoHash.set(entity, geoKey);
        this._scene.add(obj);
        obj.userData.lvKind = (geo as Record<string, unknown>).kind;
      }

      // Sprite color change: redraw canvas texture (sprite color can't be changed via material)
      if ((geo as unknown as GeometryParams).kind === 'sprite') {
        const app = world.getComponent(entity, 'appearance');
        if (app && this._spriteColor.get(entity) !== app.color) {
          this._spriteColor.set(entity, app.color);
          const canvas = (obj as THREE.Sprite).userData?._lvCanvas as HTMLCanvasElement | undefined;
          if (canvas) {
            const ctx = canvas.getContext('2d')!;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2 - 2, 0, Math.PI * 2);
            const rr = (app.color >> 16) & 0xff;
            const gg = (app.color >> 8) & 0xff;
            const bb = app.color & 0xff;
            ctx.fillStyle = `rgb(${rr},${gg},${bb})`;
            ctx.fill();
            ((obj as THREE.Sprite).material as THREE.SpriteMaterial).map!.needsUpdate = true;
          }
        }
      }

      // In-place updates (no full rebuild needed)
      const size = world.getComponent(entity, 'size');
      if (size) this._syncSize(entity, obj, size);

      const thick = world.getComponent(entity, 'thickness');
      if (thick) this._syncThickness(entity, obj, world, geo, thick);

      // Grid lattice: update vertex positions in-place (basis animation)
      if ((geo as unknown as GeometryParams).kind === 'grid') {
        this._syncGrid(obj, geo as unknown as GeometryParams);
      }
    }
  }

  // ══ Eager creation (called by Scene3dImpl._register) ══

  createAndRegister(entity: Entity, world: World): THREE.Object3D {
    const cached = this.objCache.get(entity);
    if (cached) return cached;
    const obj = this._buildThreeObject(entity, world);
    if (!obj) throw new Error(`GeometrySystem: cannot build THREE object for entity ${entity}`);
    this.objCache.set(entity, obj);
    // Set hash caches so GeometrySystem.update() doesn't rebuild on next frame
    const geo = world.getComponent(entity, 'geometry');
    if (geo) {
      this._geoHash.set(entity, JSON.stringify(geo));
      const gp = geo as unknown as GeometryParams;
      if (gp.kind === 'grid') {
        const g = gp as { plane: string; spacing: number; size: number };
        this._gridStruct.set(entity, `grid:${g.plane}:${g.spacing}:${g.size}`);
      }
    }
    this._scene.add(obj);
    obj.userData.lvKind = (geo as Record<string, unknown>).kind;
    return obj;
  }

  /** Set hash caches for a pre-built entity so GeometrySystem.update() won't rebuild it. */
  setHash(entity: Entity, geo: Record<string, unknown>): void {
    this._geoHash.set(entity, JSON.stringify(geo));
    if (geo.kind === 'grid') {
      const g = geo as { plane: string; spacing: number; size: number };
      this._gridStruct.set(entity, `grid:${g.plane}:${g.spacing}:${g.size}`);
    }
  }

  // ══ Teardown ══

  disposeAll(): void {
    for (const [, obj] of this.objCache) {
      this._scene.remove(obj);
      disposeTree(obj);
    }
    this.objCache.clear();
    this._sizeCache.clear();
    this._thickCache.clear();
    this._dirCache.clear();
    this._geoHash.clear();
    this._gridStruct.clear();
    this._spriteColor.clear();
  }

  // ═══════════════════════════════════════════════════════════
  // Material factory
  // ═══════════════════════════════════════════════════════════

  private _makeMaterial(color: number, opts?: { transparent?: boolean; opacity?: number; side?: THREE.Side }): THREE.Material {
    if (this._mood.toonBands !== undefined) {
      return new THREE.MeshToonMaterial({
        color,
        gradientMap: this._toonGradient ?? null,
        transparent: opts?.transparent ?? false,
        opacity: opts?.opacity ?? 1,
        depthWrite: !opts?.transparent,
        side: opts?.side ?? THREE.FrontSide,
      });
    }
    return new THREE.MeshStandardMaterial({
      color,
      roughness: this._mood.roughness,
      metalness: this._mood.metalness,
      transparent: opts?.transparent ?? false,
      opacity: opts?.opacity ?? 1,
      side: opts?.side ?? THREE.FrontSide,
    });
  }

  /**
   * Factory for Line2NodeMaterial.
   *
   * Note: Line2NodeMaterial hardcodes `blending = NoBlending` (transparency not
   * supported in WebGPU backend). TSL node overrides (lineColorNode, vertexNode)
   * are silently ignored due to InstancedInterleavedBuffer geometry.
   * Line transitions use narrow scaling instead of opacity fade.
   */
  private _makeLineMaterial(color: number, linewidth: number): THREE.Line2NodeMaterial {
    const mat = new THREE.Line2NodeMaterial({ color, linewidth });
    mat.worldUnits = true;
    return mat;
  }

  // ═══════════════════════════════════════════════════════════
  // Object factory
  // ═══════════════════════════════════════════════════════════

  private _buildThreeObject(entity: Entity, world: World): THREE.Object3D | null {
    const geoComp = world.getComponent(entity, 'geometry');
    const app = world.getComponent(entity, 'appearance');
    if (!geoComp || !app) return null;
    const geo = geoComp as unknown as GeometryParams;
    const role = world.getComponent(entity, 'materialRole');

    switch (geo.kind) {
      case 'sphere': {
        const g = new THREE.SphereGeometry(geo.radius, 48, 32);
        const m = this._makeMaterial(app.color);
        this._sizeCache.set(entity, geo.radius);
        return new THREE.Mesh(g, m);
      }
      case 'cube': {
        const box = new THREE.BoxGeometry(geo.size, geo.size, geo.size);
        const edges = new THREE.EdgesGeometry(box);
        const wire = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: app.color }));
        const faceOpacity = role?.opacity ?? 0.18;
        const face = new THREE.Mesh(box, this._makeMaterial(app.color, { transparent: true, opacity: faceOpacity, side: THREE.DoubleSide }));
        face.userData.lvRole = 'fill';
        const group = new THREE.Group();
        group.add(wire); group.add(face);
        this._sizeCache.set(entity, geo.size);
        return group;
      }
      case 'rightAngle': {
        const rp = geo as RAngleParams;
        const nA = (() => { const l = Math.sqrt(rp.dirAX*rp.dirAX+rp.dirAY*rp.dirAY+rp.dirAZ*rp.dirAZ); return l<1e-9?[0,0,0]:[rp.dirAX/l,rp.dirAY/l,rp.dirAZ/l]; })();
        const nB = (() => { const l = Math.sqrt(rp.dirBX*rp.dirBX+rp.dirBY*rp.dirBY+rp.dirBZ*rp.dirBZ); return l<1e-9?[0,0,0]:[rp.dirBX/l,rp.dirBY/l,rp.dirBZ/l]; })();
        const s = rp.size;
        const a = [nA[0]*s, nA[1]*s, nA[2]*s];
        const ab = [nA[0]*s+nB[0]*s, nA[1]*s+nB[1]*s, nA[2]*s+nB[2]*s];
        const b = [nB[0]*s, nB[1]*s, nB[2]*s];
        const lineGeo = new LineGeometry();
        lineGeo.setPositions([a[0],a[1],a[2], ab[0],ab[1],ab[2], ab[0],ab[1],ab[2], b[0],b[1],b[2]]);
        return new Line2(lineGeo, this._makeLineMaterial(app.color, 0.016));
      }
      case 'arc': {
        const ap = geo as ArcParams;
        const norm = (v: number[]) => { const l = Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2]); return l < 1e-9 ? [0,0,0] : [v[0]/l, v[1]/l, v[2]/l]; };
        const fromN = norm([ap.fromX, ap.fromY, ap.fromZ]);
        const toN   = norm([ap.toX, ap.toY, ap.toZ]);
        const segs = 24;
        // Fan vertices: center + arc points
        const verts: number[] = [0, 0, 0];
        for (let i = 0; i <= segs; i++) {
          const t = i / segs;
          const d = norm([fromN[0]*(1-t)+toN[0]*t, fromN[1]*(1-t)+toN[1]*t, fromN[2]*(1-t)+toN[2]*t]);
          verts.push(d[0]*ap.radius, d[1]*ap.radius, d[2]*ap.radius);
        }
        const geo3 = new THREE.BufferGeometry();
        geo3.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        const indices: number[] = [];
        for (let i = 0; i < segs; i++) indices.push(0, i + 1, i + 2);
        geo3.setIndex(indices);
        geo3.computeVertexNormals();
        const fanOpacity = role?.opacity ?? 0.15;
        const fanMat = this._makeMaterial(app.color, { transparent: true, opacity: fanOpacity, side: THREE.DoubleSide });
        fanMat.depthWrite = false;
        const fan = new THREE.Mesh(geo3, fanMat);
        fan.userData.lvRole = 'fill';
        // Arc outline
        const arcPts = verts.slice(3);
        // Radius lines
        const rGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(fromN[0]*ap.radius, fromN[1]*ap.radius, fromN[2]*ap.radius),
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(toN[0]*ap.radius, toN[1]*ap.radius, toN[2]*ap.radius),
        ]);
        const rLine = new THREE.LineSegments(rGeo, new THREE.LineBasicMaterial({ color: app.color }));
        // Arc outline segments
        const arcVerts: number[] = [];
        for (let i = 0; i < segs; i++) {
          arcVerts.push(arcPts[i*3]!, arcPts[i*3+1]!, arcPts[i*3+2]!);
          arcVerts.push(arcPts[(i+1)*3]!, arcPts[(i+1)*3+1]!, arcPts[(i+1)*3+2]!);
        }
        const arcGeo2 = new THREE.BufferGeometry();
        arcGeo2.setAttribute('position', new THREE.Float32BufferAttribute(arcVerts, 3));
        const arcLine = new THREE.LineSegments(arcGeo2, new THREE.LineBasicMaterial({ color: app.color }));
        const group = new THREE.Group();
        group.add(fan);
        group.add(rLine);
        group.add(arcLine);
        return group;
      }
      case 'fill': {
        const fp = geo as FillParams;
        const geo3 = new THREE.BufferGeometry();
        geo3.setAttribute('position', new THREE.Float32BufferAttribute(fp.vertices, 3));
        const indices: number[] = [];
        for (let i = 1; i < fp.count - 1; i++) indices.push(0, i, i + 1);
        geo3.setIndex(indices);
        geo3.computeVertexNormals();
        const fillOpacity = role?.opacity ?? 0.12;
        const mat = this._makeMaterial(app.color, { transparent: true, opacity: fillOpacity, side: THREE.DoubleSide });
        mat.depthWrite = false;
        const mesh = new THREE.Mesh(geo3, mat);
        return mesh;
      }
      case 'surface': {
        const sp = geo as SurfaceParams;
        const surfGeo = this._buildSurfaceGeometry(sp);
        const style = sp.style ?? 'wireframe-face';
        const group = new THREE.Group();

        if (style === 'height-color') {
          const cGeo = surfGeo.clone();
          const posArr = cGeo.getAttribute('position').array as Float32Array;
          let zMin = Infinity, zMax = -Infinity;
          for (let i = 0; i < posArr.length; i += 3) {
            const z = posArr[i + 2]!;
            if (z < zMin) zMin = z;
            if (z > zMax) zMax = z;
          }
          const zSpan = zMax - zMin || 1;
          const loHex = this._resolve('primary');
          const hiHex = this._resolve('accent');
          const lo = [(loHex>>16)&0xff, (loHex>>8)&0xff, loHex&0xff];
          const hi = [(hiHex>>16)&0xff, (hiHex>>8)&0xff, hiHex&0xff];
          const colors: number[] = [];
          for (let i = 0; i < posArr.length; i += 3) {
            const t = (posArr[i + 2]! - zMin) / zSpan;
            colors.push(
              (lo[0] + (hi[0] - lo[0]) * t) / 255,
              (lo[1] + (hi[1] - lo[1]) * t) / 255,
              (lo[2] + (hi[2] - lo[2]) * t) / 255,
            );
          }
          cGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
          const cMat = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: this._mood.roughness,
            metalness: this._mood.metalness,
            side: THREE.DoubleSide,
          });
          const faceMesh = new THREE.Mesh(cGeo, cMat);
          faceMesh.userData.lvRole = 'fill';
          group.add(faceMesh);
        } else if (style === 'minimal') {
          group.add(new THREE.LineSegments(
            new THREE.WireframeGeometry(surfGeo),
            new THREE.LineBasicMaterial({ color: app.color, transparent: true, opacity: 0.8 }),
          ));
          const faceOpacity = role?.opacity ?? 0.08;
          const faceMesh = new THREE.Mesh(surfGeo, this._makeMaterial(app.color, { transparent: true, opacity: faceOpacity, side: THREE.DoubleSide }));
          faceMesh.userData.lvRole = 'fill';
          group.add(faceMesh);
        } else {
          // wireframe-face (default)
          group.add(new THREE.LineSegments(
            new THREE.WireframeGeometry(surfGeo),
            new THREE.LineBasicMaterial({ color: app.color }),
          ));
          const faceOpacity = role?.opacity ?? 0.18;
          const faceMesh = new THREE.Mesh(surfGeo, this._makeMaterial(app.color, { transparent: true, opacity: faceOpacity, side: THREE.DoubleSide }));
          faceMesh.userData.lvRole = 'fill';
          group.add(faceMesh);
        }

        group.frustumCulled = false;
        return group;
      }
      case 'sprite': {
        const size = 64;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
        const r = (app.color >> 16) & 0xff;
        const g = (app.color >> 8) & 0xff;
        const b = app.color & 0xff;
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fill();
        const tex = new THREE.CanvasTexture(canvas);
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.setScalar(8 / 64);
        // Store canvas ref + color for change detection
        sprite.userData._lvCanvas = canvas;
        this._spriteColor.set(entity, app.color);
        return sprite;
      }
      case 'arrow': {
        const pos = world.getComponent(entity, 'position3');
        const from: Vec3 = pos ? [pos.x, pos.y, pos.z] : [0, 0, 0];
        const to: Vec3 = [geo.toX, geo.toY, geo.toZ];
        const t = geo.thickness ?? 0.06;
        this._thickCache.set(entity, t);
        this._dirCache.set(entity, `${to[0]},${to[1]},${to[2]}`);
        return this._makeArrow(from, to, app.color, t);
      }
      case 'line': {
        const pos = world.getComponent(entity, 'position3');
        const fx = pos?.x ?? 0, fy = pos?.y ?? 0, fz = pos?.z ?? 0;
        const tx = (geo as LineParams).toX, ty = (geo as LineParams).toY, tz = (geo as LineParams).toZ;
        const dx = tx - fx, dy = ty - fy, dz = tz - fz;
        const dashPat = (geo as unknown as Record<string, unknown>).dash as [number, number] | undefined;
        const polyline = (geo as unknown as Record<string, unknown>).polyline as number[] | undefined;

        // Polyline: multi-segment line (e.g., parametric curve)
        if (polyline && polyline.length >= 6) {
          const segs: number[] = [];
          for (let i = 0; i < polyline.length - 3; i += 3) {
            segs.push(polyline[i]!, polyline[i+1]!, polyline[i+2]!, polyline[i+3]!, polyline[i+4]!, polyline[i+5]!);
          }
          const lineGeo = new LineGeometry();
          lineGeo.setPositions(segs);
          const thickVal = world.getComponent(entity, 'thickness')?.value ?? 0.012;
          const lineMat = this._makeLineMaterial(app.color, thickVal);
          this._thickCache.set(entity, thickVal);
          return new Line2(lineGeo, lineMat);
        }

        if (dashPat) {
          // Dashed: build LineSegments2 with alternating dash/gap segments
          const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (len < 0.001) return new THREE.Group();
          const dLen = dashPat[0] * 0.08, gLen = dashPat[1] * 0.08;
          const step = dLen + gLen;
          const positions: number[] = [];
          let traveled = 0;
          while (traveled < len) {
            const segEnd = Math.min(traveled + dLen, len);
            const t0 = traveled / len, t1 = segEnd / len;
            positions.push(dx * t0, dy * t0, dz * t0, dx * t1, dy * t1, dz * t1);
            traveled += step;
          }
          const segGeo = new LineSegmentsGeometry();
          segGeo.setPositions(positions);
          const thickVal = world.getComponent(entity, 'thickness')?.value ?? 0.012;
          const lineMat = this._makeLineMaterial(app.color, thickVal);
          this._thickCache.set(entity, thickVal);
          return new LineSegments2(segGeo, lineMat);
        }

        // Solid: use Line2 for variable width
        const thickVal = world.getComponent(entity, 'thickness')?.value ?? 0.012;
        const lineGeo = new LineGeometry();
        lineGeo.setPositions([0, 0, 0, dx, dy, dz]);
        const lineMat = new THREE.Line2NodeMaterial({ color: app.color, linewidth: thickVal, transparent: true, opacity: app.opacity });
        lineMat.worldUnits = true;
        this._thickCache.set(entity, thickVal);
        return new Line2(lineGeo, lineMat);
      }
      case 'axes': {
        const ap = geo as AxesParams;
        return this._buildAxesGroup(ap.length ?? 4, ap.symmetric ?? true, ap.arrowSize ?? 0.2, ap.ticks ?? false, ap.basis);
      }
      case 'grid': {
        return this._buildGridLines(geo.plane ?? 'xz', geo.spacing ?? 1, geo.size ?? 10, app.color, (geo as GridParams).basis);
      }
      default:
        return null;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Size / thickness sync (in-place updates)
  // ═══════════════════════════════════════════════════════════

  private _syncSize(entity: Entity, obj: THREE.Object3D, size: DataOf<'size'>): void {
    const prev = this._sizeCache.get(entity);
    if (prev === size.value) return;
    this._sizeCache.set(entity, size.value);

    if (obj instanceof THREE.Sprite) {
      obj.scale.setScalar(size.value / 64);
    }
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry instanceof THREE.SphereGeometry && mesh.geometry.parameters.radius !== size.value) {
      mesh.geometry = new THREE.SphereGeometry(size.value, 48, 32);
    }
  }

  private _syncThickness(
    entity: Entity, obj: THREE.Object3D, world: World,
    geo: ComponentOf<'geometry'>, thick: DataOf<'thickness'>,
  ): void {
    const params = geo as unknown as GeometryParams;
    const prevT = this._thickCache.get(entity);

    // Line: cheap Line2 linewidth update
    if (params.kind === 'line') {
      if (prevT === thick.value) return;
      this._thickCache.set(entity, thick.value);
      const mat = ((obj as any).material) as THREE.Line2NodeMaterial | undefined;
      if (mat?.linewidth !== undefined) mat.linewidth = thick.value;
      return;
    }
    if (params.kind !== 'arrow') return;

    const toKey = `${(params as ArrowParams).toX},${(params as ArrowParams).toY},${(params as ArrowParams).toZ}`;
    const prevD = this._dirCache.get(entity);

    if (prevT === thick.value && prevD === toKey) return;
    this._thickCache.set(entity, thick.value);

    // Cheap path: just update lineWidth on existing Line2
    if (prevD === toKey) {
      const shaft = obj.children[0];
      if (shaft && (shaft as any).isLine2) {
        const mat = (shaft as any).material;
        if (mat?.lineWidth !== undefined) {
          mat.lineWidth = thick.value;
          return;
        }
      }
    }

    // Direction changed or cheap path failed — rebuild
    this._dirCache.set(entity, toKey);
    const pos = world.getComponent(entity, 'position3');
    const app = world.getComponent(entity, 'appearance');
    const from: Vec3 = pos ? [pos.x, pos.y, pos.z] : [0, 0, 0];
    const to: Vec3 = [(params as ArrowParams).toX, (params as ArrowParams).toY, (params as ArrowParams).toZ];
    const newObj = this._makeArrow(from, to, app?.color ?? this._resolve('primary'), thick.value);
    this._scene.remove(obj);
    this._scene.add(newObj);
    this.objCache.set(entity, newObj);
  }

  // ═══════════════════════════════════════════════════════════
  // Arrow geometry
  // ═══════════════════════════════════════════════════════════

  /** Color derivation for arrow parts (Desaturate rule). */
  private _arrowColors(base: number): { shaft: number; tip: number; dot: number } {
    const shaft = _desaturateHex(base, 0.30);
    const tip   = _lightenHex(base, 0.15);
    const dot   = _desaturateHex(base, 0.50);
    return { shaft, tip, dot };
  }

  private _makeArrow(from: Vec3, to: Vec3, colorHex: number, thickness: number, headless?: boolean): THREE.Group {
    const dir = new THREE.Vector3().subVectors(
      new THREE.Vector3(to[0], to[1], to[2]),
      new THREE.Vector3(from[0], from[1], from[2]),
    );
    const len = dir.length();
    if (len < 0.001) return new THREE.Group();

    const group = new THREE.Group();
    group.position.set(from[0], from[1], from[2]);

    const { shaft: shaftColor, tip: tipColor, dot: dotColor } = this._arrowColors(colorHex);

    // origin dot — subtle anchor at vector start
    const dotGeo = new THREE.SphereGeometry(thickness * 1.0, 8, 8);
    const dotMat = this._makeMaterial(dotColor);
    const dot = new THREE.Mesh(dotGeo, dotMat);
    group.add(dot);

    if (headless) {
      const lineGeo = new LineGeometry();
      lineGeo.setPositions([0, 0, 0, 0, len, 0]);
      const lineMat = this._makeLineMaterial(shaftColor, thickness * 0.7);
      const line = new Line2(lineGeo, lineMat);
      group.add(line);
    } else {
      const headLen = Math.min(
        Math.max(thickness * 8, 0.08),
        0.28,
        len * 0.35,
      );
      const shaftLen = len - headLen;
      const shaftGeo = new LineGeometry();
      shaftGeo.setPositions([0, 0, 0, 0, shaftLen, 0]);
      const shaftMat = this._makeLineMaterial(shaftColor, thickness);
      group.add(new Line2(shaftGeo, shaftMat));

      const coneGeo = new THREE.ConeGeometry(thickness * 1.65, headLen, 8);
      const coneMat = this._makeMaterial(tipColor);
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.y = shaftLen + headLen / 2;
      group.add(cone);
    }

    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0), dir.normalize(),
    );
    group.setRotationFromQuaternion(quat);
    return group;
  }

  // ═══════════════════════════════════════════════════════════
  // Axes group
  // ═══════════════════════════════════════════════════════════

  private _axisColor(axis: string): number {
    const map: Record<string, string> = { x: 'danger', y: 'info', z: 'accent' };
    return this._resolve(map[axis] ?? 'primary');
  }

  private _buildAxesGroup(length: number, symmetric: boolean, arrowSize: number, ticks: boolean, basis?: [Vec3,Vec3,Vec3] | null): THREE.Group {
    const group = new THREE.Group();
    const thick = arrowSize * 0.1;
    const B = basis;
    const î: Vec3 = B ? B[0] : [1,0,0];
    const ĵ: Vec3 = B ? B[1] : [0,0,1];
    const k̂: Vec3 = B ? B[2] : [0,1,0];
    const scale = (v: Vec3, s: number): Vec3 => [v[0]*s, v[1]*s, v[2]*s];
    const neg = (v: Vec3): Vec3 => [-v[0], -v[1], -v[2]];

    const pos: Array<[Vec3, string]> = [[scale(î, length), 'x'], [scale(ĵ, length), 'y'], [scale(k̂, length), 'z']];
    for (const [to, axis] of pos) {
      group.add(this._makeArrow([0,0,0], to, this._axisColor(axis), thick));
    }
    if (symmetric) {
      for (const [to, axis] of pos) {
        group.add(this._makeArrow([0,0,0], neg(to), this._axisColor(axis), thick, true));
      }
    }
    const lo = length + 0.5;
    group.add(this._makeAxisLabel('x', scale(î, lo), this._axisColor('x')));
    group.add(this._makeAxisLabel('y', scale(ĵ, lo), this._axisColor('y')));
    group.add(this._makeAxisLabel('z', scale(k̂, lo), this._axisColor('z')));

    if (ticks) {
      const tickLen = 0.12;
      const perpX: Vec3 = basis ? normalize3(cross3(ĵ, k̂)) : [0,0.12,0];
      const perpY: Vec3 = basis ? normalize3(cross3(k̂, î)) : [0.12,0,0];
      const perpZ: Vec3 = basis ? normalize3(cross3(î, ĵ)) : [0.12,0,0];
      const tickAxes: Array<{t:string; u:Vec3; perp:Vec3; loff:Vec3}> = [
        { t:'x', u:î, perp:perpX, loff:scale(normalize3(perpX), -0.25) },
        { t:'y', u:ĵ, perp:perpY, loff:scale(normalize3(perpY), -0.25) },
        { t:'z', u:k̂, perp:perpZ, loff:scale(normalize3(perpZ), -0.25) },
      ];
      for (const a of tickAxes) {
        for (let i = 1; i <= Math.floor(length); i++) {
          const cx = a.u[0]*i, cy = a.u[1]*i, cz = a.u[2]*i;
          const px = a.perp[0]*tickLen/2, py = a.perp[1]*tickLen/2, pz = a.perp[2]*tickLen/2;
          const tg = new LineGeometry();
          tg.setPositions([cx-px, cy-py, cz-pz, cx+px, cy+py, cz+pz]);
          const tm = this._makeLineMaterial(this._axisColor(a.t), 0.012);
          group.add(new Line2(tg, tm));
          group.add(this._makeTickLabel(String(i), this._axisColor(a.t), [cx+a.loff[0], cy+a.loff[1], cz+a.loff[2]]));
        }
      }
    }
    return group;
  }

  private _makeTickLabel(text: string, colorHex: number, pos: [number, number, number]): THREE.Sprite {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = `#${colorHex.toString(16).padStart(6, '0')}`;
    ctx.font = '38px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, size / 2, size / 2);
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(...pos);
    sprite.scale.setScalar(0.2);
    return sprite;
  }

  private _makeAxisLabel(text: string, pos: [number, number, number], colorHex: number): THREE.Sprite {
    const size = 96;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = `#${colorHex.toString(16).padStart(6, '0')}`;
    ctx.font = 'bold 52px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, size / 2, size / 2);
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(...pos);
    sprite.scale.setScalar(0.35);
    return sprite;
  }

  // ═══════════════════════════════════════════════════════════
  // Surface geometry
  // ═══════════════════════════════════════════════════════════

  private _buildSurfaceGeometry(p: SurfaceParams): THREE.BufferGeometry {
    const { fn, uMin, uMax, vMin, vMax, uSegments, vSegments } = p;
    const verts: number[] = [];
    const indices: number[] = [];
    const cols = vSegments + 1;

    for (let i = 0; i <= uSegments; i++) {
      const u = uMin + (uMax - uMin) * (i / uSegments);
      for (let j = 0; j <= vSegments; j++) {
        const v = vMin + (vMax - vMin) * (j / vSegments);
        const [x, y, z] = fn(u, v);
        verts.push(x, y, z);
      }
    }

    for (let i = 0; i < uSegments; i++) {
      for (let j = 0; j < vSegments; j++) {
        const a = i * cols + j;
        const b = a + cols;
        const c = a + 1;
        const d = b + 1;
        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  // ═══════════════════════════════════════════════════════════
  // Grid lines
  // ═══════════════════════════════════════════════════════════

  private _buildGridLines(plane: string, spacing: number, size: number, colorHex: number, basis?: [Vec3,Vec3,Vec3] | null): THREE.LineSegments {
    const half = size / 2;
    const points: THREE.Vector3[] = [];

    if (basis) {
      const î = basis[0], ĵ = basis[1], k̂ = basis[2];
      const positions: number[] = [];
      for (let p = -half; p <= half + spacing * 0.001; p += spacing) {
        positions.push(p > half ? half : p);
      }
      if (positions.length > 1 && positions[positions.length - 1] === positions[positions.length - 2]) {
        positions.pop();
      }
      for (const sa of positions) {
        for (const sb of positions) {
          const sk = [î[0]*sa + ĵ[0]*sb, î[1]*sa + ĵ[1]*sb, î[2]*sa + ĵ[2]*sb] as Vec3;
          points.push(
            new THREE.Vector3(sk[0]+k̂[0]*(-half), sk[1]+k̂[1]*(-half), sk[2]+k̂[2]*(-half)),
            new THREE.Vector3(sk[0]+k̂[0]*half,    sk[1]+k̂[1]*half,    sk[2]+k̂[2]*half),
          );
          const sj = [î[0]*sa + k̂[0]*sb, î[1]*sa + k̂[1]*sb, î[2]*sa + k̂[2]*sb] as Vec3;
          points.push(
            new THREE.Vector3(sj[0]+ĵ[0]*(-half), sj[1]+ĵ[1]*(-half), sj[2]+ĵ[2]*(-half)),
            new THREE.Vector3(sj[0]+ĵ[0]*half,    sj[1]+ĵ[1]*half,    sj[2]+ĵ[2]*half),
          );
          const si = [ĵ[0]*sa + k̂[0]*sb, ĵ[1]*sa + k̂[1]*sb, ĵ[2]*sa + k̂[2]*sb] as Vec3;
          points.push(
            new THREE.Vector3(si[0]+î[0]*(-half), si[1]+î[1]*(-half), si[2]+î[2]*(-half)),
            new THREE.Vector3(si[0]+î[0]*half,    si[1]+î[1]*half,    si[2]+î[2]*half),
          );
        }
      }
    } else {
      for (let i = -half; i <= half; i += spacing) {
        if (Math.abs(i) < 0.001) continue;
        if (plane === 'xz') {
          points.push(new THREE.Vector3(i, 0, -half), new THREE.Vector3(i, 0, half));
          points.push(new THREE.Vector3(-half, 0, i), new THREE.Vector3(half, 0, i));
        } else if (plane === 'xy') {
          points.push(new THREE.Vector3(i, -half, 0), new THREE.Vector3(i, half, 0));
          points.push(new THREE.Vector3(-half, i, 0), new THREE.Vector3(half, i, 0));
        } else if (plane === 'yz') {
          points.push(new THREE.Vector3(0, i, -half), new THREE.Vector3(0, i, half));
          points.push(new THREE.Vector3(0, -half, i), new THREE.Vector3(0, half, i));
        }
      }
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    return new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
      color: colorHex, transparent: true, opacity: this._mood.gridOpacity,
    }));
  }

  /** In-place vertex update for grid lattice — no rebuild when only basis changes. */
  private _syncGrid(obj: THREE.Object3D, params: GeometryParams): void {
    if (params.kind !== 'grid' || !(params as GridParams).basis) return;
    const mesh = obj as THREE.LineSegments;
    const posAttr = mesh.geometry.getAttribute('position');
    if (!posAttr) return;
    const posArr = posAttr.array as Float32Array;
    const basis = (params as GridParams).basis!;
    const î = basis[0], ĵ = basis[1], k̂ = basis[2];
    const half = params.size / 2;
    const spacing = params.spacing;
    const positions: number[] = [];
    for (let p = -half; p <= half + spacing * 0.001; p += spacing) {
      positions.push(p > half ? half : p);
    }
    if (positions.length > 1 && positions[positions.length - 1] === positions[positions.length - 2]) {
      positions.pop();
    }
    let pi = 0;
    for (const sa of positions) {
      for (const sb of positions) {
        const sk = [î[0]*sa+ĵ[0]*sb, î[1]*sa+ĵ[1]*sb, î[2]*sa+ĵ[2]*sb];
        posArr[pi++]=sk[0]+k̂[0]*(-half); posArr[pi++]=sk[1]+k̂[1]*(-half); posArr[pi++]=sk[2]+k̂[2]*(-half);
        posArr[pi++]=sk[0]+k̂[0]*half;     posArr[pi++]=sk[1]+k̂[1]*half;     posArr[pi++]=sk[2]+k̂[2]*half;
        const sj = [î[0]*sa+k̂[0]*sb, î[1]*sa+k̂[1]*sb, î[2]*sa+k̂[2]*sb];
        posArr[pi++]=sj[0]+ĵ[0]*(-half); posArr[pi++]=sj[1]+ĵ[1]*(-half); posArr[pi++]=sj[2]+ĵ[2]*(-half);
        posArr[pi++]=sj[0]+ĵ[0]*half;     posArr[pi++]=sj[1]+ĵ[1]*half;     posArr[pi++]=sj[2]+ĵ[2]*half;
        const si = [ĵ[0]*sa+k̂[0]*sb, ĵ[1]*sa+k̂[1]*sb, ĵ[2]*sa+k̂[2]*sb];
        posArr[pi++]=si[0]+î[0]*(-half); posArr[pi++]=si[1]+î[1]*(-half); posArr[pi++]=si[2]+î[2]*(-half);
        posArr[pi++]=si[0]+î[0]*half;     posArr[pi++]=si[1]+î[1]*half;     posArr[pi++]=si[2]+î[2]*half;
      }
    }
    posAttr.needsUpdate = true;
  }
}

// ═══════════════════════════════════════════════════════════
// disposeTree — recursive GPU resource disposal
// ═══════════════════════════════════════════════════════════

export function disposeTree(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const raw = mesh.material ?? (child as THREE.Line).material;
    const materials = Array.isArray(raw) ? raw : [raw];
    for (const m of materials) {
      if (!m) continue;
      m.dispose();
      const tex = (m as unknown as { map?: THREE.Texture }).map;
      if (tex) tex.dispose();
    }
  });
}
