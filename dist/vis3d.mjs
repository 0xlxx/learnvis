import { o as resolveSizeToken, s as oklchToHex, t as resolveTheme } from "./themes-BvF4fxWa.mjs";
import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Line2 } from "three/addons/lines/webgpu/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";

//#region packages/ecs/src/index.ts
let _nextRawId = 1;
function _createEntity() {
	return _nextRawId++;
}
/** Default data values used by patchComponent when a component doesn't exist yet. */
const DEFAULTS = {
	position3: {
		x: 0,
		y: 0,
		z: 0
	},
	geometry: { kind: "sprite" },
	appearance: {
		color: 14707512,
		opacity: 1,
		wireframe: false,
		emissive: 0
	},
	label: {
		text: "",
		offset: [
			0,
			.7,
			0
		]
	},
	thickness: { value: .06 },
	size: { value: 8 },
	userId: { value: "" },
	materialRole: {
		kind: "structural",
		opacity: 1
	},
	opacityOverride: { value: 1 }
};
var World = class {
	constructor() {
		this._stores = /* @__PURE__ */ new Map();
		this._alive = /* @__PURE__ */ new Set();
		this._userIdIndex = /* @__PURE__ */ new Map();
		this._systems = [];
	}
	/** Create a new empty entity. Returns opaque handle. */
	spawn() {
		const entity = _createEntity();
		this._alive.add(entity);
		return entity;
	}
	/** Mark an entity as destroyed. Its components are cleaned up on next World.update(). */
	destroy(entity) {
		if (!this._alive.has(entity)) return;
		this._alive.delete(entity);
		const userIdComp = this._stores.get("userId")?.get(entity);
		if (userIdComp) this._userIdIndex.delete(userIdComp.value);
		for (const store of this._stores.values()) store.delete(entity);
	}
	/** Returns true if the entity is still alive. */
	isAlive(entity) {
		return this._alive.has(entity);
	}
	/**
	* Attach a component to an entity.
	* Throws if the entity already has a component of this kind — use setComponent for upsert.
	*/
	addComponent(entity, component) {
		if (!this._alive.has(entity)) return;
		let store = this._stores.get(component.type);
		if (!store) {
			store = /* @__PURE__ */ new Map();
			this._stores.set(component.type, store);
		}
		if (store.has(entity)) throw new Error(`Entity ${entity} already has component '${component.type}'. Use setComponent() to replace.`);
		store.set(entity, component);
		if (component.type === "userId") {
			const c = component;
			this._userIdIndex.set(c.value, entity);
		}
	}
	/** Attach or replace a component on an entity. */
	setComponent(entity, component) {
		if (!this._alive.has(entity)) return;
		let store = this._stores.get(component.type);
		if (!store) {
			store = /* @__PURE__ */ new Map();
			this._stores.set(component.type, store);
		}
		if (component.type === "userId") {
			const old = store.get(entity);
			if (old) this._userIdIndex.delete(old.value);
		}
		store.set(entity, component);
		if (component.type === "userId") {
			const c = component;
			this._userIdIndex.set(c.value, entity);
		}
	}
	/**
	* Partial update: reads existing component, merges `patch`, writes back.
	* If the component doesn't exist yet, it's created from defaults + patch.
	* This is the primary API for Gfx3dImpl chain methods.
	*/
	patchComponent(entity, kind, patch) {
		if (!this._alive.has(entity)) return;
		const existing = this.getComponent(entity, kind);
		if (existing) {
			const merged = {
				...existing,
				...patch
			};
			this.setComponent(entity, merged);
		} else {
			const merged = {
				...DEFAULTS[kind],
				...patch
			};
			this.setComponent(entity, {
				type: kind,
				...merged
			});
		}
	}
	/** Get a component by kind. Returns undefined if absent. */
	getComponent(entity, kind) {
		const store = this._stores.get(kind);
		if (!store) return void 0;
		return store.get(entity);
	}
	/** Check whether an entity has a component of the given kind. */
	hasComponent(entity, kind) {
		const store = this._stores.get(kind);
		return store ? store.has(entity) : false;
	}
	/** Remove a component from an entity. */
	removeComponent(entity, kind) {
		const store = this._stores.get(kind);
		if (!store) return;
		if (kind === "userId") {
			const old = store.get(entity);
			if (old) this._userIdIndex.delete(old.value);
		}
		store.delete(entity);
	}
	/**
	* Find all entities that have ALL the specified component kinds.
	* Returns an empty array if any kind has no store.
	*/
	query(...kinds) {
		if (kinds.length === 0) return [];
		const first = this._stores.get(kinds[0]);
		if (!first || first.size === 0) return [];
		const candidates = [...first.keys()].filter((e) => this._alive.has(e));
		if (kinds.length === 1) return candidates;
		return candidates.filter((e) => {
			for (let i = 1; i < kinds.length; i++) {
				const store = this._stores.get(kinds[i]);
				if (!store || !store.has(e)) return false;
			}
			return true;
		});
	}
	/** Find an entity by its userId component value. */
	entityByUserId(id) {
		return this._userIdIndex.get(id);
	}
	/** Register a system. Systems run in registration order on each World.update() call. */
	addSystem(system) {
		this._systems.push(system);
	}
	/**
	* Run all registered systems in order.
	* @param context  Passed through to every System.update() call.
	*/
	update(context) {
		for (const sys of this._systems) sys.update(this, context);
	}
};

//#endregion
//#region vis3d/mood.ts
const MOODS = {
	playful: {
		name: "playful",
		roughness: .5,
		metalness: 0,
		toonBands: 3,
		label: {
			font: "bold 26px system-ui, -apple-system, sans-serif",
			color: "#2d1f10",
			shadow: "0 1px 4px rgba(255,255,255,0.6)"
		},
		gridOpacity: .35
	},
	clean: {
		name: "clean",
		roughness: .7,
		metalness: 0,
		label: {
			font: "22px system-ui, -apple-system, sans-serif",
			color: "#1a1a1a",
			shadow: "0 0 3px rgba(255,255,255,0.9), 0 0 6px rgba(255,255,255,0.5)"
		},
		gridOpacity: .35
	},
	minimal: {
		name: "minimal",
		roughness: .85,
		metalness: 0,
		label: {
			font: "20px \"Georgia\", \"Times New Roman\", serif",
			color: "#1a1a1a",
			shadow: "none"
		},
		gridOpacity: .28
	},
	sketch: {
		name: "sketch",
		roughness: .4,
		metalness: 0,
		toonBands: 2,
		label: {
			font: "italic 22px \"Klee\", \"Comic Sans MS\", cursive",
			color: "#f0f0e0",
			shadow: "0 0 8px rgba(240,240,224,0.4)"
		},
		gridOpacity: .3
	}
};
/** Resolve mood name to MoodContext. Falls back to 'clean'. */
function resolveMood(name) {
	return MOODS[name ?? "clean"] ?? MOODS.clean;
}

//#endregion
//#region vis3d/bootstrap.ts
/** Compute scene background from theme. Uses dim.bg as base. */
function themeBackground(theme) {
	const oklch = resolveTheme(theme ?? "dark").palette.dim?.bg ?? "oklch(0.22 0.01 260)";
	return parseInt(oklchToHex(oklch).slice(1), 16);
}
/** Mood-aware lighting setup. Replaces hardcoded ambient+directional. */
function setupLighting(scene, mood) {
	switch (mood) {
		case "playful":
			scene.add(new THREE.AmbientLight(16775408, .8));
			{
				const k = new THREE.DirectionalLight(16774632, 2.2);
				k.position.set(3, 5, 6);
				scene.add(k);
			}
			break;
		case "clean":
			scene.add(new THREE.AmbientLight(16777215, .5));
			{
				const k = new THREE.DirectionalLight(16777215, 2);
				k.position.set(5, 8, 5);
				scene.add(k);
			}
			{
				const f = new THREE.DirectionalLight(15263999, .8);
				f.position.set(-3, 2, -3);
				scene.add(f);
			}
			break;
		case "minimal":
			scene.add(new THREE.AmbientLight(16777215, .4));
			{
				const k = new THREE.DirectionalLight(16775925, 1.8);
				k.position.set(4, 6, 4);
				scene.add(k);
			}
			break;
		case "sketch":
			scene.add(new THREE.AmbientLight(2241314, .3));
			{
				const k = new THREE.DirectionalLight(16777200, 1.6);
				k.position.set(-4, 6, 3);
				scene.add(k);
			}
			break;
		default:
			scene.add(new THREE.AmbientLight(16777215, .5));
			{
				const k = new THREE.DirectionalLight(16777215, 2);
				k.position.set(5, 8, 5);
				scene.add(k);
			}
			{
				const f = new THREE.DirectionalLight(15263999, .8);
				f.position.set(-3, 2, -3);
				scene.add(f);
			}
	}
}
async function bootstrap3d(container, opts = {}) {
	const W = opts.width ?? container.clientWidth;
	const H = opts.height ?? container.clientHeight;
	const mood = resolveMood(opts.mood);
	const renderer = new THREE.WebGPURenderer({ antialias: true });
	renderer.setSize(W, H);
	renderer.setPixelRatio(opts.dpr ?? Math.min(window.devicePixelRatio, 2));
	container.appendChild(renderer.domElement);
	await renderer.init();
	const scene = new THREE.Scene();
	const bgHex = opts.background ? parseInt(opts.background.startsWith("#") ? opts.background.slice(1) : opts.background, 16) : themeBackground(opts.theme ?? opts.mood);
	scene.background = new THREE.Color(bgHex);
	const projection = opts.projection ?? "orthographic";
	const frustumSize = 6;
	const aspect = W / H;
	const camera = projection === "perspective" ? new THREE.PerspectiveCamera(50, aspect, .1, 100) : new THREE.OrthographicCamera(frustumSize * aspect / -2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / -2, .1, 100);
	camera.position.set(5, 3, 5);
	camera.lookAt(0, 0, 0);
	const controls = new OrbitControls(camera, renderer.domElement);
	controls.enableDamping = true;
	controls.dampingFactor = .08;
	controls.target.set(0, 0, 0);
	setupLighting(scene, opts.mood ?? "clean");
	const isPersp = projection === "perspective";
	const onResize = () => {
		const w = container.clientWidth;
		const h = container.clientHeight;
		const a = w / h;
		if (isPersp) camera.aspect = a;
		else {
			const oc = camera;
			oc.left = frustumSize * a / -2;
			oc.right = frustumSize * a / 2;
			oc.top = frustumSize / 2;
			oc.bottom = frustumSize / -2;
		}
		camera.updateProjectionMatrix();
		renderer.setSize(w, h);
	};
	window.addEventListener("resize", onResize);
	const dispose = () => {
		window.removeEventListener("resize", onResize);
		controls.dispose();
		renderer.dispose();
		container.removeChild(renderer.domElement);
	};
	return {
		renderer,
		scene,
		camera,
		controls,
		mood,
		dispose
	};
}

