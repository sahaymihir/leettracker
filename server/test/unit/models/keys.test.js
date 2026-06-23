import { describe, it, expect } from 'vitest';
import {
  userKey, usernameIndexKey, problemKey, patternKey,
  progressKey, groupKey, groupMemberKey, groupProblemKey, userGroupIndexKey,
} from '../../../src/models/keys.js';

// keys.js is the single source of truth for the table's PK/SK formats. These
// tests pin every format so a key change is a deliberate, reviewed diff (a
// silent change would orphan every existing row).

describe('key builders', () => {
  it('builds the user + username-index keys', () => {
    expect(userKey('a@b.com')).toEqual({ PK: 'USER#a@b.com', SK: 'PROFILE' });
    expect(usernameIndexKey('alice')).toEqual({ PK: 'USERNAME#alice', SK: 'PROFILE' });
  });

  it('builds problem / pattern / progress keys', () => {
    expect(problemKey(1)).toEqual({ PK: 'PROBLEM#1', SK: 'DETAIL' });
    expect(patternKey('Arrays')).toEqual({ PK: 'PATTERN', SK: 'PAT#Arrays' });
    expect(progressKey('a@b.com', 42)).toEqual({ PK: 'PROGRESS#a@b.com', SK: 'PROB#42' });
  });

  it('builds group keys (detail, member, problem, user index)', () => {
    expect(groupKey('g1')).toEqual({ PK: 'GROUP#g1', SK: 'DETAIL' });
    expect(groupMemberKey('g1', 'a@b.com')).toEqual({ PK: 'GROUP#g1', SK: 'MEMBER#a@b.com' });
    expect(groupProblemKey('g1', 5)).toEqual({ PK: 'GROUP#g1', SK: 'PROBLEM#5' });
    expect(userGroupIndexKey('a@b.com', 'g1')).toEqual({ PK: 'USERGROUP#a@b.com', SK: 'GROUP#g1' });
  });
});
