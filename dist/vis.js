var Vis = (function(exports) {

Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

//#region vis/tokens.js
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
	/** 给 OKLCH 颜色附加透明度，兼容非 oklch 颜色原样返回 */
	const alpha = (c, pct = 15) => {
		const color = TOKENS[c] || TOKENS.fills && TOKENS.fills[c] || c;
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
		}
	});

//#endregion
//#region vis/geometry.js
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
//#region vis/primitives.js
/** 为形状绘制光晕背景（半透明圆角矩形） */
	const halo = (g, cx, cy, w, h, rx, { pad = 6, fill = "oklch(0.92 0.015 75)", stroke = "oklch(0.55 0.02 65 / 0.22)", strokeWidth = 1.5 } = {}) => g.append("rect").attr("class", "h").attr("x", cx - w / 2 - pad).attr("y", cy - h / 2 - pad).attr("width", w + pad * 2).attr("height", h + pad * 2).attr("rx", rx + pad * .66).attr("fill", fill).attr("stroke", stroke).attr("stroke-width", strokeWidth);
	/** SVG 文本标签，支持 paintOrder（描边扩边可读性） */
	const svgLabel = (g, x, y, text, { size = 14, fill = "var(--text)", weight = 700, anchor = "middle", font = "JetBrains Mono,monospace", paintOrder = false } = {}) => {
		const el = g.append("text").attr("x", x).attr("y", y).attr("text-anchor", anchor).style("font-family", font).style("font-size", size + "px").style("font-weight", weight).style("fill", fill).text(text);
		if (paintOrder) el.style("paint-order", "stroke").style("stroke", "#fff").style("stroke-width", "3");
		return el;
	};
	/** 定义 SVG marker 箭头，通过 currentColor 继承边的颜色 */
	const defineArrows = (svg, { sw = 1.3, refX = 10, refY = 5 } = {}) => {
		let defs = svg.select("defs");
		if (defs.empty()) defs = svg.append("defs");
		else defs.selectAll("marker").remove();
		const mw = sw * 7;
		defs.append("marker").attr("id", "a").attr("viewBox", "0 0 12 10").attr("refX", refX).attr("refY", refY).attr("markerWidth", mw).attr("markerHeight", mw).attr("markerUnits", "userSpaceOnUse").attr("orient", "auto-start-reverse").append("path").attr("d", "M0,0.5 L12,5 L0,9.5 Z").attr("fill", "currentColor");
		return { marker: () => "url(#a)" };
	};
	/** 在容器内创建 SVG + 4 图层（bg/edges/nodes/overlay）+ 标签覆盖层 */
	const createCanvas = (selector, width = 560, height = 400, margin = 48) => {
		const root = d3.select(selector);
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
	const domLabel = (container, anchor, html, opts = {}) => {
		const svg = container.select("svg").node();
		if (!svg) return d3.select();
		const { offsetX = 0, offsetY = 0, place = "above", gap = 8, className = "vlbl", style = {} } = opts;
		let b;
		if (anchor && typeof anchor.node === "function") {
			const el = anchor.node();
			if (el && el.getBBox) {
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
		} else if (anchor && typeof anchor.getBBox === "function") {
			const bb = anchor.getBBox();
			b = {
				left: bb.x,
				top: bb.y,
				w: bb.width,
				h: bb.height,
				cx: bb.x + bb.width / 2,
				cy: bb.y + bb.height / 2
			};
		} else if (anchor && "x" in anchor) {
			const hw = (anchor.nW || anchor.w || 0) / 2, hh = (anchor.nH || anchor.h || 0) / 2;
			const w = anchor.nW || anchor.w || 0, h = anchor.nH || anchor.h || 0;
			if (anchor.r !== void 0) b = {
				left: anchor.x - anchor.r,
				top: anchor.y - anchor.r,
				w: anchor.r * 2,
				h: anchor.r * 2,
				cx: anchor.x,
				cy: anchor.y
			};
			else b = {
				left: anchor.x - hw,
				top: anchor.y - hh,
				w,
				h,
				cx: anchor.x,
				cy: anchor.y
			};
		} else return d3.select();
		const vb = svg.viewBox.baseVal;
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
//#region vis/shapes.js
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
		g.append("rect").attr("data-id", `block-${id}`).attr("x", x).attr("y", y).attr("width", w).attr("height", h).attr("rx", rx).attr("ry", rx).attr("fill", fill).attr("stroke", stroke).attr("stroke-width", strokeW);
		if (label) svgLabel(g, labelPos === "tl" ? x + 14 : x + w / 2, labelPos === "tl" ? y + 22 : y + h / 2 + 6, label, {
			size: textSize,
			fill: textFill,
			weight: 600,
			anchor: labelPos === "tl" ? "start" : "middle"
		});
	};
	const compoundRect = (g, rect, { fill = "var(--bg-panel)", stroke = "var(--border)", strokeW = 1.5, id = "c", label, emph = false } = {}) => {
		const rx = rect.rx ?? 10;
		const pSize = 10, pRx = 3, gap = 9;
		const pColor = emph ? "oklch(0.50 0.12 68)" : "var(--text-dim)";
		const pOp = emph ? .5 : .35;
		g.append("rect").attr("data-id", `compound-${id}`).attr("x", rect.x).attr("y", rect.y).attr("width", rect.w).attr("height", rect.h).attr("rx", rx).attr("ry", rx).attr("fill", fill).attr("stroke", stroke).attr("stroke-width", strokeW);
		if (label) {
			const lx = rect.x + 14, ly = rect.y + 22;
			g.append("rect").attr("x", lx).attr("y", ly - pSize / 2).attr("width", pSize).attr("height", pSize).attr("rx", pRx).attr("fill", pColor).attr("opacity", pOp);
			g.append("text").attr("x", lx + pSize + gap).attr("y", ly + .35 * 11).attr("fill", "var(--text-dim)").attr("font-size", 11).attr("font-weight", 500).attr("letter-spacing", "1.5px").style("font-family", "Inter,sans-serif").text(String(label).toUpperCase());
		}
	};
	const connect = (g, from, to, { dir = "v", color = "var(--text-dim)", strokeW = 2, dash = "", markerUrl } = {}) => {
		const m = markerUrl || "url(#a)";
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
		return g.append("line").attr("x1", x1).attr("y1", y1).attr("x2", x2).attr("y2", y2).attr("stroke", color).attr("stroke-width", strokeW).attr("stroke-dasharray", dash || "none").attr("marker-end", m).attr("color", color).attr("stroke-linecap", "round");
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
			strokeW: 2
		});
		return blocks;
	};
	const group = (g, nodes, { pad = 10, rx = 12, fill = alpha("info", 8), stroke = TOKENS.info, strokeW = 2, dash = "5 3", label, textSize = 12 } = {}) => {
		const b = getBounds(nodes, { pad });
		if (!b) return;
		g.append("rect").attr("data-id", "group").attr("x", b.mx).attr("y", b.my).attr("width", b.Mx - b.mx).attr("height", b.My - b.my).attr("rx", rx).attr("fill", fill).attr("stroke", stroke).attr("stroke-width", strokeW).attr("stroke-dasharray", dash);
		if (label) svgLabel(g, b.mx + 14, b.my + 20, label, {
			size: textSize,
			fill: stroke,
			anchor: "start"
		});
	};
	const lBend = (g, from, to, bendX, { stroke = "var(--text-dim)", strokeW = 1.3, dash = "", id, marker, markerUrl } = {}) => {
		const autoId = id || `${from.id || from.x}-${to.id || to.x}`;
		const d = `M${from.x},${from.y} L${bendX},${from.y} L${bendX},${to.y} L${to.x},${to.y}`;
		if (marker && !markerUrl) markerUrl = marker(stroke);
		g.selectAll(`[data-id="${autoId}"]`).remove();
		return g.append("path").attr("data-id", autoId).attr("d", d).attr("fill", "none").attr("stroke", stroke).attr("stroke-width", strokeW).attr("stroke-dasharray", dash || "none").attr("marker-end", markerUrl || null).attr("color", stroke).attr("stroke-linecap", "round").attr("stroke-linejoin", "round");
	};
	const edgeLabel = (g, from, to, t, text, { size = 12, fill = "var(--text)", weight = 600, bgFill = alpha("accent", 18), bgPad = 6, bgWidth } = {}) => {
		const lx = from.x + (to.x - from.x) * t;
		const ly = from.y + (to.y - from.y) * t;
		const tw = bgWidth ?? text.length * size * .6 + bgPad * 2;
		g.append("rect").attr("x", lx - tw / 2).attr("y", ly - size / 2 - bgPad / 2).attr("width", tw).attr("height", size + bgPad).attr("rx", 4).attr("fill", bgFill);
		return svgLabel(g, lx, ly + 1, text, {
			size,
			fill,
			weight
		});
	};
	const boundBox = (g, { mx, my, Mx, My }, { rx = 10, fill = alpha("accent", 8), stroke = TOKENS.accent, strokeW = 2, dash = "5 3" } = {}) => g.append("rect").attr("x", mx).attr("y", my).attr("width", Mx - mx).attr("height", My - my).attr("rx", rx).attr("fill", fill).attr("stroke", stroke).attr("stroke-width", strokeW).attr("stroke-dasharray", dash);
	const createLayerGuides = (bg, layers, { x1 = 68, x2, stroke = "oklch(0.60 0.03 75 / 0.35)", strokeWidth = 1, dasharray = "4 6" } = {}) => {
		const xr = x2 ?? 492;
		for (let i = 1; i < layers.length; i++) {
			const y = (layers[i - 1] + layers[i]) / 2;
			bg.append("line").attr("class", "ly").attr("x1", x1).attr("x2", xr).attr("y1", y).attr("y2", y).attr("stroke", stroke).attr("stroke-width", strokeWidth).attr("stroke-dasharray", dasharray);
		}
	};
	const crossEdge = (g, { from, to, fromRect, toRect, color = TOKENS.accent, strokeW = 2, dash = "", mode = "split", marker, dR = 8, portInset = 26, midOffset = 30, bendInset = 14, portFill, portStroke, id = "ce" } = {}) => {
		const mk = marker ? marker() : "";
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
			g.append("line").attr("data-id", id).attr("x1", ep.x).attr("y1", ep.y).attr("x2", ip.x).attr("y2", ip.y).attr("stroke", color).attr("stroke-width", strokeW).attr("stroke-dasharray", dash || "none").attr("stroke-linecap", "round").attr("marker-end", mk).attr("color", color);
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
				opt(`${id}-s2`, dash || "5 4").attr("d", `M${ports.fromExt.x},${ports.fromExt.y} L${wallR + midOffset},${ports.fromExt.y} L${wallR + midOffset},${my} L${wallL - midOffset},${my} L${wallL - midOffset},${ports.toExt.y} L${ports.toExt.x},${ports.toExt.y}`).attr("marker-end", mk).attr("color", color);
				opt(`${id}-s3`, dash || "3 3").attr("d", `M${ports.toInt.x},${ports.toInt.y} L${bx2},${ports.toInt.y} L${bx2},${to.y} L${to.x},${to.y}`);
			} else {
				const d = `M${from.x},${from.y} L${bx1},${from.y} L${bx1},${my} L${bx2},${my} L${bx2},${to.y} L${to.x},${to.y}`;
				g.append("path").attr("data-id", id).attr("d", d).attr("fill", "none").attr("stroke", color).attr("stroke-width", strokeW * 1.4).attr("stroke-linecap", "round").attr("stroke-linejoin", "round").attr("marker-end", mk).attr("color", color);
			}
		}
		return { ports };
	};

