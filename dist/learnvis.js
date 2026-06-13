var LearnVis = (function(exports) {

Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

//#region vis/tokens.ts
/** 7 语义色 + 7 填充变体，全部使用 OKLCH 色彩空间 */
	const TOKENS = {
		primary: "oklch(0.52 0.18 68)",
		accent: "oklch(0.62 0.15 155)",
		danger: "oklch(0.48 0.18 22)",
		warning: "oklch(0.58 0.20 85)",
		info: "oklch(0.50 0.12 240)",
		muted: "oklch(0.55 0.02 65)",
		success: "oklch(0.48 0.18 150)",
		fills: {
			primary: "oklch(0.88 0.06 68)",
			accent: "oklch(0.88 0.06 155)",
			danger: "oklch(0.88 0.04 22)",
			warning: "oklch(0.90 0.08 85)",
			info: "oklch(0.88 0.04 240)",
			muted: "oklch(0.92 0.01 75)",
			success: "oklch(0.88 0.06 150)"
		}
	};
	const COLORS = {
		primary: TOKENS.primary,
		accent: TOKENS.accent,
		danger: TOKENS.danger,
		warning: TOKENS.warning,
		info: TOKENS.info,
		muted: TOKENS.muted,
		success: TOKENS.success
	};
	/** 给 OKLCH 颜色附加透明度，兼容非 oklch 颜色原样返回 */
	const alpha = (c, pct = 15) => {
		const color = COLORS[c] || TOKENS.fills[c] || c;
		if (!color.startsWith("oklch(")) return color;
		const a = (pct / 100).toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
		return color.replace(/ \/ [\d.]+\s*\)$/, "").replace(/\)$/, ` / ${a})`);
	};
	/** 统一调色板工厂：每个语义色返回 { fg, bg, a(pct) } */
	const palette = () => ({
		dim: {
			fg: TOKENS.muted,
			bg: TOKENS.fills.muted,
			a: (p) => alpha(TOKENS.muted, p)
		},
		accent: {
			fg: TOKENS.accent,
			bg: TOKENS.fills.accent,
			a: (p) => alpha(TOKENS.accent, p)
		},
		danger: {
			fg: TOKENS.danger,
			bg: TOKENS.fills.danger,
			a: (p) => alpha(TOKENS.danger, p)
		},
		primary: {
			fg: TOKENS.primary,
			bg: TOKENS.fills.primary,
			a: (p) => alpha(TOKENS.primary, p)
		},
		success: {
			fg: TOKENS.success,
			bg: TOKENS.fills.success,
			a: (p) => alpha(TOKENS.success, p)
		},
		warning: {
			fg: TOKENS.warning,
			bg: TOKENS.fills.warning,
			a: (p) => alpha(TOKENS.warning, p)
		},
		info: {
			fg: TOKENS.info,
			bg: TOKENS.fills.info,
			a: (p) => alpha(TOKENS.info, p)
		},
		muted: {
			fg: TOKENS.muted,
			bg: TOKENS.fills.muted,
			a: (p) => alpha(TOKENS.muted, p)
		}
	});

//#endregion
//#region vis/geometry.ts
/** 欧氏距离 */
	const len = (dx, dy) => Math.sqrt(dx * dx + dy * dy);
	/**
	* 节点出射点：从 n 出发指向 (tx, ty) 的边与节点边界的交点。
	* dummy 节点按半径方向计算；普通节点按方向优先（竖直/水平边）。
	*/
	const exitPt = (n, tx, ty, { nW = 34, nH = 26, dR = 8, gap = 0 } = {}) => {
		if (n.t === "dummy") {
			const dx = tx - n.x, dy = ty - n.y, l = len(dx, dy);
			return {
				x: n.x + dx / l * dR,
				y: n.y + dy / l * dR
			};
		}
		const dy = ty - n.y;
		if (Math.abs(dy) > 10) return {
			x: n.x,
			y: n.y + Math.sign(dy) * (nH / 2)
		};
		return {
			x: n.x + Math.sign(tx - n.x) * (nW / 2),
			y: n.y
		};
	};
	/**
	* 节点入射点：从 (fx, fy) 进入节点 n 的边与节点边界的交点。
	* 与 exitPt 对称，但 gap 控制边与节点边界的间距。
	*/
	const entryPt = (n, fx, fy, { nW = 34, nH = 26, dR = 8, gap = 0 } = {}) => {
		if (n.t === "dummy") {
			const dx = n.x - fx, dy = n.y - fy, l = len(dx, dy);
			return {
				x: n.x - dx / l * (dR + gap),
				y: n.y - dy / l * (dR + gap)
			};
		}
		const dy = n.y - fy;
		if (Math.abs(dy) > 10) return {
			x: n.x,
			y: n.y - Math.sign(dy) * (nH / 2 + gap)
		};
		return {
			x: n.x - Math.sign(n.x - fx) * (nW / 2 + gap),
			y: n.y
		};
	};
	/** 获取一组节点的包围盒 { mx, Mx, my, My }，pad 控制外扩距离 */
	const getBounds = (nodes, { nW = 34, nH = 26, dR = 8, pad = 8 } = {}) => {
		if (!nodes.length) return null;
		const xs = nodes.map((n) => n.x - (n.t === "dummy" ? dR : nW / 2));
		const xe = nodes.map((n) => n.x + (n.t === "dummy" ? dR : nW / 2));
		const ys = nodes.map((n) => n.y - (n.t === "dummy" ? dR : nH / 2));
		const ye = nodes.map((n) => n.y + (n.t === "dummy" ? dR : nH / 2));
		return {
			mx: Math.min(...xs) - pad,
			Mx: Math.max(...xe) + pad,
			my: Math.min(...ys) - pad,
			My: Math.max(...ye) + pad
		};
	};
	/** 获取矩形中心点 */
	const centerIn = (rect) => ({
		x: rect.x + rect.w / 2,
		y: rect.y + rect.h / 2
	});
	/** 在容器内均匀分布 count 个项目，返回坐标数组 */
	const distribute = (count, container, { dir = "v", gap = 16, itemW, itemH, align = "center" } = {}) => {
		const iw = itemW || 40, ih = itemH || 30;
		const out = [];
		if (dir === "v") {
			const totalH = count * ih + (count - 1) * gap;
			const sy = container.y + (container.h - totalH) / 2;
			const cx = align === "center" ? container.x + container.w / 2 : align === "start" ? container.x + iw / 2 : container.x + container.w - iw / 2;
			for (let i = 0; i < count; i++) out.push({
				x: cx,
				y: sy + i * (ih + gap) + ih / 2
			});
		} else {
			const totalW = count * iw + (count - 1) * gap;
			const sx = container.x + (container.w - totalW) / 2;
			const cy = container.y + container.h / 2;
			for (let i = 0; i < count; i++) out.push({
				x: sx + i * (iw + gap) + iw / 2,
				y: cy
			});
		}
		return out;
	};

