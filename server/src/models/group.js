import {
  groupKey,
  groupMemberKey,
  groupProblemKey,
  userGroupIndexKey,
} from './keys.js';

/**
 * @typedef {Object} Group
 * @property {string} PK   `GROUP#<groupId>`
 * @property {string} SK   `DETAIL`
 * @property {string} name
 * @property {string} createdBy           userId (email)
 * @property {string} createdByUsername
 * @property {string} createdAt           ISO timestamp
 */

/**
 * @typedef {Object} GroupMember
 * @property {string} PK   `GROUP#<groupId>`
 * @property {string} SK   `MEMBER#<userId>`
 * @property {string} username
 * @property {string} joinedAt            ISO timestamp
 */

/**
 * @typedef {Object} GroupProblem
 * @property {string} PK   `GROUP#<groupId>`
 * @property {string} SK   `PROBLEM#<num>`
 * @property {string} addedBy             userId (email)
 * @property {string} addedAt             ISO timestamp
 */

/**
 * @typedef {Object} UserGroupIndex
 * @property {string} PK   `USERGROUP#<userId>`
 * @property {string} SK   `GROUP#<groupId>`
 * @property {string} groupName
 */

export { groupKey, groupMemberKey, groupProblemKey, userGroupIndexKey };

/** @returns {Group} */
export const makeGroup = ({ groupId, name, createdBy, createdByUsername, createdAt }) => ({
  ...groupKey(groupId),
  name,
  createdBy,
  createdByUsername,
  createdAt,
});

/** @returns {GroupMember} */
export const makeGroupMember = ({ groupId, userId, username, joinedAt }) => ({
  ...groupMemberKey(groupId, userId),
  username,
  joinedAt,
});

/** @returns {GroupProblem} */
export const makeGroupProblem = ({ groupId, num, addedBy, addedAt }) => ({
  ...groupProblemKey(groupId, num),
  addedBy,
  addedAt,
});

/** @returns {UserGroupIndex} */
export const makeUserGroupIndex = ({ userId, groupId, groupName }) => ({
  ...userGroupIndexKey(userId, groupId),
  groupName,
});
