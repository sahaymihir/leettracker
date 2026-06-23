import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the I/O collaborators so the runner's scheduling logic is tested in
// isolation. leetcodeController is heavyweight (network, dataset) — mocking it
// also keeps the test fast and offline.
vi.mock('../../../src/repositories/usersRepo.js', () => ({ listAll: vi.fn() }));
vi.mock('../../../src/controllers/leetcodeController.js', () => ({ runSync: vi.fn() }));

import * as usersRepo from '../../../src/repositories/usersRepo.js';
import { runSync } from '../../../src/controllers/leetcodeController.js';
import { isDue, runAutoSync } from '../../../src/services/autoSyncRunner.js';

const NOW = new Date('2026-06-24T23:00:00Z');

describe('isDue', () => {
  it('skips manual / absent / removed cadences', () => {
    expect(isDue({ syncPreference: 'manual', leetcodeUsername: 'x' }, NOW)).toBe(false);
    expect(isDue({ leetcodeUsername: 'x' }, NOW)).toBe(false);
  });

  it('skips end_of_day users without a linked LeetCode username', () => {
    expect(isDue({ syncPreference: 'end_of_day' }, NOW)).toBe(false);
    expect(isDue({ syncPreference: 'end_of_day', leetcodeUsername: '   ' }, NOW)).toBe(false);
  });

  it('is due when never synced', () => {
    expect(isDue({ syncPreference: 'end_of_day', leetcodeUsername: 'x' }, NOW)).toBe(true);
  });

  it('is due when last sync was a previous UTC day', () => {
    expect(isDue({ syncPreference: 'end_of_day', leetcodeUsername: 'x', lastSyncedAt: '2026-06-23T23:00:00Z' }, NOW)).toBe(true);
  });

  it('is idempotent: skips when already synced this UTC day', () => {
    expect(isDue({ syncPreference: 'end_of_day', leetcodeUsername: 'x', lastSyncedAt: '2026-06-24T10:00:00Z' }, NOW)).toBe(false);
  });

  it('treats an unparseable lastSyncedAt as never-synced (due)', () => {
    expect(isDue({ syncPreference: 'end_of_day', leetcodeUsername: 'x', lastSyncedAt: 'garbage' }, NOW)).toBe(true);
  });
});

describe('runAutoSync', () => {
  beforeEach(() => vi.clearAllMocks());

  it('syncs only the due users and summarizes the batch', async () => {
    usersRepo.listAll.mockResolvedValue([
      { email: 'due@x.com', syncPreference: 'end_of_day', leetcodeUsername: 'd' },
      { email: 'manual@x.com', syncPreference: 'manual', leetcodeUsername: 'm' },
    ]);
    runSync.mockResolvedValue({});

    const result = await runAutoSync(NOW);

    expect(runSync).toHaveBeenCalledExactlyOnceWith('due@x.com', { groupIds: [] });
    expect(result).toMatchObject({ scanned: 2, due: 1, synced: 1, failed: 0 });
  });

  it('isolates per-user failures so one bad profile cannot abort the batch', async () => {
    usersRepo.listAll.mockResolvedValue([
      { email: 'ok@x.com', syncPreference: 'end_of_day', leetcodeUsername: 'a' },
      { email: 'boom@x.com', syncPreference: 'end_of_day', leetcodeUsername: 'b' },
    ]);
    runSync.mockImplementation((email) => {
      if (email === 'boom@x.com') throw new Error('LeetCode down');
      return Promise.resolve({});
    });

    const result = await runAutoSync(NOW);

    expect(result).toMatchObject({ scanned: 2, due: 2, synced: 1, failed: 1 });
    expect(result.failures).toEqual([{ email: 'boom@x.com', error: 'LeetCode down' }]);
  });
});
