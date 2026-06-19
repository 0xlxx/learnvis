// vis/linalg.test.ts — pure linear algebra function tests (no DOM needed)

import { describe, it, expect } from 'vitest';
import {
  applyMat2, applyAffine,
  mat2Identity, affineIdentity,
  mat2Multiply, mat2VecMul,
  mat2Det, mat2Inverse,
  mat2FromAngle, mat2Scale, mat2Shear, mat2FromReflection, mat2Diag,
  mat2Eigen, fmtCell,
} from './linalg';

describe('applyMat2', () => {
  it('identity returns input unchanged', () => {
    const [x, y] = applyMat2(mat2Identity(), 3, 7);
    expect(x).toBeCloseTo(3);
    expect(y).toBeCloseTo(7);
  });

  it('scale matrix doubles coordinates', () => {
    const m = mat2Scale(2, 3);
    const [x, y] = applyMat2(m, 1, 1);
    expect(x).toBeCloseTo(2);
    expect(y).toBeCloseTo(3);
  });

  it('rotation 90° maps (1,0) to (0,1)', () => {
    const m = mat2FromAngle(90);
    const [x, y] = applyMat2(m, 1, 0);
    expect(x).toBeCloseTo(0, 5);
    expect(y).toBeCloseTo(1, 5);
  });
});

describe('applyAffine', () => {
  it('translation shifts point', () => {
    const [x, y] = applyAffine(1, 0, 0, 1, 10, 20, 5, 5);
    expect(x).toBeCloseTo(15);
    expect(y).toBeCloseTo(25);
  });
});

describe('mat2Multiply', () => {
  it('identity × identity = identity', () => {
    const r = mat2Multiply(mat2Identity(), mat2Identity());
    expect(r).toEqual([1, 0, 0, 1]);
  });

  it('scale × rotation composes correctly', () => {
    const rot = mat2FromAngle(90);
    const sc = mat2Scale(2, 2);
    const composed = mat2Multiply(sc, rot);
    const [x, y] = applyMat2(composed, 1, 0);
    expect(x).toBeCloseTo(0, 5);
    expect(y).toBeCloseTo(2, 5);
  });
});

describe('mat2VecMul', () => {
  it('scale × vector', () => {
    const [x, y] = mat2VecMul([2, 0, 0, 3], 1, 1);
    expect(x).toBeCloseTo(2);
    expect(y).toBeCloseTo(3);
  });
});

describe('mat2Det', () => {
  it('identity det = 1', () => {
    expect(mat2Det(1, 0, 0, 1)).toBeCloseTo(1);
  });
  it('scale(2,3) det = 6', () => {
    expect(mat2Det(2, 0, 0, 3)).toBeCloseTo(6);
  });
  it('[1,2;3,4] det = -2', () => {
    expect(mat2Det(1, 2, 3, 4)).toBeCloseTo(-2);
  });
});

describe('mat2Inverse', () => {
  it('identity inverse = identity', () => {
    expect(mat2Inverse(1, 0, 0, 1)).toEqual([1, -0, -0, 1]);
  });
  it('scale inverse', () => {
    const inv = mat2Inverse(2, 0, 0, 4)!;
    expect(inv[0]).toBeCloseTo(0.5);
    expect(inv[3]).toBeCloseTo(0.25);
  });
  it('singular matrix returns null', () => {
    expect(mat2Inverse(0, 0, 0, 0)).toBeNull();
  });
});

describe('mat2FromAngle', () => {
  it('0° is identity', () => {
    const m = mat2FromAngle(0);
    expect(m[0]).toBeCloseTo(1);
    expect(m[1]).toBeCloseTo(0);
    expect(m[2]).toBeCloseTo(0);
    expect(m[3]).toBeCloseTo(1);
  });
  it('90° maps (1,0) → (0,1)', () => {
    const m = mat2FromAngle(90);
    const [x, y] = applyMat2(m, 1, 0);
    expect(x).toBeCloseTo(0, 5);
    expect(y).toBeCloseTo(1, 5);
  });
});

describe('mat2Shear', () => {
  it('horizontal shear shifts x by y', () => {
    const m = mat2Shear(1, 0);
    const [x, y] = applyMat2(m, 0, 5);
    expect(x).toBeCloseTo(5);
    expect(y).toBeCloseTo(5);
  });
});

describe('mat2FromReflection', () => {
  it('reflect across x-axis (0°) flips y', () => {
    const m = mat2FromReflection(0);
    const [x, y] = applyMat2(m, 1, 1);
    expect(x).toBeCloseTo(1);
    expect(y).toBeCloseTo(-1);
  });
});

describe('mat2Diag', () => {
  it('creates diagonal matrix', () => {
    expect(mat2Diag(3, 5)).toEqual([3, 0, 0, 5]);
  });
});

describe('mat2Eigen', () => {
  it('diagonal matrix eigenvalues', () => {
    const r = mat2Eigen(2, 0, 0, 3);
    expect(r).not.toBeNull();
    expect(r!.evals[0]).toBeCloseTo(3);
    expect(r!.evals[1]).toBeCloseTo(2);
  });
  it('symmetric matrix eigenvalues', () => {
    const r = mat2Eigen(1, 1, 1, 1);
    expect(r).not.toBeNull();
    // λ1 = 2, λ2 = 0 for [[1,1],[1,1]]
    expect(r!.evals[0]).toBeCloseTo(2);
    expect(r!.evals[1]).toBeCloseTo(0, 5);
  });
  it('rotation matrix — complex eigenvalues returns null', () => {
    const r = mat2Eigen(0, 1, -1, 0);
    expect(r).toBeNull();
  });
});

describe('fmtCell', () => {
  it('integer returns as-is', () => {
    expect(fmtCell(5)).toBe('5');
    expect(fmtCell(-3)).toBe('-3');
  });
  it('float strips trailing zeros', () => {
    expect(fmtCell(1.5)).toBe('1.5');
    expect(fmtCell(2.0)).toBe('2');
  });
  it('zero formats correctly', () => {
    expect(fmtCell(0)).toBe('0');
  });
});
