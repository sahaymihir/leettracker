import { describe, it, expect } from 'vitest';
import { getProblemsDataset, getProblemByNumber, getProblemBySlug } from '../../../src/utils/problemsDataset.js';

// Exercises the real bundled dataset (src/data/problems.json) through the lazy
// loader. Asserts on the well-known "Two Sum" (#1) entry rather than counts so
// the test survives dataset growth.

describe('problemsDataset', () => {
  it('loads a non-empty dataset', () => {
    const all = getProblemsDataset();
    expect(Array.isArray(all)).toBe(true);
    expect(all.length).toBeGreaterThan(0);
  });

  it('looks up problem #1 by number (coercing string input)', () => {
    const byNum = getProblemByNumber(1);
    expect(byNum).toBeTruthy();
    expect(byNum.number).toBe(1);
    expect(getProblemByNumber('1')).toEqual(byNum); // Number() coercion
  });

  it('looks up the same problem by slug', () => {
    const byNum = getProblemByNumber(1);
    expect(getProblemBySlug(byNum.slug)).toEqual(byNum);
  });

  it('returns undefined for an unknown number', () => {
    expect(getProblemByNumber(99999999)).toBeUndefined();
  });
});
