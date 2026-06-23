import { describe, it, expect } from 'vitest';
import { makeUser, makeUsernameIndex } from '../../../src/models/user.js';

describe('user model factories', () => {
  it('makeUser embeds the user key and all profile fields', () => {
    const user = makeUser({ email: 'a@b.com', username: 'alice', passwordHash: 'h', createdAt: '2026-01-01' });
    expect(user).toEqual({
      PK: 'USER#a@b.com', SK: 'PROFILE',
      email: 'a@b.com', username: 'alice', passwordHash: 'h', createdAt: '2026-01-01',
    });
  });

  it('makeUsernameIndex embeds the username key and email pointer', () => {
    expect(makeUsernameIndex({ username: 'alice', email: 'a@b.com' })).toEqual({
      PK: 'USERNAME#alice', SK: 'PROFILE', username: 'alice', email: 'a@b.com',
    });
  });
});
