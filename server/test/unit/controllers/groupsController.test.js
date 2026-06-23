import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/repositories/groupsRepo.js', () => ({
  listUserGroupIndex: vi.fn(() => []), getDetail: vi.fn(), getMember: vi.fn(), getProblem: vi.fn(),
  listMembers: vi.fn(() => []), listProblems: vi.fn(() => []), listAllRows: vi.fn(() => []),
  saveGroup: vi.fn(), saveMember: vi.fn(), saveUserGroupIndex: vi.fn(), saveProblem: vi.fn(),
  setInviteToken: vi.fn(), updateName: vi.fn(), removeMember: vi.fn(), removeUserGroupIndex: vi.fn(), removeRow: vi.fn(),
}));
vi.mock('../../../src/repositories/problemsRepo.js', () => ({ getByNumber: vi.fn(), getManyByNumbers: vi.fn(() => []) }));
vi.mock('../../../src/repositories/progressRepo.js', () => ({ listForUser: vi.fn(() => []) }));
vi.mock('../../../src/repositories/usersRepo.js', () => ({ getByUsername: vi.fn() }));
vi.mock('../../../src/utils/ensureProblemsExist.js', () => ({ ensureProblemsExist: vi.fn() }));
vi.mock('../../../src/utils/problemsDataset.js', () => ({ getProblemByNumber: vi.fn(() => ({ topics: [] })) }));

import * as groupsRepo from '../../../src/repositories/groupsRepo.js';
import * as problemsRepo from '../../../src/repositories/problemsRepo.js';
import * as usersRepo from '../../../src/repositories/usersRepo.js';
import * as groups from '../../../src/controllers/groupsController.js';
import { makeReq, makeRes } from '../../helpers/express.js';

beforeEach(() => {
  vi.clearAllMocks();
  groupsRepo.listUserGroupIndex.mockResolvedValue([]);
  groupsRepo.listMembers.mockResolvedValue([]);
  groupsRepo.listProblems.mockResolvedValue([]);
});

