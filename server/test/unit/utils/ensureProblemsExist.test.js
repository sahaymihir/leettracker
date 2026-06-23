import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/repositories/problemsRepo.js', () => ({ getByNumber: vi.fn(), save: vi.fn() }));
vi.mock('../../../src/repositories/patternsRepo.js', () => ({ getByName: vi.fn(), save: vi.fn() }));
vi.mock('../../../src/utils/problemsDataset.js', () => ({ getProblemByNumber: vi.fn() }));

import * as problemsRepo from '../../../src/repositories/problemsRepo.js';
import * as patternsRepo from '../../../src/repositories/patternsRepo.js';
import { getProblemByNumber } from '../../../src/utils/problemsDataset.js';
import { ensureProblemsExist } from '../../../src/utils/ensureProblemsExist.js';

beforeEach(() => {
  vi.clearAllMocks();
  patternsRepo.getByName.mockResolvedValue([]); // pattern absent by default
});

describe('ensureProblemsExist', () => {
  it('skips invalid numbers (non-integer, zero, negative)', async () => {
    const resolved = await ensureProblemsExist(['abc', 0, -3], 'u@x.com');
    expect(resolved.size).toBe(0);
    expect(problemsRepo.getByNumber).not.toHaveBeenCalled();
  });

  it('resolves an already-existing problem without creating it', async () => {
    problemsRepo.getByNumber.mockResolvedValue({ leetcodeNumber: 1 });

    const resolved = await ensureProblemsExist([1], 'u@x.com');

    expect(resolved.has(1)).toBe(true);
    expect(problemsRepo.save).not.toHaveBeenCalled();
  });

  it('creates a problem (and its pattern) from the dataset when missing', async () => {
    problemsRepo.getByNumber.mockResolvedValue(null);
    getProblemByNumber.mockReturnValue({ title: 'Two Sum', slug: 'two-sum', difficulty: 'Easy', topics: ['Arrays'] });

    const resolved = await ensureProblemsExist([1], 'u@x.com');

    expect(resolved.has(1)).toBe(true);
    expect(patternsRepo.save).toHaveBeenCalledWith({ name: 'Arrays', isDefault: 0, createdBy: 'u@x.com' });
    expect(problemsRepo.save).toHaveBeenCalledOnce();
    expect(problemsRepo.save.mock.calls[0][0]).toMatchObject({ num: 1, title: 'Two Sum', patternName: 'Arrays' });
  });

  it('omits numbers absent from the dataset so callers can report them as failures', async () => {
    problemsRepo.getByNumber.mockResolvedValue(null);
    getProblemByNumber.mockReturnValue(undefined);

    const resolved = await ensureProblemsExist([99999], 'u@x.com');

    expect(resolved.size).toBe(0);
    expect(problemsRepo.save).not.toHaveBeenCalled();
  });
});
