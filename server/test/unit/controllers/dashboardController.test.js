import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/repositories/progressRepo.js', () => ({ listForUser: vi.fn() }));
vi.mock('../../../src/repositories/problemsRepo.js', () => ({ getManyByNumbers: vi.fn() }));
vi.mock('../../../src/repositories/groupsRepo.js', () => ({
  listUserGroupIndex: vi.fn(() => []), getDetail: vi.fn(), listProblems: vi.fn(() => []), listMembers: vi.fn(() => []),
}));
vi.mock('../../../src/utils/problemsDataset.js', () => ({ getProblemByNumber: vi.fn() }));

import * as progressRepo from '../../../src/repositories/progressRepo.js';
import * as problemsRepo from '../../../src/repositories/problemsRepo.js';
import * as groupsRepo from '../../../src/repositories/groupsRepo.js';
import { getProblemByNumber } from '../../../src/utils/problemsDataset.js';
import * as dashboard from '../../../src/controllers/dashboardController.js';
import { makeReq, makeRes } from '../../helpers/express.js';

beforeEach(() => {
  vi.clearAllMocks();
  groupsRepo.listUserGroupIndex.mockResolvedValue([]);
  getProblemByNumber.mockReturnValue({ topics: ['Arrays'] });
});

describe('getDashboard', () => {
  it('aggregates totals, difficulty and pattern stats', async () => {
    progressRepo.listForUser.mockResolvedValue([
      { SK: 'PROB#1', solved: 1, status: 'solved', solvedAt: '2026-06-20T00:00:00Z' },
      { SK: 'PROB#2', solved: 0, status: 'attempted' },
    ]);
    problemsRepo.getManyByNumbers.mockResolvedValue([
      { leetcodeNumber: 1, title: 'Two Sum', difficulty: 'Easy' },
      { leetcodeNumber: 2, title: 'Add Two Numbers', difficulty: 'Medium' },
    ]);

    const res = makeRes();
    await dashboard.getDashboard(makeReq({ userId: 'u' }), res);

    expect(res.body).toMatchObject({ totalProblems: 2, totalSolved: 1, totalAttempted: 1 });
    expect(res.body.difficultyStats).toEqual(
      expect.arrayContaining([
        { difficulty: 'Easy', total: 1, solved: 1 },
        { difficulty: 'Medium', total: 1, solved: 0 },
      ])
    );
    // Two Sum solved, one entry in recent activity + heatmap bucket
    expect(res.body.recentSolved).toHaveLength(1);
    expect(res.body.heatmapData['2026-06-20']).toBe(1);
  });

  it('500s when a repo throws', async () => {
    progressRepo.listForUser.mockRejectedValue(new Error('boom'));
    const res = makeRes();
    await dashboard.getDashboard(makeReq({ userId: 'u' }), res);
    expect(res.statusCode).toBe(500);
  });
});

describe('getHeatmap', () => {
  it('counts the current user solves per date', async () => {
    progressRepo.listForUser.mockResolvedValue([
      { solved: 1, solvedAt: '2026-06-20T10:00:00Z' },
      { solved: 1, solvedAt: '2026-06-20T22:00:00Z' },
      { solved: 0, solvedAt: null },
    ]);
    const res = makeRes();
    await dashboard.getHeatmap(makeReq({ userId: 'u', query: {} }), res);
    expect(res.body).toEqual({ '2026-06-20': 2 });
  });

  it('aggregates across all members for a group heatmap', async () => {
    groupsRepo.listMembers.mockResolvedValue([{ SK: 'MEMBER#a@x.com' }, { SK: 'MEMBER#b@x.com' }]);
    progressRepo.listForUser
      .mockResolvedValueOnce([{ solved: 1, solvedAt: '2026-06-21T00:00:00Z' }])
      .mockResolvedValueOnce([{ solved: 1, solvedAt: '2026-06-21T00:00:00Z' }]);
    const res = makeRes();
    await dashboard.getHeatmap(makeReq({ userId: 'u', query: { groupId: 'g1' } }), res);
    expect(res.body).toEqual({ '2026-06-21': 2 });
  });
});

describe('getPatternHeatmap', () => {
  it('resolves "me" to the requester and returns strongest/weakest/neglected', async () => {
    progressRepo.listForUser.mockResolvedValue([{ SK: 'PROB#1', solved: 1, status: 'solved' }]);
    problemsRepo.getManyByNumbers.mockResolvedValue([{ leetcodeNumber: 1, patternName: 'Arrays' }]);
    const res = makeRes();
    await dashboard.getPatternHeatmap(makeReq({ userId: 'u', params: { userId: 'me' } }), res);

    expect(progressRepo.listForUser).toHaveBeenCalledWith('u');
    expect(res.body).toHaveProperty('allPatterns');
    expect(res.body.strongest).toMatchObject({ pattern: 'Arrays', solved: 1, total: 1, percent: 100 });
  });
});
