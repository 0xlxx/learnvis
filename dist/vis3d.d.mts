import * as THREE from "three/webgpu";

//#region packages/ecs/src/index.d.ts
/** 3D vector tuple. */
type Vec3 = [number, number, number];
declare const EntityBrand: unique symbol;
/** Opaque entity handle — branded number, constructable only via World.spawn(). */
type Entity = number & {
  [EntityBrand]: true;
};
type GeometryKind = 'arrow' | 'sphere' | 'cube' | 'sprite' | 'grid' | 'axes' | 'line' | 'surface' | 'fill' | 'arc' | 'rightAngle';
/** Material role — each primitive declares how its materials should be treated. */
type MaterialRoleKind = 'structural' | 'fill';
/**
 * Component kind — string union.
 * Each member maps to a data shape in ComponentSchemas.
 * Used as discriminant in the Component union type.
 */
type ComponentKind = 'position3' | 'geometry' | 'appearance' | 'label' | 'thickness' | 'size' | 'userId' | 'materialRole' | 'opacityOverride';
/**
 * Component data schemas — one entry per ComponentKind.
 * Declared as interface so users can augment via declaration merging.
 *
 * ```ts
 * declare module 'vis3d/ecs' {
 *   interface ComponentSchemas {
 *     velocity: { vx: number; vy: number; vz: number };
 *   }
 * }
 * ```
 */
interface ComponentSchemas {
  position3: {
    x: number;
    y: number;
    z: number;
  };
  geometry: {
    kind: GeometryKind;
  } & Record<string, unknown>;
  appearance: {
    color: number;
    opacity: number;
    wireframe: boolean;
    emissive: number;
  };
  label: {
    text: string;
    offset: Vec3;
  };
  thickness: {
    value: number;
  };
  size: {
    value: number;
  };
  userId: {
    value: string;
  };
  materialRole: {
    kind: MaterialRoleKind;
    opacity: number;
  };
  opacityOverride: {
    value: number;
  };
}
/**
 * Full discriminated-union component type.
 * Component = { type: 'position3'; x; y; z } | { type: 'geometry'; kind; ... } | ...
 */
type Component = { [K in ComponentKind]: {
  type: K;
} & ComponentSchemas[K] }[ComponentKind];
/** Extract the specific component shape for a given kind. */
type ComponentOf<K extends ComponentKind> = Extract<Component, {
  type: K;
}>;
/** Extract the data payload (without the `type` discriminant) for a given kind. */
type DataOf<K extends ComponentKind> = ComponentSchemas[K];
/**
 * A System reads components from the World and produces side effects.
 *
 * ```ts
 * const mySystem: System = {
 *   name: 'physics',
 *   requiredComponents: ['position3'],
 *   update(world, context) { ... },
 * };
 * ```
 */