//#endregion
//#region vis3d/gfx.ts
/**
* Build a color resolver for 3D (THREE.js hex values).
*
* Token name → hex (direct lookup, same model as 2D).
* Hex literal → number.
* Fallback → primary.
*/
function createColorResolver(theme) {
	const t = resolveTheme(theme ?? "warm");
	const lut = {};
	for (const [key, val] of Object.entries(t.palette)) lut[key] = parseInt(oklchToHex(val.fg).slice(1), 16);
	lut.dim = lut.muted;
	return (c) => {
		if (lut[c] !== void 0) return lut[c];
		if (c.startsWith("#")) return parseInt(c.slice(1), 16);
		return lut.primary;
	};
}
var Gfx3dImpl = class {
	constructor(world, entity, resolve) {
		this._threeObj = null;
		this._world = world;
		this._entity = entity;
		this._resolve = resolve;
	}
	/** Called by Scene3dImpl after ThreeSyncSystem creates the THREE object. */
	_bindThreeObject(obj) {
		this._threeObj = obj;
	}
	/** Expose the underlying entity for internal use (e.g., same-id updates). */
	get _e() {
		return this._entity;
	}
	get object3d() {
		return this._threeObj;
	}
	color(c) {
		this._world.patchComponent(this._entity, "appearance", { color: this._resolve(c) });
		return this;
	}
	opacity(v) {
		this._world.patchComponent(this._entity, "appearance", { opacity: v });
		return this;
	}
	wireframe() {
		this._world.patchComponent(this._entity, "appearance", { wireframe: true });
		return this;
	}
	emissive(c) {
		this._world.patchComponent(this._entity, "appearance", { emissive: this._resolve(c) });
		return this;
	}
	size(n) {
		this._world.patchComponent(this._entity, "size", { value: this._resolveSize(n, "size") });
		return this;
	}
	thickness(n) {
		this._world.patchComponent(this._entity, "thickness", { value: this._resolveSize(n, "thickness") });
		return this;
	}
	/** Resolve token → number, reading geometry kind from the entity for per-primitive scale. */
	_resolveSize(n, dim) {
		if (typeof n === "number") return n;
		const kind = this._world.getComponent(this._entity, "geometry")?.kind;
		return resolveSizeToken(n, dim, kind);
	}
	label(t, offset) {
		this._world.patchComponent(this._entity, "label", {
			text: t,
			offset: offset ?? [
				0,
				.7,
				0
			]
		});
		return this;
	}
	move(x, y, z) {
		this._world.patchComponent(this._entity, "position3", {
			x,
			y,
			z
		});
		return this;
	}
	pos() {
		const p = this._world.getComponent(this._entity, "position3");
		return p ? [
			p.x,
			p.y,
			p.z
		] : [
			0,
			0,
			0
		];
	}
	translate(dx, dy, dz) {
		const pos = this._world.getComponent(this._entity, "position3");
		if (pos) this._world.setComponent(this._entity, {
			type: "position3",
			x: pos.x + dx,
			y: pos.y + dy,
			z: pos.z + dz
		});
		return this;
	}
	rotateX(rad) {
		if (this._threeObj) this._threeObj.rotation.x += rad;
		return this;
	}
	rotateY(rad) {
		if (this._threeObj) this._threeObj.rotation.y += rad;
		return this;
	}
	rotateZ(rad) {
		if (this._threeObj) this._threeObj.rotation.z += rad;
		return this;
	}
	rotateAxis(axis, rad) {
		if (!this._threeObj) return this;
		const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(...axis).normalize(), rad);
		this._threeObj.quaternion.premultiply(q);
		return this;
	}
	scale(sx, sy = sx, sz = sx) {
		if (this._threeObj) this._threeObj.scale.set(sx, sy, sz);
		return this;
	}
	matrix3(m) {
		if (!this._threeObj) return this;
		const [a, b, c, d, e, f, g, h, i] = m;
		const mx = new THREE.Matrix4();
		mx.set(a, b, c, 0, d, e, f, 0, g, h, i, 0, 0, 0, 0, 1);
		this._threeObj.applyMatrix4(mx);
		return this;
	}
};

