import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/repositories/patternsRepo.js', () => ({ listAll: vi.fn(), getByName: vi.fn(), save: vi.fn() }));

import * as patternsRepo from '../../../src/repositories/patternsRepo.js';
import * as patterns from '../../../src/controllers/patternsController.js';
import { makeReq, makeRes } from '../../helpers/express.js';

beforeEach(() => vi.clearAllMocks());

describe('getPatterns', () => {
  it('sorts defaults first, then alphabetical, and maps to API shape', async () => {
    patternsRepo.listAll.mockResolvedValue([
      { name: 'Zebra', isDefault: 0, createdBy: 'u' },
      { name: 'Arrays', isDefault: 1, createdBy: 'sys' },
      { name: 'BFS', isDefault: 0, createdBy: 'u' },
    ]);
    const res = makeRes();
    await patterns.getPatterns(makeReq(), res);

    expect(res.body.map((p) => p.name)).toEqual(['Arrays', 'BFS', 'Zebra']);
    expect(res.body[0]).toEqual({ id: 'Arrays', name: 'Arrays', is_default: 1, created_by: 'sys' });
  });

  it('500s when the repo throws', async () => {
    patternsRepo.listAll.mockRejectedValue(new Error('boom'));
    const res = makeRes();
    await patterns.getPatterns(makeReq(), res);
    expect(res.statusCode).toBe(500);
  });
});

describe('addPattern', () => {
  it('400s on a blank name', async () => {
    const res = makeRes();
    await patterns.addPattern(makeReq({ body: { name: '   ' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('400s when the pattern already exists', async () => {
    patternsRepo.getByName.mockResolvedValue([{ name: 'Arrays' }]);
    const res = makeRes();
    await patterns.addPattern(makeReq({ userId: 'u', body: { name: 'Arrays' } }), res);
    expect(res.statusCode).toBe(400);
    expect(patternsRepo.save).not.toHaveBeenCalled();
  });

  it('trims and saves a new custom pattern', async () => {
    patternsRepo.getByName.mockResolvedValue([]);
    const res = makeRes();
    await patterns.addPattern(makeReq({ userId: 'u', body: { name: '  Sliding Window ' } }), res);

    expect(patternsRepo.save).toHaveBeenCalledWith({ name: 'Sliding Window', isDefault: 0, createdBy: 'u' });
    expect(res.body).toEqual({ id: 'Sliding Window', name: 'Sliding Window', is_default: 0 });
  });
});