interface System {
  /** Human-readable name (for debugging / devtools). */
  readonly name: string;
  /** Component kinds this system depends on (for future tooling). */
  readonly requiredComponents: readonly ComponentKind[];
  /**
   * Called every frame by World.update().
   * @param world  The ECS world (read/write components, query entities).
   * @param context  Opaque context passed through from World.update(context).
   */
  update(world: World, context: unknown): void;
}
declare class World {
  private _stores;
  private _alive;
  private _userIdIndex;
  private _systems;
  /** Create a new empty entity. Returns opaque handle. */
  spawn(): Entity;
  /** Mark an entity as destroyed. Its components are cleaned up on next World.update(). */
  destroy(entity: Entity): void;
  /** Returns true if the entity is still alive. */
  isAlive(entity: Entity): boolean;
  /**
   * Attach a component to an entity.
   * Throws if the entity already has a component of this kind — use setComponent for upsert.
   */
  addComponent<K extends ComponentKind>(entity: Entity, component: ComponentOf<K>): void;
  /** Attach or replace a component on an entity. */
  setComponent<K extends ComponentKind>(entity: Entity, component: ComponentOf<K>): void;
  /**
   * Partial update: reads existing component, merges `patch`, writes back.
   * If the component doesn't exist yet, it's created from defaults + patch.
   * This is the primary API for Gfx3dImpl chain methods.
   */
  patchComponent<K extends ComponentKind>(entity: Entity, kind: K, patch: Partial<DataOf<K>>): void;
  /** Get a component by kind. Returns undefined if absent. */
  getComponent<K extends ComponentKind>(entity: Entity, kind: K): ComponentOf<K> | undefined;
  /** Check whether an entity has a component of the given kind. */
  hasComponent(entity: Entity, kind: ComponentKind): boolean;
  /** Remove a component from an entity. */
  removeComponent(entity: Entity, kind: ComponentKind): void;
  /**
   * Find all entities that have ALL the specified component kinds.
   * Returns an empty array if any kind has no store.
   */
  query(...kinds: ComponentKind[]): Entity[];
  /** Find an entity by its userId component value. */
  entityByUserId(id: string): Entity | undefined;
  /** Register a system. Systems run in registration order on each World.update() call. */
  addSystem(system: System): void;
  /**
   * Run all registered systems in order.
   * @param context  Passed through to every System.update() call.
   */
  update(context: unknown): void;
}
//#endregion
//#region vis3d/mood.d.ts
/** Visual style preset for a specific age group / aesthetic. */
interface MoodContext {
  readonly name: string;
  /** Standard material roughness (0=glossy, 1=matte). */
  readonly roughness: number;
  /** Standard material metalness (0=non-metallic). */
  readonly metalness: number;
  /** If set, use MeshToonMaterial with this many tone bands instead of MeshStandardMaterial. */
  readonly toonBands?: number;
  /** CSS label styling. */
  readonly label: {
    readonly font: string;
    readonly color: string;
    readonly shadow: string;
  };
  /** Grid line opacity. */
  readonly gridOpacity: number;
}
declare const MOODS: Record<string, MoodContext>;
/** Resolve mood name to MoodContext. Falls back to 'clean'. */
declare function resolveMood(name?: string): MoodContext;
//#endregion
//#region vis3d/types.d.ts
type Mat3 = [number, number, number, number, number, number, number, number, number];
interface Box3 {
  min: Vec3;
  max: Vec3;
}
/** Parametric surface: f(u, v) → [x, y, z] */
type SurfaceFn = (u: number, v: number) => Vec3;
/** Spatial sampler: f(x, y, z) → scalar value (for field visualization) */
type FieldSampler = (x: number, y: number, z: number) => number;
interface Gfx3d {
  color(c: string): Gfx3d;
  opacity(v: number): Gfx3d;
  size(n: number | 'tiny' | 'small' | 'medium' | 'large'): Gfx3d;
  thickness(n: number | 'hair' | 'thin' | 'medium' | 'bold'): Gfx3d;
  wireframe(): Gfx3d;
  emissive(c: string): Gfx3d;
  label(t: string, offset?: Vec3): Gfx3d;
  move(x: number, y: number, z: number): Gfx3d;
  pos(): Vec3;
  translate(dx: number, dy: number, dz: number): Gfx3d;
  rotateX(rad: number): Gfx3d;
  rotateY(rad: number): Gfx3d;
  rotateZ(rad: number): Gfx3d;
  rotateAxis(axis: Vec3, rad: number): Gfx3d;
  scale(sx: number, sy?: number, sz?: number): Gfx3d;
  matrix3(m: Mat3): Gfx3d;
  readonly object3d: any;
}
interface Canvas3dOpts {
  theme?: string;
  /** Visual style preset for different age groups / aesthetics. Default: 'clean'. */
  mood?: 'playful' | 'clean' | 'minimal' | 'sketch';
  width?: number;
  height?: number;
  dpr?: number;
  /** Background color override (hex or semantic name). Default: theme bg. */
  background?: string;
  /** Camera projection. Default: 'orthographic'. */
  projection?: 'orthographic' | 'perspective';
}
interface Axes3dOpts {
  length?: number;
  arrowSize?: number;
  /** Show negative half-axes. Default: true. */
  symmetric?: boolean;
  /** Show numbered tick marks at integer positions. Default: false. */
  ticks?: boolean;
  /**
   * Basis vectors [î, ĵ, k̂]. When set, axes follow these directions
   * instead of the standard textbook basis (x=right, y=depth, z=up).
   * Each vector is in Three.js world coordinates [x, y, z].
   */
  basis?: [Vec3, Vec3, Vec3];
}
interface Grid3dOpts {
  /** Custom entity id. Default: '::grid3d'. Use to create multiple independent grids. */
  id?: string;
  plane?: 'xz' | 'xy' | 'yz';
  spacing?: number;
  size?: number;
  /** Color override (semantic name). Default: 'dim'. */
  color?: string;
  /**
   * Basis vectors [î, ĵ, k̂]. When set, the grid is drawn on the plane
   * spanned by the first two basis vectors (î-ĵ plane), with lines
   * parallel to each basis direction.
   */
  basis?: [Vec3, Vec3, Vec3];
}
interface Surface3dOpts {
  /** Number of sample segments in the u direction. Default: 32. */
  uSegments?: number;
  /** Number of sample segments in the v direction. Default: 32. */
  vSegments?: number;
  /** Face color (semantic name or hex). Default: 'primary'. */
  color?: string;
  /** Rendering style preset. Default: 'wireframe-face'. */
  style?: 'wireframe-face' | 'height-color' | 'minimal';
}
interface Frame3dOpts {
  /** How far the reference frame extends from origin. Axes length = extent, grid spans [-extent, extent]. Default: 4. */
  extent?: number;
  /** Basis vectors [î, ĵ, k̂]. When set, axes and grid follow these directions. */
  basis?: [Vec3, Vec3, Vec3];
}
interface CameraConfig {
  position?: Vec3;
  target?: Vec3;
  fov?: number;
}
interface CameraAnimOpts {
  /** Transition duration in seconds. 0 = instant (default). */
  duration?: number;
  /** Easing function. Default: 'ease-out'. */
  easing?: 'ease-out' | 'ease-in-out' | 'linear';
}
interface ViewOpts {
  x?: [number, number];
  y?: [number, number];
  z?: [number, number];
}
interface LightDef {
  type: 'ambient' | 'directional' | 'point';
  intensity?: number;
  color?: string;
  position?: Vec3;
}
interface StepDef3d {
  frame(s: Scene3d): void;
  label?: string;
  title?: string;
  desc?: string;
}
interface StepsOptions3d {
  start?: number;
  mode?: 'full' | 'update';
  controls?: boolean;
}
/** 3D-specific steps controller (mirrors vis/types StepsController but with StepDef3d). */
interface StepsController3d {
  go(i: number): void;
  next(): void;
  prev(): void;
  reset(): void;
  readonly current: number;
  readonly total: number;
  readonly currentStepDef: StepDef3d | null;
  onChange(fn: (i: number, step: StepDef3d) => void): () => void;
  destroy(): void;
}
interface Scene3d {
  point(id: string, x: number, y: number, z: number): Gfx3d;
  line3d(id: string, from: Vec3, to: Vec3): Gfx3d;
  vector(id: string, from: Vec3, to: Vec3): Gfx3d;
  sphere(id: string, cx: number, cy: number, cz: number, r: number): Gfx3d;
  cube(id: string, cx: number, cy: number, cz: number, size: number): Gfx3d;
  surface(id: string, fn: SurfaceFn, uRange: [number, number], vRange: [number, number], opts?: Surface3dOpts): Gfx3d;
  fill(id: string, vertices: Vec3[]): Gfx3d;
  arc(id: string, center: Vec3, fromDir: Vec3, toDir: Vec3): Gfx3d;
  rightAngle(id: string, center: Vec3, dirA: Vec3, dirB: Vec3): Gfx3d;
  axes3d(opts?: Axes3dOpts): Gfx3d;
  grid3d(opts?: Grid3dOpts): Gfx3d;
  group(entities: Gfx3d[]): Gfx3d;
  /** One call to set up axes + grid with consistent sizing. axes3d()/grid3d() are the escape hatches. */
  frame3d(opts?: Frame3dOpts): void;
  camera(config: CameraConfig, opts?: CameraAnimOpts): void;
  view(opts: ViewOpts): void;
  render(fn: (s: Scene3d) => void): void;
  steps(defs: StepDef3d[], opts?: StepsOptions3d): StepsController3d;
  light(def: LightDef): void;
  /** Register a custom ECS System. Returns this for chaining. */
  use(system: System): this;
  readonly three: any;
  readonly camera3d: any;
  readonly renderer: any;
}
//#endregion
//#region vis3d/scene.d.ts
declare class Scene3dImpl implements Scene3d {
  private _boot;
  private _world;
  private _geometrySys;
  private _transformSys;
  private _materialSys;
  private _transitionSys;
  private _cleanupSys;
  private _cssLabel;
  private _toonGradient?;
  private _labelContainer;
  private _resolve;
  private _frameFn;
  private _onDispose;
  private _camAnim;
  private _store;
  private _touched;
  init(container: HTMLElement, opts?: Canvas3dOpts): Promise<void>;
  private _tickCameraAnim;
  private _upsert;
  /** After spawning an entity, create THREE object and bind to gfx for escape hatch. */
  private _register;
  /** Mark an entity as touched this frame — it survives the sweep. */
  private _touch;
  point(id: string, x: number, y: number, z: number): Gfx3d;
  line3d(id: string, from: Vec3, to: Vec3): Gfx3d;
  vector(id: string, from: Vec3, to: Vec3): Gfx3d;
  sphere(id: string, cx: number, cy: number, cz: number, r: number): Gfx3d;
  cube(id: string, cx: number, cy: number, cz: number, size: number): Gfx3d;
  fill(id: string, vertices: Vec3[]): Gfx3d;
  arc(id: string, center: Vec3, fromDir: Vec3, toDir: Vec3): Gfx3d;
  rightAngle(id: string, center: Vec3, dirA: Vec3, dirB: Vec3): Gfx3d;
  surface(id: string, fn: SurfaceFn, uRange: [number, number], vRange: [number, number], opts?: Surface3dOpts): Gfx3d;
  axes3d(opts?: Axes3dOpts): Gfx3d;
  grid3d(opts?: Grid3dOpts): Gfx3d;
  frame3d(opts?: Frame3dOpts): void;
  group(entities: Gfx3d[]): Gfx3d;
  camera(config: CameraConfig, opts?: CameraAnimOpts): void;
  view(opts: ViewOpts): void;
  render(fn: (s: Scene3d) => void): void;
  steps(defs: StepDef3d[], opts?: StepsOptions3d): StepsController3d;
  light(def: LightDef): void;
  use(system: System): this;
  get three(): THREE.Scene;
  get camera3d(): THREE.OrthographicCamera | THREE.PerspectiveCamera;
  get renderer(): THREE.WebGPURenderer;
  [Symbol.dispose](): void;
}
//#endregion
//#region vis3d/gfx.d.ts
type ColorResolver = (c: string) => number;
/**
 * Build a color resolver for 3D (THREE.js hex values).
 *
 * Token name → hex (direct lookup, same model as 2D).
 * Hex literal → number.
 * Fallback → primary.
 */