//#endregion
//#region node_modules/.pnpm/d3-dispatch@3.0.1/node_modules/d3-dispatch/src/dispatch.js
	var noop = { value: () => {} };
	function dispatch() {
		for (var i = 0, n = arguments.length, _ = {}, t; i < n; ++i) {
			if (!(t = arguments[i] + "") || t in _ || /[\s.]/.test(t)) throw new Error("illegal type: " + t);
			_[t] = [];
		}
		return new Dispatch(_);
	}
	function Dispatch(_) {
		this._ = _;
	}
	function parseTypenames$1(typenames, types) {
		return typenames.trim().split(/^|\s+/).map(function(t) {
			var name = "", i = t.indexOf(".");
			if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
			if (t && !types.hasOwnProperty(t)) throw new Error("unknown type: " + t);
			return {
				type: t,
				name
			};
		});
	}
	Dispatch.prototype = dispatch.prototype = {
		constructor: Dispatch,
		on: function(typename, callback) {
			var _ = this._, T = parseTypenames$1(typename + "", _), t, i = -1, n = T.length;
			if (arguments.length < 2) {
				while (++i < n) if ((t = (typename = T[i]).type) && (t = get$1(_[t], typename.name))) return t;
				return;
			}
			if (callback != null && typeof callback !== "function") throw new Error("invalid callback: " + callback);
			while (++i < n) if (t = (typename = T[i]).type) _[t] = set$1(_[t], typename.name, callback);
			else if (callback == null) for (t in _) _[t] = set$1(_[t], typename.name, null);
			return this;
		},
		copy: function() {
			var copy = {}, _ = this._;
			for (var t in _) copy[t] = _[t].slice();
			return new Dispatch(copy);
		},
		call: function(type, that) {
			if ((n = arguments.length - 2) > 0) for (var args = new Array(n), i = 0, n, t; i < n; ++i) args[i] = arguments[i + 2];
			if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
			for (t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
		},
		apply: function(type, that, args) {
			if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
			for (var t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
		}
	};
	function get$1(type, name) {
		for (var i = 0, n = type.length, c; i < n; ++i) if ((c = type[i]).name === name) return c.value;
	}
	function set$1(type, name, callback) {
		for (var i = 0, n = type.length; i < n; ++i) if (type[i].name === name) {
			type[i] = noop, type = type.slice(0, i).concat(type.slice(i + 1));
			break;
		}
		if (callback != null) type.push({
			name,
			value: callback
		});
		return type;
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/namespaces.js
	var xhtml = "http://www.w3.org/1999/xhtml";
	var namespaces_default = {
		svg: "http://www.w3.org/2000/svg",
		xhtml,
		xlink: "http://www.w3.org/1999/xlink",
		xml: "http://www.w3.org/XML/1998/namespace",
		xmlns: "http://www.w3.org/2000/xmlns/"
	};

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/namespace.js
	function namespace_default(name) {
		var prefix = name += "", i = prefix.indexOf(":");
		if (i >= 0 && (prefix = name.slice(0, i)) !== "xmlns") name = name.slice(i + 1);
		return namespaces_default.hasOwnProperty(prefix) ? {
			space: namespaces_default[prefix],
			local: name
		} : name;
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/creator.js
	function creatorInherit(name) {
		return function() {
			var document = this.ownerDocument, uri = this.namespaceURI;
			return uri === "http://www.w3.org/1999/xhtml" && document.documentElement.namespaceURI === "http://www.w3.org/1999/xhtml" ? document.createElement(name) : document.createElementNS(uri, name);
		};
	}
	function creatorFixed(fullname) {
		return function() {
			return this.ownerDocument.createElementNS(fullname.space, fullname.local);
		};
	}
	function creator_default(name) {
		var fullname = namespace_default(name);
		return (fullname.local ? creatorFixed : creatorInherit)(fullname);
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selector.js
	function none() {}
	function selector_default(selector) {
		return selector == null ? none : function() {
			return this.querySelector(selector);
		};
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/select.js
	function select_default$2(select) {
		if (typeof select !== "function") select = selector_default(select);
		for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
			if ("__data__" in node) subnode.__data__ = node.__data__;
			subgroup[i] = subnode;
		}
		return new Selection$1(subgroups, this._parents);
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/array.js
	function array(x) {
		return x == null ? [] : Array.isArray(x) ? x : Array.from(x);
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selectorAll.js
	function empty() {
		return [];
	}
	function selectorAll_default(selector) {
		return selector == null ? empty : function() {
			return this.querySelectorAll(selector);
		};
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/selectAll.js
	function arrayAll(select) {
		return function() {
			return array(select.apply(this, arguments));
		};
	}
	function selectAll_default$1(select) {
		if (typeof select === "function") select = arrayAll(select);
		else select = selectorAll_default(select);
		for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) if (node = group[i]) {
			subgroups.push(select.call(node, node.__data__, i, group));
			parents.push(node);
		}
		return new Selection$1(subgroups, parents);
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/matcher.js
	function matcher_default(selector) {
		return function() {
			return this.matches(selector);
		};
	}
	function childMatcher(selector) {
		return function(node) {
			return node.matches(selector);
		};
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/selectChild.js
	var find$1 = Array.prototype.find;
	function childFind(match) {
		return function() {
			return find$1.call(this.children, match);
		};
	}
	function childFirst() {
		return this.firstElementChild;
	}
	function selectChild_default(match) {
		return this.select(match == null ? childFirst : childFind(typeof match === "function" ? match : childMatcher(match)));
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/selectChildren.js
	var filter = Array.prototype.filter;
	function children() {
		return Array.from(this.children);
	}
	function childrenFilter(match) {
		return function() {
			return filter.call(this.children, match);
		};
	}
	function selectChildren_default(match) {
		return this.selectAll(match == null ? children : childrenFilter(typeof match === "function" ? match : childMatcher(match)));
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/filter.js
	function filter_default$1(match) {
		if (typeof match !== "function") match = matcher_default(match);
		for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) if ((node = group[i]) && match.call(node, node.__data__, i, group)) subgroup.push(node);
		return new Selection$1(subgroups, this._parents);
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/sparse.js
	function sparse_default(update) {
		return new Array(update.length);
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/enter.js
	function enter_default() {
		return new Selection$1(this._enter || this._groups.map(sparse_default), this._parents);
	}
	function EnterNode(parent, datum) {
		this.ownerDocument = parent.ownerDocument;
		this.namespaceURI = parent.namespaceURI;
		this._next = null;
		this._parent = parent;
		this.__data__ = datum;
	}
	EnterNode.prototype = {
		constructor: EnterNode,
		appendChild: function(child) {
			return this._parent.insertBefore(child, this._next);
		},
		insertBefore: function(child, next) {
			return this._parent.insertBefore(child, next);
		},
		querySelector: function(selector) {
			return this._parent.querySelector(selector);
		},
		querySelectorAll: function(selector) {
			return this._parent.querySelectorAll(selector);
		}
	};

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/constant.js
	function constant_default$2(x) {
		return function() {
			return x;
		};
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/data.js
	function bindIndex(parent, group, enter, update, exit, data) {
		var i = 0, node, groupLength = group.length, dataLength = data.length;
		for (; i < dataLength; ++i) if (node = group[i]) {
			node.__data__ = data[i];
			update[i] = node;
		} else enter[i] = new EnterNode(parent, data[i]);
		for (; i < groupLength; ++i) if (node = group[i]) exit[i] = node;
	}
	function bindKey(parent, group, enter, update, exit, data, key) {
		var i, node, nodeByKeyValue = /* @__PURE__ */ new Map(), groupLength = group.length, dataLength = data.length, keyValues = new Array(groupLength), keyValue;
		for (i = 0; i < groupLength; ++i) if (node = group[i]) {
			keyValues[i] = keyValue = key.call(node, node.__data__, i, group) + "";
			if (nodeByKeyValue.has(keyValue)) exit[i] = node;
			else nodeByKeyValue.set(keyValue, node);
		}
		for (i = 0; i < dataLength; ++i) {
			keyValue = key.call(parent, data[i], i, data) + "";
			if (node = nodeByKeyValue.get(keyValue)) {
				update[i] = node;
				node.__data__ = data[i];
				nodeByKeyValue.delete(keyValue);
			} else enter[i] = new EnterNode(parent, data[i]);
		}
		for (i = 0; i < groupLength; ++i) if ((node = group[i]) && nodeByKeyValue.get(keyValues[i]) === node) exit[i] = node;
	}
	function datum(node) {
		return node.__data__;
	}
	function data_default$1(value, key) {
		if (!arguments.length) return Array.from(this, datum);
		var bind = key ? bindKey : bindIndex, parents = this._parents, groups = this._groups;
		if (typeof value !== "function") value = constant_default$2(value);
		for (var m = groups.length, update = new Array(m), enter = new Array(m), exit = new Array(m), j = 0; j < m; ++j) {
			var parent = parents[j], group = groups[j], groupLength = group.length, data = arraylike(value.call(parent, parent && parent.__data__, j, parents)), dataLength = data.length, enterGroup = enter[j] = new Array(dataLength), updateGroup = update[j] = new Array(dataLength);
			bind(parent, group, enterGroup, updateGroup, exit[j] = new Array(groupLength), data, key);
			for (var i0 = 0, i1 = 0, previous, next; i0 < dataLength; ++i0) if (previous = enterGroup[i0]) {
				if (i0 >= i1) i1 = i0 + 1;
				while (!(next = updateGroup[i1]) && ++i1 < dataLength);
				previous._next = next || null;
			}
		}
		update = new Selection$1(update, parents);
		update._enter = enter;
		update._exit = exit;
		return update;
	}
	function arraylike(data) {
		return typeof data === "object" && "length" in data ? data : Array.from(data);
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/exit.js
	function exit_default() {
		return new Selection$1(this._exit || this._groups.map(sparse_default), this._parents);
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/join.js
	function join_default(onenter, onupdate, onexit) {
		var enter = this.enter(), update = this, exit = this.exit();
		if (typeof onenter === "function") {
			enter = onenter(enter);
			if (enter) enter = enter.selection();
		} else enter = enter.append(onenter + "");
		if (onupdate != null) {
			update = onupdate(update);
			if (update) update = update.selection();
		}
		if (onexit == null) exit.remove();
		else onexit(exit);
		return enter && update ? enter.merge(update).order() : update;
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/merge.js
	function merge_default$1(context) {
		var selection = context.selection ? context.selection() : context;
		for (var groups0 = this._groups, groups1 = selection._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) if (node = group0[i] || group1[i]) merge[i] = node;
		for (; j < m0; ++j) merges[j] = groups0[j];
		return new Selection$1(merges, this._parents);
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/order.js
	function order_default() {
		for (var groups = this._groups, j = -1, m = groups.length; ++j < m;) for (var group = groups[j], i = group.length - 1, next = group[i], node; --i >= 0;) if (node = group[i]) {
			if (next && node.compareDocumentPosition(next) ^ 4) next.parentNode.insertBefore(node, next);
			next = node;
		}
		return this;
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/sort.js
	function sort_default(compare) {
		if (!compare) compare = ascending;
		function compareNode(a, b) {
			return a && b ? compare(a.__data__, b.__data__) : !a - !b;
		}
		for (var groups = this._groups, m = groups.length, sortgroups = new Array(m), j = 0; j < m; ++j) {
			for (var group = groups[j], n = group.length, sortgroup = sortgroups[j] = new Array(n), node, i = 0; i < n; ++i) if (node = group[i]) sortgroup[i] = node;
			sortgroup.sort(compareNode);
		}
		return new Selection$1(sortgroups, this._parents).order();
	}
	function ascending(a, b) {
		return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/call.js
	function call_default() {
		var callback = arguments[0];
		arguments[0] = this;
		callback.apply(null, arguments);
		return this;
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/nodes.js
	function nodes_default() {
		return Array.from(this);
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/node.js
	function node_default() {
		for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) for (var group = groups[j], i = 0, n = group.length; i < n; ++i) {
			var node = group[i];
			if (node) return node;
		}
		return null;
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/size.js
	function size_default$1() {
		let size = 0;
		for (const node of this) ++size;
		return size;
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/empty.js
	function empty_default() {
		return !this.node();
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/each.js
	function each_default(callback) {
		for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) if (node = group[i]) callback.call(node, node.__data__, i, group);
		return this;
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/attr.js
	function attrRemove$1(name) {
		return function() {
			this.removeAttribute(name);
		};
	}
	function attrRemoveNS$1(fullname) {
		return function() {
			this.removeAttributeNS(fullname.space, fullname.local);
		};
	}
	function attrConstant$1(name, value) {
		return function() {
			this.setAttribute(name, value);
		};
	}
	function attrConstantNS$1(fullname, value) {
		return function() {
			this.setAttributeNS(fullname.space, fullname.local, value);
		};
	}
	function attrFunction$1(name, value) {
		return function() {
			var v = value.apply(this, arguments);
			if (v == null) this.removeAttribute(name);
			else this.setAttribute(name, v);
		};
	}
	function attrFunctionNS$1(fullname, value) {
		return function() {
			var v = value.apply(this, arguments);
			if (v == null) this.removeAttributeNS(fullname.space, fullname.local);
			else this.setAttributeNS(fullname.space, fullname.local, v);
		};
	}
	function attr_default$1(name, value) {
		var fullname = namespace_default(name);
		if (arguments.length < 2) {
			var node = this.node();
			return fullname.local ? node.getAttributeNS(fullname.space, fullname.local) : node.getAttribute(fullname);
		}
		return this.each((value == null ? fullname.local ? attrRemoveNS$1 : attrRemove$1 : typeof value === "function" ? fullname.local ? attrFunctionNS$1 : attrFunction$1 : fullname.local ? attrConstantNS$1 : attrConstant$1)(fullname, value));
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/window.js
	function window_default(node) {
		return node.ownerDocument && node.ownerDocument.defaultView || node.document && node || node.defaultView;
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/style.js
	function styleRemove$1(name) {
		return function() {
			this.style.removeProperty(name);
		};
	}
	function styleConstant$1(name, value, priority) {
		return function() {
			this.style.setProperty(name, value, priority);
		};
	}
	function styleFunction$1(name, value, priority) {
		return function() {
			var v = value.apply(this, arguments);
			if (v == null) this.style.removeProperty(name);
			else this.style.setProperty(name, v, priority);
		};
	}
	function style_default$1(name, value, priority) {
		return arguments.length > 1 ? this.each((value == null ? styleRemove$1 : typeof value === "function" ? styleFunction$1 : styleConstant$1)(name, value, priority == null ? "" : priority)) : styleValue(this.node(), name);
	}
	function styleValue(node, name) {
		return node.style.getPropertyValue(name) || window_default(node).getComputedStyle(node, null).getPropertyValue(name);
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/property.js
	function propertyRemove(name) {
		return function() {
			delete this[name];
		};
	}
	function propertyConstant(name, value) {
		return function() {
			this[name] = value;
		};
	}
	function propertyFunction(name, value) {
		return function() {
			var v = value.apply(this, arguments);
			if (v == null) delete this[name];
			else this[name] = v;
		};
	}
	function property_default(name, value) {
		return arguments.length > 1 ? this.each((value == null ? propertyRemove : typeof value === "function" ? propertyFunction : propertyConstant)(name, value)) : this.node()[name];
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/classed.js
	function classArray(string) {
		return string.trim().split(/^|\s+/);
	}
	function classList(node) {
		return node.classList || new ClassList(node);
	}
	function ClassList(node) {
		this._node = node;
		this._names = classArray(node.getAttribute("class") || "");
	}
	ClassList.prototype = {
		add: function(name) {
			if (this._names.indexOf(name) < 0) {
				this._names.push(name);
				this._node.setAttribute("class", this._names.join(" "));
			}
		},
		remove: function(name) {
			var i = this._names.indexOf(name);
			if (i >= 0) {
				this._names.splice(i, 1);
				this._node.setAttribute("class", this._names.join(" "));
			}
		},
		contains: function(name) {
			return this._names.indexOf(name) >= 0;
		}
	};
	function classedAdd(node, names) {
		var list = classList(node), i = -1, n = names.length;
		while (++i < n) list.add(names[i]);
	}
	function classedRemove(node, names) {
		var list = classList(node), i = -1, n = names.length;
		while (++i < n) list.remove(names[i]);
	}
	function classedTrue(names) {
		return function() {
			classedAdd(this, names);
		};
	}
	function classedFalse(names) {
		return function() {
			classedRemove(this, names);
		};
	}
	function classedFunction(names, value) {
		return function() {
			(value.apply(this, arguments) ? classedAdd : classedRemove)(this, names);
		};
	}
	function classed_default(name, value) {
		var names = classArray(name + "");
		if (arguments.length < 2) {
			var list = classList(this.node()), i = -1, n = names.length;
			while (++i < n) if (!list.contains(names[i])) return false;
			return true;
		}
		return this.each((typeof value === "function" ? classedFunction : value ? classedTrue : classedFalse)(names, value));
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/text.js
	function textRemove() {
		this.textContent = "";
	}
	function textConstant$1(value) {
		return function() {
			this.textContent = value;
		};
	}
	function textFunction$1(value) {
		return function() {
			var v = value.apply(this, arguments);
			this.textContent = v == null ? "" : v;
		};
	}
	function text_default$1(value) {
		return arguments.length ? this.each(value == null ? textRemove : (typeof value === "function" ? textFunction$1 : textConstant$1)(value)) : this.node().textContent;
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/html.js
	function htmlRemove() {
		this.innerHTML = "";
	}
	function htmlConstant(value) {
		return function() {
			this.innerHTML = value;
		};
	}
	function htmlFunction(value) {
		return function() {
			var v = value.apply(this, arguments);
			this.innerHTML = v == null ? "" : v;
		};
	}
	function html_default(value) {
		return arguments.length ? this.each(value == null ? htmlRemove : (typeof value === "function" ? htmlFunction : htmlConstant)(value)) : this.node().innerHTML;
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/raise.js
	function raise() {
		if (this.nextSibling) this.parentNode.appendChild(this);
	}
	function raise_default() {
		return this.each(raise);
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/lower.js
	function lower() {
		if (this.previousSibling) this.parentNode.insertBefore(this, this.parentNode.firstChild);
	}
	function lower_default() {
		return this.each(lower);
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/append.js
	function append_default(name) {
		var create = typeof name === "function" ? name : creator_default(name);
		return this.select(function() {
			return this.appendChild(create.apply(this, arguments));
		});
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/insert.js
	function constantNull() {
		return null;
	}
	function insert_default(name, before) {
		var create = typeof name === "function" ? name : creator_default(name), select = before == null ? constantNull : typeof before === "function" ? before : selector_default(before);
		return this.select(function() {
			return this.insertBefore(create.apply(this, arguments), select.apply(this, arguments) || null);
		});
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/remove.js
	function remove() {
		var parent = this.parentNode;
		if (parent) parent.removeChild(this);
	}
	function remove_default$2() {
		return this.each(remove);
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/clone.js
	function selection_cloneShallow() {
		var clone = this.cloneNode(false), parent = this.parentNode;
		return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
	}
	function selection_cloneDeep() {
		var clone = this.cloneNode(true), parent = this.parentNode;
		return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
	}
	function clone_default(deep) {
		return this.select(deep ? selection_cloneDeep : selection_cloneShallow);
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/datum.js
	function datum_default(value) {
		return arguments.length ? this.property("__data__", value) : this.node().__data__;
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/on.js
	function contextListener(listener) {
		return function(event) {
			listener.call(this, event, this.__data__);
		};
	}
	function parseTypenames(typenames) {
		return typenames.trim().split(/^|\s+/).map(function(t) {
			var name = "", i = t.indexOf(".");
			if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
			return {
				type: t,
				name
			};
		});
	}
	function onRemove(typename) {
		return function() {
			var on = this.__on;
			if (!on) return;
			for (var j = 0, i = -1, m = on.length, o; j < m; ++j) if (o = on[j], (!typename.type || o.type === typename.type) && o.name === typename.name) this.removeEventListener(o.type, o.listener, o.options);
			else on[++i] = o;
			if (++i) on.length = i;
			else delete this.__on;
		};
	}
	function onAdd(typename, value, options) {
		return function() {
			var on = this.__on, o, listener = contextListener(value);
			if (on) {
				for (var j = 0, m = on.length; j < m; ++j) if ((o = on[j]).type === typename.type && o.name === typename.name) {
					this.removeEventListener(o.type, o.listener, o.options);
					this.addEventListener(o.type, o.listener = listener, o.options = options);
					o.value = value;
					return;
				}
			}
			this.addEventListener(typename.type, listener, options);
			o = {
				type: typename.type,
				name: typename.name,
				value,
				listener,
				options
			};
			if (!on) this.__on = [o];
			else on.push(o);
		};
	}
	function on_default$1(typename, value, options) {
		var typenames = parseTypenames(typename + ""), i, n = typenames.length, t;
		if (arguments.length < 2) {
			var on = this.node().__on;
			if (on) {
				for (var j = 0, m = on.length, o; j < m; ++j) for (i = 0, o = on[j]; i < n; ++i) if ((t = typenames[i]).type === o.type && t.name === o.name) return o.value;
			}
			return;
		}
		on = value ? onAdd : onRemove;
		for (i = 0; i < n; ++i) this.each(on(typenames[i], value, options));
		return this;
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/dispatch.js
	function dispatchEvent(node, type, params) {
		var window = window_default(node), event = window.CustomEvent;
		if (typeof event === "function") event = new event(type, params);
		else {
			event = window.document.createEvent("Event");
			if (params) event.initEvent(type, params.bubbles, params.cancelable), event.detail = params.detail;
			else event.initEvent(type, false, false);
		}
		node.dispatchEvent(event);
	}
	function dispatchConstant(type, params) {
		return function() {
			return dispatchEvent(this, type, params);
		};
	}
	function dispatchFunction(type, params) {
		return function() {
			return dispatchEvent(this, type, params.apply(this, arguments));
		};
	}
	function dispatch_default(type, params) {
		return this.each((typeof params === "function" ? dispatchFunction : dispatchConstant)(type, params));
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/iterator.js
	function* iterator_default() {
		for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) if (node = group[i]) yield node;
	}

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/index.js
	var root = [null];
	function Selection$1(groups, parents) {
		this._groups = groups;
		this._parents = parents;
	}
	function selection() {
		return new Selection$1([[document.documentElement]], root);
	}
	function selection_selection() {
		return this;
	}
	Selection$1.prototype = selection.prototype = {
		constructor: Selection$1,
		select: select_default$2,
		selectAll: selectAll_default$1,
		selectChild: selectChild_default,
		selectChildren: selectChildren_default,
		filter: filter_default$1,
		data: data_default$1,
		enter: enter_default,
		exit: exit_default,
		join: join_default,
		merge: merge_default$1,
		selection: selection_selection,
		order: order_default,
		sort: sort_default,
		call: call_default,
		nodes: nodes_default,
		node: node_default,
		size: size_default$1,
		empty: empty_default,
		each: each_default,
		attr: attr_default$1,
		style: style_default$1,
		property: property_default,
		classed: classed_default,
		text: text_default$1,
		html: html_default,
		raise: raise_default,
		lower: lower_default,
		append: append_default,
		insert: insert_default,
		remove: remove_default$2,
		clone: clone_default,
		datum: datum_default,
		on: on_default$1,
		dispatch: dispatch_default,
		[Symbol.iterator]: iterator_default
	};

//#endregion
//#region node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/select.js
	function select_default$1(selector) {
		return typeof selector === "string" ? new Selection$1([[document.querySelector(selector)]], [document.documentElement]) : new Selection$1([[selector]], root);
	}

//#endregion
//#region node_modules/.pnpm/d3-color@3.1.0/node_modules/d3-color/src/define.js
	function define_default(constructor, factory, prototype) {
		constructor.prototype = factory.prototype = prototype;
		prototype.constructor = constructor;
	}
	function extend(parent, definition) {
		var prototype = Object.create(parent.prototype);
		for (var key in definition) prototype[key] = definition[key];
		return prototype;
	}

//#endregion
//#region node_modules/.pnpm/d3-color@3.1.0/node_modules/d3-color/src/color.js
	function Color() {}
	var darker = .7;
	var brighter = 1 / darker;
	var reI = "\\s*([+-]?\\d+)\\s*", reN = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*", reP = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*", reHex = /^#([0-9a-f]{3,8})$/, reRgbInteger = new RegExp(`^rgb\\(${reI},${reI},${reI}\\)$`), reRgbPercent = new RegExp(`^rgb\\(${reP},${reP},${reP}\\)$`), reRgbaInteger = new RegExp(`^rgba\\(${reI},${reI},${reI},${reN}\\)$`), reRgbaPercent = new RegExp(`^rgba\\(${reP},${reP},${reP},${reN}\\)$`), reHslPercent = new RegExp(`^hsl\\(${reN},${reP},${reP}\\)$`), reHslaPercent = new RegExp(`^hsla\\(${reN},${reP},${reP},${reN}\\)$`);
	var named = {
		aliceblue: 15792383,
		antiquewhite: 16444375,
		aqua: 65535,
		aquamarine: 8388564,
		azure: 15794175,
		beige: 16119260,
		bisque: 16770244,
		black: 0,
		blanchedalmond: 16772045,
		blue: 255,
		blueviolet: 9055202,
		brown: 10824234,
		burlywood: 14596231,
		cadetblue: 6266528,
		chartreuse: 8388352,
		chocolate: 13789470,
		coral: 16744272,
		cornflowerblue: 6591981,
		cornsilk: 16775388,
		crimson: 14423100,
		cyan: 65535,
		darkblue: 139,
		darkcyan: 35723,
		darkgoldenrod: 12092939,
		darkgray: 11119017,
		darkgreen: 25600,
		darkgrey: 11119017,
		darkkhaki: 12433259,
		darkmagenta: 9109643,
		darkolivegreen: 5597999,
		darkorange: 16747520,
		darkorchid: 10040012,
		darkred: 9109504,
		darksalmon: 15308410,
		darkseagreen: 9419919,
		darkslateblue: 4734347,
		darkslategray: 3100495,
		darkslategrey: 3100495,
		darkturquoise: 52945,
		darkviolet: 9699539,
		deeppink: 16716947,
		deepskyblue: 49151,
		dimgray: 6908265,
		dimgrey: 6908265,
		dodgerblue: 2003199,
		firebrick: 11674146,
		floralwhite: 16775920,
		forestgreen: 2263842,
		fuchsia: 16711935,
		gainsboro: 14474460,
		ghostwhite: 16316671,
		gold: 16766720,
		goldenrod: 14329120,
		gray: 8421504,
		green: 32768,
		greenyellow: 11403055,
		grey: 8421504,
		honeydew: 15794160,
		hotpink: 16738740,
		indianred: 13458524,
		indigo: 4915330,
		ivory: 16777200,
		khaki: 15787660,
		lavender: 15132410,
		lavenderblush: 16773365,
		lawngreen: 8190976,
		lemonchiffon: 16775885,
		lightblue: 11393254,
		lightcoral: 15761536,
		lightcyan: 14745599,
		lightgoldenrodyellow: 16448210,
		lightgray: 13882323,
		lightgreen: 9498256,
		lightgrey: 13882323,
		lightpink: 16758465,
		lightsalmon: 16752762,
		lightseagreen: 2142890,
		lightskyblue: 8900346,
		lightslategray: 7833753,
		lightslategrey: 7833753,
		lightsteelblue: 11584734,
		lightyellow: 16777184,
		lime: 65280,
		limegreen: 3329330,
		linen: 16445670,
		magenta: 16711935,
		maroon: 8388608,
		mediumaquamarine: 6737322,
		mediumblue: 205,
		mediumorchid: 12211667,
		mediumpurple: 9662683,
		mediumseagreen: 3978097,
		mediumslateblue: 8087790,
		mediumspringgreen: 64154,
		mediumturquoise: 4772300,
		mediumvioletred: 13047173,
		midnightblue: 1644912,
		mintcream: 16121850,
		mistyrose: 16770273,
		moccasin: 16770229,
		navajowhite: 16768685,
		navy: 128,
		oldlace: 16643558,
		olive: 8421376,
		olivedrab: 7048739,
		orange: 16753920,
		orangered: 16729344,
		orchid: 14315734,
		palegoldenrod: 15657130,
		palegreen: 10025880,
		paleturquoise: 11529966,
		palevioletred: 14381203,
		papayawhip: 16773077,
		peachpuff: 16767673,
		peru: 13468991,
		pink: 16761035,
		plum: 14524637,
		powderblue: 11591910,
		purple: 8388736,
		rebeccapurple: 6697881,
		red: 16711680,
		rosybrown: 12357519,
		royalblue: 4286945,
		saddlebrown: 9127187,
		salmon: 16416882,
		sandybrown: 16032864,
		seagreen: 3050327,
		seashell: 16774638,
		sienna: 10506797,
		silver: 12632256,
		skyblue: 8900331,
		slateblue: 6970061,
		slategray: 7372944,
		slategrey: 7372944,
		snow: 16775930,
		springgreen: 65407,
		steelblue: 4620980,
		tan: 13808780,
		teal: 32896,
		thistle: 14204888,
		tomato: 16737095,
		turquoise: 4251856,
		violet: 15631086,
		wheat: 16113331,
		white: 16777215,
		whitesmoke: 16119285,
		yellow: 16776960,
		yellowgreen: 10145074
	};
	define_default(Color, color, {
		copy(channels) {
			return Object.assign(new this.constructor(), this, channels);
		},
		displayable() {
			return this.rgb().displayable();
		},
		hex: color_formatHex,
		formatHex: color_formatHex,
		formatHex8: color_formatHex8,
		formatHsl: color_formatHsl,
		formatRgb: color_formatRgb,
		toString: color_formatRgb
	});
	function color_formatHex() {
		return this.rgb().formatHex();
	}
	function color_formatHex8() {
		return this.rgb().formatHex8();
	}
	function color_formatHsl() {
		return hslConvert(this).formatHsl();
	}
	function color_formatRgb() {
		return this.rgb().formatRgb();
	}
	function color(format) {
		var m, l;
		format = (format + "").trim().toLowerCase();
		return (m = reHex.exec(format)) ? (l = m[1].length, m = parseInt(m[1], 16), l === 6 ? rgbn(m) : l === 3 ? new Rgb(m >> 8 & 15 | m >> 4 & 240, m >> 4 & 15 | m & 240, (m & 15) << 4 | m & 15, 1) : l === 8 ? rgba(m >> 24 & 255, m >> 16 & 255, m >> 8 & 255, (m & 255) / 255) : l === 4 ? rgba(m >> 12 & 15 | m >> 8 & 240, m >> 8 & 15 | m >> 4 & 240, m >> 4 & 15 | m & 240, ((m & 15) << 4 | m & 15) / 255) : null) : (m = reRgbInteger.exec(format)) ? new Rgb(m[1], m[2], m[3], 1) : (m = reRgbPercent.exec(format)) ? new Rgb(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, 1) : (m = reRgbaInteger.exec(format)) ? rgba(m[1], m[2], m[3], m[4]) : (m = reRgbaPercent.exec(format)) ? rgba(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, m[4]) : (m = reHslPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, 1) : (m = reHslaPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, m[4]) : named.hasOwnProperty(format) ? rgbn(named[format]) : format === "transparent" ? new Rgb(NaN, NaN, NaN, 0) : null;
	}
	function rgbn(n) {
		return new Rgb(n >> 16 & 255, n >> 8 & 255, n & 255, 1);
	}
	function rgba(r, g, b, a) {
		if (a <= 0) r = g = b = NaN;
		return new Rgb(r, g, b, a);
	}
	function rgbConvert(o) {
		if (!(o instanceof Color)) o = color(o);
		if (!o) return new Rgb();
		o = o.rgb();
		return new Rgb(o.r, o.g, o.b, o.opacity);
	}
	function rgb(r, g, b, opacity) {
		return arguments.length === 1 ? rgbConvert(r) : new Rgb(r, g, b, opacity == null ? 1 : opacity);
	}
	function Rgb(r, g, b, opacity) {
		this.r = +r;
		this.g = +g;
		this.b = +b;
		this.opacity = +opacity;
	}
	define_default(Rgb, rgb, extend(Color, {
		brighter(k) {
			k = k == null ? brighter : Math.pow(brighter, k);
			return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
		},
		darker(k) {
			k = k == null ? darker : Math.pow(darker, k);
			return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
		},
		rgb() {
			return this;
		},
		clamp() {
			return new Rgb(clampi(this.r), clampi(this.g), clampi(this.b), clampa(this.opacity));
		},
		displayable() {
			return -.5 <= this.r && this.r < 255.5 && -.5 <= this.g && this.g < 255.5 && -.5 <= this.b && this.b < 255.5 && 0 <= this.opacity && this.opacity <= 1;
		},
		hex: rgb_formatHex,
		formatHex: rgb_formatHex,
		formatHex8: rgb_formatHex8,
		formatRgb: rgb_formatRgb,
		toString: rgb_formatRgb
	}));
	function rgb_formatHex() {
		return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}`;
	}
	function rgb_formatHex8() {
		return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}${hex((isNaN(this.opacity) ? 1 : this.opacity) * 255)}`;
	}
	function rgb_formatRgb() {
		const a = clampa(this.opacity);
		return `${a === 1 ? "rgb(" : "rgba("}${clampi(this.r)}, ${clampi(this.g)}, ${clampi(this.b)}${a === 1 ? ")" : `, ${a})`}`;
	}
	function clampa(opacity) {
		return isNaN(opacity) ? 1 : Math.max(0, Math.min(1, opacity));
	}
	function clampi(value) {
		return Math.max(0, Math.min(255, Math.round(value) || 0));
	}
	function hex(value) {
		value = clampi(value);
		return (value < 16 ? "0" : "") + value.toString(16);
	}
	function hsla(h, s, l, a) {
		if (a <= 0) h = s = l = NaN;
		else if (l <= 0 || l >= 1) h = s = NaN;
		else if (s <= 0) h = NaN;
		return new Hsl(h, s, l, a);
	}
	function hslConvert(o) {
		if (o instanceof Hsl) return new Hsl(o.h, o.s, o.l, o.opacity);
		if (!(o instanceof Color)) o = color(o);
		if (!o) return new Hsl();
		if (o instanceof Hsl) return o;
		o = o.rgb();
		var r = o.r / 255, g = o.g / 255, b = o.b / 255, min = Math.min(r, g, b), max = Math.max(r, g, b), h = NaN, s = max - min, l = (max + min) / 2;
		if (s) {
			if (r === max) h = (g - b) / s + (g < b) * 6;
			else if (g === max) h = (b - r) / s + 2;
			else h = (r - g) / s + 4;
			s /= l < .5 ? max + min : 2 - max - min;
			h *= 60;
		} else s = l > 0 && l < 1 ? 0 : h;
		return new Hsl(h, s, l, o.opacity);
	}
	function hsl(h, s, l, opacity) {
		return arguments.length === 1 ? hslConvert(h) : new Hsl(h, s, l, opacity == null ? 1 : opacity);
	}
	function Hsl(h, s, l, opacity) {
		this.h = +h;
		this.s = +s;
		this.l = +l;
		this.opacity = +opacity;
	}
	define_default(Hsl, hsl, extend(Color, {
		brighter(k) {
			k = k == null ? brighter : Math.pow(brighter, k);
			return new Hsl(this.h, this.s, this.l * k, this.opacity);
		},
		darker(k) {
			k = k == null ? darker : Math.pow(darker, k);
			return new Hsl(this.h, this.s, this.l * k, this.opacity);
		},
		rgb() {
			var h = this.h % 360 + (this.h < 0) * 360, s = isNaN(h) || isNaN(this.s) ? 0 : this.s, l = this.l, m2 = l + (l < .5 ? l : 1 - l) * s, m1 = 2 * l - m2;
			return new Rgb(hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2), hsl2rgb(h, m1, m2), hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2), this.opacity);
		},
		clamp() {
			return new Hsl(clamph(this.h), clampt(this.s), clampt(this.l), clampa(this.opacity));
		},
		displayable() {
			return (0 <= this.s && this.s <= 1 || isNaN(this.s)) && 0 <= this.l && this.l <= 1 && 0 <= this.opacity && this.opacity <= 1;
		},
		formatHsl() {
			const a = clampa(this.opacity);
			return `${a === 1 ? "hsl(" : "hsla("}${clamph(this.h)}, ${clampt(this.s) * 100}%, ${clampt(this.l) * 100}%${a === 1 ? ")" : `, ${a})`}`;
		}
	}));
	function clamph(value) {
		value = (value || 0) % 360;
		return value < 0 ? value + 360 : value;
	}
	function clampt(value) {
		return Math.max(0, Math.min(1, value || 0));
	}
	function hsl2rgb(h, m1, m2) {
		return (h < 60 ? m1 + (m2 - m1) * h / 60 : h < 180 ? m2 : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60 : m1) * 255;
	}

//#endregion
//#region node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/basis.js
	function basis(t1, v0, v1, v2, v3) {
		var t2 = t1 * t1, t3 = t2 * t1;
		return ((1 - 3 * t1 + 3 * t2 - t3) * v0 + (4 - 6 * t2 + 3 * t3) * v1 + (1 + 3 * t1 + 3 * t2 - 3 * t3) * v2 + t3 * v3) / 6;
	}
	function basis_default(values) {
		var n = values.length - 1;
		return function(t) {
			var i = t <= 0 ? t = 0 : t >= 1 ? (t = 1, n - 1) : Math.floor(t * n), v1 = values[i], v2 = values[i + 1], v0 = i > 0 ? values[i - 1] : 2 * v1 - v2, v3 = i < n - 1 ? values[i + 2] : 2 * v2 - v1;
			return basis((t - i / n) * n, v0, v1, v2, v3);
		};
	}

//#endregion
//#region node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/basisClosed.js
	function basisClosed_default(values) {
		var n = values.length;
		return function(t) {
			var i = Math.floor(((t %= 1) < 0 ? ++t : t) * n), v0 = values[(i + n - 1) % n], v1 = values[i % n], v2 = values[(i + 1) % n], v3 = values[(i + 2) % n];
			return basis((t - i / n) * n, v0, v1, v2, v3);
		};
	}

//#endregion
//#region node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/constant.js
	var constant_default$1 = (x) => () => x;

//#endregion
//#region node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/color.js
	function linear(a, d) {
		return function(t) {
			return a + t * d;
		};
	}
	function exponential(a, b, y) {
		return a = Math.pow(a, y), b = Math.pow(b, y) - a, y = 1 / y, function(t) {
			return Math.pow(a + t * b, y);
		};
	}
	function gamma(y) {
		return (y = +y) === 1 ? nogamma : function(a, b) {
			return b - a ? exponential(a, b, y) : constant_default$1(isNaN(a) ? b : a);
		};
	}
	function nogamma(a, b) {
		var d = b - a;
		return d ? linear(a, d) : constant_default$1(isNaN(a) ? b : a);
	}

//#endregion
//#region node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/rgb.js
	var rgb_default = (function rgbGamma(y) {
		var color = gamma(y);
		function rgb$1(start, end) {
			var r = color((start = rgb(start)).r, (end = rgb(end)).r), g = color(start.g, end.g), b = color(start.b, end.b), opacity = nogamma(start.opacity, end.opacity);
			return function(t) {
				start.r = r(t);
				start.g = g(t);
				start.b = b(t);
				start.opacity = opacity(t);
				return start + "";
			};
		}
		rgb$1.gamma = rgbGamma;
		return rgb$1;
	})(1);
	function rgbSpline(spline) {
		return function(colors) {
			var n = colors.length, r = new Array(n), g = new Array(n), b = new Array(n), i, color;
			for (i = 0; i < n; ++i) {
				color = rgb(colors[i]);
				r[i] = color.r || 0;
				g[i] = color.g || 0;
				b[i] = color.b || 0;
			}
			r = spline(r);
			g = spline(g);
			b = spline(b);
			color.opacity = 1;
			return function(t) {
				color.r = r(t);
				color.g = g(t);
				color.b = b(t);
				return color + "";
			};
		};
	}
	var rgbBasis = rgbSpline(basis_default);
	var rgbBasisClosed = rgbSpline(basisClosed_default);

//#endregion
//#region node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/number.js
	function number_default(a, b) {
		return a = +a, b = +b, function(t) {
			return a * (1 - t) + b * t;
		};
	}

//#endregion
//#region node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/string.js
	var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g, reB = new RegExp(reA.source, "g");
	function zero(b) {
		return function() {
			return b;
		};
	}
	function one(b) {
		return function(t) {
			return b(t) + "";
		};
	}
	function string_default(a, b) {
		var bi = reA.lastIndex = reB.lastIndex = 0, am, bm, bs, i = -1, s = [], q = [];
		a = a + "", b = b + "";
		while ((am = reA.exec(a)) && (bm = reB.exec(b))) {
			if ((bs = bm.index) > bi) {
				bs = b.slice(bi, bs);
				if (s[i]) s[i] += bs;
				else s[++i] = bs;
			}
			if ((am = am[0]) === (bm = bm[0])) if (s[i]) s[i] += bm;
			else s[++i] = bm;
			else {
				s[++i] = null;
				q.push({
					i,
					x: number_default(am, bm)
				});
			}
			bi = reB.lastIndex;
		}
		if (bi < b.length) {
			bs = b.slice(bi);
			if (s[i]) s[i] += bs;
			else s[++i] = bs;
		}
		return s.length < 2 ? q[0] ? one(q[0].x) : zero(b) : (b = q.length, function(t) {
			for (var i = 0, o; i < b; ++i) s[(o = q[i]).i] = o.x(t);
			return s.join("");
		});
	}

//#endregion
//#region node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/transform/decompose.js
	var degrees = 180 / Math.PI;
	var identity$1 = {
		translateX: 0,
		translateY: 0,
		rotate: 0,
		skewX: 0,
		scaleX: 1,
		scaleY: 1
	};
	function decompose_default(a, b, c, d, e, f) {
		var scaleX, scaleY, skewX;
		if (scaleX = Math.sqrt(a * a + b * b)) a /= scaleX, b /= scaleX;
		if (skewX = a * c + b * d) c -= a * skewX, d -= b * skewX;
		if (scaleY = Math.sqrt(c * c + d * d)) c /= scaleY, d /= scaleY, skewX /= scaleY;
		if (a * d < b * c) a = -a, b = -b, skewX = -skewX, scaleX = -scaleX;
		return {
			translateX: e,
			translateY: f,
			rotate: Math.atan2(b, a) * degrees,
			skewX: Math.atan(skewX) * degrees,
			scaleX,
			scaleY
		};
	}

//#endregion
//#region node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/transform/parse.js
	var svgNode;
	function parseCss(value) {
		const m = new (typeof DOMMatrix === "function" ? DOMMatrix : WebKitCSSMatrix)(value + "");
		return m.isIdentity ? identity$1 : decompose_default(m.a, m.b, m.c, m.d, m.e, m.f);
	}
	function parseSvg(value) {
		if (value == null) return identity$1;
		if (!svgNode) svgNode = document.createElementNS("http://www.w3.org/2000/svg", "g");
		svgNode.setAttribute("transform", value);
		if (!(value = svgNode.transform.baseVal.consolidate())) return identity$1;
		value = value.matrix;
		return decompose_default(value.a, value.b, value.c, value.d, value.e, value.f);
	}

//#endregion
//#region node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/transform/index.js
	function interpolateTransform(parse, pxComma, pxParen, degParen) {
		function pop(s) {
			return s.length ? s.pop() + " " : "";
		}
		function translate(xa, ya, xb, yb, s, q) {
			if (xa !== xb || ya !== yb) {
				var i = s.push("translate(", null, pxComma, null, pxParen);
				q.push({
					i: i - 4,
					x: number_default(xa, xb)
				}, {
					i: i - 2,
					x: number_default(ya, yb)
				});
			} else if (xb || yb) s.push("translate(" + xb + pxComma + yb + pxParen);
		}
		function rotate(a, b, s, q) {
			if (a !== b) {
				if (a - b > 180) b += 360;
				else if (b - a > 180) a += 360;
				q.push({
					i: s.push(pop(s) + "rotate(", null, degParen) - 2,
					x: number_default(a, b)
				});
			} else if (b) s.push(pop(s) + "rotate(" + b + degParen);
		}
		function skewX(a, b, s, q) {
			if (a !== b) q.push({
				i: s.push(pop(s) + "skewX(", null, degParen) - 2,
				x: number_default(a, b)
			});
			else if (b) s.push(pop(s) + "skewX(" + b + degParen);
		}
		function scale(xa, ya, xb, yb, s, q) {
			if (xa !== xb || ya !== yb) {
				var i = s.push(pop(s) + "scale(", null, ",", null, ")");
				q.push({
					i: i - 4,
					x: number_default(xa, xb)
				}, {
					i: i - 2,
					x: number_default(ya, yb)
				});
			} else if (xb !== 1 || yb !== 1) s.push(pop(s) + "scale(" + xb + "," + yb + ")");
		}
		return function(a, b) {
			var s = [], q = [];
			a = parse(a), b = parse(b);
			translate(a.translateX, a.translateY, b.translateX, b.translateY, s, q);
			rotate(a.rotate, b.rotate, s, q);
			skewX(a.skewX, b.skewX, s, q);
			scale(a.scaleX, a.scaleY, b.scaleX, b.scaleY, s, q);
			a = b = null;
			return function(t) {
				var i = -1, n = q.length, o;
				while (++i < n) s[(o = q[i]).i] = o.x(t);
				return s.join("");
			};
		};
	}
	var interpolateTransformCss = interpolateTransform(parseCss, "px, ", "px)", "deg)");
	var interpolateTransformSvg = interpolateTransform(parseSvg, ", ", ")", ")");

//#endregion
//#region node_modules/.pnpm/d3-timer@3.0.1/node_modules/d3-timer/src/timer.js
	var frame = 0, timeout = 0, interval = 0, pokeDelay = 1e3, taskHead, taskTail, clockLast = 0, clockNow = 0, clockSkew = 0, clock = typeof performance === "object" && performance.now ? performance : Date, setFrame = typeof window === "object" && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function(f) {
		setTimeout(f, 17);
	};
	function now() {
		return clockNow || (setFrame(clearNow), clockNow = clock.now() + clockSkew);
	}
	function clearNow() {
		clockNow = 0;
	}
	function Timer() {
		this._call = this._time = this._next = null;
	}
	Timer.prototype = timer.prototype = {
		constructor: Timer,
		restart: function(callback, delay, time) {
			if (typeof callback !== "function") throw new TypeError("callback is not a function");
			time = (time == null ? now() : +time) + (delay == null ? 0 : +delay);
			if (!this._next && taskTail !== this) {
				if (taskTail) taskTail._next = this;
				else taskHead = this;
				taskTail = this;
			}
			this._call = callback;
			this._time = time;
			sleep();
		},
		stop: function() {
			if (this._call) {
				this._call = null;
				this._time = Infinity;
				sleep();
			}
		}
	};
	function timer(callback, delay, time) {
		var t = new Timer();
		t.restart(callback, delay, time);
		return t;
	}
	function timerFlush() {
		now();
		++frame;
		var t = taskHead, e;
		while (t) {
			if ((e = clockNow - t._time) >= 0) t._call.call(void 0, e);
			t = t._next;
		}
		--frame;
	}
	function wake() {
		clockNow = (clockLast = clock.now()) + clockSkew;
		frame = timeout = 0;
		try {
			timerFlush();
		} finally {
			frame = 0;
			nap();
			clockNow = 0;
		}
	}
	function poke() {
		var now = clock.now(), delay = now - clockLast;
		if (delay > pokeDelay) clockSkew -= delay, clockLast = now;
	}
	function nap() {
		var t0, t1 = taskHead, t2, time = Infinity;
		while (t1) if (t1._call) {
			if (time > t1._time) time = t1._time;
			t0 = t1, t1 = t1._next;
		} else {
			t2 = t1._next, t1._next = null;
			t1 = t0 ? t0._next = t2 : taskHead = t2;
		}
		taskTail = t0;
		sleep(time);
	}
	function sleep(time) {
		if (frame) return;
		if (timeout) timeout = clearTimeout(timeout);
		if (time - clockNow > 24) {
			if (time < Infinity) timeout = setTimeout(wake, time - clock.now() - clockSkew);
			if (interval) interval = clearInterval(interval);
		} else {
			if (!interval) clockLast = clock.now(), interval = setInterval(poke, pokeDelay);
			frame = 1, setFrame(wake);
		}
	}

//#endregion
//#region node_modules/.pnpm/d3-timer@3.0.1/node_modules/d3-timer/src/timeout.js
	function timeout_default(callback, delay, time) {
		var t = new Timer();
		delay = delay == null ? 0 : +delay;
		t.restart((elapsed) => {
			t.stop();
			callback(elapsed + delay);
		}, delay, time);
		return t;
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/schedule.js
	var emptyOn = dispatch("start", "end", "cancel", "interrupt");
	var emptyTween = [];
	var CREATED = 0;
	var SCHEDULED = 1;
	var STARTING = 2;
	var STARTED = 3;
	var RUNNING = 4;
	var ENDING = 5;
	var ENDED = 6;
	function schedule_default(node, name, id, index, group, timing) {
		var schedules = node.__transition;
		if (!schedules) node.__transition = {};
		else if (id in schedules) return;
		create$1(node, id, {
			name,
			index,
			group,
			on: emptyOn,
			tween: emptyTween,
			time: timing.time,
			delay: timing.delay,
			duration: timing.duration,
			ease: timing.ease,
			timer: null,
			state: 0
		});
	}
	function init(node, id) {
		var schedule = get(node, id);
		if (schedule.state > 0) throw new Error("too late; already scheduled");
		return schedule;
	}
	function set(node, id) {
		var schedule = get(node, id);
		if (schedule.state > 3) throw new Error("too late; already running");
		return schedule;
	}
	function get(node, id) {
		var schedule = node.__transition;
		if (!schedule || !(schedule = schedule[id])) throw new Error("transition not found");
		return schedule;
	}
	function create$1(node, id, self) {
		var schedules = node.__transition, tween;
		schedules[id] = self;
		self.timer = timer(schedule, 0, self.time);
		function schedule(elapsed) {
			self.state = 1;
			self.timer.restart(start, self.delay, self.time);
			if (self.delay <= elapsed) start(elapsed - self.delay);
		}
		function start(elapsed) {
			var i, j, n, o;
			if (self.state !== 1) return stop();
			for (i in schedules) {
				o = schedules[i];
				if (o.name !== self.name) continue;
				if (o.state === 3) return timeout_default(start);
				if (o.state === 4) {
					o.state = 6;
					o.timer.stop();
					o.on.call("interrupt", node, node.__data__, o.index, o.group);
					delete schedules[i];
				} else if (+i < id) {
					o.state = 6;
					o.timer.stop();
					o.on.call("cancel", node, node.__data__, o.index, o.group);
					delete schedules[i];
				}
			}
			timeout_default(function() {
				if (self.state === 3) {
					self.state = 4;
					self.timer.restart(tick, self.delay, self.time);
					tick(elapsed);
				}
			});
			self.state = 2;
			self.on.call("start", node, node.__data__, self.index, self.group);
			if (self.state !== 2) return;
			self.state = 3;
			tween = new Array(n = self.tween.length);
			for (i = 0, j = -1; i < n; ++i) if (o = self.tween[i].value.call(node, node.__data__, self.index, self.group)) tween[++j] = o;
			tween.length = j + 1;
		}
		function tick(elapsed) {
			var t = elapsed < self.duration ? self.ease.call(null, elapsed / self.duration) : (self.timer.restart(stop), self.state = 5, 1), i = -1, n = tween.length;
			while (++i < n) tween[i].call(node, t);
			if (self.state === 5) {
				self.on.call("end", node, node.__data__, self.index, self.group);
				stop();
			}
		}
		function stop() {
			self.state = 6;
			self.timer.stop();
			delete schedules[id];
			for (var i in schedules) return;
			delete node.__transition;
		}
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/interrupt.js
	function interrupt_default$1(node, name) {
		var schedules = node.__transition, schedule, active, empty = true, i;
		if (!schedules) return;
		name = name == null ? null : name + "";
		for (i in schedules) {
			if ((schedule = schedules[i]).name !== name) {
				empty = false;
				continue;
			}
			active = schedule.state > 2 && schedule.state < 5;
			schedule.state = 6;
			schedule.timer.stop();
			schedule.on.call(active ? "interrupt" : "cancel", node, node.__data__, schedule.index, schedule.group);
			delete schedules[i];
		}
		if (empty) delete node.__transition;
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/selection/interrupt.js
	function interrupt_default(name) {
		return this.each(function() {
			interrupt_default$1(this, name);
		});
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/tween.js
	function tweenRemove(id, name) {
		var tween0, tween1;
		return function() {
			var schedule = set(this, id), tween = schedule.tween;
			if (tween !== tween0) {
				tween1 = tween0 = tween;
				for (var i = 0, n = tween1.length; i < n; ++i) if (tween1[i].name === name) {
					tween1 = tween1.slice();
					tween1.splice(i, 1);
					break;
				}
			}
			schedule.tween = tween1;
		};
	}
	function tweenFunction(id, name, value) {
		var tween0, tween1;
		if (typeof value !== "function") throw new Error();
		return function() {
			var schedule = set(this, id), tween = schedule.tween;
			if (tween !== tween0) {
				tween1 = (tween0 = tween).slice();
				for (var t = {
					name,
					value
				}, i = 0, n = tween1.length; i < n; ++i) if (tween1[i].name === name) {
					tween1[i] = t;
					break;
				}
				if (i === n) tween1.push(t);
			}
			schedule.tween = tween1;
		};
	}
	function tween_default(name, value) {
		var id = this._id;
		name += "";
		if (arguments.length < 2) {
			var tween = get(this.node(), id).tween;
			for (var i = 0, n = tween.length, t; i < n; ++i) if ((t = tween[i]).name === name) return t.value;
			return null;
		}
		return this.each((value == null ? tweenRemove : tweenFunction)(id, name, value));
	}
	function tweenValue(transition, name, value) {
		var id = transition._id;
		transition.each(function() {
			var schedule = set(this, id);
			(schedule.value || (schedule.value = {}))[name] = value.apply(this, arguments);
		});
		return function(node) {
			return get(node, id).value[name];
		};
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/interpolate.js
	function interpolate_default(a, b) {
		var c;
		return (typeof b === "number" ? number_default : b instanceof color ? rgb_default : (c = color(b)) ? (b = c, rgb_default) : string_default)(a, b);
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/attr.js
	function attrRemove(name) {
		return function() {
			this.removeAttribute(name);
		};
	}
	function attrRemoveNS(fullname) {
		return function() {
			this.removeAttributeNS(fullname.space, fullname.local);
		};
	}
	function attrConstant(name, interpolate, value1) {
		var string00, string1 = value1 + "", interpolate0;
		return function() {
			var string0 = this.getAttribute(name);
			return string0 === string1 ? null : string0 === string00 ? interpolate0 : interpolate0 = interpolate(string00 = string0, value1);
		};
	}
	function attrConstantNS(fullname, interpolate, value1) {
		var string00, string1 = value1 + "", interpolate0;
		return function() {
			var string0 = this.getAttributeNS(fullname.space, fullname.local);
			return string0 === string1 ? null : string0 === string00 ? interpolate0 : interpolate0 = interpolate(string00 = string0, value1);
		};
	}
	function attrFunction(name, interpolate, value) {
		var string00, string10, interpolate0;
		return function() {
			var string0, value1 = value(this), string1;
			if (value1 == null) return void this.removeAttribute(name);
			string0 = this.getAttribute(name);
			string1 = value1 + "";
			return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
		};
	}
	function attrFunctionNS(fullname, interpolate, value) {
		var string00, string10, interpolate0;
		return function() {
			var string0, value1 = value(this), string1;
			if (value1 == null) return void this.removeAttributeNS(fullname.space, fullname.local);
			string0 = this.getAttributeNS(fullname.space, fullname.local);
			string1 = value1 + "";
			return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
		};
	}
	function attr_default(name, value) {
		var fullname = namespace_default(name), i = fullname === "transform" ? interpolateTransformSvg : interpolate_default;
		return this.attrTween(name, typeof value === "function" ? (fullname.local ? attrFunctionNS : attrFunction)(fullname, i, tweenValue(this, "attr." + name, value)) : value == null ? (fullname.local ? attrRemoveNS : attrRemove)(fullname) : (fullname.local ? attrConstantNS : attrConstant)(fullname, i, value));
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/attrTween.js
	function attrInterpolate(name, i) {
		return function(t) {
			this.setAttribute(name, i.call(this, t));
		};
	}
	function attrInterpolateNS(fullname, i) {
		return function(t) {
			this.setAttributeNS(fullname.space, fullname.local, i.call(this, t));
		};
	}
	function attrTweenNS(fullname, value) {
		var t0, i0;
		function tween() {
			var i = value.apply(this, arguments);
			if (i !== i0) t0 = (i0 = i) && attrInterpolateNS(fullname, i);
			return t0;
		}
		tween._value = value;
		return tween;
	}
	function attrTween(name, value) {
		var t0, i0;
		function tween() {
			var i = value.apply(this, arguments);
			if (i !== i0) t0 = (i0 = i) && attrInterpolate(name, i);
			return t0;
		}
		tween._value = value;
		return tween;
	}
	function attrTween_default(name, value) {
		var key = "attr." + name;
		if (arguments.length < 2) return (key = this.tween(key)) && key._value;
		if (value == null) return this.tween(key, null);
		if (typeof value !== "function") throw new Error();
		var fullname = namespace_default(name);
		return this.tween(key, (fullname.local ? attrTweenNS : attrTween)(fullname, value));
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/delay.js
	function delayFunction(id, value) {
		return function() {
			init(this, id).delay = +value.apply(this, arguments);
		};
	}
	function delayConstant(id, value) {
		return value = +value, function() {
			init(this, id).delay = value;
		};
	}
	function delay_default(value) {
		var id = this._id;
		return arguments.length ? this.each((typeof value === "function" ? delayFunction : delayConstant)(id, value)) : get(this.node(), id).delay;
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/duration.js
	function durationFunction(id, value) {
		return function() {
			set(this, id).duration = +value.apply(this, arguments);
		};
	}
	function durationConstant(id, value) {
		return value = +value, function() {
			set(this, id).duration = value;
		};
	}
	function duration_default(value) {
		var id = this._id;
		return arguments.length ? this.each((typeof value === "function" ? durationFunction : durationConstant)(id, value)) : get(this.node(), id).duration;
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/ease.js
	function easeConstant(id, value) {
		if (typeof value !== "function") throw new Error();
		return function() {
			set(this, id).ease = value;
		};
	}
	function ease_default(value) {
		var id = this._id;
		return arguments.length ? this.each(easeConstant(id, value)) : get(this.node(), id).ease;
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/easeVarying.js
	function easeVarying(id, value) {
		return function() {
			var v = value.apply(this, arguments);
			if (typeof v !== "function") throw new Error();
			set(this, id).ease = v;
		};
	}
	function easeVarying_default(value) {
		if (typeof value !== "function") throw new Error();
		return this.each(easeVarying(this._id, value));
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/filter.js
	function filter_default(match) {
		if (typeof match !== "function") match = matcher_default(match);
		for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) if ((node = group[i]) && match.call(node, node.__data__, i, group)) subgroup.push(node);
		return new Transition(subgroups, this._parents, this._name, this._id);
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/merge.js
	function merge_default(transition) {
		if (transition._id !== this._id) throw new Error();
		for (var groups0 = this._groups, groups1 = transition._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) if (node = group0[i] || group1[i]) merge[i] = node;
		for (; j < m0; ++j) merges[j] = groups0[j];
		return new Transition(merges, this._parents, this._name, this._id);
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/on.js
	function start(name) {
		return (name + "").trim().split(/^|\s+/).every(function(t) {
			var i = t.indexOf(".");
			if (i >= 0) t = t.slice(0, i);
			return !t || t === "start";
		});
	}
	function onFunction(id, name, listener) {
		var on0, on1, sit = start(name) ? init : set;
		return function() {
			var schedule = sit(this, id), on = schedule.on;
			if (on !== on0) (on1 = (on0 = on).copy()).on(name, listener);
			schedule.on = on1;
		};
	}
	function on_default(name, listener) {
		var id = this._id;
		return arguments.length < 2 ? get(this.node(), id).on.on(name) : this.each(onFunction(id, name, listener));
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/remove.js
	function removeFunction(id) {
		return function() {
			var parent = this.parentNode;
			for (var i in this.__transition) if (+i !== id) return;
			if (parent) parent.removeChild(this);
		};
	}
	function remove_default$1() {
		return this.on("end.remove", removeFunction(this._id));
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/select.js
	function select_default(select) {
		var name = this._name, id = this._id;
		if (typeof select !== "function") select = selector_default(select);
		for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
			if ("__data__" in node) subnode.__data__ = node.__data__;
			subgroup[i] = subnode;
			schedule_default(subgroup[i], name, id, i, subgroup, get(node, id));
		}
		return new Transition(subgroups, this._parents, name, id);
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/selectAll.js
	function selectAll_default(select) {
		var name = this._name, id = this._id;
		if (typeof select !== "function") select = selectorAll_default(select);
		for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) if (node = group[i]) {
			for (var children = select.call(node, node.__data__, i, group), child, inherit = get(node, id), k = 0, l = children.length; k < l; ++k) if (child = children[k]) schedule_default(child, name, id, k, children, inherit);
			subgroups.push(children);
			parents.push(node);
		}
		return new Transition(subgroups, parents, name, id);
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/selection.js
	var Selection = selection.prototype.constructor;
	function selection_default() {
		return new Selection(this._groups, this._parents);
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/style.js
	function styleNull(name, interpolate) {
		var string00, string10, interpolate0;
		return function() {
			var string0 = styleValue(this, name), string1 = (this.style.removeProperty(name), styleValue(this, name));
			return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : interpolate0 = interpolate(string00 = string0, string10 = string1);
		};
	}
	function styleRemove(name) {
		return function() {
			this.style.removeProperty(name);
		};
	}
	function styleConstant(name, interpolate, value1) {
		var string00, string1 = value1 + "", interpolate0;
		return function() {
			var string0 = styleValue(this, name);
			return string0 === string1 ? null : string0 === string00 ? interpolate0 : interpolate0 = interpolate(string00 = string0, value1);
		};
	}
	function styleFunction(name, interpolate, value) {
		var string00, string10, interpolate0;
		return function() {
			var string0 = styleValue(this, name), value1 = value(this), string1 = value1 + "";
			if (value1 == null) string1 = value1 = (this.style.removeProperty(name), styleValue(this, name));
			return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
		};
	}
	function styleMaybeRemove(id, name) {
		var on0, on1, listener0, key = "style." + name, event = "end." + key, remove;
		return function() {
			var schedule = set(this, id), on = schedule.on, listener = schedule.value[key] == null ? remove || (remove = styleRemove(name)) : void 0;
			if (on !== on0 || listener0 !== listener) (on1 = (on0 = on).copy()).on(event, listener0 = listener);
			schedule.on = on1;
		};
	}
	function style_default(name, value, priority) {
		var i = (name += "") === "transform" ? interpolateTransformCss : interpolate_default;
		return value == null ? this.styleTween(name, styleNull(name, i)).on("end.style." + name, styleRemove(name)) : typeof value === "function" ? this.styleTween(name, styleFunction(name, i, tweenValue(this, "style." + name, value))).each(styleMaybeRemove(this._id, name)) : this.styleTween(name, styleConstant(name, i, value), priority).on("end.style." + name, null);
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/styleTween.js
	function styleInterpolate(name, i, priority) {
		return function(t) {
			this.style.setProperty(name, i.call(this, t), priority);
		};
	}
	function styleTween(name, value, priority) {
		var t, i0;
		function tween() {
			var i = value.apply(this, arguments);
			if (i !== i0) t = (i0 = i) && styleInterpolate(name, i, priority);
			return t;
		}
		tween._value = value;
		return tween;
	}
	function styleTween_default(name, value, priority) {
		var key = "style." + (name += "");
		if (arguments.length < 2) return (key = this.tween(key)) && key._value;
		if (value == null) return this.tween(key, null);
		if (typeof value !== "function") throw new Error();
		return this.tween(key, styleTween(name, value, priority == null ? "" : priority));
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/text.js
	function textConstant(value) {
		return function() {
			this.textContent = value;
		};
	}
	function textFunction(value) {
		return function() {
			var value1 = value(this);
			this.textContent = value1 == null ? "" : value1;
		};
	}
	function text_default(value) {
		return this.tween("text", typeof value === "function" ? textFunction(tweenValue(this, "text", value)) : textConstant(value == null ? "" : value + ""));
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/textTween.js
	function textInterpolate(i) {
		return function(t) {
			this.textContent = i.call(this, t);
		};
	}
	function textTween(value) {
		var t0, i0;
		function tween() {
			var i = value.apply(this, arguments);
			if (i !== i0) t0 = (i0 = i) && textInterpolate(i);
			return t0;
		}
		tween._value = value;
		return tween;
	}
	function textTween_default(value) {
		var key = "text";
		if (arguments.length < 1) return (key = this.tween(key)) && key._value;
		if (value == null) return this.tween(key, null);
		if (typeof value !== "function") throw new Error();
		return this.tween(key, textTween(value));
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/transition.js
	function transition_default$1() {
		var name = this._name, id0 = this._id, id1 = newId();
		for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) if (node = group[i]) {
			var inherit = get(node, id0);
			schedule_default(node, name, id1, i, group, {
				time: inherit.time + inherit.delay + inherit.duration,
				delay: 0,
				duration: inherit.duration,
				ease: inherit.ease
			});
		}
		return new Transition(groups, this._parents, name, id1);
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/end.js
	function end_default() {
		var on0, on1, that = this, id = that._id, size = that.size();
		return new Promise(function(resolve, reject) {
			var cancel = { value: reject }, end = { value: function() {
				if (--size === 0) resolve();
			} };
			that.each(function() {
				var schedule = set(this, id), on = schedule.on;
				if (on !== on0) {
					on1 = (on0 = on).copy();
					on1._.cancel.push(cancel);
					on1._.interrupt.push(cancel);
					on1._.end.push(end);
				}
				schedule.on = on1;
			});
			if (size === 0) resolve();
		});
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/index.js
	var id = 0;
	function Transition(groups, parents, name, id) {
		this._groups = groups;
		this._parents = parents;
		this._name = name;
		this._id = id;
	}
	function transition(name) {
		return selection().transition(name);
	}
	function newId() {
		return ++id;
	}
	var selection_prototype = selection.prototype;
	Transition.prototype = transition.prototype = {
		constructor: Transition,
		select: select_default,
		selectAll: selectAll_default,
		selectChild: selection_prototype.selectChild,
		selectChildren: selection_prototype.selectChildren,
		filter: filter_default,
		merge: merge_default,
		selection: selection_default,
		transition: transition_default$1,
		call: selection_prototype.call,
		nodes: selection_prototype.nodes,
		node: selection_prototype.node,
		size: selection_prototype.size,
		empty: selection_prototype.empty,
		each: selection_prototype.each,
		on: on_default,
		attr: attr_default,
		attrTween: attrTween_default,
		style: style_default,
		styleTween: styleTween_default,
		text: text_default,
		textTween: textTween_default,
		remove: remove_default$1,
		tween: tween_default,
		delay: delay_default,
		duration: duration_default,
		ease: ease_default,
		easeVarying: easeVarying_default,
		end: end_default,
		[Symbol.iterator]: selection_prototype[Symbol.iterator]
	};

//#endregion
//#region node_modules/.pnpm/d3-ease@3.0.1/node_modules/d3-ease/src/cubic.js
	function cubicInOut(t) {
		return ((t *= 2) <= 1 ? t * t * t : (t -= 2) * t * t + 2) / 2;
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/selection/transition.js
	var defaultTiming = {
		time: null,
		delay: 0,
		duration: 250,
		ease: cubicInOut
	};
	function inherit(node, id) {
		var timing;
		while (!(timing = node.__transition) || !(timing = timing[id])) if (!(node = node.parentNode)) throw new Error(`transition ${id} not found`);
		return timing;
	}
	function transition_default(name) {
		var id, timing;
		if (name instanceof Transition) id = name._id, name = name._name;
		else id = newId(), (timing = defaultTiming).time = now(), name = name == null ? null : name + "";
		for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) if (node = group[i]) schedule_default(node, name, id, i, group, timing || inherit(node, id));
		return new Transition(groups, this._parents, name, id);
	}

//#endregion
//#region node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/selection/index.js
	selection.prototype.interrupt = interrupt_default;
	selection.prototype.transition = transition_default;

//#endregion
//#region node_modules/.pnpm/d3-brush@3.0.0/node_modules/d3-brush/src/brush.js
	const { abs, max, min } = Math;
	function number1(e) {
		return [+e[0], +e[1]];
	}
	function number2(e) {
		return [number1(e[0]), number1(e[1])];
	}
	var X = {
		name: "x",
		handles: ["w", "e"].map(type),
		input: function(x, e) {
			return x == null ? null : [[+x[0], e[0][1]], [+x[1], e[1][1]]];
		},
		output: function(xy) {
			return xy && [xy[0][0], xy[1][0]];
		}
	};
	var Y = {
		name: "y",
		handles: ["n", "s"].map(type),
		input: function(y, e) {
			return y == null ? null : [[e[0][0], +y[0]], [e[1][0], +y[1]]];
		},
		output: function(xy) {
			return xy && [xy[0][1], xy[1][1]];
		}
	};
	var XY = {
		name: "xy",
		handles: [
			"n",
			"w",
			"e",
			"s",
			"nw",
			"ne",
			"sw",
			"se"
		].map(type),
		input: function(xy) {
			return xy == null ? null : number2(xy);
		},
		output: function(xy) {
			return xy;
		}
	};
	function type(t) {
		return { type: t };
	}

//#endregion
//#region node_modules/.pnpm/d3-force@3.0.0/node_modules/d3-force/src/center.js
	function center_default(x, y) {
		var nodes, strength = 1;
		if (x == null) x = 0;
		if (y == null) y = 0;
		function force() {
			var i, n = nodes.length, node, sx = 0, sy = 0;
			for (i = 0; i < n; ++i) node = nodes[i], sx += node.x, sy += node.y;
			for (sx = (sx / n - x) * strength, sy = (sy / n - y) * strength, i = 0; i < n; ++i) node = nodes[i], node.x -= sx, node.y -= sy;
		}
		force.initialize = function(_) {
			nodes = _;
		};
		force.x = function(_) {
			return arguments.length ? (x = +_, force) : x;
		};
		force.y = function(_) {
			return arguments.length ? (y = +_, force) : y;
		};
		force.strength = function(_) {
			return arguments.length ? (strength = +_, force) : strength;
		};
		return force;
	}

//#endregion
//#region node_modules/.pnpm/d3-quadtree@3.0.1/node_modules/d3-quadtree/src/add.js
	function add_default(d) {
		const x = +this._x.call(null, d), y = +this._y.call(null, d);
		return add(this.cover(x, y), x, y, d);
	}
	function add(tree, x, y, d) {
		if (isNaN(x) || isNaN(y)) return tree;
		var parent, node = tree._root, leaf = { data: d }, x0 = tree._x0, y0 = tree._y0, x1 = tree._x1, y1 = tree._y1, xm, ym, xp, yp, right, bottom, i, j;
		if (!node) return tree._root = leaf, tree;
		while (node.length) {
			if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm;
			else x1 = xm;
			if (bottom = y >= (ym = (y0 + y1) / 2)) y0 = ym;
			else y1 = ym;
			if (parent = node, !(node = node[i = bottom << 1 | right])) return parent[i] = leaf, tree;
		}
		xp = +tree._x.call(null, node.data);
		yp = +tree._y.call(null, node.data);
		if (x === xp && y === yp) return leaf.next = node, parent ? parent[i] = leaf : tree._root = leaf, tree;
		do {
			parent = parent ? parent[i] = new Array(4) : tree._root = new Array(4);
			if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm;
			else x1 = xm;
			if (bottom = y >= (ym = (y0 + y1) / 2)) y0 = ym;
			else y1 = ym;
		} while ((i = bottom << 1 | right) === (j = (yp >= ym) << 1 | xp >= xm));
		return parent[j] = node, parent[i] = leaf, tree;
	}
	function addAll(data) {
		var d, i, n = data.length, x, y, xz = new Array(n), yz = new Array(n), x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
		for (i = 0; i < n; ++i) {
			if (isNaN(x = +this._x.call(null, d = data[i])) || isNaN(y = +this._y.call(null, d))) continue;
			xz[i] = x;
			yz[i] = y;
			if (x < x0) x0 = x;
			if (x > x1) x1 = x;
			if (y < y0) y0 = y;
			if (y > y1) y1 = y;
		}
		if (x0 > x1 || y0 > y1) return this;
		this.cover(x0, y0).cover(x1, y1);
		for (i = 0; i < n; ++i) add(this, xz[i], yz[i], data[i]);
		return this;
	}

//#endregion
//#region node_modules/.pnpm/d3-quadtree@3.0.1/node_modules/d3-quadtree/src/cover.js
	function cover_default(x, y) {
		if (isNaN(x = +x) || isNaN(y = +y)) return this;
		var x0 = this._x0, y0 = this._y0, x1 = this._x1, y1 = this._y1;
		if (isNaN(x0)) {
			x1 = (x0 = Math.floor(x)) + 1;
			y1 = (y0 = Math.floor(y)) + 1;
		} else {
			var z = x1 - x0 || 1, node = this._root, parent, i;
			while (x0 > x || x >= x1 || y0 > y || y >= y1) {
				i = (y < y0) << 1 | x < x0;
				parent = new Array(4), parent[i] = node, node = parent, z *= 2;
				switch (i) {
					case 0:
						x1 = x0 + z, y1 = y0 + z;
						break;
					case 1:
						x0 = x1 - z, y1 = y0 + z;
						break;
					case 2:
						x1 = x0 + z, y0 = y1 - z;
						break;
					case 3:
						x0 = x1 - z, y0 = y1 - z;
						break;
				}
			}
			if (this._root && this._root.length) this._root = node;
		}
		this._x0 = x0;
		this._y0 = y0;
		this._x1 = x1;
		this._y1 = y1;
		return this;
	}

//#endregion
//#region node_modules/.pnpm/d3-quadtree@3.0.1/node_modules/d3-quadtree/src/data.js
	function data_default() {
		var data = [];
		this.visit(function(node) {
			if (!node.length) do
				data.push(node.data);
			while (node = node.next);
		});
		return data;
	}

//#endregion
//#region node_modules/.pnpm/d3-quadtree@3.0.1/node_modules/d3-quadtree/src/extent.js
	function extent_default(_) {
		return arguments.length ? this.cover(+_[0][0], +_[0][1]).cover(+_[1][0], +_[1][1]) : isNaN(this._x0) ? void 0 : [[this._x0, this._y0], [this._x1, this._y1]];
	}

//#endregion
//#region node_modules/.pnpm/d3-quadtree@3.0.1/node_modules/d3-quadtree/src/quad.js
	function quad_default(node, x0, y0, x1, y1) {
		this.node = node;
		this.x0 = x0;
		this.y0 = y0;
		this.x1 = x1;
		this.y1 = y1;
	}

//#endregion
//#region node_modules/.pnpm/d3-quadtree@3.0.1/node_modules/d3-quadtree/src/find.js
	function find_default(x, y, radius) {
		var data, x0 = this._x0, y0 = this._y0, x1, y1, x2, y2, x3 = this._x1, y3 = this._y1, quads = [], node = this._root, q, i;
		if (node) quads.push(new quad_default(node, x0, y0, x3, y3));
		if (radius == null) radius = Infinity;
		else {
			x0 = x - radius, y0 = y - radius;
			x3 = x + radius, y3 = y + radius;
			radius *= radius;
		}
		while (q = quads.pop()) {
			if (!(node = q.node) || (x1 = q.x0) > x3 || (y1 = q.y0) > y3 || (x2 = q.x1) < x0 || (y2 = q.y1) < y0) continue;
			if (node.length) {
				var xm = (x1 + x2) / 2, ym = (y1 + y2) / 2;
				quads.push(new quad_default(node[3], xm, ym, x2, y2), new quad_default(node[2], x1, ym, xm, y2), new quad_default(node[1], xm, y1, x2, ym), new quad_default(node[0], x1, y1, xm, ym));
				if (i = (y >= ym) << 1 | x >= xm) {
					q = quads[quads.length - 1];
					quads[quads.length - 1] = quads[quads.length - 1 - i];
					quads[quads.length - 1 - i] = q;
				}
			} else {
				var dx = x - +this._x.call(null, node.data), dy = y - +this._y.call(null, node.data), d2 = dx * dx + dy * dy;
				if (d2 < radius) {
					var d = Math.sqrt(radius = d2);
					x0 = x - d, y0 = y - d;
					x3 = x + d, y3 = y + d;
					data = node.data;
				}
			}
		}
		return data;
	}

//#endregion
//#region node_modules/.pnpm/d3-quadtree@3.0.1/node_modules/d3-quadtree/src/remove.js
	function remove_default(d) {
		if (isNaN(x = +this._x.call(null, d)) || isNaN(y = +this._y.call(null, d))) return this;
		var parent, node = this._root, retainer, previous, next, x0 = this._x0, y0 = this._y0, x1 = this._x1, y1 = this._y1, x, y, xm, ym, right, bottom, i, j;
		if (!node) return this;
		if (node.length) while (true) {
			if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm;
			else x1 = xm;
			if (bottom = y >= (ym = (y0 + y1) / 2)) y0 = ym;
			else y1 = ym;
			if (!(parent = node, node = node[i = bottom << 1 | right])) return this;
			if (!node.length) break;
			if (parent[i + 1 & 3] || parent[i + 2 & 3] || parent[i + 3 & 3]) retainer = parent, j = i;
		}
		while (node.data !== d) if (!(previous = node, node = node.next)) return this;
		if (next = node.next) delete node.next;
		if (previous) return next ? previous.next = next : delete previous.next, this;
		if (!parent) return this._root = next, this;
		next ? parent[i] = next : delete parent[i];
		if ((node = parent[0] || parent[1] || parent[2] || parent[3]) && node === (parent[3] || parent[2] || parent[1] || parent[0]) && !node.length) if (retainer) retainer[j] = node;
		else this._root = node;
		return this;
	}
	function removeAll(data) {
		for (var i = 0, n = data.length; i < n; ++i) this.remove(data[i]);
		return this;
	}

//#endregion
//#region node_modules/.pnpm/d3-quadtree@3.0.1/node_modules/d3-quadtree/src/root.js
	function root_default() {
		return this._root;
	}

//#endregion
//#region node_modules/.pnpm/d3-quadtree@3.0.1/node_modules/d3-quadtree/src/size.js
	function size_default() {
		var size = 0;
		this.visit(function(node) {
			if (!node.length) do
				++size;
			while (node = node.next);
		});
		return size;
	}

//#endregion
//#region node_modules/.pnpm/d3-quadtree@3.0.1/node_modules/d3-quadtree/src/visit.js
	function visit_default(callback) {
		var quads = [], q, node = this._root, child, x0, y0, x1, y1;
		if (node) quads.push(new quad_default(node, this._x0, this._y0, this._x1, this._y1));
		while (q = quads.pop()) if (!callback(node = q.node, x0 = q.x0, y0 = q.y0, x1 = q.x1, y1 = q.y1) && node.length) {
			var xm = (x0 + x1) / 2, ym = (y0 + y1) / 2;
			if (child = node[3]) quads.push(new quad_default(child, xm, ym, x1, y1));
			if (child = node[2]) quads.push(new quad_default(child, x0, ym, xm, y1));
			if (child = node[1]) quads.push(new quad_default(child, xm, y0, x1, ym));
			if (child = node[0]) quads.push(new quad_default(child, x0, y0, xm, ym));
		}
		return this;
	}

//#endregion
//#region node_modules/.pnpm/d3-quadtree@3.0.1/node_modules/d3-quadtree/src/visitAfter.js
	function visitAfter_default(callback) {
		var quads = [], next = [], q;
		if (this._root) quads.push(new quad_default(this._root, this._x0, this._y0, this._x1, this._y1));
		while (q = quads.pop()) {
			var node = q.node;
			if (node.length) {
				var child, x0 = q.x0, y0 = q.y0, x1 = q.x1, y1 = q.y1, xm = (x0 + x1) / 2, ym = (y0 + y1) / 2;
				if (child = node[0]) quads.push(new quad_default(child, x0, y0, xm, ym));
				if (child = node[1]) quads.push(new quad_default(child, xm, y0, x1, ym));
				if (child = node[2]) quads.push(new quad_default(child, x0, ym, xm, y1));
				if (child = node[3]) quads.push(new quad_default(child, xm, ym, x1, y1));
			}
			next.push(q);
		}
		while (q = next.pop()) callback(q.node, q.x0, q.y0, q.x1, q.y1);
		return this;
	}

//#endregion
//#region node_modules/.pnpm/d3-quadtree@3.0.1/node_modules/d3-quadtree/src/x.js
	function defaultX(d) {
		return d[0];
	}
	function x_default(_) {
		return arguments.length ? (this._x = _, this) : this._x;
	}

//#endregion
//#region node_modules/.pnpm/d3-quadtree@3.0.1/node_modules/d3-quadtree/src/y.js
	function defaultY(d) {
		return d[1];
	}
	function y_default(_) {
		return arguments.length ? (this._y = _, this) : this._y;
	}

//#endregion
//#region node_modules/.pnpm/d3-quadtree@3.0.1/node_modules/d3-quadtree/src/quadtree.js
	function quadtree(nodes, x, y) {
		var tree = new Quadtree(x == null ? defaultX : x, y == null ? defaultY : y, NaN, NaN, NaN, NaN);
		return nodes == null ? tree : tree.addAll(nodes);
	}
	function Quadtree(x, y, x0, y0, x1, y1) {
		this._x = x;
		this._y = y;
		this._x0 = x0;
		this._y0 = y0;
		this._x1 = x1;
		this._y1 = y1;
		this._root = void 0;
	}
	function leaf_copy(leaf) {
		var copy = { data: leaf.data }, next = copy;
		while (leaf = leaf.next) next = next.next = { data: leaf.data };
		return copy;
	}
	var treeProto = quadtree.prototype = Quadtree.prototype;
	treeProto.copy = function() {
		var copy = new Quadtree(this._x, this._y, this._x0, this._y0, this._x1, this._y1), node = this._root, nodes, child;
		if (!node) return copy;
		if (!node.length) return copy._root = leaf_copy(node), copy;
		nodes = [{
			source: node,
			target: copy._root = new Array(4)
		}];
		while (node = nodes.pop()) for (var i = 0; i < 4; ++i) if (child = node.source[i]) if (child.length) nodes.push({
			source: child,
			target: node.target[i] = new Array(4)
		});
		else node.target[i] = leaf_copy(child);
		return copy;
	};
	treeProto.add = add_default;
	treeProto.addAll = addAll;
	treeProto.cover = cover_default;
	treeProto.data = data_default;
	treeProto.extent = extent_default;
	treeProto.find = find_default;
	treeProto.remove = remove_default;
	treeProto.removeAll = removeAll;
	treeProto.root = root_default;
	treeProto.size = size_default;
	treeProto.visit = visit_default;
	treeProto.visitAfter = visitAfter_default;
	treeProto.x = x_default;
	treeProto.y = y_default;

//#endregion
//#region node_modules/.pnpm/d3-force@3.0.0/node_modules/d3-force/src/constant.js
	function constant_default(x) {
		return function() {
			return x;
		};
	}

//#endregion
//#region node_modules/.pnpm/d3-force@3.0.0/node_modules/d3-force/src/jiggle.js
	function jiggle_default(random) {
		return (random() - .5) * 1e-6;
	}

//#endregion
//#region node_modules/.pnpm/d3-force@3.0.0/node_modules/d3-force/src/collide.js
	function x$1(d) {
		return d.x + d.vx;
	}
	function y$1(d) {
		return d.y + d.vy;
	}
	function collide_default(radius) {
		var nodes, radii, random, strength = 1, iterations = 1;
		if (typeof radius !== "function") radius = constant_default(radius == null ? 1 : +radius);
		function force() {
			var i, n = nodes.length, tree, node, xi, yi, ri, ri2;
			for (var k = 0; k < iterations; ++k) {
				tree = quadtree(nodes, x$1, y$1).visitAfter(prepare);
				for (i = 0; i < n; ++i) {
					node = nodes[i];
					ri = radii[node.index], ri2 = ri * ri;
					xi = node.x + node.vx;
					yi = node.y + node.vy;
					tree.visit(apply);
				}
			}
			function apply(quad, x0, y0, x1, y1) {
				var data = quad.data, rj = quad.r, r = ri + rj;
				if (data) {
					if (data.index > node.index) {
						var x = xi - data.x - data.vx, y = yi - data.y - data.vy, l = x * x + y * y;
						if (l < r * r) {
							if (x === 0) x = jiggle_default(random), l += x * x;
							if (y === 0) y = jiggle_default(random), l += y * y;
							l = (r - (l = Math.sqrt(l))) / l * strength;
							node.vx += (x *= l) * (r = (rj *= rj) / (ri2 + rj));
							node.vy += (y *= l) * r;
							data.vx -= x * (r = 1 - r);
							data.vy -= y * r;
						}
					}
					return;
				}
				return x0 > xi + r || x1 < xi - r || y0 > yi + r || y1 < yi - r;
			}
		}
		function prepare(quad) {
			if (quad.data) return quad.r = radii[quad.data.index];
			for (var i = quad.r = 0; i < 4; ++i) if (quad[i] && quad[i].r > quad.r) quad.r = quad[i].r;
		}
		function initialize() {
			if (!nodes) return;
			var i, n = nodes.length, node;
			radii = new Array(n);
			for (i = 0; i < n; ++i) node = nodes[i], radii[node.index] = +radius(node, i, nodes);
		}
		force.initialize = function(_nodes, _random) {
			nodes = _nodes;
			random = _random;
			initialize();
		};
		force.iterations = function(_) {
			return arguments.length ? (iterations = +_, force) : iterations;
		};
		force.strength = function(_) {
			return arguments.length ? (strength = +_, force) : strength;
		};
		force.radius = function(_) {
			return arguments.length ? (radius = typeof _ === "function" ? _ : constant_default(+_), initialize(), force) : radius;
		};
		return force;
	}

//#endregion
//#region node_modules/.pnpm/d3-force@3.0.0/node_modules/d3-force/src/link.js
	function index(d) {
		return d.index;
	}
	function find(nodeById, nodeId) {
		var node = nodeById.get(nodeId);
		if (!node) throw new Error("node not found: " + nodeId);
		return node;
	}
	function link_default(links) {
		var id = index, strength = defaultStrength, strengths, distance = constant_default(30), distances, nodes, count, bias, random, iterations = 1;
		if (links == null) links = [];
		function defaultStrength(link) {
			return 1 / Math.min(count[link.source.index], count[link.target.index]);
		}
		function force(alpha) {
			for (var k = 0, n = links.length; k < iterations; ++k) for (var i = 0, link, source, target, x, y, l, b; i < n; ++i) {
				link = links[i], source = link.source, target = link.target;
				x = target.x + target.vx - source.x - source.vx || jiggle_default(random);
				y = target.y + target.vy - source.y - source.vy || jiggle_default(random);
				l = Math.sqrt(x * x + y * y);
				l = (l - distances[i]) / l * alpha * strengths[i];
				x *= l, y *= l;
				target.vx -= x * (b = bias[i]);
				target.vy -= y * b;
				source.vx += x * (b = 1 - b);
				source.vy += y * b;
			}
		}
		function initialize() {
			if (!nodes) return;
			var i, n = nodes.length, m = links.length, nodeById = new Map(nodes.map((d, i) => [id(d, i, nodes), d])), link;
			for (i = 0, count = new Array(n); i < m; ++i) {
				link = links[i], link.index = i;
				if (typeof link.source !== "object") link.source = find(nodeById, link.source);
				if (typeof link.target !== "object") link.target = find(nodeById, link.target);
				count[link.source.index] = (count[link.source.index] || 0) + 1;
				count[link.target.index] = (count[link.target.index] || 0) + 1;
			}
			for (i = 0, bias = new Array(m); i < m; ++i) link = links[i], bias[i] = count[link.source.index] / (count[link.source.index] + count[link.target.index]);
			strengths = new Array(m), initializeStrength();
			distances = new Array(m), initializeDistance();
		}
		function initializeStrength() {
			if (!nodes) return;
			for (var i = 0, n = links.length; i < n; ++i) strengths[i] = +strength(links[i], i, links);
		}
		function initializeDistance() {
			if (!nodes) return;
			for (var i = 0, n = links.length; i < n; ++i) distances[i] = +distance(links[i], i, links);
		}
		force.initialize = function(_nodes, _random) {
			nodes = _nodes;
			random = _random;
			initialize();
		};
		force.links = function(_) {
			return arguments.length ? (links = _, initialize(), force) : links;
		};
		force.id = function(_) {
			return arguments.length ? (id = _, force) : id;
		};
		force.iterations = function(_) {
			return arguments.length ? (iterations = +_, force) : iterations;
		};
		force.strength = function(_) {
			return arguments.length ? (strength = typeof _ === "function" ? _ : constant_default(+_), initializeStrength(), force) : strength;
		};
		force.distance = function(_) {
			return arguments.length ? (distance = typeof _ === "function" ? _ : constant_default(+_), initializeDistance(), force) : distance;
		};
		return force;
	}

//#endregion
//#region node_modules/.pnpm/d3-force@3.0.0/node_modules/d3-force/src/lcg.js
	const a = 1664525;
	const c = 1013904223;
	const m = 4294967296;
	function lcg_default() {
		let s = 1;
		return () => (s = (a * s + c) % m) / m;
	}

//#endregion
//#region node_modules/.pnpm/d3-force@3.0.0/node_modules/d3-force/src/simulation.js
	function x(d) {
		return d.x;
	}
	function y(d) {
		return d.y;
	}
	var initialRadius = 10, initialAngle = Math.PI * (3 - Math.sqrt(5));
	function simulation_default(nodes) {
		var simulation, alpha = 1, alphaMin = .001, alphaDecay = 1 - Math.pow(alphaMin, 1 / 300), alphaTarget = 0, velocityDecay = .6, forces = /* @__PURE__ */ new Map(), stepper = timer(step), event = dispatch("tick", "end"), random = lcg_default();
		if (nodes == null) nodes = [];
		function step() {
			tick();
			event.call("tick", simulation);
			if (alpha < alphaMin) {
				stepper.stop();
				event.call("end", simulation);
			}
		}
		function tick(iterations) {
			var i, n = nodes.length, node;
			if (iterations === void 0) iterations = 1;
			for (var k = 0; k < iterations; ++k) {
				alpha += (alphaTarget - alpha) * alphaDecay;
				forces.forEach(function(force) {
					force(alpha);
				});
				for (i = 0; i < n; ++i) {
					node = nodes[i];
					if (node.fx == null) node.x += node.vx *= velocityDecay;
					else node.x = node.fx, node.vx = 0;
					if (node.fy == null) node.y += node.vy *= velocityDecay;
					else node.y = node.fy, node.vy = 0;
				}
			}
			return simulation;
		}
		function initializeNodes() {
			for (var i = 0, n = nodes.length, node; i < n; ++i) {
				node = nodes[i], node.index = i;
				if (node.fx != null) node.x = node.fx;
				if (node.fy != null) node.y = node.fy;
				if (isNaN(node.x) || isNaN(node.y)) {
					var radius = initialRadius * Math.sqrt(.5 + i), angle = i * initialAngle;
					node.x = radius * Math.cos(angle);
					node.y = radius * Math.sin(angle);
				}
				if (isNaN(node.vx) || isNaN(node.vy)) node.vx = node.vy = 0;
			}
		}
		function initializeForce(force) {
			if (force.initialize) force.initialize(nodes, random);
			return force;
		}
		initializeNodes();
		return simulation = {
			tick,
			restart: function() {
				return stepper.restart(step), simulation;
			},
			stop: function() {
				return stepper.stop(), simulation;
			},
			nodes: function(_) {
				return arguments.length ? (nodes = _, initializeNodes(), forces.forEach(initializeForce), simulation) : nodes;
			},
			alpha: function(_) {
				return arguments.length ? (alpha = +_, simulation) : alpha;
			},
			alphaMin: function(_) {
				return arguments.length ? (alphaMin = +_, simulation) : alphaMin;
			},
			alphaDecay: function(_) {
				return arguments.length ? (alphaDecay = +_, simulation) : +alphaDecay;
			},
			alphaTarget: function(_) {
				return arguments.length ? (alphaTarget = +_, simulation) : alphaTarget;
			},
			velocityDecay: function(_) {
				return arguments.length ? (velocityDecay = 1 - _, simulation) : 1 - velocityDecay;
			},
			randomSource: function(_) {
				return arguments.length ? (random = _, forces.forEach(initializeForce), simulation) : random;
			},
			force: function(name, _) {
				return arguments.length > 1 ? (_ == null ? forces.delete(name) : forces.set(name, initializeForce(_)), simulation) : forces.get(name);
			},
			find: function(x, y, radius) {
				var i = 0, n = nodes.length, dx, dy, d2, node, closest;
				if (radius == null) radius = Infinity;
				else radius *= radius;
				for (i = 0; i < n; ++i) {
					node = nodes[i];
					dx = x - node.x;
					dy = y - node.y;
					d2 = dx * dx + dy * dy;
					if (d2 < radius) closest = node, radius = d2;
				}
				return closest;
			},
			on: function(name, _) {
				return arguments.length > 1 ? (event.on(name, _), simulation) : event.on(name);
			}
		};
	}

//#endregion
//#region node_modules/.pnpm/d3-force@3.0.0/node_modules/d3-force/src/manyBody.js
	function manyBody_default() {
		var nodes, node, random, alpha, strength = constant_default(-30), strengths, distanceMin2 = 1, distanceMax2 = Infinity, theta2 = .81;
		function force(_) {
			var i, n = nodes.length, tree = quadtree(nodes, x, y).visitAfter(accumulate);
			for (alpha = _, i = 0; i < n; ++i) node = nodes[i], tree.visit(apply);
		}
		function initialize() {
			if (!nodes) return;
			var i, n = nodes.length, node;
			strengths = new Array(n);
			for (i = 0; i < n; ++i) node = nodes[i], strengths[node.index] = +strength(node, i, nodes);
		}
		function accumulate(quad) {
			var strength = 0, q, c, weight = 0, x, y, i;
			if (quad.length) {
				for (x = y = i = 0; i < 4; ++i) if ((q = quad[i]) && (c = Math.abs(q.value))) strength += q.value, weight += c, x += c * q.x, y += c * q.y;
				quad.x = x / weight;
				quad.y = y / weight;
			} else {
				q = quad;
				q.x = q.data.x;
				q.y = q.data.y;
				do
					strength += strengths[q.data.index];
				while (q = q.next);
			}
			quad.value = strength;
		}
		function apply(quad, x1, _, x2) {
			if (!quad.value) return true;
			var x = quad.x - node.x, y = quad.y - node.y, w = x2 - x1, l = x * x + y * y;
			if (w * w / theta2 < l) {
				if (l < distanceMax2) {
					if (x === 0) x = jiggle_default(random), l += x * x;
					if (y === 0) y = jiggle_default(random), l += y * y;
					if (l < distanceMin2) l = Math.sqrt(distanceMin2 * l);
					node.vx += x * quad.value * alpha / l;
					node.vy += y * quad.value * alpha / l;
				}
				return true;
			} else if (quad.length || l >= distanceMax2) return;
			if (quad.data !== node || quad.next) {
				if (x === 0) x = jiggle_default(random), l += x * x;
				if (y === 0) y = jiggle_default(random), l += y * y;
				if (l < distanceMin2) l = Math.sqrt(distanceMin2 * l);
			}
			do
				if (quad.data !== node) {
					w = strengths[quad.data.index] * alpha / l;
					node.vx += x * w;
					node.vy += y * w;
				}
			while (quad = quad.next);
		}
		force.initialize = function(_nodes, _random) {
			nodes = _nodes;
			random = _random;
			initialize();
		};
		force.strength = function(_) {
			return arguments.length ? (strength = typeof _ === "function" ? _ : constant_default(+_), initialize(), force) : strength;
		};
		force.distanceMin = function(_) {
			return arguments.length ? (distanceMin2 = _ * _, force) : Math.sqrt(distanceMin2);
		};
		force.distanceMax = function(_) {
			return arguments.length ? (distanceMax2 = _ * _, force) : Math.sqrt(distanceMax2);
		};
		force.theta = function(_) {
			return arguments.length ? (theta2 = _ * _, force) : Math.sqrt(theta2);
		};
		return force;
	}

//#endregion
//#region node_modules/.pnpm/d3-zoom@3.0.0/node_modules/d3-zoom/src/transform.js
	function Transform(k, x, y) {
		this.k = k;
		this.x = x;
		this.y = y;
	}
	Transform.prototype = {
		constructor: Transform,
		scale: function(k) {
			return k === 1 ? this : new Transform(this.k * k, this.x, this.y);
		},
		translate: function(x, y) {
			return x === 0 & y === 0 ? this : new Transform(this.k, this.x + this.k * x, this.y + this.k * y);
		},
		apply: function(point) {
			return [point[0] * this.k + this.x, point[1] * this.k + this.y];
		},
		applyX: function(x) {
			return x * this.k + this.x;
		},
		applyY: function(y) {
			return y * this.k + this.y;
		},
		invert: function(location) {
			return [(location[0] - this.x) / this.k, (location[1] - this.y) / this.k];
		},
		invertX: function(x) {
			return (x - this.x) / this.k;
		},
		invertY: function(y) {
			return (y - this.y) / this.k;
		},
		rescaleX: function(x) {
			return x.copy().domain(x.range().map(this.invertX, this).map(x.invert, x));
		},
		rescaleY: function(y) {
			return y.copy().domain(y.range().map(this.invertY, this).map(y.invert, y));
		},
		toString: function() {
			return "translate(" + this.x + "," + this.y + ") scale(" + this.k + ")";
		}
	};
	var identity = new Transform(1, 0, 0);
	transform.prototype = Transform.prototype;
	function transform(node) {
		while (!node.__zoom) if (!(node = node.parentNode)) return identity;
		return node.__zoom;
	}

//#endregion
//#region vis/primitives.ts
/** 为形状绘制光晕背景（半透明圆角矩形） */
	const halo = (g, cx, cy, w, h, rx, { pad = 6, fill = "oklch(0.92 0.015 75)", stroke = "oklch(0.55 0.02 65 / 0.22)", strokeWidth = 1.5, id = "h" } = {}) => {
		const did = `halo-${id}`;
		g.selectAll(`[data-id="${did}"]`).remove();
		return g.append("rect").attr("data-id", did).attr("class", "h").attr("x", cx - w / 2 - pad).attr("y", cy - h / 2 - pad).attr("width", w + pad * 2).attr("height", h + pad * 2).attr("rx", rx + pad * .66).attr("fill", fill).attr("stroke", stroke).attr("stroke-width", strokeWidth);
	};
	/** SVG 文本标签，支持 paintOrder（描边扩边可读性） */
	const svgLabel = (g, x, y, text, { size = 14, fill = "var(--text)", weight = 700, anchor = "middle", font = "JetBrains Mono,monospace", paintOrder = false, id = "lbl" } = {}) => {
		const did = `label-${id}`;
		g.selectAll(`[data-id="${did}"]`).remove();
		const el = g.append("text").attr("data-id", did).attr("x", x).attr("y", y).attr("text-anchor", anchor).style("font-family", font).style("font-size", size + "px").style("font-weight", weight).style("fill", fill).text(text);
		if (paintOrder) el.style("paint-order", "stroke").style("stroke", "#fff").style("stroke-width", "3");
		return el;
	};
	const MARKER = {
		viewW: 12,
		viewH: 10,
		refX: 4,
		refY: 5,
		sw: 2
	};
	/** Distance from refX to marker tip in SVG pixels: (viewW – refX) × (markerW / viewW) */
	const markerTip = (m = MARKER) => (m.viewW - m.refX) * (m.sw * 7 / m.viewW);
	/** 定义 SVG marker 箭头工厂。每种颜色一个 marker，fill 显式 = 边的 stroke */
	const defineArrows = (svg, { sw = MARKER.sw, refX = MARKER.refX, refY = MARKER.refY } = {}) => {
		if (svg.select("defs").empty()) svg.append("defs");
		const defs = svg.select("defs");
		const mw = sw * 7;
		const _cache = {};
		const markerFor = (color) => {
			const c = color || "#888";
			if (!_cache[c]) {
				const id = "ar" + Object.keys(_cache).length;
				defs.append("marker").attr("id", id).attr("viewBox", "0 0 12 10").attr("refX", refX).attr("refY", refY).attr("markerWidth", mw).attr("markerHeight", mw).attr("markerUnits", "userSpaceOnUse").attr("orient", "auto-start-reverse").append("path").attr("d", "M0,0.5 L12,5 L0,9.5 Z").attr("fill", c);
				_cache[c] = id;
			}
			return `url(#${_cache[c]})`;
		};
		return { markerFor };
	};
	/** 在容器内创建 SVG + 4 图层（bg/edges/nodes/overlay）+ 标签覆盖层 */
	const createCanvas = (selector, width = 560, height = 400, margin = 48) => {
		const root = select_default$1(selector);
		root.style("position", "relative");
		const svg = root.append("svg").attr("viewBox", `0 0 ${width} ${height}`).attr("preserveAspectRatio", "xMidYMid meet").style("width", "100%").style("display", "block");
		return {
			svg,
			root,
			lbl: root.append("div").attr("class", "vis-labels").style("position", "absolute").style("top", "0").style("left", "0").style("width", "100%").style("height", "100%").style("pointer-events", "none"),
			bg: svg.append("g"),
			eG: svg.append("g"),
			nG: svg.append("g"),
			oG: svg.append("g"),
			W: width,
			H: height,
			M: margin
		};
	};
	const isD3Selection = (v) => {
		if (typeof v !== "object" || v === null) return false;
		if (!("node" in v)) return false;
		return typeof v.node === "function";
	};
	const isSVGGraphics = (v) => {
		if (v instanceof SVGGraphicsElement) return true;
		if (typeof v !== "object" || v === null) return false;
		if (!("getBBox" in v)) return false;
		return typeof v.getBBox === "function";
	};
	const emptySelection = () => select_default$1(document.createElement("div")).remove();
	const domLabel = (container, anchor, html, opts = {}) => {
		const svgNode = container.select("svg").node();
		if (!svgNode || !(svgNode instanceof SVGSVGElement)) return emptySelection();
		const { offsetX = 0, offsetY = 0, place = "above", gap = 8, className = "vlbl", style = {} } = opts;
		let b;
		if (isD3Selection(anchor)) {
			const el = anchor.node();
			if (el && isSVGGraphics(el)) {
				const bb = el.getBBox();
				b = {
					left: bb.x,
					top: bb.y,
					w: bb.width,
					h: bb.height,
					cx: bb.x + bb.width / 2,
					cy: bb.y + bb.height / 2
				};
			}
		} else if (isSVGGraphics(anchor)) {
			const bb = anchor.getBBox();
			b = {
				left: bb.x,
				top: bb.y,
				w: bb.width,
				h: bb.height,
				cx: bb.x + bb.width / 2,
				cy: bb.y + bb.height / 2
			};
		} else if (anchor && typeof anchor === "object" && "x" in anchor) {
			const a = anchor;
			const hw = (a.nW || a.w || 0) / 2, hh = (a.nH || a.h || 0) / 2;
			const bw = a.nW || a.w || 0, bh = a.nH || a.h || 0;
			if (a.r !== void 0) b = {
				left: a.x - a.r,
				top: a.y - a.r,
				w: a.r * 2,
				h: a.r * 2,
				cx: a.x,
				cy: a.y
			};
			else b = {
				left: a.x - hw,
				top: a.y - hh,
				w: bw,
				h: bh,
				cx: a.x,
				cy: a.y
			};
		} else return emptySelection();
		if (!b) return emptySelection();
		const vb = svgNode.viewBox.baseVal;
		const gx = (v) => v / vb.width * 100, gy = (v) => v / vb.height * 100;
		let left, top, tx = "translate(-50%, -50%)";
		if (place === "right") {
			left = gx(b.left + b.w + gap);
			top = gy(b.cy);
			tx = "translate(0%, -50%)";
		} else if (place === "left") {
			left = gx(b.left - gap);
			top = gy(b.cy);
			tx = "translate(-100%, -50%)";
		} else if (place === "below") {
			left = gx(b.cx);
			top = gy(b.top + b.h + gap);
			tx = "translate(-50%, 0%)";
		} else if (place === "above") {
			left = gx(b.cx);
			top = gy(b.top - gap);
			tx = "translate(-50%, -100%)";
		} else {
			left = gx(b.cx);
			top = gy(b.cy);
		}
		let inner = html;
		if (typeof window !== "undefined" && window.katex) {
			inner = html.replace(/\$\$([^$]+)\$\$/g, (_, m) => window.katex.renderToString(m, {
				throwOnError: false,
				displayMode: true
			}));
			inner = inner.replace(/\$([^$]+)\$/g, (_, m) => window.katex.renderToString(m, { throwOnError: false }));
		}
		const div = container.append("div").attr("class", className).style("position", "absolute").style("pointer-events", "none").style("left", left + offsetX / vb.width * 100 + "%").style("top", top + offsetY / vb.height * 100 + "%").style("transform", tx).html(inner);
		for (const [k, v] of Object.entries(style)) div.style(k, v);
		return div;
	};

//#endregion
//#region vis/shapes.ts
/** 绘制节点主体（普通节点矩形，dummy 节点圆形）+ 文本标签 */
	const drawNodeContent = (g, n, { w = 34, h = 26, dR = 8, rx = 5, fill = "var(--bg-node)", stroke = "var(--text-dim)", strokeW = 1.2, text, textSize = 11 } = {}) => {
		const display = text ?? n.label ?? n.id;
		if (n.t === "dummy") g.append("circle").attr("class", "shp").attr("cx", n.x).attr("cy", n.y).attr("r", dR).attr("fill", fill).attr("stroke", stroke).attr("stroke-width", strokeW);
		else g.append("rect").attr("class", "shp").attr("x", n.x - w / 2).attr("y", n.y - h / 2).attr("width", w).attr("height", h).attr("rx", rx).attr("fill", fill).attr("stroke", stroke).attr("stroke-width", strokeW);
		if (textSize > 0 && display) g.append("text").attr("x", n.x).attr("y", n.y).attr("text-anchor", "middle").attr("dominant-baseline", "central").style("font-family", "JetBrains Mono,monospace").style("font-size", textSize + "px").style("font-weight", 600).style("fill", "var(--text)").text(display);
	};
	/** 绘制 dummy 节点（圆形 + 可选光晕 + 侧边标签） */
	const drawDummy = (g, n, { dR = 8, pad = 4, fill = "#fff", stroke = "var(--text-dim)", strokeW = 1.2, text, textSize = 12, labelSide = "left", labelGap = 8, halo: showHalo = false, haloFill = alpha("accent", 12), haloStroke = alpha("accent", 22), haloStrokeW = 1.5 } = {}) => {
		const grp = g.append("g").attr("data-id", n.id || "");
		if (showHalo) grp.append("circle").attr("class", "h").attr("cx", n.x).attr("cy", n.y).attr("r", dR + pad).attr("fill", haloFill).attr("stroke", haloStroke).attr("stroke-width", haloStrokeW);
		grp.append("circle").attr("class", "shp").attr("cx", n.x).attr("cy", n.y).attr("r", dR).attr("fill", fill).attr("stroke", stroke).attr("stroke-width", strokeW);
		const display = text ?? n.label ?? n.id;
		if (textSize > 0 && display) {
			const dx = labelSide === "left" ? -(dR + labelGap) : labelSide === "right" ? dR + labelGap : 0;
			svgLabel(grp, n.x + dx, n.y + (labelSide === "left" || labelSide === "right" ? 5 : 0), display, {
				size: textSize,
				fill: "var(--text)",
				weight: 700,
				anchor: labelSide === "left" ? "end" : labelSide === "right" ? "start" : "middle"
			});
		}
		return grp;
	};
	const block = (g, { x, y, w, h, rx = 10 }, { label, fill = alpha("muted", 10), stroke = "var(--border)", strokeW = 1.5, textSize = 14, textFill = "oklch(0.25 0.02 60)", labelPos = "center", id = "blk" } = {}) => {
		const did = `block-${id}`;
		g.selectAll(`[data-id="${did}"]`).remove();
		g.selectAll(`[data-id="label-block-label-${id}"]`).remove();
		g.append("rect").attr("data-id", did).attr("x", x).attr("y", y).attr("width", w).attr("height", h).attr("rx", rx).attr("ry", rx).attr("fill", fill).attr("stroke", stroke).attr("stroke-width", strokeW);
		if (label) svgLabel(g, labelPos === "tl" ? x + 14 : x + w / 2, labelPos === "tl" ? y + 22 : y + h / 2 + 6, label, {
			size: textSize,
			fill: textFill,
			weight: 600,
			anchor: labelPos === "tl" ? "start" : "middle",
			id: `block-label-${id}`
		});
	};
	const compoundRect = (g, rect, { fill = "var(--bg-panel)", stroke = "var(--border)", strokeW = 1.5, id = "c", label, emph = false } = {}) => {
		const rx = rect.rx ?? 10, did = `compound-${id}`;
		const pSize = 10, pRx = 3, gap = 9;
		const pColor = emph ? "oklch(0.50 0.12 68)" : "var(--text-dim)";
		const pOp = emph ? .5 : .35;
		g.selectAll(`[data-id="${did}"]`).remove();
		g.append("rect").attr("data-id", did).attr("x", rect.x).attr("y", rect.y).attr("width", rect.w).attr("height", rect.h).attr("rx", rx).attr("ry", rx).attr("fill", fill).attr("stroke", stroke).attr("stroke-width", strokeW);
		if (label) {
			const lx = rect.x + 14, ly = rect.y + 22;
			g.selectAll(`[data-id="compound-pill-${id}"]`).remove();
			g.selectAll(`[data-id="compound-lbl-${id}"]`).remove();
			g.append("rect").attr("data-id", `compound-pill-${id}`).attr("x", lx).attr("y", ly - pSize / 2).attr("width", pSize).attr("height", pSize).attr("rx", pRx).attr("fill", pColor).attr("opacity", pOp);
			g.append("text").attr("data-id", `compound-lbl-${id}`).attr("x", lx + pSize + gap).attr("y", ly + .35 * 11).attr("fill", "var(--text-dim)").attr("font-size", 11).attr("font-weight", 500).attr("letter-spacing", "1.5px").style("font-family", "Inter,sans-serif").text(String(label).toUpperCase());
		}
	};
	const connect = (g, from, to, { dir = "v", color = "var(--text-dim)", strokeW = 2, dash = "", markerUrl, markerFor, id = "cn" } = {}) => {
		const m = markerUrl || (markerFor ? markerFor(color) : "url(#a)");
		let x1, y1, x2, y2;
		if (dir === "v") {
			x1 = from.x + from.w / 2;
			y1 = from.y + from.h;
			x2 = to.x + to.w / 2;
			y2 = to.y;
		} else {
			x1 = from.x + from.w;
			y1 = from.y + from.h / 2;
			x2 = to.x;
			y2 = to.y + to.h / 2;
		}
		g.selectAll(`[data-id="${id}"]`).remove();
		return g.append("line").attr("data-id", id).attr("x1", x1).attr("y1", y1).attr("x2", x2).attr("y2", y2).attr("stroke", color).attr("stroke-width", strokeW).attr("stroke-dasharray", dash || "none").attr("marker-end", m).style("color", color).attr("stroke-linecap", "round");
	};
	/** 绘制管线（多个方块 + 连接线），竖直排列 */
	const pipeline = (g, x, y, stages, { dir = "v", gap = 16, rx = 12, blockW = 300, blockH = 56, color = "var(--text-dim)", stroke, strokeW, textSize, textFill } = {}) => {
		let cy = y;
		const blocks = [];
		stages.forEach((s, i) => {
			const w = s.w || blockW, h = s.h || blockH;
			const rect = {
				x: x + (blockW - w) / 2,
				y: cy,
				w,
				h,
				rx
			};
			block(g, rect, {
				label: s.label,
				fill: s.fill || alpha("muted", 10),
				stroke: s.stroke || stroke || "var(--border)",
				strokeW: s.strokeW || strokeW || 1.5,
				textSize: s.textSize || textSize,
				textFill: s.textFill || textFill,
				id: `pipe-${i}`
			});
			blocks.push(rect);
			cy += h + gap;
		});
		for (let i = 0; i < blocks.length - 1; i++) connect(g, blocks[i], blocks[i + 1], {
			dir,
			color,
			strokeW: 2,
			id: `pipe-cn-${i}`
		});
		return blocks;
	};
	const group = (g, nodes, { pad = 10, rx = 12, fill = alpha("info", 8), stroke = TOKENS.info, strokeW = 2, dash = "5 3", label, textSize = 12, id = "g" } = {}) => {
		const b = getBounds(nodes, { pad });
		if (!b) return;
		const did = `group-${id}`;
		g.selectAll(`[data-id="${did}"]`).remove();
		g.append("rect").attr("data-id", did).attr("x", b.mx).attr("y", b.my).attr("width", b.Mx - b.mx).attr("height", b.My - b.my).attr("rx", rx).attr("fill", fill).attr("stroke", stroke).attr("stroke-width", strokeW).attr("stroke-dasharray", dash);
		if (label) svgLabel(g, b.mx + 14, b.my + 20, label, {
			size: textSize,
			fill: stroke,
			anchor: "start",
			id: `group-label-${id}`
		});
	};
	const lBend = (g, from, to, bendX, { stroke = "var(--text-dim)", strokeW = 1.3, dash = "", id, markerFor, markerUrl } = {}) => {
		const autoId = id || `${from.id || from.x}-${to.id || to.x}`;
		const d = `M${from.x},${from.y} L${bendX},${from.y} L${bendX},${to.y} L${to.x},${to.y}`;
		if (markerFor && !markerUrl) markerUrl = markerFor(stroke);
		g.selectAll(`[data-id="${autoId}"]`).remove();
		return g.append("path").attr("data-id", autoId).attr("d", d).attr("fill", "none").attr("stroke", stroke).attr("stroke-width", strokeW).attr("stroke-dasharray", dash || "none").attr("marker-end", markerUrl || null).style("color", stroke).attr("stroke-linecap", "round").attr("stroke-linejoin", "round");
	};
	const edgeLabel = (g, from, to, t, text, { size = 12, fill = "var(--text)", weight = 600, bgFill = alpha("accent", 18), bgPad = 6, bgWidth, id = "el" } = {}) => {
		const lx = from.x + (to.x - from.x) * t;
		const ly = from.y + (to.y - from.y) * t;
		const tw = bgWidth ?? text.length * size * .6 + bgPad * 2;
		const did = `elabel-bg-${id}`;
		g.selectAll(`[data-id="${did}"]`).remove();
		g.append("rect").attr("data-id", did).attr("x", lx - tw / 2).attr("y", ly - size / 2 - bgPad / 2).attr("width", tw).attr("height", size + bgPad).attr("rx", 4).attr("fill", bgFill);
		return svgLabel(g, lx, ly + 1, text, {
			size,
			fill,
			weight,
			id: `elabel-${id}`
		});
	};
	const boundBox = (g, { mx, my, Mx, My }, { rx = 10, fill = alpha("accent", 8), stroke = TOKENS.accent, strokeW = 2, dash = "5 3", id = "bb" } = {}) => {
		const did = `bbox-${id}`;
		g.selectAll(`[data-id="${did}"]`).remove();
		return g.append("rect").attr("data-id", did).attr("x", mx).attr("y", my).attr("width", Mx - mx).attr("height", My - my).attr("rx", rx).attr("fill", fill).attr("stroke", stroke).attr("stroke-width", strokeW).attr("stroke-dasharray", dash);
	};
	const createLayerGuides = (bg, layers, { x1 = 68, x2, stroke = "oklch(0.60 0.03 75 / 0.35)", strokeWidth = 1, dasharray = "4 6" } = {}) => {
		const xr = x2 ?? 492;
		for (let i = 1; i < layers.length; i++) {
			const y = (layers[i - 1] + layers[i]) / 2;
			const did = `guide-${i}`;
			bg.selectAll(`[data-id="${did}"]`).remove();
			bg.append("line").attr("data-id", did).attr("class", "ly").attr("x1", x1).attr("x2", xr).attr("y1", y).attr("y2", y).attr("stroke", stroke).attr("stroke-width", strokeWidth).attr("stroke-dasharray", dasharray);
		}
	};
	const crossEdge = (g, { from, to, fromRect, toRect, color = TOKENS.accent, strokeW = 2, dash = "", mode = "split", markerFor, dR = 8, portInset = 26, midOffset = 30, bendInset = 14, portFill, portStroke, id = "ce" }) => {
		const mk = markerFor ? markerFor(color) : "";
		const wallR = fromRect.x + fromRect.w, wallL = toRect.x;
		const ports = {
			fromExt: {
				x: wallR,
				y: from.y
			},
			toExt: {
				x: wallL,
				y: to.y
			},
			fromInt: {
				x: wallR - portInset,
				y: from.y
			},
			toInt: {
				x: wallL + portInset,
				y: to.y
			}
		};
		if (mode === "direct") {
			const ep = exitPt({
				...from,
				t: from.t || "node"
			}, to.x, to.y, { dR });
			const ip = entryPt({
				...to,
				t: to.t || "node"
			}, from.x, from.y, {
				dR,
				gap: 4
			});
			g.append("line").attr("data-id", id).attr("x1", ep.x).attr("y1", ep.y).attr("x2", ip.x).attr("y2", ip.y).attr("stroke", color).attr("stroke-width", strokeW).attr("stroke-dasharray", dash || "none").attr("stroke-linecap", "round").attr("marker-end", mk).style("color", color);
			return { ports: null };
		}
		if (mode === "split") {
			const pf = portFill || alpha(color, 70), ps = portStroke || color;
			[ports.fromExt, ports.toExt].forEach((p, i) => g.append("circle").attr("data-id", `${id}-p${i}`).attr("cx", p.x).attr("cy", p.y).attr("r", dR).attr("fill", color).attr("stroke", ps).attr("stroke-width", 1.2));
			[ports.fromInt, ports.toInt].forEach((p, i) => g.append("circle").attr("data-id", `${id}-p${i + 2}`).attr("cx", p.x).attr("cy", p.y).attr("r", dR).attr("fill", pf).attr("stroke", ps).attr("stroke-width", 1.2));
		}
		if (mode === "split" || mode === "restore") {
			const bx1 = wallR - bendInset, bx2 = wallL + bendInset;
			const my = (from.y + to.y) / 2;
			if (mode === "split") {
				const opt = (sId, dStr) => g.append("path").attr("data-id", sId).attr("fill", "none").attr("stroke", color).attr("stroke-width", strokeW).attr("stroke-dasharray", dStr).attr("stroke-linecap", "round").attr("stroke-linejoin", "round");
				opt(`${id}-s1`, dash || "3 3").attr("d", `M${from.x},${from.y} L${bx1},${from.y} L${bx1},${ports.fromInt.y} L${ports.fromInt.x},${ports.fromInt.y}`);
				opt(`${id}-s2`, dash || "5 4").attr("d", `M${ports.fromExt.x},${ports.fromExt.y} L${wallR + midOffset},${ports.fromExt.y} L${wallR + midOffset},${my} L${wallL - midOffset},${my} L${wallL - midOffset},${ports.toExt.y} L${ports.toExt.x},${ports.toExt.y}`).attr("marker-end", mk).style("color", color);
				opt(`${id}-s3`, dash || "3 3").attr("d", `M${ports.toInt.x},${ports.toInt.y} L${bx2},${ports.toInt.y} L${bx2},${to.y} L${to.x},${to.y}`);
			} else {
				const d = `M${from.x},${from.y} L${bx1},${from.y} L${bx1},${my} L${bx2},${my} L${bx2},${to.y} L${to.x},${to.y}`;
				g.append("path").attr("data-id", id).attr("d", d).attr("fill", "none").attr("stroke", color).attr("stroke-width", strokeW * 1.4).attr("stroke-linecap", "round").attr("stroke-linejoin", "round").attr("marker-end", mk).style("color", color);
			}
		}
		return { ports };
	};

//#endregion
//#region vis/stepper.ts
	const stepper = (selector, { panel, texts = [], draw, start = 0 } = {}) => {
		const btns = document.querySelectorAll(selector);
		const show = (s) => {
			btns.forEach((b, i) => b.classList.toggle("active", i === s));
			if (panel) {
				const el = document.querySelector(panel);
				if (el && texts[s] !== void 0) if (typeof window !== "undefined" && window.katex) el.innerHTML = window.katex.renderToString(texts[s], { throwOnError: false });
				else el.innerHTML = texts[s];
			}
			if (draw) draw(s);
		};
		btns.forEach((b, i) => b.addEventListener("click", () => show(i)));
		show(start);
		return { go: show };
	};
	const pages = (count, prefix = "t") => Array.from({ length: count }, (_, i) => document.getElementById(prefix + i)?.innerHTML || "");
	const steps = (count, { container = ".stepper", panel, labels, texts, draw, start = 0, prefix = "t" } = {}) => {
		const ct = document.querySelector(container);
		if (!ct) throw new Error(`Stepper container "${container}" not found`);
		if (!ct.children.length || ct.querySelector("button") === null) {
			const circle = "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳";
			ct.innerHTML = "";
			for (let i = 0; i < count; i++) {
				const btn = document.createElement("button");
				btn.textContent = labels?.[i] || `${circle[i] || i + 1}`;
				ct.appendChild(btn);
			}
		}
		const resolved = texts || pages(count, prefix);
		return stepper(`${container} button`, {
			panel,
			texts: resolved,
			draw,
			start
		});
	};

//#endregion
//#region vis/katex.ts
	const katexify = (html) => {
		if (typeof window === "undefined" || !window.katex) return html;
		return html.replace(/\$\$([^$]+)\$\$/g, (_, m) => window.katex.renderToString(m, {
			throwOnError: false,
			displayMode: true
		})).replace(/\$([^$]+)\$/g, (_, m) => window.katex.renderToString(m, { throwOnError: false }));
	};

//#endregion
//#region vis/create.ts
	const create = (selector, { width = 560, height = 400, margin = 48, geom: { nW = 34, nH = 26, dR = 8, rx = 5, gap = 4 } = {} } = {}) => {
		const C = createCanvas(selector, width, height, margin);
		const p = palette();
		const g = Object.freeze({
			nW,
			nH,
			dR,
			rx,
			gap
		});
		const { markerFor } = defineArrows(C.svg, { sw: 2 });
		let _tr = null;
		let _seenIds = null;
		let _first = true;
		const makeTr = (ms = 400) => transition().duration(ms).ease(cubicInOut);
		const fadeIn = (sel) => sel.attr("opacity", 0).transition(_tr ?? makeTr(250)).attr("opacity", 1);
		const see = (id) => {
			if (_seenIds) _seenIds.add(id);
		};
		const show = (fn, ms = 400) => {
			_tr = makeTr(ms);
			[
				C.bg,
				C.eG,
				C.nG,
				C.oG
			].forEach((g) => g.selectAll("*").remove());
			C.root.selectAll(".vlbl").remove();
			fn();
			_tr = null;
		};
		const flow = (fn, ms = 500) => {
			_tr = makeTr(ms);
			_seenIds = /* @__PURE__ */ new Set();
			C.root.selectAll(".vlbl").remove();
			fn();
			[
				C.bg,
				C.nG,
				C.eG,
				C.oG
			].forEach((g) => {
				g.selectAll("[data-id]").filter(function() {
					if (!(this instanceof Element)) return false;
					return !_seenIds.has(this.getAttribute("data-id"));
				}).interrupt().transition(_tr).attr("opacity", 0).remove();
			});
			_tr = null;
			_seenIds = null;
		};
		const render = (fn, ms = 500) => {
			if (_first) {
				show(fn, ms);
				_first = false;
			} else flow(fn, ms);
		};
		const node = (n, o = {}) => {
			if (_seenIds) _seenIds.add(n.id);
			const exist = C.nG.select(`[data-id="${n.id}"]`);
			if (!exist.empty()) {
				const tr = _tr ?? makeTr(250);
				const shape = exist.select(".shp");
				const shapeNode = shape.node();
				if (shapeNode instanceof Element) {
					let t = shape.interrupt().transition(tr);
					if (shapeNode.tagName === "circle") t = t.attr("cx", n.x).attr("cy", n.y);
					else t = t.attr("x", n.x - g.nW / 2).attr("y", n.y - g.nH / 2);
					if (o.stroke) t = t.attr("stroke", o.stroke);
					if (o.fill) t = t.attr("fill", o.fill);
				}
				exist.select("text").interrupt().transition(tr).attr("x", n.x).attr("y", n.y);
				return exist;
			}
			C.nG.selectAll(`[data-id="${n.id}"]`).remove();
			const grp = C.nG.append("g").attr("data-id", n.id);
			drawNodeContent(grp, n, {
				w: g.nW,
				h: g.nH,
				dR: g.dR,
				rx: g.rx,
				...o
			});
			return fadeIn(grp);
		};
		node.emph = (n, o = {}) => node(n, {
			...o,
			stroke: p.accent.fg,
			fill: p.accent.bg
		});
		node.r = (n, o = {}) => node(n, {
			...o,
			stroke: p.danger.fg,
			fill: p.danger.bg
		});
		const dummy = (n, o = {}) => {
			if (_seenIds) _seenIds.add(n.id);
			const layer = o.layer === "overlay" ? C.oG : o.layer === "edges" ? C.eG : C.nG;
			const exist = layer.select(`[data-id="${n.id}"]`);
			if (!exist.empty()) {
				const tr = _tr ?? (_seenIds ? makeTr(250) : null);
				if (tr) {
					let t = exist.select(".shp").transition(tr).attr("cx", n.x).attr("cy", n.y);
					if (o.fill) t = t.attr("fill", o.fill);
					if (o.stroke) t = t.attr("stroke", o.stroke);
					const ls = o.labelSide || "left", lg = o.labelGap ?? 8;
					const tx = ls === "left" ? n.x - (g.dR + lg) : ls === "right" ? n.x + (g.dR + lg) : n.x;
					exist.select("text").transition(tr).attr("x", tx);
				}
				return exist;
			}
			layer.selectAll(`[data-id="${n.id}"]`).remove();
			return fadeIn(drawDummy(layer, n, {
				dR: g.dR,
				...o
			}));
		};
		const edge = (from, to, o = {}) => {
			const eid = (from.id || "") + "→" + (to.id || "");
			if (_seenIds) _seenIds.add(eid);
			const opts = {
				nW: g.nW,
				nH: g.nH,
				dR: g.dR,
				gap: g.gap,
				strokeW: 2,
				stroke: p.dim.fg,
				...o
			};
			if (!opts.markerUrl) opts.markerUrl = markerFor(opts.stroke);
			const ep = exitPt(from, to.x, to.y, {
				nW: o.nW ?? g.nW,
				nH: o.nH ?? g.nH,
				dR: g.dR
			});
			const ip = entryPt(to, from.x, from.y, {
				nW: o.nW ?? g.nW,
				nH: o.nH ?? g.nH,
				dR: g.dR,
				gap: 0
			});
			const exist = C.eG.select(`[data-id="${eid}"]`);
			if (!exist.empty()) {
				const existNode = exist.node();
				if (existNode instanceof Element && existNode.tagName === "line") {
					const tr = _tr ?? makeTr(250);
					exist.interrupt().transition(tr).attr("x1", ep.x).attr("y1", ep.y).attr("x2", ip.x).attr("y2", ip.y).attr("stroke", opts.stroke).attr("stroke-width", opts.strokeW).attr("marker-end", opts.markerUrl).attr("color", opts.stroke);
					return exist;
				}
				exist.remove();
			}
			C.eG.selectAll(`[data-id="${eid}"]`).remove();
			return fadeIn(C.eG.append("line").attr("data-id", eid).attr("x1", ep.x).attr("y1", ep.y).attr("x2", ip.x).attr("y2", ip.y).attr("stroke", opts.stroke).attr("stroke-width", opts.strokeW).attr("stroke-dasharray", opts.dash || "").attr("marker-end", opts.markerUrl).attr("stroke-linecap", "round").style("color", opts.stroke));
		};
		const path = (from, to, o = {}) => {
			const eid = (from.id || "") + "→" + (to.id || "");
			if (_seenIds) _seenIds.add(eid);
			const opts = {
				nW: g.nW,
				nH: g.nH,
				dR: g.dR,
				gap: g.gap,
				strokeW: 2,
				stroke: p.dim.fg,
				...o
			};
			if (!opts.markerUrl) opts.markerUrl = markerFor(opts.stroke);
			const ep = exitPt(from, to.x, to.y, {
				nW: g.nW,
				nH: g.nH,
				dR: g.dR
			});
			const ip = entryPt(to, from.x, from.y, {
				nW: g.nW,
				nH: g.nH,
				dR: g.dR,
				gap: g.gap
			});
			const my = ep.y + (ip.y - ep.y) / 2;
			const d = `M${ep.x},${ep.y} L${ep.x},${my} L${ip.x},${my} L${ip.x},${ip.y}`;
			const exist = C.eG.select(`[data-id="${eid}"]`);
			if (!exist.empty()) {
				const existNode = exist.node();
				if (existNode instanceof Element && existNode.tagName === "path") {
					const tr = _tr ?? makeTr(250);
					exist.interrupt().transition(tr).attr("d", d).attr("stroke", opts.stroke).attr("stroke-width", opts.strokeW).attr("marker-end", opts.markerUrl).attr("color", opts.stroke);
					return exist;
				}
				exist.remove();
			}
			C.eG.selectAll(`[data-id="${eid}"]`).remove();
			return fadeIn(C.eG.append("path").attr("data-id", eid).attr("d", d).attr("fill", "none").attr("stroke", opts.stroke).attr("stroke-width", opts.strokeW).attr("stroke-dasharray", opts.dash || "").attr("marker-end", opts.markerUrl).attr("stroke-linecap", "round").attr("stroke-linejoin", "round").style("color", opts.stroke));
		};
		const lBend$1 = (from, to, bx, o = {}) => {
			const autoId = o.id || `${from.id || from.x}-${to.id || to.x}`;
			if (_seenIds) _seenIds.add(autoId);
			return lBend(C.eG, from, to, bx, {
				markerFor,
				id: autoId,
				...o
			});
		};
		const halo$1 = (cx, cy, o = {}) => {
			see(`halo-${o.id || "h"}`);
			return fadeIn(halo(C.nG, cx, cy, g.nW, g.nH, g.rx, o));
		};
		const block$1 = (rect, o) => {
			const id = o?.id || "blk";
			see(`block-${id}`);
			if (o?.label) see(`label-block-label-${id}`);
			return block(C.bg, rect, o);
		};
		const compound = (rect, o) => {
			const id = o?.id || "c";
			see(`compound-${id}`);
			if (o?.label) {
				see(`compound-pill-${id}`);
				see(`compound-lbl-${id}`);
			}
			return compoundRect(C.bg, rect, o);
		};
		const pipeline$1 = (x, y, stages, o) => {
			stages.forEach((_, i) => {
				see(`pipe-${i}`);
				if (i < stages.length - 1) see(`pipe-cn-${i}`);
			});
			return pipeline(C.bg, x, y, stages, o);
		};
		const group$1 = (nodes, o) => {
			const id = o?.id || "g";
			see(`group-${id}`);
			if (o?.label) see(`label-group-label-${id}`);
			return group(C.bg, nodes, o);
		};
		const crossEdge$1 = (opts) => {
			const id = opts?.id || "ce";
			see(id);
			if (opts?.mode === "split") {
				see(`${id}-p0`);
				see(`${id}-p1`);
				see(`${id}-p2`);
				see(`${id}-p3`);
				see(`${id}-s1`);
				see(`${id}-s2`);
				see(`${id}-s3`);
			}
			return crossEdge(C.oG, {
				from: {
					x: 0,
					y: 0
				},
				to: {
					x: 0,
					y: 0
				},
				fromRect: {
					x: 0,
					y: 0,
					w: 0,
					h: 0
				},
				toRect: {
					x: 0,
					y: 0,
					w: 0,
					h: 0
				},
				markerFor,
				dR: g.dR,
				...opts
			});
		};
		const label = (text, { at, ...o } = {}) => {
			see(`label-${o.id || "lbl"}`);
			return svgLabel(C.bg, at?.x ?? 0, at?.y ?? 0, text, o);
		};
		const callout = (anchor, html, o = {}) => domLabel(C.root, anchor, html, o);
		const bounds = (nodes, o) => getBounds(nodes, {
			nW: g.nW,
			nH: g.nH,
			dR: g.dR,
			...o
		});
		const bbox = (nodes, o = {}) => {
			const b = getBounds(nodes, {
				nW: g.nW,
				nH: g.nH,
				dR: g.dR
			});
			if (!b) return;
			see(`bbox-${o.id || "bb"}`);
			boundBox(C.oG, b, o);
			return b;
		};
		const layerBg = (layers, { h = 52, bgFill = p.accent.a(12), rx: grx = 8 } = {}) => {
			layers.forEach((y, i) => {
				see(`ly-${i}`);
				C.bg.append("rect").attr("data-id", `ly-${i}`).attr("class", "ly").attr("x", margin).attr("y", y - h / 2).attr("width", width - margin * 2).attr("height", h).attr("fill", bgFill).attr("rx", grx);
			});
		};
		const guides = (layers, o = {}) => {
			for (let i = 1; i < layers.length; i++) see(`guide-${i}`);
			return createLayerGuides(C.bg, layers, {
				x1: margin + 20,
				x2: width - margin - 20,
				...o
			});
		};
		const connect$1 = (from, to, o) => {
			see(o?.id || "cn");
			return connect(C.bg, from, to, {
				markerFor,
				...o
			});
		};
		const eLabel = (f, t, p, text, o = {}) => {
			const id = o.id || "el";
			see(`elabel-bg-${id}`);
			see(`label-elabel-${id}`);
			return edgeLabel(C.eG, f, t, p, text, {
				...o,
				id
			});
		};
		const bboxRect = (b, o = {}) => {
			see(`bbox-${o.id || "bb"}`);
			return boundBox(C.oG, b, o);
		};
		return {
			svg: C.svg,
			W: C.W,
			H: C.H,
			M: C.M,
			stage: {
				bg: C.bg,
				nodes: C.nG,
				edges: C.eG,
				overlay: C.oG
			},
			root: C.root,
			palette: p,
			geom: g,
			node,
			dummy,
			edge,
			path,
			lBend: lBend$1,
			halo: halo$1,
			bbox,
			bboxRect,
			block: block$1,
			compound,
			pipeline: pipeline$1,
			group: group$1,
			connect: connect$1,
			crossEdge: crossEdge$1,
			label,
			callout,
			eLabel,
			katexify,
			bounds,
			distribute: (count, container, o) => distribute(count, container, {
				itemW: g.nW,
				itemH: g.nH,
				...o
			}),
			centerIn,
			show,
			flow,
			render,
			markerFor,
			layerBg,
			guides,
			exitPt,
			entryPt,
			stepper: (opts) => steps(opts.length ?? 1, { ...opts })
		};
	};

//#endregion
//#region vis/themes.ts
	const themes = {
		warm: {
			name: "warm",
			desc: "暖色调 · 教学友好 · 琥珀+青",
			palette: {
				primary: {
					fg: "oklch(0.55 0.20 55)",
					bg: "oklch(0.88 0.08 55)"
				},
				accent: {
					fg: "oklch(0.57 0.15 180)",
					bg: "oklch(0.88 0.06 180)"
				},
				danger: {
					fg: "oklch(0.48 0.18 22)",
					bg: "oklch(0.88 0.04 22)"
				},
				warning: {
					fg: "oklch(0.58 0.20 85)",
					bg: "oklch(0.90 0.08 85)"
				},
				info: {
					fg: "oklch(0.50 0.12 240)",
					bg: "oklch(0.88 0.04 240)"
				},
				dim: {
					fg: "oklch(0.50 0.02 60)",
					bg: "oklch(0.90 0.01 75)"
				},
				muted: {
					fg: "oklch(0.50 0.02 60)",
					bg: "oklch(0.90 0.01 75)"
				},
				success: {
					fg: "oklch(0.48 0.18 150)",
					bg: "oklch(0.88 0.06 150)"
				}
			}
		},
		cool: {
			name: "cool",
			desc: "冷色调 · 科技感 · 蓝+薄荷",
			palette: {
				primary: {
					fg: "oklch(0.52 0.14 250)",
					bg: "oklch(0.88 0.05 250)"
				},
				accent: {
					fg: "oklch(0.55 0.11 160)",
					bg: "oklch(0.88 0.05 160)"
				},
				danger: {
					fg: "oklch(0.50 0.16 10)",
					bg: "oklch(0.88 0.04 10)"
				},
				warning: {
					fg: "oklch(0.58 0.18 90)",
					bg: "oklch(0.90 0.06 90)"
				},
				info: {
					fg: "oklch(0.48 0.10 250)",
					bg: "oklch(0.88 0.04 250)"
				},
				dim: {
					fg: "oklch(0.50 0.02 250)",
					bg: "oklch(0.90 0.01 250)"
				},
				muted: {
					fg: "oklch(0.50 0.02 250)",
					bg: "oklch(0.90 0.01 250)"
				},
				success: {
					fg: "oklch(0.50 0.14 150)",
					bg: "oklch(0.88 0.05 150)"
				}
			}
		},
		dark: {
			name: "dark",
			desc: "暗色 · 终端风 · 亮色前景",
			palette: {
				primary: {
					fg: "oklch(0.72 0.16 65)",
					bg: "oklch(0.28 0.05 65)"
				},
				accent: {
					fg: "oklch(0.68 0.13 155)",
					bg: "oklch(0.24 0.05 155)"
				},
				danger: {
					fg: "oklch(0.62 0.16 25)",
					bg: "oklch(0.24 0.04 25)"
				},
				warning: {
					fg: "oklch(0.72 0.18 85)",
					bg: "oklch(0.26 0.05 85)"
				},
				info: {
					fg: "oklch(0.62 0.12 240)",
					bg: "oklch(0.24 0.04 240)"
				},
				dim: {
					fg: "oklch(0.50 0.03 260)",
					bg: "oklch(0.22 0.01 260)"
				},
				muted: {
					fg: "oklch(0.50 0.03 260)",
					bg: "oklch(0.22 0.01 260)"
				},
				success: {
					fg: "oklch(0.62 0.15 150)",
					bg: "oklch(0.26 0.05 150)"
				}
			}
		},
		paper: {
			name: "paper",
			desc: "学术风 · 极简 · 墨色+白",
			palette: {
				primary: {
					fg: "oklch(0.38 0.03 60)",
					bg: "oklch(0.92 0.01 80)"
				},
				accent: {
					fg: "oklch(0.42 0.06 150)",
					bg: "oklch(0.90 0.02 150)"
				},
				danger: {
					fg: "oklch(0.35 0.06 20)",
					bg: "oklch(0.90 0.02 20)"
				},
				warning: {
					fg: "oklch(0.45 0.08 80)",
					bg: "oklch(0.92 0.02 80)"
				},
				info: {
					fg: "oklch(0.40 0.06 240)",
					bg: "oklch(0.90 0.02 240)"
				},
				dim: {
					fg: "oklch(0.45 0.01 80)",
					bg: "oklch(0.94 0.01 80)"
				},
				muted: {
					fg: "oklch(0.45 0.01 80)",
					bg: "oklch(0.94 0.01 80)"
				},
				success: {
					fg: "oklch(0.40 0.08 150)",
					bg: "oklch(0.90 0.03 150)"
				}
			}
		},
		vivid: {
			name: "vivid",
			desc: "高饱和 · 演示/演讲 · 亮色",
			palette: {
				primary: {
					fg: "oklch(0.62 0.22 68)",
					bg: "oklch(0.88 0.10 68)"
				},
				accent: {
					fg: "oklch(0.58 0.18 180)",
					bg: "oklch(0.86 0.08 180)"
				},
				danger: {
					fg: "oklch(0.55 0.22 22)",
					bg: "oklch(0.86 0.08 22)"
				},
				warning: {
					fg: "oklch(0.65 0.24 85)",
					bg: "oklch(0.90 0.10 85)"
				},
				info: {
					fg: "oklch(0.52 0.16 250)",
					bg: "oklch(0.86 0.06 250)"
				},
				dim: {
					fg: "oklch(0.52 0.03 80)",
					bg: "oklch(0.90 0.01 80)"
				},
				muted: {
					fg: "oklch(0.52 0.03 80)",
					bg: "oklch(0.90 0.01 80)"
				},
				success: {
					fg: "oklch(0.55 0.20 150)",
					bg: "oklch(0.86 0.08 150)"
				}
			}
		},
		soft: {
			name: "soft",
			desc: "低对比 · 柔和 · 灰绿基调",
			palette: {
				primary: {
					fg: "oklch(0.50 0.06 140)",
					bg: "oklch(0.90 0.02 140)"
				},
				accent: {
					fg: "oklch(0.48 0.05 200)",
					bg: "oklch(0.90 0.02 200)"
				},
				danger: {
					fg: "oklch(0.42 0.08 30)",
					bg: "oklch(0.88 0.02 30)"
				},
				warning: {
					fg: "oklch(0.50 0.08 90)",
					bg: "oklch(0.90 0.03 90)"
				},
				info: {
					fg: "oklch(0.45 0.05 240)",
					bg: "oklch(0.90 0.02 240)"
				},
				dim: {
					fg: "oklch(0.48 0.02 100)",
					bg: "oklch(0.92 0.01 100)"
				},
				muted: {
					fg: "oklch(0.48 0.02 100)",
					bg: "oklch(0.92 0.01 100)"
				},
				success: {
					fg: "oklch(0.48 0.10 150)",
					bg: "oklch(0.88 0.04 150)"
				}
			}
		}
	};
	function resolveTheme(name) {
		return themes[name] || themes.warm;
	}

//#endregion
//#region vis/elements.ts
	let _counter = 0;
	const autoId = () => `a${_counter++}`;
	const xy = (a, b) => Array.isArray(a) ? {
		x: a[0],
		y: a[1]
	} : {
		x: a,
		y: b
	};
	function createElements(ctx, p, schedule, _els) {
		function resolve(c) {
			const col = p[c];
			return col && col.fg ? col : null;
		}
		function makeEl(type, px, py) {
			const id = autoId();
			const self = {
				_id: id,
				_type: type,
				_x: px,
				_y: py,
				_opts: {},
				_text: "",
				_rect: null,
				_from: null,
				_delta: null,
				_to: null,
				_labelEl: void 0,
				color(c) {
					const col = resolve(c);
					if (col) {
						this._opts.stroke = col.fg;
						this._opts.fill = col.bg;
					} else if (typeof c === "string") this._opts.stroke = c;
					return this;
				},
				fill(v) {
					this._opts.fill = v;
					return this;
				},
				stroke(v, w) {
					this._opts.stroke = v;
					if (w != null) this._opts.strokeW = w;
					return this;
				},
				size(s) {
					this._opts.textSize = s;
					return this;
				},
				dash(v) {
					this._opts.dash = v;
					return this;
				},
				label(t) {
					this._text = t;
					this._opts.text = t;
					return this;
				},
				to(nx, ny) {
					const pt = xy(nx, ny);
					this._x = pt.x;
					this._y = pt.y;
					schedule();
					return this;
				},
				pos() {
					return {
						x: this._x,
						y: this._y
					};
				},
				from(el) {
					this._from = el;
					return this;
				},
				offset(ox, oy) {
					const o = xy(ox, oy);
					this._delta = {
						dx: o.x,
						dy: o.y
					};
					schedule();
					return this;
				},
				move(x, y) {
					const pt = xy(x, y);
					this._x = pt.x;
					this._y = pt.y;
					schedule();
					return this;
				},
				dx(dx, dy) {
					this._x += dx;
					this._y += dy;
					schedule();
					return this;
				},
				font(f, v) {
					this._opts.font = v;
					return this;
				},
				opacity(v) {
					this._opts.opacity = v;
					return this;
				},
				text(t) {
					this._text = t;
					this._opts.text = t;
					return this;
				},
				show() {
					schedule();
				},
				glyph(g) {
					this._opts.glyph = g;
					return this;
				},
				rectDef(rx, ry, rw, rh, rrx) {
					this._rect = {
						x: rx,
						y: ry,
						w: rw,
						h: rh,
						rx: rrx ?? 10
					};
					return this;
				},
				_draw() {
					switch (this._type) {
						case "dot":
							ctx.node({
								id: this._id,
								x: this._x,
								y: this._y
							}, {
								...this._opts,
								text: this._text || ""
							});
							break;
						case "rect":
							if (!this._rect) break;
							ctx.block(this._rect, {
								id: this._id,
								label: this._text || void 0,
								labelPos: "tl",
								fill: this._opts.fill,
								stroke: this._opts.stroke || p.dim.fg,
								strokeW: this._opts.strokeW || 1.2,
								textSize: this._opts.textSize || 11,
								textFill: this._opts.textFill || this._opts.stroke || p.dim.fg
							});
							break;
						case "arrow": {
							if (!this._from || !this._delta) break;
							const fp = this._from.pos();
							const tx = fp.x + this._delta.dx, ty = fp.y + this._delta.dy;
							const tipId = `${this._id}-tip`;
							ctx.dummy({
								id: tipId,
								x: tx,
								y: ty
							}, {
								dR: 3.5,
								fill: this._opts.fill || p.danger.a(70),
								stroke: this._opts.stroke || p.danger.fg,
								strokeW: 1,
								text: "",
								textSize: 0
							});
							ctx.edge({
								id: this._from._id,
								x: fp.x,
								y: fp.y
							}, {
								id: tipId,
								x: tx,
								y: ty
							}, {
								stroke: this._opts.stroke || p.danger.a(65),
								strokeW: this._opts.strokeW || 1.4
							});
							break;
						}
						case "line":
							if (!this._to) break;
							ctx.edge({
								id: `${this._id}-a`,
								x: this._x,
								y: this._y
							}, {
								id: `${this._id}-b`,
								x: this._to.x,
								y: this._to.y
							}, {
								stroke: this._opts.stroke || p.dim.a(50),
								strokeW: this._opts.strokeW || 1,
								dash: this._opts.dash || ""
							});
							break;
					}
					if (this._labelEl) this._labelEl._draw(this.pos());
				}
			};
			_els.set(id, self);
			schedule();
			return self;
		}
		function dot(nx, ny) {
			const pos = xy(nx, ny);
			const el = makeEl("dot", pos.x, pos.y);
			el._opts = {
				fill: p.primary.bg,
				stroke: p.primary.fg,
				text: "",
				textSize: 10
			};
			return el;
		}
		function zone(x, y, w, h, label, color) {
			const col = resolve(color) || p.dim;
			const el = makeEl("rect", x, y);
			el._opts = {
				fill: col.a(5),
				stroke: col.a(22)
			};
			el.rectDef(x, y, w, h, 10);
			if (label) el._text = label;
			return el;
		}
		function arrow(from, dx, dy) {
			const o = xy(dx, dy);
			const el = makeEl("arrow", 0, 0);
			el._from = from;
			el._delta = {
				dx: o.x,
				dy: o.y
			};
			return el;
		}
		function line(x1, y1, x2, y2) {
			const a = xy(x1, y1), b = xy(x2, y2);
			const el = makeEl("line", a.x, a.y);
			el._to = {
				x: b.x,
				y: b.y
			};
			return el;
		}
		function path(pts, opts) {
			const dots = pts.map(([px, py]) => {
				const el = makeEl("dot", px, py);
				el._opts = {
					fill: "var(--bg-node)",
					stroke: "var(--text-dim)",
					strokeW: .8,
					text: "",
					textSize: 0
				};
				return el;
			});
			ctx.stage.edges.append("polyline").attr("points", pts.map((p) => p.join(",")).join(" ")).attr("fill", "none").attr("stroke", opts?.stroke || p.dim.a(25)).attr("stroke-width", 1).attr("stroke-dasharray", opts?.dash || "5 4").attr("stroke-linecap", "round");
			return dots;
		}
		return {
			dot,
			zone,
			arrow,
			line,
			path
		};
	}

//#endregion
//#region vis/tag.ts
/** Create a standalone tag (no target). Used by axes labels etc. */
	function createStandaloneTag(callout, pos, html) {
		let _html = html, _place = "above", _gap = 12;
		const _style = {};
		const self = {
			above(g) {
				_place = "above";
				if (g != null) _gap = g;
				return self;
			},
			below(g) {
				_place = "below";
				if (g != null) _gap = g;
				return self;
			},
			left(g) {
				_place = "left";
				if (g != null) _gap = g;
				return self;
			},
			right(g) {
				_place = "right";
				if (g != null) _gap = g;
				return self;
			},
			gap(g) {
				_gap = g;
				return self;
			},
			color(c) {
				_style.color = c;
				return self;
			},
			text(t) {
				_html = t;
				return self;
			},
			size(s) {
				_style.fontSize = s + "px";
				return self;
			},
			bold() {
				_style.fontWeight = "700";
				return self;
			},
			_draw(at) {
				const p = at || pos;
				callout({
					x: p.x,
					y: p.y
				}, _html, {
					place: _place,
					gap: _gap,
					style: {
						fontSize: "11px",
						fontFamily: "JetBrains Mono,monospace",
						..._style
					}
				});
			}
		};
		self._draw();
		return self;
	}
	/** Create a tag bound to an element. Redrawn when the element's _draw() runs. */
	function createBoundTag(callout, target, html) {
		let _html = html, _place = "above", _gap = 12;
		const _style = {};
		const self = {
			above(g) {
				_place = "above";
				if (g != null) _gap = g;
				return self;
			},
			below(g) {
				_place = "below";
				if (g != null) _gap = g;
				return self;
			},
			left(g) {
				_place = "left";
				if (g != null) _gap = g;
				return self;
			},
			right(g) {
				_place = "right";
				if (g != null) _gap = g;
				return self;
			},
			gap(g) {
				_gap = g;
				return self;
			},
			color(c) {
				_style.color = c;
				return self;
			},
			text(t) {
				_html = t;
				return self;
			},
			size(s) {
				_style.fontSize = s + "px";
				return self;
			},
			bold() {
				_style.fontWeight = "700";
				return self;
			},
			_draw(at) {
				const p = at || target.pos();
				callout({
					x: p.x,
					y: p.y
				}, _html, {
					place: _place,
					gap: _gap,
					style: {
						fontSize: "11px",
						fontFamily: "JetBrains Mono,monospace",
						..._style
					}
				});
			}
		};
		target._labelEl = self;
		return self;
	}

//#endregion
//#region vis/axes.ts
	function formatTick(v) {
		if (Number.isInteger(v)) return String(v);
		const s = v.toFixed(2);
		return s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
	}
	function createAxes(bg, p, tagFn, schedule) {
		const _axes = [];
		function axes(ox, oy, { xRange = [0, 10], yRange = [0, 10], ticks = 5, labels = true, xLabel, yLabel } = {}) {
			const originX = ox, originY = oy;
			const len = 300;
			const c = p.dim;
			const tickLen = 5, labelGap = 18;
			const axisW = 1.3;
			_axes.push(() => {
				const x = originX, y = originY;
				const g = bg;
				g.selectAll(".ax-grid,.ax-tip,.ax-origin,.ax-tick,.ax-line").remove();
				for (let i = 0; i <= ticks; i++) {
					const tx = x + len / ticks * i;
					const ty = y - len / ticks * i;
					g.append("line").attr("class", "ax-grid").attr("x1", tx).attr("y1", y).attr("x2", tx).attr("y2", y - len).attr("stroke", c.a(8)).attr("stroke-width", .3);
					g.append("line").attr("class", "ax-grid").attr("x1", x).attr("y1", ty).attr("x2", x + len).attr("y2", ty).attr("stroke", c.a(8)).attr("stroke-width", .3);
				}
				const as = 6;
				g.append("line").attr("class", "ax-line").attr("x1", x).attr("y1", y).attr("x2", x + len + as + 4).attr("y2", y).attr("stroke", c.a(40)).attr("stroke-width", axisW);
				g.append("polygon").attr("class", "ax-tip").attr("points", `${x + len + as + 4},${y} ${x + len},${y - as} ${x + len},${y + as}`).attr("fill", c.a(40));
				g.append("line").attr("class", "ax-line").attr("x1", x).attr("y1", y).attr("x2", x).attr("y2", y - len - as - 4).attr("stroke", c.a(40)).attr("stroke-width", axisW);
				g.append("polygon").attr("class", "ax-tip").attr("points", `${x},${y - len - as - 4} ${x - as},${y - len} ${x + as},${y - len}`).attr("fill", c.a(40));
				g.append("circle").attr("class", "ax-origin").attr("cx", x).attr("cy", y).attr("r", 3).attr("fill", "#fff").attr("stroke", c.a(40)).attr("stroke-width", axisW);
				if (labels) {
					for (let i = 0; i <= ticks; i++) {
						const tx = x + len / ticks * i;
						const ty = y - len / ticks * i;
						g.append("line").attr("class", "ax-tick").attr("x1", tx).attr("y1", y - tickLen).attr("x2", tx).attr("y2", y + tickLen).attr("stroke", c.a(35)).attr("stroke-width", .8);
						const xv = xRange[0] + (xRange[1] - xRange[0]) / ticks * i;
						tagFn({
							x: tx,
							y
						}, formatTick(xv)).below(labelGap).size(11);
						g.append("line").attr("class", "ax-tick").attr("x1", x - tickLen).attr("y1", ty).attr("x2", x + tickLen).attr("y2", ty).attr("stroke", c.a(35)).attr("stroke-width", .8);
						const yv = yRange[0] + (yRange[1] - yRange[0]) / ticks * i;
						tagFn({
							x,
							y: ty
						}, formatTick(yv)).left(labelGap - 6).size(11);
					}
					if (xLabel) tagFn({
						x: x + len / 2,
						y
					}, xLabel).below(38).size(11);
					if (yLabel) tagFn({
						x: x - 36,
						y: y - len / 2
					}, yLabel).size(11);
				}
			});
			schedule();
		}
		return {
			axes,
			_axes
		};
	}

//#endregion
//#region vis/math.ts
	let _oid = 0;
	const oid = () => "m" + _oid++;
	const _markers = {};
	function ensureMarker(svg, color) {
		if (_markers[color]) return _markers[color];
		const id = "mk" + Object.keys(_markers).length;
		let defs = svg.select("defs");
		if (defs.empty()) defs = svg.append("defs");
		defs.append("marker").attr("id", id).attr("viewBox", "0 0 12 10").attr("refX", MARKER.refX).attr("refY", MARKER.refY).attr("markerWidth", MARKER.sw * 7).attr("markerHeight", MARKER.sw * 7).attr("markerUnits", "userSpaceOnUse").attr("orient", "auto-start-reverse").append("path").attr("d", "M0,0.5 L12,5 L0,9.5 Z").attr("fill", color);
		_markers[color] = id;
		return id;
	}
	const vecLen = (dx, dy) => Math.sqrt(dx * dx + dy * dy);
	const vecNorm = (dx, dy, l) => [dx / l, dy / l];
	function vector(stage, schedule, from, to, opts = {}) {
		const p = stage.palette;
		const self = {
			_id: oid(),
			_type: "vector",
			_from: [...from],
			_to: [...to],
			_stroke: opts.stroke || p.primary.fg,
			strokeW: opts.strokeW ?? 2,
			dash: opts.dash || "",
			_label: opts.label || "",
			labelPlace: opts.labelPlace || "above",
			labelGap: opts.labelGap ?? 10,
			_opacity: opts.opacity ?? 1,
			move(fx, fy, tx, ty) {
				if (Array.isArray(fx)) {
					this._from = [...fx];
					if (fy != null && tx != null) this._to = [fy, tx];
				} else if (fy != null) {
					this._from = [fx, fy];
					if (tx != null) this._to = [tx, ty];
				}
				schedule();
				return this;
			},
			color(c) {
				this._stroke = c;
				schedule();
				return this;
			},
			stroke(c, w) {
				this._stroke = c;
				if (w != null) this.strokeW = w;
				schedule();
				return this;
			},
			dashed(d = "5 4") {
				this.dash = d;
				schedule();
				return this;
			},
			label(t, place, gap) {
				this._label = t;
				if (place) this.labelPlace = place;
				if (gap != null) this.labelGap = gap;
				schedule();
				return this;
			},
			opacity(v) {
				this._opacity = v;
				schedule();
				return this;
			}
		};
		schedule();
		return self;
	}
	function point(stage, schedule, pos, opts = {}) {
		const p = stage.palette;
		const self = {
			_id: oid(),
			_type: "point",
			pos: [...pos],
			_stroke: opts.stroke || p.primary.fg,
			r: opts.size ?? 4,
			_fill: opts.fill || p.primary.bg,
			_label: opts.label || "",
			labelPlace: opts.labelPlace || "above",
			labelGap: opts.labelGap ?? 8,
			move(x, y) {
				this.pos = Array.isArray(x) ? [...x] : [x, y];
				schedule();
				return this;
			},
			color(c) {
				this._stroke = c;
				schedule();
				return this;
			},
			fill(c) {
				this._fill = c;
				schedule();
				return this;
			},
			label(t, place, gap) {
				this._label = t;
				if (place) this.labelPlace = place;
				if (gap != null) this.labelGap = gap;
				schedule();
				return this;
			}
		};
		schedule();
		return self;
	}
	function segment(stage, schedule, a, b, opts = {}) {
		const p = stage.palette;
		const self = {
			_id: oid(),
			_type: "segment",
			a: [...a],
			b: [...b],
			_stroke: opts.stroke || p.dim.fg,
			strokeW: opts.strokeW ?? 1.5,
			dash: opts.dash || "",
			_label: opts.label || "",
			labelGap: opts.labelGap ?? 10,
			move(a, b) {
				this.a = [...a];
				this.b = [...b];
				schedule();
				return this;
			},
			color(c) {
				this._stroke = c;
				schedule();
				return this;
			},
			stroke(c, w) {
				this._stroke = c;
				if (w != null) this.strokeW = w;
				schedule();
				return this;
			},
			dashed(d = "5 4") {
				this.dash = d;
				schedule();
				return this;
			},
			label(t, gap) {
				this._label = t;
				if (gap != null) this.labelGap = gap;
				schedule();
				return this;
			}
		};
		schedule();
		return self;
	}
	function circle(stage, schedule, center, radius, opts = {}) {
		const p = stage.palette;
		const self = {
			_id: oid(),
			_type: "circle",
			c: [...center],
			r: radius,
			_stroke: opts.stroke || p.accent.fg,
			strokeW: opts.strokeW ?? 1.2,
			dash: opts.dash || "",
			_opacity: opts.opacity ?? 1,
			_fill: opts.fill || p.accent.a(8),
			move(c, r) {
				this.c = [...c];
				if (r != null) this.r = r;
				schedule();
				return this;
			},
			color(c) {
				this._stroke = c;
				schedule();
				return this;
			},
			stroke(c, w) {
				this._stroke = c;
				if (w != null) this.strokeW = w;
				schedule();
				return this;
			},
			fill(c) {
				this._fill = c;
				schedule();
				return this;
			},
			dashed(d = "5 4") {
				this.dash = d;
				schedule();
				return this;
			},
			opacity(v) {
				this._opacity = v;
				schedule();
				return this;
			}
		};
		schedule();
		return self;
	}
	function polygon(stage, schedule, vertices, opts = {}) {
		const p = stage.palette;
		const self = {
			_id: oid(),
			_type: "polygon",
			v: vertices.map((v) => [...v]),
			_stroke: opts.stroke || p.primary.fg,
			strokeW: opts.strokeW ?? 1.5,
			dash: opts.dash || "",
			_opacity: opts.opacity ?? 1,
			_fill: "",
			move(vertices) {
				this.v = vertices.map((v) => [...v]);
				schedule();
				return this;
			},
			color(c) {
				this._stroke = c;
				schedule();
				return this;
			},
			stroke(c, w) {
				this._stroke = c;
				if (w != null) this.strokeW = w;
				schedule();
				return this;
			},
			fill(c) {
				this._fill = c;
				schedule();
				return this;
			},
			dashed(d = "5 4") {
				this.dash = d;
				schedule();
				return this;
			},
			opacity(v) {
				this._opacity = v;
				schedule();
				return this;
			}
		};
		self._fill = opts.fill || p.primary.a(10);
		schedule();
		return self;
	}
	function angle(stage, schedule, vertex, ray1, ray2, opts = {}) {
		const p = stage.palette;
		const self = {
			_id: oid(),
			_type: "angle",
			v: [...vertex],
			r1: [...ray1],
			r2: [...ray2],
			_stroke: opts.stroke || p.warning.fg,
			strokeW: opts.strokeW ?? 1,
			_label: opts.label || "",
			arcR: opts.size ?? 30,
			_fill: opts.fill || p.warning.a(15),
			move(vertex, ray1, ray2) {
				this.v = [...vertex];
				this.r1 = [...ray1];
				this.r2 = [...ray2];
				schedule();
				return this;
			},
			color(c) {
				this._stroke = c;
				schedule();
				return this;
			},
			stroke(c, w) {
				this._stroke = c;
				if (w != null) this.strokeW = w;
				schedule();
				return this;
			},
			fill(c) {
				this._fill = c;
				schedule();
				return this;
			},
			label(t) {
				this._label = t;
				schedule();
				return this;
			}
		};
		schedule();
		return self;
	}
	function fn(stage, schedule, f, opts = {}) {
		const p = stage.palette;
		const self = {
			_id: oid(),
			_type: "fn",
			f,
			domain: opts.domain || [0, 10],
			range: opts.range,
			ox: opts.x ?? 0,
			oy: opts.y ?? stage.ctx.H,
			pw: opts.width ?? stage.ctx.W,
			ph: opts.height ?? stage.ctx.H,
			samples: opts.samples ?? 200,
			_stroke: opts.stroke || p.primary.fg,
			strokeW: opts.strokeW ?? 1,
			dash: opts.dash || "",
			_opacity: opts.opacity ?? 1,
			_label: opts.label || "",
			color(c) {
				this._stroke = c;
				schedule();
				return this;
			},
			stroke(c, w) {
				this._stroke = c;
				if (w != null) this.strokeW = w;
				schedule();
				return this;
			},
			dashed(d = "5 4") {
				this.dash = d;
				schedule();
				return this;
			},
			opacity(v) {
				this._opacity = v;
				schedule();
				return this;
			},
			label(t) {
				this._label = t;
				schedule();
				return this;
			}
		};
		schedule();
		return self;
	}
	function grid(stage, schedule, origin, opts = {}) {
		const p = stage.palette;
		const self = {
			_id: oid(),
			_type: "grid",
			ox: origin[0],
			oy: origin[1],
			w: opts.width ?? 400,
			h: opts.height ?? 300,
			sp: opts.spacing ?? 40,
			_stroke: opts.stroke || p.dim.a(10),
			strokeW: opts.strokeW ?? .3
		};
		schedule();
		return self;
	}
	function axes(stage, schedule, origin, opts = {}) {
		const p = stage.palette;
		const self = {
			_id: oid(),
			_type: "axes",
			ox: origin[0],
			oy: origin[1],
			xl: opts.xLen ?? 300,
			yl: opts.yLen ?? 200,
			xLabel: opts.xLabel,
			yLabel: opts.yLabel,
			_stroke: opts.stroke || p.dim.a(45),
			strokeW: opts.strokeW ?? 1.4
		};
		schedule();
		return self;
	}
	function createMathRenderer(stage) {
		const objects = [];
		let first = true;
		let scheduled = false;
		let drawing = false;
		function schedule() {
			if (scheduled || drawing) return;
			scheduled = true;
			queueMicrotask(() => {
				scheduled = false;
				render();
			});
		}
		function render() {
			drawing = true;
			if (first) {
				stage.ctx.show(drawAll);
				first = false;
			} else stage.ctx.flow(drawAll, 600);
			drawing = false;
		}
		function drawAll() {
			const g = stage.ctx.stage.edges;
			const bg = stage.ctx.stage.bg;
			for (const obj of objects) {
				const id = obj._id;
				switch (obj._type) {
					case "vector": {
						const [fx, fy] = obj._from, [tx, ty] = obj._to;
						const mid = ensureMarker(stage.ctx.svg, obj._stroke);
						g.append("line").attr("data-id", id).attr("x1", fx).attr("y1", fy).attr("x2", tx).attr("y2", ty).attr("stroke", obj._stroke).attr("stroke-width", obj.strokeW).attr("stroke-dasharray", obj.dash).attr("opacity", obj._opacity).attr("marker-end", `url(#${mid})`);
						if (obj._label) {
							const mx = (fx + tx) / 2, my = (fy + ty) / 2;
							const [dx, dy] = [tx - fx, ty - fy];
							const [nx, ny] = vecNorm(dx, dy, vecLen(dx, dy));
							let lx = mx, ly = my, off = obj.labelGap;
							if (obj.labelPlace === "above") {
								lx -= ny * off;
								ly += nx * off;
							} else if (obj.labelPlace === "below") {
								lx += ny * off;
								ly -= nx * off;
							} else if (obj.labelPlace === "right") {
								lx += nx * off;
								ly += ny * off;
							} else {
								lx -= nx * off;
								ly -= ny * off;
							}
							stage.ctx.callout({
								x: lx,
								y: ly
							}, obj._label, {
								place: obj.labelPlace,
								gap: 4,
								style: {
									fontSize: "13px",
									fontFamily: "serif",
									fontStyle: "italic",
									color: obj._stroke,
									fontWeight: "600"
								}
							});
						}
						break;
					}
					case "point":
						stage.ctx.dummy({
							id,
							x: obj.pos[0],
							y: obj.pos[1]
						}, {
							dR: obj.r,
							fill: obj._fill,
							stroke: obj._stroke,
							strokeW: 1.5,
							text: "",
							textSize: 0
						});
						if (obj._label) stage.ctx.callout({
							x: obj.pos[0],
							y: obj.pos[1]
						}, obj._label, {
							place: obj.labelPlace,
							gap: obj.labelGap,
							style: {
								fontSize: "12px",
								fontFamily: "serif",
								fontStyle: "italic",
								color: obj._stroke,
								fontWeight: "600"
							}
						});
						break;
					case "segment":
						g.append("line").attr("data-id", id).attr("x1", obj.a[0]).attr("y1", obj.a[1]).attr("x2", obj.b[0]).attr("y2", obj.b[1]).attr("stroke", obj._stroke).attr("stroke-width", obj.strokeW).attr("stroke-dasharray", obj.dash);
						if (obj._label) {
							const mx = (obj.a[0] + obj.b[0]) / 2, my = (obj.a[1] + obj.b[1]) / 2;
							stage.ctx.callout({
								x: mx,
								y: my
							}, obj._label, {
								place: "above",
								gap: obj.labelGap,
								style: {
									fontSize: "11px",
									fontFamily: "JetBrains Mono,monospace",
									color: obj._stroke
								}
							});
						}
						break;
					case "circle":
						bg.append("circle").attr("data-id", id).attr("cx", obj.c[0]).attr("cy", obj.c[1]).attr("r", obj.r).attr("fill", obj._fill).attr("stroke", obj._stroke).attr("stroke-width", obj.strokeW).attr("stroke-dasharray", obj.dash).attr("opacity", obj._opacity);
						break;
					case "polygon":
						bg.append("polygon").attr("data-id", id).attr("points", obj.v.map((v) => v.join(",")).join(" ")).attr("fill", obj._fill).attr("stroke", obj._stroke).attr("stroke-width", obj.strokeW).attr("stroke-dasharray", obj.dash).attr("opacity", obj._opacity);
						break;
					case "angle": {
						const [vx, vy] = obj.v;
						const a1 = Math.atan2(obj.r1[1] - vy, obj.r1[0] - vx);
						const a2 = Math.atan2(obj.r2[1] - vy, obj.r2[0] - vx);
						const large = Math.abs(a2 - a1) > Math.PI ? 1 : 0;
						const sweep = a2 > a1 ? 1 : 0;
						const x1 = vx + obj.arcR * Math.cos(a1), y1 = vy + obj.arcR * Math.sin(a1);
						const x2 = vx + obj.arcR * Math.cos(a2), y2 = vy + obj.arcR * Math.sin(a2);
						const d = `M${x1},${y1} A${obj.arcR},${obj.arcR} 0 ${large},${sweep} ${x2},${y2} L${vx},${vy} Z`;
						const arcD = `M${x1},${y1} A${obj.arcR},${obj.arcR} 0 ${large},${sweep} ${x2},${y2}`;
						bg.append("path").attr("data-id", id + "-f").attr("d", d).attr("fill", obj._fill).attr("stroke", obj._stroke).attr("stroke-width", obj.strokeW);
						bg.append("path").attr("data-id", id + "-a").attr("d", arcD).attr("fill", "none").attr("stroke", obj._stroke).attr("stroke-width", obj.strokeW * 1.5);
						if (obj._label) {
							const ma = (a1 + a2) / 2 + (large ? Math.PI : 0);
							stage.ctx.callout({
								x: vx + (obj.arcR + 16) * Math.cos(ma),
								y: vy + (obj.arcR + 16) * Math.sin(ma)
							}, obj._label, {
								place: "above",
								gap: 2,
								style: {
									fontSize: "12px",
									fontFamily: "serif",
									fontStyle: "italic",
									color: obj._stroke,
									fontWeight: "600"
								}
							});
						}
						break;
					}
					case "fn": {
						const [d0, d1] = obj.domain;
						const n = obj.samples, step = (d1 - d0) / (n - 1);
						let r0 = 0, r1 = 1;
						if (obj.range) [r0, r1] = obj.range;
						else {
							let yMin = Infinity, yMax = -Infinity;
							for (let i = 0; i < n; i++) {
								const y = obj.f(d0 + i * step);
								if (y < yMin) yMin = y;
								if (y > yMax) yMax = y;
							}
							r0 = yMin;
							r1 = yMax;
							if (r0 === r1) {
								r0 -= 1;
								r1 += 1;
							}
						}
						const sx = (x) => obj.ox + (x - d0) / (d1 - d0) * obj.pw;
						const sy = (y) => obj.oy - (y - r0) / (r1 - r0) * obj.ph;
						const pts = [];
						for (let i = 0; i < n; i++) {
							const x = d0 + i * step;
							pts.push([sx(x), sy(obj.f(x))]);
						}
						g.append("polyline").attr("data-id", id).attr("points", pts.map((p) => p.join(",")).join(" ")).attr("fill", "none").attr("stroke", obj._stroke).attr("stroke-width", obj.strokeW).attr("stroke-dasharray", obj.dash).attr("opacity", obj._opacity);
						if (obj._label) {
							const mx = sx((d0 + d1) / 2), my = sy(obj.f((d0 + d1) / 2));
							stage.ctx.callout({
								x: mx,
								y: my
							}, obj._label, {
								place: "above",
								gap: 14,
								style: {
									fontSize: "13px",
									fontFamily: "serif",
									fontStyle: "italic",
									color: obj._stroke,
									fontWeight: "600"
								}
							});
						}
						break;
					}
					case "grid":
						for (let x = obj.ox; x <= obj.ox + obj.w; x += obj.sp) bg.append("line").attr("x1", x).attr("y1", obj.oy).attr("x2", x).attr("y2", obj.oy - obj.h).attr("stroke", obj._stroke).attr("stroke-width", obj.strokeW);
						for (let y = obj.oy; y >= obj.oy - obj.h; y -= obj.sp) bg.append("line").attr("x1", obj.ox).attr("y1", y).attr("x2", obj.ox + obj.w).attr("y2", y).attr("stroke", obj._stroke).attr("stroke-width", obj.strokeW);
						break;
					case "axes": {
						const as = 6;
						bg.append("line").attr("data-id", id + "x").attr("x1", obj.ox).attr("y1", obj.oy).attr("x2", obj.ox + obj.xl + as + 4).attr("y2", obj.oy).attr("stroke", obj._stroke).attr("stroke-width", obj.strokeW);
						bg.append("polygon").attr("data-id", id + "xt").attr("points", `${obj.ox + obj.xl + as + 4},${obj.oy} ${obj.ox + obj.xl},${obj.oy - as} ${obj.ox + obj.xl},${obj.oy + as}`).attr("fill", obj._stroke);
						bg.append("line").attr("data-id", id + "y").attr("x1", obj.ox).attr("y1", obj.oy).attr("x2", obj.ox).attr("y2", obj.oy - obj.yl - as - 4).attr("stroke", obj._stroke).attr("stroke-width", obj.strokeW);
						bg.append("polygon").attr("data-id", id + "yt").attr("points", `${obj.ox},${obj.oy - obj.yl - as - 4} ${obj.ox - as},${obj.oy - obj.yl} ${obj.ox + as},${obj.oy - obj.yl}`).attr("fill", obj._stroke);
						bg.append("circle").attr("data-id", id + "o").attr("cx", obj.ox).attr("cy", obj.oy).attr("r", 3).attr("fill", "#fff").attr("stroke", obj._stroke).attr("stroke-width", obj.strokeW);
						if (obj.xLabel) stage.ctx.callout({
							x: obj.ox + obj.xl / 2,
							y: obj.oy
						}, obj.xLabel, {
							place: "below",
							gap: 22,
							style: {
								fontSize: "12px",
								color: obj._stroke
							}
						});
						if (obj.yLabel) stage.ctx.callout({
							x: obj.ox - 32,
							y: obj.oy - obj.yl / 2
						}, obj.yLabel, {
							place: "left",
							gap: 4,
							style: {
								fontSize: "12px",
								color: obj._stroke
							}
						});
						break;
					}
				}
			}
		}
		return {
			vector(a, b, o) {
				const v = vector(stage, schedule, a, b, o);
				objects.push(v);
				return v;
			},
			point(p, o) {
				const pt = point(stage, schedule, p, o);
				objects.push(pt);
				return pt;
			},
			segment(a, b, o) {
				const s = segment(stage, schedule, a, b, o);
				objects.push(s);
				return s;
			},
			circle(c, r, o) {
				const ci = circle(stage, schedule, c, r, o);
				objects.push(ci);
				return ci;
			},
			polygon(v, o) {
				const pg = polygon(stage, schedule, v, o);
				objects.push(pg);
				return pg;
			},
			angle(v, r1, r2, o) {
				const ag = angle(stage, schedule, v, r1, r2, o);
				objects.push(ag);
				return ag;
			},
			grid(o, opts) {
				const gr = grid(stage, schedule, o, opts);
				objects.push(gr);
				return gr;
			},
			axes(o, opts) {
				const ax = axes(stage, schedule, o, opts);
				objects.push(ax);
				return ax;
			},
			fn(f, o) {
				const fnObj = fn(stage, schedule, f, o);
				objects.push(fnObj);
				return fnObj;
			},
			remove(obj) {
				const i = objects.indexOf(obj);
				if (i >= 0) objects.splice(i, 1);
				schedule();
				return this;
			},
			render,
			_objects: objects
		};
	}

//#endregion
//#region vis/layout.ts
	function cells(width, height, margin) {
		const W = width - margin * 2;
		const H = height - margin * 2;
		return {
			/** Horizontal split. ratios sum to 1. */
			hsplit(ratios) {
				let cx = margin;
				const gap = 8;
				const avail = W - (ratios.length - 1) * gap;
				return ratios.map((r) => {
					const w = avail * r;
					const cell = {
						x: cx,
						y: margin,
						w,
						h: H
					};
					cx += w + gap;
					return cell;
				});
			},
			/** Vertical split. ratios sum to 1. */
			vsplit(ratios) {
				let cy = margin;
				const gap = 8;
				const avail = H - (ratios.length - 1) * gap;
				return ratios.map((r) => {
					const h = avail * r;
					const cell = {
						x: margin,
						y: cy,
						w: W,
						h
					};
					cy += h + gap;
					return cell;
				});
			},
			/** 2D grid of cells. */
			grid(rows, cols) {
				const gap = 8;
				const cw = (W - (cols - 1) * gap) / cols;
				const ch = (H - (rows - 1) * gap) / rows;
				const result = [];
				for (let r = 0; r < rows; r++) {
					const row = [];
					for (let c = 0; c < cols; c++) row.push({
						x: margin + c * (cw + gap),
						y: margin + r * (ch + gap),
						w: cw,
						h: ch
					});
					result.push(row);
				}
				return result;
			}
		};
	}
	function createLayout(width, height, margin = 48) {
		return cells(width, height, margin);
	}

//#endregion
//#region vis/graph.ts
	function createGraph(stage) {
		const p = stage.palette;
		const _vertices = /* @__PURE__ */ new Map();
		const _edgeDefs = [];
		function drawAll() {
			const edgeAngles = /* @__PURE__ */ new Map();
			for (const { a, b } of _edgeDefs) {
				const angA = Math.atan2(b.y - a.y, b.x - a.x);
				const angB = Math.atan2(a.y - b.y, a.x - b.x);
				if (!edgeAngles.has(a.id)) edgeAngles.set(a.id, []);
				if (!edgeAngles.has(b.id)) edgeAngles.set(b.id, []);
				edgeAngles.get(a.id).push(angA);
				edgeAngles.get(b.id).push(angB);
			}
			const labelDirs = [
				{
					place: "above",
					angle: -Math.PI / 2
				},
				{
					place: "below",
					angle: Math.PI / 2
				},
				{
					place: "right",
					angle: 0
				},
				{
					place: "left",
					angle: Math.PI
				}
			];
			function angleDiff(a, b) {
				let d = Math.abs(a - b);
				if (d > Math.PI) d = 2 * Math.PI - d;
				return d;
			}
			function pickLabelPlace(vertexId) {
				const angles = edgeAngles.get(vertexId);
				if (!angles || angles.length === 0) return "above";
				for (const dir of labelDirs) if (angles.every((a) => angleDiff(a, dir.angle) >= Math.PI / 4)) return dir.place;
				return "above";
			}
			for (const v of _vertices.values()) {
				if (!_currentVertices.has(v.id)) continue;
				stage.ctx.dummy({
					id: "gv-" + v.id,
					x: v.x,
					y: v.y
				}, {
					dR: v._r,
					fill: v._fill,
					stroke: v._stroke,
					strokeW: 1.5,
					text: "",
					textSize: 0
				});
				const place = pickLabelPlace(v.id);
				stage.ctx.callout({
					x: v.x,
					y: v.y
				}, v._label, {
					place,
					gap: 6,
					style: {
						fontSize: "11px",
						fontFamily: "JetBrains Mono,monospace",
						color: v._stroke,
						fontWeight: "600"
					}
				});
			}
			for (const { a, b, opts } of _edgeDefs) {
				const eid = a.id + "-" + b.id;
				if (!_currentEdges.has(eid)) continue;
				const sw = opts.strokeW ?? 1.8, color = opts.stroke || p.dim.fg;
				const ar = a._r, br = b._r, gap = opts.gap ?? 4;
				const dx = b.x - a.x, dy = b.y - a.y;
				const len = Math.sqrt(dx * dx + dy * dy) || 1;
				const geid = "ge-" + a.id + "-" + b.id;
				const x1 = a.x + dx / len * (ar + gap);
				const y1 = a.y + dy / len * (ar + gap);
				const mt = markerTip();
				const toOffset = opts.directed !== false ? br + gap + mt : br + gap;
				const x2 = b.x - dx / len * toOffset;
				const y2 = b.y - dy / len * toOffset;
				if (opts.directed !== false) stage.ctx.edge({
					id: geid + "-f",
					x: x1,
					y: y1
				}, {
					id: geid + "-t",
					x: x2,
					y: y2
				}, {
					stroke: color,
					strokeW: sw,
					nW: 0,
					nH: 0,
					gap: 0
				});
				else stage.ctx.edge({
					id: geid + "-f",
					x: x1,
					y: y1
				}, {
					id: geid + "-t",
					x: x2,
					y: y2
				}, {
					stroke: color,
					strokeW: sw,
					nW: 0,
					nH: 0,
					gap: 0,
					dash: "",
					markerUrl: "none"
				});
				if (opts.weight != null || opts.label) {
					const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
					const mlx = mx - dy / len * (Math.max(ar, br) + 8);
					const mly = my + dx / len * (Math.max(ar, br) + 8);
					const label = opts.label || String(opts.weight);
					stage.ctx.callout({
						x: mlx,
						y: mly
					}, label, {
						place: "above",
						gap: 2,
						style: {
							fontSize: "10px",
							fontFamily: "JetBrains Mono,monospace",
							color,
							fontWeight: "600"
						}
					});
				}
			}
		}
		let _firstDraw = true;
		let _drawing = false;
		let _scheduled = false;
		let _seenVertices = /* @__PURE__ */ new Set();
		let _seenEdges = /* @__PURE__ */ new Set();
		let _currentVertices = /* @__PURE__ */ new Set();
		let _currentEdges = /* @__PURE__ */ new Set();
		function scheduleDraw() {
			if (_scheduled) return;
			_scheduled = true;
			queueMicrotask(() => {
				_scheduled = false;
				redraw();
			});
		}
		function redraw() {
			_drawing = true;
			_scheduled = false;
			_currentVertices = new Set(_seenVertices);
			_currentEdges = new Set(_seenEdges);
			_seenVertices.clear();
			_seenEdges.clear();
			if (_firstDraw) {
				stage.ctx.show(drawAll, 300);
				_firstDraw = false;
			} else stage.ctx.flow(drawAll, 500);
			_drawing = false;
			for (const id of _vertices.keys()) if (!_currentVertices.has(id)) _vertices.delete(id);
			for (let i = _edgeDefs.length - 1; i >= 0; i--) {
				const eid = _edgeDefs[i].a.id + "-" + _edgeDefs[i].b.id;
				if (!_currentEdges.has(eid)) _edgeDefs.splice(i, 1);
			}
		}
		function vertex(id, pos, opts = {}) {
			const r = opts.r ?? 10;
			const v = {
				id,
				x: pos[0],
				y: pos[1],
				_r: r,
				_stroke: opts.stroke || p.primary.fg,
				_fill: opts.fill || p.primary.a(15),
				_label: opts.label || id,
				pos() {
					return [this.x, this.y];
				}
			};
			_vertices.set(id, v);
			_seenVertices.add(id);
			if (!_drawing) scheduleDraw();
			return v;
		}
		function edge(a, b, opts = {}) {
			const idx = _edgeDefs.findIndex((e) => e.a.id === a.id && e.b.id === b.id);
			if (idx >= 0) _edgeDefs[idx] = {
				a,
				b,
				opts
			};
			else _edgeDefs.push({
				a,
				b,
				opts
			});
			_seenEdges.add(a.id + "-" + b.id);
			if (!_drawing) scheduleDraw();
		}
		function layout(type, vertices, edges, opts = {}) {
			const n = vertices.length;
			if (n === 0) return;
			const cx = opts.center?.[0] ?? stage.ctx.W / 2;
			const cy = opts.center?.[1] ?? stage.ctx.H / 2;
			switch (type) {
				case "circular": {
					const r = opts.radius ?? Math.min(stage.ctx.W, stage.ctx.H) * .35;
					vertices.forEach((v, i) => {
						const angle = 2 * Math.PI * i / n - Math.PI / 2;
						v.x = cx + r * Math.cos(angle);
						v.y = cy + r * Math.sin(angle);
					});
					break;
				}
				case "force": {
					const sim = simulation_default(vertices).force("charge", manyBody_default().strength(-300)).force("center", center_default(cx, cy)).force("collision", collide_default().radius((d) => d._r + 2));
					if (edges && edges.length > 0) {
						const links = edges.map((e) => ({
							source: e.from,
							target: e.to
						}));
						sim.force("link", link_default(links).id((d) => d.id).distance(60));
					}
					sim.stop();
					for (let i = 0; i < 300; i++) sim.tick();
					break;
				}
			}
			scheduleDraw();
		}
		return {
			vertex,
			edge,
			layout,
			redraw
		};
	}

//#endregion
//#region vis/stage.ts
/** Inject default stepper CSS once */
	let _cssInjected = false;
	function injectCSS() {
		if (_cssInjected || typeof document === "undefined") return;
		const s = document.createElement("style");
		s.textContent = `
    .vis-stepper{display:flex;gap:6px;margin-bottom:1rem;flex-wrap:wrap}
    .vis-stepper button{border:1px solid var(--border,oklch(0 0 0/0.12));background:var(--card,oklch(0.96 0.008 78/0.85));color:var(--text-dim,oklch(0.55 0.02 65));font-family:var(--font-mono,JetBrains Mono,monospace);font-size:0.78rem;padding:4px 14px;border-radius:6px;cursor:pointer;transition:all 0.15s}
    .vis-stepper button:hover{border-color:var(--blue,oklch(0.62 0.18 68));color:var(--blue,oklch(0.62 0.18 68))}
    .vis-stepper button.active{background:var(--blue-05,oklch(0.62 0.18 68/0.05));border-color:var(--blue,oklch(0.62 0.18 68));color:var(--blue,oklch(0.62 0.18 68));font-weight:600}
  `;
		document.head.appendChild(s);
		_cssInjected = true;
	}
	const _stages = /* @__PURE__ */ new Map();
	let _observer = null;
	function stage(selector, opts = {}) {
		const { width = 780, height = 460, margin = 48, geom, ms = 600, theme = "warm" } = opts;
		injectCSS();
		const prev = _stages.get(selector);
		if (prev) prev[Symbol.dispose]();
		const ctx = create(selector, {
			width,
			height,
			margin,
			geom
		});
		const _theme = resolveTheme(theme);
		const p = { ...ctx.palette };
		if (_theme.palette) {
			const tp = _theme.palette;
			for (const key of Object.keys(tp)) {
				const v = tp[key];
				if (v && v.fg) p[key] = {
					fg: v.fg,
					bg: v.bg || v.fg,
					a(pct) {
						const a = (pct / 100).toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
						return (v.fg.lastIndexOf(")") > 0 ? v.fg.slice(0, v.fg.lastIndexOf(")")) : v.fg) + " / " + a + ")";
					}
				};
			}
		}
		const _els = /* @__PURE__ */ new Map();
		const _tags = [];
		let _dirty = false, _drawing = false;
		function schedule() {
			if (_dirty || _drawing) return;
			_dirty = true;
			queueMicrotask(() => {
				if (!_dirty) return;
				_dirty = false;
				draw();
			});
		}
		const elements = createElements(ctx, p, schedule, _els);
		function tag(target, html) {
			if ("_id" in target) {
				const t = createBoundTag(ctx.callout, target, html);
				schedule();
				return t;
			}
			const t = createStandaloneTag(ctx.callout, target.pos(), html);
			_tags.push(t);
			schedule();
			return t;
		}
		const { axes, _axes } = createAxes(ctx.stage.bg, p, (pos, html) => {
			const t = createStandaloneTag(ctx.callout, pos, html);
			_tags.push(t);
			return t;
		}, schedule);
		let _first = true;
		function draw(dur) {
			_dirty = false;
			_drawing = true;
			const duration = dur ?? ms;
			const fn = () => {
				for (const el of _els.values()) el._draw();
				for (const t of _tags) t._draw();
				for (const a of _axes) a();
			};
			if (_first) {
				ctx.show(fn, duration);
				_first = false;
			} else ctx.flow(fn, duration);
			_drawing = false;
		}
		function animate(count, stepFn, opts = {}) {
			const { container = ".vis-stepper:not(.vis-init)", labels = [], texts = [], panel, start = 0 } = opts;
			let ct = typeof container === "string" ? document.querySelector(container) : container;
			if (!ct) {
				ct = document.createElement("div");
				ct.className = "vis-stepper vis-init";
				const stageEl = document.querySelector(selector);
				if (stageEl?.parentNode) stageEl.parentNode.insertBefore(ct, stageEl);
			}
			return steps(count, {
				container: ct.className ? `.${ct.className.split(" ").join(".")}` : container,
				labels,
				start,
				draw: (s) => {
					if (panel) {
						const el = typeof panel === "string" ? document.querySelector(panel) : panel;
						if (el && texts[s] !== void 0) el.innerHTML = texts[s];
					}
					stepFn(s);
					draw();
				}
			});
		}
		const api = {
			ctx,
			palette: p,
			stage: ctx.stage,
			root: ctx.root,
			dot: elements.dot,
			zone: elements.zone,
			arrow: elements.arrow,
			line: elements.line,
			path: elements.path,
			tag,
			axes,
			draw,
			animate,
			theme: _theme,
			raw: {
				show: ctx.show,
				flow: ctx.flow,
				render: ctx.render
			},
			math: void 0,
			graph: void 0,
			layout: void 0,
			[Symbol.dispose]() {
				_stages.delete(selector);
				_observer?.disconnect();
				ctx.svg.remove();
				ctx.root.selectAll("*").remove();
			}
		};
		const container = typeof selector === "string" ? document.querySelector(selector) : selector;
		if (container && typeof MutationObserver !== "undefined") {
			_observer = new MutationObserver(() => {
				if (!document.contains(container)) api[Symbol.dispose]();
			});
			_observer.observe(document.body, {
				childList: true,
				subtree: true
			});
		}
		_stages.set(selector, api);
		api.math = createMathRenderer(api);
		api.graph = createGraph(api);
		api.layout = createLayout(width, height, margin);
		return api;
	}

//#endregion
//#region vis/index.ts
	if (typeof Symbol.dispose === "undefined") Symbol.dispose = Symbol("Symbol.dispose");
	if (typeof Symbol.asyncDispose === "undefined") Symbol.asyncDispose = Symbol("Symbol.asyncDispose");

//#endregion
exports.MARKER = MARKER;
exports.TOKENS = TOKENS;
exports.alpha = alpha;
exports.block = block;
exports.boundBox = boundBox;
exports.centerIn = centerIn;
exports.compoundRect = compoundRect;
exports.create = create;
exports.createCanvas = createCanvas;
exports.createLayerGuides = createLayerGuides;
exports.crossEdge = crossEdge;
exports.defineArrows = defineArrows;
exports.distribute = distribute;
exports.domLabel = domLabel;
exports.drawDummy = drawDummy;
exports.drawNodeContent = drawNodeContent;
exports.edgeLabel = edgeLabel;
exports.entryPt = entryPt;
exports.exitPt = exitPt;
exports.getBounds = getBounds;
exports.group = group;
exports.halo = halo;
exports.katexify = katexify;
exports.lBend = lBend;
exports.len = len;
exports.markerTip = markerTip;
exports.pages = pages;
exports.palette = palette;
exports.pipeline = pipeline;
exports.resolveTheme = resolveTheme;
exports.stage = stage;
exports.stepper = stepper;
exports.steps = steps;
exports.svgLabel = svgLabel;
exports.themes = themes;
return exports;
})({});