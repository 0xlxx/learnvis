//#region node_modules/.pnpm/d3-array@3.2.4/node_modules/d3-array/src/ascending.js
function ascending$1(a, b) {
	return a == null || b == null ? NaN : a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
}

//#endregion
//#region node_modules/.pnpm/d3-array@3.2.4/node_modules/d3-array/src/descending.js
function descending(a, b) {
	return a == null || b == null ? NaN : b < a ? -1 : b > a ? 1 : b >= a ? 0 : NaN;
}

//#endregion
//#region node_modules/.pnpm/d3-array@3.2.4/node_modules/d3-array/src/bisector.js
function bisector(f) {
	let compare1, compare2, delta;
	if (f.length !== 2) {
		compare1 = ascending$1;
		compare2 = (d, x) => ascending$1(f(d), x);
		delta = (d, x) => f(d) - x;
	} else {
		compare1 = f === ascending$1 || f === descending ? f : zero$1;
		compare2 = f;
		delta = f;
	}
	function left(a, x, lo = 0, hi = a.length) {
		if (lo < hi) {
			if (compare1(x, x) !== 0) return hi;
			do {
				const mid = lo + hi >>> 1;
				if (compare2(a[mid], x) < 0) lo = mid + 1;
				else hi = mid;
			} while (lo < hi);
		}
		return lo;
	}
	function right(a, x, lo = 0, hi = a.length) {
		if (lo < hi) {
			if (compare1(x, x) !== 0) return hi;
			do {
				const mid = lo + hi >>> 1;
				if (compare2(a[mid], x) <= 0) lo = mid + 1;
				else hi = mid;
			} while (lo < hi);
		}
		return lo;
	}
	function center(a, x, lo = 0, hi = a.length) {
		const i = left(a, x, lo, hi - 1);
		return i > lo && delta(a[i - 1], x) > -delta(a[i], x) ? i - 1 : i;
	}
	return {
		left,
		center,
		right
	};
}
function zero$1() {
	return 0;
}

//#endregion
//#region node_modules/.pnpm/d3-array@3.2.4/node_modules/d3-array/src/number.js
function number$1(x) {
	return x === null ? NaN : +x;
}

//#endregion
//#region node_modules/.pnpm/d3-array@3.2.4/node_modules/d3-array/src/bisect.js
const ascendingBisect = bisector(ascending$1);
const bisectRight = ascendingBisect.right;
const bisectLeft = ascendingBisect.left;
const bisectCenter = bisector(number$1).center;

