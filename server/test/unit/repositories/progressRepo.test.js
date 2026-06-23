import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/db/dynamodb.js', () => ({
  getItem: vi.fn(), putItem: vi.fn(), queryItems: vi.fn(), deleteItem: vi.fn(),
}));

import { getItem, putItem, queryItems, deleteItem } from '../../../src/db/dynamodb.js';
import * as progressRepo from '../../../src/repositories/progressRepo.js';

beforeEach(() => vi.clearAllMocks());

describe('progressRepo', () => {
  it('get reads the per-user problem row', async () => {
    await progressRepo.get('a@b.com', 42);
    expect(getItem).toHaveBeenCalledWith('PROGRESS#a@b.com', 'PROB#42');
  });

  it('listForUser queries by the PROB# prefix', async () => {
    queryItems.mockResolvedValue([]);
    await progressRepo.listForUser('a@b.com');
    expect(queryItems).toHaveBeenCalledWith('PROGRESS#a@b.com', 'PROB#');
  });

  it('save persists a progress row with key + fields', async () => {
    await progressRepo.save({ userId: 'a@b.com', num: 42, solved: 1, status: 'solved', solvedAt: 't', attemptedAt: null });
    expect(putItem.mock.calls[0][0]).toMatchObject({ PK: 'PROGRESS#a@b.com', SK: 'PROB#42', solved: 1, status: 'solved' });
  });

  it('remove deletes the per-user problem row', async () => {
    await progressRepo.remove('a@b.com', 42);
    expect(deleteItem).toHaveBeenCalledWith('PROGRESS#a@b.com', 'PROB#42');
  });
});