//#endregion
//#region vis3d/systems/geometry.ts
const cross3 = (a, b) => [
	a[1] * b[2] - a[2] * b[1],
	a[2] * b[0] - a[0] * b[2],
	a[0] * b[1] - a[1] * b[0]
];
const len3 = (v) => Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
const normalize3 = (v) => {
	const l = len3(v);
	return l < 1e-9 ? [
		0,
		0,
		0
	] : [
		v[0] / l,
		v[1] / l,
		v[2] / l
	];
};
var GeometrySystem = class {
	constructor(scene, resolve, mood, toonGradient) {
		this.name = "geometry";
		this.requiredComponents = ["geometry"];
		this.objCache = /* @__PURE__ */ new Map();
		this._geoHash = /* @__PURE__ */ new Map();
		this._gridStruct = /* @__PURE__ */ new Map();
		this._sizeCache = /* @__PURE__ */ new Map();
		this._thickCache = /* @__PURE__ */ new Map();
		this._dirCache = /* @__PURE__ */ new Map();
		this._scene = scene;
		this._resolve = resolve;
		this._mood = mood;
		this._toonGradient = toonGradient;
	}
	update(world, _context) {
		const entities = world.query("geometry");
		for (const entity of entities) {
			let obj = this.objCache.get(entity);
			const geo = world.getComponent(entity, "geometry");
			const geoKey = JSON.stringify(geo);
			if (obj && this._geoHash.get(entity) !== geoKey) {
				const gp = geo;
				if (gp.kind !== "grid") {
					this._scene.remove(obj);
					this.objCache.delete(entity);
					obj = void 0;
				} else {
					const g = gp;
					const structKey = `grid:${g.plane}:${g.spacing}:${g.size}`;
					if (this._gridStruct.get(entity) !== structKey) {
						this._scene.remove(obj);
						this.objCache.delete(entity);
						obj = void 0;
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
			}
			const size = world.getComponent(entity, "size");
			if (size) this._syncSize(entity, obj, size);
			const thick = world.getComponent(entity, "thickness");
			if (thick) this._syncThickness(entity, obj, world, geo, thick);
			if (geo.kind === "grid") this._syncGrid(obj, geo);
		}
	}
	createAndRegister(entity, world) {
		const cached = this.objCache.get(entity);
		if (cached) return cached;
		const obj = this._buildThreeObject(entity, world);
		if (!obj) throw new Error(`GeometrySystem: cannot build THREE object for entity ${entity}`);
		this.objCache.set(entity, obj);
		this._scene.add(obj);
		return obj;
	}
	disposeAll() {
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
	}
	_makeMaterial(color, opts) {
		if (this._mood.toonBands !== void 0) return new THREE.MeshToonMaterial({
			color,
			gradientMap: this._toonGradient ?? null,
			transparent: opts?.transparent ?? false,
			opacity: opts?.opacity ?? 1,
			depthWrite: !opts?.transparent,
			side: opts?.side ?? THREE.FrontSide
		});
		return new THREE.MeshStandardMaterial({
			color,
			roughness: this._mood.roughness,
			metalness: this._mood.metalness,
			transparent: opts?.transparent ?? false,
			opacity: opts?.opacity ?? 1,
			side: opts?.side ?? THREE.FrontSide
		});
	}
	_buildThreeObject(entity, world) {
		const geoComp = world.getComponent(entity, "geometry");
		const app = world.getComponent(entity, "appearance");
		if (!geoComp || !app) return null;
		const geo = geoComp;
		const role = world.getComponent(entity, "materialRole");
		switch (geo.kind) {
			case "sphere": {
				const g = new THREE.SphereGeometry(geo.radius, 48, 32);
				const m = this._makeMaterial(app.color);
				this._sizeCache.set(entity, geo.radius);
				return new THREE.Mesh(g, m);
			}
			case "cube": {
				const box = new THREE.BoxGeometry(geo.size, geo.size, geo.size);
				const edges = new THREE.EdgesGeometry(box);
				const wire = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: app.color }));
				const faceOpacity = role?.opacity ?? .18;
				const face = new THREE.Mesh(box, this._makeMaterial(app.color, {
					transparent: true,
					opacity: faceOpacity,
					side: THREE.DoubleSide
				}));
				face.userData.lvRole = "fill";
				const group = new THREE.Group();
				group.add(wire);
				group.add(face);
				this._sizeCache.set(entity, geo.size);
				return group;
			}
			case "rightAngle": {
				const rp = geo;
				const nA = (() => {
					const l = Math.sqrt(rp.dirAX * rp.dirAX + rp.dirAY * rp.dirAY + rp.dirAZ * rp.dirAZ);
					return l < 1e-9 ? [
						0,
						0,
						0
					] : [
						rp.dirAX / l,
						rp.dirAY / l,
						rp.dirAZ / l
					];
				})();
				const nB = (() => {
					const l = Math.sqrt(rp.dirBX * rp.dirBX + rp.dirBY * rp.dirBY + rp.dirBZ * rp.dirBZ);
					return l < 1e-9 ? [
						0,
						0,
						0
					] : [
						rp.dirBX / l,
						rp.dirBY / l,
						rp.dirBZ / l
					];
				})();
				const s = rp.size;
				const a = [
					nA[0] * s,
					nA[1] * s,
					nA[2] * s
				];
				const ab = [
					nA[0] * s + nB[0] * s,
					nA[1] * s + nB[1] * s,
					nA[2] * s + nB[2] * s
				];
				const b = [
					nB[0] * s,
					nB[1] * s,
					nB[2] * s
				];
				const verts2 = [
					a[0],
					a[1],
					a[2],
					ab[0],
					ab[1],
					ab[2],
					ab[0],
					ab[1],
					ab[2],
					b[0],
					b[1],
					b[2]
				];
				const geo2 = new THREE.BufferGeometry();
				geo2.setAttribute("position", new THREE.Float32BufferAttribute(verts2, 3));
				return new THREE.LineSegments(geo2, new THREE.LineBasicMaterial({ color: app.color }));
			}
			case "arc": {
				const ap = geo;
				const norm = (v) => {
					const l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
					return l < 1e-9 ? [
						0,
						0,
						0
					] : [
						v[0] / l,
						v[1] / l,
						v[2] / l
					];
				};
				const fromN = norm([
					ap.fromX,
					ap.fromY,
					ap.fromZ
				]);
				const toN = norm([
					ap.toX,
					ap.toY,
					ap.toZ
				]);
				const segs = 24;
				const verts = [
					0,
					0,
					0
				];
				for (let i = 0; i <= segs; i++) {
					const t = i / segs;
					const d = norm([
						fromN[0] * (1 - t) + toN[0] * t,
						fromN[1] * (1 - t) + toN[1] * t,
						fromN[2] * (1 - t) + toN[2] * t
					]);
					verts.push(d[0] * ap.radius, d[1] * ap.radius, d[2] * ap.radius);
				}
				const geo3 = new THREE.BufferGeometry();
				geo3.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
				const indices = [];
				for (let i = 0; i < segs; i++) indices.push(0, i + 1, i + 2);
				geo3.setIndex(indices);
				geo3.computeVertexNormals();
				const fanOpacity = role?.opacity ?? .15;
				const fanMat = this._makeMaterial(app.color, {
					transparent: true,
					opacity: fanOpacity,
					side: THREE.DoubleSide
				});
				fanMat.depthWrite = false;
				const fan = new THREE.Mesh(geo3, fanMat);
				fan.userData.lvRole = "fill";
				const arcPts = verts.slice(3);
				const rGeo = new THREE.BufferGeometry().setFromPoints([
					new THREE.Vector3(0, 0, 0),
					new THREE.Vector3(fromN[0] * ap.radius, fromN[1] * ap.radius, fromN[2] * ap.radius),
					new THREE.Vector3(0, 0, 0),
					new THREE.Vector3(toN[0] * ap.radius, toN[1] * ap.radius, toN[2] * ap.radius)
				]);
				const rLine = new THREE.LineSegments(rGeo, new THREE.LineBasicMaterial({ color: app.color }));
				rLine.userData.lvRole = "structural";
				const arcVerts = [];
				for (let i = 0; i < segs; i++) {
					arcVerts.push(arcPts[i * 3], arcPts[i * 3 + 1], arcPts[i * 3 + 2]);
					arcVerts.push(arcPts[(i + 1) * 3], arcPts[(i + 1) * 3 + 1], arcPts[(i + 1) * 3 + 2]);
				}
				const arcGeo2 = new THREE.BufferGeometry();
				arcGeo2.setAttribute("position", new THREE.Float32BufferAttribute(arcVerts, 3));
				const arcLine = new THREE.LineSegments(arcGeo2, new THREE.LineBasicMaterial({ color: app.color }));
				arcLine.userData.lvRole = "structural";
				const group = new THREE.Group();
				group.add(fan);
				group.add(rLine);
				group.add(arcLine);
				return group;
			}
			case "fill": {
				const fp = geo;
				const geo3 = new THREE.BufferGeometry();
				geo3.setAttribute("position", new THREE.Float32BufferAttribute(fp.vertices, 3));
				const indices = [];
				for (let i = 1; i < fp.count - 1; i++) indices.push(0, i, i + 1);
				geo3.setIndex(indices);
				geo3.computeVertexNormals();
				const fillOpacity = role?.opacity ?? .12;
				const mat = this._makeMaterial(app.color, {
					transparent: true,
					opacity: fillOpacity,
					side: THREE.DoubleSide
				});
				mat.depthWrite = false;
				const mesh = new THREE.Mesh(geo3, mat);
				mesh.userData.lvRole = "fill";
				return mesh;
			}
			case "surface": {
				const sp = geo;
				const surfGeo = this._buildSurfaceGeometry(sp);
				const style = sp.style ?? "wireframe-face";
				const group = new THREE.Group();
				if (style === "height-color") {
					const cGeo = surfGeo.clone();
					const posArr = cGeo.getAttribute("position").array;
					let zMin = Infinity, zMax = -Infinity;
					for (let i = 0; i < posArr.length; i += 3) {
						const z = posArr[i + 2];
						if (z < zMin) zMin = z;
						if (z > zMax) zMax = z;
					}
					const zSpan = zMax - zMin || 1;
					const loHex = this._resolve("primary");
					const hiHex = this._resolve("accent");
					const lo = [
						loHex >> 16 & 255,
						loHex >> 8 & 255,
						loHex & 255
					];
					const hi = [
						hiHex >> 16 & 255,
						hiHex >> 8 & 255,
						hiHex & 255
					];
					const colors = [];
					for (let i = 0; i < posArr.length; i += 3) {
						const t = (posArr[i + 2] - zMin) / zSpan;
						colors.push((lo[0] + (hi[0] - lo[0]) * t) / 255, (lo[1] + (hi[1] - lo[1]) * t) / 255, (lo[2] + (hi[2] - lo[2]) * t) / 255);
					}
					cGeo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
					const cMat = new THREE.MeshStandardMaterial({
						vertexColors: true,
						roughness: this._mood.roughness,
						metalness: this._mood.metalness,
						side: THREE.DoubleSide
					});
					const faceMesh = new THREE.Mesh(cGeo, cMat);
					faceMesh.userData.lvRole = "fill";
					group.add(faceMesh);
				} else if (style === "minimal") {
					group.add(new THREE.LineSegments(new THREE.WireframeGeometry(surfGeo), new THREE.LineBasicMaterial({
						color: app.color,
						transparent: true,
						opacity: .8
					})));
					const faceOpacity = role?.opacity ?? .08;
					const faceMesh = new THREE.Mesh(surfGeo, this._makeMaterial(app.color, {
						transparent: true,
						opacity: faceOpacity,
						side: THREE.DoubleSide
					}));
					faceMesh.userData.lvRole = "fill";
					group.add(faceMesh);
				} else {
					group.add(new THREE.LineSegments(new THREE.WireframeGeometry(surfGeo), new THREE.LineBasicMaterial({ color: app.color })));
					const faceOpacity = role?.opacity ?? .18;
					const faceMesh = new THREE.Mesh(surfGeo, this._makeMaterial(app.color, {
						transparent: true,
						opacity: faceOpacity,
						side: THREE.DoubleSide
					}));
					faceMesh.userData.lvRole = "fill";
					group.add(faceMesh);
				}
				group.frustumCulled = false;
				return group;
			}
			case "sprite": {
				const size = 64;
				const canvas = document.createElement("canvas");
				canvas.width = size;
				canvas.height = size;
				const ctx = canvas.getContext("2d");
				ctx.beginPath();
				ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
				ctx.fillStyle = `rgb(${app.color >> 16 & 255},${app.color >> 8 & 255},${app.color & 255})`;
				ctx.fill();
				const tex = new THREE.CanvasTexture(canvas);
				tex.minFilter = THREE.LinearFilter;
				tex.magFilter = THREE.LinearFilter;
				const mat = new THREE.SpriteMaterial({
					map: tex,
					transparent: true,
					depthTest: false,
					depthWrite: false
				});
				const sprite = new THREE.Sprite(mat);
				sprite.scale.setScalar(8 / 64);
				return sprite;
			}
			case "arrow": {
				const pos = world.getComponent(entity, "position3");
				const from = pos ? [
					pos.x,
					pos.y,
					pos.z
				] : [
					0,
					0,
					0
				];
				const to = [
					geo.toX,
					geo.toY,
					geo.toZ
				];
				const t = geo.thickness ?? .06;
				this._thickCache.set(entity, t);
				this._dirCache.set(entity, `${to[0]},${to[1]},${to[2]}`);
				return this._makeArrow(from, to, app.color, t);
			}
			case "line": {
				const pos = world.getComponent(entity, "position3");
				const fx = pos?.x ?? 0, fy = pos?.y ?? 0, fz = pos?.z ?? 0;
				const tx = geo.toX, ty = geo.toY, tz = geo.toZ;
				const geoBuf = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(tx - fx, ty - fy, tz - fz)]);
				return new THREE.Line(geoBuf, new THREE.LineBasicMaterial({
					color: app.color,
					transparent: true,
					opacity: app.opacity
				}));
			}
			case "axes": {
				const ap = geo;
				return this._buildAxesGroup(ap.length ?? 4, ap.symmetric ?? true, ap.arrowSize ?? .2, ap.ticks ?? false, ap.basis);
			}
			case "grid": return this._buildGridLines(geo.plane ?? "xz", geo.spacing ?? 1, geo.size ?? 10, app.color, geo.basis);
			default: return null;
		}
	}
	_syncSize(entity, obj, size) {
		if (this._sizeCache.get(entity) === size.value) return;
		this._sizeCache.set(entity, size.value);
		if (obj instanceof THREE.Sprite) obj.scale.setScalar(size.value / 64);
		const mesh = obj;
		if (mesh.geometry instanceof THREE.SphereGeometry && mesh.geometry.parameters.radius !== size.value) mesh.geometry = new THREE.SphereGeometry(size.value, 48, 32);
	}
	_syncThickness(entity, obj, world, geo, thick) {
		const params = geo;
		if (params.kind !== "arrow") return;
		const toKey = `${params.toX},${params.toY},${params.toZ}`;
		const prevT = this._thickCache.get(entity);
		const prevD = this._dirCache.get(entity);
		if (prevT === thick.value && prevD === toKey) return;
		this._thickCache.set(entity, thick.value);
		if (prevD === toKey) {
			const shaft = obj.children[0];
			if (shaft && shaft.isLine2) {
				const mat = shaft.material;
				if (mat?.lineWidth !== void 0) {
					mat.lineWidth = thick.value;
					return;
				}
			}
		}
		this._dirCache.set(entity, toKey);
		const pos = world.getComponent(entity, "position3");
		const app = world.getComponent(entity, "appearance");
		const from = pos ? [
			pos.x,
			pos.y,
			pos.z
		] : [
			0,
			0,
			0
		];
		const to = [
			params.toX,
			params.toY,
			params.toZ
		];
		const newObj = this._makeArrow(from, to, app?.color ?? this._resolve("primary"), thick.value);
		this._scene.remove(obj);
		this._scene.add(newObj);
		this.objCache.set(entity, newObj);
	}
	_makeArrow(from, to, colorHex, thickness, headless) {
		const dir = new THREE.Vector3().subVectors(new THREE.Vector3(to[0], to[1], to[2]), new THREE.Vector3(from[0], from[1], from[2]));
		const len = dir.length();
		if (len < .001) return new THREE.Group();
		const group = new THREE.Group();
		group.position.set(from[0], from[1], from[2]);
		if (headless) {
			const lineGeo = new LineGeometry();
			lineGeo.setPositions([
				0,
				0,
				0,
				0,
				len,
				0
			]);
			const lineMat = new THREE.Line2NodeMaterial({
				color: colorHex,
				linewidth: thickness * .7
			});
			lineMat.worldUnits = true;
			const line = new Line2(lineGeo, lineMat);
			group.add(line);
		} else {
			const headLen = Math.min(Math.max(thickness * 20, .15), .5, len * .7);
			const shaftLen = len - headLen;
			const shaftGeo = new LineGeometry();
			shaftGeo.setPositions([
				0,
				0,
				0,
				0,
				shaftLen,
				0
			]);
			const shaftMat = new THREE.Line2NodeMaterial({
				color: colorHex,
				linewidth: thickness
			});
			shaftMat.worldUnits = true;
			group.add(new Line2(shaftGeo, shaftMat));
			const coneGeo = new THREE.ConeGeometry(thickness * 1.65, headLen, 8);
			const coneMat = this._makeMaterial(colorHex);
			const cone = new THREE.Mesh(coneGeo, coneMat);
			cone.position.y = shaftLen + headLen / 2;
			group.add(cone);
		}
		const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
		group.setRotationFromQuaternion(quat);
		return group;
	}
	_axisColor(axis) {
		return this._resolve({
			x: "danger",
			y: "info",
			z: "accent"
		}[axis] ?? "primary");
	}
	_buildAxesGroup(length, symmetric, arrowSize, ticks, basis) {
		const group = new THREE.Group();
		const thick = arrowSize * .1;
		const B = basis;
		const î = B ? B[0] : [
			1,
			0,
			0
		];
		const ĵ = B ? B[1] : [
			0,
			0,
			1
		];
		const k̂ = B ? B[2] : [
			0,
			1,
			0
		];
		const scale = (v, s) => [
			v[0] * s,
			v[1] * s,
			v[2] * s
		];
		const neg = (v) => [
			-v[0],
			-v[1],
			-v[2]
		];
		const pos = [
			[scale(î, length), "x"],
			[scale(ĵ, length), "y"],
			[scale(k̂, length), "z"]
		];
		for (const [to, axis] of pos) group.add(this._makeArrow([
			0,
			0,
			0
		], to, this._axisColor(axis), thick));
		if (symmetric) for (const [to, axis] of pos) group.add(this._makeArrow([
			0,
			0,
			0
		], neg(to), this._axisColor(axis), thick, true));
		const lo = length + .5;
		group.add(this._makeAxisLabel("x", scale(î, lo), this._axisColor("x")));
		group.add(this._makeAxisLabel("y", scale(ĵ, lo), this._axisColor("y")));
		group.add(this._makeAxisLabel("z", scale(k̂, lo), this._axisColor("z")));
		if (ticks) {
			const tickLen = .12;
			const perpX = basis ? normalize3(cross3(ĵ, k̂)) : [
				0,
				.12,
				0
			];
			const perpY = basis ? normalize3(cross3(k̂, î)) : [
				.12,
				0,
				0
			];
			const perpZ = basis ? normalize3(cross3(î, ĵ)) : [
				.12,
				0,
				0
			];
			const tickAxes = [
				{
					t: "x",
					u: î,
					perp: perpX,
					loff: scale(normalize3(perpX), -.25)
				},
				{
					t: "y",
					u: ĵ,
					perp: perpY,
					loff: scale(normalize3(perpY), -.25)
				},
				{
					t: "z",
					u: k̂,
					perp: perpZ,
					loff: scale(normalize3(perpZ), -.25)
				}
			];
			for (const a of tickAxes) for (let i = 1; i <= Math.floor(length); i++) {
				const cx = a.u[0] * i, cy = a.u[1] * i, cz = a.u[2] * i;
				const px = a.perp[0] * tickLen / 2, py = a.perp[1] * tickLen / 2, pz = a.perp[2] * tickLen / 2;
				const tg = new LineGeometry();
				tg.setPositions([
					cx - px,
					cy - py,
					cz - pz,
					cx + px,
					cy + py,
					cz + pz
				]);
				const tm = new THREE.Line2NodeMaterial({
					color: this._axisColor(a.t),
					linewidth: .012
				});
				tm.worldUnits = true;
				group.add(new Line2(tg, tm));
				group.add(this._makeTickLabel(String(i), this._axisColor(a.t), [
					cx + a.loff[0],
					cy + a.loff[1],
					cz + a.loff[2]
				]));
			}
		}
		return group;
	}
	_makeTickLabel(text, colorHex, pos) {
		const size = 64;
		const canvas = document.createElement("canvas");
		canvas.width = size;
		canvas.height = size;
		const ctx = canvas.getContext("2d");
		ctx.fillStyle = `#${colorHex.toString(16).padStart(6, "0")}`;
		ctx.font = "38px system-ui, -apple-system, sans-serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(text, size / 2, size / 2);
		const tex = new THREE.CanvasTexture(canvas);
		tex.minFilter = THREE.LinearFilter;
		const mat = new THREE.SpriteMaterial({
			map: tex,
			transparent: true,
			depthTest: false,
			depthWrite: false
		});
		const sprite = new THREE.Sprite(mat);
		sprite.position.set(...pos);
		sprite.scale.setScalar(.2);
		return sprite;
	}
	_makeAxisLabel(text, pos, colorHex) {
		const size = 96;
		const canvas = document.createElement("canvas");
		canvas.width = size;
		canvas.height = size;
		const ctx = canvas.getContext("2d");
		ctx.fillStyle = `#${colorHex.toString(16).padStart(6, "0")}`;
		ctx.font = "bold 52px system-ui, -apple-system, sans-serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(text, size / 2, size / 2);
		const tex = new THREE.CanvasTexture(canvas);
		tex.minFilter = THREE.LinearFilter;
		const mat = new THREE.SpriteMaterial({
			map: tex,
			transparent: true,
			depthTest: false,
			depthWrite: false
		});
		const sprite = new THREE.Sprite(mat);
		sprite.position.set(...pos);
		sprite.scale.setScalar(.35);
		return sprite;
	}
	_buildSurfaceGeometry(p) {
		const { fn, uMin, uMax, vMin, vMax, uSegments, vSegments } = p;
		const verts = [];
		const indices = [];
		const cols = vSegments + 1;
		for (let i = 0; i <= uSegments; i++) {
			const u = uMin + (uMax - uMin) * (i / uSegments);
			for (let j = 0; j <= vSegments; j++) {
				const [x, y, z] = fn(u, vMin + (vMax - vMin) * (j / vSegments));
				verts.push(x, y, z);
			}
		}
		for (let i = 0; i < uSegments; i++) for (let j = 0; j < vSegments; j++) {
			const a = i * cols + j;
			const b = a + cols;
			const c = a + 1;
			const d = b + 1;
			indices.push(a, b, c);
			indices.push(b, d, c);
		}
		const geo = new THREE.BufferGeometry();
		geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
		geo.setIndex(indices);
		geo.computeVertexNormals();
		return geo;
	}
	_buildGridLines(plane, spacing, size, colorHex, basis) {
		const half = size / 2;
		const points = [];
		if (basis) {
			const î = basis[0], ĵ = basis[1], k̂ = basis[2];
			const positions = [];
			for (let p = -half; p <= half + spacing * .001; p += spacing) positions.push(p > half ? half : p);
			if (positions.length > 1 && positions[positions.length - 1] === positions[positions.length - 2]) positions.pop();
			for (const sa of positions) for (const sb of positions) {
				const sk = [
					î[0] * sa + ĵ[0] * sb,
					î[1] * sa + ĵ[1] * sb,
					î[2] * sa + ĵ[2] * sb
				];
				points.push(new THREE.Vector3(sk[0] + k̂[0] * -half, sk[1] + k̂[1] * -half, sk[2] + k̂[2] * -half), new THREE.Vector3(sk[0] + k̂[0] * half, sk[1] + k̂[1] * half, sk[2] + k̂[2] * half));
				const sj = [
					î[0] * sa + k̂[0] * sb,
					î[1] * sa + k̂[1] * sb,
					î[2] * sa + k̂[2] * sb
				];
				points.push(new THREE.Vector3(sj[0] + ĵ[0] * -half, sj[1] + ĵ[1] * -half, sj[2] + ĵ[2] * -half), new THREE.Vector3(sj[0] + ĵ[0] * half, sj[1] + ĵ[1] * half, sj[2] + ĵ[2] * half));
				const si = [
					ĵ[0] * sa + k̂[0] * sb,
					ĵ[1] * sa + k̂[1] * sb,
					ĵ[2] * sa + k̂[2] * sb
				];
				points.push(new THREE.Vector3(si[0] + î[0] * -half, si[1] + î[1] * -half, si[2] + î[2] * -half), new THREE.Vector3(si[0] + î[0] * half, si[1] + î[1] * half, si[2] + î[2] * half));
			}
		} else for (let i = -half; i <= half; i += spacing) {
			if (Math.abs(i) < .001) continue;
			if (plane === "xz") {
				points.push(new THREE.Vector3(i, 0, -half), new THREE.Vector3(i, 0, half));
				points.push(new THREE.Vector3(-half, 0, i), new THREE.Vector3(half, 0, i));
			} else if (plane === "xy") {
				points.push(new THREE.Vector3(i, -half, 0), new THREE.Vector3(i, half, 0));
				points.push(new THREE.Vector3(-half, i, 0), new THREE.Vector3(half, i, 0));
			} else if (plane === "yz") {
				points.push(new THREE.Vector3(0, i, -half), new THREE.Vector3(0, i, half));
				points.push(new THREE.Vector3(0, -half, i), new THREE.Vector3(0, half, i));
			}
		}
		const geo = new THREE.BufferGeometry().setFromPoints(points);
		return new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
			color: colorHex,
			transparent: true,
			opacity: this._mood.gridOpacity
		}));
	}
	/** In-place vertex update for grid lattice — no rebuild when only basis changes. */
	_syncGrid(obj, params) {
		if (params.kind !== "grid" || !params.basis) return;
		const posAttr = obj.geometry.getAttribute("position");
		if (!posAttr) return;
		const posArr = posAttr.array;
		const basis = params.basis;
		const î = basis[0], ĵ = basis[1], k̂ = basis[2];
		const half = params.size / 2;
		const spacing = params.spacing;
		const positions = [];
		for (let p = -half; p <= half + spacing * .001; p += spacing) positions.push(p > half ? half : p);
		if (positions.length > 1 && positions[positions.length - 1] === positions[positions.length - 2]) positions.pop();
		let pi = 0;
		for (const sa of positions) for (const sb of positions) {
			const sk = [
				î[0] * sa + ĵ[0] * sb,
				î[1] * sa + ĵ[1] * sb,
				î[2] * sa + ĵ[2] * sb
			];
			posArr[pi++] = sk[0] + k̂[0] * -half;
			posArr[pi++] = sk[1] + k̂[1] * -half;
			posArr[pi++] = sk[2] + k̂[2] * -half;
			posArr[pi++] = sk[0] + k̂[0] * half;
			posArr[pi++] = sk[1] + k̂[1] * half;
			posArr[pi++] = sk[2] + k̂[2] * half;
			const sj = [
				î[0] * sa + k̂[0] * sb,
				î[1] * sa + k̂[1] * sb,
				î[2] * sa + k̂[2] * sb
			];
			posArr[pi++] = sj[0] + ĵ[0] * -half;
			posArr[pi++] = sj[1] + ĵ[1] * -half;
			posArr[pi++] = sj[2] + ĵ[2] * -half;
			posArr[pi++] = sj[0] + ĵ[0] * half;
			posArr[pi++] = sj[1] + ĵ[1] * half;
			posArr[pi++] = sj[2] + ĵ[2] * half;
			const si = [
				ĵ[0] * sa + k̂[0] * sb,
				ĵ[1] * sa + k̂[1] * sb,
				ĵ[2] * sa + k̂[2] * sb
			];
			posArr[pi++] = si[0] + î[0] * -half;
			posArr[pi++] = si[1] + î[1] * -half;
			posArr[pi++] = si[2] + î[2] * -half;
			posArr[pi++] = si[0] + î[0] * half;
			posArr[pi++] = si[1] + î[1] * half;
			posArr[pi++] = si[2] + î[2] * half;
		}
		posAttr.needsUpdate = true;
	}
};
function disposeTree(obj) {
	obj.traverse((child) => {
		const mesh = child;
		if (mesh.geometry) mesh.geometry.dispose();
		const raw = mesh.material ?? child.material;
		const materials = Array.isArray(raw) ? raw : [raw];
		for (const m of materials) {
			if (!m) continue;
			m.dispose();
			const tex = m.map;
			if (tex) tex.dispose();
		}
	});
}