//#endregion
//#region node_modules/.pnpm/d3-array@3.2.4/node_modules/d3-array/src/ticks.js
const e10 = Math.sqrt(50), e5 = Math.sqrt(10), e2 = Math.sqrt(2);
function tickSpec(start, stop, count) {
	const step = (stop - start) / Math.max(0, count), power = Math.floor(Math.log10(step)), error = step / Math.pow(10, power), factor = error >= e10 ? 10 : error >= e5 ? 5 : error >= e2 ? 2 : 1;
	let i1, i2, inc;
	if (power < 0) {
		inc = Math.pow(10, -power) / factor;
		i1 = Math.round(start * inc);
		i2 = Math.round(stop * inc);
		if (i1 / inc < start) ++i1;
		if (i2 / inc > stop) --i2;
		inc = -inc;
	} else {
		inc = Math.pow(10, power) * factor;
		i1 = Math.round(start / inc);
		i2 = Math.round(stop / inc);
		if (i1 * inc < start) ++i1;
		if (i2 * inc > stop) --i2;
	}
	if (i2 < i1 && .5 <= count && count < 2) return tickSpec(start, stop, count * 2);
	return [
		i1,
		i2,
		inc
	];
}
function ticks(start, stop, count) {
	stop = +stop, start = +start, count = +count;
	if (!(count > 0)) return [];
	if (start === stop) return [start];
	const reverse = stop < start, [i1, i2, inc] = reverse ? tickSpec(stop, start, count) : tickSpec(start, stop, count);
	if (!(i2 >= i1)) return [];
	const n = i2 - i1 + 1, ticks = new Array(n);
	if (reverse) if (inc < 0) for (let i = 0; i < n; ++i) ticks[i] = (i2 - i) / -inc;
	else for (let i = 0; i < n; ++i) ticks[i] = (i2 - i) * inc;
	else if (inc < 0) for (let i = 0; i < n; ++i) ticks[i] = (i1 + i) / -inc;
	else for (let i = 0; i < n; ++i) ticks[i] = (i1 + i) * inc;
	return ticks;
}
function tickIncrement(start, stop, count) {
	stop = +stop, start = +start, count = +count;
	return tickSpec(start, stop, count)[2];
}
function tickStep(start, stop, count) {
	stop = +stop, start = +start, count = +count;
	const reverse = stop < start, inc = reverse ? tickIncrement(stop, start, count) : tickIncrement(start, stop, count);
	return (reverse ? -1 : 1) * (inc < 0 ? 1 / -inc : inc);
}

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
function linear$1(a, d) {
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
	return d ? linear$1(a, d) : constant_default$1(isNaN(a) ? b : a);
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
//#region node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/numberArray.js
function numberArray_default(a, b) {
	if (!b) b = [];
	var n = a ? Math.min(b.length, a.length) : 0, c = b.slice(), i;
	return function(t) {
		for (i = 0; i < n; ++i) c[i] = a[i] * (1 - t) + b[i] * t;
		return c;
	};
}
function isNumberArray(x) {
	return ArrayBuffer.isView(x) && !(x instanceof DataView);
}

//#endregion
//#region node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/array.js
function genericArray(a, b) {
	var nb = b ? b.length : 0, na = a ? Math.min(nb, a.length) : 0, x = new Array(na), c = new Array(nb), i;
	for (i = 0; i < na; ++i) x[i] = value_default(a[i], b[i]);
	for (; i < nb; ++i) c[i] = b[i];
	return function(t) {
		for (i = 0; i < na; ++i) c[i] = x[i](t);
		return c;
	};
}

//#endregion
//#region node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/date.js
function date_default(a, b) {
	var d = /* @__PURE__ */ new Date();
	return a = +a, b = +b, function(t) {
		return d.setTime(a * (1 - t) + b * t), d;
	};
}

//#endregion
//#region node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/number.js
function number_default(a, b) {
	return a = +a, b = +b, function(t) {
		return a * (1 - t) + b * t;
	};
}

//#endregion
//#region node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/object.js
function object_default(a, b) {
	var i = {}, c = {}, k;
	if (a === null || typeof a !== "object") a = {};
	if (b === null || typeof b !== "object") b = {};
	for (k in b) if (k in a) i[k] = value_default(a[k], b[k]);
	else c[k] = b[k];
	return function(t) {
		for (k in i) c[k] = i[k](t);
		return c;
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
//#region node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/value.js
function value_default(a, b) {
	var t = typeof b, c;
	return b == null || t === "boolean" ? constant_default$1(b) : (t === "number" ? number_default : t === "string" ? (c = color(b)) ? (b = c, rgb_default) : string_default : b instanceof color ? rgb_default : b instanceof Date ? date_default : isNumberArray(b) ? numberArray_default : Array.isArray(b) ? genericArray : typeof b.valueOf !== "function" && typeof b.toString !== "function" || isNaN(b) ? object_default : number_default)(a, b);
}

//#endregion
//#region node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/round.js
function round_default(a, b) {
	return a = +a, b = +b, function(t) {
		return Math.round(a * (1 - t) + b * t);
	};
}

//#endregion
//#region node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/transform/decompose.js
var degrees = 180 / Math.PI;
var identity$2 = {
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
	return m.isIdentity ? identity$2 : decompose_default(m.a, m.b, m.c, m.d, m.e, m.f);
}
function parseSvg(value) {
	if (value == null) return identity$2;
	if (!svgNode) svgNode = document.createElementNS("http://www.w3.org/2000/svg", "g");
	svgNode.setAttribute("transform", value);
	if (!(value = svgNode.transform.baseVal.consolidate())) return identity$2;
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
	create(node, id, {
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
function create(node, id, self) {
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
function cubicIn(t) {
	return t * t * t;
}
function cubicOut(t) {
	return --t * t * t + 1;
}
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
//#region node_modules/.pnpm/d3-format@3.1.2/node_modules/d3-format/src/formatDecimal.js
function formatDecimal_default(x) {
	return Math.abs(x = Math.round(x)) >= 1e21 ? x.toLocaleString("en").replace(/,/g, "") : x.toString(10);
}
function formatDecimalParts(x, p) {
	if (!isFinite(x) || x === 0) return null;
	var i = (x = p ? x.toExponential(p - 1) : x.toExponential()).indexOf("e"), coefficient = x.slice(0, i);
	return [coefficient.length > 1 ? coefficient[0] + coefficient.slice(2) : coefficient, +x.slice(i + 1)];
}

//#endregion
//#region node_modules/.pnpm/d3-format@3.1.2/node_modules/d3-format/src/exponent.js
function exponent_default(x) {
	return x = formatDecimalParts(Math.abs(x)), x ? x[1] : NaN;
}

//#endregion
//#region node_modules/.pnpm/d3-format@3.1.2/node_modules/d3-format/src/formatGroup.js
function formatGroup_default(grouping, thousands) {
	return function(value, width) {
		var i = value.length, t = [], j = 0, g = grouping[0], length = 0;
		while (i > 0 && g > 0) {
			if (length + g + 1 > width) g = Math.max(1, width - length);
			t.push(value.substring(i -= g, i + g));
			if ((length += g + 1) > width) break;
			g = grouping[j = (j + 1) % grouping.length];
		}
		return t.reverse().join(thousands);
	};
}

//#endregion
//#region node_modules/.pnpm/d3-format@3.1.2/node_modules/d3-format/src/formatNumerals.js
function formatNumerals_default(numerals) {
	return function(value) {
		return value.replace(/[0-9]/g, function(i) {
			return numerals[+i];
		});
	};
}

//#endregion
//#region node_modules/.pnpm/d3-format@3.1.2/node_modules/d3-format/src/formatSpecifier.js
var re = /^(?:(.)?([<>=^]))?([+\-( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?(~)?([a-z%])?$/i;
function formatSpecifier(specifier) {
	if (!(match = re.exec(specifier))) throw new Error("invalid format: " + specifier);
	var match;
	return new FormatSpecifier({
		fill: match[1],
		align: match[2],
		sign: match[3],
		symbol: match[4],
		zero: match[5],
		width: match[6],
		comma: match[7],
		precision: match[8] && match[8].slice(1),
		trim: match[9],
		type: match[10]
	});
}
formatSpecifier.prototype = FormatSpecifier.prototype;
function FormatSpecifier(specifier) {
	this.fill = specifier.fill === void 0 ? " " : specifier.fill + "";
	this.align = specifier.align === void 0 ? ">" : specifier.align + "";
	this.sign = specifier.sign === void 0 ? "-" : specifier.sign + "";
	this.symbol = specifier.symbol === void 0 ? "" : specifier.symbol + "";
	this.zero = !!specifier.zero;
	this.width = specifier.width === void 0 ? void 0 : +specifier.width;
	this.comma = !!specifier.comma;
	this.precision = specifier.precision === void 0 ? void 0 : +specifier.precision;
	this.trim = !!specifier.trim;
	this.type = specifier.type === void 0 ? "" : specifier.type + "";
}
FormatSpecifier.prototype.toString = function() {
	return this.fill + this.align + this.sign + this.symbol + (this.zero ? "0" : "") + (this.width === void 0 ? "" : Math.max(1, this.width | 0)) + (this.comma ? "," : "") + (this.precision === void 0 ? "" : "." + Math.max(0, this.precision | 0)) + (this.trim ? "~" : "") + this.type;
};

//#endregion
//#region node_modules/.pnpm/d3-format@3.1.2/node_modules/d3-format/src/formatTrim.js
function formatTrim_default(s) {
	out: for (var n = s.length, i = 1, i0 = -1, i1; i < n; ++i) switch (s[i]) {
		case ".":
			i0 = i1 = i;
			break;
		case "0":
			if (i0 === 0) i0 = i;
			i1 = i;
			break;
		default:
			if (!+s[i]) break out;
			if (i0 > 0) i0 = 0;
			break;
	}
	return i0 > 0 ? s.slice(0, i0) + s.slice(i1 + 1) : s;
}

//#endregion
//#region node_modules/.pnpm/d3-format@3.1.2/node_modules/d3-format/src/formatPrefixAuto.js
var prefixExponent;
function formatPrefixAuto_default(x, p) {
	var d = formatDecimalParts(x, p);
	if (!d) return prefixExponent = void 0, x.toPrecision(p);
	var coefficient = d[0], exponent = d[1], i = exponent - (prefixExponent = Math.max(-8, Math.min(8, Math.floor(exponent / 3))) * 3) + 1, n = coefficient.length;
	return i === n ? coefficient : i > n ? coefficient + new Array(i - n + 1).join("0") : i > 0 ? coefficient.slice(0, i) + "." + coefficient.slice(i) : "0." + new Array(1 - i).join("0") + formatDecimalParts(x, Math.max(0, p + i - 1))[0];
}

//#endregion
//#region node_modules/.pnpm/d3-format@3.1.2/node_modules/d3-format/src/formatRounded.js
function formatRounded_default(x, p) {
	var d = formatDecimalParts(x, p);
	if (!d) return x + "";
	var coefficient = d[0], exponent = d[1];
	return exponent < 0 ? "0." + new Array(-exponent).join("0") + coefficient : coefficient.length > exponent + 1 ? coefficient.slice(0, exponent + 1) + "." + coefficient.slice(exponent + 1) : coefficient + new Array(exponent - coefficient.length + 2).join("0");
}

//#endregion
//#region node_modules/.pnpm/d3-format@3.1.2/node_modules/d3-format/src/formatTypes.js
var formatTypes_default = {
	"%": (x, p) => (x * 100).toFixed(p),
	"b": (x) => Math.round(x).toString(2),
	"c": (x) => x + "",
	"d": formatDecimal_default,
	"e": (x, p) => x.toExponential(p),
	"f": (x, p) => x.toFixed(p),
	"g": (x, p) => x.toPrecision(p),
	"o": (x) => Math.round(x).toString(8),
	"p": (x, p) => formatRounded_default(x * 100, p),
	"r": formatRounded_default,
	"s": formatPrefixAuto_default,
	"X": (x) => Math.round(x).toString(16).toUpperCase(),
	"x": (x) => Math.round(x).toString(16)
};

//#endregion
//#region node_modules/.pnpm/d3-format@3.1.2/node_modules/d3-format/src/identity.js
function identity_default(x) {
	return x;
}

//#endregion
//#region node_modules/.pnpm/d3-format@3.1.2/node_modules/d3-format/src/locale.js
var map = Array.prototype.map, prefixes = [
	"y",
	"z",
	"a",
	"f",
	"p",
	"n",
	"µ",
	"m",
	"",
	"k",
	"M",
	"G",
	"T",
	"P",
	"E",
	"Z",
	"Y"
];
function locale_default(locale) {
	var group = locale.grouping === void 0 || locale.thousands === void 0 ? identity_default : formatGroup_default(map.call(locale.grouping, Number), locale.thousands + ""), currencyPrefix = locale.currency === void 0 ? "" : locale.currency[0] + "", currencySuffix = locale.currency === void 0 ? "" : locale.currency[1] + "", decimal = locale.decimal === void 0 ? "." : locale.decimal + "", numerals = locale.numerals === void 0 ? identity_default : formatNumerals_default(map.call(locale.numerals, String)), percent = locale.percent === void 0 ? "%" : locale.percent + "", minus = locale.minus === void 0 ? "−" : locale.minus + "", nan = locale.nan === void 0 ? "NaN" : locale.nan + "";
	function newFormat(specifier, options) {
		specifier = formatSpecifier(specifier);
		var fill = specifier.fill, align = specifier.align, sign = specifier.sign, symbol = specifier.symbol, zero = specifier.zero, width = specifier.width, comma = specifier.comma, precision = specifier.precision, trim = specifier.trim, type = specifier.type;
		if (type === "n") comma = true, type = "g";
		else if (!formatTypes_default[type]) precision === void 0 && (precision = 12), trim = true, type = "g";
		if (zero || fill === "0" && align === "=") zero = true, fill = "0", align = "=";
		var prefix = (options && options.prefix !== void 0 ? options.prefix : "") + (symbol === "$" ? currencyPrefix : symbol === "#" && /[boxX]/.test(type) ? "0" + type.toLowerCase() : ""), suffix = (symbol === "$" ? currencySuffix : /[%p]/.test(type) ? percent : "") + (options && options.suffix !== void 0 ? options.suffix : "");
		var formatType = formatTypes_default[type], maybeSuffix = /[defgprs%]/.test(type);
		precision = precision === void 0 ? 6 : /[gprs]/.test(type) ? Math.max(1, Math.min(21, precision)) : Math.max(0, Math.min(20, precision));
		function format(value) {
			var valuePrefix = prefix, valueSuffix = suffix, i, n, c;
			if (type === "c") {
				valueSuffix = formatType(value) + valueSuffix;
				value = "";
			} else {
				value = +value;
				var valueNegative = value < 0 || 1 / value < 0;
				value = isNaN(value) ? nan : formatType(Math.abs(value), precision);
				if (trim) value = formatTrim_default(value);
				if (valueNegative && +value === 0 && sign !== "+") valueNegative = false;
				valuePrefix = (valueNegative ? sign === "(" ? sign : minus : sign === "-" || sign === "(" ? "" : sign) + valuePrefix;
				valueSuffix = (type === "s" && !isNaN(value) && prefixExponent !== void 0 ? prefixes[8 + prefixExponent / 3] : "") + valueSuffix + (valueNegative && sign === "(" ? ")" : "");
				if (maybeSuffix) {
					i = -1, n = value.length;
					while (++i < n) if (c = value.charCodeAt(i), 48 > c || c > 57) {
						valueSuffix = (c === 46 ? decimal + value.slice(i + 1) : value.slice(i)) + valueSuffix;
						value = value.slice(0, i);
						break;
					}
				}
			}
			if (comma && !zero) value = group(value, Infinity);
			var length = valuePrefix.length + value.length + valueSuffix.length, padding = length < width ? new Array(width - length + 1).join(fill) : "";
			if (comma && zero) value = group(padding + value, padding.length ? width - valueSuffix.length : Infinity), padding = "";
			switch (align) {
				case "<":
					value = valuePrefix + value + valueSuffix + padding;
					break;
				case "=":
					value = valuePrefix + padding + value + valueSuffix;
					break;
				case "^":
					value = padding.slice(0, length = padding.length >> 1) + valuePrefix + value + valueSuffix + padding.slice(length);
					break;
				default:
					value = padding + valuePrefix + value + valueSuffix;
					break;
			}
			return numerals(value);
		}
		format.toString = function() {
			return specifier + "";
		};
		return format;
	}
	function formatPrefix(specifier, value) {
		var e = Math.max(-8, Math.min(8, Math.floor(exponent_default(value) / 3))) * 3, k = Math.pow(10, -e), f = newFormat((specifier = formatSpecifier(specifier), specifier.type = "f", specifier), { suffix: prefixes[8 + e / 3] });
		return function(value) {
			return f(k * value);
		};
	}
	return {
		format: newFormat,
		formatPrefix
	};
}

//#endregion
//#region node_modules/.pnpm/d3-format@3.1.2/node_modules/d3-format/src/defaultLocale.js
var locale;
var format;
var formatPrefix;
defaultLocale({
	thousands: ",",
	grouping: [3],
	currency: ["$", ""]
});
function defaultLocale(definition) {
	locale = locale_default(definition);
	format = locale.format;
	formatPrefix = locale.formatPrefix;
	return locale;
}

//#endregion
//#region node_modules/.pnpm/d3-format@3.1.2/node_modules/d3-format/src/precisionFixed.js
function precisionFixed_default(step) {
	return Math.max(0, -exponent_default(Math.abs(step)));
}

//#endregion
//#region node_modules/.pnpm/d3-format@3.1.2/node_modules/d3-format/src/precisionPrefix.js
function precisionPrefix_default(step, value) {
	return Math.max(0, Math.max(-8, Math.min(8, Math.floor(exponent_default(value) / 3))) * 3 - exponent_default(Math.abs(step)));
}

//#endregion
//#region node_modules/.pnpm/d3-format@3.1.2/node_modules/d3-format/src/precisionRound.js
function precisionRound_default(step, max) {
	step = Math.abs(step), max = Math.abs(max) - step;
	return Math.max(0, exponent_default(max) - exponent_default(step)) + 1;
}

//#endregion
//#region node_modules/.pnpm/d3-scale@4.0.2/node_modules/d3-scale/src/init.js
function initRange(domain, range) {
	switch (arguments.length) {
		case 0: break;
		case 1:
			this.range(domain);
			break;
		default:
			this.range(range).domain(domain);
			break;
	}
	return this;
}

//#endregion
//#region node_modules/.pnpm/d3-scale@4.0.2/node_modules/d3-scale/src/constant.js
function constants(x) {
	return function() {
		return x;
	};
}

//#endregion
//#region node_modules/.pnpm/d3-scale@4.0.2/node_modules/d3-scale/src/number.js
function number(x) {
	return +x;
}

//#endregion
//#region node_modules/.pnpm/d3-scale@4.0.2/node_modules/d3-scale/src/continuous.js
var unit = [0, 1];
function identity$1(x) {
	return x;
}
function normalize(a, b) {
	return (b -= a = +a) ? function(x) {
		return (x - a) / b;
	} : constants(isNaN(b) ? NaN : .5);
}
function clamper(a, b) {
	var t;
	if (a > b) t = a, a = b, b = t;
	return function(x) {
		return Math.max(a, Math.min(b, x));
	};
}
function bimap(domain, range, interpolate) {
	var d0 = domain[0], d1 = domain[1], r0 = range[0], r1 = range[1];
	if (d1 < d0) d0 = normalize(d1, d0), r0 = interpolate(r1, r0);
	else d0 = normalize(d0, d1), r0 = interpolate(r0, r1);
	return function(x) {
		return r0(d0(x));
	};
}
function polymap(domain, range, interpolate) {
	var j = Math.min(domain.length, range.length) - 1, d = new Array(j), r = new Array(j), i = -1;
	if (domain[j] < domain[0]) {
		domain = domain.slice().reverse();
		range = range.slice().reverse();
	}
	while (++i < j) {
		d[i] = normalize(domain[i], domain[i + 1]);
		r[i] = interpolate(range[i], range[i + 1]);
	}
	return function(x) {
		var i = bisectRight(domain, x, 1, j) - 1;
		return r[i](d[i](x));
	};
}
function copy(source, target) {
	return target.domain(source.domain()).range(source.range()).interpolate(source.interpolate()).clamp(source.clamp()).unknown(source.unknown());
}
function transformer() {
	var domain = unit, range = unit, interpolate = value_default, transform, untransform, unknown, clamp = identity$1, piecewise, output, input;
	function rescale() {
		var n = Math.min(domain.length, range.length);
		if (clamp !== identity$1) clamp = clamper(domain[0], domain[n - 1]);
		piecewise = n > 2 ? polymap : bimap;
		output = input = null;
		return scale;
	}
	function scale(x) {
		return x == null || isNaN(x = +x) ? unknown : (output || (output = piecewise(domain.map(transform), range, interpolate)))(transform(clamp(x)));
	}
	scale.invert = function(y) {
		return clamp(untransform((input || (input = piecewise(range, domain.map(transform), number_default)))(y)));
	};
	scale.domain = function(_) {
		return arguments.length ? (domain = Array.from(_, number), rescale()) : domain.slice();
	};
	scale.range = function(_) {
		return arguments.length ? (range = Array.from(_), rescale()) : range.slice();
	};
	scale.rangeRound = function(_) {
		return range = Array.from(_), interpolate = round_default, rescale();
	};
	scale.clamp = function(_) {
		return arguments.length ? (clamp = _ ? true : identity$1, rescale()) : clamp !== identity$1;
	};
	scale.interpolate = function(_) {
		return arguments.length ? (interpolate = _, rescale()) : interpolate;
	};
	scale.unknown = function(_) {
		return arguments.length ? (unknown = _, scale) : unknown;
	};
	return function(t, u) {
		transform = t, untransform = u;
		return rescale();
	};
}
function continuous() {
	return transformer()(identity$1, identity$1);
}

//#endregion
//#region node_modules/.pnpm/d3-scale@4.0.2/node_modules/d3-scale/src/tickFormat.js
function tickFormat(start, stop, count, specifier) {
	var step = tickStep(start, stop, count), precision;
	specifier = formatSpecifier(specifier == null ? ",f" : specifier);
	switch (specifier.type) {
		case "s":
			var value = Math.max(Math.abs(start), Math.abs(stop));
			if (specifier.precision == null && !isNaN(precision = precisionPrefix_default(step, value))) specifier.precision = precision;
			return formatPrefix(specifier, value);
		case "":
		case "e":
		case "g":
		case "p":
		case "r":
			if (specifier.precision == null && !isNaN(precision = precisionRound_default(step, Math.max(Math.abs(start), Math.abs(stop))))) specifier.precision = precision - (specifier.type === "e");
			break;
		case "f":
		case "%":
			if (specifier.precision == null && !isNaN(precision = precisionFixed_default(step))) specifier.precision = precision - (specifier.type === "%") * 2;
			break;
	}
	return format(specifier);
}

//#endregion
//#region node_modules/.pnpm/d3-scale@4.0.2/node_modules/d3-scale/src/linear.js
function linearish(scale) {
	var domain = scale.domain;
	scale.ticks = function(count) {
		var d = domain();
		return ticks(d[0], d[d.length - 1], count == null ? 10 : count);
	};
	scale.tickFormat = function(count, specifier) {
		var d = domain();
		return tickFormat(d[0], d[d.length - 1], count == null ? 10 : count, specifier);
	};
	scale.nice = function(count) {
		if (count == null) count = 10;
		var d = domain();
		var i0 = 0;
		var i1 = d.length - 1;
		var start = d[i0];
		var stop = d[i1];
		var prestep;
		var step;
		var maxIter = 10;
		if (stop < start) {
			step = start, start = stop, stop = step;
			step = i0, i0 = i1, i1 = step;
		}
		while (maxIter-- > 0) {
			step = tickIncrement(start, stop, count);
			if (step === prestep) {
				d[i0] = start;
				d[i1] = stop;
				return domain(d);
			} else if (step > 0) {
				start = Math.floor(start / step) * step;
				stop = Math.ceil(stop / step) * step;
			} else if (step < 0) {
				start = Math.ceil(start * step) / step;
				stop = Math.floor(stop * step) / step;
			} else break;
			prestep = step;
		}
		return scale;
	};
	return scale;
}
function linear() {
	var scale = continuous();
	scale.copy = function() {
		return copy(scale, linear());
	};
	initRange.apply(scale, arguments);
	return linearish(scale);
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
//#region vis/types.ts
/** Construct a typed EntityId from a prefix and name. Internal use. */
function eid(prefix, id) {
	if (!id) id = "_";
	return `${prefix}:${id}`;
}

//#endregion
//#region vis/transform.ts
function lerp(a, b, t) {
	return a + (b - a) * t;
}
/** Interpolate between two transform arrays (must be same structure) */
function interpolate(a, b, t) {
	return a.map((tf, i) => {
		const bt = b[i] ?? tf;
		switch (tf.type) {
			case "rotate": return {
				...tf,
				angle: lerp(tf.angle, bt.angle, t)
			};
			case "scale": return {
				...tf,
				sx: lerp(tf.sx, bt.sx, t),
				sy: lerp(tf.sy, bt.sy, t)
			};
			case "translate": return {
				...tf,
				dx: lerp(tf.dx, bt.dx, t),
				dy: lerp(tf.dy, bt.dy, t)
			};
			case "matrix": return {
				...tf,
				a: lerp(tf.a, bt.a, t),
				b: lerp(tf.b, bt.b, t),
				c: lerp(tf.c, bt.c, t),
				d: lerp(tf.d, bt.d, t),
				tx: lerp(tf.tx, bt.tx, t),
				ty: lerp(tf.ty, bt.ty, t)
			};
		}
	});
}
/** Apply transforms to line geometry (from→to) */
function applyLine(from, to, tf) {
	let nf = [...from], nt = [...to];
	for (const t of tf) switch (t.type) {
		case "rotate": {
			const cos = Math.cos(t.angle * Math.PI / 180), sin = Math.sin(t.angle * Math.PI / 180);
			const rot = (px, py) => [t.cx + (px - t.cx) * cos - (py - t.cy) * sin, t.cy + (px - t.cx) * sin + (py - t.cy) * cos];
			nf = rot(nf[0], nf[1]);
			nt = rot(nt[0], nt[1]);
			break;
		}
		case "scale":
			nt = [nf[0] + (nt[0] - nf[0]) * t.sx, nf[1] + (nt[1] - nf[1]) * t.sy];
			break;
		case "translate":
			nf = [nf[0] + t.dx, nf[1] + t.dy];
			nt = [nt[0] + t.dx, nt[1] + t.dy];
			break;
		case "matrix": {
			const { a, b, c, d, tx = 0, ty = 0 } = t;
			const dx = nt[0] - nf[0], dy = nt[1] - nf[1];
			nf = [nf[0] + tx, nf[1] + ty];
			nt = [nf[0] + a * dx + c * dy, nf[1] + b * dx + d * dy];
			break;
		}
	}
	return {
		from: nf,
		to: nt
	};
}
/** Apply transforms to polygon vertices */
function applyVertices(vertices, tf) {
	let nv = vertices.map((v) => [...v]);
	for (const t of tf) switch (t.type) {
		case "rotate": {
			const cos = Math.cos(t.angle * Math.PI / 180), sin = Math.sin(t.angle * Math.PI / 180);
			nv = nv.map(([px, py]) => [t.cx + (px - t.cx) * cos - (py - t.cy) * sin, t.cy + (px - t.cx) * sin + (py - t.cy) * cos]);
			break;
		}
		case "scale": {
			const cx = nv.reduce((s, v) => s + v[0], 0) / nv.length, cy = nv.reduce((s, v) => s + v[1], 0) / nv.length;
			nv = nv.map(([px, py]) => [cx + (px - cx) * t.sx, cy + (py - cy) * t.sy]);
			break;
		}
		case "translate":
			nv = nv.map(([px, py]) => [px + t.dx, py + t.dy]);
			break;
		case "matrix": {
			const { a, b, c, d, tx = 0, ty = 0 } = t;
			const ox = nv[0][0], oy = nv[0][1];
			nv = nv.map(([px, py]) => {
				const dx = px - ox, dy = py - oy;
				return [ox + a * dx + c * dy + tx, oy + b * dx + d * dy + ty];
			});
			break;
		}
	}
	return nv;
}

//#endregion
//#region vis/color.ts
/**
* Convert an oklch() CSS color string to #rrggbb hex.
* Falls through unchanged if the input is not an oklch color.
*
* Math: oklch → oklab → linear sRGB → gamma-corrected sRGB → hex.
* Reference: https://www.w3.org/TR/css-color-4/#oklab-to-srgb
*/
function oklchToHex(c) {
	if (!c.startsWith("oklch(")) return c;
	const m = c.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+))?\)/);
	if (!m) return c;
	const L = parseFloat(m[1]);
	const C = parseFloat(m[2]);
	const H = parseFloat(m[3]);
	const alpha = m[4] ? parseFloat(m[4]) : 1;
	const hRad = H * Math.PI / 180;
	const a = C * Math.cos(hRad);
	const b = C * Math.sin(hRad);
	const l_ = L + .3963377774 * a + .2158037573 * b;
	const m_ = L - .1055613458 * a - .0638541728 * b;
	const s_ = L - .0894841775 * a - 1.291485548 * b;
	const l3 = l_ * l_ * l_;
	const m3 = m_ * m_ * m_;
	const s3 = s_ * s_ * s_;
	const rLin = 4.0767416621 * l3 - 3.3077115913 * m3 + .2309699292 * s3;
	const gLin = -1.2684380046 * l3 + 2.6097574011 * m3 - .3413193965 * s3;
	const bLin = -.0041960863 * l3 - .7034186147 * m3 + 1.707614701 * s3;
	const toSRGB = (v) => {
		const abs = Math.abs(v);
		return abs <= .0031308 ? 12.92 * v : 1.055 * Math.pow(abs, 1 / 2.4) - .055;
	};
	const clamp = (v) => Math.max(0, Math.min(255, Math.round(v * 255)));
	const R = clamp(toSRGB(rLin));
	const G = clamp(toSRGB(gLin));
	const B = clamp(toSRGB(bLin));
	const hex = "#" + [
		R,
		G,
		B
	].map((v) => v.toString(16).padStart(2, "0")).join("");
	if (alpha < 1) {
		const blend = (c) => Math.round(c * alpha + 255 * (1 - alpha));
		return "#" + [
			blend(R),
			blend(G),
			blend(B)
		].map((v) => v.toString(16).padStart(2, "0")).join("");
	}
	return hex;
}
/**
* Ensure a color value is safe for SVG attributes.
* Converts oklch → hex; passes everything else through unchanged.
* Also handles the CSS `var(--xxx)` and `none` keywords.
*/
function svgColor(c) {
	if (!c) return c ?? "";
	if (c.startsWith("var(") || c === "none" || c.startsWith("#")) return c;
	if (c.startsWith("oklch(")) return oklchToHex(c);
	return c;
}

//#endregion
//#region vis/renderer/svg.ts
/** Ray-box intersection: how far along direction (dx,dy) from (ox,oy)
*  to reach the rectangle [xMin,xMax]×[yMin,yMax].
*  Returns [tNeg, tPos] — t-parameters for negative and positive directions. */
function rayBoxExtent(ox, oy, dx, dy, xMin, xMax, yMin, yMax) {
	let tPos = Infinity, tNeg = Infinity;
	if (dx > .001) {
		tPos = Math.min(tPos, (xMax - ox) / dx);
		tNeg = Math.min(tNeg, (ox - xMin) / dx);
	}
	if (dx < -.001) {
		tNeg = Math.min(tNeg, (xMax - ox) / -dx);
		tPos = Math.min(tPos, (ox - xMin) / -dx);
	}
	if (dy > .001) {
		tPos = Math.min(tPos, (yMax - oy) / dy);
		tNeg = Math.min(tNeg, (oy - yMin) / dy);
	}
	if (dy < -.001) {
		tNeg = Math.min(tNeg, (yMax - oy) / -dy);
		tPos = Math.min(tPos, (oy - yMin) / -dy);
	}
	return [tNeg, tPos];
}
function computeAxesGeometry(gd) {
	const ox = gd.ox ?? 0, oy = gd.oy ?? 0;
	const as = gd.arrowSize ?? 8;
	const ah = as / 2;
	const ix = gd.ix ?? 1, iy = gd.iy ?? 0, jx = gd.jx ?? 0, jy = gd.jy ?? -1;
	if (iy !== 0 || jx !== 0) {
		const iLen = Math.sqrt(ix * ix + iy * iy) || 1;
		const jLen = Math.sqrt(jx * jx + jy * jy) || 1;
		const iu = ix / iLen, iv = iy / iLen;
		const ju = jx / jLen, jv = jy / jLen;
		const xMin = gd.xMin ?? 0, xMax = gd.xMax ?? ox + 300;
		const yMin = gd.yMin ?? oy - 200, yMax = gd.yMax ?? oy + 200;
		const [iNegT, iPosT] = rayBoxExtent(ox, oy, ix, iy, xMin, xMax, yMin, yMax);
		const [jNegT, jPosT] = rayBoxExtent(ox, oy, jx, jy, xMin, xMax, yMin, yMax);
		const ixNeg = ox - ix * iNegT, iyNeg = oy - iy * iNegT;
		const ixPos = ox + ix * iPosT, iyPos = oy + iy * iPosT;
		const jxNeg = ox - jx * jNegT, jyNeg = oy - jy * jNegT;
		const jxPos = ox + jx * jPosT, jyPos = oy + jy * jPosT;
		return {
			xLine: {
				x1: ixNeg,
				y1: iyNeg,
				x2: ixPos,
				y2: iyPos
			},
			yLine: {
				x1: jxNeg,
				y1: jyNeg,
				x2: jxPos,
				y2: jyPos
			},
			rightArrow: `${ixPos},${iyPos} ${ixPos - iu * as + iv * ah},${iyPos - iv * as - iu * ah} ${ixPos - iu * as - iv * ah},${iyPos - iv * as + iu * ah}`,
			leftArrow: `${ixNeg},${iyNeg} ${ixNeg + iu * as + iv * ah},${iyNeg + iv * as - iu * ah} ${ixNeg + iu * as - iv * ah},${iyNeg + iv * as + iu * ah}`,
			topArrow: `${jxPos},${jyPos} ${jxPos - ju * as + jv * ah},${jyPos - jv * as - ju * ah} ${jxPos - ju * as - jv * ah},${jyPos - jv * as + ju * ah}`,
			bottomArrow: `${jxNeg},${jyNeg} ${jxNeg + ju * as + jv * ah},${jyNeg + jv * as - ju * ah} ${jxNeg + ju * as - jv * ah},${jyNeg + jv * as + ju * ah}`,
			stdOpacity: "1"
		};
	}
	const xL = gd.xMin ?? ox;
	const xR = gd.xMax ?? ox + 300;
	const yT = gd.yMin ?? oy - 200;
	const yB = gd.yMax ?? oy + 200;
	return {
		xLine: {
			x1: xL,
			y1: oy,
			x2: xR,
			y2: oy
		},
		yLine: {
			x1: ox,
			y1: yB,
			x2: ox,
			y2: yT
		},
		rightArrow: `${xR},${oy} ${xR - as},${oy - ah} ${xR - as},${oy + ah}`,
		leftArrow: `${xL},${oy} ${xL + as},${oy - ah} ${xL + as},${oy + ah}`,
		topArrow: `${ox},${yT} ${ox - ah},${yT + as} ${ox + ah},${yT + as}`,
		bottomArrow: `${ox},${yB} ${ox - ah},${yB - as} ${ox + ah},${yB - as}`,
		stdOpacity: "1"
	};
}
/** Draw or update axes group. On create, appends all 7 children with data-role
*  attributes. On update (when transition is provided), selects by data-role
*  and transitions geometry — no fragile DOM-index assumptions. */
function drawAxesGroup(g, gd, tr) {
	const geo = computeAxesGeometry(gd);
	const sw = gd.strokeW ?? 1.4;
	const stroke = svgColor(gd.stroke);
	const children = g.selectAll("*");
	if (tr && children.size() >= 7) {
		const sel = (role) => g.select(`[data-role="${role}"]`).interrupt().transition(tr);
		sel("x-axis").attr("x1", geo.xLine.x1).attr("y1", geo.xLine.y1).attr("x2", geo.xLine.x2).attr("y2", geo.xLine.y2);
		sel("x-arrow-right").attr("points", geo.rightArrow).attr("opacity", geo.stdOpacity);
		sel("x-arrow-left").attr("points", geo.leftArrow).attr("opacity", geo.stdOpacity);
		sel("y-axis").attr("x1", geo.yLine.x1).attr("y1", geo.yLine.y1).attr("x2", geo.yLine.x2).attr("y2", geo.yLine.y2);
		sel("y-arrow-top").attr("points", geo.topArrow).attr("opacity", geo.stdOpacity);
		sel("y-arrow-bottom").attr("points", geo.bottomArrow).attr("opacity", geo.stdOpacity);
		sel("origin").attr("cx", gd.ox ?? 0).attr("cy", gd.oy ?? 0);
		g.selectAll("[data-role]").attr("stroke", stroke);
	} else {
		g.selectAll("*").remove();
		g.append("line").attr("data-role", "x-axis").attr("x1", geo.xLine.x1).attr("y1", geo.xLine.y1).attr("x2", geo.xLine.x2).attr("y2", geo.xLine.y2).attr("stroke", stroke).attr("stroke-width", sw);
		g.append("polygon").attr("data-role", "x-arrow-right").attr("points", geo.rightArrow).attr("fill", stroke).attr("opacity", geo.stdOpacity);
		g.append("polygon").attr("data-role", "x-arrow-left").attr("points", geo.leftArrow).attr("fill", stroke).attr("opacity", geo.stdOpacity);
		g.append("line").attr("data-role", "y-axis").attr("x1", geo.yLine.x1).attr("y1", geo.yLine.y1).attr("x2", geo.yLine.x2).attr("y2", geo.yLine.y2).attr("stroke", stroke).attr("stroke-width", sw);
		g.append("polygon").attr("data-role", "y-arrow-top").attr("points", geo.topArrow).attr("fill", stroke).attr("opacity", geo.stdOpacity);
		g.append("polygon").attr("data-role", "y-arrow-bottom").attr("points", geo.bottomArrow).attr("fill", stroke).attr("opacity", geo.stdOpacity);
		g.append("circle").attr("data-role", "origin").attr("cx", gd.ox ?? 0).attr("cy", gd.oy ?? 0).attr("r", 3).attr("fill", svgColor("#fff")).attr("stroke", stroke).attr("stroke-width", sw);
	}
}
/** Dev-mode NaN guard: warns with entity context before the browser swallows the error.
*  Called from rendering hot paths — cheap isNaN check, no allocations. */
function _checkNaN(id, coords) {
	for (const key of Object.keys(coords)) if (isNaN(coords[key])) console.warn(`[learnvis] NaN in entity "${id}" — ${key}=${coords[key]}. Check upstream math or missing vertex declarations.`);
}
function svgLineColor(stroke) {
	if (!stroke || stroke === "none") return "none";
	return `color-mix(in oklab, ${svgColor(stroke)} 70%, var(--lv-mix-bg, white))`;
}
function getPathParams(pts) {
	const dists = [0];
	let total = 0;
	for (let i = 0; i < pts.length - 1; i++) {
		const d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
		total += d;
		dists.push(total);
	}
	return {
		dists,
		total
	};
}
function samplePolyline(pts, params, t) {
	if (t <= 0) return pts[0];
	if (t >= 1) return pts[pts.length - 1];
	const target = t * params.total;
	for (let i = 0; i < params.dists.length - 1; i++) {
		const d1 = params.dists[i], d2 = params.dists[i + 1];
		if (target >= d1 && target <= d2) {
			const segLen = d2 - d1;
			const ratio = segLen === 0 ? 0 : (target - d1) / segLen;
			const p1 = pts[i], p2 = pts[i + 1];
			return [p1[0] + (p2[0] - p1[0]) * ratio, p1[1] + (p2[1] - p1[1]) * ratio];
		}
	}
	return pts[pts.length - 1];
}
function alignPolylines(ptsA, ptsB) {
	if (ptsA.length < 2) ptsA = [ptsA[0] || [0, 0], ptsA[0] || [0, 0]];
	if (ptsB.length < 2) ptsB = [ptsB[0] || [0, 0], ptsB[0] || [0, 0]];
	const pA = getPathParams(ptsA);
	const pB = getPathParams(ptsB);
	const tSet = /* @__PURE__ */ new Set();
	if (pA.total > 0) pA.dists.forEach((d) => tSet.add(d / pA.total));
	else {
		tSet.add(0);
		tSet.add(1);
	}
	if (pB.total > 0) pB.dists.forEach((d) => tSet.add(d / pB.total));
	else {
		tSet.add(0);
		tSet.add(1);
	}
	tSet.add(0);
	tSet.add(1);
	const tVals = Array.from(tSet).sort((a, b) => a - b);
	return [tVals.map((t) => samplePolyline(ptsA, pA, t)), tVals.map((t) => samplePolyline(ptsB, pB, t))];
}
function resolveLinePoints(ld, id) {
	if (ld.points && ld.points.length >= 2) return ld.points;
	let x1, y1, x2, y2;
	if (ld.transforms && ld.transforms.length > 0) {
		const res = applyLine(ld.from ?? [ld.x1 ?? 0, ld.y1 ?? 0], ld.to ?? [ld.x2 ?? 0, ld.y2 ?? 0], ld.transforms);
		x1 = res.from[0];
		y1 = res.from[1];
		x2 = res.to[0];
		y2 = res.to[1];
	} else {
		x1 = ld.x1 ?? ld.from?.[0] ?? ld.a?.[0] ?? 0;
		y1 = ld.y1 ?? ld.from?.[1] ?? ld.a?.[1] ?? 0;
		x2 = ld.x2 ?? ld.to?.[0] ?? ld.b?.[0] ?? 0;
		y2 = ld.y2 ?? ld.to?.[1] ?? ld.b?.[1] ?? 0;
	}
	if (id) _checkNaN(id, {
		x1,
		y1,
		x2,
		y2
	});
	return [[x1, y1], [x2, y2]];
}
/** Construct identity-equivalent transforms matching the structure of the given list.
*  Used to enable smooth attrTween interpolation when one side lacks transforms. */
function identityTransforms(tf) {
	return tf.map((t) => {
		switch (t.type) {
			case "rotate": return {
				type: "rotate",
				angle: 0,
				cx: t.cx,
				cy: t.cy
			};
			case "scale": return {
				type: "scale",
				sx: 1,
				sy: 1
			};
			case "translate": return {
				type: "translate",
				dx: 0,
				dy: 0
			};
			case "matrix": return {
				type: "matrix",
				a: 1,
				b: 0,
				c: 0,
				d: 1,
				tx: 0,
				ty: 0
			};
		}
	});
}
/** Pad both transform arrays to the same length with identity-equivalent transforms.
*  Without this, interpolate() (which maps over the old array) would miss extra
*  transforms in the new array — e.g. old=[rotate(45)], new=[rotate(45),scale(2)]
*  would never interpolate the scale, causing the animation to appear frozen. */
function normalizeTransforms(oldTf, newTf) {
	const maxLen = Math.max(oldTf.length, newTf.length);
	if (oldTf.length < maxLen) oldTf = [...oldTf, ...identityTransforms(newTf.slice(oldTf.length))];
	if (newTf.length < maxLen) newTf = [...newTf, ...identityTransforms(oldTf.slice(newTf.length))];
	return {
		old: oldTf,
		new: newTf
	};
}
function markerFor(stroke, cache, svg, config) {
	if (!stroke) return void 0;
	const size = config?.size ?? 10, w = config?.width ?? size, h = config?.height ?? size;
	const offset = config?.offset ?? 0, open = config?.open ?? false;
	const key = `${stroke}|${size}|${w}|${h}|${offset}|${open}`;
	if (!cache[key]) {
		let defs = svg.select("defs");
		if (defs.empty()) defs = svg.append("defs");
		const id = "fm" + Object.keys(cache).length;
		const vbW = w + offset + 2;
		const m = defs.append("marker").attr("id", id).attr("viewBox", `0 0 ${vbW} ${h}`).attr("refX", vbW / 2).attr("refY", h / 2).attr("markerWidth", vbW).attr("markerHeight", h).attr("markerUnits", "userSpaceOnUse").attr("orient", "auto");
		if (open) m.append("path").attr("d", `M2,0 L${vbW},${h / 2} L2,${h}`).attr("fill", svgColor("none")).attr("stroke", svgColor(stroke)).attr("stroke-width", 1.5);
		else m.append("path").attr("d", `M2,0 L${vbW},${h / 2} L2,${h} Z`).attr("fill", svgColor(stroke));
		cache[key] = id;
	}
	return `url(#${cache[key]})`;
}
function applyCommon(svg, opacity) {
	if (opacity != null) svg.attr("opacity", opacity);
}
function _angleArc(vx, vy, r1x, r1y, r2x, r2y, arcR) {
	let a1 = Math.atan2(r1y - vy, r1x - vx), a2 = Math.atan2(r2y - vy, r2x - vx);
	if (a1 < 0) a1 += 2 * Math.PI;
	if (a2 < 0) a2 += 2 * Math.PI;
	if (Math.abs(a2 - a1) < .001) a2 = a1 + .02;
	const cwLen = a2 >= a1 ? a2 - a1 : 2 * Math.PI - a1 + a2;
	const ccwLen = a2 < a1 ? a1 - a2 : a1 + (2 * Math.PI - a2);
	const sweep = cwLen <= ccwLen ? 1 : 0;
	const arcLen = sweep === 1 ? cwLen : ccwLen;
	const ma = sweep === 1 ? a1 + arcLen / 2 : a1 - arcLen / 2;
	const x1 = vx + arcR * Math.cos(a1), y1 = vy + arcR * Math.sin(a1);
	const x2 = vx + arcR * Math.cos(a2), y2 = vy + arcR * Math.sin(a2);
	return {
		a1,
		a2,
		sweep,
		ma,
		path: `M${x1},${y1} A${arcR},${arcR} 0 0,${sweep} ${x2},${y2}`
	};
}
function drawEntity(ctx, id, d, markerCache) {
	const { bg, nodes, edges, overlay } = ctx.stage;
	switch (d.type) {
		case "node": {
			const nd = d;
			_checkNaN(id, {
				x: nd.x,
				y: nd.y
			});
			const g = nodes.append("g").attr("data-id", id);
			if (nd.shape === "rect") {
				const bw = nd._blockW ?? nd.w ?? 60, bh = nd._blockH ?? nd.h ?? 36;
				g.append("rect").attr("class", "shp").attr("x", nd.x - bw / 2).attr("y", nd.y - bh / 2).attr("width", bw).attr("height", bh).attr("rx", nd.rx ?? 5).attr("fill", svgColor(nd.fill)).attr("stroke", svgColor(nd.stroke)).attr("stroke-width", nd.strokeW ?? 1.5);
			} else if (nd.shape === "symbol") {
				const sym = globalThis.d3?.symbol?.().type?.(globalThis.d3?.[nd.symType ?? "symbolCircle"] ?? globalThis.d3?.symbolCircle)?.size?.((nd.r ?? 8) ** 2)?.();
				g.append("path").attr("data-id", id).attr("d", sym ? `${sym}` : "").attr("transform", `translate(${nd.x},${nd.y})`).attr("fill", svgColor(nd.fill)).attr("stroke", svgColor(nd.stroke)).attr("stroke-width", nd.strokeW ?? 1.2);
			} else g.append("circle").attr("class", "shp").attr("cx", nd.x).attr("cy", nd.y).attr("r", nd.r ?? 4).attr("fill", svgColor(nd.fill)).attr("stroke", svgColor(nd.stroke)).attr("stroke-width", nd.strokeW ?? 1.5);
			applyCommon(g, nd.opacity);
			const label = nd.label || "";
			let text = null;
			if (label) {
				nd._blockW ?? nd.w ?? (nd.r ?? 10) * 2;
				const bh = nd._blockH ?? nd.h ?? (nd.r ?? 10) * 2;
				const gap = nd.labelGap ?? 12;
				const place = nd.labelPlace ?? "above";
				let ly, anchor = "middle";
				if (place === "above") ly = nd.y - bh / 2 - gap;
				else if (place === "below") ly = nd.y + bh / 2 + gap;
				else if (place === "left") {
					ly = nd.y;
					anchor = "end";
				} else if (place === "right") {
					ly = nd.y;
					anchor = "start";
				} else ly = nd.y - bh / 2 - gap;
				text = g.append("text").attr("class", "vlbl-txt").attr("font-size", "11px").attr("font-family", "JetBrains Mono,monospace").attr("fill", svgColor(nd.stroke)).attr("font-weight", "600").attr("x", nd.x).attr("y", ly).attr("text-anchor", anchor).text(label);
			}
			return {
				group: g,
				text
			};
		}
		case "line": {
			const ld = d;
			const ptsStr = resolveLinePoints(ld, id).map((p) => p.join(",")).join(" ");
			const hasMarker = ld.marker === "arrow" || ld.directed;
			const el = edges.append("polyline").attr("data-id", id).attr("points", ptsStr).attr("fill", "none").attr("stroke", svgLineColor(ld.stroke)).attr("stroke-width", ld.strokeW).attr("stroke-dasharray", ld.dash ?? "").attr("stroke-linecap", "round").attr("stroke-linejoin", "round").attr("marker-end", hasMarker ? markerFor(ld.stroke, markerCache, ctx.svg, ld._markerCfg ?? null) ?? null : null);
			applyCommon(el, ld.opacity);
			return {
				group: el,
				text: null
			};
		}
		case "region": {
			const rd = d;
			if (rd.shape === "circle") {
				const el = bg.append("circle").attr("data-id", id).attr("cx", rd.cx ?? 0).attr("cy", rd.cy ?? 0).attr("r", rd.r ?? 0).attr("fill", svgColor(rd.fill)).attr("stroke", svgColor(rd.stroke ?? rd.fill)).attr("stroke-width", rd.strokeW ?? 1.2);
				applyCommon(el, rd.opacity);
				return {
					group: el,
					text: null
				};
			}
			if (rd.shape === "arc") {
				const a = globalThis.d3?.arc?.()?.({
					innerRadius: rd.innerR ?? 0,
					outerRadius: rd.outerR ?? 0,
					startAngle: rd.startAngle ?? 0,
					endAngle: rd.endAngle ?? 0
				}) ?? "";
				const el = bg.append("path").attr("data-id", id).attr("d", `${a}`).attr("transform", `translate(${rd.cx ?? 0},${rd.cy ?? 0})`).attr("fill", svgColor(rd.fill)).attr("stroke", svgColor(rd.stroke ?? rd.fill)).attr("stroke-width", rd.strokeW ?? 1.2);
				applyCommon(el, rd.opacity);
				return {
					group: el,
					text: null
				};
			}
			let pts;
			if (rd.transforms && rd.transforms.length > 0) pts = applyVertices(rd.vertices ?? rd.pts ?? [], rd.transforms);
			else pts = rd.pts ?? rd.vertices ?? [];
			const ptsStr = pts.map((p) => p.join(",")).join(" ");
			const el = bg.append("polygon").attr("data-id", id).attr("points", ptsStr).attr("fill", svgColor(rd.fill)).attr("stroke", svgColor(rd.stroke ?? "none")).attr("stroke-width", rd.strokeW ?? 0).attr("stroke-dasharray", rd.dash ?? "");
			applyCommon(el, rd.opacity);
			let rt = null;
			const rlabel = rd.label ?? "";
			if (rlabel) {
				const minX = Math.min(...pts.map((p) => p[0]));
				const maxX = Math.max(...pts.map((p) => p[0]));
				const minY = Math.min(...pts.map((p) => p[1]));
				const maxY = Math.max(...pts.map((p) => p[1]));
				const cx = (minX + maxX) / 2;
				const cy = (minY + maxY) / 2;
				const gap = rd.labelGap ?? 6;
				let lx, ly, anchor;
				switch (rd.labelPlace) {
					case "above":
						lx = cx;
						ly = minY - gap;
						anchor = "middle";
						break;
					case "below":
						lx = cx;
						ly = maxY + gap;
						anchor = "middle";
						break;
					case "left":
						lx = minX + gap;
						ly = minY + 14;
						anchor = "start";
						break;
					case "right":
						lx = maxX + gap;
						ly = minY + 10;
						anchor = "start";
						break;
					default:
						lx = cx;
						ly = cy + 4;
						anchor = "middle";
						break;
				}
				rt = bg.append("text").attr("class", "vlbl-txt").attr("font-size", "10px").attr("font-family", "JetBrains Mono,monospace").attr("fill", "#888").attr("font-weight", "500").attr("x", lx).attr("y", ly).attr("text-anchor", anchor).text(rlabel);
			}
			return {
				group: el,
				text: rt
			};
		}
		case "curve": {
			const cd = d;
			const [d0, d1] = cd.domain, n = cd.samples ?? 200;
			const step = (d1 - d0) / (n - 1), ox = cd.x, oy = cd.y;
			const pw = cd.width, ph = cd.height;
			const fn = new Function("x", `return (${cd.f})(x)`);
			let yMin = Infinity, yMax = -Infinity;
			for (let i = 0; i < n; i++) {
				const y = fn(d0 + i * step);
				if (y < yMin) yMin = y;
				if (y > yMax) yMax = y;
			}
			let r0 = yMin, r1 = yMax;
			if (cd.range) [r0, r1] = cd.range;
			if (r0 === r1) {
				r0 -= 1;
				r1 += 1;
			}
			const sx = (x) => ox + (x - d0) / (d1 - d0) * pw;
			const sy = (y) => oy - (y - r0) / (r1 - r0) * ph;
			const ptsStr = Array.from({ length: n }, (_, i) => {
				const xv = d0 + i * step;
				return [sx(xv), sy(fn(xv))].join(",");
			}).join(" ");
			const el = edges.append("polyline").attr("data-id", id).attr("points", ptsStr).attr("fill", svgColor("none")).attr("stroke", svgColor(cd.stroke)).attr("stroke-width", cd.strokeW).attr("stroke-dasharray", cd.dash ?? "");
			applyCommon(el, cd.opacity);
			return {
				group: el,
				text: null
			};
		}
		case "group": {
			const gd = d;
			if (gd.subtype === "angle") {
				const gv = overlay.append("g").attr("data-id", id);
				const [vx, vy] = gd.vertex ?? [0, 0], [r1x, r1y] = gd.ray1 ?? [0, 0], [r2x, r2y] = gd.ray2 ?? [0, 0];
				const arc = _angleArc(vx, vy, r1x, r1y, r2x, r2y, gd.arcR ?? 30);
				gv.append("path").attr("d", arc.path).attr("fill", svgColor("none")).attr("stroke", svgColor(gd.stroke ?? "#000")).attr("stroke-width", gd.strokeW ?? 1.5);
				let text = null;
				const label = gd.label ?? "";
				if (label && Math.abs(arc.a2 - arc.a1) > .02) {
					const lr = (gd.arcR ?? 30) + 12;
					text = gv.append("text").attr("x", vx + lr * Math.cos(arc.ma)).attr("y", vy + lr * Math.sin(arc.ma)).attr("text-anchor", "middle").attr("dominant-baseline", "middle").attr("font-size", "10px").attr("font-family", "JetBrains Mono,monospace").attr("fill", svgColor(gd.stroke ?? "#000")).text(label);
				}
				applyCommon(gv, gd.opacity);
				return {
					group: gv,
					text
				};
			}
			const g = bg.append("g").attr("data-id", id);
			if (gd.subtype === "axes") drawAxesGroup(g, gd);
			else if (gd.subtype === "grid") drawGridLines(g, gd);
			else if (gd.subtype === "matrix") {
				const data = gd.data ?? [[0]];
				const rows = data.length, cols = data[0]?.length ?? 1;
				const x = gd.x ?? 0, y = gd.y ?? 0;
				const cw = gd.cellW ?? 40, ch = gd.cellH ?? 22;
				const st = svgColor(gd.stroke ?? "#222");
				const font = "JetBrains Mono,monospace";
				const fmt = (v) => Number.isInteger(v) ? `${v}` : v.toFixed(2).replace(/\.?0+$/, "") || "0";
				const bh = rows * ch;
				g.append("text").attr("x", x).attr("y", y + bh / 2).attr("font-size", `${bh + 4}px`).attr("fill", st).attr("font-family", font).attr("text-anchor", "middle").attr("dominant-baseline", "central").text("[");
				for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) g.append("text").attr("x", x + 12 + c * cw + cw / 2).attr("y", y + r * ch + ch / 2).attr("font-size", "13px").attr("fill", st).attr("font-family", font).attr("text-anchor", "middle").attr("dominant-baseline", "central").text(fmt(data[r]?.[c] ?? 0));
				g.append("text").attr("x", x + 12 + cols * cw + 4).attr("y", y + bh / 2).attr("font-size", `${bh + 4}px`).attr("fill", st).attr("font-family", font).attr("text-anchor", "middle").attr("dominant-baseline", "central").text("]");
				if (gd.label) g.append("text").attr("x", x + 12 + cols * cw / 2).attr("y", y + bh + 18).attr("font-size", "10px").attr("fill", st).attr("font-family", font).attr("text-anchor", "middle").text(gd.label);
			}
			applyCommon(g, gd.opacity);
			return {
				group: g,
				text: null
			};
		}
	}
}
/** Clip a line through point P in direction D to the rectangle [rx, ry, rw, rh].
*  Returns the two intersection points, or null if the line misses the rect. */
function clipLineToRect(px, py, dx, dy, rx, ry, rw, rh) {
	const M = 2;
	const xMin = rx - M, yMin = ry - M;
	const xMax = rx + rw + M, yMax = ry + rh + M;
	let tMin = -Infinity, tMax = Infinity;
	if (Math.abs(dx) > 1e-10) {
		const t1 = (xMin - px) / dx, t2 = (xMax - px) / dx;
		if (t1 > t2) {
			tMin = Math.max(tMin, t2);
			tMax = Math.min(tMax, t1);
		} else {
			tMin = Math.max(tMin, t1);
			tMax = Math.min(tMax, t2);
		}
	} else if (px < xMin || px > xMax) return null;
	if (Math.abs(dy) > 1e-10) {
		const t1 = (yMin - py) / dy, t2 = (yMax - py) / dy;
		if (t1 > t2) {
			tMin = Math.max(tMin, t2);
			tMax = Math.min(tMax, t1);
		} else {
			tMin = Math.max(tMin, t1);
			tMax = Math.min(tMax, t2);
		}
	} else if (py < yMin || py > yMax) return null;
	if (tMin > tMax) return null;
	return [
		px + tMin * dx,
		py + tMin * dy,
		px + tMax * dx,
		py + tMax * dy
	];
}
function computeGridLines(gd) {
	const ax = gd.ox ?? 0, ay = gd.oy ?? 0;
	const rx = gd.gx ?? 0, ry = gd.gy ?? 0;
	const rw = gd.w ?? 400, rh = gd.h ?? 300;
	const ix = gd.ix ?? 0, iy = gd.iy ?? 0, jx = gd.jx ?? 0, jy = gd.jy ?? 0;
	const scr = (mx, my) => [ax + mx * ix + my * jx, ay + mx * iy + my * jy];
	if (gd.mx0 !== void 0 && gd.mx1 !== void 0 && gd.my0 !== void 0 && gd.my1 !== void 0) {
		const step = gd.mStep ?? 1;
		const lines = [];
		const toKey = (n) => Number.isInteger(n) ? String(n) : parseFloat(n.toFixed(8)).toString();
		const x0 = Math.ceil(gd.mx0 / step) * step;
		const y0 = Math.ceil(gd.my0 / step) * step;
		for (let mx = x0; mx <= gd.mx1 + step * .5; mx += step) {
			const [x1, y1] = scr(mx, gd.my0);
			const [x2, y2] = scr(mx, gd.my1);
			lines.push({
				x1,
				y1,
				x2,
				y2,
				key: "X" + toKey(mx)
			});
		}
		for (let my = y0; my <= gd.my1 + step * .5; my += step) {
			const [x1, y1] = scr(gd.mx0, my);
			const [x2, y2] = scr(gd.mx1, my);
			lines.push({
				x1,
				y1,
				x2,
				y2,
				key: "Y" + toKey(my)
			});
		}
		return lines;
	}
	const sp = gd.sp ?? 40;
	const iux = ix || 1, iuy = iy || 0, jux = jx || 0, juy = jy || -1;
	const diag = Math.sqrt(rw * rw + rh * rh);
	const kMax = Math.ceil(diag / sp) + 1;
	function generateFamily(tag, lineDx, lineDy, perpDx, perpDy) {
		const lines = [];
		const perpLen = Math.sqrt(perpDx * perpDx + perpDy * perpDy) || 1;
		const pux = perpDx / perpLen, puy = perpDy / perpLen;
		for (let k = -kMax; k <= kMax; k++) {
			const s = k * sp;
			const seg = clipLineToRect(ax + s * pux, ay + s * puy, lineDx, lineDy, rx, ry, rw, rh);
			if (seg) lines.push({
				x1: seg[0],
				y1: seg[1],
				x2: seg[2],
				y2: seg[3],
				key: tag + k
			});
		}
		return lines;
	}
	return [...generateFamily("I", iux, iuy, -iuy, iux), ...generateFamily("J", jux, juy, -jy, jux)];
}
function drawGridLines(g, gd, transition) {
	const data = computeGridLines(gd);
	const stroke = svgColor(gd.stroke);
	const sw = gd.strokeW ?? .3;
	const dash = gd.dash ?? null;
	const lines = g.selectAll("line").data(data, (d) => d.key);
	if (transition) lines.exit().transition(transition).attr("opacity", 0).remove();
	else lines.exit().remove();
	const enter = lines.enter().append("line").attr("x1", (d) => d.x1).attr("y1", (d) => d.y1).attr("x2", (d) => d.x2).attr("y2", (d) => d.y2).attr("stroke", stroke).attr("stroke-width", sw).attr("opacity", transition ? 0 : 1);
	if (dash) enter.attr("stroke-dasharray", dash);
	const merged = enter.merge(lines);
	if (transition) merged.transition(transition).attr("x1", (d) => d.x1).attr("y1", (d) => d.y1).attr("x2", (d) => d.x2).attr("y2", (d) => d.y2).attr("stroke", stroke).attr("stroke-width", sw).attr("opacity", 1).attr("stroke-dasharray", dash ?? null);
	else merged.attr("x1", (d) => d.x1).attr("y1", (d) => d.y1).attr("x2", (d) => d.x2).attr("y2", (d) => d.y2).attr("stroke", stroke).attr("stroke-width", sw).attr("stroke-dasharray", dash ?? null);
}
function transitionEntity(svg, text, oldState, newState, tr, markerCache, svgRoot) {
	switch (newState.type) {
		case "node": {
			const nd = newState;
			if (nd.shape === "rect") {
				const bw = nd._blockW ?? nd.w ?? 60, bh = nd._blockH ?? nd.h ?? 36;
				svg.select("rect").interrupt().transition(tr).attr("x", nd.x - bw / 2).attr("y", nd.y - bh / 2).attr("width", bw).attr("height", bh).attr("fill", svgColor(nd.fill)).attr("stroke", svgColor(nd.stroke)).attr("stroke-width", nd.strokeW ?? 1.5);
			} else svg.select(".shp").interrupt().transition(tr).attr("cx", nd.x).attr("cy", nd.y).attr("r", nd.r ?? 4).attr("fill", svgColor(nd.fill)).attr("stroke", svgColor(nd.stroke)).attr("stroke-width", nd.strokeW ?? 1.5);
			applyCommon(svg, nd.opacity);
			break;
		}
		case "line": {
			const ld = newState;
			const oldLd = oldState;
			const lineId = svg.attr("data-id") || "unknown";
			const [oldResampled, newResampled] = alignPolylines(resolveLinePoints(oldLd, lineId), resolveLinePoints(ld, lineId));
			svg.interrupt().transition(tr).attrTween("points", () => (t) => {
				return oldResampled.map((op, i) => {
					const np = newResampled[i];
					return `${op[0] + (np[0] - op[0]) * t},${op[1] + (np[1] - op[1]) * t}`;
				}).join(" ");
			}).attr("stroke", svgLineColor(ld.stroke)).attr("stroke-width", ld.strokeW).attr("stroke-dasharray", ld.dash ?? "");
			if (ld.opacity != null) svg.transition(tr).attr("opacity", ld.opacity);
			break;
		}
		case "region": {
			const rd = newState;
			if (rd.shape === "circle") svg.interrupt().transition(tr).attr("cx", rd.cx ?? 0).attr("cy", rd.cy ?? 0).attr("r", rd.r ?? 0).attr("fill", svgColor(rd.fill)).attr("stroke", svgColor(rd.stroke ?? rd.fill));
			else {
				const oldRd = oldState;
				let oldTf = oldRd.transforms;
				let newTf = rd.transforms;
				let regionBase;
				if (rd.transforms && rd.transforms.length > 0) {
					regionBase = rd.vertices ?? rd.pts ?? [];
					if (!oldRd.transforms) oldTf = identityTransforms(rd.transforms);
				}
				if (oldRd.transforms && oldRd.transforms.length > 0 && !regionBase) {
					regionBase = oldRd.vertices ?? oldRd.pts ?? [];
					if (!rd.transforms) newTf = identityTransforms(oldRd.transforms);
				}
				if (regionBase && regionBase.length > 0 && oldTf && newTf) {
					const norm = normalizeTransforms(oldTf, newTf);
					svg.interrupt().transition(tr).attrTween("points", () => (t) => applyVertices(regionBase, interpolate(norm.old, norm.new, t)).map((p) => p.join(",")).join(" ")).attr("fill", svgColor(rd.fill)).attr("stroke", svgColor(rd.stroke ?? "none"));
				} else {
					let pts;
					if (rd.transforms && rd.transforms.length > 0) pts = applyVertices(rd.vertices ?? rd.pts ?? [], rd.transforms);
					else pts = rd.pts ?? rd.vertices ?? [];
					svg.interrupt().transition(tr).attr("points", pts.map((p) => p.join(",")).join(" ")).attr("fill", svgColor(rd.fill)).attr("stroke", svgColor(rd.stroke ?? "none"));
				}
			}
			if (rd.opacity != null) svg.transition(tr).attr("opacity", rd.opacity);
			break;
		}
		case "group": {
			const gd = newState;
			if (gd.subtype === "angle") {
				const [vx, vy] = gd.vertex ?? [0, 0], [r1x, r1y] = gd.ray1 ?? [0, 0], [r2x, r2y] = gd.ray2 ?? [0, 0];
				const arc = _angleArc(vx, vy, r1x, r1y, r2x, r2y, gd.arcR ?? 30);
				svg.select("path").interrupt().transition(tr).attr("d", arc.path).attr("stroke", svgColor(gd.stroke ?? "#000")).attr("stroke-width", gd.strokeW ?? 1.5);
				const label = gd.label ?? "";
				if (label && Math.abs(arc.a2 - arc.a1) > .02) {
					const lr = (gd.arcR ?? 30) + 12;
					if (text) text.interrupt().transition(tr).attr("x", vx + lr * Math.cos(arc.ma)).attr("y", vy + lr * Math.sin(arc.ma)).text(label);
					else {
						const existing = svg.select("text");
						if (!existing.empty()) existing.interrupt().transition(tr).attr("x", vx + lr * Math.cos(arc.ma)).attr("y", vy + lr * Math.sin(arc.ma)).text(label);
						else svg.append("text").attr("text-anchor", "middle").attr("dominant-baseline", "middle").attr("font-size", "10px").attr("font-family", "JetBrains Mono,monospace").attr("fill", svgColor(gd.stroke ?? "#000")).attr("x", vx + lr * Math.cos(arc.ma)).attr("y", vy + lr * Math.sin(arc.ma)).text(label);
					}
				} else if (text) text.text("");
				else svg.select("text").text("");
			} else if (gd.subtype === "axes") drawAxesGroup(svg, gd, tr);
			else if (gd.subtype === "grid") {
				svg.interrupt();
				drawGridLines(svg, gd, tr);
			}
			break;
		}
	}
}
function updateEntityImmediate(svg, text, d) {
	switch (d.type) {
		case "node": {
			const nd = d;
			if (nd.shape === "rect") {
				const bw = nd._blockW ?? nd.w ?? 60, bh = nd._blockH ?? nd.h ?? 36;
				svg.select("rect").attr("x", nd.x - bw / 2).attr("y", nd.y - bh / 2).attr("width", bw).attr("height", bh).attr("fill", svgColor(nd.fill)).attr("stroke", svgColor(nd.stroke)).attr("stroke-width", nd.strokeW ?? 1.5);
			} else svg.select(".shp").attr("cx", nd.x).attr("cy", nd.y).attr("r", nd.r ?? 4).attr("fill", svgColor(nd.fill)).attr("stroke", svgColor(nd.stroke)).attr("stroke-width", nd.strokeW ?? 1.5);
			applyCommon(svg, nd.opacity);
			break;
		}
		case "line": {
			const ld = d;
			const ptsStr = resolveLinePoints(ld, svg.attr("data-id") || "unknown").map((p) => p.join(",")).join(" ");
			svg.attr("points", ptsStr).attr("stroke", svgLineColor(ld.stroke)).attr("stroke-width", ld.strokeW);
			applyCommon(svg, ld.opacity);
			break;
		}
		case "region": {
			const rd = d;
			let pts;
			if (rd.transforms && rd.transforms.length > 0) pts = applyVertices(rd.vertices ?? rd.pts ?? [], rd.transforms);
			else pts = rd.pts ?? rd.vertices ?? [];
			svg.attr("points", pts.map((p) => p.join(",")).join(" ")).attr("fill", svgColor(rd.fill)).attr("stroke", svgColor(rd.stroke ?? "none")).attr("stroke-width", rd.strokeW ?? 0);
			applyCommon(svg, rd.opacity);
			break;
		}
		case "group": {
			const gd = d;
			if (gd.subtype === "angle") {
				const [vx, vy] = gd.vertex ?? [0, 0], [r1x, r1y] = gd.ray1 ?? [0, 0], [r2x, r2y] = gd.ray2 ?? [0, 0];
				const arc = _angleArc(vx, vy, r1x, r1y, r2x, r2y, gd.arcR ?? 30);
				svg.select("path").attr("d", arc.path).attr("stroke", svgColor(gd.stroke ?? "#000")).attr("stroke-width", gd.strokeW ?? 1.5);
				const label = gd.label ?? "";
				if (label && Math.abs(arc.a2 - arc.a1) > .02) {
					const lr = (gd.arcR ?? 30) + 12;
					if (text) text.attr("x", vx + lr * Math.cos(arc.ma)).attr("y", vy + lr * Math.sin(arc.ma)).text(label);
					else {
						const existing = svg.select("text");
						if (!existing.empty()) existing.attr("x", vx + lr * Math.cos(arc.ma)).attr("y", vy + lr * Math.sin(arc.ma)).text(label);
						else svg.append("text").attr("x", vx + lr * Math.cos(arc.ma)).attr("y", vy + lr * Math.sin(arc.ma)).attr("text-anchor", "middle").attr("dominant-baseline", "middle").attr("font-size", "10px").attr("font-family", "JetBrains Mono,monospace").attr("fill", svgColor(gd.stroke ?? "#000")).text(label);
					}
				} else if (text) text.text("");
				else svg.select("text").text("");
			} else if (gd.subtype === "axes") drawAxesGroup(svg, gd);
			else if (gd.subtype === "grid") drawGridLines(svg, gd);
			break;
		}
	}
}
var SVGRenderer = class {
	constructor(ctx) {
		this.handles = /* @__PURE__ */ new Map();
		this._markerCache = {};
		this.ctx = ctx;
	}
	beginFrame() {
		this.ctx.root.selectAll(".vlbl").remove();
	}
	commitFrame(opts) {
		this._repositionLabels(opts);
	}
	create(id, state) {
		const h = new SVGHandle(this.ctx, id, state, this._markerCache);
		this.handles.set(id, h);
		return h;
	}
	dispose() {
		this.handles.clear();
	}
	_repositionLabels(opts) {
		const edgeAngles = /* @__PURE__ */ new Map();
		for (const [id, h] of this.handles) {
			if (h.state.type !== "line") continue;
			const ld = h.state;
			const x1 = ld.x1 ?? ld.from?.[0] ?? 0, y1 = ld.y1 ?? ld.from?.[1] ?? 0;
			const x2 = ld.x2 ?? ld.to?.[0] ?? 0, y2 = ld.y2 ?? ld.to?.[1] ?? 0;
			const dx = x2 - x1, dy = y2 - y1;
			const ang = Math.atan2(dy, dx);
			const rev = ang > 0 ? ang - Math.PI : ang + Math.PI;
			const fromNode = (ld._fromPort ?? "").split("-")[0] || ld.from?.id;
			const toNode = (ld._toPort ?? "").split("-")[0] || ld.to?.id;
			if (fromNode) {
				if (!edgeAngles.has(fromNode)) edgeAngles.set(fromNode, []);
				edgeAngles.get(fromNode).push(ang);
			}
			if (toNode) {
				if (!edgeAngles.has(toNode)) edgeAngles.set(toNode, []);
				edgeAngles.get(toNode).push(rev);
			}
		}
		const dirs = [
			{
				place: "above",
				angle: -Math.PI / 2,
				dx: 0,
				dy: -1,
				anchor: "middle",
				dyAttr: null
			},
			{
				place: "below",
				angle: Math.PI / 2,
				dx: 0,
				dy: 1,
				anchor: "middle",
				dyAttr: "0.6em"
			},
			{
				place: "right",
				angle: 0,
				dx: 1,
				dy: 0,
				anchor: "start",
				dyAttr: "0.35em"
			},
			{
				place: "left",
				angle: Math.PI,
				dx: -1,
				dy: 0,
				anchor: "end",
				dyAttr: "0.35em"
			}
		];
		function angleDiff(a, b) {
			let d = Math.abs(a - b);
			if (d > Math.PI) d = 2 * Math.PI - d;
			return d;
		}
		for (const [id, h] of this.handles) {
			if (h.state.type !== "node") continue;
			const nd = h.state;
			const label = nd.label || "";
			if (!label) continue;
			const nodeKey = id.includes(":") ? id.split(":")[1] : label;
			const angles = edgeAngles.get(nodeKey) ?? edgeAngles.get(label) ?? [];
			let place = dirs[0];
			for (const dir of dirs) if (angles.every((a) => angleDiff(a, dir.angle) >= Math.PI / 4)) {
				place = dir;
				break;
			}
			const bw = nd._blockW ?? nd.w ?? (nd.r ?? 10) * 2;
			const bh = nd._blockH ?? nd.h ?? (nd.r ?? 10) * 2;
			const halfW = bw / 2, halfH = bh / 2;
			const gap = 6;
			const tx = nd.x + place.dx * (halfW + gap);
			const ty = nd.y + place.dy * (halfH + gap);
			h.setTextPosition(tx, ty, place.anchor, place.dyAttr);
		}
	}
};
var SVGHandle = class {
	constructor(ctx, id, state, markerCache) {
		this.svg = null;
		this._text = null;
		this.ctx = ctx;
		this._cache = markerCache;
		this.state = { ...state };
		this._clean(id);
		const result = drawEntity(ctx, id, state, markerCache);
		this.svg = result.group;
		this._text = result.text;
	}
	update(state, opts) {
		if (!this.svg) {
			this.state = { ...state };
			return;
		}
		if (opts?.transition) transitionEntity(this.svg, this._text, this.state, state, opts.transition, this._cache, this.ctx.svg);
		else updateEntityImmediate(this.svg, this._text, state);
		this.state = { ...state };
	}
	setTextPosition(x, y, anchor, dyAttr) {
		if (!this._text) return;
		this._text.attr("x", x).attr("y", y).attr("text-anchor", anchor);
		if (dyAttr) this._text.attr("dy", dyAttr);
		else this._text.attr("dy", null);
	}
	remove() {
		this.svg?.remove();
		this._text?.remove();
		this.svg = null;
		this._text = null;
	}
	_clean(id) {
		[
			this.ctx.stage.bg,
			this.ctx.stage.nodes,
			this.ctx.stage.edges,
			this.ctx.stage.overlay
		].forEach((g) => g.selectAll("[data-id]").filter(function() {
			const did = this.getAttribute("data-id");
			return did === id || did.startsWith(id + "-");
		}).remove());
	}
};

//#endregion
//#region vis/frame.ts
const defaultAnimation = {
	duration: 500,
	enter: {
		ratio: .6,
		easing: cubicOut
	},
	update: {
		ratio: 1,
		easing: cubicOut
	},
	exit: {
		ratio: .4,
		easing: cubicIn
	}
};
var FrameManager = class {
	constructor(ctx, animation, renderer) {
		this.store = /* @__PURE__ */ new Map();
		this.handles = /* @__PURE__ */ new Map();
		this.current = /* @__PURE__ */ new Set();
		this.previous = /* @__PURE__ */ new Set();
		this._uncommitted = false;
		this.animation = {
			...defaultAnimation,
			...animation
		};
		this.renderer = renderer ?? new SVGRenderer(ctx);
	}
	begin() {
		if (this._uncommitted) throw new Error("commit() required before begin()");
		this._uncommitted = true;
		this.previous = new Set(this.current);
		this.current.clear();
		this.renderer.beginFrame();
	}
	declare(id, state) {
		this.current.add(id);
		const existing = this.store.get(id);
		if (existing) {
			if (!("transforms" in state)) delete existing.desired.transforms;
			Object.assign(existing.desired, state);
			return existing;
		}
		const entity = {
			id,
			desired: { ...state },
			svg: null
		};
		this.store.set(id, entity);
		return entity;
	}
	patch(id, partial) {
		const entity = this.store.get(id);
		if (!entity) throw new Error(`Entity not found: ${id}`);
		Object.assign(entity.desired, partial);
	}
	/** Typed getter: narrows EntityState by its discriminant type field. */
	get(id, _type) {
		return this.store.get(id);
	}
	commit(opts) {
		if (!this._uncommitted) throw new Error("begin() required before commit()");
		this._uncommitted = false;
		if (opts?.animate === false || typeof requestAnimationFrame === "undefined") {
			this._commitStatic();
			this.renderer.commitFrame({ animate: false });
			return;
		}
		const dur = opts?.ms ?? this.animation.duration;
		const enterTr = transition().duration(dur * this.animation.enter.ratio).ease(this.animation.enter.easing);
		const updateTr = transition().duration(dur * this.animation.update.ratio).ease(this.animation.update.easing);
		transition().duration(dur * this.animation.exit.ratio).ease(this.animation.exit.easing);
		for (const id of this.previous) if (!this.current.has(id)) {
			this.handles.get(id)?.remove();
			this.store.delete(id);
			this.handles.delete(id);
		}
		for (const id of this.current) if (!this.previous.has(id)) {
			const e = this.store.get(id);
			const h = this.renderer.create(id, e.desired);
			this.handles.set(id, h);
			e.svg = h.svg ?? null;
			const to = e.desired.opacity ?? 1;
			const svgEl = h.svg;
			if (svgEl) svgEl.attr("opacity", 0).transition(enterTr).attr("opacity", to);
		}
		for (const id of this.current) if (this.previous.has(id)) {
			const e = this.store.get(id);
			this.handles.get(id)?.update(e.desired, {
				animate: true,
				transition: updateTr
			});
		}
		this.renderer.commitFrame({
			animate: true,
			ms: dur
		});
	}
	_commitStatic() {
		for (const id of this.previous) if (!this.current.has(id)) {
			this.handles.get(id)?.remove();
			this.store.delete(id);
			this.handles.delete(id);
		}
		for (const id of this.current) {
			const e = this.store.get(id);
			if (!this.previous.has(id)) {
				const h = this.renderer.create(id, e.desired);
				this.handles.set(id, h);
				e.svg = h.svg ?? null;
			} else this.handles.get(id)?.update(e.desired);
		}
	}
	get entities() {
		return this.store;
	}
	get frameIds() {
		return this.current;
	}
};

//#endregion
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
TOKENS.primary, TOKENS.accent, TOKENS.danger, TOKENS.warning, TOKENS.info, TOKENS.muted, TOKENS.success;
const SEMANTIC_COLORS = [
	"primary",
	"accent",
	"danger",
	"warning",
	"info",
	"muted",
	"success",
	"dim"
];
/** 
* Resolves a color string. 
* If it's a semantic name (e.g. 'primary'), returns the corresponding CSS variable var(--lv-primary).
* Otherwise returns the raw value (e.g. '#e07745').
*/
function resolveColor$1(val) {
	if (SEMANTIC_COLORS.includes(val)) return `var(--lv-${val === "dim" ? "muted" : val})`;
	return val;
}
/** 给任意颜色附加透明度，使用 CSS 原生 color-mix() 实现 */
const alpha = (c, pct = 15) => {
	return `color-mix(in oklab, ${resolveColor$1(c)} ${pct}%, transparent)`;
};
/** 
* 统一调色板工厂：不再返回绝对颜色值，而是返回抽象的 CSS 变量。
* 每个语义色返回 { fg, bg, a(pct) }
*/
const palette = () => {
	const p = {};
	for (const c of SEMANTIC_COLORS) {
		const varName = c === "dim" ? "--lv-muted" : `--lv-${c}`;
		p[c] = {
			fg: `var(${varName})`,
			bg: `var(${varName}-bg, color-mix(in oklab, var(${varName}) 12%, var(--lv-mix-bg, white)))`,
			a: (pct) => `color-mix(in oklab, var(${varName}) ${pct}%, transparent)`
		};
	}
	return p;
};

//#endregion
//#region vis/primitives.ts
/** 为形状绘制光晕背景（半透明圆角矩形） */
const halo = (g, cx, cy, w, h, rx, { pad = 6, fill = svgColor("oklch(0.92 0.015 75)"), stroke = svgColor("oklch(0.55 0.02 65 / 0.22)"), strokeWidth = 1.5, id = "h" } = {}) => {
	const did = `halo-${id}`;
	g.selectAll(`[data-id="${did}"]`).remove();
	return g.append("rect").attr("data-id", did).attr("class", "h").attr("x", cx - w / 2 - pad).attr("y", cy - h / 2 - pad).attr("width", w + pad * 2).attr("height", h + pad * 2).attr("rx", rx + pad * .66).attr("fill", svgColor(fill)).attr("stroke", svgColor(stroke)).attr("stroke-width", strokeWidth);
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
			defs.append("marker").attr("id", id).attr("viewBox", "0 0 12 10").attr("refX", refX).attr("refY", refY).attr("markerWidth", mw).attr("markerHeight", mw).attr("markerUnits", "userSpaceOnUse").attr("orient", "auto-start-reverse").append("path").attr("d", "M0,0.5 L12,5 L0,9.5 Z").attr("fill", svgColor(c));
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
		bg: svg.append("g"),
		eG: svg.append("g"),
		nG: svg.append("g"),
		oG: svg.append("g"),
		W: width,
		H: height,
		M: margin
	};
};

//#endregion
//#region vis/bootstrap.ts
function bootstrap(selector, opts = {}) {
	const { width = 560, height = 400, margin = 48, geom: gOpts = {} } = opts;
	const C = createCanvas(selector, width, height, margin);
	const p = palette();
	const geom = Object.freeze({
		nW: 34,
		nH: 26,
		dR: 8,
		rx: 5,
		gap: 4,
		...gOpts
	});
	const { markerFor } = defineArrows(C.svg, { sw: 2 });
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
		geom,
		markerFor
	};
}

//#endregion
//#region vis/gfx.ts
function resolveColor(p, c) {
	if (!c) return {
		stroke: p.primary.fg,
		fill: p.primary.bg
	};
	const col = p[c];
	if (col) return {
		stroke: col.fg,
		fill: col.bg
	};
	return {
		stroke: c,
		fill: c
	};
}
var GfxImpl = class {
	constructor(eid, fm, palette) {
		this.fm = fm;
		this.palette = palette;
		this.eid = eid;
	}
	color(c) {
		const r = resolveColor(this.palette, c);
		const patch = { stroke: r.stroke };
		const e = this.fm.entities.get(this.eid);
		if (e && "fill" in e.desired) patch.fill = r.fill;
		this.fm.patch(this.eid, patch);
		return this;
	}
	stroke(w) {
		this.fm.patch(this.eid, { strokeW: w });
		return this;
	}
	fill(c) {
		const r = resolveColor(this.palette, c);
		this.fm.patch(this.eid, { fill: r.fill });
		return this;
	}
	opacity(v) {
		this.fm.patch(this.eid, { opacity: v });
		return this;
	}
	dash(pattern) {
		this.fm.patch(this.eid, { dash: pattern ?? "5 4" });
		return this;
	}
	label(t, place, gap) {
		const p = { label: t };
		if (place !== void 0) p.labelPlace = place;
		if (gap !== void 0) p.labelGap = gap;
		this.fm.patch(this.eid, p);
		return this;
	}
	size(r) {
		this.fm.patch(this.eid, { r });
		return this;
	}
	move(x, y) {
		this.fm.patch(this.eid, {
			x,
			y
		});
		return this;
	}
	rotate(deg, cx, cy) {
		this._addTransform({
			type: "rotate",
			angle: deg,
			cx,
			cy
		});
		return this;
	}
	scale(sx, sy = sx) {
		this._addTransform({
			type: "scale",
			sx,
			sy
		});
		return this;
	}
	translate(dx, dy) {
		this._addTransform({
			type: "translate",
			dx,
			dy
		});
		return this;
	}
	/** Apply an arbitrary 2×2 linear transform with optional translation. */
	matrix(a, b, c, d, tx = 0, ty = 0) {
		this._addTransform({
			type: "matrix",
			a,
			b,
			c,
			d,
			tx,
			ty
		});
		return this;
	}
	_addTransform(t) {
		const e = this.fm.entities.get(this.eid);
		if (!e) return;
		const d = e.desired;
		d.transforms = [...d.transforms || [], t];
		this.fm.patch(this.eid, { transforms: d.transforms });
	}
	pos() {
		const e = this.fm.entities.get(this.eid);
		if (!e) return [0, 0];
		const d = e.desired;
		if ("x" in d && d.x != null) return [d.x, d.y ?? 0];
		if ("cx" in d && d.cx != null) return [d.cx, d.cy ?? 0];
		if ("from" in d && d.from) {
			const from = d.from;
			if (from.length === 2) return [from[0], from[1]];
		}
		if ("x1" in d && d.x1 != null) return [d.x1, d.y1 ?? 0];
		return [0, 0];
	}
};

//#endregion
//#region vis/coords.ts
var CoordGfx = class {
	constructor(inner, proj) {
		this.inner = inner;
		this.proj = proj;
	}
	color(c) {
		this.inner.color(c);
		return this;
	}
	stroke(w) {
		this.inner.stroke(w);
		return this;
	}
	fill(c) {
		this.inner.fill(c);
		return this;
	}
	opacity(v) {
		this.inner.opacity(v);
		return this;
	}
	dash(p) {
		this.inner.dash(p);
		return this;
	}
	label(t, place, gap) {
		this.inner.label(t, place, gap);
		return this;
	}
	size(r) {
		this.inner.size(r);
		return this;
	}
	move(x, y) {
		const s = this.proj([x, y]);
		this.inner.move(s[0], s[1]);
		return this;
	}
	rotate(deg, cx, cy) {
		const s = this.proj([cx, cy]);
		this.inner.rotate(deg, s[0], s[1]);
		return this;
	}
	scale(sx, sy) {
		this.inner.scale(sx, sy);
		return this;
	}
	translate(dx, dy) {
		const s = this.proj([dx, dy]);
		const o = this.proj([0, 0]);
		this.inner.translate(s[0] - o[0], s[1] - o[1]);
		return this;
	}
	matrix(a, b, c, d, tx, ty) {
		this.inner.matrix(a, b, c, d, tx, ty);
		return this;
	}
	pos() {
		return this.inner.pos();
	}
};
function createCoordView(fm, palette, cfg = {}, W = 560, H = 400, geom = {
	nW: 34,
	nH: 26,
	dR: 8,
	rx: 5,
	gap: 4
}) {
	const { x: xDom, y: yDom, margin = 0, nice = false, aspect, basis } = cfg;
	const xdr = xDom ?? [-5, 5];
	const ydr = yDom ?? [-5, 5];
	const padX = W * (margin || 0);
	const padY = H * (margin || 0);
	let pxMin = padX, pxMax = W - padX;
	let pyMin = padY, pyMax = H - padY;
	if (aspect === "equal" || typeof aspect === "number" && aspect > 0) {
		const ratio = aspect === "equal" ? 1 : aspect;
		if ((xdr[1] - xdr[0]) / (pxMax - pxMin) > (ydr[1] - ydr[0]) / (pyMax - pyMin) * ratio) {
			const desiredH = (pxMax - pxMin) * (ydr[1] - ydr[0]) / (xdr[1] - xdr[0]) / ratio;
			const centerY = (pyMin + pyMax) / 2;
			pyMin = centerY - desiredH / 2;
			pyMax = centerY + desiredH / 2;
		} else {
			const desiredW = (pyMax - pyMin) * (xdr[1] - xdr[0]) / (ydr[1] - ydr[0]) * ratio;
			const centerX = (pxMin + pxMax) / 2;
			pxMin = centerX - desiredW / 2;
			pxMax = centerX + desiredW / 2;
		}
	}
	const xScale = linear().domain(xdr).range([pxMin, pxMax]);
	const yScale = linear().domain(ydr).range([pyMax, pyMin]);
	if (nice) {
		xScale.nice();
		yScale.nice();
	}
	const p = palette;
	const stdIx = xScale(1) - xScale(0);
	const stdIy = 0;
	const stdJx = 0;
	const stdJy = yScale(1) - yScale(0);
	const ox = xScale(0), oy = yScale(0);
	let ix = stdIx, iy = stdIy, jx = stdJx, jy = stdJy;
	if (basis) {
		ix = basis[0][0] * stdIx + basis[0][1] * stdJx;
		iy = basis[0][0] * stdIy + basis[0][1] * stdJy;
		jx = basis[1][0] * stdIx + basis[1][1] * stdJx;
		jy = basis[1][0] * stdIy + basis[1][1] * stdJy;
	}
	const project = (v) => [ox + v[0] * ix + v[1] * jx, oy + v[0] * iy + v[1] * jy];
	const px = (v) => ox + v * ix;
	const py = (v) => oy + v * jy;
	function g(eid) {
		return new CoordGfx(new GfxImpl(eid, fm, p), project);
	}
	function point(id, mx, my) {
		const [sx, sy] = project([mx, my]);
		const e = eid("node", id);
		fm.declare(e, {
			type: "node",
			shape: "circle",
			x: sx,
			y: sy,
			r: 4,
			fill: p.primary.fg,
			stroke: p.primary.fg
		});
		return g(e);
	}
	function vector(id, from, to) {
		const sf = project(from), st = project(to);
		const e = eid("line", id);
		fm.declare(e, {
			type: "line",
			from: sf,
			to: st,
			x1: sf[0],
			y1: sf[1],
			x2: st[0],
			y2: st[1],
			stroke: p.primary.fg,
			strokeW: 2,
			marker: "arrow",
			directed: true
		});
		return g(e);
	}
	function line(id, from, to) {
		const sf = project(from), st = project(to);
		const e = eid("line", id);
		fm.declare(e, {
			type: "line",
			from: sf,
			to: st,
			x1: sf[0],
			y1: sf[1],
			x2: st[0],
			y2: st[1],
			stroke: p.primary.fg,
			strokeW: 2
		});
		return g(e);
	}
	function circle(id, cx, cy, r) {
		const sc = project([cx, cy]);
		const sr = xScale(r) - xScale(0);
		const e = eid("region", id);
		fm.declare(e, {
			type: "region",
			shape: "circle",
			cx: sc[0],
			cy: sc[1],
			r: Math.abs(sr),
			fill: "none",
			stroke: p.primary.fg,
			strokeW: 2
		});
		return g(e);
	}
	function polygon(id, vertices) {
		const pts = vertices.map(project);
		const e = eid("region", id);
		fm.declare(e, {
			type: "region",
			shape: "polygon",
			vertices: pts,
			fill: p.primary.a(15),
			stroke: p.primary.fg,
			strokeW: 2
		});
		return g(e);
	}
	function curve(id, fn, domain) {
		const domainX = domain ?? xdr;
		const samples = 200;
		const fStr = fn.toString();
		const e = eid("curve", id);
		const sx = px(domainX[0]), sy = py(ydr[1]);
		const sw = px(domainX[1]) - px(domainX[0]);
		const sh = py(ydr[0]) - py(ydr[1]);
		fm.declare(e, {
			type: "curve",
			f: fStr,
			domain: domainX,
			x: Math.min(sx, sx + sw),
			y: Math.min(sy, sy + sh),
			width: Math.abs(sw),
			height: Math.abs(sh),
			samples,
			stroke: p.primary.fg,
			strokeW: 2
		});
		return g(e);
	}
	function fill(id, vertices) {
		const pts = vertices.map(project);
		const e = eid("region", id);
		fm.declare(e, {
			type: "region",
			shape: "fill",
			vertices: pts,
			fill: p.primary.a(15),
			stroke: "none",
			strokeW: 0
		});
		return g(e);
	}
	function rect(id, mx, my, mw, mh) {
		const tl = project([mx, my]);
		const br = project([mx + mw, my + mh]);
		const w = br[0] - tl[0], h = br[1] - tl[1];
		const e = eid("region", id);
		fm.declare(e, {
			type: "region",
			shape: "polygon",
			vertices: [
				[tl[0], tl[1]],
				[tl[0] + w, tl[1]],
				[tl[0] + w, tl[1] + h],
				[tl[0], tl[1] + h]
			],
			fill: "none",
			stroke: p.primary.fg,
			strokeW: 2,
			_rx: 0
		});
		return g(e);
	}
	function angle(id, vertex, ray1, ray2) {
		const sv = project(vertex), sr1 = project(ray1), sr2 = project(ray2);
		const e = eid("group", id);
		fm.declare(e, {
			type: "group",
			subtype: "angle",
			vertex: sv,
			ray1: sr1,
			ray2: sr2,
			arcR: 24,
			stroke: p.primary.fg,
			strokeW: 1.5,
			fill: p.primary.a(15)
		});
		return g(e);
	}
	function axes(opts) {
		const axe = eid("group", "axes");
		const [x0, y0] = project([0, 0]);
		function ext(ox, oy, dx, dy) {
			let tPos = Infinity, tNeg = Infinity;
			if (dx > .001) {
				tPos = Math.min(tPos, (W - ox) / dx);
				tNeg = Math.min(tNeg, ox / dx);
			}
			if (dx < -.001) {
				tNeg = Math.min(tNeg, (W - ox) / -dx);
				tPos = Math.min(tPos, ox / -dx);
			}
			if (dy > .001) {
				tPos = Math.min(tPos, (H - oy) / dy);
				tNeg = Math.min(tNeg, oy / dy);
			}
			if (dy < -.001) {
				tNeg = Math.min(tNeg, (H - oy) / -dy);
				tPos = Math.min(tPos, oy / -dy);
			}
			return [tNeg, tPos];
		}
		const [iNegT, iPosT] = ext(x0, y0, ix, iy);
		const [jNegT, jPosT] = ext(x0, y0, jx, jy);
		const xMin = x0 - ix * iNegT;
		const xMax = x0 + ix * iPosT;
		const yMin = y0 + jy * jPosT;
		const yMax = y0 - jy * jNegT;
		fm.declare(axe, {
			type: "group",
			subtype: "axes",
			ox: x0,
			oy: y0,
			xMin,
			xMax,
			yMin,
			yMax,
			ix,
			iy,
			jx,
			jy,
			xLabel: opts?.xLabel,
			yLabel: opts?.yLabel,
			arrowSize: opts?.arrowSize,
			stroke: p.dim.fg,
			strokeW: 1.2,
			fill: "none"
		});
		return new CoordGfx(new GfxImpl(axe, fm, p), project);
	}
	function grid(opts) {
		const ge = eid("group", "grid");
		const domainSpan = xdr[1] - xdr[0];
		const defaultStep = domainSpan > 0 ? Math.pow(10, Math.floor(Math.log10(domainSpan))) : 1;
		const step = opts?.spacing ?? defaultStep;
		const mx0 = Math.ceil(xdr[0] / step) * step;
		const mx1 = Math.floor(xdr[1] / step) * step;
		fm.declare(ge, {
			type: "group",
			subtype: "grid",
			mx0,
			mx1,
			my0: ydr[0],
			my1: ydr[1],
			mStep: step,
			ox,
			oy,
			ix,
			iy,
			jx,
			jy,
			stroke: opts?.color ?? p.dim.fg,
			strokeW: .5,
			dash: opts?.dash
		});
	}
	function origin(opts) {
		const r = resolveColor(p, opts?.color ?? "primary");
		const oe = eid("node", "origin");
		fm.declare(oe, {
			type: "node",
			shape: "circle",
			x: px(0),
			y: py(0),
			r: 4,
			fill: r.fill,
			stroke: r.stroke,
			label: opts?.label ?? "O",
			labelPlace: "below",
			labelGap: 6
		});
	}
	return {
		point,
		vector,
		line,
		circle,
		polygon,
		curve,
		fill,
		rect,
		angle,
		axes,
		grid,
		origin,
		project: (v) => [px(v[0]), py(v[1])],
		x: px,
		y: py
	};
}

//#endregion
//#region vis/geometry.ts
const len = (dx, dy) => Math.sqrt(dx * dx + dy * dy);
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
const centerIn = (rect) => ({
	x: rect.x + rect.w / 2,
	y: rect.y + rect.h / 2
});
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
/** Half-width of a marker arrow tip, including offset. Used for edge endpoint adjustment. */
function markerHalf(config) {
	return ((config?.width ?? config?.size ?? 10) + (config?.offset ?? 0) + 2) / 2;
}
/** Offset line endpoints by given radii. Marker tip extends outward from line end. */
function offsetLine(from, to, fromR, toR, _directed = true) {
	const dx = to[0] - from[0], dy = to[1] - from[1];
	const l = len(dx, dy);
	if (l < 1e-9) return {
		x1: from[0],
		y1: from[1],
		x2: to[0],
		y2: to[1]
	};
	const ux = dx / l, uy = dy / l;
	return {
		x1: from[0] + ux * fromR,
		y1: from[1] + uy * fromR,
		x2: to[0] - ux * toR,
		y2: to[1] - uy * toR
	};
}

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
//#region vis/scene.ts
let _Symbol$dispose;
_Symbol$dispose = Symbol.dispose;
var SceneImpl = class {
	constructor(selector, opts = {}) {
		const { width = 560, height = 400, margin = 48, theme, geom: gOpts, ms, animation, renderer } = opts;
		this._ctx = bootstrap(selector, {
			width,
			height,
			margin,
			geom: gOpts
		});
		this._palette = this._ctx.palette;
		this._geom = this._ctx.geom;
		this._fm = new FrameManager(this._ctx, animation, renderer);
		this.svg = this._ctx.svg.node();
		this.width = this._ctx.W;
		this.height = this._ctx.H;
		this._injectTheme(theme || "warm");
	}
	_injectTheme(themeName) {
		if (typeof document === "undefined") return;
		const theme = themes[themeName];
		if (!theme) return;
		const tp = theme.palette ? {
			...TOKENS,
			...theme.palette
		} : TOKENS;
		const fills = {
			...TOKENS.fills,
			...theme.palette?.fills || {}
		};
		let cssVars = "";
		for (const key of Object.keys(tp)) {
			if (key === "fills") continue;
			const v = tp[key];
			const bgV = fills[key];
			const fgColor = typeof v === "object" ? v.fg ?? v : v;
			const bgColor = typeof v === "object" ? v.bg ?? bgV : bgV;
			const varName = key === "dim" ? "muted" : key;
			if (fgColor) cssVars += `--lv-${varName}: ${fgColor}; `;
			if (bgColor) cssVars += `--lv-${varName}-bg: ${bgColor}; `;
		}
		const isDark = themeName === "dark";
		cssVars += `--lv-mix-bg: ${isDark ? "oklch(0.20 0.01 250)" : "oklch(0.97 0.005 80)"}; --lv-mix-fg: ${isDark ? "oklch(0.90 0.01 250)" : "oklch(0.25 0.02 60)"}; `;
		if (!cssVars) return;
		const themeClassName = `lv-theme-${themeName}`;
		const styleId = `lv-style-${themeClassName}`;
		if (!document.getElementById(styleId)) {
			const styleEl = document.createElement("style");
			styleEl.id = styleId;
			styleEl.textContent = `@layer learnvis.theme { .${themeClassName} { ${cssVars} } }`;
			document.head.appendChild(styleEl);
		}
		const svgNode = this.svg;
		if (svgNode) {
			svgNode.classList.add(themeClassName);
			const entries = cssVars.trim().split(";").filter(Boolean);
			for (const e of entries) {
				const [prop, val] = e.split(":").map((s) => s.trim());
				if (prop && val) svgNode.style.setProperty(prop, val);
			}
		}
	}
	point(id, x, y) {
		const e = eid("node", id);
		const p = this._palette;
		this._fm.declare(e, {
			type: "node",
			shape: "circle",
			x,
			y,
			r: 4,
			fill: p.primary.fg,
			stroke: p.primary.fg
		});
		return new GfxImpl(e, this._fm, p);
	}
	vertex(id, x, y) {
		const e = eid("node", id);
		const p = this._palette;
		this._fm.declare(e, {
			type: "node",
			shape: "circle",
			x,
			y,
			r: 10,
			fill: p.primary.a(15),
			stroke: p.primary.fg,
			label: id,
			labelPlace: "below",
			labelGap: 6
		});
		return new GfxImpl(e, this._fm, p);
	}
	edge(a, b) {
		const p = this._palette;
		const aId = typeof a === "string" ? eid("node", a) : a.eid;
		const bId = typeof b === "string" ? eid("node", b) : b.eid;
		const aEnt = this._fm.entities.get(aId);
		const bEnt = this._fm.entities.get(bId);
		if (!aEnt || !bEnt) throw new Error(`edge(): entity "${!aEnt ? aId : bId}" not found. Ensure vertex() is called before edge() in the same frame.`);
		const ax = aEnt.desired.x;
		const ay = aEnt.desired.y;
		const ar = aEnt.desired.r ?? 10;
		const bx = bEnt.desired.x;
		const by = bEnt.desired.y;
		const br = bEnt.desired.r ?? 10;
		const { x1, y1, x2, y2 } = offsetLine([ax, ay], [bx, by], ar + 4, br + markerHalf(), true);
		const e = eid("line", typeof a === "string" && typeof b === "string" ? `${a}:${b}` : `${aId.replace("node:", "")}:${bId.replace("node:", "")}`);
		this._fm.declare(e, {
			type: "line",
			from: [ax, ay],
			to: [bx, by],
			x1,
			y1,
			x2,
			y2,
			stroke: p.dim.fg,
			strokeW: 1.8,
			directed: true,
			marker: "arrow"
		});
		return new GfxImpl(e, this._fm, p);
	}
	line(id, x1, y1, x2, y2) {
		const e = eid("line", id);
		const p = this._palette;
		this._fm.declare(e, {
			type: "line",
			from: [x1, y1],
			to: [x2, y2],
			x1,
			y1,
			x2,
			y2,
			stroke: p.primary.fg,
			strokeW: 2
		});
		return new GfxImpl(e, this._fm, p);
	}
	vector(id, from, to) {
		const e = eid("line", id);
		const p = this._palette;
		this._fm.declare(e, {
			type: "line",
			from: [...from],
			to: [...to],
			x1: from[0],
			y1: from[1],
			x2: to[0],
			y2: to[1],
			stroke: p.primary.fg,
			strokeW: 2,
			marker: "arrow",
			directed: true
		});
		return new GfxImpl(e, this._fm, p);
	}
	polyline(id, pts) {
		const e = eid("line", id);
		const p = this._palette;
		this._fm.declare(e, {
			type: "line",
			points: pts.map((p) => [...p]),
			x1: pts[0]?.[0],
			y1: pts[0]?.[1],
			x2: pts[pts.length - 1]?.[0],
			y2: pts[pts.length - 1]?.[1],
			stroke: p.primary.fg,
			strokeW: 2
		});
		return new GfxImpl(e, this._fm, p);
	}
	circle(id, cx, cy, r) {
		const e = eid("region", id);
		const p = this._palette;
		this._fm.declare(e, {
			type: "region",
			shape: "circle",
			cx,
			cy,
			r,
			fill: "none",
			stroke: p.primary.fg,
			strokeW: 2
		});
		return new GfxImpl(e, this._fm, p);
	}
	polygon(id, vertices) {
		const e = eid("region", id);
		const p = this._palette;
		this._fm.declare(e, {
			type: "region",
			shape: "polygon",
			vertices: vertices.map((v) => [...v]),
			fill: p.primary.a(15),
			stroke: p.primary.fg,
			strokeW: 2
		});
		return new GfxImpl(e, this._fm, p);
	}
	rect(id, x, y, w, h) {
		const e = eid("region", id);
		const p = this._palette;
		this._fm.declare(e, {
			type: "region",
			shape: "polygon",
			vertices: [
				[x, y],
				[x + w, y],
				[x + w, y + h],
				[x, y + h]
			],
			fill: "none",
			stroke: p.primary.fg,
			strokeW: 2,
			_rx: 0
		});
		return new GfxImpl(e, this._fm, p);
	}
	curve(id, fn, domain) {
		const e = eid("curve", id);
		const p = this._palette;
		const sx = domain[0], ex = domain[1];
		const x = Math.min(sx, ex);
		const w = Math.abs(ex - sx);
		this._fm.declare(e, {
			type: "curve",
			f: fn.toString(),
			domain,
			x,
			y: 0,
			width: w,
			height: 400,
			samples: 200,
			stroke: p.primary.fg,
			strokeW: 2
		});
		return new GfxImpl(e, this._fm, p);
	}
	angle(id, vertex, ray1, ray2) {
		const e = eid("group", id);
		const p = this._palette;
		this._fm.declare(e, {
			type: "group",
			subtype: "angle",
			vertex: [...vertex],
			ray1: [...ray1],
			ray2: [...ray2],
			arcR: 24,
			stroke: p.primary.fg,
			strokeW: 1.5,
			fill: p.primary.a(15)
		});
		return new GfxImpl(e, this._fm, p);
	}
	fill(id, vertices) {
		const e = eid("region", id);
		const p = this._palette;
		this._fm.declare(e, {
			type: "region",
			shape: "fill",
			vertices: vertices.map((v) => [...v]),
			fill: p.primary.a(15),
			stroke: "none",
			strokeW: 0
		});
		return new GfxImpl(e, this._fm, p);
	}
	block(id, x, y, w, h) {
		const e = eid("node", id);
		const p = this._palette;
		const fill = `color-mix(in oklab, ${p.primary.bg} 85%, white)`;
		this._fm.declare(e, {
			type: "node",
			shape: "rect",
			x,
			y,
			w,
			h,
			rx: this._geom.rx,
			fill,
			stroke: p.primary.fg,
			strokeW: 1.2,
			label: id
		});
		return new GfxImpl(e, this._fm, p);
	}
	label(id, text, x, y) {
		const e = eid("node", id);
		const p = this._palette;
		this._fm.declare(e, {
			type: "node",
			shape: "circle",
			x,
			y,
			r: 0,
			fill: "none",
			stroke: "none",
			label: text,
			labelPlace: "below",
			labelGap: 0
		});
		return new GfxImpl(e, this._fm, p);
	}
	layout(type, vertices, edges, opts) {
		const vs = vertices.map((g) => {
			const eid = g.eid;
			const ent = this._fm.entities.get(eid);
			if (!ent) throw new Error(`layout(): entity "${eid}" not found in frame`);
			const d = ent.desired;
			return {
				id: eid,
				x: d.x,
				y: d.y,
				r: d.r ?? 10
			};
		});
		const n = vs.length;
		if (n === 0) return;
		const cx = opts?.center?.[0] ?? this.width / 2;
		const cy = opts?.center?.[1] ?? this.height / 2;
		switch (type) {
			case "circular": {
				const r = opts?.radius ?? Math.min(this.width, this.height) * .35;
				vs.forEach((v, i) => {
					const angle = 2 * Math.PI * i / n - Math.PI / 2;
					v.x = cx + r * Math.cos(angle);
					v.y = cy + r * Math.sin(angle);
					this._fm.patch(v.id, {
						x: v.x,
						y: v.y
					});
				});
				break;
			}
			case "force": {
				const sim = simulation_default(vs).force("charge", manyBody_default().strength(-300)).force("center", center_default(cx, cy)).force("collision", collide_default().radius((d) => d.r + 2));
				if (edges && edges.length > 0) {
					const nodeMap = /* @__PURE__ */ new Map();
					for (const v of vs) nodeMap.set(v.id, v);
					const links = [];
					for (const e2 of edges) {
						const parts = e2.eid.replace("line:", "").split(":");
						if (parts.length >= 2) {
							const srcId = `node:${parts[0]}`;
							const tgtId = `node:${parts[1]}`;
							const srcV = nodeMap.get(srcId);
							const tgtV = nodeMap.get(tgtId);
							if (srcV && tgtV) links.push({
								source: srcV,
								target: tgtV
							});
						}
					}
					if (links.length > 0) sim.force("link", link_default(links).distance(60));
				}
				sim.stop();
				for (let i = 0; i < 300; i++) sim.tick();
				vs.forEach((v) => {
					this._fm.patch(v.id, {
						x: v.x,
						y: v.y
					});
				});
				break;
			}
		}
	}
	axes(id, origin, opts) {
		const e = eid("group", id);
		const p = this._palette;
		const ox = origin[0], oy = origin[1];
		const xLen = opts?.xLen ?? 300;
		const yLen = opts?.yLen ?? 200;
		this._fm.declare(e, {
			type: "group",
			subtype: "axes",
			ox,
			oy,
			xMin: ox,
			xMax: ox + xLen,
			yMin: oy - yLen,
			yMax: oy,
			xLabel: opts?.xLabel,
			yLabel: opts?.yLabel,
			arrowSize: opts?.arrowSize,
			stroke: p.dim.fg,
			strokeW: 1.2,
			fill: "none"
		});
		return new GfxImpl(e, this._fm, p);
	}
	gridScreen(id, origin, opts) {
		const e = eid("group", id);
		const p = this._palette;
		const w = opts?.width ?? this.width;
		const h = opts?.height ?? this.height;
		const sp = opts?.spacing ?? 40;
		this._fm.declare(e, {
			type: "group",
			subtype: "grid",
			mx0: origin[0],
			mx1: origin[0] + w,
			my0: origin[1],
			my1: origin[1] + h,
			mStep: sp,
			gx: origin[0],
			gy: origin[1],
			w,
			h,
			sp,
			stroke: opts?.color ?? "#d4d4d4",
			strokeW: .5
		});
		return new GfxImpl(e, this._fm, p);
	}
	coords(config) {
		return createCoordView(this._fm, this._palette, config, this.width, this.height, this._geom);
	}
	render(fn, opts) {
		this._fm.begin();
		fn(this);
		this._fm.commit({ animate: opts?.animate });
	}
	steps(defs, opts) {
		return createStepsController(this, defs, opts);
	}
	[_Symbol$dispose]() {}
	dispose() {
		this[Symbol.dispose]();
	}
};
function createStepsController(scene, defs, opts) {
	let _current = (opts?.start ?? 0) - 1;
	const _total = defs.length;
	let _mode = opts?.mode ?? "full";
	const _listeners = [];
	function _exec(i) {
		const def = defs[i];
		if (!def) return;
		if (_mode === "full") scene.render((s) => {
			def.frame(s);
		});
		else scene.render((s) => {
			def.frame(s);
		});
		_listeners.forEach((fn) => fn(i, def));
	}
	function go(i) {
		const idx = Math.max(0, Math.min(i, _total - 1));
		_current = idx;
		_exec(idx);
	}
	function next() {
		go(_current + 1);
	}
	function prev() {
		go(_current - 1);
	}
	function reset() {
		_current = -1;
		scene.render(() => {});
	}
	return {
		go,
		next,
		prev,
		reset,
		get current() {
			return _current;
		},
		get total() {
			return _total;
		},
		get currentStepDef() {
			return _current >= 0 && _current < _total ? defs[_current] : null;
		},
		onChange(fn) {
			_listeners.push(fn);
			return () => {
				const idx = _listeners.indexOf(fn);
				if (idx >= 0) _listeners.splice(idx, 1);
			};
		},
		destroy() {}
	};
}
function canvas(selector, opts) {
	return new SceneImpl(selector, opts);
}

//#endregion
//#region vis/stepper.ts
let _styleInjected = false;
function _injectStyles() {
	if (_styleInjected || typeof document === "undefined") return;
	const style = document.createElement("style");
	style.id = "lv-stepper-style";
	style.textContent = `
.lv-stepper {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 0;
  font-family: var(--font, system-ui, -apple-system, sans-serif);
  user-select: none;
}

.lv-stepper-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px; height: 32px;
  padding: 0;
  font-size: 16px;
  font-family: inherit;
  color: var(--text, #333);
  background: var(--bg-card, #fff);
  border: 1px solid var(--border, rgba(0,0,0,0.12));
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, opacity 0.15s, transform 0.1s;
  line-height: 1;
  flex-shrink: 0;
}

.lv-stepper-btn svg {
  width: 14px; height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.lv-stepper-btn:hover:not(:disabled) {
  background: var(--blue-05, rgba(64,128,255,0.08));
  border-color: var(--blue, oklch(0.62 0.18 68));
}

.lv-stepper-btn:active:not(:disabled) {
  transform: scale(0.93);
  background: var(--blue-10, rgba(64,128,255,0.14));
}

.lv-stepper-btn:focus-visible {
  outline: 2px solid var(--blue, oklch(0.62 0.18 68));
  outline-offset: 2px;
}

.lv-stepper-btn:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}

.lv-stepper-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 0;
  padding: 0 4px;
}

.lv-stepper-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-dim, #666);
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.lv-stepper-counter {
  font-size: 10px;
  color: var(--text-subtle, #aaa);
  font-variant-numeric: tabular-nums;
}

.lv-stepper-dots {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}

.lv-stepper-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--border, rgba(0,0,0,0.15));
  cursor: pointer;
  transition: background 0.2s, transform 0.15s;
  border: none;
  padding: 0;
}

.lv-stepper-dot:hover {
  background: var(--blue, oklch(0.62 0.18 68));
  transform: scale(1.4);
}

.lv-stepper-dot.active {
  background: var(--blue, oklch(0.62 0.18 68));
  transform: scale(1.25);
}

.lv-stepper-dot:focus-visible {
  outline: 2px solid var(--blue, oklch(0.62 0.18 68));
  outline-offset: 2px;
}
`;
	document.head.appendChild(style);
	_styleInjected = true;
}
const ICON_PREV = "<svg viewBox=\"0 0 16 16\"><polyline points=\"10,3 5,8 10,13\"/></svg>";
const ICON_NEXT = "<svg viewBox=\"0 0 16 16\"><polyline points=\"6,3 11,8 6,13\"/></svg>";
function _btn(icon, label, onclick) {
	const b = document.createElement("button");
	b.className = "lv-stepper-btn";
	b.innerHTML = icon;
	b.setAttribute("aria-label", label);
	b.setAttribute("type", "button");
	b.onclick = onclick;
	return b;
}
function _dot(index, label, onclick) {
	const d = document.createElement("button");
	d.className = "lv-stepper-dot";
	d.setAttribute("aria-label", `${label} (step ${index + 1})`);
	d.setAttribute("type", "button");
	d.onclick = onclick;
	return d;
}
/**
* Creates a step control bar with prev/next buttons, step dots, and label.
* Keyboard: ← → to navigate, Home/End for first/last.
*/
function stepper(container, ctrlOrLabels, onChangeOrOpts, legacyOpts) {
	_injectStyles();
	const ct = typeof container === "string" ? document.querySelector(container) : container;
	if (!ct) throw new Error(`Stepper container not found: ${container}`);
	ct.innerHTML = "";
	if (Array.isArray(ctrlOrLabels)) {
		const labels = ctrlOrLabels;
		const onChange = onChangeOrOpts;
		const start = legacyOpts?.start ?? 0;
		const buttons = [];
		for (let i = 0; i < labels.length; i++) {
			const btn = document.createElement("button");
			btn.textContent = labels[i];
			btn.className = "lv-stepper-btn";
			btn.style.width = "auto";
			btn.style.borderRadius = "16px";
			btn.style.padding = "0 12px";
			btn.style.fontSize = "12px";
			btn.style.fontWeight = i === start ? "600" : "400";
			btn.addEventListener("click", () => go(i));
			ct.appendChild(btn);
			buttons.push(btn);
		}
		function go(i) {
			if (i < 0 || i >= labels.length) return;
			buttons.forEach((b, j) => {
				b.style.fontWeight = j === i ? "600" : "400";
				b.style.borderColor = j === i ? "var(--blue, oklch(0.62 0.18 68))" : "";
			});
			onChange(i);
		}
		return {
			go,
			destroy: () => {
				ct.innerHTML = "";
				buttons.length = 0;
			}
		};
	}
	const ctrl = ctrlOrLabels;
	ct.classList.add("lv-stepper");
	ct.setAttribute("role", "navigation");
	ct.setAttribute("aria-label", "Step navigation");
	const prevBtn = _btn(ICON_PREV, "Previous (←)", () => ctrl.prev());
	const nextBtn = _btn(ICON_NEXT, "Next (→)", () => ctrl.next());
	const labelEl = document.createElement("span");
	labelEl.className = "lv-stepper-label";
	const counterEl = document.createElement("span");
	counterEl.className = "lv-stepper-counter";
	const infoEl = document.createElement("span");
	infoEl.className = "lv-stepper-info";
	infoEl.append(labelEl, counterEl);
	const dotsEl = document.createElement("span");
	dotsEl.className = "lv-stepper-dots";
	ct.append(prevBtn, infoEl, dotsEl, nextBtn);
	function rebuildDots(current, total) {
		dotsEl.innerHTML = "";
		for (let i = 0; i < total; i++) {
			const d = _dot(i, `Step ${i + 1}`, () => ctrl.go(i));
			if (i === current) d.classList.add("active");
			dotsEl.appendChild(d);
		}
	}
	const _update = (i, step) => {
		prevBtn.disabled = i <= 0;
		nextBtn.disabled = i >= ctrl.total - 1;
		const s = step;
		labelEl.textContent = s.title ?? s.label ?? `Step ${i + 1}`;
		counterEl.textContent = `${i + 1} / ${ctrl.total}`;
		dotsEl.querySelectorAll(".lv-stepper-dot").forEach((d, j) => {
			d.classList.toggle("active", j === i);
		});
	};
	const cleanup = ctrl.onChange(_update);
	function onKeydown(e) {
		const ke = e;
		if (ke.key === "ArrowLeft") {
			e.preventDefault();
			ctrl.prev();
		}
		if (ke.key === "ArrowRight") {
			e.preventDefault();
			ctrl.next();
		}
		if (ke.key === "Home") {
			e.preventDefault();
			ctrl.go(0);
		}
		if (ke.key === "End") {
			e.preventDefault();
			ctrl.go(ctrl.total - 1);
		}
	}
	ct.addEventListener("keydown", onKeydown);
	ct.setAttribute("tabindex", "0");
	prevBtn.disabled = ctrl.current <= 0;
	nextBtn.disabled = ctrl.current >= ctrl.total - 1;
	const initial = ctrl.currentStepDef;
	if (initial) {
		const i = ctrl.current;
		labelEl.textContent = initial.title ?? initial.label ?? `Step ${i + 1}`;
		counterEl.textContent = `${i + 1} / ${ctrl.total}`;
	}
	rebuildDots(ctrl.current, ctrl.total);
	if (ctrl.current < 0) ctrl.go(0);
	return { destroy: () => {
		cleanup();
		ct.removeEventListener("keydown", onKeydown);
		ct.innerHTML = "";
	} };
}
/**
* Creates a description box bound to a StepsController.
*/
function descBox(container, ctrl, opts) {
	const ct = typeof container === "string" ? document.querySelector(container) : container;
	if (!ct) throw new Error(`descBox container not found: ${container}`);
	if (opts?.minHeight) ct.style.minHeight = opts.minHeight;
	const cleanup = ctrl.onChange((_, step) => {
		ct.innerHTML = step.desc ?? "";
	});
	const initialStep = ctrl.currentStepDef;
	if (initialStep) ct.innerHTML = initialStep.desc ?? "";
	return { destroy: () => {
		cleanup();
		ct.innerHTML = "";
	} };
}

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
//#region vis/linalg.ts
/** Apply 2×2 matrix to a point. Returns [x', y']. */
function applyMat2(m, x, y) {
	const [a, b, c, d] = m;
	return [a * x + c * y, b * x + d * y];
}
/** Apply affine transform to a point. Returns [x', y']. */
function applyAffine(a, b, c, d, tx, ty, x, y) {
	return [a * x + c * y + tx, b * x + d * y + ty];
}
/** Identity 2×2 matrix: [[1,0],[0,1]] */
function mat2Identity() {
	return [
		1,
		0,
		0,
		1
	];
}
/** Identity affine: [1,0,0,1,0,0] */
function affineIdentity() {
	return [
		1,
		0,
		0,
		1,
		0,
		0
	];
}
/** Multiply two 2×2 matrices: m1 × m2 */
function mat2Multiply(m1, m2) {
	const [a1, b1, c1, d1] = m1;
	const [a2, b2, c2, d2] = m2;
	return [
		a1 * a2 + c1 * b2,
		b1 * a2 + d1 * b2,
		a1 * c2 + c1 * d2,
		b1 * c2 + d1 * d2
	];
}
/** Multiply 2×2 matrix by a vector. Returns [x', y']. */
function mat2VecMul(m, x, y) {
	const [a, b, c, d] = m;
	return [a * x + c * y, b * x + d * y];
}
/** Determinant of 2×2 matrix. */
function mat2Det(a, b, c, d) {
	return a * d - b * c;
}
/** Inverse of 2×2 matrix. Returns null if singular (det = 0). */
function mat2Inverse(a, b, c, d) {
	const det = a * d - b * c;
	if (Math.abs(det) < 1e-12) return null;
	const inv = 1 / det;
	return [
		d * inv,
		-b * inv,
		-c * inv,
		a * inv
	];
}
/** Rotation matrix (degrees). Positive = counter-clockwise in standard math coords. */
function mat2FromAngle(deg) {
	const r = deg * Math.PI / 180;
	const cos = Math.cos(r), sin = Math.sin(r);
	return [
		cos,
		sin,
		-sin,
		cos
	];
}
/** Scale matrix. */
function mat2Scale(sx, sy) {
	return [
		sx,
		0,
		0,
		sy
	];
}
/** Shear matrix: x' = x + kx*y, y' = y + ky*x */
function mat2Shear(kx, ky) {
	return [
		1,
		ky,
		kx,
		1
	];
}
/** Reflection matrix across a line at angle `deg` (degrees from positive x-axis). */
function mat2FromReflection(deg) {
	const r = 2 * deg * Math.PI / 180;
	const cos = Math.cos(r), sin = Math.sin(r);
	return [
		cos,
		sin,
		sin,
		-cos
	];
}
/** Diagonal matrix diag(d1, d2). */
function mat2Diag(d1, d2) {
	return [
		d1,
		0,
		0,
		d2
	];
}
/** Decompose 2×2 matrix into rotation * scale (SVD — simple 2×2 case). */
function mat2Eigen(a, b, c, d) {
	const tr = a + d;
	const det = a * d - b * c;
	const disc = tr * tr - 4 * det;
	if (disc < 0) return null;
	const sqrtD = Math.sqrt(disc);
	const l1 = (tr + sqrtD) / 2;
	const l2 = (tr - sqrtD) / 2;
	const v1x = c, v1y = l1 - a;
	const v2x = c, v2y = l2 - a;
	if (Math.abs(c) < 1e-12) {
		const u1x = l1 - d, u1y = b;
		const u2x = l2 - d, u2y = b;
		const n1 = Math.hypot(u1x, u1y) || 1;
		const n2 = Math.hypot(u2x, u2y) || 1;
		return {
			evals: [l1, l2],
			evecs: [[u1x / n1, u1y / n1], [u2x / n2, u2y / n2]]
		};
	}
	const n1 = Math.hypot(v1x, v1y) || 1;
	const n2 = Math.hypot(v2x, v2y) || 1;
	return {
		evals: [l1, l2],
		evecs: [[v1x / n1, v1y / n1], [v2x / n2, v2y / n2]]
	};
}
/** Format a number for matrix cell display. */
function fmtCell(v) {
	if (Number.isInteger(v)) return `${v}`;
	const s = v.toFixed(2);
	return s.includes(".") ? s.replace(/\.?0+$/, "") || "0" : s;
}

//#endregion
//#region vis/index.ts
if (typeof Symbol.dispose === "undefined") Symbol.dispose = Symbol("Symbol.dispose");
if (typeof Symbol.asyncDispose === "undefined") Symbol.asyncDispose = Symbol("Symbol.asyncDispose");

//#endregion
export { FrameManager, MARKER, SVGRenderer, TOKENS, affineIdentity, alpha, applyAffine, applyMat2, bootstrap, canvas, centerIn, createCanvas, defineArrows, descBox, distribute, entryPt, exitPt, fmtCell, getBounds, halo, katexify, len, markerTip, mat2Det, mat2Diag, mat2Eigen, mat2FromAngle, mat2FromReflection, mat2Identity, mat2Inverse, mat2Multiply, mat2Scale, mat2Shear, mat2VecMul, palette, resolveTheme, stepper, svgLabel, themes };