describe('createGroup', () => {
  it('400s on a blank name', async () => {
    const res = makeRes();
    await groups.createGroup(makeReq({ userId: 'u', username: 'alice', body: { name: '  ' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('creates the group, the creator membership and the reverse index', async () => {
    const res = makeRes();
    await groups.createGroup(makeReq({ userId: 'u', username: 'alice', body: { name: 'Blind 75' } }), res);

    expect(groupsRepo.saveGroup).toHaveBeenCalledOnce();
    expect(groupsRepo.saveMember).toHaveBeenCalledOnce();
    expect(groupsRepo.saveUserGroupIndex).toHaveBeenCalledOnce();
    expect(res.body).toMatchObject({ name: 'Blind 75', member_count: 1, problem_count: 0 });
    expect(res.body.id).toBeTruthy();
  });
});

describe('getGroupDetail', () => {
  it('403s a non-member', async () => {
    groupsRepo.getMember.mockResolvedValue(null);
    const res = makeRes();
    await groups.getGroupDetail(makeReq({ userId: 'u', params: { id: 'g1' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('404s when the group is missing', async () => {
    groupsRepo.getMember.mockResolvedValue({ SK: 'MEMBER#u' });
    groupsRepo.getDetail.mockResolvedValue(null);
    const res = makeRes();
    await groups.getGroupDetail(makeReq({ userId: 'u', params: { id: 'g1' } }), res);
    expect(res.statusCode).toBe(404);
  });
});

describe('addMember', () => {
  it('400s without a username', async () => {
    const res = makeRes();
    await groups.addMember(makeReq({ userId: 'u', params: { id: 'g1' }, body: {} }), res);
    expect(res.statusCode).toBe(400);
  });

  it('404s when the target user does not exist', async () => {
    usersRepo.getByUsername.mockResolvedValue(null);
    const res = makeRes();
    await groups.addMember(makeReq({ userId: 'u', params: { id: 'g1' }, body: { username: 'bob' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('400s when the user is already a member', async () => {
    usersRepo.getByUsername.mockResolvedValue({ email: 'bob@x.com', username: 'bob' });
    groupsRepo.getMember.mockResolvedValue({ SK: 'MEMBER#bob@x.com' });
    const res = makeRes();
    await groups.addMember(makeReq({ userId: 'u', params: { id: 'g1' }, body: { username: 'bob' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('adds the member and reverse index on success', async () => {
    usersRepo.getByUsername.mockResolvedValue({ email: 'bob@x.com', username: 'bob' });
    groupsRepo.getMember.mockResolvedValue(null);
    groupsRepo.getDetail.mockResolvedValue({ name: 'Blind 75' });
    const res = makeRes();
    await groups.addMember(makeReq({ userId: 'u', params: { id: 'g1' }, body: { username: 'bob' } }), res);

    expect(groupsRepo.saveMember).toHaveBeenCalledWith(expect.objectContaining({ groupId: 'g1', userId: 'bob@x.com' }));
    expect(res.body.user).toEqual({ id: 'bob@x.com', username: 'bob' });
  });
});

describe('addProblemToGroup', () => {
  it('400s without a problem id', async () => {
    const res = makeRes();
    await groups.addProblemToGroup(makeReq({ userId: 'u', params: { id: 'g1' }, body: {} }), res);
    expect(res.statusCode).toBe(400);
  });

  it('400s when the problem is already in the group', async () => {
    groupsRepo.getProblem.mockResolvedValue({ SK: 'PROBLEM#1' });
    const res = makeRes();
    await groups.addProblemToGroup(makeReq({ userId: 'u', params: { id: 'g1' }, body: { problem_id: 1 } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('saves and returns the serialized problem', async () => {
    groupsRepo.getProblem.mockResolvedValue(null);
    problemsRepo.getByNumber.mockResolvedValue({ leetcodeNumber: 1, title: 'Two Sum', difficulty: 'Easy', url: 'u', patternName: 'Arrays' });
    const res = makeRes();
    await groups.addProblemToGroup(makeReq({ userId: 'u', params: { id: 'g1' }, body: { problem_id: 1 } }), res);

    expect(groupsRepo.saveProblem).toHaveBeenCalledWith(expect.objectContaining({ groupId: 'g1', num: 1 }));
    expect(res.body).toMatchObject({ id: 1, title: 'Two Sum' });
  });
});

describe('joinGroup', () => {
  it('403s on an invalid invite token', async () => {
    groupsRepo.getDetail.mockResolvedValue({ name: 'g', inviteToken: 'right' });
    const res = makeRes();
    await groups.joinGroup(makeReq({ userId: 'u', username: 'alice', params: { id: 'g1' }, body: { token: 'wrong' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('joins idempotently (already a member → joined:false, no new writes)', async () => {
    groupsRepo.getDetail.mockResolvedValue({ name: 'g', inviteToken: 'right' });
    groupsRepo.getMember.mockResolvedValue({ SK: 'MEMBER#u' });
    const res = makeRes();
    await groups.joinGroup(makeReq({ userId: 'u', username: 'alice', params: { id: 'g1' }, body: { token: 'right' } }), res);
    expect(res.body).toMatchObject({ joined: false });
    expect(groupsRepo.saveMember).not.toHaveBeenCalled();
  });

  it('joins a new member', async () => {
    groupsRepo.getDetail.mockResolvedValue({ name: 'g', inviteToken: 'right' });
    groupsRepo.getMember.mockResolvedValue(null);
    const res = makeRes();
    await groups.joinGroup(makeReq({ userId: 'u', username: 'alice', params: { id: 'g1' }, body: { token: 'right' } }), res);
    expect(res.body).toMatchObject({ joined: true });
    expect(groupsRepo.saveMember).toHaveBeenCalledOnce();
  });
});

describe('updateGroup', () => {
  it('403s a non-creator', async () => {
    groupsRepo.getDetail.mockResolvedValue({ name: 'g', createdBy: 'someone-else' });
    const res = makeRes();
    await groups.updateGroup(makeReq({ userId: 'u', params: { id: 'g1' }, body: { name: 'New' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('renames when the requester is the creator', async () => {
    groupsRepo.getDetail.mockResolvedValue({ name: 'g', createdBy: 'u' });
    const res = makeRes();
    await groups.updateGroup(makeReq({ userId: 'u', params: { id: 'g1' }, body: { name: 'New' } }), res);
    expect(groupsRepo.updateName).toHaveBeenCalledWith('g1', 'New');
    expect(res.body).toEqual({ id: 'g1', name: 'New' });
  });
});

describe('deleteGroup', () => {
  it('403s a non-creator', async () => {
    groupsRepo.getDetail.mockResolvedValue({ name: 'g', createdBy: 'other' });
    const res = makeRes();
    await groups.deleteGroup(makeReq({ userId: 'u', params: { id: 'g1' }, body: { name: 'g' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('400s on a name confirmation mismatch', async () => {
    groupsRepo.getDetail.mockResolvedValue({ name: 'Blind 75', createdBy: 'u' });
    const res = makeRes();
    await groups.deleteGroup(makeReq({ userId: 'u', params: { id: 'g1' }, body: { name: 'wrong' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('sweeps all rows and member indexes on a confirmed delete', async () => {
    groupsRepo.getDetail.mockResolvedValue({ name: 'Blind 75', createdBy: 'u' });
    groupsRepo.listAllRows.mockResolvedValue([
      { PK: 'GROUP#g1', SK: 'DETAIL' },
      { PK: 'GROUP#g1', SK: 'MEMBER#u' },
      { PK: 'GROUP#g1', SK: 'PROBLEM#1' },
    ]);
    const res = makeRes();
    await groups.deleteGroup(makeReq({ userId: 'u', params: { id: 'g1' }, body: { name: 'Blind 75' } }), res);

    expect(groupsRepo.removeRow).toHaveBeenCalledTimes(3);
    expect(groupsRepo.removeUserGroupIndex).toHaveBeenCalledWith('u', 'g1');
    expect(res.body).toEqual({ success: true });
  });
});

describe('leaveGroup', () => {
  it('removes membership and reverse index', async () => {
    const res = makeRes();
    await groups.leaveGroup(makeReq({ userId: 'u', params: { id: 'g1' } }), res);
    expect(groupsRepo.removeMember).toHaveBeenCalledWith('g1', 'u');
    expect(groupsRepo.removeUserGroupIndex).toHaveBeenCalledWith('u', 'g1');
    expect(res.body).toEqual({ message: 'Left group' });
  });
});

describe('bulkAddProblemsToGroup', () => {
  it('400s on an empty problem_ids array', async () => {
    const res = makeRes();
    await groups.bulkAddProblemsToGroup(makeReq({ userId: 'u', params: { id: 'g1' }, body: { problem_ids: [] } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('adds new problems and reports duplicates / failures', async () => {
    groupsRepo.listProblems.mockResolvedValue([{ SK: 'PROBLEM#1' }]); // #1 already present
    problemsRepo.getManyByNumbers.mockResolvedValue([
      { leetcodeNumber: 2, title: 'Add Two Numbers', difficulty: 'Medium' },
    ]); // #2 resolvable, #3 not
    const res = makeRes();
    await groups.bulkAddProblemsToGroup(makeReq({ userId: 'u', params: { id: 'g1' }, body: { problem_ids: [1, 2, 3] } }), res);

    expect(res.body).toMatchObject({ addedCount: 1, alreadyInGroupCount: 1, failedCount: 1 });
    expect(groupsRepo.saveProblem).toHaveBeenCalledOnce();
  });
});