//#endregion
//#region vis/stepper.js
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
//#region vis/katex.js
	const katexify = (html) => {
		if (typeof window === "undefined" || !window.katex) return html;
		return html.replace(/\$\$([^$]+)\$\$/g, (_, m) => window.katex.renderToString(m, {
			throwOnError: false,
			displayMode: true
		})).replace(/\$([^$]+)\$/g, (_, m) => window.katex.renderToString(m, { throwOnError: false }));
	};

//#endregion
//#region vis/create.js
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
		const { marker } = defineArrows(C.svg, { sw: 1.3 });
		let _tr = null, _seenIds = null;
		const makeTr = (ms = 400) => d3.transition().duration(ms).ease(d3.easeCubicInOut);
		const fadeIn = (sel) => sel.attr("opacity", 0).transition(_tr || makeTr(250)).attr("opacity", 1);
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
			[C.bg, C.oG].forEach((g) => g.selectAll("*").remove());
			C.root.selectAll(".vlbl").remove();
			fn();
			[C.nG, C.eG].forEach((g) => {
				g.selectAll("[data-id]").filter(function() {
					return !_seenIds.has(this.getAttribute("data-id"));
				}).interrupt().transition(_tr).attr("opacity", 0).remove();
			});
			_tr = null;
			_seenIds = null;
		};
		const node = (n, o = {}) => {
			if (_seenIds) _seenIds.add(n.id);
			const exist = C.nG.select(`[data-id="${n.id}"]`);
			if (!exist.empty()) {
				const tr = _tr || makeTr(250);
				const shape = exist.select(".shp");
				if (shape.node()) {
					let t = shape.interrupt().transition(tr);
					if (shape.node().tagName === "circle") t = t.attr("cx", n.x).attr("cy", n.y);
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
				const tr = _tr || (_seenIds ? makeTr(250) : null);
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
				strokeW: 1.3,
				...o
			};
			if (!opts.markerUrl) opts.markerUrl = marker(opts.stroke || p.dim.fg);
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
			let exist = C.eG.select(`[data-id="${eid}"]`);
			if (!exist.empty() && exist.node().tagName !== "line") {
				exist.remove();
				exist = C.eG.select();
			}
			if (!exist.empty()) {
				const tr = _tr || makeTr(250);
				exist.interrupt().transition(tr).attr("x1", ep.x).attr("y1", ep.y).attr("x2", ip.x).attr("y2", ip.y).attr("stroke", opts.stroke).attr("stroke-width", opts.strokeW).attr("marker-end", opts.markerUrl);
				return exist;
			}
			C.eG.selectAll(`[data-id="${eid}"]`).remove();
			return fadeIn(C.eG.append("line").attr("data-id", eid).attr("x1", ep.x).attr("y1", ep.y).attr("x2", ip.x).attr("y2", ip.y).attr("stroke", opts.stroke).attr("stroke-width", opts.strokeW).attr("stroke-dasharray", opts.dash || "").attr("marker-end", opts.markerUrl).attr("stroke-linecap", "round").attr("color", opts.stroke));
		};
		const path = (from, to, o = {}) => {
			const eid = (from.id || "") + "→" + (to.id || "");
			if (_seenIds) _seenIds.add(eid);
			const opts = {
				nW: g.nW,
				nH: g.nH,
				dR: g.dR,
				gap: g.gap,
				strokeW: 1.3,
				...o
			};
			if (!opts.markerUrl) opts.markerUrl = marker(opts.stroke || p.dim.fg);
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
			let exist = C.eG.select(`[data-id="${eid}"]`);
			if (!exist.empty() && exist.node().tagName !== "path") {
				exist.remove();
				exist = C.eG.select();
			}
			if (!exist.empty()) {
				const tr = _tr || makeTr(250);
				exist.interrupt().transition(tr).attr("d", d).attr("stroke", opts.stroke).attr("stroke-width", opts.strokeW).attr("marker-end", opts.markerUrl);
				return exist;
			}
			C.eG.selectAll(`[data-id="${eid}"]`).remove();
			return fadeIn(C.eG.append("path").attr("data-id", eid).attr("d", d).attr("fill", "none").attr("stroke", opts.stroke).attr("stroke-width", opts.strokeW).attr("stroke-dasharray", opts.dash || "").attr("marker-end", opts.markerUrl).attr("stroke-linecap", "round").attr("stroke-linejoin", "round").attr("color", opts.stroke));
		};
		const lBend$1 = (from, to, bx, o = {}) => {
			const autoId = o.id || `${from.id || from.x}-${to.id || to.x}`;
			if (_seenIds) _seenIds.add(autoId);
			return lBend(C.eG, from, to, bx, {
				marker,
				id: autoId,
				...o
			});
		};
		const halo$1 = (cx, cy, o = {}) => fadeIn(halo(C.nG, cx, cy, g.nW, g.nH, g.rx, o));
		const block$1 = (rect, o) => block(C.bg, rect, o);
		const compound = (rect, o) => compoundRect(C.bg, rect, o);
		const pipeline$1 = (x, y, stages, o) => pipeline(C.bg, x, y, stages, o);
		const group$1 = (nodes, o) => group(C.bg, nodes, o);
		const crossEdge$1 = (opts) => crossEdge(C.oG, {
			marker,
			dR: g.dR,
			...opts
		});
		const label = (text, { at, ...o } = {}) => svgLabel(C.bg, at?.x ?? 0, at?.y ?? 0, text, o);
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
				dR: g.dR,
				...o
			});
			if (!b) return;
			boundBox(C.oG, b, o);
			return b;
		};
		const layerBg = (layers, { h = 52, bgFill = p.accent.a(12), rx: grx = 8 } = {}) => {
			layers.forEach((y) => C.bg.append("rect").attr("class", "ly").attr("x", margin).attr("y", y - h / 2).attr("width", width - margin * 2).attr("height", h).attr("fill", bgFill).attr("rx", grx));
		};
		const guides = (layers, o = {}) => createLayerGuides(C.bg, layers, {
			x1: margin + 20,
			x2: width - margin - 20,
			...o
		});
		const connect$1 = (from, to, o) => connect(C.bg, from, to, o);
		const eLabel = (f, t, p, text, o = {}) => edgeLabel(C.eG, f, t, p, text, o);
		const bboxRect = (b, o = {}) => boundBox(C.oG, b, o);
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
			marker,
			layerBg,
			guides,
			exitPt,
			entryPt,
			stepper: (opts) => steps(opts.length ?? 1, { ...opts })
		};
	};

//#endregion
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
exports.pages = pages;
exports.palette = palette;
exports.pipeline = pipeline;
exports.stepper = stepper;
exports.steps = steps;
exports.svgLabel = svgLabel;
return exports;
})({});