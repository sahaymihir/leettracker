import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the DynamoDB helper layer: repository tests assert that each method
// translates to the right key/expression, which is exactly where single-table
// key bugs hide.
vi.mock('../../../src/db/dynamodb.js', () => ({
  getItem: vi.fn(), putItem: vi.fn(), updateItem: vi.fn(), scanItems: vi.fn(),
}));

import { getItem, putItem, updateItem, scanItems } from '../../../src/db/dynamodb.js';
import * as usersRepo from '../../../src/repositories/usersRepo.js';

beforeEach(() => vi.clearAllMocks());

describe('usersRepo', () => {
  it('getByEmail reads the user PROFILE row', async () => {
    getItem.mockResolvedValue({ email: 'a@b.com' });
    await usersRepo.getByEmail('a@b.com');
    expect(getItem).toHaveBeenCalledWith('USER#a@b.com', 'PROFILE');
  });

  it('getByUsername reads the username-index row', async () => {
    await usersRepo.getByUsername('alice');
    expect(getItem).toHaveBeenCalledWith('USERNAME#alice', 'PROFILE');
  });

  it('create writes both the user row and the username index', async () => {
    await usersRepo.create({ email: 'a@b.com', username: 'alice', passwordHash: 'h', createdAt: 't' });
    expect(putItem).toHaveBeenCalledTimes(2);
    expect(putItem.mock.calls[0][0]).toMatchObject({ PK: 'USER#a@b.com', SK: 'PROFILE', username: 'alice' });
    expect(putItem.mock.calls[1][0]).toMatchObject({ PK: 'USERNAME#alice', SK: 'PROFILE', email: 'a@b.com' });
  });

  it('updateLeetcodeUsername SETs the attribute when given a value', async () => {
    await usersRepo.updateLeetcodeUsername('a@b.com', 'leetking');
    expect(updateItem).toHaveBeenCalledWith('USER#a@b.com', 'PROFILE', 'SET leetcodeUsername = :lc', { ':lc': 'leetking' });
  });

  it('updateLeetcodeUsername REMOVEs the attribute for a falsy value', async () => {
    await usersRepo.updateLeetcodeUsername('a@b.com', '');
    expect(updateItem).toHaveBeenCalledWith('USER#a@b.com', 'PROFILE', 'REMOVE leetcodeUsername');
  });

  it('updateSyncPreference SETs / REMOVEs by truthiness', async () => {
    await usersRepo.updateSyncPreference('a@b.com', 'end_of_day');
    expect(updateItem).toHaveBeenLastCalledWith('USER#a@b.com', 'PROFILE', 'SET syncPreference = :sp', { ':sp': 'end_of_day' });
    await usersRepo.updateSyncPreference('a@b.com', null);
    expect(updateItem).toHaveBeenLastCalledWith('USER#a@b.com', 'PROFILE', 'REMOVE syncPreference');
  });

  it('setLastSyncedAt stamps the timestamp', async () => {
    await usersRepo.setLastSyncedAt('a@b.com', '2026-06-24T23:00:00Z');
    expect(updateItem).toHaveBeenCalledWith('USER#a@b.com', 'PROFILE', 'SET lastSyncedAt = :ts', { ':ts': '2026-06-24T23:00:00Z' });
  });

  it('listAll scans only PROFILE rows', async () => {
    scanItems.mockResolvedValue([]);
    await usersRepo.listAll();
    expect(scanItems).toHaveBeenCalledWith('SK = :sk', { ':sk': 'PROFILE' });
  });
});
