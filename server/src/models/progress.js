import { progressKey } from './keys.js';

/**
 * @typedef {Object} Progress
 * @property {string} PK   `PROGRESS#<userId>`
 * @property {string} SK   `PROB#<num>`
 * @property {0|1} solved
 * @property {'unsolved'|'attempted'|'solved'} status
 * @property {string|null} solvedAt        ISO timestamp
 * @property {string|null} attemptedAt     ISO timestamp
 */

export { progressKey };

/** @returns {Progress} */
export const makeProgress = ({ userId, num, solved, status, solvedAt, attemptedAt }) => ({
  ...progressKey(userId, num),
  solved,
  status,
  solvedAt,
  attemptedAt,
});
