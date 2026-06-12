// Single source of truth for the single-table key schema.
//
// Every PK/SK string format in the system is defined here ONCE. If a key format
// ever changes, this is the only file to touch. Each builder returns a
// `{ PK, SK }` object; SK-prefix helpers (for begins_with queries) are exported
// alongside the exact-key builders.

export const userKey = (email) => ({ PK: `USER#${email}`, SK: 'PROFILE' });

export const usernameIndexKey = (username) => ({ PK: `USERNAME#${username}`, SK: 'PROFILE' });

export const problemKey = (num) => ({ PK: `PROBLEM#${num}`, SK: 'DETAIL' });

export const patternKey = (name) => ({ PK: 'PATTERN', SK: `PAT#${name}` });
export const PATTERN_PK = 'PATTERN';
export const PATTERN_SK_PREFIX = 'PAT#';

export const progressKey = (userId, num) => ({ PK: `PROGRESS#${userId}`, SK: `PROB#${num}` });
export const progressPk = (userId) => `PROGRESS#${userId}`;
export const PROGRESS_SK_PREFIX = 'PROB#';

export const groupKey = (groupId) => ({ PK: `GROUP#${groupId}`, SK: 'DETAIL' });
export const groupPk = (groupId) => `GROUP#${groupId}`;
export const groupMemberKey = (groupId, userId) => ({ PK: `GROUP#${groupId}`, SK: `MEMBER#${userId}` });
export const groupProblemKey = (groupId, num) => ({ PK: `GROUP#${groupId}`, SK: `PROBLEM#${num}` });
export const GROUP_MEMBER_SK_PREFIX = 'MEMBER#';
export const GROUP_PROBLEM_SK_PREFIX = 'PROBLEM#';

export const userGroupIndexKey = (userId, groupId) => ({ PK: `USERGROUP#${userId}`, SK: `GROUP#${groupId}` });
export const userGroupPk = (userId) => `USERGROUP#${userId}`;
export const USER_GROUP_SK_PREFIX = 'GROUP#';
