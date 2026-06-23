import { getItem, putItem, updateItem, scanItems } from '../db/dynamodb.js';
import { userKey, usernameIndexKey } from '../models/keys.js';
import { makeUser, makeUsernameIndex } from '../models/user.js';

// Data access for the User entity (PK 'USER#<email>' / SK 'PROFILE') and its
// companion Username index (PK 'USERNAME#<username>') used for uniqueness +
// member-by-username lookups. userId === email throughout this app.

export const getByEmail = (email) => {
  const { PK, SK } = userKey(email);
  return getItem(PK, SK);
};

export const getByUsername = (username) => {
  const { PK, SK } = usernameIndexKey(username);
  return getItem(PK, SK);
};

// Creates both the primary user row and the username lookup row.
export const create = async ({ email, username, passwordHash, createdAt }) => {
  await putItem(makeUser({ email, username, passwordHash, createdAt }));
  await putItem(makeUsernameIndex({ username, email }));
};

// Set or clear the linked LeetCode username. A falsy value REMOVEs the
// attribute entirely (rather than storing an empty string).
export const updateLeetcodeUsername = (email, leetcodeUsername) => {
  const { PK, SK } = userKey(email);
  if (leetcodeUsername) {
    return updateItem(PK, SK, 'SET leetcodeUsername = :lc', { ':lc': leetcodeUsername });
  }
  return updateItem(PK, SK, 'REMOVE leetcodeUsername');
};

// Set the auto-sync cadence preference ('manual' | 'end_of_day').
// 'manual' (the default) is stored explicitly so the scheduler can skip it by
// attribute presence; any falsy value REMOVEs the attribute.
export const updateSyncPreference = (email, syncPreference) => {
  const { PK, SK } = userKey(email);
  if (syncPreference) {
    return updateItem(PK, SK, 'SET syncPreference = :sp', { ':sp': syncPreference });
  }
  return updateItem(PK, SK, 'REMOVE syncPreference');
};

// Stamp the last successful sync (ISO timestamp). Used by the scheduler to
// decide whether a cadence-based auto-sync is due.
export const setLastSyncedAt = (email, isoTimestamp) => {
  const { PK, SK } = userKey(email);
  return updateItem(PK, SK, 'SET lastSyncedAt = :ts', { ':ts': isoTimestamp });
};

// Full scan of primary user rows (SK === 'PROFILE'). Only used by the scheduled
// auto-sync Lambda — the request path never scans.
export const listAll = () =>
  scanItems('SK = :sk', { ':sk': 'PROFILE' });
