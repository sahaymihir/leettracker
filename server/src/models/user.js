import { userKey, usernameIndexKey } from './keys.js';

/**
 * @typedef {Object} User
 * @property {string} PK   `USER#<email>`
 * @property {string} SK   `PROFILE`
 * @property {string} username
 * @property {string} email
 * @property {string} passwordHash
 * @property {string} createdAt           ISO timestamp
 * @property {string} [leetcodeUsername]  set later via updateLeetcodeUsername
 */

/**
 * @typedef {Object} UsernameIndex
 * @property {string} PK   `USERNAME#<username>`
 * @property {string} SK   `PROFILE`
 * @property {string} email
 * @property {string} username
 */

export { userKey, usernameIndexKey };

/** @returns {User} */
export const makeUser = ({ email, username, passwordHash, createdAt }) => ({
  ...userKey(email),
  username,
  email,
  passwordHash,
  createdAt,
});

/** @returns {UsernameIndex} */
export const makeUsernameIndex = ({ username, email }) => ({
  ...usernameIndexKey(username),
  email,
  username,
});
