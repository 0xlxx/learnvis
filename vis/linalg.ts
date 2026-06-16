// vis/linalg.ts — pure 2D linear algebra utilities (no DOM, no D3, no side effects)

/** 2×2 matrix [a, b, c, d] in SVG convention: x' = a*x + c*y, y' = b*x + d*y */
export type Mat2 = readonly [number, number, number, number];

/** Affine transform [a, b, c, d, tx, ty]: x' = a*x + c*y + tx, y' = b*x + d*y + ty */
export type Affine2 = readonly [number, number, number, number, number, number];

// ── Application ──

/** Apply 2×2 matrix to a point. Returns [x', y']. */
export function applyMat2(m: Mat2, x: number, y: number): [number, number] {
  const [a, b, c, d] = m;
  return [a * x + c * y, b * x + d * y];
}

/** Apply affine transform to a point. Returns [x', y']. */
export function applyAffine(a: number, b: number, c: number, d: number, tx: number, ty: number, x: number, y: number): [number, number] {
  return [a * x + c * y + tx, b * x + d * y + ty];
}

// ── Identity ──

/** Identity 2×2 matrix: [[1,0],[0,1]] */
export function mat2Identity(): Mat2 { return [1, 0, 0, 1]; }

/** Identity affine: [1,0,0,1,0,0] */
export function affineIdentity(): Affine2 { return [1, 0, 0, 1, 0, 0]; }

// ── Arithmetic ──

/** Multiply two 2×2 matrices: m1 × m2 */
export function mat2Multiply(m1: Mat2, m2: Mat2): Mat2 {
  const [a1, b1, c1, d1] = m1;
  const [a2, b2, c2, d2] = m2;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
  ];
}

/** Multiply 2×2 matrix by a vector. Returns [x', y']. */
export function mat2VecMul(m: Mat2, x: number, y: number): [number, number] {
  const [a, b, c, d] = m;
  return [a * x + c * y, b * x + d * y];
}

/** Determinant of 2×2 matrix. */
export function mat2Det(a: number, b: number, c: number, d: number): number {
  return a * d - b * c;
}

/** Inverse of 2×2 matrix. Returns null if singular (det = 0). */
export function mat2Inverse(a: number, b: number, c: number, d: number): Mat2 | null {
  const det = a * d - b * c;
  if (Math.abs(det) < 1e-12) return null;
  const inv = 1 / det;
  return [d * inv, -b * inv, -c * inv, a * inv];
}

// ── Generators ──

/** Rotation matrix (degrees). Positive = counter-clockwise in standard math coords. */
export function mat2FromAngle(deg: number): Mat2 {
  const r = deg * Math.PI / 180;
  const cos = Math.cos(r), sin = Math.sin(r);
  return [cos, sin, -sin, cos];
}

/** Scale matrix. */
export function mat2Scale(sx: number, sy: number): Mat2 {
  return [sx, 0, 0, sy];
}

/** Shear matrix: x' = x + kx*y, y' = y + ky*x */
export function mat2Shear(kx: number, ky: number): Mat2 {
  return [1, ky, kx, 1];
}

/** Reflection matrix across a line at angle `deg` (degrees from positive x-axis). */
export function mat2FromReflection(deg: number): Mat2 {
  const r = 2 * deg * Math.PI / 180;
  const cos = Math.cos(r), sin = Math.sin(r);
  return [cos, sin, sin, -cos];
}

/** Diagonal matrix diag(d1, d2). */
export function mat2Diag(d1: number, d2: number): Mat2 {
  return [d1, 0, 0, d2];
}

/** Decompose 2×2 matrix into rotation * scale (SVD — simple 2×2 case). */
export function mat2Eigen(a: number, b: number, c: number, d: number): { evals: [number, number]; evecs: [[number, number], [number, number]] } | null {
  // Trace and determinant
  const tr = a + d;
  const det = a * d - b * c;
  const disc = tr * tr - 4 * det;
  if (disc < 0) return null; // complex eigenvalues — no real eigenvectors
  const sqrtD = Math.sqrt(disc);
  const l1 = (tr + sqrtD) / 2;
  const l2 = (tr - sqrtD) / 2;
  // Eigenvectors
  const v1x = c, v1y = l1 - a;
  const v2x = c, v2y = l2 - a;
  // If c ≈ 0, use b column instead
  if (Math.abs(c) < 1e-12) {
    const u1x = l1 - d, u1y = b;
    const u2x = l2 - d, u2y = b;
    const n1 = Math.hypot(u1x, u1y) || 1;
    const n2 = Math.hypot(u2x, u2y) || 1;
    return { evals: [l1, l2], evecs: [[u1x / n1, u1y / n1], [u2x / n2, u2y / n2]] };
  }
  const n1 = Math.hypot(v1x, v1y) || 1;
  const n2 = Math.hypot(v2x, v2y) || 1;
  return { evals: [l1, l2], evecs: [[v1x / n1, v1y / n1], [v2x / n2, v2y / n2]] };
}

/** Format a number for matrix cell display. */
export function fmtCell(v: number): string {
  if (Number.isInteger(v)) return `${v}`;
  const s = v.toFixed(2);
  // Strip trailing zeros: "1.50" → "1.5", "0.00" → "0"
  return s.includes('.') ? s.replace(/\.?0+$/, '') || '0' : s;
}
