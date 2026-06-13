import { getItem, putItem, queryItems, scanItems, deleteItem, updateItem } from '../db/dynamodb.js';
import {
  groupKey,
  groupPk,
  groupMemberKey,
  groupProblemKey,
  userGroupIndexKey,
  userGroupPk,
  GROUP_MEMBER_SK_PREFIX,
  GROUP_PROBLEM_SK_PREFIX,
  USER_GROUP_SK_PREFIX,
} from '../models/keys.js';
import {
  makeGroup,
  makeGroupMember,
  makeGroupProblem,
  makeUserGroupIndex,
} from '../models/group.js';

// Data access for the Group aggregate: the group DETAIL row, its MEMBER# and
// PROBLEM# child rows, and the USERGROUP# reverse index that lists a user's
// groups. These rows are written/deleted together, so they share one repository.

// --- reads ---

export const getDetail = (groupId) => {
  const { PK, SK } = groupKey(groupId);
  return getItem(PK, SK);
};

export const getMember = (groupId, userId) => {
  const { PK, SK } = groupMemberKey(groupId, userId);
  return getItem(PK, SK);
};

export const listMembers = (groupId) =>
  queryItems(groupPk(groupId), GROUP_MEMBER_SK_PREFIX);

export const listProblems = (groupId) =>
  queryItems(groupPk(groupId), GROUP_PROBLEM_SK_PREFIX);

export const getProblem = (groupId, num) => {
  const { PK, SK } = groupProblemKey(groupId, num);
  return getItem(PK, SK);
};

// All rows under a group's partition (DETAIL + members + problems), used by delete.
export const listAllRows = (groupId) => queryItems(groupPk(groupId));

export const listUserGroupIndex = (userId) =>
  queryItems(userGroupPk(userId), USER_GROUP_SK_PREFIX);

// Find every group's reference to a given problem (cross-group), used when a
// problem is untracked/deleted.
export const findProblemRefsAcrossGroups = (num) =>
  scanItems(
    'begins_with(PK, :prefix) AND SK = :sk',
    { ':prefix': 'GROUP#', ':sk': `${GROUP_PROBLEM_SK_PREFIX}${num}` }
  );

// --- writes ---

export const saveGroup = (group) => putItem(makeGroup(group));

export const saveMember = (member) => putItem(makeGroupMember(member));

export const saveProblem = (groupProblem) => putItem(makeGroupProblem(groupProblem));

export const saveUserGroupIndex = (index) => putItem(makeUserGroupIndex(index));

// Set (or rotate) a group's shareable invite token on the DETAIL row.
export const setInviteToken = (groupId, inviteToken) => {
  const { PK, SK } = groupKey(groupId);
  return updateItem(PK, SK, 'SET inviteToken = :t', { ':t': inviteToken });
};

// Rename a group's DETAIL row. `name` is a DynamoDB reserved word, so it must be
// referenced via an expression-attribute-name alias.
export const updateName = (groupId, name) => {
  const { PK, SK } = groupKey(groupId);
  return updateItem(PK, SK, 'SET #n = :n', { ':n': name }, { '#n': 'name' });
};

export const removeMember = (groupId, userId) => {
  const { PK, SK } = groupMemberKey(groupId, userId);
  return deleteItem(PK, SK);
};

export const removeUserGroupIndex = (userId, groupId) => {
  const { PK, SK } = userGroupIndexKey(userId, groupId);
  return deleteItem(PK, SK);
};

// Delete an arbitrary row of this aggregate by its raw keys (delete-group sweep,
// cross-group problem cleanup).
export const removeRow = (pk, sk) => deleteItem(pk, sk);