declare function createColorResolver(theme?: string): ColorResolver;
declare class Gfx3dImpl implements Gfx3d {
  private _world;
  private _entity;
  private _resolve;
  private _threeObj;
  constructor(world: World, entity: Entity, resolve: ColorResolver);
  /** Called by Scene3dImpl after ThreeSyncSystem creates the THREE object. */
  _bindThreeObject(obj: THREE.Object3D): void;
  /** Expose the underlying entity for internal use (e.g., same-id updates). */
  get _e(): Entity;
  get object3d(): THREE.Object3D | null;
  color(c: string): this;
  opacity(v: number): this;
  wireframe(): this;
  emissive(c: string): this;
  size(n: number | string): this;
  thickness(n: number | string): this;
  /** Resolve token → number, reading geometry kind from the entity for per-primitive scale. */
  private _resolveSize;
  label(t: string, offset?: Vec3): this;
  move(x: number, y: number, z: number): this;
  pos(): Vec3;
  translate(dx: number, dy: number, dz: number): this;
  rotateX(rad: number): this;
  rotateY(rad: number): this;
  rotateZ(rad: number): this;
  rotateAxis(axis: Vec3, rad: number): this;
  scale(sx: number, sy?: number, sz?: number): this;
  matrix3(m: Mat3): this;
}
//#endregion
//#region vis3d/motion.d.ts
declare function createStepsController3d(scene: Scene3d, defs: StepDef3d[], opts?: StepsOptions3d): StepsController3d;
//#endregion
//#region vis3d/systems/geometry.d.ts
declare class GeometrySystem implements System {
  readonly name = "geometry";
  readonly requiredComponents: readonly ["geometry"];
  readonly objCache: Map<Entity, THREE.Object3D<THREE.Object3DEventMap>>;
  private _scene;
  private _resolve;
  private _mood;
  private _toonGradient?;
  private _geoHash;
  private _gridStruct;
  private _sizeCache;
  private _thickCache;
  private _dirCache;
  constructor(scene: THREE.Scene, resolve: ColorResolver, mood: MoodContext, toonGradient?: THREE.Texture);
  update(world: World, _context: unknown): void;
  createAndRegister(entity: Entity, world: World): THREE.Object3D;
  disposeAll(): void;
  private _makeMaterial;
  private _buildThreeObject;
  private _syncSize;
  private _syncThickness;
  private _makeArrow;
  private _axisColor;
  private _buildAxesGroup;
  private _makeTickLabel;
  private _makeAxisLabel;
  private _buildSurfaceGeometry;
  private _buildGridLines;
  /** In-place vertex update for grid lattice — no rebuild when only basis changes. */
  private _syncGrid;
}
//#endregion
//#region vis3d/systems/transform.d.ts
declare class TransformSystem implements System {
  readonly name = "transform";
  readonly requiredComponents: readonly ["position3"];
  private _objCache;
  constructor(objCache: Map<Entity, THREE.Object3D>);
  update(world: World, _context: unknown): void;
}
//#endregion
//#region vis3d/systems/material.d.ts
declare class MaterialSystem implements System {
  readonly name = "material";
  readonly requiredComponents: readonly ["appearance"];
  private _objCache;
  private _mood;
  private _toonGradient?;
  private _appHash;
  constructor(objCache: Map<Entity, THREE.Object3D>, mood: MoodContext, toonGradient?: THREE.Texture);
  update(world: World, _context: unknown): void;
  /** Clear appearance cache (e.g., after theme change). */
  clearCache(): void;
}
//#endregion
//#region vis3d/systems/transition.d.ts
declare class TransitionSystem implements System {
  readonly name = "transition";
  readonly requiredComponents: readonly [];
  private _objCache;
  private _scene;
  private _entering;
  private _exiting;
  private readonly _transDur;
  constructor(objCache: Map<Entity, THREE.Object3D>, scene: THREE.Scene);
  private static _spring;
  update(world: World, _context: unknown): void;
  /** Cancel all active transitions instantly. */
  flush(world: World): void;
  /** Number of entities currently in enter/exit transition. */
  get activeCount(): number;
}
//#endregion
//#region vis3d/systems/cleanup.d.ts
declare class CleanupSystem implements System {
  readonly name = "cleanup";
  readonly requiredComponents: readonly [];
  private _objCache;
  private _scene;
  constructor(objCache: Map<Entity, THREE.Object3D>, scene: THREE.Scene);
  update(world: World, _context: unknown): void;
  /** Full teardown — dispose ALL cached objects. Call when renderer is stopped. */
  disposeAll(): void;
}
//#endregion
//#region vis3d/systems/css-label.d.ts
declare class CSSLabelSystem implements System {
  readonly name = "css-label";
  readonly requiredComponents: readonly ["position3", "label"];
  private _container;
  private _camera;
  private _elCache;
  private _textCache;
  constructor(container: HTMLElement, camera: THREE.OrthographicCamera | THREE.PerspectiveCamera, mood: MoodContext);
  update(world: World, _context: unknown): void;
  private _project;
  private _createElement;
  private _injectStyles;
  dispose(): void;
}
//#endregion
//#region vis3d/index.d.ts
/**
 * Create a 3D learnvis scene with a WebGPU renderer.
 *
 * ```ts
 * import { canvas3d } from 'vis3d';
 * const s = await canvas3d('#app', { theme: 'dark' });
 * s.render(() => {
 *   s.axes3d();
 *   s.grid3d();
 *   s.vector('v', [0,0,0], [2,1,0]).color('danger');
 * });
 * ```
 */
declare function canvas3d(selector: string | HTMLElement, opts?: Canvas3dOpts): Promise<Scene3d>;
//#endregion
export { type Axes3dOpts, type Box3, CSSLabelSystem, type CameraConfig, type Canvas3dOpts, CleanupSystem, type ColorResolver, type Component, type ComponentKind, type ComponentSchemas, type Entity, type FieldSampler, type Frame3dOpts, GeometrySystem, type Gfx3d, Gfx3dImpl, type Grid3dOpts, type LightDef, MOODS, type Mat3, MaterialSystem, type MoodContext, type Scene3d, Scene3dImpl, type StepDef3d, type StepsController3d, type StepsOptions3d, type Surface3dOpts, type SurfaceFn, type System, TransformSystem, TransitionSystem, type Vec3, type ViewOpts, World, canvas3d, createColorResolver, createStepsController3d, resolveMood };