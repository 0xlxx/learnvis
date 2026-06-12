// 2. GEOMETRY — exitPt, entryPt, getBounds, distribute, centerIn

/** 欧氏距离 */
export const len = (dx, dy) => Math.sqrt(dx * dx + dy * dy);

/**
 * 节点出射点：从 n 出发指向 (tx, ty) 的边与节点边界的交点。
 * dummy 节点按半径方向计算；普通节点按方向优先（竖直/水平边）。
 */
export const exitPt = (n, tx, ty, { nW = 34, nH = 26, dR = 8, gap = 0 } = {}) => {
  if (n.t === 'dummy') {
    const dx = tx - n.x, dy = ty - n.y, l = len(dx, dy);
    return { x: n.x + dx / l * dR, y: n.y + dy / l * dR };
  }
  const dy = ty - n.y;
  if (Math.abs(dy) > 10) return { x: n.x, y: n.y + Math.sign(dy) * (nH / 2) };
  return { x: n.x + Math.sign(tx - n.x) * (nW / 2), y: n.y };
};

/**
 * 节点入射点：从 (fx, fy) 进入节点 n 的边与节点边界的交点。
 * 与 exitPt 对称，但 gap 控制边与节点边界的间距。
 */
export const entryPt = (n, fx, fy, { nW = 34, nH = 26, dR = 8, gap = 0 } = {}) => {
  if (n.t === 'dummy') {
    const dx = n.x - fx, dy = n.y - fy, l = len(dx, dy);
    return { x: n.x - dx / l * (dR + gap), y: n.y - dy / l * (dR + gap) };
  }
  const dy = n.y - fy;
  if (Math.abs(dy) > 10) return { x: n.x, y: n.y - Math.sign(dy) * (nH / 2 + gap) };
  return { x: n.x - Math.sign(n.x - fx) * (nW / 2 + gap), y: n.y };
};

/** 获取一组节点的包围盒 { mx, Mx, my, My }，pad 控制外扩距离 */
export const getBounds = (nodes, { nW = 34, nH = 26, dR = 8, pad = 8 } = {}) => {
  if (!nodes.length) return null;
  const xs = nodes.map(n => n.x - (n.t === 'dummy' ? dR : nW / 2));
  const xe = nodes.map(n => n.x + (n.t === 'dummy' ? dR : nW / 2));
  const ys = nodes.map(n => n.y - (n.t === 'dummy' ? dR : nH / 2));
  const ye = nodes.map(n => n.y + (n.t === 'dummy' ? dR : nH / 2));
  return {
    mx: Math.min(...xs) - pad, Mx: Math.max(...xe) + pad,
    my: Math.min(...ys) - pad, My: Math.max(...ye) + pad,
  };
};

/** 获取矩形中心点 */
export const centerIn = (rect) => ({ x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 });

/** 在容器内均匀分布 count 个项目，返回坐标数组 */
export const distribute = (count, container, { dir = 'v', gap = 16, itemW, itemH, align = 'center' } = {}) => {
  const iw = itemW || 40, ih = itemH || 30;
  const out = [];
  if (dir === 'v') {
    const totalH = count * ih + (count - 1) * gap;
    const sy = container.y + (container.h - totalH) / 2;
    const cx = align === 'center' ? container.x + container.w / 2 : align === 'start' ? container.x + iw / 2 : container.x + container.w - iw / 2;
    for (let i = 0; i < count; i++) out.push({ x: cx, y: sy + i * (ih + gap) + ih / 2 });
  } else {
    const totalW = count * iw + (count - 1) * gap;
    const sx = container.x + (container.w - totalW) / 2;
    const cy = container.y + container.h / 2;
    for (let i = 0; i < count; i++) out.push({ x: sx + i * (iw + gap) + iw / 2, y: cy });
  }
  return out;
};