//#endregion
//#region vis3d/systems/transform.ts
var TransformSystem = class {
	constructor(objCache) {
		this.name = "transform";
		this.requiredComponents = ["position3"];
		this._objCache = objCache;
	}
	update(world, _context) {
		const entities = world.query("position3");
		for (const entity of entities) {
			const obj = this._objCache.get(entity);
			if (!obj) continue;
			const pos = world.getComponent(entity, "position3");
			obj.position.set(pos.x, pos.y, pos.z);
		}
	}
};

//#endregion
//#region vis3d/systems/material.ts
var MaterialSystem = class {
	constructor(objCache, mood, toonGradient) {
		this.name = "material";
		this.requiredComponents = ["appearance"];
		this._appHash = /* @__PURE__ */ new Map();
		this._objCache = objCache;
		this._mood = mood;
		this._toonGradient = toonGradient;
	}
	update(world, _context) {
		const entities = world.query("appearance");
		for (const entity of entities) {
			const obj = this._objCache.get(entity);
			if (!obj) continue;
			const app = world.getComponent(entity, "appearance");
			const role = world.getComponent(entity, "materialRole");
			const override = world.getComponent(entity, "opacityOverride");
			const hash = `${app.color}:${app.opacity}:${app.wireframe}:${app.emissive}:${override?.value ?? 1}`;
			if (this._appHash.get(entity) === hash) continue;
			this._appHash.set(entity, hash);
			const multiplier = override?.value ?? 1;
			obj.traverse((child) => {
				if (child instanceof THREE.Sprite) return;
				const raw = child.material ?? child.material;
				const mat = Array.isArray(raw) ? raw[0] : raw;
				if (!mat) return;
				if (mat.color) mat.color.set(app.color);
				if (mat.emissive) mat.emissive.set(app.emissive);
				const actualOpacity = (child.userData?.lvRole === "fill" && role ? role.opacity : app.opacity) * multiplier;
				mat.transparent = actualOpacity < 1;
				mat.opacity = actualOpacity;
				if (mat.wireframe !== void 0 && !(child instanceof THREE.Line) && !(child instanceof THREE.LineSegments)) mat.wireframe = app.wireframe;
				if (this._toonGradient && mat.isMeshToonMaterial) mat.gradientMap = this._toonGradient;
			});
		}
	}
	/** Clear appearance cache (e.g., after theme change). */
	clearCache() {
		this._appHash.clear();
	}
};

