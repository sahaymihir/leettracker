import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('axios', () => ({ default: { post: vi.fn() } }));
vi.mock('../../../src/repositories/usersRepo.js', () => ({ getByEmail: vi.fn(), setLastSyncedAt: vi.fn() }));
vi.mock('../../../src/repositories/problemsRepo.js', () => ({ getByNumber: vi.fn(), save: vi.fn() }));
vi.mock('../../../src/repositories/progressRepo.js', () => ({ get: vi.fn(), save: vi.fn() }));
vi.mock('../../../src/repositories/patternsRepo.js', () => ({ getByName: vi.fn(() => []), save: vi.fn() }));
vi.mock('../../../src/repositories/groupsRepo.js', () => ({ getMember: vi.fn(), listProblems: vi.fn(() => []), saveProblem: vi.fn() }));
vi.mock('../../../src/utils/problemsDataset.js', () => ({ getProblemBySlug: vi.fn() }));

import axios from 'axios';
import * as usersRepo from '../../../src/repositories/usersRepo.js';
import * as problemsRepo from '../../../src/repositories/problemsRepo.js';
import * as progressRepo from '../../../src/repositories/progressRepo.js';
import { getProblemBySlug } from '../../../src/utils/problemsDataset.js';
import { runSync, syncFromLeetCode } from '../../../src/controllers/leetcodeController.js';
import { makeReq, makeRes } from '../../helpers/express.js';

// Route the three LeetCode GraphQL calls by inspecting the query string, so the
// test doesn't depend on call ordering inside Promise.all.
const routeGraphql = (responses) => (_url, body) => {
  const q = body.query;
  if (q.includes('submitStatsGlobal')) return Promise.resolve(responses.profile);
  if (q.includes('recentAcSubmissionList')) return Promise.resolve(responses.accepted);
  if (q.includes('recentSubmissionList')) return Promise.resolve(responses.activity);
  throw new Error('unexpected GraphQL query');
};

beforeEach(() => vi.clearAllMocks());

describe('runSync (errors)', () => {
  it('throws 404 when the user does not exist', async () => {
    usersRepo.getByEmail.mockResolvedValue(null);
    await expect(runSync('missing@x.com')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 400 when no LeetCode username is linked', async () => {
    usersRepo.getByEmail.mockResolvedValue({ email: 'a@b.com', leetcodeUsername: '  ' });
    await expect(runSync('a@b.com')).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('runSync (happy path)', () => {
  it('imports a newly-solved problem and stamps lastSyncedAt', async () => {
    usersRepo.getByEmail.mockResolvedValue({ email: 'a@b.com', leetcodeUsername: 'leetking' });
    axios.post.mockImplementation(routeGraphql({
      profile: { data: { data: { matchedUser: { username: 'leetking', submitStatsGlobal: { acSubmissionNum: [{ difficulty: 'All', count: 42 }] } } } } },
      accepted: { data: { data: { recentAcSubmissionList: [{ titleSlug: 'two-sum', timestamp: '1700000000' }] } } },
      activity: { data: { data: { recentSubmissionList: [] } } },
    }));
    getProblemBySlug.mockReturnValue({ number: 1, title: 'Two Sum', slug: 'two-sum', difficulty: 'Easy', topics: ['Arrays'] });
    problemsRepo.getByNumber.mockResolvedValue(null); // not yet in shared table
    progressRepo.get.mockResolvedValue(null);          // user not yet tracking it

    const result = await runSync('a@b.com');

    expect(result).toMatchObject({ success: true, newlyImported: 1, totalSolvedOnLeetCode: 42 });
    expect(problemsRepo.save).toHaveBeenCalledOnce();   // ensureProblemExists created it
    expect(progressRepo.save).toHaveBeenCalledWith(expect.objectContaining({ num: 1, status: 'solved', solved: 1 }));
    expect(usersRepo.setLastSyncedAt).toHaveBeenCalledWith('a@b.com', expect.any(String));
  });

  it('does not downgrade an already-solved problem', async () => {
    usersRepo.getByEmail.mockResolvedValue({ email: 'a@b.com', leetcodeUsername: 'leetking' });
    axios.post.mockImplementation(routeGraphql({
      profile: { data: { data: { matchedUser: { username: 'leetking', submitStatsGlobal: { acSubmissionNum: [{ difficulty: 'All', count: 1 }] } } } } },
      accepted: { data: { data: { recentAcSubmissionList: [{ titleSlug: 'two-sum', timestamp: '1700000000' }] } } },
      activity: { data: { data: { recentSubmissionList: [] } } },
    }));
    getProblemBySlug.mockReturnValue({ number: 1, title: 'Two Sum', slug: 'two-sum', difficulty: 'Easy', topics: ['Arrays'] });
    problemsRepo.getByNumber.mockResolvedValue({ leetcodeNumber: 1 });
    progressRepo.get.mockResolvedValue({ status: 'solved', solved: 1 }); // already solved

    const result = await runSync('a@b.com');

    expect(result.newlyImported).toBe(0);
    expect(result.alreadyTracked).toBe(1);
    expect(progressRepo.save).not.toHaveBeenCalled();
  });
});

describe('syncFromLeetCode (controller)', () => {
  it('maps a 400 (username not set) onto the response', async () => {
    usersRepo.getByEmail.mockResolvedValue({ email: 'a@b.com', leetcodeUsername: '' });
    const res = makeRes();
    await syncFromLeetCode(makeReq({ userId: 'a@b.com', body: {} }), res);
    expect(res.statusCode).toBe(400);
  });

  it('maps a 404 (missing user) onto a friendly message', async () => {
    usersRepo.getByEmail.mockResolvedValue(null);
    const res = makeRes();
    await syncFromLeetCode(makeReq({ userId: 'x@x.com', body: {} }), res);
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toMatch(/public LeetCode profile/);
  });
});
