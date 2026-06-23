import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/repositories/problemsRepo.js', () => ({
  getByNumber: vi.fn(), getManyByNumbers: vi.fn(), save: vi.fn(), findRowsByPattern: vi.fn(),
}));
vi.mock('../../../src/repositories/progressRepo.js', () => ({
  get: vi.fn(), listForUser: vi.fn(), save: vi.fn(), remove: vi.fn(),
}));
vi.mock('../../../src/repositories/patternsRepo.js', () => ({ getByName: vi.fn(), save: vi.fn(), remove: vi.fn() }));
vi.mock('../../../src/repositories/groupsRepo.js', () => ({ findProblemRefsAcrossGroups: vi.fn(), removeRow: vi.fn() }));
vi.mock('../../../src/utils/problemsDataset.js', () => ({ getProblemsDataset: vi.fn(() => []), getProblemByNumber: vi.fn() }));

import * as problemsRepo from '../../../src/repositories/problemsRepo.js';
import * as progressRepo from '../../../src/repositories/progressRepo.js';
import * as patternsRepo from '../../../src/repositories/patternsRepo.js';
import * as groupsRepo from '../../../src/repositories/groupsRepo.js';
import { getProblemByNumber } from '../../../src/utils/problemsDataset.js';
import * as problems from '../../../src/controllers/problemsController.js';
import { makeReq, makeRes } from '../../helpers/express.js';

beforeEach(() => {
  vi.clearAllMocks();
  patternsRepo.getByName.mockResolvedValue([]);
});

describe('addProblem', () => {
  it('400s without a valid leetcode number', async () => {
    const res = makeRes();
    await problems.addProblem(makeReq({ userId: 'u', body: {} }), res);
    expect(res.statusCode).toBe(400);
  });

  it('400s when the problem is already tracked', async () => {
    progressRepo.get.mockResolvedValue({ status: 'unsolved', solved: 0 });
    getProblemByNumber.mockReturnValue({ title: 'Two Sum', difficulty: 'Easy', topics: ['Arrays'] });
    const res = makeRes();
    await problems.addProblem(makeReq({ userId: 'u', body: { leetcode_number: 1 } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Problem already in your list');
  });

  it('404s when require_dataset is set but the number is unknown', async () => {
    progressRepo.get.mockResolvedValue(null);
    getProblemByNumber.mockReturnValue(undefined);
    const res = makeRes();
    await problems.addProblem(makeReq({ userId: 'u', body: { leetcode_number: 99999, require_dataset: true } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('creates the shared problem + user progress from the dataset', async () => {
    progressRepo.get.mockResolvedValue(null);
    problemsRepo.getByNumber.mockResolvedValue(null);
    getProblemByNumber.mockReturnValue({ title: 'Two Sum', slug: 'two-sum', difficulty: 'Easy', url: 'u', topics: ['Arrays'] });
    const res = makeRes();
    await problems.addProblem(makeReq({ userId: 'u', body: { leetcode_number: 1 } }), res);

    expect(problemsRepo.save).toHaveBeenCalledOnce();
    expect(progressRepo.save).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u', num: 1, status: 'unsolved' }));
    expect(res.body).toMatchObject({ id: 1, title: 'Two Sum', status: 'unsolved' });
  });
});

describe('updateProblemStatus', () => {
  it('400s on an invalid status', async () => {
    const res = makeRes();
    await problems.updateProblemStatus(makeReq({ userId: 'u', params: { id: '1' }, body: { status: 'wat' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('404s when the problem does not exist', async () => {
    problemsRepo.getByNumber.mockResolvedValue(null);
    const res = makeRes();
    await problems.updateProblemStatus(makeReq({ userId: 'u', params: { id: '1' }, body: { status: 'solved' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('persists a solved status with a solvedAt timestamp', async () => {
    problemsRepo.getByNumber.mockResolvedValue({ leetcodeNumber: 1 });
    progressRepo.get.mockResolvedValue(null);
    const res = makeRes();
    await problems.updateProblemStatus(makeReq({ userId: 'u', params: { id: '1' }, body: { status: 'solved' } }), res);

    const saved = progressRepo.save.mock.calls[0][0];
    expect(saved).toMatchObject({ userId: 'u', num: 1, status: 'solved', solved: 1 });
    expect(saved.solvedAt).toBeTruthy();
    expect(res.body).toEqual({ solved: 1, status: 'solved' });
  });
});

describe('toggleProblemStatus', () => {
  it('cycles unsolved -> attempted', async () => {
    problemsRepo.getByNumber.mockResolvedValue({ leetcodeNumber: 1 });
    progressRepo.get.mockResolvedValue({ status: 'unsolved' });
    const res = makeRes();
    await problems.toggleProblemStatus(makeReq({ userId: 'u', params: { id: '1' } }), res);
    expect(res.body.status).toBe('attempted');
  });

  it('cycles solved -> unsolved', async () => {
    problemsRepo.getByNumber.mockResolvedValue({ leetcodeNumber: 1 });
    progressRepo.get.mockResolvedValue({ status: 'solved' });
    const res = makeRes();
    await problems.toggleProblemStatus(makeReq({ userId: 'u', params: { id: '1' } }), res);
    expect(res.body.status).toBe('unsolved');
  });
});

describe('deleteProblem', () => {
  it('404s when the problem does not exist', async () => {
    problemsRepo.getByNumber.mockResolvedValue(null);
    const res = makeRes();
    await problems.deleteProblem(makeReq({ userId: 'u', params: { id: '1' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('untracks the problem and cleans up an orphaned pattern', async () => {
    problemsRepo.getByNumber.mockResolvedValue({ leetcodeNumber: 1, patternName: 'Arrays' });
    groupsRepo.findProblemRefsAcrossGroups.mockResolvedValue([{ PK: 'GROUP#g', SK: 'PROBLEM#1' }]);
    problemsRepo.findRowsByPattern.mockResolvedValue([]); // no other problems use the pattern
    const res = makeRes();
    await problems.deleteProblem(makeReq({ userId: 'u', params: { id: '1' } }), res);

    expect(progressRepo.remove).toHaveBeenCalledWith('u', 1);
    expect(groupsRepo.removeRow).toHaveBeenCalledWith('GROUP#g', 'PROBLEM#1');
    expect(patternsRepo.remove).toHaveBeenCalledWith('Arrays');
    expect(res.body).toEqual({ success: true });
  });
});

describe('getProblems', () => {
  it('returns [] when the user tracks nothing', async () => {
    progressRepo.listForUser.mockResolvedValue([]);
    const res = makeRes();
    await problems.getProblems(makeReq({ userId: 'u', query: {} }), res);
    expect(res.body).toEqual([]);
  });

  it('joins progress with shared problem metadata', async () => {
    progressRepo.listForUser.mockResolvedValue([{ SK: 'PROB#1', solved: 1, status: 'solved' }]);
    problemsRepo.getManyByNumbers.mockResolvedValue([{ leetcodeNumber: 1, title: 'Two Sum', difficulty: 'Easy', slug: 'two-sum' }]);
    getProblemByNumber.mockReturnValue({ topics: ['Arrays'] });
    const res = makeRes();
    await problems.getProblems(makeReq({ userId: 'u', query: {} }), res);

    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ id: 1, title: 'Two Sum', status: 'solved', topics: ['Arrays'] });
  });
});