//#endregion
//#region vis3d/systems/transition.ts
/** Geometry kinds that get scale+fade (in addition to opacity fade) on enter. */
const SCALE_FADE_KINDS = new Set([
	"line",
	"arrow",
	"sphere",
	"sprite",
	"rightAngle",
	"arc"
]);
var TransitionSystem = class TransitionSystem {
	constructor(objCache, scene) {
		this.name = "transition";
		this.requiredComponents = [];
		this._entering = /* @__PURE__ */ new Map();
		this._exiting = /* @__PURE__ */ new Map();
		this._transDur = 350;
		this._objCache = objCache;
		this._scene = scene;
	}
	static _spring(t) {
		return 1 - Math.pow(2, -8 * t) * Math.cos(3 * Math.PI * t) * (1 - t);
	}
	update(world, _context) {
		const now = performance.now();
		for (const [entity, obj] of this._objCache) {
			if (!world.isAlive(entity)) continue;
			if (this._entering.has(entity)) continue;
			const geoComp = world.getComponent(entity, "geometry");
			if (!geoComp) continue;
			const kind = geoComp.kind;
			const scaleFade = SCALE_FADE_KINDS.has(kind);
			world.patchComponent(entity, "opacityOverride", { value: 0 });
			const origScale = obj.scale.clone();
			if (scaleFade) obj.scale.copy(origScale).multiplyScalar(.6);
			this._entering.set(entity, {
				obj,
				startMs: now,
				kind,
				origScale
			});
		}
		for (const [entity, obj] of this._objCache) {
			if (world.isAlive(entity)) continue;
			if (this._exiting.has(entity)) continue;
			const targets = /* @__PURE__ */ new Map();
			obj.traverse((child) => {
				const rawM = child.material ?? child.material;
				const mats = Array.isArray(rawM) ? rawM : [rawM];
				for (const mat of mats) {
					if (!mat) continue;
					targets.set(mat, mat.opacity);
					mat.transparent = true;
				}
			});
			this._exiting.set(entity, {
				obj,
				startMs: now,
				targets
			});
		}
		for (const [entity, { obj, startMs, kind, origScale }] of this._entering) {
			const raw = Math.min((now - startMs) / this._transDur, 1);
			const t = TransitionSystem._spring(raw);
			const scaleFade = SCALE_FADE_KINDS.has(kind);
			world.patchComponent(entity, "opacityOverride", { value: t });
			if (scaleFade) obj.scale.copy(origScale).multiplyScalar(.6 + .4 * t);
			if (raw >= 1) {
				world.removeComponent(entity, "opacityOverride");
				if (scaleFade) obj.scale.copy(origScale);
				this._entering.delete(entity);
			}
		}
		for (const [entity, { obj, startMs, targets }] of this._exiting) {
			const elapsed = now - startMs;
			const raw = Math.min(elapsed / (this._transDur * .7), 1);
			const t = TransitionSystem._spring(raw);
			obj.traverse((child) => {
				const rawM = child.material ?? child.material;
				const mats = Array.isArray(rawM) ? rawM : [rawM];
				for (const mat of mats) {
					if (!mat) continue;
					const target = targets.get(mat) ?? 1;
					mat.opacity = (1 - t) * target;
				}
			});
			if (raw >= 1) {
				this._scene.remove(obj);
				disposeTree(obj);
				this._exiting.delete(entity);
				this._objCache.delete(entity);
			}
		}
	}
	/** Cancel all active transitions instantly. */
	flush(world) {
		for (const [entity, { obj, origScale }] of this._entering) {
			world.removeComponent(entity, "opacityOverride");
			obj.scale.copy(origScale);
		}
		this._entering.clear();
		for (const [entity, { obj }] of this._exiting) {
			this._scene.remove(obj);
			disposeTree(obj);
			this._objCache.delete(entity);
		}
		this._exiting.clear();
	}
	/** Number of entities currently in enter/exit transition. */
	get activeCount() {
		return this._entering.size + this._exiting.size;
	}
};

//#endregion
//#region vis3d/systems/cleanup.ts
var CleanupSystem = class {
	constructor(objCache, scene) {
		this.name = "cleanup";
		this.requiredComponents = [];
		this._objCache = objCache;
		this._scene = scene;
	}
	update(world, _context) {
		for (const [entity, obj] of this._objCache) {
			if (world.isAlive(entity)) continue;
			this._scene.remove(obj);
			disposeTree(obj);
			this._objCache.delete(entity);
		}
	}
	/** Full teardown — dispose ALL cached objects. Call when renderer is stopped. */
	disposeAll() {
		for (const [, obj] of this._objCache) {
			this._scene.remove(obj);
			disposeTree(obj);
		}
		this._objCache.clear();
	}
};

//#endregion
//#region vis3d/systems/css-label.ts
var CSSLabelSystem = class {
	constructor(container, camera, mood) {
		this.name = "css-label";
		this.requiredComponents = ["position3", "label"];
		this._elCache = /* @__PURE__ */ new Map();
		this._textCache = /* @__PURE__ */ new Map();
		this._container = container;
		this._camera = camera;
		this._injectStyles(mood);
	}
	update(world, _context) {
		const entities = world.query("position3", "label");
		for (const entity of entities) {
			const pos = world.getComponent(entity, "position3");
			const lbl = world.getComponent(entity, "label");
			let el = this._elCache.get(entity);
			if (!el) {
				el = this._createElement(lbl.text);
				this._container.appendChild(el);
				this._elCache.set(entity, el);
				this._textCache.set(entity, lbl.text);
			} else if (this._textCache.get(entity) !== lbl.text) {
				el.textContent = lbl.text;
				this._textCache.set(entity, lbl.text);
			}
			const projected = this._project([
				pos.x + lbl.offset[0],
				pos.y + lbl.offset[1],
				pos.z + lbl.offset[2]
			]);
			if (!projected.visible) {
				el.style.visibility = "hidden";
				continue;
			}
			el.style.visibility = "visible";
			el.style.transform = `translate(-50%, -50%) translate(${projected.x.toFixed(1)}px, ${projected.y.toFixed(1)}px)`;
		}
		for (const [entity, el] of this._elCache) if (!world.isAlive(entity)) {
			el.remove();
			this._elCache.delete(entity);
			this._textCache.delete(entity);
		}
	}
	_project(worldPos) {
		const v = new THREE.Vector3(...worldPos).project(this._camera);
		const w = this._container.clientWidth;
		const h = this._container.clientHeight;
		return {
			x: (v.x * .5 + .5) * w,
			y: (-v.y * .5 + .5) * h,
			visible: v.z < 1
		};
	}
	_createElement(text) {
		const el = document.createElement("div");
		el.className = "lv-label lv-label-3d";
		el.textContent = text;
		return el;
	}
	_injectStyles(mood) {
		this._container.style.setProperty("--lv-label-font", mood.label.font);
		this._container.style.setProperty("--lv-label-color", mood.label.color);
		this._container.style.setProperty("--lv-label-shadow", mood.label.shadow);
		if (document.getElementById("lv-label-3d-style")) return;
		const style = document.createElement("style");
		style.id = "lv-label-3d-style";
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
        will-change: transform;
      }
    `;
		document.head.appendChild(style);
	}
	dispose() {
		for (const el of this._elCache.values()) el.remove();
		this._elCache.clear();
		this._textCache.clear();
	}
};

//#endregion
//#region vis3d/primitives/point.ts
function spawnPoint(world, resolve, id, x, y, z, color) {
	const entity = world.spawn();
	world.addComponent(entity, {
		type: "position3",
		x,
		y,
		z
	});
	world.addComponent(entity, {
		type: "geometry",
		kind: "sprite"
	});
	world.addComponent(entity, {
		type: "appearance",
		color: resolve(color ?? "primary"),
		opacity: 1,
		wireframe: false,
		emissive: 0
	});
	world.addComponent(entity, {
		type: "size",
		value: 8
	});
	world.addComponent(entity, {
		type: "userId",
		value: id
	});
	return {
		entity,
		gfx: new Gfx3dImpl(world, entity, resolve)
	};
}

//#endregion
//#region vis3d/primitives/line.ts
function spawnLine(world, resolve, id, from, to, color) {
	const entity = world.spawn();
	world.addComponent(entity, {
		type: "position3",
		x: from[0],
		y: from[1],
		z: from[2]
	});
	world.addComponent(entity, {
		type: "geometry",
		kind: "line",
		toX: to[0],
		toY: to[1],
		toZ: to[2]
	});
	world.addComponent(entity, {
		type: "appearance",
		color: resolve(color ?? "secondary"),
		opacity: 1,
		wireframe: false,
		emissive: 0
	});
	world.addComponent(entity, {
		type: "userId",
		value: id
	});
	return {
		entity,
		gfx: new Gfx3dImpl(world, entity, resolve)
	};
}

//#endregion
//#region vis3d/primitives/vector.ts
function spawnVector(world, resolve, id, from, to, color, thickness = .015) {
	const entity = world.spawn();
	world.addComponent(entity, {
		type: "position3",
		x: from[0],
		y: from[1],
		z: from[2]
	});
	world.addComponent(entity, {
		type: "geometry",
		kind: "arrow",
		toX: to[0],
		toY: to[1],
		toZ: to[2],
		thickness
	});
	world.addComponent(entity, {
		type: "appearance",
		color: resolve(color ?? "primary"),
		opacity: 1,
		wireframe: false,
		emissive: 0
	});
	world.addComponent(entity, {
		type: "thickness",
		value: thickness
	});
	world.addComponent(entity, {
		type: "userId",
		value: id
	});
	return {
		entity,
		gfx: new Gfx3dImpl(world, entity, resolve)
	};
}

//#endregion
//#region vis3d/primitives/sphere.ts
function spawnSphere(world, resolve, id, cx, cy, cz, r, color) {
	const entity = world.spawn();
	world.addComponent(entity, {
		type: "position3",
		x: cx,
		y: cy,
		z: cz
	});
	world.addComponent(entity, {
		type: "geometry",
		kind: "sphere",
		radius: r
	});
	world.addComponent(entity, {
		type: "appearance",
		color: resolve(color ?? "primary"),
		opacity: 1,
		wireframe: false,
		emissive: 0
	});
	world.addComponent(entity, {
		type: "size",
		value: r
	});
	world.addComponent(entity, {
		type: "userId",
		value: id
	});
	return {
		entity,
		gfx: new Gfx3dImpl(world, entity, resolve)
	};
}

//#endregion
//#region vis3d/primitives/cube.ts
function spawnCube(world, resolve, id, cx, cy, cz, size, color) {
	const entity = world.spawn();
	world.addComponent(entity, {
		type: "position3",
		x: cx,
		y: cy,
		z: cz
	});
	world.addComponent(entity, {
		type: "geometry",
		kind: "cube",
		size
	});
	world.addComponent(entity, {
		type: "appearance",
		color: resolve(color ?? "primary"),
		opacity: 1,
		wireframe: false,
		emissive: 0
	});
	world.addComponent(entity, {
		type: "size",
		value: size
	});
	world.addComponent(entity, {
		type: "materialRole",
		kind: "fill",
		opacity: .18
	});
	world.addComponent(entity, {
		type: "userId",
		value: id
	});
	return {
		entity,
		gfx: new Gfx3dImpl(world, entity, resolve)
	};
}

//#endregion
//#region vis3d/primitives/surface.ts
function spawnSurface(world, resolve, id, fn, uMin, uMax, vMin, vMax, opts = {}) {
	const entity = world.spawn();
	const colorHex = resolve(opts.color ?? "primary");
	world.addComponent(entity, {
		type: "position3",
		x: 0,
		y: 0,
		z: 0
	});
	world.addComponent(entity, {
		type: "geometry",
		kind: "surface",
		fn,
		fnKey: fn.toString(),
		uMin,
		uMax,
		vMin,
		vMax,
		uSegments: opts.uSegments ?? 32,
		vSegments: opts.vSegments ?? 32,
		style: opts.style ?? "wireframe-face"
	});
	const style = opts.style ?? "wireframe-face";
	const fillOpacity = style === "minimal" ? .08 : style === "wireframe-face" ? .18 : 0;
	world.addComponent(entity, {
		type: "appearance",
		color: colorHex,
		opacity: 1,
		wireframe: false,
		emissive: 0
	});
	if (fillOpacity > 0) world.addComponent(entity, {
		type: "materialRole",
		kind: "fill",
		opacity: fillOpacity
	});
	world.addComponent(entity, {
		type: "userId",
		value: id
	});
	return {
		entity,
		gfx: new Gfx3dImpl(world, entity, resolve)
	};
}

//#endregion
//#region vis3d/primitives/fill.ts
function spawnFill(world, resolve, id, vertices, color) {
	const entity = world.spawn();
	world.addComponent(entity, {
		type: "position3",
		x: 0,
		y: 0,
		z: 0
	});
	world.addComponent(entity, {
		type: "geometry",
		kind: "fill",
		vertices: vertices.flat(),
		count: vertices.length
	});
	world.addComponent(entity, {
		type: "appearance",
		color: resolve(color ?? "primary"),
		opacity: .12,
		wireframe: false,
		emissive: 0
	});
	world.addComponent(entity, {
		type: "materialRole",
		kind: "fill",
		opacity: .12
	});
	world.addComponent(entity, {
		type: "userId",
		value: id
	});
	return {
		entity,
		gfx: new Gfx3dImpl(world, entity, resolve)
	};
}

//#endregion
//#region vis3d/primitives/arc.ts
function spawnArc(world, resolve, id, center, fromDir, toDir, opts = {}) {
	const entity = world.spawn();
	const colorHex = resolve(opts.color ?? "danger");
	world.addComponent(entity, {
		type: "position3",
		x: center[0],
		y: center[1],
		z: center[2]
	});
	world.addComponent(entity, {
		type: "geometry",
		kind: "arc",
		fromX: fromDir[0],
		fromY: fromDir[1],
		fromZ: fromDir[2],
		toX: toDir[0],
		toY: toDir[1],
		toZ: toDir[2],
		radius: opts.radius ?? .25
	});
	world.addComponent(entity, {
		type: "appearance",
		color: colorHex,
		opacity: .15,
		wireframe: false,
		emissive: 0
	});
	world.addComponent(entity, {
		type: "materialRole",
		kind: "fill",
		opacity: .15
	});
	world.addComponent(entity, {
		type: "userId",
		value: id
	});
	return {
		entity,
		gfx: new Gfx3dImpl(world, entity, resolve)
	};
}

//#endregion
//#region vis3d/primitives/right-angle.ts
function spawnRightAngle(world, resolve, id, center, dirA, dirB, size = .18, color) {
	const entity = world.spawn();
	const colorHex = resolve(color ?? "dim");
	world.addComponent(entity, {
		type: "position3",
		x: center[0],
		y: center[1],
		z: center[2]
	});
	world.addComponent(entity, {
		type: "geometry",
		kind: "rightAngle",
		dirAX: dirA[0],
		dirAY: dirA[1],
		dirAZ: dirA[2],
		dirBX: dirB[0],
		dirBY: dirB[1],
		dirBZ: dirB[2],
		size
	});
	world.addComponent(entity, {
		type: "appearance",
		color: colorHex,
		opacity: 1,
		wireframe: false,
		emissive: 0
	});
	world.addComponent(entity, {
		type: "userId",
		value: id
	});
	return {
		entity,
		gfx: new Gfx3dImpl(world, entity, resolve)
	};
}

//#endregion
//#region vis3d/primitives/axes.ts
function spawnAxes(world, resolve, opts = {}) {
	const entity = world.spawn();
	world.addComponent(entity, {
		type: "position3",
		x: 0,
		y: 0,
		z: 0
	});
	world.addComponent(entity, {
		type: "geometry",
		kind: "axes",
		length: opts.length ?? 4,
		arrowSize: opts.arrowSize ?? .2,
		symmetric: opts.symmetric ?? true,
		ticks: opts.ticks ?? false,
		basis: opts.basis ?? null
	});
	world.addComponent(entity, {
		type: "appearance",
		color: resolve("primary"),
		opacity: 1,
		wireframe: false,
		emissive: 0
	});
	world.addComponent(entity, {
		type: "userId",
		value: "::axes3d"
	});
	return {
		entity,
		gfx: new Gfx3dImpl(world, entity, resolve)
	};
}

//#endregion
//#region vis3d/primitives/grid.ts
function spawnGrid(world, resolve, opts = {}) {
	const entity = world.spawn();
	const colorHex = resolve(opts.color ?? "dim");
	world.addComponent(entity, {
		type: "position3",
		x: 0,
		y: 0,
		z: 0
	});
	world.addComponent(entity, {
		type: "geometry",
		kind: "grid",
		plane: opts.plane ?? "xz",
		spacing: opts.spacing ?? 1,
		size: opts.size ?? 10,
		basis: opts.basis ?? null
	});
	world.addComponent(entity, {
		type: "appearance",
		color: colorHex,
		opacity: .4,
		wireframe: false,
		emissive: 0
	});
	world.addComponent(entity, {
		type: "userId",
		value: opts.id ?? "::grid3d"
	});
	return {
		entity,
		gfx: new Gfx3dImpl(world, entity, resolve)
	};
}

//#endregion
//#region vis3d/motion.ts
function createStepsController3d(scene, defs, opts = {}) {
	let _current = opts.start ?? -1;
	const listeners = [];
	const isUpdateMode = opts.mode === "update";
	function notify() {
		const step = defs[_current] ?? null;
		for (const fn of listeners) fn(_current, step);
	}
	const ctrl = {
		go(i) {
			if (i < -1 || i >= defs.length) return;
			_current = i;
			if (i < 0) {
				scene.render(() => {});
				notify();
				return;
			}
			const def = defs[i];
			if (isUpdateMode) scene.render((s) => {
				def.frame(s);
			});
			else scene.render((s) => {
				def.frame(s);
			});
			notify();
		},
		next() {
			if (_current < defs.length - 1) this.go(_current + 1);
		},
		prev() {
			if (_current > -1) this.go(_current - 1);
		},
		reset() {
			this.go(-1);
		},
		get current() {
			return _current;
		},
		get total() {
			return defs.length;
		},
		get currentStepDef() {
			return defs[_current] ?? null;
		},
		onChange(fn) {
			listeners.push(fn);
			return () => {
				const idx = listeners.indexOf(fn);
				if (idx >= 0) listeners.splice(idx, 1);
			};
		},
		destroy() {
			listeners.length = 0;
		}
	};
	if (_current < 0 && defs.length > 0) ctrl.go(0);
	return ctrl;
}

//#endregion
//#region vis3d/scene.ts
let _Symbol$dispose;
const EASINGS = {
	"linear": (t) => t,
	"ease-out": (t) => 1 - (1 - t) ** 3,
	"ease-in-out": (t) => t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2
};
_Symbol$dispose = Symbol.dispose;
var Scene3dImpl = class {
	constructor() {
		this._world = new World();
		this._frameFn = null;
		this._onDispose = [];
		this._camAnim = null;
		this._store = /* @__PURE__ */ new Map();
		this._touched = /* @__PURE__ */ new Set();
	}
	async init(container, opts = {}) {
		this._boot = await bootstrap3d(container, opts);
		const mood = resolveMood(opts.mood);
		this._resolve = createColorResolver(opts.theme ?? opts.mood);
		this._labelContainer = document.createElement("div");
		this._labelContainer.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden;";
		container.style.position = "relative";
		container.appendChild(this._labelContainer);
		this._cssLabel = new CSSLabelSystem(this._labelContainer, this._boot.camera, mood);
		if (mood.toonBands !== void 0) {
			const size = 64;
			const canvas = document.createElement("canvas");
			canvas.width = size;
			canvas.height = 1;
			const ctx = canvas.getContext("2d");
			const step = size / mood.toonBands;
			for (let i = 0; i < mood.toonBands; i++) {
				ctx.fillStyle = `hsl(0, 0%, ${Math.round(i / (mood.toonBands - 1) * 100)}%)`;
				ctx.fillRect(i * step, 0, step, 1);
			}
			const tex = new THREE.CanvasTexture(canvas);
			tex.minFilter = THREE.NearestFilter;
			tex.magFilter = THREE.NearestFilter;
			this._toonGradient = tex;
		}
		this._geometrySys = new GeometrySystem(this._boot.scene, this._resolve, mood, this._toonGradient);
		this._transformSys = new TransformSystem(this._geometrySys.objCache);
		this._materialSys = new MaterialSystem(this._geometrySys.objCache, mood, this._toonGradient);
		this._transitionSys = new TransitionSystem(this._geometrySys.objCache, this._boot.scene);
		this._cleanupSys = new CleanupSystem(this._geometrySys.objCache, this._boot.scene);
		this._world.addSystem(this._geometrySys);
		this._world.addSystem(this._transformSys);
		this._world.addSystem(this._transitionSys);
		this._world.addSystem(this._materialSys);
		this._world.addSystem(this._cleanupSys);
		this._world.addSystem(this._cssLabel);
		this._boot.controls.addEventListener("start", () => {
			this._camAnim = null;
		});
		this._boot.renderer.setAnimationLoop(() => {
			this._boot.controls.update();
			this._tickCameraAnim();
			this._touched.clear();
			if (this._frameFn) this._frameFn(this);
			for (const [id, gfx] of this._store) if (!this._touched.has(id)) {
				this._world.destroy(gfx._e);
				this._store.delete(id);
			}
			this._world.update(this._boot);
			this._boot.renderer.render(this._boot.scene, this._boot.camera);
		});
	}
	_tickCameraAnim() {
		if (!this._camAnim) return;
		const a = this._camAnim;
		const raw = Math.min((performance.now() - a.startMs) / (a.duration * 1e3), 1);
		const k = a.easing(raw);
		const { camera, controls } = this._boot;
		camera.position.set(a.fromPos[0] + (a.toPos[0] - a.fromPos[0]) * k, a.fromPos[1] + (a.toPos[1] - a.fromPos[1]) * k, a.fromPos[2] + (a.toPos[2] - a.fromPos[2]) * k);
		controls.target.set(a.fromTgt[0] + (a.toTgt[0] - a.fromTgt[0]) * k, a.fromTgt[1] + (a.toTgt[1] - a.fromTgt[1]) * k, a.fromTgt[2] + (a.toTgt[2] - a.fromTgt[2]) * k);
		controls.update();
		if (raw >= 1) this._camAnim = null;
	}
	_upsert(id) {
		const existing = this._world.entityByUserId(id);
		if (existing !== void 0) {
			this._world.destroy(existing);
			this._store.delete(id);
		}
	}
	/** After spawning an entity, create THREE object and bind to gfx for escape hatch. */
	_register(gfx, entity) {
		const obj = this._geometrySys.createAndRegister(entity, this._world);
		gfx._bindThreeObject(obj);
	}
	/** Mark an entity as touched this frame — it survives the sweep. */
	_touch(id) {
		this._touched.add(id);
	}
	point(id, x, y, z) {
		const existing = this._store.get(id);
		if (existing) {
			this._world.setComponent(existing._e, {
				type: "position3",
				x,
				y,
				z
			});
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
	line3d(id, from, to) {
		const existing = this._store.get(id);
		if (existing) {
			this._world.setComponent(existing._e, {
				type: "position3",
				x: from[0],
				y: from[1],
				z: from[2]
			});
			this._world.setComponent(existing._e, {
				type: "geometry",
				kind: "line",
				toX: to[0],
				toY: to[1],
				toZ: to[2]
			});
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
	vector(id, from, to) {
		const existing = this._store.get(id);
		if (existing) {
			const thick = this._world.getComponent(existing._e, "thickness")?.value ?? .015;
			this._world.setComponent(existing._e, {
				type: "position3",
				x: from[0],
				y: from[1],
				z: from[2]
			});
			this._world.setComponent(existing._e, {
				type: "geometry",
				kind: "arrow",
				toX: to[0],
				toY: to[1],
				toZ: to[2],
				thickness: thick
			});
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
	sphere(id, cx, cy, cz, r) {
		const existing = this._store.get(id);
		if (existing) {
			this._world.setComponent(existing._e, {
				type: "position3",
				x: cx,
				y: cy,
				z: cz
			});
			this._world.patchComponent(existing._e, "size", { value: r });
			this._world.setComponent(existing._e, {
				type: "geometry",
				kind: "sphere",
				radius: r
			});
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
	cube(id, cx, cy, cz, size) {
		const existing = this._store.get(id);
		if (existing) {
			this._world.setComponent(existing._e, {
				type: "position3",
				x: cx,
				y: cy,
				z: cz
			});
			this._world.patchComponent(existing._e, "size", { value: size });
			this._world.setComponent(existing._e, {
				type: "geometry",
				kind: "cube",
				size
			});
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
	fill(id, vertices) {
		const existing = this._store.get(id);
		if (existing) {
			this._world.setComponent(existing._e, {
				type: "geometry",
				kind: "fill",
				vertices: vertices.flat(),
				count: vertices.length
			});
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
	arc(id, center, fromDir, toDir) {
		const existing = this._store.get(id);
		if (existing) {
			this._world.setComponent(existing._e, {
				type: "position3",
				x: center[0],
				y: center[1],
				z: center[2]
			});
			this._world.setComponent(existing._e, {
				type: "geometry",
				kind: "arc",
				fromX: fromDir[0],
				fromY: fromDir[1],
				fromZ: fromDir[2],
				toX: toDir[0],
				toY: toDir[1],
				toZ: toDir[2],
				radius: .25
			});
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
	rightAngle(id, center, dirA, dirB) {
		const existing = this._store.get(id);
		if (existing) {
			this._world.setComponent(existing._e, {
				type: "position3",
				x: center[0],
				y: center[1],
				z: center[2]
			});
			this._world.setComponent(existing._e, {
				type: "geometry",
				kind: "rightAngle",
				dirAX: dirA[0],
				dirAY: dirA[1],
				dirAZ: dirA[2],
				dirBX: dirB[0],
				dirBY: dirB[1],
				dirBZ: dirB[2],
				size: .18
			});
			this._touch(id);
			return existing;
		}
		this._upsert(id);
		const { entity, gfx } = spawnRightAngle(this._world, this._resolve, id, center, dirA, dirB);
		this._register(gfx, entity);
		this._store.set(id, gfx);
		this._touch(id);
		return gfx;
	}
	surface(id, fn, uRange, vRange, opts = {}) {
		const existing = this._store.get(id);
		if (existing) {
			this._world.setComponent(existing._e, {
				type: "geometry",
				kind: "surface",
				fn,
				fnKey: fn.toString(),
				uMin: uRange[0],
				uMax: uRange[1],
				vMin: vRange[0],
				vMax: vRange[1],
				uSegments: opts.uSegments ?? 32,
				vSegments: opts.vSegments ?? 32,
				style: opts.style ?? "wireframe-face"
			});
			if (opts.color) this._world.patchComponent(existing._e, "appearance", { color: this._resolve(opts.color) });
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
	axes3d(opts = {}) {
		const existing = this._store.get("::axes3d");
		if (existing) {
			this._world.setComponent(existing._e, {
				type: "geometry",
				kind: "axes",
				length: opts.length ?? 4,
				arrowSize: opts.arrowSize ?? .2,
				symmetric: opts.symmetric ?? true,
				ticks: opts.ticks ?? false,
				basis: opts.basis ?? null
			});
			this._touch("::axes3d");
			return existing;
		}
		const id = "::axes3d";
		this._upsert(id);
		const { entity, gfx } = spawnAxes(this._world, this._resolve, opts);
		this._register(gfx, entity);
		this._store.set(id, gfx);
		this._touch(id);
		return gfx;
	}
	grid3d(opts = {}) {
		const id = opts.id ?? "::grid3d";
		const existing = this._store.get(id);
		if (existing) {
			this._world.setComponent(existing._e, {
				type: "geometry",
				kind: "grid",
				plane: opts.plane ?? "xz",
				spacing: opts.spacing ?? 1,
				size: opts.size ?? 10,
				basis: opts.basis ?? null
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
	frame3d(opts = {}) {
		const extent = opts.extent ?? 4;
		this.axes3d({
			length: extent,
			basis: opts.basis
		});
		this.grid3d({
			size: extent * 2,
			basis: opts.basis
		});
	}
	group(entities) {
		const grp = new THREE.Group();
		for (const e of entities) {
			const obj = e.object3d;
			if (obj) {
				this._boot.scene.remove(obj);
				grp.add(obj);
			}
		}
		this._boot.scene.add(grp);
		const entity = this._world.spawn();
		this._world.addComponent(entity, {
			type: "userId",
			value: `::group:${entity}`
		});
		const gfx = new Gfx3dImpl(this._world, entity, this._resolve);
		gfx._bindThreeObject(grp);
		return gfx;
	}
	camera(config, opts = {}) {
		const duration = opts.duration ?? .8;
		const cam = this._boot.camera;
		if (duration <= 0) {
			if (config.position) cam.position.set(...config.position);
			if (config.target) this._boot.controls.target.set(...config.target);
			if (config.fov && cam instanceof THREE.PerspectiveCamera) {
				cam.fov = config.fov;
				cam.updateProjectionMatrix();
			}
			this._boot.controls.update();
			this._camAnim = null;
			return;
		}
		const cp = this._boot.camera.position;
		const ct = this._boot.controls.target;
		const fromPos = [
			cp.x,
			cp.y,
			cp.z
		];
		const fromTgt = [
			ct.x,
			ct.y,
			ct.z
		];
		const toPos = config.position ?? fromPos;
		const toTgt = config.target ?? fromTgt;
		this._camAnim = {
			fromPos,
			fromTgt,
			toPos,
			toTgt,
			startMs: performance.now(),
			duration,
			easing: EASINGS[opts.easing ?? "ease-out"] ?? EASINGS["ease-out"]
		};
	}
	view(opts) {
		const { camera, controls } = this._boot;
		const dx = opts.x ? opts.x[1] - opts.x[0] : 10;
		const dy = opts.y ? opts.y[1] - opts.y[0] : 10;
		const dz = opts.z ? opts.z[1] - opts.z[0] : 10;
		const dist = Math.max(dx, dy, dz, 1) * 1.5;
		camera.position.set(dist, dist * .6, dist);
		controls.target.set(opts.x ? (opts.x[0] + opts.x[1]) / 2 : 0, opts.y ? (opts.y[0] + opts.y[1]) / 2 : 0, opts.z ? (opts.z[0] + opts.z[1]) / 2 : 0);
		controls.update();
	}
	render(fn) {
		this._frameFn = fn;
	}
	steps(defs, opts = {}) {
		return createStepsController3d(this, defs, opts);
	}
	light(def) {
		const hex = this._resolve(def.color ?? "primary");
		switch (def.type) {
			case "ambient":
				this._boot.scene.add(new THREE.AmbientLight(hex, def.intensity ?? 1));
				break;
			case "directional": {
				const l = new THREE.DirectionalLight(hex, def.intensity ?? 3);
				if (def.position) l.position.set(...def.position);
				this._boot.scene.add(l);
				break;
			}
			case "point": {
				const l = new THREE.PointLight(hex, def.intensity ?? 3);
				if (def.position) l.position.set(...def.position);
				this._boot.scene.add(l);
				break;
			}
		}
	}
	use(system) {
		this._world.addSystem(system);
		return this;
	}
	get three() {
		return this._boot.scene;
	}
	get camera3d() {
		return this._boot.camera;
	}
	get renderer() {
		return this._boot.renderer;
	}
	[_Symbol$dispose]() {
		this._boot.renderer.setAnimationLoop(null);
		this._cleanupSys.disposeAll();
		this._toonGradient?.dispose();
		this._cssLabel.dispose();
		this._labelContainer.remove();
		this._boot.dispose();
		for (const fn of this._onDispose) fn();
	}
};

//#endregion
//#region vis3d/index.ts
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
async function canvas3d(selector, opts) {
	const container = typeof selector === "string" ? document.querySelector(selector) : selector;
	if (!container) throw new Error(`learnvis/vis3d: container not found: ${selector}`);
	const scene = new Scene3dImpl();
	await scene.init(container, opts ?? {});
	return scene;
}

//#endregion
export { CSSLabelSystem, CleanupSystem, GeometrySystem, Gfx3dImpl, MOODS, MaterialSystem, Scene3dImpl, TransformSystem, TransitionSystem, World, canvas3d, createColorResolver, createStepsController3d, resolveMood };